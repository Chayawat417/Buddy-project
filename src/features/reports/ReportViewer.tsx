import { useEffect, useState } from "react";
import type { BudgetReport } from "../../domain/report";
import {
  getQuarterPeriod,
  getYearPeriod,
  type ReportPeriod,
} from "../../domain/report";
import {
  formatSatangAsCurrency,
} from "../../domain/money";
import { observeBudgetReport } from "./reportRepository";
import { useLanguage } from "../../i18n";

type ReportMode = "quarter" | "year";

interface ReportViewerProps {
  profileId: string;
  profileName: string;
}

function formatMonth(month: string, locale: "th" | "en"): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return "—";

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-gregory" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

export default function ReportViewer({
  profileId,
  profileName,
}: ReportViewerProps) {
  const { locale, t } = useLanguage();
  const now = new Date();
  const [mode, setMode] = useState<ReportMode>("quarter");
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [period, setPeriod] = useState<ReportPeriod>(() =>
    getQuarterPeriod(now.getFullYear(), Math.floor(now.getMonth() / 3) + 1),
  );
  const [report, setReport] = useState<BudgetReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<"report.invalidYear" | "report.loadingError" | null>(null);

  useEffect(() => {
    let nextPeriod: ReportPeriod;
    try {
      nextPeriod =
        mode === "quarter"
          ? getQuarterPeriod(year, quarter)
          : getYearPeriod(year);
      setPeriod(nextPeriod);
    } catch {
      setReport(null);
      setErrorKey("report.invalidYear");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    // Subscribe instead of loading once, so saved budgets, income changes
    // and restored backups appear without reloading the page.
    return observeBudgetReport(
      profileId,
      nextPeriod,
      (result) => {
        setReport(result);
        setErrorKey(null);
        setIsLoading(false);
      },
      () => {
        setReport(null);
        setErrorKey("report.loadingError");
        setIsLoading(false);
      },
    );
  }, [mode, year, quarter, profileId]);

  const periodLabel = mode === "quarter"
    ? `${t("report.quarter")} ${quarter} / ${year}`
    : t("report.yearValue", { year });
  const quarterMonths = locale === "th"
    ? ["ม.ค.–มี.ค.", "เม.ย.–มิ.ย.", "ก.ค.–ก.ย.", "ต.ค.–ธ.ค."]
    : ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"];

  return (
    <section className="report-card" aria-labelledby="report-title">
      <div className="report-controls no-print">
        <div>
          <p className="eyebrow">{t("report.eyebrow", { name: profileName })}</p>
          <h2 id="report-title">{t("report.title")}</h2>
        </div>
        <div className="report-filters">
          <div>
            <label htmlFor="report-mode">{t("report.period")}</label>
            <select
              id="report-mode"
              onChange={(event) => setMode(event.target.value as ReportMode)}
              value={mode}
            >
              <option value="quarter">{t("report.quarterly")}</option>
              <option value="year">{t("report.yearly")}</option>
            </select>
          </div>
          {mode === "quarter" && (
            <div>
              <label htmlFor="report-quarter">{t("report.quarter")}</label>
              <select
                id="report-quarter"
                onChange={(event) => setQuarter(Number(event.target.value))}
                value={quarter}
              >
                {quarterMonths.map((months, index) => (
                  <option key={months} value={index + 1}>
                    {t("report.quarterOption", { quarter: index + 1, months })}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="report-year">{t("report.year")}</label>
            <input
              id="report-year"
              max={9999}
              min={1900}
              onChange={(event) => setYear(Number(event.target.value))}
              type="number"
              value={year}
            />
          </div>
          <button
            className="button button-primary"
            disabled={isLoading || report === null}
            onClick={() => window.print()}
            type="button"
          >
            {t("report.print")}
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="no-print" role="status">
          {t("report.loading")}
        </p>
      )}
      {errorKey && (
        <p className="error-message no-print" role="alert">
          {t(errorKey)}
        </p>
      )}

      {!isLoading && !errorKey && report && (
        <div className="report-content">
          <header className="report-document-header">
            <p className="eyebrow">{t("report.documentTitle")}</p>
            <h2>{profileName}</h2>
            <p>{periodLabel}</p>
            <small>
              {formatMonth(period.startMonth, locale)} – {formatMonth(period.endMonth, locale)}
            </small>
          </header>

          <div className="report-summary">
            <div>
              <span>{t("report.incomeRecorded")}</span>
              <strong>{formatSatangAsCurrency(report.incomeTotalSatang, locale)}</strong>
              <small>
                {t("report.incomeMonthCount", {
                  recorded: report.monthsWithIncome,
                  total: report.months.length,
                })}
              </small>
            </div>
            <div>
              <span>{t("report.totalAllocated")}</span>
              <strong>{formatSatangAsCurrency(report.allocatedTotalSatang, locale)}</strong>
              <small>{t("report.periodCategoryTotal")}</small>
            </div>
            <div>
              <span>{t("report.incomeMinusAllocated")}</span>
              <strong
                className={
                  report.remainingTotalSatang < 0 ? "report-over" : undefined
                }
              >
                {formatSatangAsCurrency(report.remainingTotalSatang, locale)}
              </strong>
              <small>{t("report.negativeMeansOver")}</small>
            </div>
          </div>

          {report.monthsMissingIncome > 0 && (
            <p className="report-warning">
              {t("report.missingIncome", { count: report.monthsMissingIncome })}
            </p>
          )}

          <div className="report-table-section">
            <h3>{t("report.monthlySummary")}</h3>
            {report.months.length === 0 ? (
              <p>{t("report.noData")}</p>
            ) : (
              <div
                aria-label={t("report.monthTable")}
                className="table-scroll"
                role="region"
                tabIndex={0}
              >
                <table className="report-table">
                  <thead>
                    <tr>
                      <th scope="col">{t("report.month")}</th>
                      <th scope="col">{t("report.income")}</th>
                      <th scope="col">{t("report.allocated")}</th>
                      <th scope="col">{t("report.remaining")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.months.map((month) => (
                      <tr key={month.month}>
                        <th scope="row">{formatMonth(month.month, locale)}</th>
                        <td>
                          {month.incomeSatang === null
                            ? t("comparison.notSaved")
                            : formatSatangAsCurrency(month.incomeSatang, locale)}
                        </td>
                        <td>{formatSatangAsCurrency(month.allocatedSatang, locale)}</td>
                        <td
                          className={
                            month.remainingSatang !== null &&
                            month.remainingSatang < 0
                              ? "report-over"
                              : undefined
                          }
                        >
                          {month.remainingSatang === null
                            ? "—"
                            : formatSatangAsCurrency(month.remainingSatang, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="report-table-section">
            <h3>{t("report.categorySummary")}</h3>
            {report.categories.length === 0 ? (
              <p>{t("report.noAllocations")}</p>
            ) : (
              <div
                aria-label={t("report.categoryTable")}
                className="table-scroll"
                role="region"
                tabIndex={0}
              >
                <table className="report-table category-report-table">
                  <thead>
                    <tr>
                      <th scope="col">{t("report.category")}</th>
                      <th scope="col">{t("report.totalAmount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.categories.map((category) => (
                      <tr key={category.name.toLocaleLowerCase()}>
                        <th scope="row">{category.name}</th>
                        <td>{formatSatangAsCurrency(category.amountSatang, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
