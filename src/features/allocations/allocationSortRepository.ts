import { buddyDatabase } from "../../data/buddyDatabase";
import {
  ALLOCATION_SORT_FIELDS,
  createDefaultAllocationSortPreferences,
  isAllocationSortPreferences,
  type AllocationSortPreferences,
  type AllocationSortPreset,
  type AllocationSortRule,
} from "../../domain/allocationSort";

const SETTINGS_KEY = "allocationSortPreferences";

export class AllocationSortPresetError extends Error {
  constructor(readonly code: "required" | "tooLong" | "duplicate" | "notFound" | "last") {
    super(code);
    this.name = "AllocationSortPresetError";
  }
}

export class InvalidAllocationSortPreferencesError extends Error {
  constructor() {
    super("Stored allocation sort preferences are invalid.");
    this.name = "InvalidAllocationSortPreferencesError";
  }
}

function normalizePresetName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new AllocationSortPresetError("required");
  if (normalized.length > 60) throw new AllocationSortPresetError("tooLong");
  return normalized;
}

function validateRules(rules: AllocationSortRule[]): void {
  if (
    rules.length === 0 ||
    rules.length > ALLOCATION_SORT_FIELDS.length ||
    rules.some(
      (rule) =>
        !ALLOCATION_SORT_FIELDS.includes(rule.field) ||
        (rule.direction !== "asc" && rule.direction !== "desc"),
    ) ||
    new Set(rules.map((rule) => rule.field)).size !== rules.length
  ) {
    throw new InvalidAllocationSortPreferencesError();
  }
}

function parsePreferences(value: string): AllocationSortPreferences {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new InvalidAllocationSortPreferencesError();
  }
  if (!isAllocationSortPreferences(parsed)) {
    throw new InvalidAllocationSortPreferencesError();
  }
  return parsed;
}

async function writePreferences(
  preferences: AllocationSortPreferences,
): Promise<void> {
  if (!isAllocationSortPreferences(preferences)) {
    throw new InvalidAllocationSortPreferencesError();
  }
  await buddyDatabase.settings.put({
    key: SETTINGS_KEY,
    value: JSON.stringify(preferences),
  });
}

export async function getAllocationSortPreferences(): Promise<AllocationSortPreferences> {
  return buddyDatabase.transaction("rw", buddyDatabase.settings, async () => {
    const saved = await buddyDatabase.settings.get(SETTINGS_KEY);
    if (saved) return parsePreferences(saved.value);

    const defaults = createDefaultAllocationSortPreferences();
    await writePreferences(defaults);
    return defaults;
  });
}

async function updatePreferences(
  update: (
    current: AllocationSortPreferences,
  ) => AllocationSortPreferences,
): Promise<AllocationSortPreferences> {
  return buddyDatabase.transaction(
    "rw",
    buddyDatabase.settings,
    async () => {
      const saved = await buddyDatabase.settings.get(SETTINGS_KEY);
      const current = saved
        ? parsePreferences(saved.value)
        : createDefaultAllocationSortPreferences();
      const next = update(current);
      await writePreferences(next);
      return next;
    },
  );
}

function ensureUniqueName(
  presets: AllocationSortPreset[],
  name: string,
  exceptId?: string,
): void {
  if (
    presets.some(
      (preset) =>
        preset.id !== exceptId &&
        preset.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  ) {
    throw new AllocationSortPresetError("duplicate");
  }
}

export async function createAllocationSortPreset(
  name: string,
  rules: AllocationSortRule[],
): Promise<AllocationSortPreferences> {
  const normalizedName = normalizePresetName(name);
  validateRules(rules);
  return updatePreferences((current) => {
    ensureUniqueName(current.presets, normalizedName);
    return {
      ...current,
      presets: [
        ...current.presets,
        { id: crypto.randomUUID(), name: normalizedName, rules },
      ],
    };
  });
}

export async function renameAllocationSortPreset(
  presetId: string,
  name: string,
): Promise<AllocationSortPreferences> {
  const normalizedName = normalizePresetName(name);
  return updatePreferences((current) => {
    const existing = current.presets.find((preset) => preset.id === presetId);
    if (!existing) throw new AllocationSortPresetError("notFound");
    ensureUniqueName(current.presets, normalizedName, presetId);
    return {
      ...current,
      presets: current.presets.map((preset) =>
        preset.id === presetId ? { ...preset, name: normalizedName } : preset,
      ),
    };
  });
}

export async function updateAllocationSortPresetRules(
  presetId: string,
  rules: AllocationSortRule[],
): Promise<AllocationSortPreferences> {
  validateRules(rules);
  return updatePreferences((current) => {
    if (!current.presets.some((preset) => preset.id === presetId)) {
      throw new AllocationSortPresetError("notFound");
    }
    return {
      ...current,
      presets: current.presets.map((preset) =>
        preset.id === presetId ? { ...preset, rules } : preset,
      ),
    };
  });
}

export async function deleteAllocationSortPreset(
  presetId: string,
): Promise<AllocationSortPreferences> {
  return updatePreferences((current) => {
    if (!current.presets.some((preset) => preset.id === presetId)) {
      throw new AllocationSortPresetError("notFound");
    }
    if (current.presets.length === 1) {
      throw new AllocationSortPresetError("last");
    }
    const presets = current.presets.filter((preset) => preset.id !== presetId);
    return {
      presets,
      defaultPresetId:
        current.defaultPresetId === presetId
          ? presets[0].id
          : current.defaultPresetId,
    };
  });
}

export async function setDefaultAllocationSortPreset(
  presetId: string,
): Promise<AllocationSortPreferences> {
  return updatePreferences((current) => {
    if (!current.presets.some((preset) => preset.id === presetId)) {
      throw new AllocationSortPresetError("notFound");
    }
    return { ...current, defaultPresetId: presetId };
  });
}

export function createDefaultSortPreferencesForBackup(): AllocationSortPreferences {
  return createDefaultAllocationSortPreferences();
}

export function validateSortPreferencesForBackup(
  value: unknown,
): value is AllocationSortPreferences {
  return isAllocationSortPreferences(value);
}

export function parseSortPreferencesForBackup(
  serialized: string,
): AllocationSortPreferences {
  return parsePreferences(serialized);
}
