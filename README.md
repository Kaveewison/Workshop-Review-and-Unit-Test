# Software Testing Assignment (15%) — Workshop Review + Unit Test

ผู้ทำ: **กวีวิศลย์ กฤษดาวิวัฒน์** · รหัสนักศึกษา **682132001** · GitHub: [Kaveewison](https://github.com/Kaveewison)

repo นี้เริ่มจาก clone [boyone/camt-software-testing](https://github.com/boyone/camt-software-testing) (workshop *Software Testing in Real Industry*, 3–4 ต.ค. 2026)
งานแต่ละส่วนแยกอยู่คนละ branch — README นี้บอกว่าอะไรอยู่ที่ไหนและรันอย่างไร
คู่มือ workshop เดิมของผู้สอนย้ายไปอยู่ที่ [WORKSHOP.md](WORKSHOP.md)

| ส่วนของงาน | branch | เริ่มอ่านที่ |
|---|---|---|
| 1. Workshop Review & Git History | `jest/lab/00-setup` … `jest/lab/04-test-data` | [ส่วนที่ 1](#ส่วนที่-1--workshop-review--git-history) |
| 2.1, 2.3 Election App Unit Testing | `test/candidate` | [`election-app/README.md`](https://github.com/Kaveewison/Workshop-Review-and-Unit-Test/blob/test/candidate/election-app/README.md) |
| 2.2 Code Comparison (โบนัส) | `election/original` เทียบกับ `test/candidate` | หัวข้อ 4 ใน `election-app/README.md` |

---

## ส่วนที่ 1 — Workshop Review & Git History

ทำ lab ของ workshop ใหม่ทีละ branch ชื่อ branch ตรงกับต้นฉบับ แต่ละขั้นเป็น 1 commit
**คำอธิบายแนวคิดและผลการทดลองของแต่ละขั้นอยู่ใน commit message** (เขียนด้วยภาษาของตัวเอง) ดูได้ด้วย:

```bash
git log --reverse --author=ZeaSigN origin/jest/lab/02-aaa-unit   # เฉพาะ commit ที่ทำเอง (commit ของผู้สอนเป็นของ boyone)
```

| branch | แนวคิดที่ฝึก | งานที่ทำ | commit |
|---|---|---|---|
| `jest/lab/00-setup` | test boundary 3 ระดับ (unit / integration / e2e), เทสต์ต้อง "แดงได้" เมื่อโค้ดผิด, dependency injection | รัน doctor, เทียบเวลาและความแม่นของ 3 ระดับ, ทำ checksum ให้ผิดแล้วดูว่าเทสต์ไหนแดง, อ่าน `createApp(deps)` และ `voteRoutes`, เขียน test case Given/When/Then 10 ข้อ (`labs/00-setup/test-cases.md`) | 5 |
| `jest/lab/01-boundaries` | unit / integration / component / contract / e2e, test pyramid, เลือกระดับต่ำที่สุดที่ยังมั่นใจพอ | จัดกลุ่ม 16 ข้อใน `worksheet.md`, จัดระดับ test case ของตัวเองและวาด pyramid (`my-test-cases.md`), ให้คะแนน Readiness Checklist รอบ 1 | 3 |
| `jest/lab/02-aaa-unit` | Arrange–Act–Assert, test smells (Obscure Test, Eager Test, Assertion Roulette, Conditional Logic), `it.each`, `describe` ซ้อน | หา smell ใน `lab02-smelly.test.ts` แล้วแยกเป็น `thaiNationalId` / `passwords` / `config` / `toPublicUser` test | 6 |
| `jest/lab/03-test-doubles` | dummy, stub, spy, mock, fake, seam, fake timers vs inject Clock | `accountService.test.ts`, fake repository ใน `test/support/`, `electionAdminService.test.ts`, `jwtTokenService.test.ts`, คำถามปิด lab | 5 |
| `jest/lab/04-test-data` | Liquibase (update / tag / rollback / contexts / checksum), test data builder + faker, Fresh Fixture vs Shared Fixture, seed generator | ฝึก Liquibase A1.1–A3, `builders.ts`, component test `elections.test.ts`, `scripts/generate-user-seed.ts` | 17 |

### รัน lab

ต้องมี **Node.js 24** และ **Docker** (unit test ไม่ต้องใช้ Docker)

```bash
git clone https://github.com/Kaveewison/Workshop-Review-and-Unit-Test.git
cd Workshop-Review-and-Unit-Test
git switch jest/lab/04-test-data
cd app
npm ci
npm run test:unit          # unit test
npm run test:integration   # เปิด Postgres ใน Docker + Liquibase แล้วรัน component test
```

ตรวจความพร้อมของเครื่องด้วย `npm run doctor` (ต้องได้ 9/9) · ปิด container ทั้งหมดด้วย `npm run db:down`

---

## ส่วนที่ 2 — Election App Unit Testing

ทดสอบ **ส่วนจัดการผู้สมัครเลือกตั้ง** (`ElectionService.addCandidate / updateCandidate / deleteCandidate`) ของ backend งานกลุ่มวิชา 953713 Software Backend Development (Express 5 + Prisma 7 + PostgreSQL) โค้ดอยู่ในโฟลเดอร์ `election-app/`

```bash
git switch test/candidate
cd election-app
npm install
npm test          # ไม่ต้องมี DB, Docker หรือ .env — ได้ 31 passed
```

| ข้อ | อยู่ที่ |
|---|---|
| 2.1 Unit Test Design | `election-app/README.md` หัวข้อ 2 |
| 2.2 Code Comparison | branch `election/original` (โค้ดเดิม จาก repo กลุ่ม commit `32d103e`) เทียบกับ `test/candidate` · ตารางเปรียบเทียบใน `election-app/README.md` หัวข้อ 4 · `git diff origin/election/original origin/test/candidate -- election-app/src` |
| 2.3.1–2.3.6 Success / Failure / Stub / Spy / Mock / Faker | `election-app/test/services/election.service.addCandidate.test.ts` (ตารางพร้อมลิงก์บรรทัดใน `election-app/README.md` หัวข้อ 3) |

สรุปผล: เทสต์ 31 ข้อ เจอ bug ในโค้ดเดิม 4 จุด — หมายเลขผู้สมัครติดลบ/ทศนิยม/ศูนย์, แก้ชื่อผู้สมัครผ่าน API ไม่ได้, พรรคเดียวส่ง 2 คนในเขตเดียวตอนเพิ่ม และตอนย้ายพรรค
แต่ละ bug บันทึกด้วย `it.failing` ก่อน แล้วแก้ใน commit ถัดไป

---

## แนวคิดทางทฤษฎีที่ใช้ (สรุป)

| แนวคิด | ใช้ที่ไหน |
|---|---|
| **Test boundaries & Test Pyramid** — unit เยอะ เร็ว ชี้จุดพังแม่น · e2e น้อย ช้า แต่ใกล้ของจริง | Lab 00, 01 |
| **Arrange–Act–Assert** — 1 test = 1 พฤติกรรม, Act ครั้งเดียว, ไม่มี logic ในเทสต์ | Lab 02, Election App |
| **Test smells** (xUnit Test Patterns) | Lab 02 |
| **Test doubles** — dummy / stub / spy / mock / fake และ **seam** ที่ใช้เสียบ | Lab 03, Election App |
| **Fake timers vs inject Clock** — เวลาเป็น dependency | Lab 03 |
| **Database versioning** — schema เป็นโค้ด, checksum ห้ามแก้ changeset เก่า, contexts | Lab 04 |
| **Test Data Builder + Faker (seeded)** — บอกเฉพาะค่าที่สำคัญ, ข้อมูลสุ่มแต่ทำซ้ำได้ | Lab 04, Election App |
| **Fresh Fixture vs Shared Fixture** — ทุกเทสต์เริ่มจาก DB ว่าง ไม่ขึ้นกับลำดับ | Lab 04 |
| **Boundary value analysis** — ค่าขอบ `0`, `-1`, `1.5` | Election App |
| **Verification & Validation** — สร้างถูกตาม spec (Verification) / สร้างสิ่งที่ผู้ใช้ต้องการ (Validation) | Election App (ข้อ 2.2) |
