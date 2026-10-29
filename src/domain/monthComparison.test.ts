import { describe, expect, it } from "vitest";
import type { AllocationRecord, BudgetPlanRecord } from "../data/buddyDatabase";
import { buildMonthlyBudgetComparison } from "./monthComparison";

function allocation(
  month: string,
  name: string,
  amountSatang: number,
): AllocationRecord {
  return {
    id: `${month}-${name}`,
    profileId: "profile-1",
    month,
    name,
    nameKey: name.trim().toLowerCase(),
    amountSatang,
    createdAt: 1,
    updatedAt: 1,
  };
}

function plan(month: string, incomeSatang: number): BudgetPlanRecord {
  return {
    id: month,
    profileId: "profile-1",
    month,
    incomeSatang,
    updatedAt: 1,
  };
}

describe("monthly budget comparison", () => {
  it("compares income, totals, remaining balance, and categories", () => {
    const comparison = buildMonthlyBudgetComparison(
      {
        plan: plan("2026-10", 200000),
        allocations: [
          allocation("2026-10", "Food", 50000),
          allocation("2026-10", "Rent", 80000),
        ],
      },
      {
        plan: plan("2026-11", 220000),
        allocations: [
          allocation("2026-11", "food", 60000),
          allocation("2026-11", "Travel", 15000),
        ],
      },
    );

    expect(comparison.previous).toEqual({
      incomeSatang: 200000,
      allocatedSatang: 130000,
      remainingSatang: 70000,
    });
    expect(comparison.current).toEqual({
      incomeSatang: 220000,
      allocatedSatang: 75000,
      remainingSatang: 145000,
    });
    expect(comparison.incomeDifferenceSatang).toBe(20000);
    expect(comparison.allocatedDifferenceSatang).toBe(-55000);
    expect(comparison.remainingDifferenceSatang).toBe(75000);
    expect(comparison.categories).toEqual(
      expect.arrayContaining([
        {
          name: "Food",
          previousAmountSatang: 50000,
          currentAmountSatang: 60000,
          differenceSatang: 10000,
        },
        {
          name: "Rent",
          previousAmountSatang: 80000,
          currentAmountSatang: 0,
          differenceSatang: -80000,
        },
        {
          name: "Travel",
          previousAmountSatang: 0,
          currentAmountSatang: 15000,
          differenceSatang: 15000,
        },
      ]),
    );
  });

  it("keeps unrecorded income distinct from zero and returns empty categories", () => {
    const comparison = buildMonthlyBudgetComparison(
      { plan: null, allocations: [] },
      { plan: plan("2026-11", 0), allocations: [] },
    );

    expect(comparison.previous.incomeSatang).toBeNull();
    expect(comparison.current.incomeSatang).toBe(0);
    expect(comparison.incomeDifferenceSatang).toBeNull();
    expect(comparison.previous.remainingSatang).toBeNull();
    expect(comparison.current.remainingSatang).toBe(0);
    expect(comparison.remainingDifferenceSatang).toBeNull();
    expect(comparison.categories).toEqual([]);
  });
});
