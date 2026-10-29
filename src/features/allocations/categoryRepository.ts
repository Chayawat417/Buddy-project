import Dexie from "dexie";
import {
  buddyDatabase,
  type BudgetCategoryRecord,
} from "../../data/buddyDatabase";

export class BudgetCategoryNotFoundError extends Error {
  constructor() {
    super("The requested budget category does not exist.");
    this.name = "BudgetCategoryNotFoundError";
  }
}

export class BudgetCategoryNameError extends Error {
  constructor(readonly code: "required" | "tooLong") {
    super(code);
    this.name = "BudgetCategoryNameError";
  }
}

export class BudgetCategoryAlreadyExistsError extends Error {
  constructor(readonly conflictsWithExistingAllocation = false) {
    super("A budget category with this name already exists.");
    this.name = "BudgetCategoryAlreadyExistsError";
  }
}

function normalizeCategoryName(name: string): { name: string; nameKey: string } {
  const normalizedName = name.trim();
  if (!normalizedName) throw new BudgetCategoryNameError("required");
  if (normalizedName.length > 60) {
    throw new BudgetCategoryNameError("tooLong");
  }
  return { name: normalizedName, nameKey: normalizedName.toLowerCase() };
}

export async function listBudgetCategories(
  includeHidden = false,
): Promise<BudgetCategoryRecord[]> {
  const allCategories = await buddyDatabase.categories.toArray();
  const categories = includeHidden
    ? allCategories
    : allCategories.filter((category) => category.isActive);
  return categories.sort((first, second) =>
    first.name.localeCompare(second.name, "th"),
  );
}

export async function createBudgetCategory(
  name: string,
): Promise<BudgetCategoryRecord> {
  const normalized = normalizeCategoryName(name);
  const existing = await buddyDatabase.categories
    .where("nameKey")
    .equals(normalized.nameKey)
    .first();
  if (existing) throw new BudgetCategoryAlreadyExistsError();

  const now = Date.now();
  const category: BudgetCategoryRecord = {
    id: crypto.randomUUID(),
    ...normalized,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await buddyDatabase.categories.add(category);
  } catch (error) {
    if (error instanceof Dexie.ConstraintError) {
      throw new BudgetCategoryAlreadyExistsError();
    }
    throw error;
  }
  return category;
}

export async function renameBudgetCategory(
  categoryId: string,
  name: string,
  renameHistoricalAllocations: boolean,
): Promise<BudgetCategoryRecord> {
  const normalized = normalizeCategoryName(name);

  return buddyDatabase.transaction(
    "rw",
    buddyDatabase.categories,
    buddyDatabase.allocations,
    async () => {
      const existingCategory = await buddyDatabase.categories.get(categoryId);
      if (!existingCategory) throw new BudgetCategoryNotFoundError();

      const conflictingCategory = await buddyDatabase.categories
        .where("nameKey")
        .equals(normalized.nameKey)
        .first();
      if (conflictingCategory && conflictingCategory.id !== categoryId) {
        throw new BudgetCategoryAlreadyExistsError();
      }

      if (
        renameHistoricalAllocations &&
        normalized.name !== existingCategory.name
      ) {
        const oldAllocations = await buddyDatabase.allocations
          .where("nameKey")
          .equals(existingCategory.nameKey)
          .toArray();
        if (normalized.nameKey !== existingCategory.nameKey) {
          const targetAllocations = await buddyDatabase.allocations
            .where("nameKey")
            .equals(normalized.nameKey)
            .toArray();
          const targetMonths = new Set(
            targetAllocations.map(
              (allocation) =>
                `${allocation.profileId}\u0000${allocation.month}`,
            ),
          );
          if (
            oldAllocations.some((allocation) =>
              targetMonths.has(
                `${allocation.profileId}\u0000${allocation.month}`,
              ),
            )
          ) {
            throw new BudgetCategoryAlreadyExistsError(true);
          }
        }

        const now = Date.now();
        await buddyDatabase.allocations.bulkPut(
          oldAllocations.map((allocation) => ({
            ...allocation,
            ...normalized,
            updatedAt: now,
          })),
        );
      }

      const updatedCategory: BudgetCategoryRecord = {
        ...existingCategory,
        ...normalized,
        updatedAt: Date.now(),
      };
      await buddyDatabase.categories.put(updatedCategory);
      return updatedCategory;
    },
  );
}

export async function setBudgetCategoryActive(
  categoryId: string,
  isActive: boolean,
): Promise<BudgetCategoryRecord> {
  const existing = await buddyDatabase.categories.get(categoryId);
  if (!existing) throw new BudgetCategoryNotFoundError();

  const updated: BudgetCategoryRecord = {
    ...existing,
    isActive,
    updatedAt: Date.now(),
  };
  await buddyDatabase.categories.put(updated);
  return updated;
}
