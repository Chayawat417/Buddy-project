import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buddyDatabase } from "../../data/buddyDatabase";
import { createProfile, deleteProfile } from "../profiles/profileRepository";
import {
  AllocationAlreadyExistsError,
  AllocationNotFoundError,
  AllocationNameError,
  copyPreviousMonthAllocations,
  createAllocation,
  deleteAllocation,
  getMonthlyBudget,
  getMonthlyBudgetComparison,
  InvalidBudgetMonthError,
  InvalidMoneyAmountError,
  saveMonthlyIncome,
  updateAllocation,
} from "./allocationRepository";

describe("allocation repository", () => {
  beforeEach(async () => {
    await buddyDatabase.delete();
    await buddyDatabase.open();
  });

  it("stores income and allocations separately by profile and month", async () => {
    const firstProfile = await createProfile("Alex");
    const secondProfile = await createProfile("Sam");
    await saveMonthlyIncome(firstProfile.id, "2026-11", 2500000);
    await createAllocation(firstProfile.id, "2026-11", "Rent", 800000);
    await saveMonthlyIncome(secondProfile.id, "2026-11", 1000000);

    await expect(getMonthlyBudget(firstProfile.id, "2026-11")).resolves.toMatchObject({
      plan: { incomeSatang: 2500000 },
      allocations: [{ name: "Rent", amountSatang: 800000 }],
    });
    await expect(getMonthlyBudget(secondProfile.id, "2026-11")).resolves.toMatchObject({
      plan: { incomeSatang: 1000000 },
      allocations: [],
    });
    await expect(getMonthlyBudget(firstProfile.id, "2026-12")).resolves.toEqual({
      plan: null,
      allocations: [],
    });
  });

  it("validates months, money values, and allocation names", async () => {
    const profile = await createProfile("Alex");

    await expect(saveMonthlyIncome(profile.id, "2026-13", 100)).rejects.toBeInstanceOf(
      InvalidBudgetMonthError,
    );
    await expect(saveMonthlyIncome(profile.id, "2026-11", -1)).rejects.toBeInstanceOf(
      InvalidMoneyAmountError,
    );
    await expect(
      createAllocation(profile.id, "2026-11", "  ", 100),
    ).rejects.toBeInstanceOf(AllocationNameError);
    await expect(
      createAllocation(profile.id, "2026-11", "x".repeat(61), 100),
    ).rejects.toMatchObject({ code: "tooLong" });
  });

  it("does not mark income as entered when only adding an allocation", async () => {
    const profile = await createProfile("Alex");
    await createAllocation(profile.id, "2026-11", "Food", 50000);

    await expect(getMonthlyBudget(profile.id, "2026-11")).resolves.toMatchObject({
      plan: null,
      allocations: [{ name: "Food" }],
    });
  });

  it("prevents duplicate category names within one profile and month", async () => {
    const profile = await createProfile("Alex");
    await createAllocation(profile.id, "2026-11", "Rent", 800000);

    await expect(
      createAllocation(profile.id, "2026-11", " rent ", 900000),
    ).rejects.toBeInstanceOf(AllocationAlreadyExistsError);
    await expect(
      createAllocation(profile.id, "2026-12", "Rent", 900000),
    ).resolves.toMatchObject({ name: "Rent" });
  });

  it("copies only new previous-month categories and preserves this month's income", async () => {
    const profile = await createProfile("Alex");
    await saveMonthlyIncome(profile.id, "2026-11", 2750000);
    await createAllocation(profile.id, "2026-10", "Rent", 800000);
    await createAllocation(profile.id, "2026-10", "Food", 400000);
    await createAllocation(profile.id, "2026-11", "rent", 825000);
    await createAllocation(profile.id, "2026-11", "Savings", 500000);

    const result = await copyPreviousMonthAllocations(profile.id, "2026-11");
    const currentMonth = await getMonthlyBudget(profile.id, "2026-11");

    expect(result.sourceMonth).toBe("2026-10");
    expect(result.sourceCount).toBe(2);
    expect(result.skippedCount).toBe(1);
    expect(result.copiedAllocations).toMatchObject([
      { name: "Food", amountSatang: 400000, month: "2026-11" },
    ]);
    expect(currentMonth.plan?.incomeSatang).toBe(2750000);
    expect(currentMonth.allocations).toHaveLength(3);
    expect(currentMonth.allocations.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["Food", "rent", "Savings"]),
    );
  });

  it("handles January year rollover and does not duplicate copied categories", async () => {
    const profile = await createProfile("Alex");
    await createAllocation(profile.id, "2025-12", "Rent", 800000);

    const firstCopy = await copyPreviousMonthAllocations(profile.id, "2026-01");
    const secondCopy = await copyPreviousMonthAllocations(profile.id, "2026-01");

    expect(firstCopy.sourceMonth).toBe("2025-12");
    expect(firstCopy.copiedAllocations).toHaveLength(1);
    expect(secondCopy.copiedAllocations).toHaveLength(0);
    expect(secondCopy.skippedCount).toBe(1);
    await expect(
      copyPreviousMonthAllocations(profile.id, "2026-13"),
    ).rejects.toBeInstanceOf(InvalidBudgetMonthError);
  });

  it("loads a profile-scoped comparison across the January year boundary", async () => {
    const profile = await createProfile("Alex");
    const otherProfile = await createProfile("Sam");
    await saveMonthlyIncome(profile.id, "2025-12", 200000);
    await createAllocation(profile.id, "2025-12", "Rent", 80000);
    await saveMonthlyIncome(profile.id, "2026-01", 250000);
    await createAllocation(profile.id, "2026-01", "Food", 50000);
    await saveMonthlyIncome(otherProfile.id, "2025-12", 900000);
    await createAllocation(otherProfile.id, "2026-01", "Other", 100000);

    await expect(
      getMonthlyBudgetComparison(profile.id, "2026-01"),
    ).resolves.toMatchObject({
      previousMonth: {
        plan: { month: "2025-12", incomeSatang: 200000 },
        allocations: [{ name: "Rent", amountSatang: 80000 }],
      },
      currentMonth: {
        plan: { month: "2026-01", incomeSatang: 250000 },
        allocations: [{ name: "Food", amountSatang: 50000 }],
      },
    });
    await expect(
      getMonthlyBudgetComparison(profile.id, "2026-13"),
    ).rejects.toBeInstanceOf(InvalidBudgetMonthError);
  });

  it("updates and deletes only allocations owned by the profile and month", async () => {
    const profile = await createProfile("Alex");
    const otherProfile = await createProfile("Sam");
    const allocation = await createAllocation(profile.id, "2026-11", "Food", 50000);

    await expect(
      updateAllocation(profile.id, "2026-11", allocation.id, "Groceries", 75000),
    ).resolves.toMatchObject({ name: "Groceries", amountSatang: 75000 });
    await expect(
      updateAllocation(otherProfile.id, "2026-11", allocation.id, "Food", 1),
    ).rejects.toBeInstanceOf(AllocationNotFoundError);
    await deleteAllocation(profile.id, "2026-11", allocation.id);
    await expect(getMonthlyBudget(profile.id, "2026-11")).resolves.toMatchObject({
      allocations: [],
    });
  });

  it("does not save an allocation update that would duplicate a category", async () => {
    const profile = await createProfile("Alex");
    const food = await createAllocation(profile.id, "2026-11", "Food", 50000);
    const rent = await createAllocation(profile.id, "2026-11", "Rent", 80000);

    await expect(
      updateAllocation(profile.id, "2026-11", rent.id, " food ", 90000),
    ).rejects.toBeInstanceOf(AllocationAlreadyExistsError);
    await expect(getMonthlyBudget(profile.id, "2026-11")).resolves.toMatchObject({
      allocations: [
        { id: food.id, name: "Food", amountSatang: 50000 },
        { id: rent.id, name: "Rent", amountSatang: 80000 },
      ],
    });
  });

  it("cascades profile deletion to budget plans and allocations", async () => {
    const profile = await createProfile("Alex");
    await saveMonthlyIncome(profile.id, "2026-11", 100000);
    await createAllocation(profile.id, "2026-11", "Food", 50000);

    await deleteProfile(profile.id);

    await expect(buddyDatabase.budgetPlans.toArray()).resolves.toEqual([]);
    await expect(buddyDatabase.allocations.toArray()).resolves.toEqual([]);
  });
});
