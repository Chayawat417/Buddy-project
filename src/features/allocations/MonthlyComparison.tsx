import { useEffect, useState } from "react";
import { formatBudgetMonth, formatSatangAsCurrency } from "../../domain/money";
import { buildMonthlyBudgetComparison } from "../../domain/monthComparison";
import type { MonthlyBudgetComparisonReport } from "../../domain/monthComparison";
import {
  getMonthlyBudgetComparison,
  getPreviousBudgetMonth,
} from "./allocationRepository";
import { useLanguage } from "../../i18n";

interface MonthlyComparisonProps {
  profileId: string;
  month: string;
}

function getSignedCurrency(amountSatang: number | null, locale: "th" | "en"): string {
  if (amountSatang === null) return "—";
  const formatted = formatSatangAsCurrency(Math.abs(amountSatang), locale);
  if (amountSatang > 0) return `+${formatted}`;
  if (amountSatang < 0) return `−${formatted}`;
  return formatted;
}

export default function MonthlyComparison({
  profileId,
  month,
}: MonthlyComparisonProps) {
  const { locale, t } = useLanguage();
  const [comparison, setComparison] =
    useState<MonthlyBudgetComparisonReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;
    setIsLoading(true);
    setHasError(false);

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
          setHasError(true);
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
        {t("comparison.loading")}
      </p>
    );
  }

  if (hasError || !comparison) {
    return (
      <p className="error-message" role="alert">
        {hasError ? t("comparison.loadingError") : t("comparison.notFound")}
      </p>
    );
  }

  const comparisonPreviousMonth = getPreviousBudgetMonth(month);

  return (
    <div className="comparison-content">
      <p className="comparison-caption">
        {t("comparison.caption", {
          previous: formatBudgetMonth(comparisonPreviousMonth, locale),
          current: formatBudgetMonth(month, locale),
        })}
      </p>
      <div
        aria-label={t("comparison.table")}
        className="table-scroll"
        role="region"
        tabIndex={0}
      >
        <table className="comparison-table">
          <thead>
            <tr>
              <th scope="col">{t("comparison.item")}</th>
              <th scope="col">{formatBudgetMonth(comparisonPreviousMonth, locale)}</th>
              <th scope="col">{formatBudgetMonth(month, locale)}</th>
              <th scope="col">{t("comparison.change")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{t("comparison.income")}</th>
              <td>{formatOptionalCurrency(comparison.previous.incomeSatang, locale, t)}</td>
              <td>{formatOptionalCurrency(comparison.current.incomeSatang, locale, t)}</td>
              <td>{getSignedCurrency(comparison.incomeDifferenceSatang, locale)}</td>
            </tr>
            <tr>
              <th scope="row">{t("comparison.totalAllocated")}</th>
              <td>{formatSatangAsCurrency(comparison.previous.allocatedSatang, locale)}</td>
              <td>{formatSatangAsCurrency(comparison.current.allocatedSatang, locale)}</td>
              <td>{getSignedCurrency(comparison.allocatedDifferenceSatang, locale)}</td>
            </tr>
            <tr>
              <th scope="row">{t("comparison.remaining")}</th>
              <td>{formatOptionalCurrency(comparison.previous.remainingSatang, locale, t)}</td>
              <td>{formatOptionalCurrency(comparison.current.remainingSatang, locale, t)}</td>
              <td>{getSignedCurrency(comparison.remainingDifferenceSatang, locale)}</td>
            </tr>
            {comparison.categories.map((category) => (
              <tr key={category.name}>
                <th scope="row">{category.name}</th>
                <td>{formatSatangAsCurrency(category.previousAmountSatang, locale)}</td>
                <td>{formatSatangAsCurrency(category.currentAmountSatang, locale)}</td>
                <td>{getSignedCurrency(category.differenceSatang, locale)}</td>
              </tr>
            ))}
            {comparison.categories.length === 0 && (
              <tr>
                <td className="empty-row" colSpan={4}>
                  {t("comparison.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="comparison-note">{t("comparison.note")}</p>
    </div>
  );
}

function formatOptionalCurrency(
  amountSatang: number | null,
  locale: "th" | "en",
  t: ReturnType<typeof useLanguage>["t"],
): string {
  return amountSatang === null
    ? t("comparison.notSaved")
    : formatSatangAsCurrency(amountSatang, locale);
}
