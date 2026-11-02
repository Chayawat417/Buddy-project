import Dexie from "dexie";
import {
  buddyDatabase,
  type CreditCardExpenseRecord,
  type ExpenseMerchantRecord,
} from "../../data/buddyDatabase";

export class ExpenseMerchantNameError extends Error {
  constructor(readonly code: "required" | "tooLong") {
    super(code);
    this.name = "ExpenseMerchantNameError";
  }
}

export class ExpenseMerchantAlreadyExistsError extends Error {
  constructor() {
    super("A merchant with this name already exists.");
    this.name = "ExpenseMerchantAlreadyExistsError";
  }
}

export class ExpenseMerchantNotFoundError extends Error {
  constructor() {
    super("The selected merchant does not exist.");
    this.name = "ExpenseMerchantNotFoundError";
  }
}

export class CreditCardExpenseInputError extends Error {
  constructor(readonly code: "date" | "amount" | "people") {
    super(code);
    this.name = "CreditCardExpenseInputError";
  }
}

export class CreditCardExpenseNotFoundError extends Error {
  constructor() {
    super("The selected expense does not exist.");
    this.name = "CreditCardExpenseNotFoundError";
  }
}

export interface CreateCreditCardExpenseInput {
  purchaseDate: string;
  merchantId: string;
  amountSatang: number;
  isShared: boolean;
  peopleCount: number;
}

export interface MonthlyExpenseTotals {
  chargedSatang: number;
  personalSatang: number;
  outstandingPersonalSatang: number;
  outstandingCollectionSatang: number;
}

function normalizeMerchantName(name: string): {
  name: string;
  nameKey: string;
} {
  const normalizedName = name.trim();
  if (!normalizedName) throw new ExpenseMerchantNameError("required");
  if (normalizedName.length > 80) {
    throw new ExpenseMerchantNameError("tooLong");
  }
  return { name: normalizedName, nameKey: normalizedName.toLowerCase() };
}

function validatePurchaseDate(purchaseDate: string): void {
  const parsedDate = new Date(`${purchaseDate}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== purchaseDate
  ) {
    throw new CreditCardExpenseInputError("date");
  }
}

function validateAmount(amountSatang: number): void {
  if (!Number.isSafeInteger(amountSatang) || amountSatang <= 0) {
    throw new CreditCardExpenseInputError("amount");
  }
}

export function calculatePersonalExpenseAmount(
  amountSatang: number,
  isShared: boolean,
  peopleCount: number,
): number {
  validateAmount(amountSatang);
  if (!isShared) {
    if (peopleCount !== 1) throw new CreditCardExpenseInputError("people");
    return amountSatang;
  }
  if (!Number.isSafeInteger(peopleCount) || peopleCount < 2) {
    throw new CreditCardExpenseInputError("people");
  }
  return Math.round(amountSatang / peopleCount);
}

export function calculateMonthlyExpenseTotals(
  expenses: CreditCardExpenseRecord[],
): MonthlyExpenseTotals {
  return expenses.reduce(
    (totals, expense) => {
      const amountToCollectSatang = expense.isShared
        ? expense.amountSatang - expense.personalAmountSatang
        : 0;
      return {
        chargedSatang: totals.chargedSatang + expense.amountSatang,
        personalSatang: totals.personalSatang + expense.personalAmountSatang,
        outstandingPersonalSatang:
          totals.outstandingPersonalSatang +
          (expense.isSettled ? 0 : expense.personalAmountSatang),
        outstandingCollectionSatang:
          totals.outstandingCollectionSatang +
          (expense.isSettled ? 0 : amountToCollectSatang),
      };
    },
    {
      chargedSatang: 0,
      personalSatang: 0,
      outstandingPersonalSatang: 0,
      outstandingCollectionSatang: 0,
    },
  );
}

export async function getOutstandingExpenseTotals(): Promise<
  Pick<
    MonthlyExpenseTotals,
    "outstandingPersonalSatang" | "outstandingCollectionSatang"
  >
> {
  const expenses = await buddyDatabase.creditCardExpenses.toArray();
  const totals = calculateMonthlyExpenseTotals(expenses);
  return {
    outstandingPersonalSatang: totals.outstandingPersonalSatang,
    outstandingCollectionSatang: totals.outstandingCollectionSatang,
  };
}

export async function listExpenseMerchants(): Promise<ExpenseMerchantRecord[]> {
  return (await buddyDatabase.expenseMerchants.toArray()).sort((first, second) =>
    first.name.localeCompare(second.name, "th"),
  );
}

export async function createExpenseMerchant(
  name: string,
): Promise<ExpenseMerchantRecord> {
  const normalized = normalizeMerchantName(name);
  const now = Date.now();
  const merchant: ExpenseMerchantRecord = {
    id: crypto.randomUUID(),
    ...normalized,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await buddyDatabase.expenseMerchants.add(merchant);
  } catch (error) {
    if (error instanceof Dexie.ConstraintError) {
      throw new ExpenseMerchantAlreadyExistsError();
    }
    throw error;
  }
  return merchant;
}

export async function createCreditCardExpense(
  input: CreateCreditCardExpenseInput,
): Promise<CreditCardExpenseRecord> {
  validatePurchaseDate(input.purchaseDate);
  validateAmount(input.amountSatang);
  const peopleCount = input.isShared ? input.peopleCount : 1;
  const personalAmountSatang = calculatePersonalExpenseAmount(
    input.amountSatang,
    input.isShared,
    peopleCount,
  );

  return buddyDatabase.transaction(
    "rw",
    buddyDatabase.expenseMerchants,
    buddyDatabase.creditCardExpenses,
    async () => {
      const merchant = await buddyDatabase.expenseMerchants.get(input.merchantId);
      if (!merchant) throw new ExpenseMerchantNotFoundError();
      const now = Date.now();
      const expense: CreditCardExpenseRecord = {
        id: crypto.randomUUID(),
        purchaseDate: input.purchaseDate,
        month: input.purchaseDate.slice(0, 7),
        merchantId: merchant.id,
        merchantName: merchant.name,
        amountSatang: input.amountSatang,
        isShared: input.isShared,
        peopleCount,
        personalAmountSatang,
        isSettled: false,
        createdAt: now,
        updatedAt: now,
      };
      await buddyDatabase.creditCardExpenses.add(expense);
      return expense;
    },
  );
}

export async function updateCreditCardExpense(
  expenseId: string,
  input: CreateCreditCardExpenseInput,
): Promise<CreditCardExpenseRecord> {
  validatePurchaseDate(input.purchaseDate);
  validateAmount(input.amountSatang);
  const peopleCount = input.isShared ? input.peopleCount : 1;
  const personalAmountSatang = calculatePersonalExpenseAmount(
    input.amountSatang,
    input.isShared,
    peopleCount,
  );

  return buddyDatabase.transaction(
    "rw",
    buddyDatabase.expenseMerchants,
    buddyDatabase.creditCardExpenses,
    async () => {
      const [existing, merchant] = await Promise.all([
        buddyDatabase.creditCardExpenses.get(expenseId),
        buddyDatabase.expenseMerchants.get(input.merchantId),
      ]);
      if (!existing) throw new CreditCardExpenseNotFoundError();
      if (!merchant) throw new ExpenseMerchantNotFoundError();

      const financialDetailsChanged =
        existing.amountSatang !== input.amountSatang ||
        existing.isShared !== input.isShared ||
        existing.peopleCount !== peopleCount;
      const updatedExpense: CreditCardExpenseRecord = {
        ...existing,
        purchaseDate: input.purchaseDate,
        month: input.purchaseDate.slice(0, 7),
        merchantId: merchant.id,
        merchantName: merchant.name,
        amountSatang: input.amountSatang,
        isShared: input.isShared,
        peopleCount,
        personalAmountSatang,
        isSettled: financialDetailsChanged ? false : existing.isSettled,
        updatedAt: Date.now(),
      };
      await buddyDatabase.creditCardExpenses.put(updatedExpense);
      return updatedExpense;
    },
  );
}

export async function setCreditCardExpenseSettled(
  expenseId: string,
  isSettled: boolean,
): Promise<CreditCardExpenseRecord> {
  return buddyDatabase.transaction(
    "rw",
    buddyDatabase.creditCardExpenses,
    async () => {
      const existing = await buddyDatabase.creditCardExpenses.get(expenseId);
      if (!existing) throw new CreditCardExpenseNotFoundError();
      const updatedExpense = {
        ...existing,
        isSettled,
        updatedAt: Date.now(),
      };
      await buddyDatabase.creditCardExpenses.put(updatedExpense);
      return updatedExpense;
    },
  );
}

export async function deleteCreditCardExpense(expenseId: string): Promise<void> {
  await buddyDatabase.transaction(
    "rw",
    buddyDatabase.creditCardExpenses,
    async () => {
      const existing = await buddyDatabase.creditCardExpenses.get(expenseId);
      if (!existing) throw new CreditCardExpenseNotFoundError();
      await buddyDatabase.creditCardExpenses.delete(expenseId);
    },
  );
}

export async function listCreditCardExpensesForMonth(
  month: string,
): Promise<CreditCardExpenseRecord[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new CreditCardExpenseInputError("date");
  }
  const expenses = await buddyDatabase.creditCardExpenses
    .where("month")
    .equals(month)
    .toArray();
  return expenses.sort(
    (first, second) =>
      second.purchaseDate.localeCompare(first.purchaseDate) ||
      second.createdAt - first.createdAt,
  );
}
