import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buddyDatabase } from "./buddyDatabase";

function createVersionTwoDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("buddy-budget", 20);
    request.onupgradeneeded = () => {
      const database = request.result;
      const profiles = database.createObjectStore("profiles", {
        keyPath: "id",
      });
      profiles.createIndex("nameKey", "nameKey", { unique: true });
      profiles.createIndex("createdAt", "createdAt");

      const plans = database.createObjectStore("budgetPlans", {
        keyPath: "id",
      });
      plans.createIndex("profileId", "profileId");
      plans.createIndex("month", "month");
      plans.createIndex("[profileId+month]", ["profileId", "month"], {
        unique: true,
      });

      const allocations = database.createObjectStore("allocations", {
        keyPath: "id",
      });
      allocations.createIndex("profileId", "profileId");
      allocations.createIndex("[profileId+month]", ["profileId", "month"]);
      allocations.createIndex(
        "[profileId+month+nameKey]",
        ["profileId", "month", "nameKey"],
        { unique: true },
      );
      database.createObjectStore("settings", { keyPath: "key" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("allocations", "readwrite");
      transaction.objectStore("allocations").add({
        id: "allocation-1",
        profileId: "profile-1",
        month: "2026-11",
        name: "Food",
        nameKey: "food",
        amountSatang: 50000,
        createdAt: 1,
        updatedAt: 1,
      });
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

describe("Buddy database upgrades", () => {
  beforeEach(async () => {
    await buddyDatabase.delete();
  });

  it("seeds the shared category list from existing monthly allocation names", async () => {
    await createVersionTwoDatabase();
    await buddyDatabase.open();

    await expect(buddyDatabase.categories.toArray()).resolves.toMatchObject([
      { name: "Food", nameKey: "food", isActive: true },
    ]);
  });
});
