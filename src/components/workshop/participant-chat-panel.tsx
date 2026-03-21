"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import TextareaAutosize from "react-textarea-autosize";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Sparkles } from "lucide-react";
import { PersonaInterrupt } from "./persona-interrupt";
import { getStepByOrder } from "@/lib/workshop/step-metadata";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  useCanvasStore,
  useCanvasStoreApi,
} from "@/providers/canvas-store-provider";
import type { StickyNoteColor, MindMapNodeState, MindMapEdgeState } from "@/stores/canvas-store";
import { addCanvasItemsToBoard } from "@/lib/canvas/add-canvas-items";
import { savePersonaCandidates } from "@/actions/canvas-actions";
import { parseMindMapNodes, findThemeNode, type MindMapNodeParsed } from "@/lib/chat/mind-map-parse-utils";
import { THEME_COLORS } from "@/lib/canvas/mind-map-theme-colors";
import { computeNewNodePosition } from "@/lib/canvas/mind-map-layout";
import {
  parseSuggestions,
  parseCanvasItems,
  parsePersonaSelect,
  stripLeakedTags,
  detectPersonaIntro,
  getRandomAck,
} from "@/lib/chat/parse-utils";
import { ChatSkeleton } from "./chat-skeleton";
import { toast } from "sonner";
import type { PersonaTemplateData } from "@/lib/canvas/persona-template-types";
import type { HmwCardData } from "@/lib/canvas/hmw-card-types";

/** Parse [PERSONA_TEMPLATE]{...}[/PERSONA_TEMPLATE] blocks from AI content */
function parsePersonaTemplates(content: string): {
  cleanContent: string;
  templates: Partial<PersonaTemplateData>[];
} {
  const templates: Partial<PersonaTemplateData>[] = [];
  const regex = /\[PERSONA_TEMPLATE\]([\s\S]*?)\[\/PERSONA_TEMPLATE\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      templates.push(parsed);
    } catch {
      // Skip malformed JSON
    }
  }
  let cleanContent = content
    .replace(/\s*\[PERSONA_TEMPLATE\][\s\S]*?\[\/PERSONA_TEMPLATE\]\s*/g, " ")
    .trim();
  if (cleanContent.includes("[PERSONA_TEMPLATE]")) {
    cleanContent = cleanContent.replace(/\[PERSONA_TEMPLATE\][\s\S]*$/, "").trim();
  }
  return { cleanContent, templates };
}

/** Parse [HMW_CARD]{...JSON...}[/HMW_CARD] blocks from AI content */
function parseHmwCards(content: string): {
  cleanContent: string;
  cards: Partial<HmwCardData>[];
} {
  const cards: Partial<HmwCardData>[] = [];
  const regex = /\[HMW_CARD\]([\s\S]*?)\[\/HMW_CARD\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      cards.push(parsed);
    } catch {
      // Skip malformed JSON
    }
  }
  let cleanContent = content
    .replace(/\s*\[HMW_CARD\][\s\S]*?\[\/HMW_CARD\]\s*/g, " ")
    .trim();
  // Strip incomplete blocks mid-stream
  if (cleanContent.includes("[HMW_CARD]")) {
    cleanContent = cleanContent.replace(/\[HMW_CARD\][\s\S]*$/, "").trim();
  }
  return { cleanContent, cards };
}

const CANVAS_ENABLED_STEPS = [
  "challenge", "stakeholder-mapping", "user-research", "sense-making",
  "persona", "journey-mapping", "reframe", "ideation", "concept",
];

/** Distinct colors assigned to persona cards (one per persona) */
const PERSONA_CARD_COLORS: StickyNoteColor[] = ["yellow", "red", "orange", "blue", "green", "pink"];

interface ParticipantChatPanelProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  participantId: string;
  displayName: string;
  participantColor: string;
  initialMessages?: UIMessage[];
}

export function ParticipantChatPanel({
  stepOrder, sessionId, workshopId,
  participantId, displayName, participantColor, initialMessages,
}: ParticipantChatPanelProps) {
  const step = getStepByOrder(stepOrder);
  const stepId = step?.id || "";
  const isCanvasStep = CANVAS_ENABLED_STEPS.includes(stepId);

  const addStickyNote = useCanvasStore((s) => s.addStickyNote);
  const stickyNotes = useCanvasStore((s) => s.stickyNotes);
  const addPersonaTemplate = useCanvasStore((s) => s.addPersonaTemplate);
  const updatePersonaTemplate = useCanvasStore((s) => s.updatePersonaTemplate);
  const addHmwCard = useCanvasStore((s) => s.addHmwCard);
  const updateHmwCard = useCanvasStore((s) => s.updateHmwCard);
  const pendingHmwChipSelection = useCanvasStore((s) => s.pendingHmwChipSelection);
  const setPendingHmwChipSelection = useCanvasStore((s) => s.setPendingHmwChipSelection);
  const addMindMapNode = useCanvasStore((s) => s.addMindMapNode);
  const mindMapNodes = useCanvasStore((s) => s.mindMapNodes);
  const mindMapEdges = useCanvasStore((s) => s.mindMapEdges);
  const setPendingFitView = useCanvasStore((s) => s.setPendingFitView);
  const storeApi = useCanvasStoreApi();

  const [quickAck, setQuickAck] = React.useState<string | null>(null);
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  // Persona selection state (user-research step only)
  const [personaOptions, setPersonaOptions] = React.useState<{ name: string; description: string }[]>([]);
  const [personaSelections, setPersonaSelections] = React.useState<Set<string>>(() => new Set());
  const [personaSelectConfirmed, setPersonaSelectConfirmed] = React.useState(false);
  const [personaSelectMessageId, setPersonaSelectMessageId] = React.useState<string | null>(null);
  const [addedMindMapLabels, setAddedMindMapLabels] = React.useState<Set<string>>(() => new Set());

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const scrollIdleTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Transport with participant context baked in
  const transport = React.useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      body: { sessionId, stepId, workshopId, participantId, participantName: displayName },
    }),
    [sessionId, stepId, workshopId, participantId, displayName],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages || [],
    onError: (error) => {
      setQuickAck(null);
      if (error.message?.includes("429") || error.message?.includes("rate_limit")) {
        toast.error("AI is busy — please wait a moment and try again.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    },
    onFinish: () => { setQuickAck(null); },
  });

  useAutoSave(sessionId, stepId, messages, participantId);

  // Auto-start: send hidden trigger when entering a step with no prior messages
  const hasAutoStarted = React.useRef(false);
  React.useEffect(() => {
    if (
      (!initialMessages || initialMessages.length === 0) &&
      messages.length === 0 &&
      status === "ready" &&
      !hasAutoStarted.current
    ) {
      hasAutoStarted.current = true;
      setQuickAck(getRandomAck());
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: "__step_start__" }],
      });
    }
  }, [initialMessages, messages.length, status, sendMessage]);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, quickAck, suggestions]);

  // Extract suggestions from last assistant message when AI finishes responding
  React.useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        const content = lastMsg.parts?.filter((p) => p.type === "text").map((p) => p.text).join("\n") || "";
        const { suggestions: parsed } = parseSuggestions(content);
        setSuggestions(parsed);
      }
    }
    // Clear suggestions while AI is responding
    if (status === "streaming" || status === "submitted") {
      setSuggestions((prev) => (prev.length > 0 ? [] : prev));
    }
  }, [status, messages]);

  // Extract persona select options from last assistant message (user-research step only)
  React.useEffect(() => {
    if (stepId !== "user-research") return;

    if (status === "ready" && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        const content = lastMsg.parts?.filter((p) => p.type === "text").map((p) => p.text).join("\n") || "";
        const { personaOptions: parsed } = parsePersonaSelect(content);
        if (parsed.length > 0) {
          if (personaSelectMessageId !== lastMsg.id && personaSelectConfirmed) {
            setPersonaSelectConfirmed(false);
            setPersonaSelections(new Set());
          }
          setPersonaOptions(parsed);
          setPersonaSelectMessageId(lastMsg.id);
        }
      }
    }
    if (status === "streaming" || status === "submitted") {
      setPersonaOptions((prev) => (prev.length > 0 ? [] : prev));
    }
  }, [status, messages, stepId, personaSelectConfirmed, personaSelectMessageId]);

  // Restore persona state from history on mount
  const hasCheckedPersonaHistory = React.useRef(false);
  React.useEffect(() => {
    if (hasCheckedPersonaHistory.current || stepId !== "user-research") return;
    hasCheckedPersonaHistory.current = true;
    for (const msg of messages) {
      if (msg.role !== "user") continue;
      const content = msg.parts?.filter((p) => p.type === "text").map((p) => p.text).join("") || "";
      if (content.startsWith("I'd like to interview these personas:")) {
        setPersonaSelectConfirmed(true);
        break;
      }
    }
  }, [messages, stepId]);

  // Persona confirm handler — uses addCanvasItemsToBoard for consistent row positioning
  const handlePersonaConfirm = React.useCallback(() => {
    const selectedNames = [...personaSelections];
    if (selectedNames.length === 0) return;

    // Count existing persona cards (contain em-dash, no cluster) to continue color sequence
    const existingPersonaCount = storeApi.getState().stickyNotes.filter(
      (n) => !n.cluster && n.text.includes(" — "),
    ).length;

    const personaItems = selectedNames.map((name, i) => {
      const persona = personaOptions.find((p) => p.name === name);
      return {
        text: persona?.description ? `${name} — ${persona.description}` : name,
        color: PERSONA_CARD_COLORS[(existingPersonaCount + i) % PERSONA_CARD_COLORS.length],
      };
    });

    addCanvasItemsToBoard({
      stepId,
      items: personaItems,
      storeApi,
      addStickyNote,
      owner: { ownerId: participantId, ownerName: displayName, ownerColor: participantColor },
    });

    // Save structured persona candidates for Step 5 pre-seeding
    const candidatesToSave = selectedNames.map((personaName) => {
      const persona = personaOptions.find((p) => p.name === personaName);
      const commaIdx = personaName.indexOf(',');
      const firstName = commaIdx > 0 ? personaName.slice(0, commaIdx).trim() : personaName;
      const archetype = commaIdx > 0 ? personaName.slice(commaIdx + 1).trim() : personaName;
      return { name: firstName, archetype, description: persona?.description || '' };
    });
    savePersonaCandidates(workshopId, stepId, candidatesToSave);

    setPersonaSelectConfirmed(true);
    setQuickAck(getRandomAck());
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: `I'd like to interview these personas: ${selectedNames.join(", ")}` }],
    });
  }, [personaSelections, personaOptions, stepId, workshopId, storeApi, addStickyNote, participantId, displayName, participantColor, sendMessage]);

  // Add a single mind map node to the canvas (click-to-add from chat chip)
  const handleAddMindMapNode = React.useCallback(
    (parsed: MindMapNodeParsed) => {
      const normalizedLabel = parsed.label.toLowerCase();
      if (addedMindMapLabels.has(normalizedLabel)) return;

      const latestNodes = storeApi.getState().mindMapNodes;
      const latestEdges = storeApi.getState().mindMapEdges;

      // Scope to this participant's nodes
      const myNodes = latestNodes.filter((n) => n.ownerId === participantId);
      const rootNode = myNodes.find((n) => n.isRoot);

      // Build label→node map from participant's nodes
      const nodeLabelMap = new Map<string, MindMapNodeState>();
      for (const n of myNodes) {
        nodeLabelMap.set(n.label.toLowerCase(), n);
      }

      // Duplicate guard
      if (nodeLabelMap.has(normalizedLabel)) {
        setAddedMindMapLabels((prev) => new Set(prev).add(normalizedLabel));
        return;
      }

      // Resolve parent theme
      const parentNode = parsed.theme
        ? findThemeNode(parsed.theme, myNodes, nodeLabelMap) || rootNode
        : undefined;

      if (parentNode && !parentNode.isRoot) {
        // Idea-level node
        const position = computeNewNodePosition(parentNode.id, latestNodes, latestEdges);
        const newId = crypto.randomUUID();
        const newNode: MindMapNodeState = {
          id: newId,
          label: parsed.label,
          description: parsed.description,
          themeColorId: parentNode.themeColorId,
          themeColor: parentNode.themeColor,
          themeBgColor: parentNode.themeBgColor,
          isRoot: false,
          level: parentNode.level + 1,
          parentId: parentNode.id,
          position,
          ownerId: participantId,
          ownerName: displayName,
        };
        const newEdge: MindMapEdgeState = {
          id: `${parentNode.id}-${newId}`,
          source: parentNode.id,
          target: newId,
          themeColor: parentNode.themeColor,
          ownerId: participantId,
        };
        addMindMapNode(newNode, newEdge);
      } else {
        // Theme-level node (level 1)
        const myLevel1 = myNodes.filter((n) => n.level === 1).length;
        const colorIndex = myLevel1 % THEME_COLORS.length;
        const themeColor = THEME_COLORS[colorIndex];
        const myRoot = myNodes.find((n) => n.isRoot);
        const rootId = myRoot?.id || `${participantId}-root`;

        const position = computeNewNodePosition(rootId, latestNodes, latestEdges);
        const newId = crypto.randomUUID();
        const newNode: MindMapNodeState = {
          id: newId,
          label: parsed.label,
          description: parsed.description,
          themeColorId: themeColor.id,
          themeColor: themeColor.color,
          themeBgColor: themeColor.bgColor,
          isRoot: false,
          level: 1,
          parentId: rootId,
          position,
          ownerId: participantId,
          ownerName: displayName,
        };
        const newEdge: MindMapEdgeState = {
          id: `${rootId}-${newId}`,
          source: rootId,
          target: newId,
          themeColor: themeColor.color,
          ownerId: participantId,
        };
        addMindMapNode(newNode, newEdge);
      }

      setAddedMindMapLabels((prev) => new Set(prev).add(normalizedLabel));
      setPendingFitView(true);
    },
    [addedMindMapLabels, storeApi, addMindMapNode, setPendingFitView, participantId, displayName],
  );

  // Extract canvas items from completed assistant messages
  const lastAssistantMsg = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  const processedMsgIds = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (!lastAssistantMsg || !isCanvasStep) return;
    if (processedMsgIds.current.has(lastAssistantMsg.id)) return;
    if (status === "streaming") return;

    processedMsgIds.current.add(lastAssistantMsg.id);
    const content = lastAssistantMsg.parts
      ?.filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n") || "";

    // Process persona template blocks — match by archetype/personaId/name to fill skeleton cards
    const { templates: personaTemplateParsed } = parsePersonaTemplates(content);
    if (personaTemplateParsed.length > 0) {
      const latestTemplates = storeApi.getState().personaTemplates;
      const merged = personaTemplateParsed.reduce<Partial<PersonaTemplateData>>(
        (acc, t) => ({ ...acc, ...t }),
        {},
      );

      const matchByArchetype = merged.archetype
        ? latestTemplates.find(
            (t) => t.archetype?.toLowerCase() === merged.archetype?.toLowerCase(),
          )
        : undefined;
      const matchByPersonaId =
        !matchByArchetype && merged.personaId
          ? latestTemplates.find((t) => t.personaId === merged.personaId)
          : undefined;
      const matchByName =
        !matchByArchetype && !matchByPersonaId && merged.name
          ? latestTemplates.find((t) => t.name === merged.name)
          : undefined;
      const unfilledSkeleton =
        !matchByArchetype && !matchByPersonaId && !matchByName
          ? latestTemplates.find((t) => !t.name && !t.narrative)
          : undefined;
      const target =
        matchByArchetype || matchByPersonaId || matchByName || unfilledSkeleton;

      if (target) {
        updatePersonaTemplate(target.id, merged);
      } else {
        const PERSONA_CARD_WIDTH = 680;
        const PERSONA_GAP = 40;
        const offsetX =
          latestTemplates.length * (PERSONA_CARD_WIDTH + PERSONA_GAP);
        addPersonaTemplate({
          position: { x: offsetX, y: 0 },
          ...merged,
        });
      }
    }

    // Process HMW card blocks (reframe step)
    const { cards: hmwCardParsed } = parseHmwCards(content);
    if (hmwCardParsed.length > 0) {
      const latestHmwCards = storeApi.getState().hmwCards;
      const HMW_FIELD_VALUE_KEYS = ["givenThat", "persona", "immediateGoal", "deeperGoal"];
      // Detect ownership mode: if any card has ownerId set, use ownerId-based matching
      const isOwnershipMode = latestHmwCards.some((c) => c.ownerId);

      for (const parsed of hmwCardParsed) {
        const targetIndex = parsed.cardIndex ?? 0;
        // In ownership mode, target this participant's card first; fall back to cardIndex
        const existing = isOwnershipMode
          ? latestHmwCards.find((c) => c.ownerId === participantId) ??
            latestHmwCards.find((c) => (c.cardIndex ?? 0) === targetIndex)
          : latestHmwCards.find((c) => (c.cardIndex ?? 0) === targetIndex);

        if (existing) {
          const updates: Partial<HmwCardData> = { ...parsed };
          // During progressive mode, strip field value overrides — only chip selections set those
          if (existing.cardState === "active") {
            for (const key of HMW_FIELD_VALUE_KEYS) {
              delete (updates as Record<string, unknown>)[key];
            }
          }
          if (existing.cardState === "skeleton") {
            updates.cardState = "active";
          }
          // Auto-detect 'filled' state
          const merged2 = { ...existing, ...updates };
          if (merged2.givenThat && merged2.persona && merged2.immediateGoal && merged2.deeperGoal) {
            updates.cardState = "filled";
          }
          updateHmwCard(existing.id, updates);
        } else {
          // Late-joiner fallback: create a card for this participant
          addHmwCard({
            position: { x: latestHmwCards.length * 780, y: 0 },
            cardState: "active",
            cardIndex: latestHmwCards.length,
            ownerId: participantId,
            ownerName: displayName,
            ownerColor: participantColor,
            ...parsed,
          });
        }
      }
    }

    // Process canvas items (sticky notes)
    const { canvasItems } = parseCanvasItems(content);
    if (canvasItems.length === 0) return;

    const { addedCount } = addCanvasItemsToBoard({
      stepId,
      items: canvasItems,
      storeApi,
      addStickyNote,
      owner: { ownerId: participantId, ownerName: displayName, ownerColor: participantColor },
    });
    if (addedCount > 0) {
      toast.success(`${addedCount} item${addedCount > 1 ? "s" : ""} added to board`);
    }
  }, [lastAssistantMsg, status, isCanvasStep, stepId, storeApi, addStickyNote, addPersonaTemplate, updatePersonaTemplate, addHmwCard, updateHmwCard, participantId, displayName, participantColor]);

  // HMW chip selection effect — sends chip selection messages to AI when participant
  // clicks a suggestion chip on their HMW card. Same pattern as facilitator chat panel.
  const isLoading = status === "streaming";
  React.useEffect(() => {
    if (!pendingHmwChipSelection || isLoading) return;
    const { field, value } = pendingHmwChipSelection;
    setPendingHmwChipSelection(null);

    const fieldLabels: Record<string, string> = {
      givenThat: "Given that",
      persona: "how might we (help)",
      immediateGoal: "do/be/feel/achieve",
      deeperGoal: "So they can",
    };
    const fieldLabel = fieldLabels[field] || field;

    setQuickAck(getRandomAck());
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: `For "${fieldLabel}": ${value}` }],
    });
  }, [pendingHmwChipSelection, isLoading, setPendingHmwChipSelection, sendMessage]);

  const handleSend = React.useCallback((text: string) => {
    if (!text.trim() || status === "streaming") return;
    setSuggestions([]);
    setQuickAck(getRandomAck());
    setInputValue("");
    sendMessage({ text });
  }, [status, sendMessage]);

  const renderClean = React.useCallback((content: string) => {
    let { cleanContent } = stripLeakedTags(content);
    cleanContent = parseSuggestions(cleanContent).cleanContent;
    cleanContent = parsePersonaSelect(cleanContent).cleanContent;
    cleanContent = parseCanvasItems(cleanContent).cleanContent;
    // Strip [INTERVIEW_MODE] markup — only the facilitator handles this choice
    cleanContent = cleanContent
      .replace(/\[INTERVIEW_MODE\][\s\S]*?\[\/INTERVIEW_MODE\]/, "")
      .replace(/\[INTERVIEW_MODE\][\s\S]*$/, "")
      // Strip [PERSONA_PLAN] markup — facilitator only
      .replace(/\[PERSONA_PLAN\][\s\S]*?\[\/PERSONA_PLAN\]/g, "")
      .replace(/\[PERSONA_PLAN\][\s\S]*$/g, "")
      // Strip [PERSONA_TEMPLATE] markup
      .replace(/\[PERSONA_TEMPLATE\][\s\S]*?\[\/PERSONA_TEMPLATE\]/g, "")
      .replace(/\[PERSONA_TEMPLATE\][\s\S]*$/g, "")
      // Strip [HMW_CARD] markup — rendered on canvas, not in chat
      .replace(/\[HMW_CARD\][\s\S]*?\[\/HMW_CARD\]/g, "")
      .replace(/\[HMW_CARD\][\s\S]*$/g, "")
      // Strip [MIND_MAP_NODE] markup — rendered as clickable chips below
      .replace(/\[MIND_MAP_NODE(?:\s+[^\]]*?)?\][\s\S]*?\[\/MIND_MAP_NODE\]/g, "")
      .replace(/\[MIND_MAP_NODE:\s*[^\]]+\]/g, "")
      .replace(/\[MIND_MAP_NODE[^\]]*$/, "")
      .trim();
    return cleanContent;
  }, []);

  // Scrollbar show/hide: toggle 'is-scrolling' class on scroll container
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      container.classList.add("is-scrolling");
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = setTimeout(() => {
        container.classList.remove("is-scrolling");
      }, 1500);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    };
  }, []);

  if (!step) return null;

  const oliveButtonClass = "cursor-pointer rounded-full border border-olive-300 bg-card px-3 py-1.5 text-sm text-foreground shadow-sm hover:bg-olive-100 hover:border-olive-400 dark:border-neutral-olive-700 dark:bg-neutral-olive-900 dark:hover:bg-neutral-olive-800 dark:hover:border-neutral-olive-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="relative flex-1 min-h-0">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12"
          style={{
            background:
              "linear-gradient(to bottom, var(--background), transparent)",
          }}
        />
        <div
          ref={scrollContainerRef}
          className="chat-scroll h-full overflow-y-auto p-4"
        >
          <div className="flex min-h-full flex-col justify-end">
          {messages.length === 0 && !quickAck && <ChatSkeleton />}

          <div className="space-y-6">
            {messages.filter((msg) => {
              const text = msg.parts?.filter((p) => p.type === "text").map((p) => p.text).join("") || "";
              return text !== "__step_start__";
            }).map((msg) => {
              const content = msg.parts?.filter((p) => p.type === "text").map((p) => p.text).join("\n") || "";
              if (!content.trim()) return null;
              const cleanContent = renderClean(content);
              if (!cleanContent.trim()) return null;
              const isPersonaSelectMessage = msg.id === personaSelectMessageId;

              if (msg.role === "user") {
                // User message — olive-themed bubble (matching facilitator)
                const displayContent = cleanContent
                  .replace(/\[STEP_CONFIRMED\]\s*/g, "")
                  .replace(/\[SUGGEST_QUESTIONS\]\s*/g, "")
                  .trim();
                return (
                  <div key={msg.id} className="group flex items-start justify-end">
                    <div className="max-w-[80%]">
                      <div className="rounded-2xl bg-neutral-olive-200/60 dark:bg-olive-800/50 p-3 px-4 text-base text-foreground">
                        <p className="whitespace-pre-wrap">{displayContent}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              // Assistant message — document-style (no bubble), with PersonaInterrupt support
              const personaIntro = stepId === "user-research" ? detectPersonaIntro(content) : null;
              const { nodes: mindMapNodesParsed } = parseMindMapNodes(content);
              let beforeIntro = cleanContent;
              let afterIntro: string | null = null;
              if (personaIntro) {
                const emojiIdx = cleanContent.indexOf("🎭");
                if (emojiIdx > 0) {
                  beforeIntro = cleanContent.slice(0, emojiIdx).trim();
                  afterIntro = cleanContent.slice(emojiIdx).trim();
                }
              }

              return (
                <div key={msg.id}>
                  {personaIntro && !afterIntro && (
                    <PersonaInterrupt personaName={personaIntro.personaName} />
                  )}
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="text-base prose prose-base dark:prose-invert max-w-none">
                        <ReactMarkdown>{beforeIntro}</ReactMarkdown>
                      </div>
                      {mindMapNodesParsed.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {mindMapNodesParsed.map((node, i) => {
                            const added = addedMindMapLabels.has(node.label.toLowerCase());
                            return (
                              <button
                                key={i}
                                disabled={added}
                                onClick={() => handleAddMindMapNode(node)}
                                className={cn(
                                  "rounded-full border px-3 py-1 text-sm transition-colors",
                                  added
                                    ? "opacity-50 cursor-not-allowed bg-muted"
                                    : "cursor-pointer border-olive-300 bg-card hover:bg-olive-100",
                                )}
                              >
                                {added ? "\u2713 " : "+ "}{node.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {personaIntro && afterIntro && (
                        <>
                          <PersonaInterrupt personaName={personaIntro.personaName} />
                          <div className="text-base prose prose-base dark:prose-invert max-w-none">
                            <ReactMarkdown>{afterIntro}</ReactMarkdown>
                          </div>
                        </>
                      )}
                      {/* Persona selection checkboxes (user-research step only) */}
                      {isPersonaSelectMessage && personaOptions.length > 0 && !personaSelectConfirmed && (
                        <div className="mt-3 rounded-xl border border-olive-200 bg-olive-50/60 p-4 dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <p className="text-sm font-medium text-foreground mb-3">
                            Select up to 2 personas to interview:
                          </p>
                          <div className="space-y-2">
                            {personaOptions.map((persona, i) => {
                              const isSelected = personaSelections.has(persona.name);
                              const atLimit = personaSelections.size >= 2;
                              return (
                                <label
                                  key={i}
                                  className={cn(
                                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                                    isSelected
                                      ? "border-olive-400 bg-olive-100/80 dark:border-olive-600 dark:bg-olive-900/40"
                                      : "border-transparent hover:border-olive-200 hover:bg-olive-50/40 dark:hover:border-neutral-olive-700 dark:hover:bg-neutral-olive-900/20",
                                    !isSelected && atLimit && "opacity-50 cursor-not-allowed",
                                  )}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={!isSelected && atLimit}
                                    onCheckedChange={(checked) => {
                                      setPersonaSelections((prev) => {
                                        const next = new Set(prev);
                                        if (checked) {
                                          if (next.size < 2) next.add(persona.name);
                                        } else {
                                          next.delete(persona.name);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-foreground">{persona.name}</span>
                                    {persona.description && (
                                      <span className="text-sm text-muted-foreground"> — {persona.description}</span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                          <div className="mt-4 flex justify-center">
                            <Button
                              disabled={personaSelections.size === 0 || isLoading}
                              onClick={handlePersonaConfirm}
                              className="rounded-full bg-olive-700 px-5 py-2 text-sm font-medium text-white hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500"
                            >
                              Confirm Selection ({personaSelections.size}/2)
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator — match facilitator (no bubble) */}
            {status === "submitted" && (
              <>
                {quickAck && (
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="text-base">{quickAck}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className="text-base text-muted-foreground">
                      AI is thinking...
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Quick ack during streaming (before content arrives) */}
            {quickAck && status === "streaming" && (
              <div className="flex items-start">
                <div className="flex-1">
                  <div className="text-base italic text-muted-foreground">{quickAck}</div>
                </div>
              </div>
            )}

            {/* Inline suggestions — user-research with personas confirmed */}
            {stepId === "user-research" && personaSelectConfirmed && status === "ready" && messages.length > 0 && (
              <div className="space-y-2 pt-2">
                {suggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        disabled={isLoading}
                        onClick={() => handleSend(s)}
                        className={oliveButtonClass}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <button
                      disabled={isLoading}
                      onClick={() => {
                        setQuickAck(getRandomAck());
                        sendMessage({
                          role: "user",
                          parts: [{ type: "text", text: "[SUGGEST_QUESTIONS] Give me some question ideas for this persona." }],
                        });
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        oliveButtonClass,
                      )}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Give me a suggestion
                    </button>
                  </div>
                )}
                <p className="text-sm font-medium text-foreground pl-1">
                  Your turn — give me your next question.
                </p>
              </div>
            )}

            {/* Inline suggestions — all other contexts */}
            {suggestions.length > 0 && !(stepId === "user-research" && personaSelectConfirmed) && (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      disabled={isLoading}
                      onClick={() => handleSend(s)}
                      className={oliveButtonClass}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground pl-1">
                  Use the suggestions above or type your own below.
                </p>
              </div>
            )}

            {/* Auto-scroll target */}
            <div ref={messagesEndRef} />
          </div>
          </div>
        </div>
      </div>

      {/* Input area — match facilitator */}
      <div className="shrink-0 border-t bg-background/20 p-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }} className="flex gap-2">
          <TextareaAutosize
            minRows={1}
            maxRows={4}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Share your thoughts..."
            className={cn(
              "flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow]",
              "placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            )}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(inputValue); } }}
          />
          <Button
            type="submit"
            size="icon"
            variant="default"
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send />}
          </Button>
        </form>
      </div>
    </div>
  );
}
