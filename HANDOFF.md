# Buddy — เอกสารส่งต่องาน

เอกสารนี้สรุปสถานะและข้อเท็จจริงจากโค้ดกับเอกสารในโปรเจกต์ เพื่อให้ผู้พัฒนาหรือ AI ตัวถัดไปทำงานต่อได้โดยไม่ต้องอาศัยบริบทจากแชตก่อนหน้า หากข้อมูลส่วนใดระบุว่า “ยังไม่ยืนยัน” ให้ตรวจโค้ดหรือถามเจ้าของโปรเจกต์ก่อนเปลี่ยนพฤติกรรมนั้น

## 1. โปรแกรมนี้ทำอะไร

Buddy เป็นเว็บแอปภาษาไทยสำหรับวางแผนแบ่งรายได้เป็นงบประมาณรายเดือน ใช้กับตัวเองและสมาชิกในครอบครัวโดยแยกข้อมูลตามโปรไฟล์ ผู้ใช้บันทึกรายได้ที่จะใช้ในเดือนงบประมาณ เพิ่มยอดตามหมวด และดูยอดรวม/เงินเหลือเพื่อเช็กว่าจัดสรรครบหรือเกินรายได้

ปัญหาที่โปรแกรมแก้คือการจัดงบรายเดือนด้วยตนเองและตรวจความครบถ้วนของการแบ่งเงิน โดยทำให้รายการแก้ไขได้ในเบราว์เซอร์ มีรายงานตามไตรมาสหรือปี และสำรอง/กู้คืนข้อมูลผ่านไฟล์ ทั้งหมดทำงานในอุปกรณ์โดยไม่ต้องมีบัญชีหรือบริการ backend

**ขอบเขตสำคัญ**

- เงินรายได้ที่กรอกเป็นเงินสำหรับเดือนงบประมาณที่เลือก ซึ่งโดยปกติได้รับมาตอนสิ้นเดือนก่อนหน้า
- แอปรองรับมือถือและเดสก์ท็อป และตั้งเป้า Chrome รุ่นปัจจุบันกับรุ่นหลักก่อนหน้า ตามการตัดสินใจที่บันทึกใน `PROGRESS.md`
- โปรไฟล์เป็นเพียงการแยกข้อมูลใน UI ไม่ใช่การล็อกสิทธิ์ ผู้ใช้เบราว์เซอร์เดียวกันเปิดดูโปรไฟล์อื่นได้
- ไม่มี server/API, login, password, cloud sync หรือการเข้ารหัสข้อมูล
- ข้อมูลใน IndexedDB อยู่ใน browser profile ของอุปกรณ์นั้น การติดตั้ง PWA ไม่ได้ย้ายหรือ sync ข้อมูลข้ามอุปกรณ์
- `Future Plan of 2026 (2).xlsx` เป็นวัสดุตัวอย่างเท่านั้น ไม่ใช่ข้อกำหนด UI หรือ schema ที่ต้องทำตาม

## 2. ฟีเจอร์และพฤติกรรม

### โปรไฟล์

- สร้าง เลือก เปลี่ยนชื่อ และลบโปรไฟล์ได้
- ชื่อถูก trim ก่อนบันทึก ยาวได้ไม่เกิน 40 ตัวอักษร และตรวจชื่อซ้ำโดยไม่สนตัวพิมพ์เล็ก/ใหญ่
- โปรไฟล์ที่เลือกเก็บใน IndexedDB settings ภายใต้ `activeProfileId`
- ลบโปรไฟล์จะลบแผนรายได้และ allocation ทั้งหมดของโปรไฟล์นั้นใน transaction เดียวกัน แล้วล้าง active profile หากเป็นโปรไฟล์ที่ถูกลบ
- หน้าจอโปรไฟล์ รวมการสำรอง/กู้คืนและตัวเลือกติดตั้งแอปไว้ในหน้าเดียว

### หน้าตั้งค่าหมวดงบประมาณ

- เป็นหน้าจอแยกจากหน้างบประมาณ เข้าผ่านแถบนำทางใน `ProfileManager`
- หมวดเป็นรายการกลาง ใช้ร่วมกันทุกโปรไฟล์
- เพิ่มหมวดได้ ชื่อถูก trim, จำกัด 60 ตัวอักษร และห้ามชื่อซ้ำโดยไม่สนตัวพิมพ์เล็ก/ใหญ่
- ซ่อนหมวดเพื่อนำออกจาก dropdown สำหรับเพิ่ม/เปลี่ยนหมวดใหม่ได้ แต่ไม่ลบ allocations เก่า และสามารถแสดงหมวดกลับมาได้
- เปลี่ยนชื่อหมวดมี checkbox ให้เลือกว่าจะเปลี่ยนชื่อ allocations ในอดีตของทุกโปรไฟล์ด้วยหรือไม่:
  - ไม่เลือก: อัปเดตชื่อใน catalog สำหรับการใช้งานครั้งถัดไป ข้อมูลเดือนเดิมยังใช้ชื่อเดิม
  - เลือก: เปลี่ยนชื่อและ `nameKey` ของ allocations ทุกเดือน/ทุกโปรไฟล์ใน transaction เดียวกับการเปลี่ยนชื่อ catalog
- หากเปลี่ยนย้อนหลังแล้วจะทำให้มีหมวดชื่อซ้ำภายในโปรไฟล์และเดือนเดียวกัน ระบบปฏิเสธและไม่เปลี่ยนข้อมูล
- การซ่อนหมวดไม่ใช่การลบ หาก allocation เดิมอ้างถึงหมวดที่ไม่ active แถวนั้นยังแสดงค่าเดิมเป็นตัวเลือก “หมวดเดิม” เพื่อไม่ให้ชื่อข้อมูลเดิมหายจาก UI

### แผนจัดสรรรายเดือน

- เดือนเริ่มต้นเป็นเดือนถัดไปจากวันปัจจุบัน (`getDefaultBudgetMonth`)
- รายได้เป็นเงินบาทใน UI และเก็บเป็นจำนวนเต็มสตางค์ ตรวจทศนิยมไม่เกิน 2 ตำแหน่งและไม่รับค่าติดลบ
- รายได้และ allocations แยกตามคู่ `profileId + month`
- เพิ่มรายการโดยเลือกชื่อหมวดจาก dropdown ที่มาจาก catalog active และกรอกยอดเงิน
- แก้ชื่อหมวดผ่าน dropdown หรือแก้จำนวนเงินในแต่ละแถวได้ การแก้จะยังไม่ persist จนกดปุ่มบันทึกของแถวนั้น
- ลบ allocation มี confirm dialog
- ชื่อหมวดในหนึ่งโปรไฟล์และเดือนต้องไม่ซ้ำกันแบบ case-insensitive ผ่าน unique compound index
- สรุปยอดคำนวณรายได้ ลบยอด allocations แสดงสถานะจัดสรรครบ เหลือ หรือเกินรายได้
- เปลี่ยนเดือนแล้วข้อมูลโหลดใหม่

### คัดลอกหมวดจากเดือนก่อน

- ปุ่มอยู่ในหน้าจัดสรรรายเดือน
- คัดลอกชื่อและจำนวนเงินของ allocations จากเดือนก่อนหน้าในโปรไฟล์เดียวกัน โดยรองรับมกราคมย้อนกลับไปธันวาคมปีก่อน
- ไม่คัดลอกรายได้ และไม่แทนที่หมวดที่มีอยู่แล้วในเดือนปลายทาง
- ชื่อซ้ำเทียบจาก `nameKey` ซึ่งสร้างจากชื่อที่ trim และ lowercase
- เมื่อซ่อนหมวดแล้ว การคัดลอกรายการเก่าที่ใช้ชื่อหมวดนั้นก็ยังเก็บข้อมูลเดิมได้; รายการที่ไม่มีใน catalog active จะถูกแสดงเป็นหมวดเดิมในแถว

### เปรียบเทียบเดือน

- ปุ่มเปิด/ซ่อนตารางเปรียบเทียบเดือนที่เลือกกับเดือนก่อนหน้า
- แสดงรายได้ ยอดจัดสรร คงเหลือ และยอดแยกตามหมวดของทั้งสองเดือน พร้อมส่วนต่าง
- ถ้ายังไม่บันทึกรายได้จะแสดง “ยังไม่บันทึก” แยกจากรายได้ 0 บาท; ถ้ายอดคงเหลือคำนวณไม่ได้จะแสดงขีด
- หมวดที่ไม่มีในเดือนใดแสดงยอดเป็นศูนย์
- อ่านเฉพาะข้อมูลที่บันทึกแล้ว ไม่รวม draft ที่ยังไม่ได้กดบันทึก
- Query จำกัดตามโปรไฟล์และรองรับปีเปลี่ยนผ่าน ธ.ค. → ม.ค.

### รายงาน

- เลือกรายงานรายไตรมาสหรือรายปีสำหรับโปรไฟล์ที่ active
- รายงานแสดงแต่ละเดือน รายได้ ยอดจัดสรร คงเหลือ และยอดรวมแยกตามหมวด
- เดือนที่ไม่มี record รายได้แสดง “ยังไม่บันทึก” และไม่ถือเป็นรายได้ศูนย์เมื่อคำนวณคงเหลือรายเดือน
- หากมีเดือนที่ไม่มีรายได้ จะมีคำเตือนว่าผลรวมคำนวณจากรายได้ที่บันทึกไว้เท่านั้น
- ปุ่ม **พิมพ์ / บันทึก PDF** ใช้ `window.print()` และ CSS สำหรับพิมพ์ A4 ให้ผู้ใช้เลือก Save as PDF ใน Chrome

### สำรองและกู้คืน

- ส่งออกข้อมูลทุกโปรไฟล์ แผนรายได้ allocations หมวด และ active profile เป็น JSON ชื่อไฟล์ `buddy-backup-YYYY-MM-DD.json`
- นำเข้าไฟล์แทนที่ข้อมูลทั้งหมดใน IndexedDB หลัง confirm ผู้ใช้
- จำกัดไฟล์นำเข้าไม่เกิน 10 MiB (10 MB ตามข้อความใน UI) ตรวจรูปแบบ รุ่น schema, ค่าเงิน, เดือน, timestamps, key ซ้ำ และ reference โปรไฟล์ก่อน restore
- Restore ทำใน IndexedDB transaction; ถ้าการตรวจ validation ล้มเหลว ข้อมูลเดิมไม่ถูกแทนที่
- รูปแบบ backup ปัจจุบันคือ version 2; รับ version 1 ด้วย โดย derive หมวด active จากชื่อ allocations ที่บันทึกไว้ แล้วคืนเป็น version 2 ภายในแอป
- ไฟล์สำรองเป็น JSON อ่านได้ ไม่มี encryption และรวมทุกโปรไฟล์ ผู้ใช้ต้องเก็บไฟล์ให้ปลอดภัย

### ธีม

- สลับโหมดสว่าง/มืดด้วยปุ่มบนหน้าโปรไฟล์
- จำค่าที่เลือกใน `localStorage` key `buddy-theme`; ค่าเริ่มต้นคือ light
- สีหลักใช้ CSS custom properties ใน `src/styles/tokens.css`; ธีม dark ใช้ `:root[data-theme="dark"]`
- หาก localStorage เขียนไม่ได้ ธีมยังเปลี่ยนได้ใน session ปัจจุบัน แต่ UI แจ้งว่าไม่สามารถจำค่าได้

### PWA และออฟไลน์

- `vite-plugin-pwa` สร้าง manifest และ service worker สำหรับไฟล์ที่ build แล้ว
- แคช asset ที่กำหนดและใช้ `index.html` เป็น navigation fallback
- แจ้งเมื่อพร้อมใช้งานออฟไลน์ และแจ้งเมื่อมี service worker เวอร์ชันใหม่; ผู้ใช้ต้องกดอัปเดตเองเพื่อไม่ reload ขณะมีข้อมูลที่ยังไม่บันทึก
- ปุ่มติดตั้งจะแสดงเฉพาะเมื่อ browser ส่ง `beforeinstallprompt` มาให้
- ต้องเปิดผ่าน HTTPS หรือ localhost เพื่อใช้ PWA/service worker ได้; `start-buddy.bat` ใช้ Vite บน localhost สำหรับเครื่อง Windows ไม่ใช่ตัวติดตั้ง PWA
- การเปิดครั้งแรกของเว็บที่เผยแพร่ต้องโหลด asset ออนไลน์ก่อน; หลัง precache แล้ว app shell ใช้งานออฟไลน์ได้

## 3. Tech stack, libraries และเวอร์ชัน

เลขเวอร์ชันต่อไปนี้ตรวจจาก `package.json` และบันทึกใน `PROGRESS.md` ณ 2026-10-25; เป็นเวอร์ชันที่ pin ใน manifest ไม่ใช่คำยืนยันว่าเป็นรุ่นล่าสุดในปัจจุบัน

| แพ็กเกจ | เวอร์ชัน | การใช้งาน |
| --- | --- | --- |
| React | 19.3.1 | UI |
| React DOM | 19.3.1 | render React ลง DOM |
| Dexie | 4.4.7 | IndexedDB และ transaction |
| Vite | 8.3.5 | development server และ build |
| `@vitejs/plugin-react` | 6.1.2 | React integration สำหรับ Vite |
| TypeScript | 7.0.2 | type checking และ compile-time checks |
| Vitest | 5.0.5 | test runner |
| `fake-indexeddb` | 6.2.6 | IndexedDB จำลองสำหรับ tests |
| `vite-plugin-pwa` | 2.0.0 | PWA manifest, service worker และ offline assets |
| `@types/react` | 19.3.0 | React type definitions |
| `@types/react-dom` | 19.3.0 | React DOM type definitions |

ใช้ Node.js `22.12+` หรือ `24+` ตาม README/PROGRESS เพื่อรองรับ Vite/Vitest ที่ใช้ในโปรเจกต์ npm มากับ Node.js ไม่มี backend framework หรือ API client เพิ่มเติม

## 4. โครงสร้างไฟล์และหน้าที่

### ไฟล์ระดับราก

| Path | หน้าที่ |
| --- | --- |
| `package.json` | scripts และ dependency versions ที่ pin |
| `package-lock.json` | lockfile สำหรับ npm install ที่ทำซ้ำได้ |
| `index.html` | HTML host, ภาษาไทย, metadata, root element |
| `vite.config.ts` | React plugin, PWA manifest, precache และ navigation fallback |
| `tsconfig.json` | TypeScript strict configuration และ source inclusion |
| `.env.example` | ระบุว่าแอปปัจจุบันไม่ต้องใช้ environment variables |
| `.gitignore` | กัน dependency, build output, env และ coverage ไม่ให้เข้า source control |
| `start-buddy.bat` | Windows launcher: เข้าโฟลเดอร์, ตรวจ npm, ติดตั้ง dependencies ครั้งแรก และรัน Vite |
| `README.md` | คู่มือผู้ใช้ภาษาไทยและคำสั่งผู้พัฒนา |
| `PROGRESS.md` | Flow ที่ยืนยัน, tech decisions และ step log |
| `HANDOFF.md` | เอกสารส่งต่องานฉบับนี้ |
| `Future Plan of 2026 (2).xlsx` | ไฟล์ตัวอย่างจากผู้ใช้ ไม่ใช่ requirement หรือ reference ที่ต้องยึด |
| `public/buddy-icon.svg` | ไอคอน PWA |

`node_modules/` และ `dist/` เป็น dependency/build output ไม่ใช่ source หลัก; `dist/` สร้างจาก `npm run build` และถูก ignore

### ซอร์สและการทดสอบ

| Path | หน้าที่ |
| --- | --- |
| `src/main.tsx` | entry point, import styles, สร้าง React root และเปิด StrictMode |
| `src/App.tsx` | ประกอบ PWA status และ `ProfileManager` |
| `src/vite-env.d.ts` | Vite/PWA client type declarations |
| `src/data/buddyDatabase.ts` | IndexedDB record types, Dexie tables, schema version 1–3 และ migration ไป shared categories |
| `src/data/buddyDatabase.test.ts` | ทดสอบย้าย schema v2 โดยสร้าง catalog จาก allocations เดิม |
| `src/domain/money.ts` | parse/format THB, แปลง satang, reconciliation totals, default budget month |
| `src/domain/money.test.ts` | ทดสอบการแปลงเงิน ขอบเขต input ยอดคงเหลือ และเดือนเริ่มต้น |
| `src/domain/monthComparison.ts` | pure logic สำหรับสรุป/เปรียบเทียบเดือนและหมวด |
| `src/domain/monthComparison.test.ts` | ทดสอบส่วนต่างหมวดและ missing income vs zero |
| `src/domain/report.ts` | สร้าง period รายไตรมาส/ปี ชุดเดือน และรวมผลรายงาน |
| `src/domain/report.test.ts` | ทดสอบ period, aggregation, missing income และยอดติดลบ |
| `src/features/profiles/profileRepository.ts` | CRUD โปรไฟล์และเก็บ active profile |
| `src/features/profiles/profileRepository.test.ts` | ทดสอบชื่อซ้ำ validation, CRUD และ active profile |
| `src/features/profiles/ProfileManager.tsx` | UI โปรไฟล์, หน้านำทาง, ธีม, backup, install, จัดสรร และรายงาน |
| `src/features/allocations/allocationRepository.ts` | CRUD รายได้/allocations, เดือนก่อน, comparison query และ validation |
| `src/features/allocations/allocationRepository.test.ts` | ทดสอบ isolation, validation, copy previous month, rollover และ comparison |
| `src/features/allocations/categoryRepository.ts` | CRUD catalog หมวด, normalize ชื่อ, rename future/historical และซ่อน/แสดง |
| `src/features/allocations/categoryRepository.test.ts` | ทดสอบ category duplicate, visibility, rename modes และ conflict |
| `src/features/allocations/CategorySettings.tsx` | UI หน้าแยกสำหรับจัดการหมวด |
| `src/features/allocations/AllocationPlanner.tsx` | UI เลือกเดือน รายได้ reconciliation, comparison, allocation table และเพิ่มรายการ |
| `src/features/allocations/AllocationRow.tsx` | แถวแก้ไขหมวด/จำนวนเงิน บันทึกและลบ |
| `src/features/allocations/useAllocationPlanner.ts` | state และ event handlers สำหรับ planner, parse drafts และเรียก repository |
| `src/features/allocations/MonthlyComparison.tsx` | โหลดและแสดงตารางเปรียบเทียบ |
| `src/features/backup/backupRepository.ts` | backup schema, validate, migrate v1, export/restore transaction |
| `src/features/backup/backupRepository.test.ts` | ทดสอบ export/restore, validation และ v1 compatibility |
| `src/features/backup/BackupControls.tsx` | UI ดาวน์โหลด/นำเข้า backup และข้อความสถานะ |
| `src/features/reports/reportRepository.ts` | query ข้อมูลของโปรไฟล์/period แล้วส่งให้ report domain |
| `src/features/reports/reportRepository.test.ts` | ทดสอบ report profile/period isolation และ missing income |
| `src/features/reports/ReportViewer.tsx` | เลือกช่วงเวลา แสดงรายงาน และสั่งพิมพ์/PDF |
| `src/features/theme/ThemeToggle.tsx` | ปุ่มสลับ theme และบันทึก preference ใน localStorage |
| `src/features/pwa/InstallAppButton.tsx` | รับ browser install prompt และติดตั้ง PWA |
| `src/features/pwa/PwaStatus.tsx` | แสดง offline-ready และ service worker update prompt |
| `src/styles/tokens.css` | CSS design tokens, light/dark palette, spacing, focus ring และ base rules |
| `src/styles/app.css` | รูปแบบหน้าโปรไฟล์, navigation, settings, controls และ shared UI |
| `src/styles/allocations.css` | planner, reconciliation, category table, comparison และ responsive layout |
| `src/styles/reports.css` | report tables, summary และ print stylesheet |

## 5. Data model และฐานข้อมูล

ฐานข้อมูลใช้ Dexie บน IndexedDB ชื่อ `buddy-budget`; schema ปัจจุบันเป็น version 3 ตารางที่ประกาศใน `src/data/buddyDatabase.ts`:

### `profiles`

```ts
{
  id: string;
  name: string;
  nameKey: string; // trimmed, lower-case key for uniqueness
  createdAt: number;
  updatedAt: number;
}
```

Index: `&id`, `&nameKey`, `createdAt`. `nameKey` unique

### `budgetPlans`

```ts
{
  id: string;
  profileId: string;
  month: string; // YYYY-MM
  incomeSatang: number; // non-negative integer
  updatedAt: number;
}
```

Index: `&id`, `profileId`, `month`, unique compound `[profileId+month]`. มี plan จึงถือว่ารายได้ถูกบันทึกแล้ว แม้ค่าเป็น 0; ไม่มี plan หมายถึงยังไม่บันทึกรายได้

### `allocations`

```ts
{
  id: string;
  profileId: string;
  month: string; // YYYY-MM
  name: string;
  nameKey: string; // trimmed, lower-case
  amountSatang: number; // non-negative integer
  createdAt: number;
  updatedAt: number;
}
```

Index: `&id`, `profileId`, `[profileId+month]`, `nameKey`, unique compound `[profileId+month+nameKey]`. Allocation เก็บชื่อหมวดเป็น snapshot ของเดือนนั้น ไม่ได้อ้าง foreign key ไป catalog; นี่ทำให้เปลี่ยนชื่อในอนาคตโดยไม่แตะประวัติได้

### `categories`

```ts
{
  id: string;
  name: string;
  nameKey: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

Catalog กลางของทุกโปรไฟล์; index `&id`, `&nameKey`; `nameKey` unique รวมทั้งหมวดที่ซ่อนแล้ว หมวดที่ซ่อนจึงต้อง “แสดงกลับ” แทนการสร้างชื่อซ้ำ

### `settings`

```ts
{ key: string; value: string }
```

Index: `&key`. ค่าที่ใช้แน่นอนในโค้ดคือ `activeProfileId`; theme แยกเก็บใน localStorage ไม่ได้เก็บใน Dexie

### Version/migration

- version 1 มี profiles และ settings
- version 2 เพิ่ม budgetPlans และ allocations
- version 3 เพิ่ม categories และ seed รายการ catalog จาก allocation เดิม โดยเลือกชื่อแรกต่อ `nameKey` และ mark เป็น active
- schema upgrade ไม่ rewrite allocations เดิม
- backup format มี version 2; importer รับ version 1 และสร้าง category records จาก allocations ในไฟล์นั้นให้ active ก่อน restore
- Restore สำรองข้อมูลไม่ใช่ merge: เขียนทับข้อมูลทั้งหมดในตารางที่เกี่ยวข้อง

จำนวนเงินทางธุรกิจเก็บเป็น satang แบบจำนวนเต็ม safe integer เพื่อลด floating-point drift; แสดงผลด้วย `Intl.NumberFormat("th-TH", { currency: "THB" })`

## 6. การตัดสินใจด้านการออกแบบที่สำคัญ

- **Offline/local-first:** ลดความจำเป็นต้องดูแล server และเก็บข้อมูลไว้ในอุปกรณ์ตาม use case ส่วนตัว/ครอบครัว; แลกกับไม่มี sync และไม่มีการป้องกันผู้ใช้อุปกรณ์คนอื่น
- **Profiles แยกผ่าน `profileId`:** ทุก query ของแผนและ allocation ต้อง scope ด้วยโปรไฟล์ เพื่อไม่ให้ข้อมูลปะปน
- **ใช้ YYYY-MM:** เรียงและ query ช่วงเดือนได้ตรงไปตรงมา; ฟังก์ชันเดือนก่อนจัดการ rollover ปี
- **เงินเป็น satang integer:** parse input เข้มงวดและทำ math โดยไม่ใช้ float
- **แยก domain / repository / UI:** กฎคำนวณอยู่ `domain`, IndexedDB operations อยู่ repository, React component เป็น UI
- **รายได้ missing ต่างจาก 0:** absence ของ plan ไม่เท่ากับบันทึกยอด 0; ให้รายงาน/reconciliation สื่อความหมายถูก
- **หมวดกลางกับชื่อ snapshot:** catalog ใช้ร่วมทุกโปรไฟล์ แต่ allocation เก็บชื่อเอง เพื่อรองรับการเปลี่ยนชื่อใหม่อย่างมีผลย้อนหลังหรือไม่มีก็ได้
- **ซ่อนแทนลบหมวด:** รักษาการอ้างถึง/ประวัติเดิม ไม่ทำลายข้อมูล
- **Backup แบบเต็ม JSON:** ผู้ใช้เป็นผู้ควบคุมการสำรองเอง; UI ยืนยันก่อนเขียนทับและ validate ก่อน transaction
- **PWA update แบบ prompt:** หลีกเลี่ยง reload โดยไม่ตั้งใจระหว่างแก้ input
- **พื้นฐาน accessibility:** ใช้ label, aria label/status, keyboard focus visible และ table scroll region ที่เข้าถึงได้
- **Responsive layout:** ใช้ CSS grid/flex และให้ตารางกว้าง scroll ภายใน region แทนการเพิ่ม horizontal overflow ทั้งหน้า
- **Design tokens:** พาเลต light/dark, spacing และ radius รวมศูนย์ใน CSS variables
- **ไม่มี env secrets:** แอปไม่มี API/backend; `.env.example` มีไว้ระบุว่ายังไม่ต้องกำหนดตัวแปร

## 7. วิธีติดตั้ง รัน และ build

### สำหรับ Windows ที่ใช้แอป

1. ติดตั้ง Node.js `22.12+` หรือ `24+` (npm มาพร้อม Node.js)
2. ดับเบิลคลิก `start-buddy.bat`
3. ครั้งแรก launcher เรียก `npm install`; ต้องมีอินเทอร์เน็ตเพื่อดาวน์โหลด dependency
4. ปล่อยหน้าต่าง terminal ไว้ และใช้งาน URL localhost ที่ Vite เปิดให้
5. ปิด terminal เพื่อหยุด dev server

ไม่ควรดับเบิลคลิก `index.html` เพราะแอปต้องถูกเสิร์ฟผ่าน Vite ไม่ใช่ `file://`.

### สำหรับผู้พัฒนา

จาก root ของโปรเจกต์:

```sh
npm install
npm run dev
```

คำสั่ง:

```sh
npm test       # Vitest unit/repository tests
npm run build  # tsc --noEmit แล้ว Vite production build ลง dist/
npm run preview
```

`npm run build` ตรวจ TypeScript strict options ก่อนสร้างไฟล์ production. `npm run preview` ใช้ตรวจ build ในเครื่อง; service worker/offline behavior ควรตรวจจาก build/preview ไม่ใช่สมมติจาก dev server. สำหรับ PowerShell บางเครื่องที่ execution policy ปิด `npm.ps1`, ใช้ `npm.cmd` เช่น `npm.cmd test` ได้

### PWA/offline และ environment

- การใช้งานจาก domain ที่เผยแพร่ต้องใช้ HTTPS เพื่อ PWA; localhost เป็น secure context สำหรับการพัฒนา
- เปิดเว็บที่ build แล้วออนไลน์อย่างน้อยหนึ่งครั้งจนเห็นข้อความพร้อมใช้งานออฟไลน์ จากนั้นทดสอบ DevTools Offline และ reload
- ไม่มี environment variable ที่ต้องตั้งค่าในปัจจุบัน; ไม่มี server/API validation ที่ต้องทำ
- ก่อนปล่อยเวอร์ชันใหม่ให้ตรวจ `npm outdated`, อัปเดตเฉพาะแพ็กเกจที่ต้องการ แล้วรัน build และ tests
- เผยแพร่เนื้อหาใน `dist/` ผ่าน static web hosting; วิธี/ผู้ให้บริการ hosting ยังไม่ได้กำหนดใน repo

## 8. ส่วนที่ยังไม่เสร็จ บั๊กที่รู้ และงานต่อ

ข้อมูลด้านล่างตั้งใจจำกัดอยู่ที่สิ่งที่ระบุในโค้ด เอกสาร และ log ที่มี ไม่ใช่การคาดเดา:

### รายการตรวจที่ยังค้างตาม `PROGRESS.md`

- ติดตั้ง PWA จาก Chrome บนอุปกรณ์จริง/ปลายทางยังเป็นการตรวจที่แนะนำให้ทำ
- ตรวจตัวอย่าง PDF บนอุปกรณ์จริงหรือ printer/Chrome environment เป้าหมายยังเป็นการตรวจที่แนะนำ
- การปล่อยแอปผ่าน HTTPS hosting จริงยังไม่มี provider หรือ deployment workflow ระบุไว้

### ปัญหาที่สังเกตพบ

- ระหว่างตรวจใน Chrome มี request `GET /favicon.ico` ตอบ 404; หน้าใช้ไอคอน PWA `public/buddy-icon.svg` อยู่แล้ว แต่ไม่มีการยืนยันว่า favicon จำเป็นต่อการใช้งาน ฟังก์ชันหลักทำงานได้แม้ request นี้ล้มเหลว
- ไม่พบ issue ที่มีการบันทึกว่าเป็น bug ที่ทำให้ฟีเจอร์หลักใช้งานไม่ได้ใน `PROGRESS.md`; ประโยคนี้หมายถึงไม่มีรายการดังกล่าวใน log ไม่ใช่การรับรองว่าไม่มีบั๊กอื่น

### การตรวจล่าสุดที่มีบันทึก

- หลังเพิ่มหน้า category settings: `npm.cmd run build` ผ่าน และ `npm.cmd test` ผ่าน 9 ไฟล์ / 45 tests ตาม `PROGRESS.md`
- Chrome เคยตรวจการเปิดหน้า settings, เพิ่มหมวด, เลือกหมวดจาก dropdown และตรวจ horizontal overflow ที่ viewport แคบ; profile/category ทดสอบชั่วคราวถูกลบแล้ว
- tests ครอบคลุม money validation/totals, profile validation/isolation, allocations/copy/rollover/comparison, category create/rename/hide/conflict, IndexedDB v2→v3 migration, backup v1/v2, report periods/aggregation
- การตรวจผลข้างต้นมาจาก log ก่อนเอกสารฉบับนี้; ไม่มีการรัน tests ใหม่เพื่อแก้เอกสารนี้

### งานที่ยังไม่ได้ตกลง

- ไม่มี feature ถัดไปที่ผู้ใช้ระบุไว้ในเอกสารปัจจุบัน; อย่าเพิ่ม feature ใหม่โดยเดา scope
- การเพิ่ม favicon เพื่อกำจัด 404, เปลี่ยน routing ให้ใช้ URL, cloud sync, authentication, encryption หรือ deployment automation ยังไม่ใช่ requirement ที่บันทึกไว้

## แนวทางให้ AI/ผู้พัฒนาคนถัดไปเริ่มงาน

1. อ่าน `HANDOFF.md` นี้, `PROGRESS.md` และ `README.md` ก่อน
2. ตรวจโค้ดจริงก่อนแก้ โดยเฉพาะ repository/schema และ tests ของฟีเจอร์ที่เกี่ยวข้อง
3. รักษาข้อมูล IndexedDB เดิมและเพิ่ม migration แบบ version ใหม่เมื่อเปลี่ยน schema; ห้ามลบหรือ reset ฐานข้อมูลผู้ใช้เพื่อแก้ migration โดยไม่มีการอนุมัติ
4. คำนวณเงินเป็น satang integer, คงการแยก `profileId`, และแยก missing data จาก zero
5. เพิ่มหรือปรับ tests ที่ครอบคลุม behavior ที่เปลี่ยน แล้วรัน `npm test` และ `npm run build`
6. อัปเดต README/PROGRESS เมื่อเพิ่มหรือเปลี่ยน behavior ที่ผู้ใช้ต้องรู้
7. ห้ามถือว่าไฟล์ spreadsheet เป็น requirement; ใช้เฉพาะเมื่อผู้ใช้ระบุให้ยึดส่วนใดเป็นพิเศษ
