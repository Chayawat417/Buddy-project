import Dexie, { type Table } from "dexie";

export interface ProfileRecord {
  id: string;
  name: string;
  nameKey: string;
  createdAt: number;
  updatedAt: number;
}

export interface BudgetPlanRecord {
  id: string;
  profileId: string;
  month: string;
  incomeSatang: number;
  updatedAt: number;
}

export interface AllocationRecord {
  id: string;
  profileId: string;
  month: string;
  name: string;
  nameKey: string;
  amountSatang: number;
  createdAt: number;
  updatedAt: number;
}

export interface BudgetCategoryRecord {
  id: string;
  name: string;
  nameKey: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface SettingRecord {
  key: string;
  value: string;
}

class BuddyDatabase extends Dexie {
  profiles!: Table<ProfileRecord, string>;
  budgetPlans!: Table<BudgetPlanRecord, string>;
  allocations!: Table<AllocationRecord, string>;
  categories!: Table<BudgetCategoryRecord, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super("buddy-budget");
    this.version(1).stores({
      profiles: "&id, &nameKey, createdAt",
      settings: "&key",
    });
    this.version(2).stores({
      profiles: "&id, &nameKey, createdAt",
      budgetPlans: "&id, profileId, month, &[profileId+month]",
      allocations:
        "&id, profileId, [profileId+month], &[profileId+month+nameKey]",
      settings: "&key",
    });
    this.version(3)
      .stores({
        profiles: "&id, &nameKey, createdAt",
        budgetPlans: "&id, profileId, month, &[profileId+month]",
        allocations:
          "&id, profileId, [profileId+month], nameKey, &[profileId+month+nameKey]",
        categories: "&id, &nameKey",
        settings: "&key",
      })
      .upgrade(async (transaction) => {
        const categories = new Map<string, BudgetCategoryRecord>();
        await transaction
          .table("allocations")
          .toCollection()
          .each((allocation: AllocationRecord) => {
            if (categories.has(allocation.nameKey)) return;
            categories.set(allocation.nameKey, {
              id: crypto.randomUUID(),
              name: allocation.name,
              nameKey: allocation.nameKey,
              isActive: true,
              createdAt: allocation.createdAt,
              updatedAt: allocation.updatedAt,
            });
          });
        if (categories.size > 0) {
          await transaction.table("categories").bulkAdd([...categories.values()]);
        }
      });
  }
}

export const buddyDatabase = new BuddyDatabase();
