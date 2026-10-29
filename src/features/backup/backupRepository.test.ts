import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buddyDatabase } from "../../data/buddyDatabase";
import { createBudgetCategory } from "../allocations/categoryRepository";
import { createProfile, setActiveProfileId } from "../profiles/profileRepository";
import { createAllocation, saveMonthlyIncome } from "../allocations/allocationRepository";
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
    await createAllocation(profile.id, "2026-11", "Rent", 800000);
    const backup = await createBackup();

    await buddyDatabase.profiles.clear();
    await buddyDatabase.budgetPlans.clear();
    await buddyDatabase.allocations.clear();
    await buddyDatabase.categories.clear();
    await restoreBackup(JSON.parse(serializeBackup(backup)));

    await expect(createBackup()).resolves.toMatchObject({
      activeProfileId: profile.id,
      profiles: [profile],
      budgetPlans: [{ profileId: profile.id, month: "2026-11", incomeSatang: 2500000 }],
      allocations: [{ profileId: profile.id, name: "Rent", amountSatang: 800000 }],
      categories: [{ name: "Rent", nameKey: "rent", isActive: true }],
    });
  });

  it.each([
    null,
    {},
    { format: "other", version: 1 },
    { format: "buddy-backup", version: 3 },
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

    expect(validateBackup(legacyBackup)).toMatchObject({
      version: 2,
      categories: [{ name: "Food", nameKey: "food", isActive: true }],
    });
    await restoreBackup(legacyBackup);
    await expect(buddyDatabase.categories.toArray()).resolves.toMatchObject([
      { name: "Food", nameKey: "food", isActive: true },
    ]);
  });
});
