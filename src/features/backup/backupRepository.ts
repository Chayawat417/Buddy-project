import {
  buddyDatabase,
  type AllocationRecord,
  type BudgetCategoryRecord,
  type BudgetPlanRecord,
  type CreditCardExpenseRecord,
  type ExpenseMerchantRecord,
  type ProfileRecord,
} from "../../data/buddyDatabase";
import {
  createDefaultSortPreferencesForBackup,
  parseSortPreferencesForBackup,
  validateSortPreferencesForBackup,
} from "../allocations/allocationSortRepository";
import {
  getBudgetCategoryOrder,
  getDefaultBudgetCategoryOrder,
  validateCategoryOrderForBackup,
} from "../allocations/categoryOrderRepository";
import type { AllocationSortPreferences } from "../../domain/allocationSort";

export interface BuddyBackup {
  format: "buddy-backup";
  version: 6;
  exportedAt: string;
  activeProfileId: string | null;
  profiles: ProfileRecord[];
  budgetPlans: BudgetPlanRecord[];
  allocations: AllocationRecord[];
  categories: BudgetCategoryRecord[];
  sortPreferences: AllocationSortPreferences;
  categoryOrder: string[];
  expenseMerchants: ExpenseMerchantRecord[];
  creditCardExpenses: CreditCardExpenseRecord[];
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

function isAllocation(
  value: unknown,
  requireMetadata: boolean,
): value is AllocationRecord {
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
    (requireMetadata
      ? typeof value.number === "string" &&
        value.number.length <= 60 &&
        typeof value.type === "string" &&
        value.type.length <= 60 &&
        typeof value.subnumber === "string" &&
        value.subnumber.length <= 60 &&
        typeof value.itemType === "string" &&
        value.itemType.length <= 60
      : ["number", "type", "subnumber", "itemType"].every(
          (field) =>
            value[field] === undefined ||
            (typeof value[field] === "string" && value[field].length <= 60),
        )) &&
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

function isExpenseMerchant(value: unknown): value is ExpenseMerchantRecord {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id, 100) &&
    typeof value.name === "string" &&
    value.name.trim() === value.name &&
    value.name.length > 0 &&
    value.name.length <= 80 &&
    value.nameKey === value.name.toLowerCase() &&
    isSafeTimestamp(value.createdAt) &&
    isSafeTimestamp(value.updatedAt)
  );
}

function isValidPurchaseDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isCreditCardExpense(
  value: unknown,
  requireSettlement: boolean,
): value is CreditCardExpenseRecord {
  if (!isRecord(value)) return false;
  const isShared = value.isShared === true;
  const peopleCount = value.peopleCount;
  const amountSatang = value.amountSatang;
  return (
    isNonEmptyString(value.id, 100) &&
    isValidPurchaseDate(value.purchaseDate) &&
    isValidMonth(value.month) &&
    value.month === value.purchaseDate.slice(0, 7) &&
    isNonEmptyString(value.merchantId, 100) &&
    typeof value.merchantName === "string" &&
    value.merchantName.trim() === value.merchantName &&
    value.merchantName.length > 0 &&
    value.merchantName.length <= 80 &&
    isValidAmount(amountSatang) &&
    amountSatang > 0 &&
    typeof value.isShared === "boolean" &&
    typeof peopleCount === "number" &&
    Number.isSafeInteger(peopleCount) &&
    (isShared ? peopleCount >= 2 : peopleCount === 1) &&
    isValidAmount(value.personalAmountSatang) &&
    value.personalAmountSatang ===
      (isShared ? Math.round(amountSatang / peopleCount) : amountSatang) &&
    (requireSettlement
      ? typeof value.isSettled === "boolean"
      : value.isSettled === undefined || typeof value.isSettled === "boolean") &&
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
  if (!isRecord(value)) throw new InvalidBackupError();
  const version = value.version;
  if (
    value.format !== "buddy-backup" ||
    typeof version !== "number" ||
    (version !== 1 &&
      version !== 2 &&
      version !== 3 &&
      version !== 4 &&
      version !== 5 &&
      version !== 6) ||
    typeof value.exportedAt !== "string" ||
    Number.isNaN(Date.parse(value.exportedAt)) ||
    !(value.activeProfileId === null || isNonEmptyString(value.activeProfileId, 100)) ||
    !Array.isArray(value.profiles) ||
    !Array.isArray(value.budgetPlans) ||
    !Array.isArray(value.allocations) ||
    !value.profiles.every(isProfile) ||
    !value.budgetPlans.every(isBudgetPlan) ||
    !value.allocations.every((allocation) =>
      isAllocation(allocation, version >= 3),
    ) ||
    (version >= 2 &&
      (!Array.isArray(value.categories) ||
        !value.categories.every(isBudgetCategory))) ||
    (version >= 3 &&
      !validateSortPreferencesForBackup(value.sortPreferences)) ||
    (version >= 4 &&
      !validateCategoryOrderForBackup(value.categoryOrder, value.categories)) ||
    (version >= 5 &&
      (!validateCategoryOrderForBackup(value.categoryOrder, value.categories) ||
        !Array.isArray(value.expenseMerchants) ||
        !value.expenseMerchants.every(isExpenseMerchant) ||
        !Array.isArray(value.creditCardExpenses) ||
        !value.creditCardExpenses.every((expense) =>
          isCreditCardExpense(expense, version === 6),
        )))
  ) {
    throw new InvalidBackupError();
  }

  const profiles = value.profiles;
  const budgetPlans = value.budgetPlans;
  const allocations = (value.allocations as AllocationRecord[]).map(
    (allocation) => ({
      ...allocation,
      number: allocation.number ?? "",
      type: allocation.type ?? "",
      subnumber: allocation.subnumber ?? "",
      itemType: allocation.itemType ?? "",
    }),
  );
  const categories =
    version >= 2
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
  const sortPreferences =
    version >= 3
      ? (value.sortPreferences as AllocationSortPreferences)
      : createDefaultSortPreferencesForBackup();
  const categoryOrder =
    version >= 4
      ? (value.categoryOrder as string[])
      : getDefaultBudgetCategoryOrder(categories);
  const expenseMerchants =
    version >= 5
      ? (value.expenseMerchants as ExpenseMerchantRecord[])
      : [];
  const creditCardExpenses =
    version >= 5
      ? (value.creditCardExpenses as CreditCardExpenseRecord[]).map((expense) => ({
          ...expense,
          isSettled: expense.isSettled ?? false,
        }))
      : [];
  const profileIds = profiles.map((profile) => profile.id);

  assertUnique(profileIds);
  assertUnique(profiles.map((profile) => profile.nameKey));
  assertUnique(budgetPlans.map((plan) => plan.id));
  assertUnique(budgetPlans.map((plan) => `${plan.profileId}\u0000${plan.month}`));
  assertUnique(allocations.map((allocation) => allocation.id));
  assertUnique(categories.map((category) => category.id));
  assertUnique(categories.map((category) => category.nameKey));
  assertUnique(expenseMerchants.map((merchant) => merchant.id));
  assertUnique(expenseMerchants.map((merchant) => merchant.nameKey));
  assertUnique(creditCardExpenses.map((expense) => expense.id));
  assertUnique(
    allocations.map(
      (allocation) =>
        `${allocation.profileId}\u0000${allocation.month}\u0000${allocation.nameKey}`,
    ),
  );

  const profileIdSet = new Set(profileIds);
  const merchantsById = new Map(
    expenseMerchants.map((merchant) => [merchant.id, merchant]),
  );
  if (
    (value.activeProfileId !== null && !profileIdSet.has(value.activeProfileId)) ||
    budgetPlans.some((plan) => !profileIdSet.has(plan.profileId)) ||
    allocations.some((allocation) => !profileIdSet.has(allocation.profileId)) ||
    creditCardExpenses.some((expense) => {
      const merchant = merchantsById.get(expense.merchantId);
      return !merchant || merchant.name !== expense.merchantName;
    })
  ) {
    throw new InvalidBackupError();
  }

  return {
    format: "buddy-backup",
    version: 6,
    exportedAt: value.exportedAt,
    activeProfileId: value.activeProfileId,
    profiles,
    budgetPlans,
    allocations,
    categories,
    sortPreferences,
    categoryOrder,
    expenseMerchants,
    creditCardExpenses,
  };
}

export async function createBackup(): Promise<BuddyBackup> {
  const categoryOrder = await getBudgetCategoryOrder();
  return buddyDatabase.transaction(
    "r",
    [
      buddyDatabase.profiles,
      buddyDatabase.budgetPlans,
      buddyDatabase.allocations,
      buddyDatabase.categories,
      buddyDatabase.expenseMerchants,
      buddyDatabase.creditCardExpenses,
      buddyDatabase.settings,
    ],
    async () => {
      const [
        profiles,
        budgetPlans,
        allocations,
        categories,
        expenseMerchants,
        creditCardExpenses,
        activeProfileSetting,
        sortPreferencesSetting,
      ] =
        await Promise.all([
          buddyDatabase.profiles.toArray(),
          buddyDatabase.budgetPlans.toArray(),
          buddyDatabase.allocations.toArray(),
          buddyDatabase.categories.toArray(),
          buddyDatabase.expenseMerchants.toArray(),
          buddyDatabase.creditCardExpenses.toArray(),
          buddyDatabase.settings.get("activeProfileId"),
          buddyDatabase.settings.get("allocationSortPreferences"),
        ]);

      return validateBackup({
        format: "buddy-backup",
        version: 6,
        exportedAt: new Date().toISOString(),
        activeProfileId: activeProfileSetting?.value ?? null,
        profiles,
        budgetPlans,
        allocations,
        categories,
        sortPreferences: sortPreferencesSetting
          ? parseSortPreferencesForBackup(sortPreferencesSetting.value)
          : createDefaultSortPreferencesForBackup(),
        categoryOrder,
        expenseMerchants,
        creditCardExpenses,
      });
    },
  );
}

export async function restoreBackup(value: unknown): Promise<BuddyBackup> {
  const backup = validateBackup(value);

  await buddyDatabase.transaction(
    "rw",
    [
      buddyDatabase.profiles,
      buddyDatabase.budgetPlans,
      buddyDatabase.allocations,
      buddyDatabase.categories,
      buddyDatabase.expenseMerchants,
      buddyDatabase.creditCardExpenses,
      buddyDatabase.settings,
    ],
    async () => {
      await buddyDatabase.profiles.clear();
      await buddyDatabase.budgetPlans.clear();
      await buddyDatabase.allocations.clear();
      await buddyDatabase.categories.clear();
      await buddyDatabase.expenseMerchants.clear();
      await buddyDatabase.creditCardExpenses.clear();
      await buddyDatabase.settings.clear();
      await buddyDatabase.profiles.bulkAdd(backup.profiles);
      await buddyDatabase.budgetPlans.bulkAdd(backup.budgetPlans);
      await buddyDatabase.allocations.bulkAdd(backup.allocations);
      await buddyDatabase.categories.bulkAdd(backup.categories);
      await buddyDatabase.expenseMerchants.bulkAdd(backup.expenseMerchants);
      await buddyDatabase.creditCardExpenses.bulkAdd(backup.creditCardExpenses);
      if (backup.activeProfileId !== null) {
        await buddyDatabase.settings.put({
          key: "activeProfileId",
          value: backup.activeProfileId,
        });
      }
      await buddyDatabase.settings.put({
        key: "allocationSortPreferences",
        value: JSON.stringify(backup.sortPreferences),
      });
      await buddyDatabase.settings.put({
        key: "budgetCategoryOrder",
        value: JSON.stringify(backup.categoryOrder),
      });
    },
  );

  return backup;
}

export function serializeBackup(backup: BuddyBackup): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}
