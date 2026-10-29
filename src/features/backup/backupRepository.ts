import {
  buddyDatabase,
  type AllocationRecord,
  type BudgetCategoryRecord,
  type BudgetPlanRecord,
  type ProfileRecord,
} from "../../data/buddyDatabase";

export interface BuddyBackup {
  format: "buddy-backup";
  version: 2;
  exportedAt: string;
  activeProfileId: string | null;
  profiles: ProfileRecord[];
  budgetPlans: BudgetPlanRecord[];
  allocations: AllocationRecord[];
  categories: BudgetCategoryRecord[];
}

export class InvalidBackupError extends Error {
  constructor() {
    super("The backup file is invalid or unsupported.");
    this.name = "InvalidBackupError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isValidMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isProfile(value: unknown): value is ProfileRecord {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id, 100) &&
    typeof value.name === "string" &&
    value.name.trim() === value.name &&
    value.name.length > 0 &&
    value.name.length <= 40 &&
    value.nameKey === value.name.toLowerCase() &&
    isSafeTimestamp(value.createdAt) &&
    isSafeTimestamp(value.updatedAt)
  );
}

function isBudgetPlan(value: unknown): value is BudgetPlanRecord {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id, 100) &&
    isNonEmptyString(value.profileId, 100) &&
    isValidMonth(value.month) &&
    isValidAmount(value.incomeSatang) &&
    isSafeTimestamp(value.updatedAt)
  );
}

function isAllocation(value: unknown): value is AllocationRecord {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id, 100) &&
    isNonEmptyString(value.profileId, 100) &&
    isValidMonth(value.month) &&
    typeof value.name === "string" &&
    value.name.trim() === value.name &&
    value.name.length > 0 &&
    value.name.length <= 60 &&
    value.nameKey === value.name.toLowerCase() &&
    isValidAmount(value.amountSatang) &&
    isSafeTimestamp(value.createdAt) &&
    isSafeTimestamp(value.updatedAt)
  );
}

function isBudgetCategory(value: unknown): value is BudgetCategoryRecord {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id, 100) &&
    typeof value.name === "string" &&
    value.name.trim() === value.name &&
    value.name.length > 0 &&
    value.name.length <= 60 &&
    value.nameKey === value.name.toLowerCase() &&
    typeof value.isActive === "boolean" &&
    isSafeTimestamp(value.createdAt) &&
    isSafeTimestamp(value.updatedAt)
  );
}

function assertUnique(values: string[]): void {
  if (new Set(values).size !== values.length) {
    throw new InvalidBackupError();
  }
}

export function validateBackup(value: unknown): BuddyBackup {
  if (
    !isRecord(value) ||
    value.format !== "buddy-backup" ||
    (value.version !== 1 && value.version !== 2) ||
    typeof value.exportedAt !== "string" ||
    Number.isNaN(Date.parse(value.exportedAt)) ||
    !(value.activeProfileId === null || isNonEmptyString(value.activeProfileId, 100)) ||
    !Array.isArray(value.profiles) ||
    !Array.isArray(value.budgetPlans) ||
    !Array.isArray(value.allocations) ||
    !value.profiles.every(isProfile) ||
    !value.budgetPlans.every(isBudgetPlan) ||
    !value.allocations.every(isAllocation) ||
    (value.version === 2 &&
      (!Array.isArray(value.categories) ||
        !value.categories.every(isBudgetCategory)))
  ) {
    throw new InvalidBackupError();
  }

  const profiles = value.profiles;
  const budgetPlans = value.budgetPlans;
  const allocations = value.allocations;
  const categories =
    value.version === 2
      ? (value.categories as BudgetCategoryRecord[])
      : [...new Map(
          allocations.map((allocation, index) => [
            allocation.nameKey,
            {
              id: `legacy-category-${index}`,
              name: allocation.name,
              nameKey: allocation.nameKey,
              isActive: true,
              createdAt: allocation.createdAt,
              updatedAt: allocation.updatedAt,
            },
          ]),
        ).values()];
  const profileIds = profiles.map((profile) => profile.id);

  assertUnique(profileIds);
  assertUnique(profiles.map((profile) => profile.nameKey));
  assertUnique(budgetPlans.map((plan) => plan.id));
  assertUnique(budgetPlans.map((plan) => `${plan.profileId}\u0000${plan.month}`));
  assertUnique(allocations.map((allocation) => allocation.id));
  assertUnique(categories.map((category) => category.id));
  assertUnique(categories.map((category) => category.nameKey));
  assertUnique(
    allocations.map(
      (allocation) =>
        `${allocation.profileId}\u0000${allocation.month}\u0000${allocation.nameKey}`,
    ),
  );

  const profileIdSet = new Set(profileIds);
  if (
    (value.activeProfileId !== null && !profileIdSet.has(value.activeProfileId)) ||
    budgetPlans.some((plan) => !profileIdSet.has(plan.profileId)) ||
    allocations.some((allocation) => !profileIdSet.has(allocation.profileId))
  ) {
    throw new InvalidBackupError();
  }

  return {
    format: "buddy-backup",
    version: 2,
    exportedAt: value.exportedAt,
    activeProfileId: value.activeProfileId,
    profiles,
    budgetPlans,
    allocations,
    categories,
  };
}

export async function createBackup(): Promise<BuddyBackup> {
  return buddyDatabase.transaction(
    "r",
    buddyDatabase.profiles,
    buddyDatabase.budgetPlans,
    buddyDatabase.allocations,
    buddyDatabase.categories,
    buddyDatabase.settings,
    async () => {
      const [profiles, budgetPlans, allocations, categories, activeProfileSetting] =
        await Promise.all([
          buddyDatabase.profiles.toArray(),
          buddyDatabase.budgetPlans.toArray(),
          buddyDatabase.allocations.toArray(),
          buddyDatabase.categories.toArray(),
          buddyDatabase.settings.get("activeProfileId"),
        ]);

      return validateBackup({
        format: "buddy-backup",
        version: 2,
        exportedAt: new Date().toISOString(),
        activeProfileId: activeProfileSetting?.value ?? null,
        profiles,
        budgetPlans,
        allocations,
        categories,
      });
    },
  );
}

export async function restoreBackup(value: unknown): Promise<BuddyBackup> {
  const backup = validateBackup(value);

  await buddyDatabase.transaction(
    "rw",
    buddyDatabase.profiles,
    buddyDatabase.budgetPlans,
    buddyDatabase.allocations,
    buddyDatabase.categories,
    buddyDatabase.settings,
    async () => {
      await buddyDatabase.profiles.clear();
      await buddyDatabase.budgetPlans.clear();
      await buddyDatabase.allocations.clear();
      await buddyDatabase.categories.clear();
      await buddyDatabase.settings.clear();
      await buddyDatabase.profiles.bulkAdd(backup.profiles);
      await buddyDatabase.budgetPlans.bulkAdd(backup.budgetPlans);
      await buddyDatabase.allocations.bulkAdd(backup.allocations);
      await buddyDatabase.categories.bulkAdd(backup.categories);
      if (backup.activeProfileId !== null) {
        await buddyDatabase.settings.put({
          key: "activeProfileId",
          value: backup.activeProfileId,
        });
      }
    },
  );

  return backup;
}

export function serializeBackup(backup: BuddyBackup): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}
