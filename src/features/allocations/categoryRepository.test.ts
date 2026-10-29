import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buddyDatabase } from "../../data/buddyDatabase";
import { createProfile } from "../profiles/profileRepository";
import { createAllocation } from "./allocationRepository";
import {
  BudgetCategoryAlreadyExistsError,
  createBudgetCategory,
  listBudgetCategories,
  renameBudgetCategory,
  setBudgetCategoryActive,
} from "./categoryRepository";

describe("budget category repository", () => {
  beforeEach(async () => {
    await buddyDatabase.delete();
    await buddyDatabase.open();
  });

  it("creates shared categories and rejects duplicate names ignoring case", async () => {
    const created = await createBudgetCategory(" Food ");

    await expect(listBudgetCategories()).resolves.toEqual([created]);
    await expect(createBudgetCategory("food")).rejects.toBeInstanceOf(
      BudgetCategoryAlreadyExistsError,
    );
  });

  it("hides categories from new selections without deleting monthly data", async () => {
    const profile = await createProfile("Alex");
    const category = await createBudgetCategory("Rent");
    await createAllocation(profile.id, "2026-11", category.name, 80000);

    await setBudgetCategoryActive(category.id, false);

    await expect(listBudgetCategories()).resolves.toEqual([]);
    await expect(listBudgetCategories(true)).resolves.toMatchObject([
      { id: category.id, isActive: false },
    ]);
    await expect(buddyDatabase.allocations.toArray()).resolves.toMatchObject([
      { name: "Rent", amountSatang: 80000 },
    ]);
  });

  it("renames future selection without changing history or renames history on request", async () => {
    const firstProfile = await createProfile("Alex");
    const secondProfile = await createProfile("Sam");
    const travel = await createBudgetCategory("Travel");
    await createAllocation(firstProfile.id, "2026-10", "Travel", 25000);
    await createAllocation(secondProfile.id, "2026-10", "Travel", 50000);

    const futureOnly = await renameBudgetCategory(
      travel.id,
      "Transport",
      false,
    );
    expect(futureOnly.name).toBe("Transport");
    const futureOnlyAllocations = await buddyDatabase.allocations.toArray();
    expect(futureOnlyAllocations.map(({ name }) => name)).toEqual([
      "Travel",
      "Travel",
    ]);

    const food = await createBudgetCategory("Food");
    await createAllocation(firstProfile.id, "2026-11", "Food", 10000);
    await createAllocation(secondProfile.id, "2026-11", "Food", 20000);
    await renameBudgetCategory(food.id, "Meals", true);
    const renamedAllocations = await buddyDatabase.allocations.toArray();
    expect(
      renamedAllocations.map(({ name, nameKey }) => [name, nameKey]).sort(),
    ).toEqual([
      ["Meals", "meals"],
      ["Meals", "meals"],
      ["Travel", "travel"],
      ["Travel", "travel"],
    ]);
  });

  it("rejects a historical rename that would create a duplicate in a month", async () => {
    const profile = await createProfile("Alex");
    const food = await createBudgetCategory("Food");
    await createAllocation(profile.id, "2026-11", "Food", 50000);
    await buddyDatabase.allocations.add({
      id: "legacy-groceries",
      profileId: profile.id,
      month: "2026-11",
      name: "Groceries",
      nameKey: "groceries",
      amountSatang: 10000,
      createdAt: 1,
      updatedAt: 1,
    });

    await expect(
      renameBudgetCategory(food.id, "Groceries", true),
    ).rejects.toMatchObject({
      conflictsWithExistingAllocation: true,
    });
    const allocations = await buddyDatabase.allocations.toArray();
    expect(allocations.map(({ name }) => name).sort()).toEqual([
      "Food",
      "Groceries",
    ]);
  });
});
