import type { AllocationRecord } from "../data/buddyDatabase";

export type AllocationSortField =
  | "number"
  | "type"
  | "subnumber"
  | "itemType"
  | "name"
  | "amountSatang";

export type SortDirection = "asc" | "desc";

export interface AllocationSortRule {
  field: AllocationSortField;
  direction: SortDirection;
}

export interface AllocationSortPreset {
  id: string;
  name: string;
  rules: AllocationSortRule[];
}

export interface AllocationSortPreferences {
  presets: AllocationSortPreset[];
  defaultPresetId: string;
}

export const ALLOCATION_SORT_FIELDS: AllocationSortField[] = [
  "number",
  "type",
  "subnumber",
  "itemType",
  "name",
  "amountSatang",
];

export const ALLOCATION_SORT_FIELD_LABELS: Record<
  AllocationSortField,
  string
> = {
  number: "เลขที่",
  type: "type",
  subnumber: "เลขย่อย",
  itemType: "ชนิดของรายการ",
  name: "หมวดงบประมาณ",
  amountSatang: "จำนวนเงิน (บาท)",
};

export function createDefaultAllocationSortPreferences(): AllocationSortPreferences {
  const defaultPreset: AllocationSortPreset = {
    id: crypto.randomUUID(),
    name: "ลำดับรายการ",
    rules: [
      { field: "number", direction: "asc" },
      { field: "type", direction: "asc" },
      { field: "subnumber", direction: "asc" },
      { field: "itemType", direction: "asc" },
    ],
  };
  return {
    presets: [defaultPreset],
    defaultPresetId: defaultPreset.id,
  };
}

function compareHierarchicalNumber(first: string, second: string): number {
  const firstParts = first.replace(/\.$/, "").split(".");
  const secondParts = second.replace(/\.$/, "").split(".");
  const numericParts = [...firstParts, ...secondParts].every((part) =>
    /^\d+$/.test(part),
  );

  if (!numericParts) {
    return first.localeCompare(second, "th", {
      numeric: true,
      sensitivity: "base",
    });
  }

  for (let index = 0; index < Math.max(firstParts.length, secondParts.length); index += 1) {
    const firstPart = firstParts[index];
    const secondPart = secondParts[index];
    if (firstPart === undefined) return -1;
    if (secondPart === undefined) return 1;
    const normalizedFirst = firstPart.replace(/^0+(?=\d)/, "");
    const normalizedSecond = secondPart.replace(/^0+(?=\d)/, "");
    if (normalizedFirst.length !== normalizedSecond.length) {
      return normalizedFirst.length - normalizedSecond.length;
    }
    const comparison = normalizedFirst.localeCompare(normalizedSecond);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

function compareSortValues(
  first: AllocationRecord,
  second: AllocationRecord,
  field: AllocationSortField,
): number {
  if (field === "amountSatang") {
    return first.amountSatang - second.amountSatang;
  }

  if (field === "number" || field === "subnumber") {
    const firstValue = first[field].trim();
    const secondValue = second[field].trim();
    if (!firstValue || !secondValue) {
      if (!firstValue && !secondValue) return 0;
      return firstValue ? -1 : 1;
    }
    return compareHierarchicalNumber(firstValue, secondValue);
  }

  const firstValue = (field === "name" ? first.name : first[field]).trim();
  const secondValue = (field === "name" ? second.name : second[field]).trim();
  if (!firstValue || !secondValue) {
    if (!firstValue && !secondValue) return 0;
    return firstValue ? -1 : 1;
  }
  return firstValue.localeCompare(secondValue, "th", {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortAllocations(
  allocations: AllocationRecord[],
  rules: AllocationSortRule[],
): AllocationRecord[] {
  return allocations
    .map((allocation, originalIndex) => ({ allocation, originalIndex }))
    .sort((first, second) => {
      for (const rule of rules) {
        const comparison = compareSortValues(
          first.allocation,
          second.allocation,
          rule.field,
        );
        if (comparison !== 0) {
          if (
            (rule.field === "number" || rule.field === "subnumber") &&
            (!first.allocation[rule.field].trim() ||
              !second.allocation[rule.field].trim())
          ) {
            return comparison;
          }
          if (
            rule.field !== "number" &&
            rule.field !== "subnumber" &&
            rule.field !== "amountSatang" &&
            (!(rule.field === "name"
              ? first.allocation.name
              : first.allocation[rule.field]).trim() ||
              !(rule.field === "name"
                ? second.allocation.name
                : second.allocation[rule.field]).trim())
          ) {
            return comparison;
          }
          return rule.direction === "asc" ? comparison : -comparison;
        }
      }
      return first.originalIndex - second.originalIndex;
    })
    .map(({ allocation }) => allocation);
}

export function isAllocationSortPreferences(
  value: unknown,
): value is AllocationSortPreferences {
  if (
    typeof value !== "object" ||
    value === null ||
    !("presets" in value) ||
    !("defaultPresetId" in value) ||
    !Array.isArray(value.presets) ||
    typeof value.defaultPresetId !== "string" ||
    value.presets.length === 0
  ) {
    return false;
  }

  const presets = value.presets;
  const isSortPreset = (preset: unknown): preset is AllocationSortPreset =>
    typeof preset === "object" &&
    preset !== null &&
    "id" in preset &&
    "name" in preset &&
    "rules" in preset &&
    typeof preset.id === "string" &&
    Boolean(preset.id) &&
    typeof preset.name === "string" &&
    Boolean(preset.name.trim()) &&
    preset.name.trim() === preset.name &&
    preset.name.length <= 60 &&
    Array.isArray(preset.rules) &&
    preset.rules.length > 0 &&
    preset.rules.every(
      (rule: unknown): rule is AllocationSortRule =>
        typeof rule === "object" &&
        rule !== null &&
        "field" in rule &&
        "direction" in rule &&
        typeof rule.field === "string" &&
        ALLOCATION_SORT_FIELDS.includes(rule.field as AllocationSortField) &&
        (rule.direction === "asc" || rule.direction === "desc"),
    ) &&
    new Set(
      (preset.rules as AllocationSortRule[]).map((rule) => rule.field),
    ).size === preset.rules.length;

  if (
    !presets.every(isSortPreset)
  ) {
    return false;
  }

  const validPresets = presets as AllocationSortPreset[];
  return (
    new Set(validPresets.map((preset) => preset.id)).size === validPresets.length &&
    new Set(validPresets.map((preset) => preset.name.toLocaleLowerCase())).size ===
      validPresets.length &&
    validPresets.some((preset) => preset.id === value.defaultPresetId)
  );
}
