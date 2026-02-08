import { STORAGE_KEY, QUESTS } from "./constants.js";

const ALLOWED_GENDERS = new Set(["male", "female", "nonbinary", "prefer_not_to_say"]);
const ALLOWED_ACTIVITY_LEVELS = new Set(["sedentary", "light", "moderate", "active", "very_active"]);

/**
 * Normalizes a nullable numeric field from legacy payloads.
 * Returns `null` when missing/invalid to keep schema stable and type-safe.
 */
function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normalizes a nullable integer field from legacy payloads.
 * Returns `null` when missing/invalid to keep schema stable and type-safe.
 */
function toNullableInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

/**
 * Validates enum-like string values used in profile settings.
 */
function toAllowedString(value, allowed) {
  if (typeof value !== "string") return null;
  return allowed.has(value) ? value : null;
}

/**
 * Hydrates profile data from current or legacy payloads.
 *
 * Schema note:
 * - Current schema stores profile under `state.profile` with nullable fields.
 * - Pre-profile payloads are supported by returning default null values.
 * - Invalid legacy values are coerced to null instead of throwing.
 */
function normalizeProfile(rawProfile = {}) {
  return {
    heightCm: toNullableNumber(rawProfile.heightCm),
    weightKg: toNullableNumber(rawProfile.weightKg),
    age: toNullableInteger(rawProfile.age),
    gender: toAllowedString(rawProfile.gender, ALLOWED_GENDERS),
    activityLevel: toAllowedString(rawProfile.activityLevel, ALLOWED_ACTIVITY_LEVELS),
    tdee: toNullableNumber(rawProfile.tdee),
    updatedAt: typeof rawProfile.updatedAt === "string" ? rawProfile.updatedAt : null,
  };
}

/**
 * Loads persisted app state and guarantees a safe default schema.
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);

    // Migration behavior:
    // - This loader is intentionally schema-tolerant and supports older payloads.
    // - Missing keys are backfilled from defaults.
    // - New keys (like `profile`) are hydrated with normalized nullable values.
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
      profile: normalizeProfile(parsed.profile),
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
    // Profile fields are nullable by default to support progressive onboarding
    // and backward compatibility with users created before profile data existed.
    profile: {
      heightCm: null,
      weightKg: null,
      age: null,
      gender: null,
      activityLevel: null,
      tdee: null,
      updatedAt: null,
    },
  };
}
