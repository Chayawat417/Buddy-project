export class MoneyInputError extends Error {
  constructor() {
    super("Enter a non-negative amount with no more than two decimal places.");
    this.name = "MoneyInputError";
  }
}

export function parseBahtToSatang(value: string): number {
  const normalized = value.trim();
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(normalized);

  if (!match) {
    throw new MoneyInputError();
  }

  const baht = Number(match[1]);
  const satang = Number((match[2] ?? "").padEnd(2, "0"));
  const totalSatang = baht * 100 + satang;

  if (!Number.isSafeInteger(totalSatang)) {
    throw new MoneyInputError();
  }

  return totalSatang;
}

export function formatSatangAsBahtInput(satang: number): string {
  const baht = Math.floor(satang / 100);
  const remainingSatang = String(satang % 100).padStart(2, "0");
  return `${baht}.${remainingSatang}`;
}

export function formatSatangAsCurrency(satang: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(satang / 100);
}

export function calculateAllocationTotals(
  incomeSatang: number,
  allocationAmounts: number[],
): { allocatedSatang: number; remainingSatang: number } {
  const allocatedSatang = allocationAmounts.reduce(
    (total, amount) => total + amount,
    0,
  );

  return {
    allocatedSatang,
    remainingSatang: incomeSatang - allocatedSatang,
  };
}

export function getDefaultBudgetMonth(now = new Date()): string {
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const year = nextMonth.getFullYear();
  const month = String(nextMonth.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatBudgetMonth(month: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return "เลือกเดือนงบประมาณ";

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}
