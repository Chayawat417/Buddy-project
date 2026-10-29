import Dexie from "dexie";
import {
  buddyDatabase,
  type AllocationRecord,
  type BudgetPlanRecord,
} from "../../data/buddyDatabase";

export class BudgetProfileNotFoundError extends Error {
  constructor() {
    super("The requested profile does not exist.");
    this.name = "BudgetProfileNotFoundError";
  }
}

export class AllocationNotFoundError extends Error {
  constructor() {
    super("The requested allocation does not exist.");
    this.name = "AllocationNotFoundError";
  }
}

export class AllocationNameError extends Error {
  constructor(readonly code: "required" | "tooLong") {
    super(code);
    this.name = "AllocationNameError";
  }
}

export class AllocationAlreadyExistsError extends Error {
  constructor() {
    super("An allocation with this name already exists in this month.");
    this.name = "AllocationAlreadyExistsError";
  }
}

export class InvalidBudgetMonthError extends Error {
  constructor() {
    super("Budget month must use YYYY-MM format.");
    this.name = "InvalidBudgetMonthError";
  }
}

export class InvalidMoneyAmountError extends Error {
  constructor() {
    super("Money amounts must be non-negative safe integers in satang.");
    this.name = "InvalidMoneyAmountError";
  }
}

export interface MonthlyBudgetSnapshot {
  plan: BudgetPlanRecord | null;
  allocations: AllocationRecord[];
}

export interface CopyPreviousMonthResult {
  sourceMonth: string;
  sourceCount: number;
  skippedCount: number;
  copiedAllocations: AllocationRecord[];
}

export interface MonthlyBudgetComparison {
  previousMonth: MonthlyBudgetSnapshot;
  currentMonth: MonthlyBudgetSnapshot;
}

function validateMonth(month: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new InvalidBudgetMonthError();
  }
}

export function getPreviousBudgetMonth(month: string): string {
  const [yearText, monthText] = month.split("-");
  let year = Number(yearText);
  let monthNumber = Number(monthText);

  if (monthNumber === 1) {
    if (year === 0) throw new InvalidBudgetMonthError();
    year -= 1;
    monthNumber = 12;
  } else {
    monthNumber -= 1;
  }

  return `${String(year).padStart(4, "0")}-${String(monthNumber).padStart(2, "0")}`;
}

function validateAmount(amountSatang: number): void {
  if (!Number.isSafeInteger(amountSatang) || amountSatang < 0) {
    throw new InvalidMoneyAmountError();
  }
}

function normalizeAllocationName(name: string): { name: string; nameKey: string } {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new AllocationNameError("required");
  }
  if (normalizedName.length > 60) {
    throw new AllocationNameError("tooLong");
  }

  return { name: normalizedName, nameKey: normalizedName.toLowerCase() };
}

async function getOrCreatePlan(
  profileId: string,
  month: string,
): Promise<BudgetPlanRecord> {
  const existing = await buddyDatabase.budgetPlans
    .where("[profileId+month]")
    .equals([profileId, month])
    .first();

  if (existing) return existing;

  const now = Date.now();
  const plan: BudgetPlanRecord = {
    id: crypto.randomUUID(),
    profileId,
    month,
    incomeSatang: 0,
    updatedAt: now,
  };
  await buddyDatabase.budgetPlans.add(plan);
  return plan;
}

async function requireProfile(profileId: string): Promise<void> {
  if (!(await buddyDatabase.profiles.get(profileId))) {
    throw new BudgetProfileNotFoundError();
  }
}

function throwIfDuplicateAllocation(error: unknown): void {
  if (error instanceof Dexie.ConstraintError) {
    throw new AllocationAlreadyExistsError();
  }
}

export async function getMonthlyBudget(
  profileId: string,
  month: string,
): Promise<MonthlyBudgetSnapshot> {
  validateMonth(month);
  await requireProfile(profileId);

  const [plan, allocations] = await Promise.all([
    buddyDatabase.budgetPlans
      .where("[profileId+month]")
      .equals([profileId, month])
      .first(),
    buddyDatabase.allocations
      .where("[profileId+month]")
      .equals([profileId, month])
      .sortBy("createdAt"),
  ]);

  return { plan: plan ?? null, allocations };
}

export async function copyPreviousMonthAllocations(
  profileId: string,
  targetMonth: string,
): Promise<CopyPreviousMonthResult> {
  validateMonth(targetMonth);
  const sourceMonth = getPreviousBudgetMonth(targetMonth);

  return buddyDatabase.transaction(
    "rw",
    buddyDatabase.profiles,
    buddyDatabase.allocations,
    async () => {
      await requireProfile(profileId);
      const [sourceAllocations, targetAllocations] = await Promise.all([
        buddyDatabase.allocations
          .where("[profileId+month]")
          .equals([profileId, sourceMonth])
          .toArray(),
        buddyDatabase.allocations
          .where("[profileId+month]")
          .equals([profileId, targetMonth])
          .toArray(),
      ]);
      const targetNames = new Set(
        targetAllocations.map((allocation) => allocation.nameKey),
      );
      const now = Date.now();
      const copiedAllocations = sourceAllocations
        .filter((allocation) => !targetNames.has(allocation.nameKey))
        .map((allocation) => ({
          id: crypto.randomUUID(),
          profileId,
          month: targetMonth,
          name: allocation.name,
          nameKey: allocation.nameKey,
          amountSatang: allocation.amountSatang,
          createdAt: now,
          updatedAt: now,
        }));

      if (copiedAllocations.length > 0) {
        await buddyDatabase.allocations.bulkAdd(copiedAllocations);
      }

      return {
        sourceMonth,
        sourceCount: sourceAllocations.length,
        skippedCount: sourceAllocations.length - copiedAllocations.length,
        copiedAllocations,
      };
    },
  );
}

export async function getMonthlyBudgetComparison(
  profileId: string,
  currentMonth: string,
): Promise<MonthlyBudgetComparison> {
  validateMonth(currentMonth);
  const previousMonth = getPreviousBudgetMonth(currentMonth);

  return buddyDatabase.transaction(
    "r",
    buddyDatabase.profiles,
    buddyDatabase.budgetPlans,
    buddyDatabase.allocations,
    async () => {
      await requireProfile(profileId);
      const [plans, allocations] = await Promise.all([
        buddyDatabase.budgetPlans
          .where("[profileId+month]")
          .between(
            [profileId, previousMonth],
            [profileId, currentMonth],
            true,
            true,
          )
          .toArray(),
        buddyDatabase.allocations
          .where("[profileId+month]")
          .between(
            [profileId, previousMonth],
            [profileId, currentMonth],
            true,
            true,
          )
          .toArray(),
      ]);

      const plansByMonth = new Map(
        plans.map((plan) => [plan.month, plan]),
      );
      const allocationsByMonth = new Map<string, AllocationRecord[]>();
      for (const allocation of allocations) {
        const monthAllocations =
          allocationsByMonth.get(allocation.month) ?? [];
        monthAllocations.push(allocation);
        allocationsByMonth.set(allocation.month, monthAllocations);
      }

      function createSnapshot(month: string): MonthlyBudgetSnapshot {
        return {
          plan: plansByMonth.get(month) ?? null,
          allocations: allocationsByMonth.get(month) ?? [],
        };
      }

      return {
        previousMonth: createSnapshot(previousMonth),
        currentMonth: createSnapshot(currentMonth),
      };
    },
  );
}

export async function saveMonthlyIncome(
  profileId: string,
  month: string,
  incomeSatang: number,
): Promise<BudgetPlanRecord> {
  validateMonth(month);
  validateAmount(incomeSatang);

  return buddyDatabase.transaction("rw", buddyDatabase.profiles, buddyDatabase.budgetPlans, async () => {
    await requireProfile(profileId);
    const plan = await getOrCreatePlan(profileId, month);
    const updatedPlan: BudgetPlanRecord = {
      ...plan,
      incomeSatang,
      updatedAt: Date.now(),
    };
    await buddyDatabase.budgetPlans.put(updatedPlan);
    return updatedPlan;
  });
}

export async function createAllocation(
  profileId: string,
  month: string,
  name: string,
  amountSatang: number,
): Promise<AllocationRecord> {
  validateMonth(month);
  validateAmount(amountSatang);
  const normalized = normalizeAllocationName(name);

  try {
    return await buddyDatabase.transaction(
      "rw",
      buddyDatabase.profiles,
      buddyDatabase.allocations,
      async () => {
        await requireProfile(profileId);
        const now = Date.now();
        const allocation: AllocationRecord = {
          id: crypto.randomUUID(),
          profileId,
          month,
          ...normalized,
          amountSatang,
          createdAt: now,
          updatedAt: now,
        };
        await buddyDatabase.allocations.add(allocation);
        return allocation;
      },
    );
  } catch (error) {
    throwIfDuplicateAllocation(error);
    throw error;
  }
}

export async function updateAllocation(
  profileId: string,
  month: string,
  allocationId: string,
  name: string,
  amountSatang: number,
): Promise<AllocationRecord> {
  validateMonth(month);
  validateAmount(amountSatang);
  const normalized = normalizeAllocationName(name);

  try {
    return await buddyDatabase.transaction(
      "rw",
      buddyDatabase.profiles,
      buddyDatabase.allocations,
      async () => {
        await requireProfile(profileId);
        const existing = await buddyDatabase.allocations.get(allocationId);
        if (
          !existing ||
          existing.profileId !== profileId ||
          existing.month !== month
        ) {
          throw new AllocationNotFoundError();
        }

        const updatedAllocation: AllocationRecord = {
          ...existing,
          ...normalized,
          amountSatang,
          updatedAt: Date.now(),
        };
        await buddyDatabase.allocations.put(updatedAllocation);
        return updatedAllocation;
      },
    );
  } catch (error) {
    throwIfDuplicateAllocation(error);
    throw error;
  }
}

export async function deleteAllocation(
  profileId: string,
  month: string,
  allocationId: string,
): Promise<void> {
  validateMonth(month);
  await buddyDatabase.transaction("rw", buddyDatabase.profiles, buddyDatabase.allocations, async () => {
    await requireProfile(profileId);
    const existing = await buddyDatabase.allocations.get(allocationId);
    if (
      !existing ||
      existing.profileId !== profileId ||
      existing.month !== month
    ) {
      throw new AllocationNotFoundError();
    }

    await buddyDatabase.allocations.delete(allocationId);
  });
}
