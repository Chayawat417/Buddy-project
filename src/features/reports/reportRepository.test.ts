import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buddyDatabase } from "../../data/buddyDatabase";
import { createAllocation, saveMonthlyIncome } from "../allocations/allocationRepository";
import { createProfile } from "../profiles/profileRepository";
import { getBudgetReport } from "./reportRepository";

describe("report repository", () => {
  beforeEach(async () => {
    await buddyDatabase.delete();
    await buddyDatabase.open();
  });

  it("returns only the selected profile and period", async () => {
    const first = await createProfile("Alex");
    const second = await createProfile("Sam");
    await saveMonthlyIncome(first.id, "2026-01", 100000);
    await createAllocation(first.id, "2026-01", "Rent", 60000);
    await saveMonthlyIncome(first.id, "2026-04", 50000);
    await createAllocation(first.id, "2026-04", "Food", 10000);
    await saveMonthlyIncome(second.id, "2026-01", 900000);
    await createAllocation(second.id, "2026-01", "Rent", 800000);

    const report = await getBudgetReport(first.id, {
      startMonth: "2026-01",
      endMonth: "2026-03",
    });

    expect(report.months).toHaveLength(3);
    expect(report.months[0]?.month).toBe("2026-01");
    expect(report.months[2]?.month).toBe("2026-03");
    expect(report.incomeTotalSatang).toBe(100000);
    expect(report.allocatedTotalSatang).toBe(60000);
    expect(report.categories).toEqual([{ name: "Rent", amountSatang: 60000 }]);
  });

  it("includes allocation-only months as missing income", async () => {
    const profile = await createProfile("Alex");
    await createAllocation(profile.id, "2026-02", "Food", 40000);

    const report = await getBudgetReport(profile.id, {
      startMonth: "2026-01",
      endMonth: "2026-03",
    });

    expect(report.months).toEqual([
      {
        month: "2026-01",
        incomeSatang: null,
        allocatedSatang: 0,
        remainingSatang: null,
      },
      {
        month: "2026-02",
        incomeSatang: null,
        allocatedSatang: 40000,
        remainingSatang: null,
      },
      {
        month: "2026-03",
        incomeSatang: null,
        allocatedSatang: 0,
        remainingSatang: null,
      },
    ]);
    expect(report.monthsMissingIncome).toBe(3);
  });
});
