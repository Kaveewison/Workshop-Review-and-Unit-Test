# Election App — Unit Testing ส่วนจัดการผู้สมัคร

งานส่วนที่ 2 ของ Software Testing Assignment (15%) · กวีวิศลย์ กฤษดาวิวัฒน์ (682132001)

ทดสอบ **ส่วนจัดการผู้สมัครรับเลือกตั้ง** ของ backend งานกลุ่มวิชา 953713 Software Backend Development
(repo กลุ่ม [thanapon1406/953713-software-backend-development-final-project](https://github.com/thanapon1406/953713-software-backend-development-final-project) ที่ commit `32d103e`)

- **Stack:** Express 5 · Prisma 7 · PostgreSQL · TypeScript
- **เครื่องมือทดสอบ:** Jest 30 · ts-jest · @faker-js/faker 9
- **ขอบเขต:** `ElectionService.addCandidate`, `updateCandidate`, `deleteCandidate` ใน [src/services/election.service.ts](src/services/election.service.ts)
- **branch:** `election/original` = โค้ดเดิมที่ส่ง · `test/candidate` = เทสต์ + โค้ดที่แก้หลังทำ V&V (branch นี้)

---

## 1. ติดตั้งและรันเทสต์

ต้องมี **Node.js 24** ขึ้นไป — **ไม่ต้องมี database, Docker หรือไฟล์ `.env`** เพราะ unit test แทน repository ทุกตัวด้วย test double

```bash
git clone https://github.com/Kaveewison/Workshop-Review-and-Unit-Test.git
cd Workshop-Review-and-Unit-Test
git switch test/candidate
cd election-app
npm install
npm test
```

`npm test` รัน `prisma generate` ให้ก่อนอัตโนมัติ (script `pretest`) เพราะโค้ดใช้ type จาก `src/generated/prisma` ซึ่งไม่ได้อยู่ใน git

ผลที่ควรได้:

```
Test Suites: 2 passed, 2 total
Tests:       31 passed, 31 total
```

| คำสั่ง | ทำอะไร |
|---|---|
| `npm test` | รัน unit test ทั้งหมด |
| `npx jest --verbose` | ดูชื่อเทสต์ทุกข้อ (อ่านแล้วเป็น spec ของระบบ) |
| `npm run test:coverage` | รันพร้อมรายงาน coverage ของ `election.service.ts` (HTML อยู่ที่ `coverage/`) |

ไฟล์ที่เกี่ยวกับการทดสอบ:

| ไฟล์ | หน้าที่ |
|---|---|
| [jest.config.js](jest.config.js) | เทสต์อยู่ใน `test/`, ใช้ ts-jest, `restoreMocks` คืนของจริงหลังทุกเทสต์ |
| [tsconfig.test.json](tsconfig.test.json) | type-check ทั้ง `src/` และ `test/` โดยไม่แก้ `tsconfig.json` เดิม |
| [test/support/builders.ts](test/support/builders.ts) | Test Data Builder: `aUser`, `aParty`, `aConstituency`, `aCandidate` |
| [test/support/seedFaker.ts](test/support/seedFaker.ts) | `faker.seed()` ใน `beforeEach` ข้อมูลสุ่มได้ชุดเดิมทุกรอบ |
| [test/services/election.service.addCandidate.test.ts](test/services/election.service.addCandidate.test.ts) | `addCandidate` 17 เทสต์ |
| [test/services/election.service.updateCandidate.test.ts](test/services/election.service.updateCandidate.test.ts) | `updateCandidate` 12 เทสต์ · `deleteCandidate` 2 เทสต์ |

---

## 2. Unit Test Design (ข้อ 2.1)

**หน่วยที่ทดสอบ:** `ElectionService` ตัวเดียว ส่วน repository ที่คุยกับ Prisma/PostgreSQL แทนด้วย test double ทั้งหมด (solitary unit test)

**Seam:** service import repository เป็น module (`import * as candidateRepo from '../repositories/candidate.repository'`) ไม่ได้รับผ่าน constructor
จึงใช้ `jest.spyOn(candidateRepo, 'create')` แทนทีละฟังก์ชัน และ `jest.mock` เฉพาะ `upload.service` (ไม่อยู่ในขอบเขต และโหลดแล้วพิมพ์ warning เรื่อง S3)

**วิธีออกแบบ test case:** อ่านโค้ดหากฎจากทุก `if ... throw` แล้วเขียนเทสต์ทั้งกรณีทำตามกฎและฝ่ากฎ + ค่าขอบ (boundary value)

| กฎของระบบ | เทสต์ |
|---|---|
| ต้องส่ง `candidateNumber`, `partyId`, `constituencyId`, `userId` ครบ | `rejects a request without %s` (4 กรณี ด้วย `it.each`) |
| ผู้ใช้ต้องมีอยู่จริงและอยู่ในเขตที่ลงสมัคร | `rejects a user that does not exist` · `rejects a user who lives in another constituency` |
| 1 คนเป็นผู้สมัครได้ครั้งเดียว | `rejects a user who is already a candidate` |
| พรรคและเขตต้องมีอยู่จริง | `rejects a party / constituency that does not exist` |
| หมายเลขห้ามซ้ำในเขต (ตอนแก้ไม่นับตัวเอง) | `rejects a candidate number already used ...` · `checks the new number against other candidates only` |
| หมายเลขต้องเป็นจำนวนเต็มบวก | `rejects candidate number %p` — `addCandidate`: -1, 1.5 · `updateCandidate`: 0, -1, 1.5 |
| 1 พรรคส่งได้ 1 คนต่อเขต | `rejects a party that already has a candidate ...` · `rejects moving to a party ...` · `moves the candidate to a party that has nobody ...` |
| นโยบายไม่บังคับ → บันทึกเป็น `null` | `saves policy as null when none is given` |
| ชื่อ/รูปผู้สมัครอยู่ในตาราง User | `sends the person's name to the user record, not to the candidate row` |

---

## 3. Unit Test ตามข้อ 2.3

| ข้อ | สิ่งที่ต้องมี | อยู่ที่ |
|---|---|---|
| 2.3.1 | Success (happy path) | [`2.3.1 Success + 2.3.3 Stub: adds a user who lives in the constituency as a candidate`](test/services/election.service.addCandidate.test.ts#L44) |
| 2.3.2 | Alternative / Failure | [กลุ่ม `2.3.2 Failure + 2.3.5 Mock`](test/services/election.service.addCandidate.test.ts#L95) — อยู่คนละเขต, สมัครซ้ำ, หมายเลขซ้ำ, ไม่พบผู้ใช้/พรรค/เขต, ข้อมูลไม่ครบ 4 แบบ (10 เทสต์) |
| 2.3.3 | Stub | [`givenEverythingIsAvailable()`](test/services/election.service.addCandidate.test.ts#L27) — stub repository ให้ตอบว่า "มีอยู่และยังว่าง" แต่ละเทสต์ล้มเหลวเปลี่ยนแค่คำตอบเดียวที่ทำให้ล้ม |
| 2.3.4 | Spy | [กลุ่ม `2.3.4 Spy`](test/services/election.service.addCandidate.test.ts#L52) — `jest.spyOn(candidateRepo, 'create')` ดูว่าส่ง `connect` ของ user/party/constituency ถูก และ `policy` เป็น `null` เมื่อไม่ส่งมา |
| 2.3.5 | Mock | ทุกเทสต์ในกลุ่ม 2.3.2 ตั้ง expectation `expect(create).not.toHaveBeenCalled()` — ข้อมูลผิดต้องไม่เขียนอะไรลง DB |
| 2.3.6 | Faker | [`2.3.6 Faker: passes any generated candidate through unchanged`](test/services/election.service.addCandidate.test.ts#L77) — หมายเลขและนโยบายสุ่มด้วย `faker`/`fakerTH` + builder ทุกตัวใช้ `fakerTH` |

---

## 4. Code Comparison: `election/original` vs `test/candidate` (ข้อ 2.2)

```bash
git diff origin/election/original origin/test/candidate -- election-app/src
```

ขั้นตอน: เขียนเทสต์บนโค้ดเดิมก่อน → bug ที่เจอบันทึกด้วย `it.failing` (เทสต์ที่ "ควรผ่านแต่ตอนนี้พัง") → แก้ทีละ bug ใน commit แยก แล้วเปลี่ยน `it.failing` เป็น `it`
ดูลำดับได้ด้วย `git log --reverse --oneline origin/election/original..origin/test/candidate`

### สิ่งที่เปลี่ยน และเหตุผล

| # | ที่ | เดิม | หลังแก้ | V&V | เหตุผล |
|---|---|---|---|---|---|
| 1 | `addCandidate` | เช็กแค่ `!data.candidateNumber` → `-1`, `1.5` ผ่าน | `Number.isInteger(n) && n >= 1` | Verification | หมายเลขบนบัตรเลือกตั้งต้องเป็น 1, 2, 3 ... ค่าขอบที่ไม่ถูกเช็กหลุดลง DB ได้ |
| 1 | `updateCandidate` | `if (data.candidateNumber && ...)` — `0` เป็น falsy เลยข้ามการเช็กทั้งหมดแล้วบันทึก 0 | เช็ก `!== undefined` + จำนวนเต็มบวก | Verification | bug ที่เกิดจาก truthiness ของ JavaScript |
| 2 | `updateCandidate` + `candidate.repository.update` | ส่ง `title`, `firstName`, `lastName`, `imageUrl` ให้ `prisma.candidate.update` → Prisma ตอบ `Unknown argument 'title'` | service แยกข้อมูลส่วนตัวเป็น `user` → repository ส่ง `user: { update }` ผ่าน relation และใช้ `party: { connect }` แทน `partyId` | **Validation** | กกต. ต้องแก้ชื่อผู้สมัครได้ แต่ฟีเจอร์นี้ใช้ไม่ได้เลยตั้งแต่แรก — ระบบไม่ทำสิ่งที่ผู้ใช้ต้องการ |
| 3 | `addCandidate` | ไม่เช็กว่าพรรคมีผู้สมัครในเขตแล้ว → ชน `@@unique([constituencyId, partyId])` ได้ error ดิบของ Prisma | ดึงผู้สมัครในเขตมาเช็กก่อน → `พรรคนี้มีผู้สมัครในเขตนี้แล้ว` | Verification | schema (spec) มีกฎนี้แต่ service ไม่ได้ implement ผู้ใช้ได้ข้อความที่อ่านไม่รู้เรื่อง |
| 4 | `updateCandidate` | ย้ายไปพรรคที่มีผู้สมัครในเขตแล้วได้ (ชน constraint เหมือนข้อ 3) | เช็กเหมือนข้อ 3 โดยไม่นับตัวเอง | Verification | กฎเดียวกันต้องใช้ทั้งตอนเพิ่มและตอนแก้ |

### สิ่งที่คงเดิม

- โครงสร้าง controller → service → repository และ route ทั้งหมด
- API (URL, request body, response) และข้อความ error เดิมทุกข้อความ — เพิ่มแค่ 2 ข้อความใหม่
- `schema.prisma`, migrations และ `deleteCandidate`
- `jest.config.js`, `tsconfig.test.json`, `test/` และ script `test` ใน `package.json` เป็นของใหม่ ไม่กระทบตอนรันจริง

### ข้อจำกัด

- การแก้ใน `candidate.repository.update` (bug 2) unit test ตรวจไม่ถึง เพราะ repository ถูกแทนด้วย double — ตรวจได้แค่ว่า Prisma ยอมรับรูปแบบคำสั่ง (ผ่านการ validate ไปติดที่ต่อ DB ไม่ได้) การยืนยันว่าชื่อเปลี่ยนจริงต้องใช้ integration test กับ PostgreSQL
- coverage ของ `election.service.ts` ทั้งไฟล์ประมาณ 31% เพราะขอบเขตคือเฉพาะฟังก์ชันจัดการผู้สมัคร

---

## 5. แนวคิดทางทฤษฎีที่ใช้

- **Solitary unit test** — ทดสอบ `ElectionService` ตัวเดียว ทุก repository เป็น test double: เร็ว (~1 วินาที) ไม่ต้องมี DB และถ้าแดงรู้ทันทีว่าพังที่ logic ของ service
- **Arrange / Act / Assert** — แต่ละเทสต์แบ่ง 3 ส่วนชัด, Act ครั้งเดียว, ไม่มี `if`/`for` (ใช้ `it.each`), ชื่อเทสต์บอกพฤติกรรม
- **Test doubles** — *stub* ป้อน input ทางอ้อม (`mockResolvedValue`), *spy* บันทึก output ทางอ้อม (`create.mock.calls`), *mock* ตั้ง expectation (`not.toHaveBeenCalled()`) — `jest.fn()` ตัวเดียวกันเป็นได้ทั้ง 3 แบบ ต่างกันที่ใช้ทำอะไร
- **Seam** — จุดที่เสียบ double ได้; ที่นี่คือ module ของ repository (`jest.spyOn`) ไม่ใช่ constructor injection
- **Test Data Builder + Faker** — เทสต์บอกเฉพาะค่าที่สำคัญ (`aUser({ constituencyId: 2 })`) ที่เหลือ faker เติม · `faker.seed()` ให้ทำซ้ำได้ · builder ใช้ type ของ repository จริง
- **Boundary value analysis** — ทดสอบค่าขอบ `0`, `-1`, `1.5` ซึ่งเป็นจุดที่เจอ bug
- **`it.failing`** — บันทึก bug ในรูปเทสต์ก่อนแก้ ทำให้ git history แสดง "เจอ bug → แก้ bug"
- **Verification vs Validation** — *Verification*: สร้างถูกตาม spec ไหม (bug 1, 3, 4) · *Validation*: สร้างสิ่งที่ผู้ใช้ต้องการไหม (bug 2)
