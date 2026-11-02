import {
  buddyDatabase,
  type AllocationRecord,
  type BudgetCategoryRecord,
} from "../../data/buddyDatabase";

const categoryOrderSettingKey = "budgetCategoryOrder";

export class InvalidBudgetCategoryOrderError extends Error {
  constructor() {
    super("Stored budget category order is invalid.");
    this.name = "InvalidBudgetCategoryOrderError";
  }
}

export function getDefaultBudgetCategoryOrder(
  categories: BudgetCategoryRecord[],
): string[] {
  return [...categories]
    .sort((first, second) => first.name.localeCompare(second.name, "th"))
    .map((category) => category.id);
}

export function sortBudgetCategoriesByOrder(
  categories: BudgetCategoryRecord[],
  order: string[],
): BudgetCategoryRecord[] {
  const orderIndexById = new Map(order.map((id, index) => [id, index]));
  return [...categories].sort(
    (first, second) =>
      (orderIndexById.get(first.id) ?? Number.POSITIVE_INFINITY) -
        (orderIndexById.get(second.id) ?? Number.POSITIVE_INFINITY) ||
      first.name.localeCompare(second.name, "th"),
  );
}

export function sortAllocationsByCategoryOrder(
  allocations: AllocationRecord[],
  categories: BudgetCategoryRecord[],
  order: string[],
): AllocationRecord[] {
  const categoryIdByName = new Map(
    categories.map((category) => [category.nameKey, category.id]),
  );
  const orderIndexById = new Map(order.map((id, index) => [id, index]));

  return allocations
    .map((allocation, originalIndex) => ({ allocation, originalIndex }))
    .sort((first, second) => {
      const firstCategoryId = categoryIdByName.get(first.allocation.nameKey);
      const secondCategoryId = categoryIdByName.get(second.allocation.nameKey);
      const firstOrder =
        firstCategoryId === undefined
          ? Number.POSITIVE_INFINITY
          : (orderIndexById.get(firstCategoryId) ?? Number.POSITIVE_INFINITY);
      const secondOrder =
        secondCategoryId === undefined
          ? Number.POSITIVE_INFINITY
          : (orderIndexById.get(secondCategoryId) ?? Number.POSITIVE_INFINITY);
      return firstOrder === secondOrder
        ? first.originalIndex - second.originalIndex
        : firstOrder - secondOrder;
    })
    .map(({ allocation }) => allocation);
}

function parseCategoryOrder(serialized: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new InvalidBudgetCategoryOrderError();
  }
  if (
    !Array.isArray(value) ||
    !value.every((id) => typeof id === "string" && id.length > 0) ||
    new Set(value).size !== value.length
  ) {
    throw new InvalidBudgetCategoryOrderError();
  }
  return value;
}

export async function getBudgetCategoryOrder(): Promise<string[]> {
  return buddyDatabase.transaction(
    "rw",
    buddyDatabase.categories,
    buddyDatabase.settings,
    async () => {
      const [categories, setting] = await Promise.all([
        buddyDatabase.categories.toArray(),
        buddyDatabase.settings.get(categoryOrderSettingKey),
      ]);
      const savedOrder = setting
        ? parseCategoryOrder(setting.value)
        : getDefaultBudgetCategoryOrder(categories);
      const categoryIds = new Set(categories.map((category) => category.id));
      const nextOrder = [
        ...savedOrder.filter((id) => categoryIds.has(id)),
        ...getDefaultBudgetCategoryOrder(
          categories.filter((category) => !savedOrder.includes(category.id)),
        ),
      ];
      if (
        !setting ||
        nextOrder.length !== savedOrder.length ||
        nextOrder.some((id, index) => id !== savedOrder[index])
      ) {
        await buddyDatabase.settings.put({
          key: categoryOrderSettingKey,
          value: JSON.stringify(nextOrder),
        });
      }
      return nextOrder;
    },
  );
}

export async function saveBudgetCategoryOrder(order: string[]): Promise<void> {
  await buddyDatabase.transaction(
    "rw",
    buddyDatabase.categories,
    buddyDatabase.settings,
    async () => {
      const categories = await buddyDatabase.categories.toArray();
      const categoryIds = new Set(categories.map((category) => category.id));
      if (
        order.length !== categoryIds.size ||
        new Set(order).size !== order.length ||
        order.some((id) => !categoryIds.has(id))
      ) {
        throw new InvalidBudgetCategoryOrderError();
      }
      await buddyDatabase.settings.put({
        key: categoryOrderSettingKey,
        value: JSON.stringify(order),
      });
    },
  );
}

export function validateCategoryOrderForBackup(
  value: unknown,
  categories: unknown,
): value is string[] {
  const hasCategoryId = (
    category: unknown,
  ): category is { id: string } =>
    typeof category === "object" &&
    category !== null &&
    "id" in category &&
    typeof category.id === "string" &&
    category.id.length > 0;
  if (!Array.isArray(categories) || !categories.every(hasCategoryId)) {
    return false;
  }
  const categoryIds = categories.map((category) => category.id);
  return (
    Array.isArray(value) &&
    value.every((id) => typeof id === "string" && id.length > 0) &&
    new Set(value).size === value.length &&
    value.length === categoryIds.length &&
    new Set(categoryIds).size === categoryIds.length &&
    value.every((id) => categoryIds.includes(id))
  );
}
