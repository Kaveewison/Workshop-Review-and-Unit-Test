# Lab 01 Part B — จัดกลุ่ม test cases ของตัวเอง

นำ test cases จาก Lab 00 ข้อ 5 (การเพิ่มผู้สมัคร `ElectionService.addCandidate` ของ Election App วิชา Backend) มาระบุ boundary
และเพิ่ม TC-11, TC-12 ที่ทดสอบผ่าน HTTP เพื่อให้เห็นทุกระดับ

> **แก้จาก Lab 00:** ตอนอ่าน route เพิ่ม พบว่า `POST /candidate` ใช้ `authorize("EC")` ผู้ที่เพิ่มผู้สมัครได้คือ **กกต. (EC)** ไม่ใช่ admin

Seam ของ service นี้คือ **module** ของ repository 4 ตัว (`userRepo`, `candidateRepo`, `partyRepo`, `constituencyRepo`) ที่ `election.service.ts` import เข้ามาตรงๆ (`import * as candidateRepo ...`)
ไม่ได้รับผ่าน constructor แต่ Jest แทนที่ module ได้ด้วย `jest.mock()` หรือ `jest.spyOn(candidateRepo, 'create')` จึงยังทดสอบ unit ได้โดยไม่ต้องใช้ DB

| ID | Given / When / Then (ย่อ) | Boundary | ต้องใช้ test double อะไร | ต้องเตรียมข้อมูลอะไร |
|---|---|---|---|---|
| TC-01 | ข้อมูลถูกต้องครบ → เพิ่มผู้สมัครพร้อมนโยบาย → บันทึก ผูก user/party/constituency | **U** | **stub** repository ทุกตัวให้ตอบว่า "มีอยู่และยังว่าง" · **spy** `candidateRepo.create` ดูข้อมูลที่ส่งไปบันทึก | user ที่อยู่เขต 1, พรรค, เขต 1, หมายเลข 1, นโยบาย |
| TC-02 | ไม่ส่งนโยบาย → บันทึก policy เป็น `null` | **U** | stub เหมือน TC-01 · spy `create` ดูว่า `policy` เป็น `null` | เหมือน TC-01 แต่ไม่มีนโยบาย |
| TC-03 | ผู้ใช้อยู่คนละเขต → ปฏิเสธ ไม่บันทึก | **U** | stub `userRepo.findById` คืน user เขต 2 · **mock** ตรวจว่า `create` ไม่ถูกเรียก | user เขต 2, คำขอลงเขต 1 |
| TC-04 | ผู้ใช้เป็นผู้สมัครอยู่แล้ว → ปฏิเสธ | **U** | stub `candidateRepo.findByUserId` คืนผู้สมัครเดิม · mock `create` ไม่ถูกเรียก | ผู้สมัครเดิมของ user นี้ |
| TC-05 | หมายเลขซ้ำในเขตเดียวกัน → ปฏิเสธ | **U** | stub `isCandidateNumberUsed` คืน `true` · mock `create` ไม่ถูกเรียก | หมายเลข 1 ที่ถูกใช้แล้ว |
| TC-06 | หมายเลขซ้ำแต่**คนละเขต** → บันทึกได้ | **I** | ไม่ใช้ double — ต้องใช้ Prisma + PostgreSQL จริง | ผู้สมัครหมายเลข 1 ในเขต 2 อยู่ใน DB ก่อน แล้วเพิ่มหมายเลข 1 ในเขต 1 |
| TC-07 | ไม่พบพรรค → ปฏิเสธ | **U** | stub `partyRepo.findById` คืน `null` · mock `create` ไม่ถูกเรียก | partyId ที่ไม่มีอยู่ |
| TC-08 | ไม่พบผู้ใช้ → ปฏิเสธ | **U** | stub `userRepo.findById` คืน `null` · mock `create` ไม่ถูกเรียก | userId ที่ไม่มีอยู่ |
| TC-09 | ข้อมูลจำเป็นหาย → ปฏิเสธ | **U** | **dummy** — ไม่ต้อง stub อะไร เพราะ service ปฏิเสธก่อนเรียก repository · mock `create` ไม่ถูกเรียก | คำขอที่ขาด `partyId` (และช่องอื่นทีละช่อง ด้วย `it.each`) |
| TC-10 | หมายเลข `0`, `-1`, `1.5` → ควรปฏิเสธ | **U** | stub เหมือน TC-01 · mock `create` ไม่ถูกเรียก | ค่าขอบ 3 ค่า (ใช้ `it.each`) |
| TC-11 | ผู้ใช้ role VOTER ยิง `POST /candidate` → ได้ 403 | **C** | ใช้ app จริงผ่าน HTTP (supertest) · repository แทนด้วย fake ได้ เพราะคำขอถูกปฏิเสธที่ middleware ก่อนถึง service | JWT ของผู้ใช้ role VOTER |
| TC-12 | กกต. login → เพิ่มผู้สมัครในเขต 1 → ผู้มีสิทธิเขต 1 เปิด `GET /constituency/1` → เห็นผู้สมัครคนนั้น | **E** | ไม่ใช้ double — ระบบทั้งตัว + DB จริง | บัญชี กกต., ผู้มีสิทธิเขต 1, พรรค, เขต 1 (seed) |

## รูปร่างของ test suite

```
        /\         e2e         :  1 ข้อ  (TC-12)
       /  \        component   :  1 ข้อ  (TC-11)
      /    \       integration :  1 ข้อ  (TC-06)
     /______\      unit        :  9 ข้อ  (TC-01–05, 07–10)
```

## คำถาม

**1. รูปร่างเป็น pyramid, ice-cream cone หรือ hourglass?**

**Pyramid** — unit 9 ข้อเป็นฐาน ระดับสูงขึ้นไปมีน้อยลงตามลำดับ
เป็นแบบนี้ได้เพราะกฎทุกข้ออยู่ใน `ElectionService` และ Jest แทน module ของ repository ด้วย stub ได้ จึงทดสอบ unit ได้เกือบหมด
ข้อเดียวที่ต้องขึ้นไป integration คือ TC-06 เพราะเรื่อง "ห้ามซ้ำเฉพาะในเขตเดียวกัน" อยู่ใน query `where: { constituencyId, candidateNumber }` ของ `isCandidateNumberUsed`
ถ้าใช้ stub จะพิสูจน์ได้แค่ว่า service ส่ง `constituencyId` ไปถูก แต่ไม่รู้ว่า query กรองตามเขตจริงไหม

**2. เลือก 2 ข้อที่เป็น e2e แล้วเขียนใหม่ให้ทดสอบที่ระดับต่ำลงได้ไหม? ต้องเปลี่ยนโค้ดอะไร?**

มี e2e แค่ 1 ข้อ (TC-12) จึงเลือก TC-12 กับ TC-11 (ที่เกือบจะเป็น e2e ถ้าทดสอบด้วย token จริงและ DB จริง)

- **TC-12** แยกเป็น 2 ข้อที่ระดับต่ำลง:
  - "เพิ่มผู้สมัครแล้วบันทึกถูก" → มีแล้วที่ TC-01 (**U**)
  - "เปิดดูเขตแล้วเห็นผู้สมัครของเขตนั้น" → unit test `getConstituencyResults` ด้วย stub `constituencyRepo.findWithResults` (**U**) + integration 1 ข้อตรวจ query ว่า include ผู้สมัครของเขตนั้นจริง (**I**)
  - **ไม่ต้องแก้โค้ด** เพราะ Jest แทน module repository ได้อยู่แล้ว เหลือ e2e ไว้ 1 ข้อเป็น smoke test ของเส้นทางหลักพอ
- **TC-11** ลงไปเป็น unit test ของ `authorize("EC")` ได้ โดยส่ง `req` ปลอมที่มี `user.role = "VOTER"` แล้วตรวจว่าตอบ 403 (**U**)
  แต่ต้องเหลือ component 1 ข้อ เพราะ unit ไม่รู้ว่า route `POST /candidate` ผูก `authorize("EC")` ไว้จริงไหม
  - **ควรแก้โค้ด:** ตอนนี้ `election.routes.ts` สร้าง `new ElectionController()` ไว้ระดับ module และ service import repository ตรงๆ ทำให้ component test ต้องใช้ Prisma จริง หรือต้อง `jest.mock()` ทั้ง module
    ถ้าเปลี่ยนเป็น `createApp(deps)` แบบระบบอ้างอิง (ส่ง repository เข้าทาง constructor) จะฉีด fake repository ใน component test ได้ตรงๆ ไม่ต้องเปิด DB
