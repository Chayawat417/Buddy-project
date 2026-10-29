import {
  buddyDatabase,
  type AllocationRecord,
  type BudgetPlanRecord,
} from "../../data/buddyDatabase";
import {
  buildBudgetReport,
  getMonthsInPeriod,
  type BudgetReport,
  type ReportPeriod,
} from "../../domain/report";
import { BudgetProfileNotFoundError } from "../allocations/allocationRepository";

export async function getBudgetReport(
  profileId: string,
  period: ReportPeriod,
): Promise<BudgetReport> {
  return buddyDatabase.transaction(
    "r",
    buddyDatabase.profiles,
    buddyDatabase.budgetPlans,
    buddyDatabase.allocations,
    async () => {
      if (!(await buddyDatabase.profiles.get(profileId))) {
        throw new BudgetProfileNotFoundError();
      }

      const [plans, allocations] = await Promise.all([
        buddyDatabase.budgetPlans
          .where("[profileId+month]")
          .between(
            [profileId, period.startMonth],
            [profileId, period.endMonth],
            true,
            true,
          )
          .toArray(),
        buddyDatabase.allocations
          .where("[profileId+month]")
          .between(
            [profileId, period.startMonth],
            [profileId, period.endMonth],
            true,
            true,
          )
          .toArray(),
      ]);

      const plansByMonth = new Map<string, BudgetPlanRecord>(
        plans.map((plan) => [plan.month, plan]),
      );
      const allocationsByMonth = new Map<string, AllocationRecord[]>();
      for (const allocation of allocations) {
        const monthAllocations = allocationsByMonth.get(allocation.month) ?? [];
        monthAllocations.push(allocation);
        allocationsByMonth.set(allocation.month, monthAllocations);
      }

      return buildBudgetReport(
        getMonthsInPeriod(period).map((month) => ({
          month,
          incomeSatang: plansByMonth.get(month)?.incomeSatang ?? null,
          allocations: (allocationsByMonth.get(month) ?? []).map((allocation) => ({
            name: allocation.name,
            amountSatang: allocation.amountSatang,
          })),
        })),
      );
    },
  );
}
