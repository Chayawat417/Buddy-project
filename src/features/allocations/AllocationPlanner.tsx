import { useEffect, useState } from "react";
import type { BudgetCategoryRecord } from "../../data/buddyDatabase";
import AllocationRow from "./AllocationRow";
import MonthlyComparison from "./MonthlyComparison";
import { formatBudgetMonth, formatSatangAsCurrency, getDefaultBudgetMonth } from "../../domain/money";
import { listBudgetCategories } from "./categoryRepository";
import { useAllocationPlanner } from "./useAllocationPlanner";

interface AllocationPlannerProps {
  profileId: string;
  profileName: string;
}

export default function AllocationPlanner({
  profileId,
  profileName,
}: AllocationPlannerProps) {
  const [month, setMonth] = useState(getDefaultBudgetMonth);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [categories, setCategories] = useState<BudgetCategoryRecord[]>([]);
  const [categoryError, setCategoryError] = useState("");
  const planner = useAllocationPlanner(profileId, month);

  useEffect(() => {
    let isMounted = true;
    void listBudgetCategories()
      .then((result) => {
        if (isMounted) setCategories(result);
      })
      .catch(() => {
        if (isMounted) {
          setCategoryError("โหลดรายการหมวดไม่สำเร็จ กรุณารีเฟรชหน้า");
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="budget-card" aria-labelledby="budget-title">
      <div className="budget-heading">
        <div>
          <p className="eyebrow">งบประมาณของ {profileName}</p>
          <h2 id="budget-title">แผนจัดสรรรายเดือน</h2>
          <p className="budget-hint">
            ใส่รายได้ที่ได้รับสิ้นเดือนก่อน แล้วจัดสรรสำหรับเดือนถัดไป
          </p>
        </div>
        <div className="month-field">
          <label htmlFor="budget-month">เดือนงบประมาณ</label>
          <input
            disabled={planner.isCopyingPreviousMonth}
            id="budget-month"
            onChange={(event) => setMonth(event.target.value)}
            type="month"
            value={month}
          />
          <button
            className="button button-secondary"
            disabled={planner.isLoading || planner.isCopyingPreviousMonth}
            onClick={() => void planner.handleCopyPreviousMonth()}
            type="button"
          >
            {planner.isCopyingPreviousMonth
              ? "กำลังคัดลอก…"
              : "คัดลอกหมวดจากเดือนก่อน"}
          </button>
          <p className="field-hint">
            เพิ่มเฉพาะหมวดที่ยังไม่มี และไม่คัดลอกรายได้
          </p>
        </div>
      </div>

      <form
        className="income-form"
        onSubmit={(event) => void planner.handleIncomeSubmit(event)}
      >
        <div>
          <label htmlFor="monthly-income">รายได้สุทธิที่ได้รับ (บาท)</label>
          <p className="field-hint">เป็นยอดเงินสำหรับจัดสรรในเดือนนี้</p>
        </div>
        <input
          id="monthly-income"
          inputMode="decimal"
          min="0"
          onChange={(event) => planner.setIncome(event.target.value)}
          placeholder="เช่น 35000.00"
          required
          step="0.01"
          type="number"
          value={planner.income}
        />
        <button className="button button-primary" type="submit">
          บันทึกรายได้
        </button>
      </form>

      <div className="reconciliation" role="status" aria-live="polite">
        <div>
          <span>รายได้</span>
          <strong>
            {planner.incomeSatang === null
              ? "—"
              : formatSatangAsCurrency(planner.incomeSatang)}
          </strong>
        </div>
        <div>
          <span>จัดสรรแล้ว</span>
          <strong>{formatSatangAsCurrency(planner.allocatedSatang)}</strong>
        </div>
        <div
          className={
            planner.totals && planner.totals.remainingSatang < 0
              ? "reconciliation-status is-over"
              : planner.totals && planner.totals.remainingSatang === 0
                ? "reconciliation-status is-balanced"
                : "reconciliation-status"
          }
        >
          <span>
            {!planner.totals
              ? "กรอกรายได้"
              : planner.totals.remainingSatang < 0
                ? "เกินรายได้"
                : planner.totals.remainingSatang === 0
                  ? "จัดสรรครบ"
                  : "ยังเหลือ"}
          </span>
          <strong>
            {planner.totals
              ? formatSatangAsCurrency(Math.abs(planner.totals.remainingSatang))
              : "—"}
          </strong>
        </div>
      </div>

      <div className="comparison-section">
        <button
          aria-controls="monthly-comparison"
          aria-expanded={isComparisonOpen}
          className="button button-secondary"
          onClick={() => setIsComparisonOpen((current) => !current)}
          type="button"
        >
          {isComparisonOpen
            ? "ซ่อนตารางเปรียบเทียบ"
            : "เปรียบเทียบกับเดือนก่อน"}
        </button>
        <section
          aria-labelledby="monthly-comparison-title"
          className="comparison-panel"
          hidden={!isComparisonOpen}
          id="monthly-comparison"
        >
          <h3 id="monthly-comparison-title">เปรียบเทียบงบประมาณรายเดือน</h3>
          {isComparisonOpen && (
            <MonthlyComparison
              key={`${profileId}-${month}`}
              month={month}
              profileId={profileId}
            />
          )}
        </section>
      </div>

      <div className="allocation-list">
        <h3>หมวดงบประมาณ · {formatBudgetMonth(month)}</h3>
        {planner.isLoading ? (
          <p role="status">กำลังโหลดงบประมาณ…</p>
        ) : (
          <div
            aria-label="ตารางหมวดงบประมาณ"
            className="table-scroll"
            role="region"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">หมวด</th>
                  <th scope="col">จำนวนเงิน (บาท)</th>
                  <th scope="col">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {planner.allocations.map((allocation, index) => (
                  <AllocationRow
                    allocation={allocation}
                    categories={categories}
                    index={index}
                    key={allocation.id}
                    onAmountChange={planner.handleAllocationAmountChange}
                    onDelete={planner.handleDeleteAllocation}
                    onSave={planner.handleSaveAllocation}
                  />
                ))}
                {planner.allocations.length === 0 && (
                  <tr>
                    <td className="empty-row" colSpan={3}>
                      ยังไม่มีหมวดงบประมาณ เพิ่มหมวดแรกได้ด้านล่าง
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {categoryError && (
          <p className="error-message" role="alert">
            {categoryError}
          </p>
        )}
        <form
          className="add-allocation-form"
          onSubmit={(event) => void planner.handleAddAllocation(event)}
        >
          <div>
            <label htmlFor="new-allocation-name">เลือกหมวดงบประมาณ</label>
            <select
              id="new-allocation-name"
              onChange={(event) => planner.setNewName(event.target.value)}
              required
              value={planner.newName}
            >
              <option disabled value="">
                {categories.length > 0 ? "เลือกหมวด" : "ไปที่ตั้งค่าหมวดก่อน"}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-allocation-amount">จำนวนเงิน (บาท)</label>
            <input
              id="new-allocation-amount"
              inputMode="decimal"
              onChange={(event) => planner.setNewAmount(event.target.value)}
              placeholder="0.00"
              type="text"
              value={planner.newAmount}
            />
          </div>
          <button
            className="button button-primary"
            disabled={categories.length === 0}
            type="submit"
          >
            เพิ่มรายการงบประมาณ
          </button>
        </form>
      </div>

      {planner.errorMessage && (
        <p className="error-message" role="alert">
          {planner.errorMessage}
        </p>
      )}
      {planner.successMessage && (
        <p className="success-message" role="status">
          {planner.successMessage}
        </p>
      )}
    </section>
  );
}
