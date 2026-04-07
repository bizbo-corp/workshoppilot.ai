import { createStore } from 'zustand/vanilla';
import type { Feature, Subfeature, FeaturePrioritizationState } from '@/lib/feature-prioritization/types';

export type FeaturePrioritizationActions = {
  reorderFeatures: (category: 'core' | 'peripheral', fromIndex: number, toIndex: number) => void;
  updateFeature: (id: string, updates: Partial<Feature>) => void;
  deleteFeature: (id: string) => void;
  addFeature: (feature: Feature) => void;

  reorderSubfeatures: (featureId: string, fromIndex: number, toIndex: number) => void;
  updateSubfeature: (featureId: string, subfeatureId: string, updates: Partial<Subfeature>) => void;
  deleteSubfeature: (featureId: string, subfeatureId: string) => void;
  addSubfeature: (featureId: string, subfeature: Subfeature) => void;

  setState: (state: Partial<FeaturePrioritizationState>) => void;
  markDirty: () => void;
  markClean: () => void;
};

export type FeaturePrioritizationStore = FeaturePrioritizationState & FeaturePrioritizationActions;

const defaultState: FeaturePrioritizationState = {
  features: [],
  workshopTitle: '',
  personaName: '',
  challengeContext: '',
  generatedAt: undefined,
  isDirty: false,
  _schemaVersion: 1,
};

export function createFeaturePrioritizationStore(initState?: Partial<FeaturePrioritizationState>) {
  return createStore<FeaturePrioritizationStore>()((set) => ({
    ...defaultState,
    ...initState,

    reorderFeatures: (category, fromIndex, toIndex) =>
      set((state) => {
        const catFeatures = state.features.filter((f) => f.category === category);
        const otherFeatures = state.features.filter((f) => f.category !== category);
        const [moved] = catFeatures.splice(fromIndex, 1);
        catFeatures.splice(toIndex, 0, moved);
        // Maintain order: core first, then peripheral
        const ordered = category === 'core'
          ? [...catFeatures, ...otherFeatures]
          : [...otherFeatures, ...catFeatures];
        return { features: ordered, isDirty: true };
      }),

    updateFeature: (id, updates) =>
      set((state) => ({
        features: state.features.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        isDirty: true,
      })),

    deleteFeature: (id) =>
      set((state) => ({
        features: state.features.filter((f) => f.id !== id),
        isDirty: true,
      })),

    addFeature: (feature) =>
      set((state) => ({
        features: [...state.features, feature],
        isDirty: true,
      })),

    reorderSubfeatures: (featureId, fromIndex, toIndex) =>
      set((state) => ({
        features: state.features.map((f) => {
          if (f.id !== featureId) return f;
          const subs = [...f.subfeatures];
          const [moved] = subs.splice(fromIndex, 1);
          subs.splice(toIndex, 0, moved);
          return { ...f, subfeatures: subs };
        }),
        isDirty: true,
      })),

    updateSubfeature: (featureId, subfeatureId, updates) =>
      set((state) => ({
        features: state.features.map((f) => {
          if (f.id !== featureId) return f;
          return {
            ...f,
            subfeatures: f.subfeatures.map((sf) =>
              sf.id === subfeatureId ? { ...sf, ...updates } : sf
            ),
          };
        }),
        isDirty: true,
      })),

    deleteSubfeature: (featureId, subfeatureId) =>
      set((state) => ({
        features: state.features.map((f) => {
          if (f.id !== featureId) return f;
          return { ...f, subfeatures: f.subfeatures.filter((sf) => sf.id !== subfeatureId) };
        }),
        isDirty: true,
      })),

    addSubfeature: (featureId, subfeature) =>
      set((state) => ({
        features: state.features.map((f) => {
          if (f.id !== featureId) return f;
          return { ...f, subfeatures: [...f.subfeatures, subfeature] };
        }),
        isDirty: true,
      })),

    setState: (partial) => set(partial),
    markDirty: () => set({ isDirty: true }),
    markClean: () => set({ isDirty: false }),
  }));
}

export type FeaturePrioritizationStoreApi = ReturnType<typeof createFeaturePrioritizationStore>;
