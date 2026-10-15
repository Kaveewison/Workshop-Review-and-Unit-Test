# Readiness Checklist — Software Testing in Real Industry

ประเมินโปรเจกต์ระบบเลือกตั้ง **ของตัวเอง** 2 รอบ: Day 1 เช้า (ก่อนเริ่ม) และ Day 2 ท้ายวัน (หลังจบ)

คะแนน: **0** = ยังไม่มี · **1** = มีบางส่วน / ทำด้วยมือ · **2** = มีครบ และทำงานอัตโนมัติ

| # | หมวด | ข้อ | ตัวอย่างหลักฐาน ("2 คะแนน" หน้าตาเป็นอย่างไร) | รอบ 1 | รอบ 2 |
|---|---|---|---|---|---|
| 1 | Structure | ระบุ test boundary ของระบบชัดเจน | มีเอกสาร/README บอกว่า unit, component, e2e ทดสอบอะไร และอยู่ที่ไหน | 0 | |
| 2 | Structure | แยก test ที่ไม่มี I/O ออกจาก test ที่ต้องใช้ database | `npm run test:unit` รันได้โดยไม่ต้องเปิด Docker | 0 | |
| 3 | Structure | รัน test ทั้งหมดได้ด้วยคำสั่งเดียว | `npm test` จาก clone ใหม่ ไม่ต้องทำขั้นตอนมือ | 0 | |
| 4 | Environment | database สำหรับ test สร้างจาก migration ที่ versioned | changelog/migration อยู่ใน git, test DB สร้างใหม่ได้ทุกครั้ง | 1 | |
| 5 | Environment | ไม่มีขั้นตอน database ที่ต้องทำด้วยมือ | ไม่มี "import dump.sql ก่อนนะ" หรือ "สร้าง table นี้เอง" | 1 | |
| 6 | Environment | test รันได้เหมือนกันทั้งในเครื่องและใน CI | CI เรียก script เดียวกับที่รันในเครื่อง และรันทุก push | 0 | |
| 7 | Data | ข้อมูลใน test สร้างด้วย builder / factory ไม่ใช่ fixture ก้อนเดียวที่ทุก test ใช้ร่วมกัน | `aVoter().inDistrict('CM-1').build()` | 0 | |
| 8 | Data | test แต่ละตัวไม่ขึ้นกับกันและกัน | รันตัวเดียว, สลับลำดับ, หรือรันซ้ำ ก็ได้ผลเหมือนเดิม | 0 | |
| 9 | Data | ควบคุมเวลาและค่าสุ่มได้ | inject `Clock`, fake timers, `faker.seed()` | 0 | |
| 10 | Design | dependency สำคัญ inject ได้ (มี seam) | DB, เวลา, token service ส่งเข้ามาผ่าน constructor/factory | 1 | |
| 11 | Design | ใช้ test double ถูกระดับ | mock/stub เฉพาะ boundary ที่เราเป็นเจ้าของ interface, ไม่ mock ทุกอย่าง | 0 | |
| 12 | Design | ส่วน legacy ที่เสี่ยงที่สุดมี characterization test | ก่อนแก้โค้ดเก่า มี test จับพฤติกรรมปัจจุบันไว้ | 0 | |
| | | | **รวม (เต็ม 24)** | **3** | |

## หลักฐานรอบ 1 — Election App (branch `election/original`, โค้ดที่ส่งวิชา Backend ก่อนเข้า workshop)

| # | คะแนน | เหตุผล |
|---|---|---|
| 1–3 | 0 | ยังไม่มี test เลย — `package.json` ไม่มี script `test` ไม่มี jest และไม่มีโฟลเดอร์ `test/` |
| 4 | 1 | มี Prisma migration อยู่ใน git (`prisma/migrations/`) แต่ไม่มี test DB แยก และมี script `prisma:push` ที่ข้าม migration ได้ |
| 5 | 1 | มี `prisma/seed.ts` แต่ต้องตั้ง `.env` และรัน `prisma:push` กับ `seed` เองด้วยมือ |
| 6 | 0 | ไม่มี CI |
| 7–9 | 0 | ไม่มี test จึงยังไม่มี builder, ความเป็นอิสระของ test หรือการควบคุมเวลาและค่าสุ่ม |
| 10 | 1 | แยก controller / service / repository แล้ว แต่ service `import * as repo` ตรงๆ และ route สร้าง controller ไว้ระดับ module — แทนที่ได้แค่ด้วย `jest.mock()` ไม่ได้ inject ผ่าน constructor |
| 11–12 | 0 | ไม่มี test double และไม่มี characterization test |

**ข้อที่ได้ 0 และแก้ได้ภายใน 1 วัน:** ข้อ 2–3 (ติดตั้ง Jest + script `npm test` ที่รัน unit test ของ `ElectionService` โดยไม่ต้องมี DB), ข้อ 7 (test data builder + faker), ข้อ 9 (`faker.seed()`) — จะทำใน Part 2 ของงาน (Election App Unit Testing)

## หลังให้คะแนน

- ข้อไหนได้ 0 ที่ **แก้ได้ภายใน 1 วัน**? → เขียนเป็นงานถัดไปของตัวเอง
- ข้อไหนที่ทีมใน industry มักข้าม แล้วค่อยมาจ่ายทีหลัง? (คุยกันตอนปิด Day 2)
