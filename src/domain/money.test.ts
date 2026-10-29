import { describe, expect, it } from "vitest";
import {
  calculateAllocationTotals,
  formatSatangAsBahtInput,
  getDefaultBudgetMonth,
  MoneyInputError,
  parseBahtToSatang,
} from "./money";

describe("money helpers", () => {
  it("converts decimal baht to integer satang without floating point drift", () => {
    expect(parseBahtToSatang("1234.56")).toBe(123456);
    expect(parseBahtToSatang("10")).toBe(1000);
    expect(formatSatangAsBahtInput(123456)).toBe("1234.56");
  });

  it.each(["", "-1", "1.001", "1,000", "1e3", "90071992547410"])(
    "rejects invalid amount %s",
    (value) => {
      expect(() => parseBahtToSatang(value)).toThrow(MoneyInputError);
    },
  );

  it("calculates remaining funds for under, exact, and over allocation", () => {
    expect(calculateAllocationTotals(10000, [2500, 3000])).toEqual({
      allocatedSatang: 5500,
      remainingSatang: 4500,
    });
    expect(calculateAllocationTotals(10000, [4000, 6000]).remainingSatang).toBe(0);
    expect(calculateAllocationTotals(10000, [7000, 6000]).remainingSatang).toBe(
      -3000,
    );
  });

  it("defaults new plans to the month after income is received", () => {
    expect(getDefaultBudgetMonth(new Date(2026, 11, 31))).toBe("2027-01");
    expect(getDefaultBudgetMonth(new Date(2026, 0, 31))).toBe("2026-02");
  });
});
