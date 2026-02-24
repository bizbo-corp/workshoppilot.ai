/**
 * Zustand drawing store for EzyDraw state management
 *
 * Factory pattern creates isolated store instances per drawing canvas.
 * Integrates custom DrawingHistory class for undo/redo.
 */

import { createStore } from 'zustand/vanilla';
import type { DrawingElement, DrawingTool } from '@/lib/drawing/types';
import { createElementId } from '@/lib/drawing/types';
import { DrawingHistory } from '@/lib/drawing/history';

export type DrawingState = {
  elements: DrawingElement[];
  backgroundImageUrl: string | null;
  selectedElementId: string | null;
  activeTool: DrawingTool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
  canUndo: boolean;
  canRedo: boolean;
};

export type DrawingActions = {
  addElement: (element: Omit<DrawingElement, 'id'>) => void;
  addElements: (elements: Omit<DrawingElement, 'id'>[]) => void;
  updateElement: (id: string, updates: Partial<DrawingElement>) => void;
  deleteElement: (id: string) => void;
  deleteElementGroup: (groupId: string) => void;
  updateElementGroup: (groupId: string, updates: Partial<DrawingElement>) => void;
  moveElementGroup: (groupId: string, deltaX: number, deltaY: number) => void;
  setElements: (elements: DrawingElement[]) => void;
  setActiveTool: (tool: DrawingTool) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  selectElement: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  getSnapshot: () => DrawingElement[];
  replaceWithGeneratedImage: (imageUrl: string) => void;
};

export type DrawingStore = DrawingState & DrawingActions;

const DEFAULT_STATE: DrawingState = {
  elements: [],
  backgroundImageUrl: null,
  selectedElementId: null,
  activeTool: 'pencil',
  strokeColor: '#000000',
  fillColor: 'transparent',
  strokeWidth: 4,
  fontSize: 16,
  canUndo: false,
  canRedo: false,
};

export const createDrawingStore = (initState?: Partial<DrawingState>) => {
  const history = new DrawingHistory();

  return createStore<DrawingStore>()((set, get) => {
    // Initialize history with starting state
    const initialState = { ...DEFAULT_STATE, ...initState };
    history.push({
      elements: initialState.elements,
      backgroundImageUrl: initialState.backgroundImageUrl,
    });

    return {
      ...initialState,

      addElement: (element) => {
        const newElement = {
          ...element,
          id: createElementId(),
        } as DrawingElement;

        set((state) => {
          const newElements = [...state.elements, newElement];
          history.push({ elements: newElements, backgroundImageUrl: state.backgroundImageUrl });

          return {
            elements: newElements,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
          };
        });
      },

      addElements: (elements) => {
        const newElements = elements.map((element) => ({
          ...element,
          id: createElementId(),
        } as DrawingElement));

        set((state) => {
          const updatedElements = [...state.elements, ...newElements];
          history.push({ elements: updatedElements, backgroundImageUrl: state.backgroundImageUrl });

          return {
            elements: updatedElements,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
          };
        });
      },

      updateElement: (id, updates) => {
        set((state) => {
          const newElements = state.elements.map((element) =>
            element.id === id ? ({ ...element, ...updates } as DrawingElement) : element
          );
          history.push({ elements: newElements, backgroundImageUrl: state.backgroundImageUrl });

          return {
            elements: newElements,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
          };
        });
      },

      deleteElement: (id) => {
        set((state) => {
          const newElements = state.elements.filter((element) => element.id !== id);
          history.push({ elements: newElements, backgroundImageUrl: state.backgroundImageUrl });

          return {
            elements: newElements,
            selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
          };
        });
      },

      deleteElementGroup: (groupId) => {
        set((state) => {
          const newElements = state.elements.filter((element) => element.groupId !== groupId);
          history.push({ elements: newElements, backgroundImageUrl: state.backgroundImageUrl });

          // Clear selection if selected element was in deleted group
          const wasSelectedInGroup = state.selectedElementId &&
            state.elements.find((el) => el.id === state.selectedElementId)?.groupId === groupId;

          return {
            elements: newElements,
            selectedElementId: wasSelectedInGroup ? null : state.selectedElementId,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
          };
        });
      },

      updateElementGroup: (groupId, updates) => {
        set((state) => {
          const newElements = state.elements.map((element) =>
            element.groupId === groupId ? ({ ...element, ...updates } as DrawingElement) : element
          );
          history.push({ elements: newElements, backgroundImageUrl: state.backgroundImageUrl });

          return {
            elements: newElements,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
          };
        });
      },

      moveElementGroup: (groupId, deltaX, deltaY) => {
        set((state) => {
          const newElements = state.elements.map((element) =>
            element.groupId === groupId
              ? ({ ...element, x: element.x + deltaX, y: element.y + deltaY } as DrawingElement)
              : element
          );
          history.push({ elements: newElements, backgroundImageUrl: state.backgroundImageUrl });

          return {
            elements: newElements,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
          };
        });
      },

      setElements: (elements) => {
        set(() => ({
          elements,
          // NOTE: Does NOT push to history - this is for loading from storage
        }));
      },

      setActiveTool: (tool) => {
        set(() => ({
          activeTool: tool,
        }));
      },

      setStrokeColor: (color) => {
        set(() => ({
          strokeColor: color,
        }));
      },

      setFillColor: (color) => {
        set(() => ({
          fillColor: color,
        }));
      },

      setStrokeWidth: (width) => {
        set(() => ({
          strokeWidth: width,
        }));
      },

      setFontSize: (size) => {
        set(() => ({
          fontSize: size,
        }));
      },

      selectElement: (id) => {
        set(() => ({
          selectedElementId: id,
        }));
      },

      undo: () => {
        const snapshot = history.undo();
        if (snapshot !== null) {
          set(() => ({
            elements: snapshot.elements,
            backgroundImageUrl: snapshot.backgroundImageUrl,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
          }));
        }
      },

      redo: () => {
        const snapshot = history.redo();
        if (snapshot !== null) {
          set(() => ({
            elements: snapshot.elements,
            backgroundImageUrl: snapshot.backgroundImageUrl,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
          }));
        }
      },

      clearAll: () => {
        set((state) => {
          const emptyElements: DrawingElement[] = [];
          history.clear();
          history.push({ elements: emptyElements, backgroundImageUrl: state.backgroundImageUrl });

          return {
            elements: emptyElements,
            selectedElementId: null,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
          };
        });
      },

      getSnapshot: () => {
        return get().elements;
      },

      /**
       * Clear all drawing elements and set a new background image.
       * Pushed as a single atomic history entry for clean undo/redo.
       */
      replaceWithGeneratedImage: (imageUrl) => {
        set(() => {
          const emptyElements: DrawingElement[] = [];
          history.push({ elements: emptyElements, backgroundImageUrl: imageUrl });

          return {
            elements: emptyElements,
            backgroundImageUrl: imageUrl,
            selectedElementId: null,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
          };
        });
      },
    };
  });
};
