import { describe, expect, it } from "vitest";
import {
  buildBudgetReport,
  getMonthsInPeriod,
  getQuarterPeriod,
  getYearPeriod,
} from "./report";

describe("report helpers", () => {
  it("returns exact quarter and year month ranges", () => {
    expect(getQuarterPeriod(2026, 1)).toEqual({
      startMonth: "2026-01",
      endMonth: "2026-03",
    });
    expect(getQuarterPeriod(2026, 4)).toEqual({
      startMonth: "2026-10",
      endMonth: "2026-12",
    });
    expect(getYearPeriod(2026)).toEqual({
      startMonth: "2026-01",
      endMonth: "2026-12",
    });
    expect(getMonthsInPeriod(getQuarterPeriod(2026, 2))).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
    expect(() =>
      getMonthsInPeriod({ startMonth: "2026-05", endMonth: "2026-04" }),
    ).toThrow(RangeError);
    expect(() => getQuarterPeriod(2026, 5)).toThrow(RangeError);
    expect(() => getYearPeriod(1899)).toThrow(RangeError);
  });

  it("aggregates months, categories, and reconciliation totals", () => {
    const report = buildBudgetReport([
      {
        month: "2026-02",
        incomeSatang: 100000,
        allocations: [
          { name: "Food", amountSatang: 30000 },
          { name: "Rent", amountSatang: 40000 },
        ],
      },
      {
        month: "2026-01",
        incomeSatang: 90000,
        allocations: [{ name: "food", amountSatang: 25000 }],
      },
    ]);

    expect(report.months.map((month) => month.month)).toEqual([
      "2026-01",
      "2026-02",
    ]);
    expect(report.incomeTotalSatang).toBe(190000);
    expect(report.allocatedTotalSatang).toBe(95000);
    expect(report.remainingTotalSatang).toBe(95000);
    expect(report.categories).toEqual([
      { name: "food", amountSatang: 55000 },
      { name: "Rent", amountSatang: 40000 },
    ]);
  });

  it("keeps missing income distinct from a recorded zero income", () => {
    const report = buildBudgetReport([
      { month: "2026-01", incomeSatang: null, allocations: [] },
      { month: "2026-02", incomeSatang: 0, allocations: [] },
      { month: "2026-03", incomeSatang: 1000, allocations: [] },
    ]);

    expect(report.months[0]?.remainingSatang).toBeNull();
    expect(report.months[1]?.remainingSatang).toBe(0);
    expect(report.monthsWithIncome).toBe(2);
    expect(report.monthsMissingIncome).toBe(1);
    expect(report.remainingTotalSatang).toBe(1000);
  });

  it("reports overspending as a negative balance", () => {
    const report = buildBudgetReport([
      {
        month: "2026-01",
        incomeSatang: 1000,
        allocations: [{ name: "Rent", amountSatang: 1500 }],
      },
    ]);

    expect(report.remainingTotalSatang).toBe(-500);
    expect(report.months[0]?.remainingSatang).toBe(-500);
  });
});
