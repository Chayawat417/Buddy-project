import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buddyDatabase } from "../../data/buddyDatabase";
import { createBudgetCategory } from "../allocations/categoryRepository";
import {
  getBudgetCategoryOrder,
  saveBudgetCategoryOrder,
} from "../allocations/categoryOrderRepository";
import { createProfile, setActiveProfileId } from "../profiles/profileRepository";
import { createAllocation, saveMonthlyIncome } from "../allocations/allocationRepository";
import {
  createCreditCardExpense,
  createExpenseMerchant,
} from "../expenses/expenseRepository";
import {
  createBackup,
  InvalidBackupError,
  restoreBackup,
  serializeBackup,
  validateBackup,
} from "./backupRepository";

describe("backup repository", () => {
  beforeEach(async () => {
    await buddyDatabase.delete();
    await buddyDatabase.open();
  });

  it("exports and restores all profile data and active selection", async () => {
    const profile = await createProfile("Alex");
    await setActiveProfileId(profile.id);
    await saveMonthlyIncome(profile.id, "2026-11", 2500000);
    await createBudgetCategory("Rent");
    await createAllocation(profile.id, "2026-11", "Rent", 800000, {
      number: "2",
      type: "ค่าใช้จ่าย",
      subnumber: "2.1",
      itemType: "ค่าเช่า",
    });
    const merchant = await createExpenseMerchant("Lunch spot");
    await createCreditCardExpense({
      purchaseDate: "2026-11-01",
      merchantId: merchant.id,
      amountSatang: 60000,
      isShared: true,
      peopleCount: 2,
    });
    const backup = await createBackup();

    await buddyDatabase.profiles.clear();
    await buddyDatabase.budgetPlans.clear();
    await buddyDatabase.allocations.clear();
    await buddyDatabase.categories.clear();
    await buddyDatabase.expenseMerchants.clear();
    await buddyDatabase.creditCardExpenses.clear();
    await restoreBackup(JSON.parse(serializeBackup(backup)));

    await expect(createBackup()).resolves.toMatchObject({
      version: 6,
      activeProfileId: profile.id,
      profiles: [profile],
      budgetPlans: [{ profileId: profile.id, month: "2026-11", incomeSatang: 2500000 }],
      allocations: [{
        profileId: profile.id,
        name: "Rent",
        amountSatang: 800000,
        number: "2",
        type: "ค่าใช้จ่าย",
        subnumber: "2.1",
        itemType: "ค่าเช่า",
      }],
      categories: [{ name: "Rent", nameKey: "rent", isActive: true }],
      expenseMerchants: [{ name: "Lunch spot", nameKey: "lunch spot" }],
      creditCardExpenses: [{
        purchaseDate: "2026-11-01",
        month: "2026-11",
        merchantName: "Lunch spot",
        amountSatang: 60000,
        isShared: true,
        peopleCount: 2,
        personalAmountSatang: 30000,
        isSettled: false,
      }],
      categoryOrder: [expect.any(String)],
      sortPreferences: {
        defaultPresetId: expect.any(String),
        presets: [
          {
            id: expect.any(String),
            name: "ลำดับรายการ",
            rules: [
              { field: "number", direction: "asc" },
              { field: "type", direction: "asc" },
              { field: "subnumber", direction: "asc" },
              { field: "itemType", direction: "asc" },
            ],
          },
        ],
      },
    });
  });

  it("preserves allocation metadata and saved sort preferences through restore", async () => {
    const profile = await createProfile("Alex");
    const rent = await createBudgetCategory("Rent");
    const food = await createBudgetCategory("Food");
    await getBudgetCategoryOrder();
    const categoryOrder = [rent.id, food.id];
    await saveBudgetCategoryOrder(categoryOrder);
    const preferences = {
      defaultPresetId: "custom-default",
      presets: [
        {
          id: "custom-default",
          name: "Custom order",
          rules: [{ field: "amountSatang", direction: "desc" }],
        },
      ],
    };
    await buddyDatabase.settings.put({
      key: "allocationSortPreferences",
      value: JSON.stringify(preferences),
    });
    await createAllocation(profile.id, "2026-11", "Rent", 800000, {
      number: "1.2",
      type: "expense",
      subnumber: "1.2.1",
      itemType: "rent",
    });

    const backup = await createBackup();
    await buddyDatabase.allocations.clear();
    await buddyDatabase.settings.delete("allocationSortPreferences");
    await restoreBackup(JSON.parse(serializeBackup(backup)));

    await expect(buddyDatabase.allocations.toArray()).resolves.toMatchObject([
      {
        number: "1.2",
        type: "expense",
        subnumber: "1.2.1",
        itemType: "rent",
      },
    ]);
    await expect(
      buddyDatabase.settings.get("allocationSortPreferences"),
    ).resolves.toEqual({
      key: "allocationSortPreferences",
      value: JSON.stringify(preferences),
    });
    await expect(
      buddyDatabase.settings.get("budgetCategoryOrder"),
    ).resolves.toEqual({
      key: "budgetCategoryOrder",
      value: JSON.stringify(categoryOrder),
    });
  });

  it.each([
    null,
    {},
    { format: "other", version: 1 },
    { format: "buddy-backup", version: 6 },
    {
      format: "buddy-backup",
      version: 2,
      exportedAt: new Date().toISOString(),
      activeProfileId: null,
      profiles: [],
      budgetPlans: [],
      allocations: [],
    },
  ])("rejects unsupported or malformed backups", (value) => {
    expect(() => validateBackup(value)).toThrow(InvalidBackupError);
  });

  it("rejects references to missing profiles and duplicate categories", async () => {
    const profile = await createProfile("Alex");
    const backup = await createBackup();
    const missingProfileBackup = {
      ...backup,
      budgetPlans: [
        {
          id: "plan",
          profileId: "missing",
          month: "2026-11",
          incomeSatang: 100,
          updatedAt: 1,
        },
      ],
    };
    expect(() => validateBackup(missingProfileBackup)).toThrow(InvalidBackupError);

    const duplicateCategoryBackup = {
      ...backup,
      allocations: [
        {
          id: "a",
          profileId: profile.id,
          month: "2026-11",
          name: "Food",
          nameKey: "food",
          amountSatang: 100,
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: "b",
          profileId: profile.id,
          month: "2026-11",
          name: "food",
          nameKey: "food",
          amountSatang: 200,
          createdAt: 2,
          updatedAt: 2,
        },
      ],
    };
    expect(() => validateBackup(duplicateCategoryBackup)).toThrow(InvalidBackupError);
  });

  it("does not change local data when validation fails", async () => {
    const profile = await createProfile("Keep");
    const invalidBackup = {
      format: "buddy-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      activeProfileId: null,
      profiles: [{ ...profile, nameKey: "wrong" }],
      budgetPlans: [],
      allocations: [],
    };

    await expect(restoreBackup(invalidBackup)).rejects.toBeInstanceOf(
      InvalidBackupError,
    );
    await expect(buddyDatabase.profiles.toArray()).resolves.toEqual([profile]);
  });

  it("restores a version 1 backup with categories derived from saved allocations", async () => {
    const legacyBackup = {
      format: "buddy-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      activeProfileId: null,
      profiles: [
        {
          id: "profile-1",
          name: "Alex",
          nameKey: "alex",
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      budgetPlans: [],
      allocations: [
        {
          id: "allocation-1",
          profileId: "profile-1",
          month: "2026-11",
          name: "Food",
          nameKey: "food",
          amountSatang: 1000,
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: "allocation-2",
          profileId: "profile-1",
          month: "2026-12",
          name: "Food",
          nameKey: "food",
          amountSatang: 2000,
          createdAt: 2,
          updatedAt: 2,
        },
      ],
    };

    const migratedBackup = validateBackup(legacyBackup);
    expect(migratedBackup).toMatchObject({
      version: 6,
      categories: [{ name: "Food", nameKey: "food", isActive: true }],
      sortPreferences: {
        presets: [
          {
            name: "ลำดับรายการ",
            rules: [
              { field: "number", direction: "asc" },
              { field: "type", direction: "asc" },
              { field: "subnumber", direction: "asc" },
              { field: "itemType", direction: "asc" },
            ],
          },
        ],
      },
    });
    expect(migratedBackup.categoryOrder).toEqual([
      migratedBackup.categories[0].id,
    ]);
    expect(migratedBackup.allocations).toHaveLength(2);
    expect(
      migratedBackup.allocations.every(
        ({ number, type, subnumber, itemType }) =>
          number === "" && type === "" && subnumber === "" && itemType === "",
      ),
    ).toBe(true);
    await restoreBackup(legacyBackup);
    await expect(buddyDatabase.categories.toArray()).resolves.toMatchObject([
      { name: "Food", nameKey: "food", isActive: true },
    ]);
    const restoredAllocations = await buddyDatabase.allocations.toArray();
    expect(restoredAllocations).toHaveLength(2);
    expect(
      restoredAllocations.every(
        ({ number, type, subnumber, itemType }) =>
          number === "" && type === "" && subnumber === "" && itemType === "",
      ),
    ).toBe(true);
    await expect(buddyDatabase.expenseMerchants.toArray()).resolves.toEqual([]);
    await expect(buddyDatabase.creditCardExpenses.toArray()).resolves.toEqual([]);
  });

  it("migrates version 4 backups without replacing prior budget data", async () => {
    const currentBackup = await createBackup();
    const versionFourBackup: Record<string, unknown> = {
      ...currentBackup,
      version: 4,
    };
    delete versionFourBackup.expenseMerchants;
    delete versionFourBackup.creditCardExpenses;

    const migrated = validateBackup({ ...versionFourBackup, version: 4 });

    expect(migrated).toMatchObject({
      version: 6,
      expenseMerchants: [],
      creditCardExpenses: [],
    });
    await restoreBackup({ ...versionFourBackup, version: 4 });
    await expect(buddyDatabase.expenseMerchants.toArray()).resolves.toEqual([]);
    await expect(buddyDatabase.creditCardExpenses.toArray()).resolves.toEqual([]);
  });

  it("migrates version 5 expenses as unsettled", async () => {
    const merchant = await createExpenseMerchant("Cafe");
    await createCreditCardExpense({
      purchaseDate: "2026-11-01",
      merchantId: merchant.id,
      amountSatang: 10000,
      isShared: true,
      peopleCount: 2,
    });
    const currentBackup = await createBackup();
    const invalidCurrentExpense = {
      ...currentBackup.creditCardExpenses[0],
    };
    Reflect.deleteProperty(invalidCurrentExpense, "isSettled");
    expect(() =>
      validateBackup({
        ...currentBackup,
        creditCardExpenses: [invalidCurrentExpense],
      }),
    ).toThrow(InvalidBackupError);

    const previousExpense = { ...currentBackup.creditCardExpenses[0] };
    Reflect.deleteProperty(previousExpense, "isSettled");
    const legacyBackup = {
      ...currentBackup,
      version: 5,
      creditCardExpenses: [previousExpense],
    };

    expect(validateBackup(legacyBackup)).toMatchObject({
      version: 6,
      creditCardExpenses: [{ isSettled: false }],
    });
    await restoreBackup(legacyBackup);
    await expect(buddyDatabase.creditCardExpenses.toArray()).resolves.toMatchObject([
      { isSettled: false },
    ]);
  });

  it("rejects inconsistent expense references and split values", async () => {
    const merchant = await createExpenseMerchant("Cafe");
    await createCreditCardExpense({
      purchaseDate: "2026-11-01",
      merchantId: merchant.id,
      amountSatang: 10000,
      isShared: true,
      peopleCount: 2,
    });
    const backup = await createBackup();

    expect(() =>
      validateBackup({
        ...backup,
        creditCardExpenses: [
          { ...backup.creditCardExpenses[0], merchantId: "missing" },
        ],
      }),
    ).toThrow(InvalidBackupError);
    expect(() =>
      validateBackup({
        ...backup,
        creditCardExpenses: [
          { ...backup.creditCardExpenses[0], personalAmountSatang: 10000 },
        ],
      }),
    ).toThrow(InvalidBackupError);
  });
});
