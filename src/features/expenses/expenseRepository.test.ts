import "fake-indexeddb/auto";
import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import { buddyDatabase } from "../../data/buddyDatabase";
import {
  calculateMonthlyExpenseTotals,
  calculatePersonalExpenseAmount,
  createCreditCardExpense,
  createExpenseMerchant,
  CreditCardExpenseNotFoundError,
  deleteCreditCardExpense,
  ExpenseMerchantAlreadyExistsError,
  ExpenseMerchantNotFoundError,
  getOutstandingExpenseTotals,
  listCreditCardExpensesForMonth,
  listExpenseMerchants,
  setCreditCardExpenseSettled,
  updateCreditCardExpense,
} from "./expenseRepository";

describe("credit card expense repository", () => {
  beforeEach(async () => {
    await buddyDatabase.delete();
    await buddyDatabase.open();
  });

  it("migrates existing version 5 expenses as unsettled", async () => {
    await buddyDatabase.close();
    await buddyDatabase.delete();

    const legacyDatabase = new Dexie("buddy-budget");
    legacyDatabase.version(5).stores({
      profiles: "&id, &nameKey, createdAt",
      budgetPlans: "&id, profileId, month, &[profileId+month]",
      allocations:
        "&id, profileId, [profileId+month], nameKey, &[profileId+month+nameKey]",
      categories: "&id, &nameKey",
      expenseMerchants: "&id, &nameKey, name",
      creditCardExpenses: "&id, month, purchaseDate, merchantId",
      settings: "&key",
    });
    await legacyDatabase.open();
    await legacyDatabase.table("expenseMerchants").add({
      id: "merchant-1",
      name: "Cafe",
      nameKey: "cafe",
      createdAt: 1,
      updatedAt: 1,
    });
    await legacyDatabase.table("creditCardExpenses").add({
      id: "expense-1",
      purchaseDate: "2026-11-01",
      month: "2026-11",
      merchantId: "merchant-1",
      merchantName: "Cafe",
      amountSatang: 60000,
      isShared: true,
      peopleCount: 2,
      personalAmountSatang: 30000,
      createdAt: 1,
      updatedAt: 1,
    });
    legacyDatabase.close();

    await buddyDatabase.open();
    await expect(
      buddyDatabase.creditCardExpenses.get("expense-1"),
    ).resolves.toMatchObject({
      amountSatang: 60000,
      isSettled: false,
    });
  });

  it("adds merchants separately and prevents duplicate names ignoring case", async () => {
    const merchant = await createExpenseMerchant(" Cafe Buddy ");

    await expect(listExpenseMerchants()).resolves.toEqual([merchant]);
    await expect(createExpenseMerchant("cafe buddy")).rejects.toBeInstanceOf(
      ExpenseMerchantAlreadyExistsError,
    );
  });

  it("stores total card charge and the user's equal share for a shared purchase", async () => {
    const merchant = await createExpenseMerchant("Lunch spot");
    const expense = await createCreditCardExpense({
      purchaseDate: "2026-11-01",
      merchantId: merchant.id,
      amountSatang: 60000,
      isShared: true,
      peopleCount: 2,
    });

    expect(expense).toMatchObject({
      month: "2026-11",
      merchantName: "Lunch spot",
      amountSatang: 60000,
      isShared: true,
      peopleCount: 2,
      personalAmountSatang: 30000,
      isSettled: false,
    });
  });

  it("uses the full charge for an unshared expense and groups totals by month", async () => {
    const merchant = await createExpenseMerchant("Market");
    await createCreditCardExpense({
      purchaseDate: "2026-11-02",
      merchantId: merchant.id,
      amountSatang: 15000,
      isShared: false,
      peopleCount: 1,
    });
    await createCreditCardExpense({
      purchaseDate: "2026-12-01",
      merchantId: merchant.id,
      amountSatang: 9900,
      isShared: true,
      peopleCount: 3,
    });

    const november = await listCreditCardExpensesForMonth("2026-11");
    expect(november).toHaveLength(1);
    expect(calculateMonthlyExpenseTotals(november)).toEqual({
      chargedSatang: 15000,
      personalSatang: 15000,
      outstandingPersonalSatang: 15000,
      outstandingCollectionSatang: 0,
    });
    await expect(listCreditCardExpensesForMonth("2026-12")).resolves.toMatchObject([
      { amountSatang: 9900, personalAmountSatang: 3300 },
    ]);
  });

  it("rounds a fractional satang share to the nearest satang", () => {
    expect(calculatePersonalExpenseAmount(100, true, 3)).toBe(33);
  });

  it("calculates outstanding personal and collection totals for unsettled expenses", async () => {
    const merchant = await createExpenseMerchant("Market");
    const shared = await createCreditCardExpense({
      purchaseDate: "2026-11-02",
      merchantId: merchant.id,
      amountSatang: 60000,
      isShared: true,
      peopleCount: 2,
    });
    const settled = await createCreditCardExpense({
      purchaseDate: "2026-11-03",
      merchantId: merchant.id,
      amountSatang: 90000,
      isShared: true,
      peopleCount: 3,
    });
    await setCreditCardExpenseSettled(settled.id, true);
    await createCreditCardExpense({
      purchaseDate: "2026-11-04",
      merchantId: merchant.id,
      amountSatang: 20000,
      isShared: false,
      peopleCount: 1,
    });
    await createCreditCardExpense({
      purchaseDate: "2026-11-05",
      merchantId: merchant.id,
      amountSatang: 100,
      isShared: true,
      peopleCount: 3,
    });

    const expenses = await listCreditCardExpensesForMonth("2026-11");
    expect(calculateMonthlyExpenseTotals(expenses)).toEqual({
      chargedSatang: 170100,
      personalSatang: 80033,
      outstandingPersonalSatang: 50033,
      outstandingCollectionSatang: 30067,
    });
    expect(shared.isSettled).toBe(false);
  });

  it("calculates outstanding totals across months and excludes fully settled expenses", async () => {
    const merchant = await createExpenseMerchant("Market");
    await createCreditCardExpense({
      purchaseDate: "2026-11-02",
      merchantId: merchant.id,
      amountSatang: 60000,
      isShared: true,
      peopleCount: 2,
    });
    const decemberExpense = await createCreditCardExpense({
      purchaseDate: "2026-12-03",
      merchantId: merchant.id,
      amountSatang: 30000,
      isShared: true,
      peopleCount: 3,
    });
    const januaryExpense = await createCreditCardExpense({
      purchaseDate: "2027-01-04",
      merchantId: merchant.id,
      amountSatang: 50000,
      isShared: true,
      peopleCount: 2,
    });
    await setCreditCardExpenseSettled(januaryExpense.id, true);

    await expect(getOutstandingExpenseTotals()).resolves.toEqual({
      outstandingPersonalSatang: 40000,
      outstandingCollectionSatang: 50000,
    });
    expect(decemberExpense.isSettled).toBe(false);
  });

  it("updates expenses, resets settlement for financial changes, and preserves it for descriptive edits", async () => {
    const merchant = await createExpenseMerchant("Lunch spot");
    const otherMerchant = await createExpenseMerchant("Cafe");
    const expense = await createCreditCardExpense({
      purchaseDate: "2026-11-02",
      merchantId: merchant.id,
      amountSatang: 60000,
      isShared: true,
      peopleCount: 2,
    });
    await setCreditCardExpenseSettled(expense.id, true);

    const descriptiveEdit = await updateCreditCardExpense(expense.id, {
      purchaseDate: "2026-12-03",
      merchantId: otherMerchant.id,
      amountSatang: 60000,
      isShared: true,
      peopleCount: 2,
    });
    expect(descriptiveEdit).toMatchObject({
      month: "2026-12",
      merchantName: "Cafe",
      isSettled: true,
    });

    const financialEdit = await updateCreditCardExpense(expense.id, {
      purchaseDate: "2026-12-03",
      merchantId: otherMerchant.id,
      amountSatang: 80000,
      isShared: true,
      peopleCount: 2,
    });
    expect(financialEdit).toMatchObject({
      amountSatang: 80000,
      personalAmountSatang: 40000,
      isSettled: false,
    });

    await deleteCreditCardExpense(expense.id);
    await expect(buddyDatabase.creditCardExpenses.get(expense.id)).resolves.toBeUndefined();
    await expect(deleteCreditCardExpense(expense.id)).rejects.toBeInstanceOf(
      CreditCardExpenseNotFoundError,
    );
  });

  it("rejects invalid dates, zero amounts, invalid split counts, and unknown merchants", async () => {
    const merchant = await createExpenseMerchant("Cafe");
    await expect(
      createCreditCardExpense({
        purchaseDate: "2026-02-30",
        merchantId: merchant.id,
        amountSatang: 100,
        isShared: false,
        peopleCount: 1,
      }),
    ).rejects.toMatchObject({ code: "date" });
    await expect(
      createCreditCardExpense({
        purchaseDate: "2026-11-01",
        merchantId: merchant.id,
        amountSatang: 0,
        isShared: false,
        peopleCount: 1,
      }),
    ).rejects.toMatchObject({ code: "amount" });
    await expect(
      createCreditCardExpense({
        purchaseDate: "2026-11-01",
        merchantId: merchant.id,
        amountSatang: 100,
        isShared: true,
        peopleCount: 1,
      }),
    ).rejects.toMatchObject({ code: "people" });
    await expect(
      createCreditCardExpense({
        purchaseDate: "2026-11-01",
        merchantId: "missing",
        amountSatang: 100,
        isShared: false,
        peopleCount: 1,
      }),
    ).rejects.toBeInstanceOf(ExpenseMerchantNotFoundError);
  });
});
