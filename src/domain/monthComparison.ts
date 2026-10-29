import type { AllocationRecord, BudgetPlanRecord } from "../data/buddyDatabase";
import type { MonthlyBudgetSnapshot } from "../features/allocations/allocationRepository";

export interface MonthlyComparisonCategory {
  name: string;
  previousAmountSatang: number;
  currentAmountSatang: number;
  differenceSatang: number;
}

export interface MonthlyComparisonSummary {
  incomeSatang: number | null;
  allocatedSatang: number;
  remainingSatang: number | null;
}

export interface MonthlyBudgetComparisonReport {
  previous: MonthlyComparisonSummary;
  current: MonthlyComparisonSummary;
  incomeDifferenceSatang: number | null;
  allocatedDifferenceSatang: number;
  remainingDifferenceSatang: number | null;
  categories: MonthlyComparisonCategory[];
}

function summarizeMonth(
  plan: BudgetPlanRecord | null,
  allocations: AllocationRecord[],
): MonthlyComparisonSummary {
  const allocatedSatang = allocations.reduce(
    (total, allocation) => total + allocation.amountSatang,
    0,
  );
  const incomeSatang = plan?.incomeSatang ?? null;

  return {
    incomeSatang,
    allocatedSatang,
    remainingSatang:
      incomeSatang === null ? null : incomeSatang - allocatedSatang,
  };
}

export function buildMonthlyBudgetComparison(
  previousMonth: MonthlyBudgetSnapshot,
  currentMonth: MonthlyBudgetSnapshot,
): MonthlyBudgetComparisonReport {
  const previous = summarizeMonth(
    previousMonth.plan,
    previousMonth.allocations,
  );
  const current = summarizeMonth(currentMonth.plan, currentMonth.allocations);
  const categoriesByName = new Map<
    string,
    Omit<MonthlyComparisonCategory, "differenceSatang">
  >();

  for (const allocation of previousMonth.allocations) {
    categoriesByName.set(allocation.nameKey, {
      name: allocation.name,
      previousAmountSatang: allocation.amountSatang,
      currentAmountSatang: 0,
    });
  }
  for (const allocation of currentMonth.allocations) {
    const existing = categoriesByName.get(allocation.nameKey);
    if (existing) {
      existing.currentAmountSatang = allocation.amountSatang;
    } else {
      categoriesByName.set(allocation.nameKey, {
        name: allocation.name,
        previousAmountSatang: 0,
        currentAmountSatang: allocation.amountSatang,
      });
    }
  }

  const categories = [...categoriesByName.values()]
    .map((category) => ({
      ...category,
      differenceSatang:
        category.currentAmountSatang - category.previousAmountSatang,
    }))
    .sort((first, second) => first.name.localeCompare(second.name, "th"));

  return {
    previous,
    current,
    incomeDifferenceSatang:
      previous.incomeSatang === null || current.incomeSatang === null
        ? null
        : current.incomeSatang - previous.incomeSatang,
    allocatedDifferenceSatang:
      current.allocatedSatang - previous.allocatedSatang,
    remainingDifferenceSatang:
      previous.remainingSatang === null || current.remainingSatang === null
        ? null
        : current.remainingSatang - previous.remainingSatang,
    categories,
  };
}
