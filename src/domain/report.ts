export interface ReportMonthInput {
  month: string;
  incomeSatang: number | null;
  allocations: { name: string; amountSatang: number }[];
}

export interface ReportMonth {
  month: string;
  incomeSatang: number | null;
  allocatedSatang: number;
  remainingSatang: number | null;
}

export interface ReportCategory {
  name: string;
  amountSatang: number;
}

export interface BudgetReport {
  months: ReportMonth[];
  categories: ReportCategory[];
  incomeTotalSatang: number;
  allocatedTotalSatang: number;
  remainingTotalSatang: number;
  monthsWithIncome: number;
  monthsMissingIncome: number;
}

export interface ReportPeriod {
  startMonth: string;
  endMonth: string;
}

export function getQuarterPeriod(year: number, quarter: number): ReportPeriod {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new RangeError("Year must be between 1900 and 9999.");
  }
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    throw new RangeError("Quarter must be between 1 and 4.");
  }

  const startMonthNumber = (quarter - 1) * 3 + 1;
  const startMonth = `${year}-${String(startMonthNumber).padStart(2, "0")}`;
  const endMonth = `${year}-${String(startMonthNumber + 2).padStart(2, "0")}`;
  return { startMonth, endMonth };
}

export function getYearPeriod(year: number): ReportPeriod {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new RangeError("Year must be between 1900 and 9999.");
  }

  return {
    startMonth: `${year}-01`,
    endMonth: `${year}-12`,
  };
}

export function getMonthsInPeriod(period: ReportPeriod): string[] {
  const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;
  const start = monthPattern.exec(period.startMonth);
  const end = monthPattern.exec(period.endMonth);
  if (!start || !end || period.startMonth > period.endMonth) {
    throw new RangeError("Report period must contain valid ascending months.");
  }

  const startIndex = Number(start[1]) * 12 + Number(start[2]) - 1;
  const endIndex = Number(end[1]) * 12 + Number(end[2]) - 1;
  return Array.from({ length: endIndex - startIndex + 1 }, (_, offset) => {
    const index = startIndex + offset;
    const year = Math.floor(index / 12);
    const month = String((index % 12) + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
}

export function buildBudgetReport(inputs: ReportMonthInput[]): BudgetReport {
  const categoryTotals = new Map<string, ReportCategory>();
  const months = [...inputs]
    .sort((first, second) => first.month.localeCompare(second.month))
    .map((input) => {
      const allocatedSatang = input.allocations.reduce(
        (total, allocation) => total + allocation.amountSatang,
        0,
      );

      for (const allocation of input.allocations) {
        const categoryKey = allocation.name.toLocaleLowerCase();
        const existing = categoryTotals.get(categoryKey);
        if (existing) {
          existing.amountSatang += allocation.amountSatang;
        } else {
          categoryTotals.set(categoryKey, {
            name: allocation.name,
            amountSatang: allocation.amountSatang,
          });
        }
      }

      return {
        month: input.month,
        incomeSatang: input.incomeSatang,
        allocatedSatang,
        remainingSatang:
          input.incomeSatang === null
            ? null
            : input.incomeSatang - allocatedSatang,
      };
    });

  const monthsWithIncome = months.filter(
    (month) => month.incomeSatang !== null,
  ).length;
  const incomeTotalSatang = months.reduce(
    (total, month) => total + (month.incomeSatang ?? 0),
    0,
  );
  const allocatedTotalSatang = months.reduce(
    (total, month) => total + month.allocatedSatang,
    0,
  );

  return {
    months,
    categories: [...categoryTotals.values()].sort(
      (first, second) => second.amountSatang - first.amountSatang,
    ),
    incomeTotalSatang,
    allocatedTotalSatang,
    remainingTotalSatang: incomeTotalSatang - allocatedTotalSatang,
    monthsWithIncome,
    monthsMissingIncome: months.length - monthsWithIncome,
  };
}
