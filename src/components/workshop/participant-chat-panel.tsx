"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import TextareaAutosize from "react-textarea-autosize";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Sparkles, FileText, CheckCircle2 } from "lucide-react";
import { PersonaInterrupt } from "./persona-interrupt";
import { ResearchUploadDialog } from "./research-upload-dialog";
import { isPersonaCardForCluster } from "@/lib/canvas/canvas-position";
import type { ContributionType } from "@/lib/ai/prompts/research-analysis-prompts";
import { getStepByOrder } from "@/lib/workshop/step-metadata";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAutoSave } from "@/hooks/use-auto-save";
import { refetchStepMessages } from "@/actions/auto-save-actions";
import {
  useCanvasStore,
  useCanvasStoreApi,
} from "@/providers/canvas-store-provider";
import type { StickyNoteColor, MindMapNodeState, MindMapEdgeState } from "@/stores/canvas-store";
import { WorkshopPulseCard } from "@/components/workshop/workshop-pulse-card";
import { addCanvasItemsToBoard } from "@/lib/canvas/add-canvas-items";
import { saveCanvasState, savePersonaCandidates } from "@/actions/canvas-actions";
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
import type { ConceptCardData } from "@/lib/canvas/concept-card-types";

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

/** Parse [CONCEPT_CARD]{...JSON...}[/CONCEPT_CARD] blocks from AI content */
function parseConceptCards(content: string): {
  cleanContent: string;
  cards: (Partial<ConceptCardData> & { cardIndex?: number })[];
} {
  const cards: (Partial<ConceptCardData> & { cardIndex?: number })[] = [];
  const regex = /\[CONCEPT_CARD\]([\s\S]*?)\[\/CONCEPT_CARD\]/g;
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
    .replace(/\s*\[CONCEPT_CARD\][\s\S]*?\[\/CONCEPT_CARD\]\s*/g, " ")
    .replace(/\s*\[CONCEPT_COMPLETE\]\s*/g, " ")
    .trim();

  // Strip incomplete blocks mid-stream
  if (cleanContent.includes("[CONCEPT_CARD]")) {
    cleanContent = cleanContent.replace(/\[CONCEPT_CARD\][\s\S]*$/, "").trim();
  }

  return { cleanContent, cards };
}

const CANVAS_ENABLED_STEPS = [
  "challenge", "stakeholder-mapping", "user-research", "sense-making",
  "persona", "journey-mapping", "reframe", "ideation", "concept",
];

/** Distinct colors assigned to persona cards (one per persona) */
const PERSONA_CARD_COLORS: StickyNoteColor[] = ["yellow", "red", "orange", "blue", "green", "pink", "teal", "purple"];

interface ParticipantChatPanelProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  participantId: string;
  displayName: string;
  participantColor: string;
  initialMessages?: UIMessage[];
  /** SSR-hydrated latest workshop-pulse narration for this (workshop, step).
   *  Drives the pinned WorkshopPulseCard above the participant's chat so
   *  refreshers and late joiners see the current facilitator narration
   *  without waiting for the next live broadcast. Null when there is no
   *  narration yet for the step. */
  initialPulse?: import("./workshop-pulse-card").WorkshopPulseSnapshot | null;
}

export function ParticipantChatPanel({
  stepOrder, sessionId, workshopId,
  participantId, displayName, participantColor, initialMessages, initialPulse,
}: ParticipantChatPanelProps) {
  const step = getStepByOrder(stepOrder);
  const stepId = step?.id || "";
  const isCanvasStep = CANVAS_ENABLED_STEPS.includes(stepId);

  const addStickyNote = useCanvasStore((s) => s.addStickyNote);
  const updateStickyNote = useCanvasStore((s) => s.updateStickyNote);
  const stickyNotes = useCanvasStore((s) => s.stickyNotes);
  const addPersonaTemplate = useCanvasStore((s) => s.addPersonaTemplate);
  const updatePersonaTemplate = useCanvasStore((s) => s.updatePersonaTemplate);
  const addHmwCard = useCanvasStore((s) => s.addHmwCard);
  const updateHmwCard = useCanvasStore((s) => s.updateHmwCard);
  const pendingHmwChipSelection = useCanvasStore((s) => s.pendingHmwChipSelection);
  const setPendingHmwChipSelection = useCanvasStore((s) => s.setPendingHmwChipSelection);
  const pendingHmwFieldFocus = useCanvasStore((s) => s.pendingHmwFieldFocus);
  const setPendingHmwFieldFocus = useCanvasStore((s) => s.setPendingHmwFieldFocus);
  const addMindMapNode = useCanvasStore((s) => s.addMindMapNode);
  const mindMapNodes = useCanvasStore((s) => s.mindMapNodes);
  const mindMapEdges = useCanvasStore((s) => s.mindMapEdges);
  const setPendingFitView = useCanvasStore((s) => s.setPendingFitView);
  const updateConceptCard = useCanvasStore((s) => s.updateConceptCard);
  const addConceptCard = useCanvasStore((s) => s.addConceptCard);
  const conceptActivityStarted = useCanvasStore((s) => s.conceptActivityStarted);
  const interviewMode = useCanvasStore((s) => s.interviewMode);
  const journeyPoll = useCanvasStore((s) => s.journeyPoll);
  const storeApi = useCanvasStoreApi();
  const confirmPreviewsByOwner = useCanvasStore((s) => s.confirmPreviewsByOwner);
  const rejectPreviewsByOwner = useCanvasStore((s) => s.rejectPreviewsByOwner);
  // Participant research contribution (Step 3): paste/upload → preview (owned) → confirm.
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [analyzingResearch, setAnalyzingResearch] = React.useState(false);
  const [pendingResearch, setPendingResearch] = React.useState<{
    personaCount: number;
    insightCount: number;
  } | null>(null);

  // Analyze this participant's research and place it as preview stickies OWNED
  // by them (so the board shows who contributed). No facilitator-only effects
  // (no interviewMode/compile) — the participant just confirms their own batch.
  const handleAnalyzeResearch = React.useCallback(
    async (transcript: string, contributionType: ContributionType) => {
      setAnalyzingResearch(true);
      try {
        const existingPersonaCards = storeApi
          .getState()
          .stickyNotes.filter(
            (n) =>
              (!n.type || n.type === "stickyNote") &&
              !n.cluster &&
              n.text.includes(" — "),
          );
        const existingPersonaNames = existingPersonaCards.map((n) => n.text);

        const res = await fetch("/api/ai/analyze-research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workshopId, transcript, existingPersonaNames, contributionType }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err?.error || "Couldn't analyze that research — try again.");
          return;
        }
        const { data } = (await res.json()) as {
          data: {
            personas: { name: string; role?: string; archetype: string; summary: string }[];
            insights: { personaName: string; text: string }[];
            synthesized?: { text: string }[];
          };
        };
        const personas = data?.personas || [];
        const insights = data?.insights || [];
        const synthesized = data?.synthesized || [];
        if (personas.length === 0 && insights.length === 0 && synthesized.length === 0) {
          toast.error("I couldn't find any insights in that text.");
          return;
        }

        const owner = {
          ownerId: participantId,
          ownerName: displayName,
          ownerColor: participantColor,
        };
        const reason = `From ${displayName}'s research`;
        const existingCount = existingPersonaCards.length;
        const newPersonas = personas.filter(
          (p) =>
            !existingPersonaCards.some((card) => isPersonaCardForCluster(card, p.name)),
        );
        const personaCardText = (p: { name: string; role?: string; summary: string }) =>
          [p.name, p.role, p.summary].filter((s) => s && s.trim()).join(" — ");
        const personaItems = newPersonas.map((p, i) => ({
          text: personaCardText(p),
          color: PERSONA_CARD_COLORS[(existingCount + i) % PERSONA_CARD_COLORS.length],
        }));
        if (personaItems.length > 0) {
          addCanvasItemsToBoard({
            stepId,
            items: personaItems,
            storeApi,
            addStickyNote,
            updateStickyNote,
            owner,
            preview: { previewReason: reason },
          });
        }

        const insightItems = insights.map((ins) => ({
          text: ins.text,
          cluster: ins.personaName,
        }));
        if (insightItems.length > 0) {
          addCanvasItemsToBoard({
            stepId,
            items: insightItems,
            storeApi,
            addStickyNote,
            updateStickyNote,
            owner,
            preview: { previewReason: reason },
          });
        }

        const synthItems = synthesized.map((s) => ({
          text: s.text,
          cluster: "Synthesized",
          color: "white" as StickyNoteColor,
        }));
        if (synthItems.length > 0) {
          addCanvasItemsToBoard({
            stepId,
            items: synthItems,
            storeApi,
            addStickyNote,
            updateStickyNote,
            owner,
            preview: { previewReason: `Synthesized from ${displayName}'s research` },
          });
        }

        setPendingResearch({
          personaCount: newPersonas.length,
          insightCount: insightItems.length + synthItems.length,
        });
        setUploadOpen(false);
      } catch (e) {
        console.error("participant analyze-research failed:", e);
        toast.error("Something went wrong analyzing your research.");
      } finally {
        setAnalyzingResearch(false);
      }
    },
    [
      workshopId,
      stepId,
      storeApi,
      addStickyNote,
      updateStickyNote,
      participantId,
      displayName,
      participantColor,
    ],
  );

  const handleConfirmResearch = React.useCallback(() => {
    confirmPreviewsByOwner(participantId);
    setPendingResearch(null);
  }, [confirmPreviewsByOwner, participantId]);

  const handleDiscardResearch = React.useCallback(() => {
    rejectPreviewsByOwner(participantId);
    setPendingResearch(null);
  }, [rejectPreviewsByOwner, participantId]);

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

  const { messages, sendMessage, status, setMessages, stop } = useChat({
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

  // Abort any in-flight /api/chat request when scope ACTUALLY changes. We can't use
  // useEffect cleanup directly because React 19 Strict Mode dev fires a spurious
  // mount/unmount cycle which would abort the very first auto-start trigger before
  // it reaches the server. Cross-scope leaks are still prevented server-side by the
  // scope-assertion check at /api/chat route.ts (404/409 on session/workshop mismatch).
  const prevScopeRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const scope = `${sessionId}:${stepId}:${workshopId}`;
    if (prevScopeRef.current !== null && prevScopeRef.current !== scope) {
      stop();
    }
    prevScopeRef.current = scope;
  }, [sessionId, stepId, workshopId, stop]);

  // Auto-start: send hidden trigger when entering a step with no prior messages
  // For Step 9 (concept), wait until the facilitator clicks "Start Activity"
  // Layered guards against duplicate greetings:
  //   - hasAssistantMessage: never re-trigger if any assistant reply is in state
  //   - alreadyHasStepStartTrigger: covers remounts that reset hasAutoStarted ref
  //   - deterministic message id: unique constraint blocks duplicate trigger inserts
  //   - server-side singleton in /api/chat replays the stored greeting if a
  //     duplicate trigger still leaks through, so no second AI generation happens
  const hasAutoStarted = React.useRef(false);
  React.useEffect(() => {
    const alreadyHasStepStartTrigger = messages.some(
      (m) =>
        m.role === "user" &&
        m.parts?.some(
          (p) => p.type === "text" && p.text === "__step_start__",
        ),
    );
    const hasAssistantMessage = messages.some((m) => m.role === "assistant");
    if (
      (!initialMessages || initialMessages.length === 0) &&
      messages.length === 0 &&
      !hasAssistantMessage &&
      !alreadyHasStepStartTrigger &&
      status === "ready" &&
      !hasAutoStarted.current &&
      (stepId !== "concept" || conceptActivityStarted) &&
      // Step 3 hold: don't auto-start the participant's chat until the
      // facilitator has picked AI vs Real interviews. Without this gate the
      // participant's greeting fires immediately on step entry and Gemini
      // leaks the interview-mode framing in prose even though the
      // [INTERVIEW_MODE] markup is stripped client-side.
      (stepId !== "user-research" || interviewMode !== null) &&
      // Step 6 hold: same idea — don't auto-start journey-mapping until the
      // team has locked a journey template via the poll. Greeting would
      // otherwise reference template options the participant can't act on.
      (stepId !== "journey-mapping" || !!journeyPoll?.lockedTemplate)
    ) {
      hasAutoStarted.current = true;
      setQuickAck(getRandomAck());
      sendMessage({
        id: `step-start:${sessionId}:${stepId}:${participantId}`,
        role: "user",
        parts: [{ type: "text", text: "__step_start__" }],
      });
    }
  }, [initialMessages, messages, messages.length, status, sendMessage, sessionId, stepId, participantId, conceptActivityStarted, interviewMode, journeyPoll?.lockedTemplate]);

  // Stream-empty recovery: the AI SDK v6 sometimes completes the request (status →
  // ready) without delivering the assistant message into client state, even though
  // the server-side onFinish fired and persisted the row. When this happens we pull
  // the just-persisted greeting from the DB and inject it directly into useChat's
  // state. Same effect as a full page reload, no UI flash.
  const prevStatusRef = React.useRef(status);
  React.useEffect(() => {
    const wasWaiting = prevStatusRef.current === "submitted" || prevStatusRef.current === "streaming";
    const nowReady = status === "ready";
    prevStatusRef.current = status;
    if (!wasWaiting || !nowReady) return;
    const hasAssistantContent = messages.some(
      (m) => m.role === "assistant" && m.parts?.some((p) => p.type === "text" && p.text.length > 0)
    );
    if (hasAssistantContent) return;
    console.log(`[greeting-lifecycle] client(participant):stream-empty-recovery scope=(${sessionId},${stepId},${participantId})`);
    // Small delay so any in-flight chunk has a chance to land before we replace state.
    const t = setTimeout(async () => {
      try {
        const fresh = await refetchStepMessages(sessionId, stepId, participantId);
        const hasContent = fresh.some((m) => m.role === "assistant" && m.parts?.some((p) => p.type === "text" && (p as { text?: string }).text && (p as { text?: string }).text!.length > 0));
        if (hasContent) {
          console.log(`[greeting-lifecycle] client(participant):refetch-success count=${fresh.length}`);
          setMessages(fresh);
          setQuickAck(null);
        } else {
          console.log(`[greeting-lifecycle] client(participant):refetch-empty — no DB content yet`);
        }
      } catch (err) {
        console.error(`[greeting-lifecycle] client(participant):refetch-failed`, err);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [status, messages, sessionId, stepId, participantId, setMessages]);

  // Stuck-state recovery: if status stays in submitted/streaming >45s with no assistant
  // chunks arriving, surface a retry banner. 45s sits between Gemini worst case (~15s)
  // and Vercel maxDuration (60s) so we recover before the function dies.
  const retryStepStart = React.useCallback(() => {
    stop();
    setMessages([]);
    hasAutoStarted.current = false;
    setQuickAck(null);
    console.log(`[greeting-lifecycle] client(participant):manual-retry scope=(${sessionId},${stepId},${participantId})`);
  }, [stop, setMessages, sessionId, stepId, participantId]);

  React.useEffect(() => {
    const isWaiting = status === "submitted" || status === "streaming";
    const hasAssistantContent = messages.some(
      (m) => m.role === "assistant" && m.parts?.some((p) => p.type === "text" && p.text.length > 0)
    );
    if (!isWaiting || hasAssistantContent) return;
    const timer = setTimeout(() => {
      toast("The AI is taking longer than usual.", {
        id: "ai-stuck-retry",
        description: "Want to retry?",
        action: { label: "Retry", onClick: retryStepStart },
        duration: Infinity,
      });
    }, 45_000);
    return () => clearTimeout(timer);
  }, [status, messages, retryStepStart]);

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
      updateStickyNote,
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
  }, [personaSelections, personaOptions, stepId, workshopId, storeApi, addStickyNote, updateStickyNote, participantId, displayName, participantColor, sendMessage]);

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
        // In ownership mode, target only this participant's cards (no fallback to avoid cross-card edits)
        const existing = isOwnershipMode
          ? latestHmwCards.filter((c) => c.ownerId === participantId)[targetIndex]
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

    // Process concept card blocks (concept step) — ownership-based matching
    const { cards: conceptCardParsed } = parseConceptCards(content);
    if (conceptCardParsed.length > 0 && stepId === 'concept') {
      let latestConceptCards = storeApi.getState().conceptCards;

      for (const parsed of conceptCardParsed) {
        const targetIndex = parsed.cardIndex ?? 0;
        // Match by relative index within participant's own cards (no cross-ownership fallback)
        const ownerCards = latestConceptCards.filter((c) => c.ownerId === participantId);
        const existing = ownerCards[targetIndex];

        if (existing) {
          // Guard: skip updates to filled cards unless AI explicitly includes cardIndex
          if (existing.cardState === 'filled' && parsed.cardIndex === undefined) {
            continue;
          }

          const updates: Partial<ConceptCardData> = { ...parsed };

          // Transition skeleton → active on first update
          if (existing.cardState === 'skeleton') {
            updates.cardState = 'active';
          }

          // Auto-detect 'filled' state
          const merged = { ...existing, ...updates };
          const hasPitch = !!merged.elevatorPitch;
          const hasUsp = !!merged.usp;
          const hasSwot = merged.swot?.strengths?.some((s: string) => !!s);
          const hasFeasibility = merged.feasibility?.technical?.score > 0;
          if (hasPitch && hasUsp && hasSwot && hasFeasibility) {
            updates.cardState = 'filled';
          }

          updateConceptCard(existing.id, updates);
        }
        // Refresh reference for subsequent iterations
        latestConceptCards = storeApi.getState().conceptCards;
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
      updateStickyNote,
      owner: { ownerId: participantId, ownerName: displayName, ownerColor: participantColor },
    });
    if (addedCount > 0) {
      toast.success(`${addedCount} item${addedCount > 1 ? "s" : ""} added to board`);
    }
  }, [lastAssistantMsg, status, isCanvasStep, stepId, storeApi, addStickyNote, updateStickyNote, addPersonaTemplate, updatePersonaTemplate, addHmwCard, updateHmwCard, updateConceptCard, addConceptCard, participantId, displayName, participantColor]);

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

  // Force-flush canvas state to DB before sending a chat message
  // Ensures the AI API gets fresh data (e.g. after facilitator reassignment).
  //
  // Participants always run in multiplayer, where the canvas store keeps
  // isDirty=false (Liveblocks owns sync). The AI reads from Postgres, not
  // Liveblocks, so we must always flush — never short-circuit on isDirty
  // here. df_d3dgmx43.
  const flushCanvasToDb = React.useCallback(async () => {
    if (!isCanvasStep) return;
    const s = storeApi.getState();
    await saveCanvasState(workshopId, stepId, {
      stickyNotes: s.stickyNotes,
      ...(s.gridColumns.length > 0 ? { gridColumns: s.gridColumns } : {}),
      ...(s.drawingNodes.length > 0 ? { drawingNodes: s.drawingNodes } : {}),
      ...(s.mindMapNodes.length > 0 ? { mindMapNodes: s.mindMapNodes } : {}),
      ...(s.mindMapEdges.length > 0 ? { mindMapEdges: s.mindMapEdges } : {}),
      ...(s.crazy8sSlots.length > 0 ? { crazy8sSlots: s.crazy8sSlots } : {}),
      ...(s.conceptCards.length > 0 ? { conceptCards: s.conceptCards } : {}),
      ...(s.personaTemplates.length > 0 ? { personaTemplates: s.personaTemplates } : {}),
      ...(s.hmwCards.length > 0 ? { hmwCards: s.hmwCards } : {}),
    });
    s.markClean();
  }, [isCanvasStep, workshopId, stepId, storeApi]);

  // HMW field focus → trigger AI suggestions for empty field
  React.useEffect(() => {
    if (!pendingHmwFieldFocus || isLoading) return;
    const { field } = pendingHmwFieldFocus;
    setPendingHmwFieldFocus(null);

    const fieldLabels: Record<string, string> = {
      givenThat: "Given that",
      persona: "how might we (help)",
      immediateGoal: "do/be/feel/achieve",
      deeperGoal: "So they can",
    };
    const fieldLabel = fieldLabels[field] || field;

    setQuickAck(getRandomAck());
    (async () => {
      try {
        await flushCanvasToDb();
        sendMessage({
          role: "user",
          parts: [{ type: "text", text: `I need suggestions for the "${fieldLabel}" field` }],
        });
      } catch (err) {
        console.error("Failed to send HMW field focus request:", err);
      }
    })();
  }, [pendingHmwFieldFocus, isLoading, setPendingHmwFieldFocus, flushCanvasToDb, sendMessage]);

  const handleSend = React.useCallback(async (text: string) => {
    if (!text.trim() || status === "streaming") return;
    setSuggestions([]);
    setQuickAck(getRandomAck());
    setInputValue("");
    await flushCanvasToDb();
    sendMessage({ text });
  }, [status, sendMessage, flushCanvasToDb]);

  const renderClean = React.useCallback((content: string) => {
    let { cleanContent } = stripLeakedTags(content);
    cleanContent = parseSuggestions(cleanContent).cleanContent;
    cleanContent = parsePersonaSelect(cleanContent).cleanContent;
    cleanContent = parseCanvasItems(cleanContent).cleanContent;
    // Strip [INTERVIEW_MODE] markup — only the facilitator handles this choice
    cleanContent = cleanContent
      .replace(/\[INTERVIEW_MODE\][\s\S]*?\[\/INTERVIEW_MODE\]/, "")
      .replace(/\[INTERVIEW_MODE\][\s\S]*$/, "")
      // Strip [JOURNEY_POLL_OPTIONS] markup — facilitator-only (rendered as the
      // template poll card in the participant's right panel, not in chat)
      .replace(/\[JOURNEY_POLL_OPTIONS\][\s\S]*?\[\/JOURNEY_POLL_OPTIONS\]/g, "")
      .replace(/\[JOURNEY_POLL_OPTIONS\][\s\S]*$/g, "")
      // Strip [JOURNEY_STAGES] markup — emitted by facilitator AI after the
      // poll locks; the grid columns update via canvas store, not chat display
      .replace(/\[JOURNEY_STAGES\][\s\S]*?\[\/JOURNEY_STAGES\]/g, "")
      .replace(/\[JOURNEY_STAGES\][\s\S]*$/g, "")
      // Strip [PERSONA_PLAN] markup — facilitator only
      .replace(/\[PERSONA_PLAN\][\s\S]*?\[\/PERSONA_PLAN\]/g, "")
      .replace(/\[PERSONA_PLAN\][\s\S]*$/g, "")
      // Strip [PERSONA_TEMPLATE] markup
      .replace(/\[PERSONA_TEMPLATE\][\s\S]*?\[\/PERSONA_TEMPLATE\]/g, "")
      .replace(/\[PERSONA_TEMPLATE\][\s\S]*$/g, "")
      // Strip [HMW_CARD] markup — rendered on canvas, not in chat
      .replace(/\[HMW_CARD\][\s\S]*?\[\/HMW_CARD\]/g, "")
      .replace(/\[HMW_CARD\][\s\S]*$/g, "")
      // Strip [CONCEPT_CARD] markup — facilitator-only, rendered on canvas
      .replace(/\[CONCEPT_CARD\][\s\S]*?\[\/CONCEPT_CARD\]/g, "")
      .replace(/\[CONCEPT_CARD\][\s\S]*$/g, "")
      // Strip [CONCEPT_COMPLETE] marker
      .replace(/\s*\[CONCEPT_COMPLETE\]\s*/g, " ")
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

  // Step 3 hold card — shown while the facilitator is picking AI vs Real
  // interviews. Suppresses the chat scaffold entirely so no skeleton, no
  // greeting, no input UI flashes before the choice is broadcast.
  if (stepId === "user-research" && interviewMode === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-3">
          <div className="text-3xl">🎤</div>
          <h3 className="text-lg font-semibold text-foreground">
            Setting up interviews
          </h3>
          <p className="text-sm text-muted-foreground">
            Your facilitator is choosing how we&apos;ll run interviews. Hang tight — we&apos;ll start in a moment.
          </p>
        </div>
      </div>
    );
  }

  // Step 6 hold card — shown while the team is voting on a journey template
  // and the facilitator hasn't locked the team's choice yet. The poll itself
  // is rendered in the right panel (canvas side); this just keeps the chat
  // quiet so the AI greeting doesn't fire until the template is settled.
  if (
    stepId === "journey-mapping" &&
    (!journeyPoll || !journeyPoll.lockedTemplate)
  ) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-3">
          <div className="text-3xl">🗺️</div>
          <h3 className="text-lg font-semibold text-foreground">
            Choosing a journey template
          </h3>
          <p className="text-sm text-muted-foreground">
            Your team is voting on which journey to map. Cast your vote on the canvas — we&apos;ll start as soon as the facilitator locks the choice.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Workshop pulse — pinned awareness of the facilitator's AI narration.
          Read-only by design. Renders nothing when there is no narration yet
          for this step. */}
      <WorkshopPulseCard stepId={stepId} initial={initialPulse ?? null} />
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
              return (
                text !== "__step_start__" &&
                !text.startsWith("__journey_template_locked__")
              );
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
                  Your turn — use one of the questions above or write your next question.
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

      {/* Research contribution: review-and-confirm bar for this participant's batch */}
      {stepId === "user-research" && pendingResearch && (
        <div className="mx-4 mb-2 rounded-xl border border-olive-200 bg-olive-50/60 p-3 text-center dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-sm text-foreground mb-2">
            Added{" "}
            <strong>
              {pendingResearch.insightCount} insight
              {pendingResearch.insightCount === 1 ? "" : "s"}
            </strong>
            {pendingResearch.personaCount > 0 && (
              <>
                {" "}across{" "}
                <strong>
                  {pendingResearch.personaCount}{" "}
                  {pendingResearch.personaCount === 1 ? "interviewee" : "interviewees"}
                </strong>
              </>
            )}{" "}
            — review on the board, then add them.
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={handleConfirmResearch}
              className="inline-flex items-center gap-1.5 rounded-full bg-olive-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Add to board
            </button>
            <button
              onClick={handleDiscardResearch}
              className="inline-flex items-center rounded-full border border-olive-300 bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground dark:border-neutral-olive-700 dark:bg-neutral-olive-800"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Input area — match facilitator */}
      <div className="shrink-0 border-t bg-background/20 p-4">
        {stepId === "user-research" && interviewMode === "real" && (
          <div className="mb-2 flex justify-start">
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-olive-300 bg-card px-3 py-1.5 text-xs font-medium text-olive-800 shadow-sm transition-all hover:bg-olive-100 dark:border-neutral-olive-700 dark:bg-neutral-olive-800 dark:text-olive-300 dark:hover:bg-neutral-olive-700"
            >
              <FileText className="h-3.5 w-3.5" />
              Add your research
            </button>
          </div>
        )}
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

      {stepId === "user-research" && (
        <ResearchUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onAnalyze={handleAnalyzeResearch}
          analyzing={analyzingResearch}
        />
      )}
    </div>
  );
}
