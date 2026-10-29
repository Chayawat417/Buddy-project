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
import { getBudgetReport } from "./reportRepository";

type ReportMode = "quarter" | "year";

interface ReportViewerProps {
  profileId: string;
  profileName: string;
}

function formatMonth(month: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return "—";

  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

export default function ReportViewer({
  profileId,
  profileName,
}: ReportViewerProps) {
  const now = new Date();
  const [mode, setMode] = useState<ReportMode>("quarter");
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [period, setPeriod] = useState<ReportPeriod>(() =>
    getQuarterPeriod(now.getFullYear(), Math.floor(now.getMonth() / 3) + 1),
  );
  const [report, setReport] = useState<BudgetReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
      setErrorMessage("กรุณาเลือกปีระหว่าง ค.ศ. 1900 ถึง 9999");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");
    void getBudgetReport(profileId, nextPeriod)
      .then((result) => {
        if (isMounted) setReport(result);
      })
      .catch(() => {
        if (isMounted) {
          setReport(null);
          setErrorMessage("โหลดรายงานไม่สำเร็จ กรุณาลองอีกครั้ง");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mode, year, quarter, profileId]);

  const periodLabel =
    mode === "quarter" ? `ไตรมาส ${quarter} / ${year}` : `ปี ${year}`;

  return (
    <section className="report-card" aria-labelledby="report-title">
      <div className="report-controls no-print">
        <div>
          <p className="eyebrow">สรุปสำหรับ {profileName}</p>
          <h2 id="report-title">รายงานงบประมาณ</h2>
        </div>
        <div className="report-filters">
          <div>
            <label htmlFor="report-mode">ช่วงรายงาน</label>
            <select
              id="report-mode"
              onChange={(event) => setMode(event.target.value as ReportMode)}
              value={mode}
            >
              <option value="quarter">รายไตรมาส</option>
              <option value="year">รายปี</option>
            </select>
          </div>
          {mode === "quarter" && (
            <div>
              <label htmlFor="report-quarter">ไตรมาส</label>
              <select
                id="report-quarter"
                onChange={(event) => setQuarter(Number(event.target.value))}
                value={quarter}
              >
                <option value={1}>ไตรมาส 1 (ม.ค.–มี.ค.)</option>
                <option value={2}>ไตรมาส 2 (เม.ย.–มิ.ย.)</option>
                <option value={3}>ไตรมาส 3 (ก.ค.–ก.ย.)</option>
                <option value={4}>ไตรมาส 4 (ต.ค.–ธ.ค.)</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="report-year">ปี ค.ศ.</label>
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
            พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="no-print" role="status">
          กำลังสร้างรายงาน…
        </p>
      )}
      {errorMessage && (
        <p className="error-message no-print" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && report && (
        <div className="report-content">
          <header className="report-document-header">
            <p className="eyebrow">Buddy · รายงานงบประมาณ</p>
            <h2>{profileName}</h2>
            <p>{periodLabel}</p>
            <small>
              {formatMonth(period.startMonth)} – {formatMonth(period.endMonth)}
            </small>
          </header>

          <div className="report-summary">
            <div>
              <span>รายได้ที่บันทึก</span>
              <strong>{formatSatangAsCurrency(report.incomeTotalSatang)}</strong>
              <small>
                {report.monthsWithIncome} จาก {report.months.length} เดือน
              </small>
            </div>
            <div>
              <span>จัดสรรทั้งหมด</span>
              <strong>{formatSatangAsCurrency(report.allocatedTotalSatang)}</strong>
              <small>รวมทุกหมวดในช่วงรายงาน</small>
            </div>
            <div>
              <span>รายได้ที่บันทึก − จัดสรร</span>
              <strong
                className={
                  report.remainingTotalSatang < 0 ? "report-over" : undefined
                }
              >
                {formatSatangAsCurrency(report.remainingTotalSatang)}
              </strong>
              <small>ค่าติดลบหมายถึงจัดสรรเกินรายได้ที่บันทึก</small>
            </div>
          </div>

          {report.monthsMissingIncome > 0 && (
            <p className="report-warning">
              มี {report.monthsMissingIncome} เดือนที่ยังไม่มีรายได้บันทึก
              ยอดรายได้คงเหลือจึงเทียบกับรายได้ที่บันทึกเท่านั้น
            </p>
          )}

          <div className="report-table-section">
            <h3>สรุปรายเดือน</h3>
            {report.months.length === 0 ? (
              <p>ไม่มีข้อมูลในช่วงเวลานี้</p>
            ) : (
              <div
                aria-label="ตารางสรุปรายเดือน"
                className="table-scroll"
                role="region"
                tabIndex={0}
              >
                <table className="report-table">
                  <thead>
                    <tr>
                      <th scope="col">เดือน</th>
                      <th scope="col">รายได้</th>
                      <th scope="col">จัดสรร</th>
                      <th scope="col">คงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.months.map((month) => (
                      <tr key={month.month}>
                        <th scope="row">{formatMonth(month.month)}</th>
                        <td>
                          {month.incomeSatang === null
                            ? "ยังไม่บันทึก"
                            : formatSatangAsCurrency(month.incomeSatang)}
                        </td>
                        <td>{formatSatangAsCurrency(month.allocatedSatang)}</td>
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
                            : formatSatangAsCurrency(month.remainingSatang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="report-table-section">
            <h3>สรุปตามหมวดงบประมาณ</h3>
            {report.categories.length === 0 ? (
              <p>ไม่มีรายการจัดสรรในช่วงเวลานี้</p>
            ) : (
              <div
                aria-label="ตารางสรุปตามหมวดงบประมาณ"
                className="table-scroll"
                role="region"
                tabIndex={0}
              >
                <table className="report-table category-report-table">
                  <thead>
                    <tr>
                      <th scope="col">หมวด</th>
                      <th scope="col">ยอดรวมที่จัดสรร</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.categories.map((category) => (
                      <tr key={category.name.toLocaleLowerCase()}>
                        <th scope="row">{category.name}</th>
                        <td>{formatSatangAsCurrency(category.amountSatang)}</td>
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
