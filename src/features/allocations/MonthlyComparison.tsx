import { useEffect, useState } from "react";
import { formatBudgetMonth, formatSatangAsCurrency } from "../../domain/money";
import { buildMonthlyBudgetComparison } from "../../domain/monthComparison";
import type { MonthlyBudgetComparisonReport } from "../../domain/monthComparison";
import {
  getMonthlyBudgetComparison,
  getPreviousBudgetMonth,
} from "./allocationRepository";

interface MonthlyComparisonProps {
  profileId: string;
  month: string;
}

function getSignedCurrency(amountSatang: number | null): string {
  if (amountSatang === null) return "—";
  const formatted = formatSatangAsCurrency(Math.abs(amountSatang));
  if (amountSatang > 0) return `+${formatted}`;
  if (amountSatang < 0) return `−${formatted}`;
  return formatted;
}

export default function MonthlyComparison({
  profileId,
  month,
}: MonthlyComparisonProps) {
  const [comparison, setComparison] =
    useState<MonthlyBudgetComparisonReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCurrentRequest = true;
    setIsLoading(true);
    setErrorMessage("");

    void getMonthlyBudgetComparison(profileId, month)
      .then((result) => {
        if (!isCurrentRequest) return;
        setComparison(
          buildMonthlyBudgetComparison(
            result.previousMonth,
            result.currentMonth,
          ),
        );
      })
      .catch(() => {
        if (isCurrentRequest) {
          setComparison(null);
          setErrorMessage("โหลดข้อมูลเปรียบเทียบไม่สำเร็จ กรุณาลองอีกครั้ง");
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [profileId, month]);

  if (isLoading) {
    return (
      <p className="comparison-status" role="status">
        กำลังโหลดข้อมูลเปรียบเทียบ…
      </p>
    );
  }

  if (errorMessage || !comparison) {
    return (
      <p className="error-message" role="alert">
        {errorMessage || "ไม่พบข้อมูลเปรียบเทียบ"}
      </p>
    );
  }

  const comparisonPreviousMonth = getPreviousBudgetMonth(month);

  return (
    <div className="comparison-content">
      <p className="comparison-caption">
        เปรียบเทียบข้อมูลที่บันทึกแล้ว:{" "}
        {formatBudgetMonth(comparisonPreviousMonth)} กับ{" "}
        {formatBudgetMonth(month)}
      </p>
      <div
        aria-label="ตารางสรุปเปรียบเทียบรายเดือน"
        className="table-scroll"
        role="region"
        tabIndex={0}
      >
        <table className="comparison-table">
          <thead>
            <tr>
              <th scope="col">รายการ</th>
              <th scope="col">{formatBudgetMonth(comparisonPreviousMonth)}</th>
              <th scope="col">{formatBudgetMonth(month)}</th>
              <th scope="col">เปลี่ยนแปลง</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">รายได้</th>
              <td>
                {formatOptionalCurrency(comparison.previous.incomeSatang)}
              </td>
              <td>{formatOptionalCurrency(comparison.current.incomeSatang)}</td>
              <td>{getSignedCurrency(comparison.incomeDifferenceSatang)}</td>
            </tr>
            <tr>
              <th scope="row">จัดสรรรวม</th>
              <td>{formatSatangAsCurrency(comparison.previous.allocatedSatang)}</td>
              <td>{formatSatangAsCurrency(comparison.current.allocatedSatang)}</td>
              <td>{getSignedCurrency(comparison.allocatedDifferenceSatang)}</td>
            </tr>
            <tr>
              <th scope="row">คงเหลือ</th>
              <td>
                {formatOptionalCurrency(comparison.previous.remainingSatang)}
              </td>
              <td>
                {formatOptionalCurrency(comparison.current.remainingSatang)}
              </td>
              <td>{getSignedCurrency(comparison.remainingDifferenceSatang)}</td>
            </tr>
            {comparison.categories.map((category) => (
              <tr key={category.name}>
                <th scope="row">{category.name}</th>
                <td>{formatSatangAsCurrency(category.previousAmountSatang)}</td>
                <td>{formatSatangAsCurrency(category.currentAmountSatang)}</td>
                <td>{getSignedCurrency(category.differenceSatang)}</td>
              </tr>
            ))}
            {comparison.categories.length === 0 && (
              <tr>
                <td className="empty-row" colSpan={4}>
                  ไม่มีหมวดงบประมาณในสองเดือนนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="comparison-note">
        ค่าบวกหมายถึงเดือนนี้มากกว่าเดือนก่อนหน้า ค่าลบหมายถึงน้อยกว่า
        และรายได้ที่ยังไม่บันทึกจะแสดงเป็น “ยังไม่บันทึก”
      </p>
    </div>
  );
}

function formatOptionalCurrency(amountSatang: number | null): string {
  return amountSatang === null
    ? "ยังไม่บันทึก"
    : formatSatangAsCurrency(amountSatang);
}
