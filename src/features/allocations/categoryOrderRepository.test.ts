import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buddyDatabase } from "../../data/buddyDatabase";
import { createAllocation } from "./allocationRepository";
import { createBudgetCategory, setBudgetCategoryActive } from "./categoryRepository";
import {
  getBudgetCategoryOrder,
  saveBudgetCategoryOrder,
  sortBudgetCategoriesByOrder,
  sortAllocationsByCategoryOrder,
} from "./categoryOrderRepository";
import { createProfile } from "../profiles/profileRepository";

describe("budget category order", () => {
  beforeEach(async () => {
    await buddyDatabase.delete();
    await buddyDatabase.open();
  });

  it("initializes with the existing Thai-name order and appends new categories", async () => {
    const transit = await createBudgetCategory("Transit");
    const food = await createBudgetCategory("Food");
    const housing = await createBudgetCategory("Housing");

    await expect(getBudgetCategoryOrder()).resolves.toEqual([
      food.id,
      housing.id,
      transit.id,
    ]);

    const utilities = await createBudgetCategory("Utilities");
    await expect(getBudgetCategoryOrder()).resolves.toEqual([
      food.id,
      housing.id,
      transit.id,
      utilities.id,
    ]);
  });

  it("persists one order for hidden categories and rejects incomplete or duplicate orders", async () => {
    const food = await createBudgetCategory("Food");
    const housing = await createBudgetCategory("Housing");
    const transit = await createBudgetCategory("Transit");
    await getBudgetCategoryOrder();

    await saveBudgetCategoryOrder([transit.id, food.id, housing.id]);
    await setBudgetCategoryActive(food.id, false);

    await expect(getBudgetCategoryOrder()).resolves.toEqual([
      transit.id,
      food.id,
      housing.id,
    ]);
    await expect(saveBudgetCategoryOrder([transit.id, housing.id])).rejects.toThrow();
    await expect(
      saveBudgetCategoryOrder([transit.id, food.id, food.id]),
    ).rejects.toThrow();
  });

  it("orders category choices by the saved sequence", async () => {
    const food = await createBudgetCategory("Food");
    const housing = await createBudgetCategory("Housing");
    const transit = await createBudgetCategory("Transit");

    expect(
      sortBudgetCategoriesByOrder([food, housing, transit], [
        transit.id,
        food.id,
        housing.id,
      ]).map(({ id }) => id),
    ).toEqual([transit.id, food.id, housing.id]);
  });

  it("sorts monthly allocations by shared category order and keeps unknown rows stable at the end", async () => {
    const profile = await createProfile("Alex");
    const food = await createBudgetCategory("Food");
    const housing = await createBudgetCategory("Housing");
    const transit = await createBudgetCategory("Transit");
    const savedOrder = [transit.id, housing.id, food.id];
    await saveBudgetCategoryOrder(savedOrder);

    const transitAllocation = await createAllocation(
      profile.id,
      "2026-11",
      "Transit",
      100,
    );
    const unknownFirst = await createAllocation(
      profile.id,
      "2026-11",
      "Old category",
      200,
    );
    const foodAllocation = await createAllocation(
      profile.id,
      "2026-11",
      "Food",
      300,
    );
    const unknownSecond = await createAllocation(
      profile.id,
      "2026-11",
      "Another old category",
      400,
    );
    const housingAllocation = await createAllocation(
      profile.id,
      "2026-11",
      "Housing",
      500,
    );
    const allocations = [
      transitAllocation,
      unknownFirst,
      foodAllocation,
      unknownSecond,
      housingAllocation,
    ];

    expect(
      sortAllocationsByCategoryOrder(
        allocations,
        [food, housing, transit],
        savedOrder,
      ).map(({ name }) => name),
    ).toEqual([
      "Transit",
      "Housing",
      "Food",
      "Old category",
      "Another old category",
    ]);
  });
});
