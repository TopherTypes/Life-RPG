import { STORAGE_KEY, QUESTS } from "./constants.js";

/**
 * Loads persisted app state and guarantees a safe default schema.
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return {
      entries: parsed.entries || {},
      reviews: {
        weekly: parsed.reviews?.weekly || {},
        monthly: parsed.reviews?.monthly || {},
      },
      acceptedQuests: {
        ...Object.fromEntries(Object.keys(QUESTS).map((key) => [key, false])),
        ...(parsed.acceptedQuests || {}),
      },
      settings: {
        compactCards: Boolean(parsed.settings?.compactCards),
        enableAnimations: parsed.settings?.enableAnimations !== false,
        showTips: parsed.settings?.showTips !== false,
      },
    };
  } catch {
    return getDefaultState();
  }
}

/**
 * Persists the full app state.
 */
export function persistState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Canonical default state shape for the MVP.
 */
export function getDefaultState() {
  return {
    entries: {},
    reviews: {
      weekly: {},
      monthly: {},
    },
    acceptedQuests: Object.fromEntries(Object.keys(QUESTS).map((key) => [key, false])),
    settings: {
      compactCards: false,
      enableAnimations: true,
      showTips: true,
    },
  };
}
