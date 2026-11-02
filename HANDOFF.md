# Buddy — Save Point #5 (ย้อนพฤติกรรมก่อน multi-level sort)

> **อัปเดต 2026-11-02:** โค้ดอยู่ใน GitHub repo `Buddy-project` แล้ว deploy ขึ้น GitHub Pages ผ่าน `.github/workflows/deploy-pages.yml` (รัน `npm test` ก่อน build ด้วย `--base=/<ชื่อ repo>/`) แก้รายงานไม่อัปเดต, ลำดับรายการที่สร้างในมิลลิวินาทีเดียวกัน, ความกว้างตารางงบ และป้ายปุ่มลบ/บันทึกในแถว รายละเอียดอยู่ใน `PROGRESS.md`

**วันที่บันทึก:** 2026-11-01  
**โปรเจกต์:** Buddy — ระบบจัดสรรรายได้เป็นงบประมาณ  
**สถานะ workspace:** โฟลเดอร์ `C:\Users\User\Downloads\New` ไม่มี Git repository ตามข้อมูล workspace; ไม่มี branch, commit หรือ diff ให้ตรวจ

เอกสารนี้เป็น Save Point ลำดับที่ 5 สถานะอ้างอิงจากไฟล์และผลตรวจล่าสุด ณ วันที่ด้านบน การย้อนครั้งนี้เป็นการปรับโค้ดปัจจุบันให้มีพฤติกรรมก่อนเพิ่ม multi-level sort ไม่ใช่การกู้คืน snapshot #1 แบบตรงตัว เพราะไม่มี Git history หรือสำเนาซอร์สของ snapshot นั้น

## 1. ชื่อโปรเจกต์ วันที่บันทึก และหมายเลข Save

- **ชื่อ:** Buddy — ระบบจัดสรรรายได้เป็นงบประมาณ
- **วันที่ Save:** 2026-11-01
- **หมายเลข:** Save Point **#5** (reconstructed rollback)

## 2. เป้าหมาย ผู้ใช้ และขอบเขต

- **เป้าหมาย:** วางแผนแบ่งรายได้ที่ได้รับช่วงสิ้นเดือนเป็นงบประมาณรายหมวดสำหรับเดือนถัดไป ตรวจว่าจัดสรรครบ/เหลือ/เกิน และดูรายงานรายไตรมาสหรือรายปีที่พิมพ์เป็น PDF ได้
- **ผู้ใช้ปลายทาง:** เจ้าของแอปและสมาชิกครอบครัว โดยแยกข้อมูลด้วยโปรไฟล์บนอุปกรณ์เดียวกัน
- **ทำแล้ว/อยู่ใน scope:** เว็บแอปภาษาไทย; โปรไฟล์; รายได้และรายการงบรายเดือน; หมวดกลางที่จัดการในหน้าแยก; คัดลอกหมวดเดือนก่อน; เปรียบเทียบเดือน; reconciliation; รายงาน/พิมพ์ PDF; export/import backup; theme สว่าง/มืด; PWA/offline; เอกสารผู้ใช้และผู้พัฒนา
- **สถานะ sort:** UI การแก้ metadata, preset editor และการจัดเรียงตาม preset ถูกถอดออกจากแอป เพื่อย้อนพฤติกรรมก่อนฟีเจอร์ multi-level sort; คง schema v4, ค่า metadata และ preset ที่มีอยู่ใน IndexedDB/backup ไว้เพื่อความเข้ากันได้ ไม่ลบข้อมูลเดิม
- **ข้อจำกัดการย้อน:** ไม่มี Git/snapshot #1 จึงเป็นการ reconstruct จาก source ปัจจุบัน ไม่รับประกันว่า source ทุกไฟล์เหมือนเวอร์ชันก่อนเพิ่ม sort
- **ขอบเขต UI มือถือ (ยืนยันโดยผู้ใช้ 2026-10-30):** ไม่ต้องทำหรือขยาย UI เฉพาะมือถือ งาน responsive/mobile ที่มีอยู่ถือเป็นงานเดิมและเก็บไว้ ไม่ใช่เป้าหมายของงานถัดไป เว้นแต่ผู้ใช้สั่งใหม่ บันทึกผลตรวจ viewport 375 px ไว้เป็นข้อมูล QA ประวัติเท่านั้น ไม่ต้องตรวจ 320 px หรืออุปกรณ์มือถือจริงเป็นเงื่อนไขก่อนทำงานต่อใน scope ปัจจุบัน
- **ไม่ทำตามการตัดสินใจปัจจุบัน:** backend/API, login/password, profile lock, cloud sync, encryption, server-side validation, automatic cloud backup หรือ deployment provider ที่เลือกไว้แล้ว
- **ข้อกำหนดเพิ่มเติม:** `Future Plan of 2026 (2).xlsx` เป็นตัวอย่างเท่านั้น ไม่ใช่ specification ที่ต้องเลียนแบบ

รายละเอียดพฤติกรรมแต่ละ feature อยู่ในหัวข้อ “ฟีเจอร์และพฤติกรรม” ด้านล่าง

## 3. Flow ที่ยืนยันแล้ว

Flow หลักทั้ง 6 ขั้นเสร็จแล้วตาม log ใน `PROGRESS.md`; ไม่มีขั้นหลักที่กำลังทำอยู่

| ขั้น | ผลลัพธ์ | สถานะ |
|---|---|---|
| 1. สร้าง scaffold, design tokens, README และ progress log | React/TypeScript/Vite scaffold และเอกสารตั้งต้น | **เสร็จ** |
| 2. จัดเก็บโปรไฟล์แบบ offline | IndexedDB profiles, CRUD และ tests | **เสร็จ** |
| 3. ตารางจัดสรรรายได้และ reconciliation | แผนรายเดือน, รายได้, allocations และคำนวณยอด | **เสร็จ** |
| 4. สำรอง/กู้คืนและตรวจข้อมูล | JSON backup, validation, migration และ restore แบบ transaction | **เสร็จ** |
| 5. รายงานรายไตรมาส/ปีและ PDF | รายงานตามโปรไฟล์และพิมพ์ผ่าน Chrome | **เสร็จ** |
| 6. PWA/offline, accessibility, responsive และ handoff | service worker, offline app shell, responsive UI และเอกสาร | **เสร็จ** |
| Follow-up: คัดลอกจากเดือนก่อน | คัดลอกเฉพาะหมวดที่ยังไม่มี ไม่คัดลอกรายได้ | **เสร็จ** |
| Follow-up: เปรียบเทียบเดือน | เปิด/ปิดตารางเทียบกับเดือนก่อน | **เสร็จ** |
| Follow-up: ตั้งค่าหมวดแยกหน้า | catalog กลาง, dropdown, rename/hide/restore | **เสร็จ** |
| Follow-up: สลับธีม | Light/dark และจำค่าบน browser | **เสร็จ** |
| Follow-up: ปรับ Save ของ allocations | เพิ่มรายการบันทึกทันที; ปุ่มบันทึกแถวแสดงเมื่อมี draft; error/success feedback | **เสร็จ** |
| Follow-up: เรียงรายการหลายระดับ | เคย implement และตรวจแล้ว; UI และ runtime sorting ถูกถอดใน Save Point #5; data/schema compatibility ยังอยู่ | **ย้อนออกจาก active UI** |

การติดตั้ง PWA จาก HTTPS จริงและตรวจ PDF บนอุปกรณ์จริงเป็น **การตรวจติดตั้ง/ปลายทางที่ยังไม่ได้ยืนยัน** ไม่ใช่ขั้น implementation ที่กำลังทำอยู่

## 4. มาตรฐานที่ยืนยันแล้ว

- **Design:** สี contrast ดีและสบายตา, ฟอนต์อ่านภาษาไทยง่าย, ระยะห่างสม่ำเสมอ, controls minimal และมุมโค้ง; รวมสี/spacing/radius/focus ring ใน `src/styles/tokens.css`; มี light/dark palette
- **Naming/language:** โค้ด ชื่อตัวแปร ชื่อไฟล์ และ comment ใช้ภาษาอังกฤษ; UI/เอกสารผู้ใช้เป็นภาษาไทย; React component ใช้ PascalCase, hooks ขึ้นต้น `use`, repository/domain แยกตามความรับผิดชอบ
- **โครงสร้าง:** `src/data` สำหรับ IndexedDB/schema, `src/domain` สำหรับกฎคำนวณ, `src/features/<feature>` สำหรับ UI/repository/tests ของแต่ละ feature, `src/styles` สำหรับ CSS; public assets อยู่ `public/`
- **คุณภาพ:** TypeScript strict, unit/repository tests, responsive และ keyboard/label/status accessibility; ทดสอบ input ฝั่ง client เพราะไม่มี API/server; ใช้จำนวนเต็มสตางค์สำหรับเงิน
- **Dependency:** จำนวนน้อยและ pin เวอร์ชันใน `package.json`/`package-lock.json`; ตรวจอัปเดตด้วย `npm outdated` และทดสอบ build/tests หลังเปลี่ยน
- **Tech stack ที่ pin ใน manifest:** React 19.3.1, React DOM 19.3.1, Dexie 4.4.7, Vite 8.3.5, `@vitejs/plugin-react` 6.1.2, TypeScript 7.0.2, Vitest 5.0.5, `fake-indexeddb` 6.2.6, `vite-plugin-pwa` 2.0.0, `@types/react`/`@types/react-dom` 19.3.0
- **Runtime:** Node.js `22.12+` หรือ `24+`; เวอร์ชันเป็นค่าที่ pin/บันทึกในโปรเจกต์ ไม่ใช่การยืนยันว่าเป็นรุ่นล่าสุด ณ วันที่ Save Point

## 5. ไฟล์ทั้งหมดและไฟล์ที่แก้ล่าสุด

รายการไฟล์โปรเจกต์และหน้าที่ของแต่ละไฟล์อยู่ในหัวข้อ “โครงสร้างไฟล์และหน้าที่” ด้านล่าง ไฟล์ที่แก้ล่าสุดสำหรับ rollback ได้แก่:

- `src/features/allocations/AllocationPlanner.tsx`
- `src/features/allocations/AllocationRow.tsx`
- `src/features/allocations/useAllocationPlanner.ts`
- `src/features/allocations/CategorySettings.tsx`
- `src/data/buddyDatabase.test.ts`
- `src/features/allocations/allocationRepository.test.ts`
- `src/features/backup/backupRepository.test.ts`
- `src/styles/app.css`
- `README.md`
- `PROGRESS.md`
- `HANDOFF.md`
- ลบ UI sort ที่ไม่ใช้งาน: `src/features/allocations/AllocationSortSettings.tsx`, `src/features/allocations/AllocationSortRuleEditor.tsx`

คง `src/domain/allocationSort.ts`, `src/features/allocations/allocationSortRepository.ts` และการตรวจ backup ที่เกี่ยวข้องไว้เป็น compatibility support; ไม่มีการเปลี่ยน package/dependency

สำเนาไฟล์ก่อน rollback ถูกเก็บนอก workspace ที่ `C:\Users\User\.copilot\session-state\c842acef-f1a8-4427-9867-48cfc68b818a\files\pre-sort-rollback-backup` เพื่อช่วยกู้ไฟล์หากต้องการ

## 6. การตัดสินใจสำคัญ

- Local-first/IndexedDB เพื่อใช้ได้โดยไม่ต้องดูแล backend; ข้อมูลผูกกับ browser/device จึงไม่มี sync และไม่ได้แยกความปลอดภัยระหว่างผู้ใช้อุปกรณ์เดียวกัน
- ใช้ `profileId` แยกข้อมูลครอบครัว; ทุก query ของแผนและ allocations ต้อง scope ด้วยโปรไฟล์
- เก็บเดือนเป็น `YYYY-MM`; เงินเป็น integer satang เพื่อหลีกเลี่ยง floating-point error
- รายได้ที่ยังไม่มี plan ต้องแยกจาก plan ที่บันทึกเป็นศูนย์ เพื่อให้ reconciliation/report ตรงความหมาย
- แยก domain logic, repository และ UI เพื่อทดสอบ/แก้แต่ละส่วนได้
- หมวดเป็น catalog กลาง แต่ allocation เก็บชื่อ snapshot ต่อเดือน; hide แทน delete เพื่อรักษาประวัติ
- การเพิ่ม allocation บันทึกทันทีเมื่อ submit; การแก้แถวเป็น manual save โดยแสดงปุ่มเฉพาะเมื่อมีการเปลี่ยนแปลง
- backup import แทนที่ข้อมูลในเครื่องทั้งหมดหลัง validation/confirmation; ไม่ใช่ merge
- PWA update ให้ผู้ใช้กดยืนยันเองเพื่อไม่ reload ขณะมี input ที่ยังไม่บันทึก
- ข้อมูล metadata (`number`, `type`, `subnumber`, `itemType`) และ sort preferences ที่สร้างในรุ่นก่อนยังเก็บไว้ใน IndexedDB; UI ปัจจุบันไม่แสดงหรือใช้ข้อมูลเหล่านี้เพื่อเรียงตาราง
- schema ยังคงเป็น v4 และ backup format ยังคงเป็น v3 เพื่อเปิดฐานข้อมูล/restore ไฟล์สำรองจากรุ่นก่อนโดยไม่ทิ้ง metadata หรือ preset

รายละเอียด schema, migration และเหตุผลเพิ่มเติมอยู่ในหัวข้อด้านล่าง

## 7. สิ่งที่ทดสอบแล้วและยังไม่ได้ทดสอบ

### ผลเดิมก่อน rollback

- ก่อน rollback `npm.cmd run build` ผ่าน และ `npm.cmd test` ผ่าน 11 ไฟล์ / 53 tests; manual Chrome เคยตรวจ sort UI และ backup v3 ตามบันทึกด้านล่าง ผลเหล่านี้ยืนยันสถานะก่อนถอด UI เท่านั้น

### รันจริง/ตรวจจริงหลัง rollback

- `npm.cmd run build` **ผ่าน** (TypeScript และ Vite production build)
- `npm.cmd test` **ผ่าน 11 ไฟล์ / 55 tests**
- เพิ่ม repository test ยืนยันว่าการแก้หมวด/ยอดเงินโดยไม่มี metadata input และการคัดลอกเดือนยังคง metadata เดิม
- เพิ่ม backup test ยืนยันว่า metadata และ custom sort preferences ยัง export/restore กลับมาเหมือนเดิม
- เพิ่ม database test ยืนยันการเปิด schema v4 ซ้ำไม่ลบ metadata หรือ preset ที่เก็บไว้
- ตรวจ source ยืนยันว่า CategorySettings และ planner ไม่ import/mount sort UI หรือเรียก comparator/preset sorting แล้ว

### ยังไม่ได้รัน/ยังไม่ยืนยันใน Save Point นี้

- Manual browser check หลัง rollback ยังไม่ทำ
- ยังไม่ได้ทดสอบการ import backup v1/v2 ผ่าน UI; unit tests ครอบคลุม compatibility แล้ว
- ยังไม่มีการยืนยัน install PWA บน HTTPS deployment/อุปกรณ์จริง และการตรวจ PDF บนอุปกรณ์จริง
- ไม่มี provider หรือ workflow สำหรับ production hosting ที่ผู้ใช้เลือกไว้

## 8. ปัญหาค้าง สมมติฐาน และคำถามที่ยังไม่ได้ตอบ

- **ตรวจแล้ว (2026-11-02):** ข้อความไทยใน `index.html` และ manifest ใน `vite.config.ts` เป็น UTF-8 ถูกต้อง title และ manifest หลัง build แสดงผลปกติ
- **ปัญหาที่เคยพบ:** Chrome เคยร้องขอ `/favicon.ico` แล้วได้ 404 ตาม log เก่า; ยังไม่ยืนยันว่าแก้แล้วหรือยัง และไม่กระทบ flow หลักที่บันทึกไว้
- **แก้แล้ว (2026-11-02):** รายงานไม่อัปเดตหลังบันทึก/restore — รายงานใช้ Dexie `liveQuery` แล้ว อัปเดตทันทีโดยไม่ต้อง reload
- **งานตรวจปลายทาง:** ทดสอบติดตั้ง PWA และ PDF บนอุปกรณ์/Chrome เป้าหมายจริงยังค้าง
- **สมมติฐาน:** ข้อมูลอยู่ local ใน browser; ไม่มี authentication/encryption/cloud sync เป็นการตัดสินใจที่มีอยู่ ไม่ใช่ข้อเสนอเพิ่ม
- **คำถามเปิดจากผู้ใช้:** ไม่พบคำถามที่รอคำตอบในไฟล์/ประวัติที่ตรวจ; ไม่ได้ตีความว่าผู้ใช้อนุมัติ scope ใหม่
- **Git:** workspace ระบุว่าไม่มี Git repository; branch/commit history จึง **ไม่ทราบ/ไม่มีให้ตรวจ** ในสภาพแวดล้อมนี้

## 9. ขั้นถัดไปที่แนะนำ และไฟล์ที่ต้องแนบ

1. หากต้องการย้อนตรงไปยัง source #1 แบบเดิม ให้หา Git commit หรือ ZIP สำรองของช่วงนั้นก่อน; Save Point #5 นี้เป็น reconstruction ก่อน sort ไม่ใช่ byte-identical.
2. ตรวจ/ตัดสินใจว่าจะทำงานแยกเพื่อแก้ refresh ของรายงานหลัง save/restore หรือไม่
3. ตรวจ metadata ภาษาไทยที่อาจเสียหายใน `index.html` และ `vite.config.ts` ก่อน production release; ยังไม่ได้แก้ในงานนี้
4. ถ้ามีปลายทาง HTTPS ให้ตรวจ PWA install และ PDF ตามความจำเป็น; provider ยังไม่ถูกกำหนด จึงอย่าตั้งค่า deployment โดยเดา

ไฟล์ที่เกี่ยวข้องกับงาน metadata คือ `index.html` และ `vite.config.ts`; หากเริ่มจาก Save Point ให้แนบ `HANDOFF.md` และไฟล์เหล่านี้ รวมทั้ง `package.json`, `package-lock.json` สำหรับ build/test

**แนะนำให้แนบทั้งโฟลเดอร์โปรเจกต์เป็น ZIP** โดยรวม `HANDOFF.md`, `PROGRESS.md`, `README.md`, `src/`, `public/`, `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json`, `.env.example`, `.gitignore` และ `start-buddy.bat`; ไม่ต้องแนบ `node_modules/` หรือ `dist/` เพราะสร้างใหม่ได้จาก lockfile/build

`Future Plan of 2026 (2).xlsx` เป็นไฟล์ตัวอย่างและไม่จำเป็นต่อการทำงานต่อ เว้นแต่ agent ต้องตรวจข้อมูลตัวอย่างที่ผู้ใช้ให้มา ห้ามถือเป็นข้อกำหนดโดยอัตโนมัติ

หากแนบเฉพาะไฟล์แทน ZIP ต้องแนบ `HANDOFF.md`, `PROGRESS.md`, `README.md`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.env.example`, `.gitignore`, `start-buddy.bat`, `public/buddy-icon.svg` และ **ไฟล์ทั้งหมดใน `src/`** เพื่อให้ agent ตรวจ/แก้และทดสอบได้ครบ ไม่ควรส่ง `HANDOFF.md` เพียงไฟล์เดียวเมื่อต้องแก้โค้ด

## 10. ข้อความสั้นสำหรับเปิดแชตใหม่

> ทำงานต่อจาก Save Point #5 ใน `HANDOFF.md` ซึ่งเป็นการ reconstruct พฤติกรรมก่อน multi-level sort ไม่ใช่ source snapshot #1; โปรดอ่าน `HANDOFF.md`, `PROGRESS.md` และ `README.md` ก่อน คง IndexedDB schema v4 และ backup v3 compatibility ไว้เพราะต้องรักษา metadata/preset เดิม แต่ไม่เพิ่ม UI หรือการเรียงหลายระดับกลับมา เว้นแต่ผู้ใช้สั่งใหม่

## ภาคผนวก: รายละเอียดอ้างอิงของโปรเจกต์

ส่วนถัดไปเก็บรายละเอียด feature, dependencies, file map, data model, การออกแบบ, วิธีรัน และรายการค้างแบบขยาย เพื่อให้ Save Point ใช้ส่งต่องานได้ครบ

เอกสารนี้สรุปสถานะและข้อเท็จจริงจากโค้ดกับเอกสารในโปรเจกต์ เพื่อให้ผู้พัฒนาหรือ AI ตัวถัดไปทำงานต่อได้โดยไม่ต้องอาศัยบริบทจากแชตก่อนหน้า หากข้อมูลส่วนใดระบุว่า “ยังไม่ยืนยัน” ให้ตรวจโค้ดหรือถามเจ้าของโปรเจกต์ก่อนเปลี่ยนพฤติกรรมนั้น

## ภาคผนวก A. โปรแกรมนี้ทำอะไร

Buddy เป็นเว็บแอปภาษาไทยสำหรับวางแผนแบ่งรายได้เป็นงบประมาณรายเดือน ใช้กับตัวเองและสมาชิกในครอบครัวโดยแยกข้อมูลตามโปรไฟล์ ผู้ใช้บันทึกรายได้ที่จะใช้ในเดือนงบประมาณ เพิ่มยอดตามหมวด และดูยอดรวม/เงินเหลือเพื่อเช็กว่าจัดสรรครบหรือเกินรายได้

ปัญหาที่โปรแกรมแก้คือการจัดงบรายเดือนด้วยตนเองและตรวจความครบถ้วนของการแบ่งเงิน โดยทำให้รายการแก้ไขได้ในเบราว์เซอร์ มีรายงานตามไตรมาสหรือปี และสำรอง/กู้คืนข้อมูลผ่านไฟล์ ทั้งหมดทำงานในอุปกรณ์โดยไม่ต้องมีบัญชีหรือบริการ backend

**ขอบเขตสำคัญ**

- เงินรายได้ที่กรอกเป็นเงินสำหรับเดือนงบประมาณที่เลือก ซึ่งโดยปกติได้รับมาตอนสิ้นเดือนก่อนหน้า
- UI ที่มีอยู่เป็นของเดิม; ผู้ใช้ยืนยันว่าไม่ต้องสร้างหรือขยาย UI เฉพาะมือถือ เว้นแต่สั่งใหม่
- โปรไฟล์เป็นเพียงการแยกข้อมูลใน UI ไม่ใช่การล็อกสิทธิ์ ผู้ใช้เบราว์เซอร์เดียวกันเปิดดูโปรไฟล์อื่นได้
- ไม่มี server/API, login, password, cloud sync หรือการเข้ารหัสข้อมูล
- ข้อมูลใน IndexedDB อยู่ใน browser profile ของอุปกรณ์นั้น การติดตั้ง PWA ไม่ได้ย้ายหรือ sync ข้อมูลข้ามอุปกรณ์
- `Future Plan of 2026 (2).xlsx` เป็นวัสดุตัวอย่างเท่านั้น ไม่ใช่ข้อกำหนด UI หรือ schema ที่ต้องทำตาม

## ภาคผนวก B. ฟีเจอร์และพฤติกรรม

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
- เพิ่มรายการโดยเลือกชื่อหมวดจาก dropdown ที่มาจาก catalog active และกรอกยอดเงิน เมื่อกดเพิ่มรายการ ระบบบันทึกลง IndexedDB ทันที
- แก้ชื่อหมวดผ่าน dropdown หรือแก้จำนวนเงินในแต่ละแถวได้ ปุ่มบันทึกจะแสดงเฉพาะแถวที่มีการเปลี่ยนแปลงที่ยังไม่บันทึก และการแก้จะ persist เมื่อกดปุ่มนั้น
- ยอดเงินที่ผิดรูปแบบหรือชื่อหมวดซ้ำจะแสดงข้อความ error และไม่บันทึก; เมื่อบันทึกเพิ่มหรือแก้ไขสำเร็จจะแสดง “บันทึกแล้ว”
- ลบ allocation มี confirm dialog
- ชื่อหมวดในหนึ่งโปรไฟล์และเดือนต้องไม่ซ้ำกันแบบ case-insensitive ผ่าน unique compound index
- สรุปยอดคำนวณรายได้ ลบยอด allocations แสดงสถานะจัดสรรครบ เหลือ หรือเกินรายได้
- แต่ละแถวแสดงหมวด จำนวนเงิน และปุ่มจัดการ; ข้อมูล metadata จากรุ่นก่อนเก็บไว้ใน IndexedDB แต่ไม่แสดงหรือแก้ไขใน UI ปัจจุบัน
- ปุ่ม **บันทึก** แสดงเมื่อค่าหมวดหรือยอดเงินของแถวนั้นเปลี่ยนจากค่าที่บันทึกไว้; การเรียงตารางใช้ลำดับจากข้อมูลเดิม (`createdAt`) ไม่ใช้ preset
- เปลี่ยนเดือนแล้วข้อมูลโหลดใหม่

### ข้อมูล sort จากรุ่นก่อน

- UI สำหรับ metadata, multi-level sort และ preset ถูกถอดออกใน Save Point #5
- schema v4, ค่า metadata และ preset ที่บันทึกไว้ยังคงอยู่ใน IndexedDB; planner ไม่อ่าน preset และการแก้หมวด/ยอดเงินไม่เขียนทับ metadata เดิม
- backup format v3 ยังเก็บและคืน metadata/sort preferences เพื่อไม่ให้ข้อมูลจาก backup รุ่นก่อนสูญหาย

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
- รูปแบบ backup ปัจจุบันคือ version 3; รับ version 1 และ 2 ด้วย โดย derive หมวดจาก allocations สำหรับ v1, เติม metadata ว่าง และเพิ่ม default sort preferences สำหรับ legacy backups
- v3 ต้องมี categories, metadata ของทุก allocation และ sort preferences ที่ผ่าน validation; export/restore รวม preset และ default preset
- metadata และ preset ยังคงอยู่เพื่อ compatibility แม้ UI ไม่เปิดให้แก้หรือจัดเรียงตาม preset แล้ว
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

## ภาคผนวก C. Tech stack, libraries และเวอร์ชัน

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

## ภาคผนวก D. โครงสร้างไฟล์และหน้าที่

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
| `src/data/buddyDatabase.ts` | IndexedDB record types, Dexie tables, schema version 1–4 และ migrations ของ categories/metadata |
| `src/data/buddyDatabase.test.ts` | ทดสอบย้าย schema v2, seed หมวด และเติม metadata ว่าง |
| `src/domain/money.ts` | parse/format THB, แปลง satang, reconciliation totals, default budget month |
| `src/domain/money.test.ts` | ทดสอบการแปลงเงิน ขอบเขต input ยอดคงเหลือ และเดือนเริ่มต้น |
| `src/domain/monthComparison.ts` | pure logic สำหรับสรุป/เปรียบเทียบเดือนและหมวด |
| `src/domain/monthComparison.test.ts` | ทดสอบส่วนต่างหมวดและ missing income vs zero |
| `src/domain/allocationSort.ts` | sort types, validation และ comparator ที่เก็บไว้เป็น compatibility helper; planner ปัจจุบันไม่เรียกใช้ |
| `src/domain/allocationSort.test.ts` | tests สำหรับ compatibility helper ของ sort |
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
| `src/features/allocations/allocationSortRepository.ts` | เก็บ/validate sort preferences สำหรับ backup/database compatibility; ไม่มีหน้าจอเรียก CRUD นี้ |
| `src/features/allocations/allocationSortRepository.test.ts` | ทดสอบ CRUD, default selection, duplicate rules/names และการกันลบ preset สุดท้าย |
| `src/features/allocations/AllocationPlanner.tsx` | UI เลือกเดือน รายได้ reconciliation, comparison, category table และเพิ่มรายการ |
| `src/features/allocations/AllocationRow.tsx` | แถวแก้ไขหมวด/จำนวนเงิน แสดงปุ่มบันทึกเมื่อ dirty และลบ; ไม่แสดง metadata |
| `src/features/allocations/useAllocationPlanner.ts` | state/event handlers ของ planner และ validation; โหลดตาม createdAt โดยไม่เรียก sort preset |
| `src/features/allocations/MonthlyComparison.tsx` | โหลดและแสดงตารางเปรียบเทียบ |
| `src/features/backup/backupRepository.ts` | backup schema v3, validate, migrate v1/v2, export/restore transaction |
| `src/features/backup/backupRepository.test.ts` | ทดสอบ export/restore รวมการรักษา metadata/preset เก่า, validation และ legacy compatibility |
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

## ภาคผนวก E. Data model และฐานข้อมูล

ฐานข้อมูลใช้ Dexie บน IndexedDB ชื่อ `buddy-budget`; schema ปัจจุบันเป็น version 4 ตารางที่ประกาศใน `src/data/buddyDatabase.ts`:

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
  number: string; // retained legacy field; not exposed in current UI
  type: string;
  subnumber: string;
  itemType: string;
  name: string;
  nameKey: string; // trimmed, lower-case
  amountSatang: number; // non-negative integer
  createdAt: number;
  updatedAt: number;
}
```

Index: `&id`, `profileId`, `[profileId+month]`, `nameKey`, unique compound `[profileId+month+nameKey]`. Allocation เก็บชื่อหมวดเป็น snapshot ของเดือนนั้น ไม่ได้อ้าง foreign key ไป catalog; นี่ทำให้เปลี่ยนชื่อในอนาคตโดยไม่แตะประวัติได้
ฟิลด์ `number`, `type`, `subnumber`, `itemType` เป็น metadata จากฟีเจอร์รุ่นก่อน ปัจจุบันเก็บไว้เพื่อรักษาข้อมูล แต่ planner ไม่แสดง/แก้ฟิลด์เหล่านี้

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

Index: `&key`. ค่าที่ใช้แน่นอนในโค้ดคือ `activeProfileId` และ `allocationSortPreferences` (JSON serialized `AllocationSortPreferences`, เก็บไว้เพื่อ backup compatibility); theme แยกเก็บใน localStorage ไม่ได้เก็บใน Dexie

### Version/migration

- version 1 มี profiles และ settings
- version 2 เพิ่ม budgetPlans และ allocations
- version 3 เพิ่ม categories และ seed รายการ catalog จาก allocation เดิม โดยเลือกชื่อแรกต่อ `nameKey` และ mark เป็น active
- version 4 เติม `number`, `type`, `subnumber`, `itemType` เป็น string ว่างแก่ allocations เดิม
- backup format v3 รวม metadata และ sort preferences; importer รับ v1/v2 โดยเติม metadata ว่าง/default preset; v1 derive category records จาก allocations
- ห้ามลด schema version เพื่อย้อน UI เพราะ IndexedDB ที่อัปเกรดแล้วอาจเปิดไม่ได้; เก็บ field/settings เดิมไว้และไม่เรียกใช้จาก planner
- ไฟล์ UI `AllocationSortSettings.tsx` และ `AllocationSortRuleEditor.tsx` ถูกลบ; sort domain/repository ยังคงอยู่เพื่อรักษา validation ของข้อมูลสำรองเก่า
- Restore สำรองข้อมูลไม่ใช่ merge: เขียนทับข้อมูลทั้งหมดในตารางที่เกี่ยวข้อง

จำนวนเงินทางธุรกิจเก็บเป็น satang แบบจำนวนเต็ม safe integer เพื่อลด floating-point drift; แสดงผลด้วย `Intl.NumberFormat("th-TH", { currency: "THB" })`

## ภาคผนวก F. การตัดสินใจด้านการออกแบบที่สำคัญ

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

## ภาคผนวก G. วิธีติดตั้ง รัน และ build

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

## ภาคผนวก H. ส่วนที่ยังไม่เสร็จ บั๊กที่รู้ และงานต่อ

ข้อมูลด้านล่างตั้งใจจำกัดอยู่ที่สิ่งที่ระบุในโค้ด เอกสาร และ log ที่มี ไม่ใช่การคาดเดา:

### รายการตรวจที่ยังค้างตาม `PROGRESS.md`

- ติดตั้ง PWA จาก Chrome บนอุปกรณ์จริง/ปลายทางยังเป็นการตรวจที่แนะนำให้ทำ
- ตรวจตัวอย่าง PDF บนอุปกรณ์จริงหรือ printer/Chrome environment เป้าหมายยังเป็นการตรวจที่แนะนำ
- การปล่อยแอปผ่าน HTTPS hosting จริงยังไม่มี provider หรือ deployment workflow ระบุไว้

### ปัญหาที่สังเกตพบ

- ข้อความไทยใน `<title>`/description ของ `index.html` และ `name`/`description` ของ manifest ใน `vite.config.ts` มีอักขระทดแทน `�` เมื่ออ่าน UTF-8; ตรวจพบใน source ระหว่างทำ Save Point นี้และยังไม่ได้แก้
- ระหว่างตรวจใน Chrome มี request `GET /favicon.ico` ตอบ 404; หน้าใช้ไอคอน PWA `public/buddy-icon.svg` อยู่แล้ว แต่ไม่มีการยืนยันว่า favicon จำเป็นต่อการใช้งาน ฟังก์ชันหลักทำงานได้แม้ request นี้ล้มเหลว
- ไม่พบ issue ที่มีการบันทึกว่าเป็น bug ที่ทำให้ฟีเจอร์หลักใช้งานไม่ได้ใน `PROGRESS.md`; ประโยคนี้หมายถึงไม่มีรายการดังกล่าวใน log ไม่ใช่การรับรองว่าไม่มีบั๊กอื่น

### การตรวจล่าสุดที่มีบันทึก

- ล่าสุดหลังปรับการบันทึกรายการ: `npm.cmd run build` ผ่าน และ `npm.cmd test -- src/features/allocations/allocationRepository.test.ts` ผ่าน 1 ไฟล์ / 10 tests ตาม `PROGRESS.md`
- Chrome ตรวจการเพิ่ม allocation, ปุ่มบันทึกเมื่อแถวมี draft, error ของยอดเงินผิดรูปแบบ/หมวดซ้ำ และปุ่มหายหลังบันทึกสำเร็จ; ข้อมูลทดสอบถูกลบแล้ว
- Full test suite ล่าสุดที่บันทึกไว้ก่อน follow-up ดังกล่าวคือ 9 ไฟล์ / 45 tests หลังเพิ่มหน้า category settings
- Chrome เคยตรวจการเปิดหน้า settings, เพิ่มหมวด, เลือกหมวดจาก dropdown และตรวจ horizontal overflow ที่ viewport แคบ; profile/category ทดสอบชั่วคราวถูกลบแล้ว
- tests ครอบคลุม money validation/totals, profile validation/isolation, allocations/copy/rollover/comparison, category create/rename/hide/conflict, IndexedDB v2→v3 migration, backup v1/v2, report periods/aggregation
- การแก้ Save Point เป็นเอกสารอย่างเดียว; ไม่มีการรัน build หรือ tests ซ้ำในรอบนี้

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
