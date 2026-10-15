# Worksheet — ระบบเลือกตั้ง (ระบบอ้างอิง)

Boundary: **U** = Unit · **I** = Integration · **C** = Component · **K** = Contract · **E** = End-to-end · **X** = ไม่ใช่ automated functional test

| # | Test case | Boundary | เหตุผล |
|---|---|---|---|
| 1 | เลขบัตรประชาชนที่ checksum ผิด ถูกปฏิเสธตอนลงทะเบียน | **U** | ตรรกะอยู่ในฟังก์ชัน `isValidThaiNationalId` ล้วนๆ ไม่มี I/O ทดสอบ unit ได้เร็วและชี้จุดพังแม่น ส่วนการที่ register เรียกฟังก์ชันนี้จริง มี component test (`register.test.ts`) คุมอยู่แล้ว ไม่ต้องเพิ่มระดับสูง |
| 2 | ลงทะเบียนด้วยเขตเลือกตั้งที่ไม่มีในระบบ ได้ 400 | **C** | ต้องดูว่าระบบตอบ HTTP 400 จริงไหม ซึ่งเป็นเรื่องของ route + error handler ส่วน logic ว่าเขตไม่มีอยู่ ทดสอบ unit ใน `AccountService` ด้วย fake repository ได้ก่อน แล้วใช้ component 1 ข้อยืนยันว่าแปลงเป็น 400 |
| 3 | `PgUserRepository.findByNationalId` คืน user ที่ map column → field ถูกต้อง | **I** | ต้องคุยกับ Postgres จริง เพราะสิ่งที่ทดสอบคือการ map ชื่อ column (`national_id`) เป็น field (`nationalId`) ถ้าใช้ของปลอมจะไม่รู้ว่า SQL ถูกจริงไหม |
| 4 | ผู้มีสิทธิเลือกตั้ง (VOTER) เรียก `POST /parties` แล้วได้ 403 | **C** | ต้องยืนยันว่า route `POST /parties` ผูก middleware `requireRole` ไว้จริง ซึ่งเห็นได้ผ่าน HTTP เท่านั้น ส่วนตัว `requireRole` เองทดสอบ unit ได้ |
| 5 | ผู้ใช้ลงทะเบียน → login → ลงคะแนน → เปลี่ยนคะแนน → กกต. ปิดหีบ → ผลแสดงคะแนนถูกต้อง | **E** | เป็น user journey ข้ามหลาย endpoint และหลายบทบาท ต้องการระบบทั้งตัว เขียนแค่ 1–2 ข้อพอ เพราะช้าและหาจุดพังยาก รายละเอียดแต่ละขั้นให้ระดับล่างคุม |
| 6 | รหัสผ่านถูกเก็บแบบ hash ไม่ใช่ plain text | **U** | `hashPassword` / `verifyPassword` เป็นฟังก์ชันล้วน ตรวจได้ว่าผลไม่ใช่ข้อความเดิมและตรวจรหัสถูกได้ ถ้าจะยืนยันว่าเก็บลง DB เป็น hash จริง component test ที่มีอยู่ก็ตรวจ `passwordHash` ไม่หลุดออก API แล้ว |
| 7 | หมายเลขผู้สมัครในเขตเดียวกันห้ามซ้ำ | **I** | กฎนี้บังคับด้วย `UNIQUE (district_id, number)` ในฐานข้อมูล ต้องใช้ Postgres จริงถึงจะเห็น constraint ทำงาน unit test ใช้ fake repository จะไม่มี constraint นี้ |
| 8 | Liquibase changelog ทั้งหมด apply บน database เปล่าได้สำเร็จ | **I** | ต้อง apply changelog บน Postgres จริงที่ว่างเปล่า ทำอัตโนมัติใน CI ทุกครั้ง (doctor และ `test:integration` ก็ทำอยู่) ไม่ใช่ functional test ของพฤติกรรมผู้ใช้ แต่เป็น integration ของ schema กับ DB |
| 9 | ก่อนปิดหีบ `GET /districts/:id/results` ไม่แสดงคะแนน | **C** | ต้องเห็น response ของ API ว่าไม่มีคะแนน ถ้าย้าย logic ซ่อนคะแนนไปไว้ใน service ที่รับ `clock` ก็ทดสอบ unit ได้ แล้วใช้ component 1 ข้อยืนยันรูปร่าง response |
| 10 | Frontend คาดว่า results API มี field `closed` และ `candidates[].votes` | **K** | เป็นข้อตกลงรูปร่างข้อมูลระหว่าง frontend (consumer) กับ API (provider) ใช้ contract test เช่น Pact ให้ทั้งสองฝั่งตรวจกับสัญญาเดียวกัน e2e ทำได้แต่แพงเกินไป |
| 11 | JWT ที่หมดอายุแล้ว ใช้ยืนยันตัวตนไม่ได้ | **U** | `TokenService` ตรวจวันหมดอายุ ทดสอบด้วย fake timers หรือ token อายุสั้น ไม่ต้องใช้ HTTP หรือ DB |
| 12 | admin เปลี่ยน role ผู้ใช้เป็น กกต. แล้วผู้ใช้นั้นสร้างพรรคได้ | **C** | ข้ามหลาย endpoint (admin เปลี่ยน role → ผู้ใช้ login ใหม่ → สร้างพรรค) ต้องเห็นว่า role ใหม่ไปอยู่ใน token และ middleware ยอมรับ ทั้งหมดอยู่ใน service เดียว จึงไม่ต้องถึง e2e |
| 13 | ระบบรับการลงคะแนนพร้อมกัน 1,000 ครั้งในนาทีแรกหลังเปิดหีบได้ | **X** | เป็น non-functional (performance/load) ใช้เครื่องมืออย่าง k6 หรือ JMeter บนสภาพแวดล้อมใกล้ production แยกจาก test suite ปกติ |
| 14 | ผู้มีสิทธิเห็นเฉพาะผู้สมัครในเขตของตัวเอง | **C** | logic อยู่ใน SQL ของ `voteRoutes.ts` ที่ import `pool` ตรงๆ ไม่มี seam ให้ฉีด fake จึงต้องใช้ HTTP + Postgres จริง ถ้า refactor ให้รับ repository (Lab 07) จะลงไปทดสอบ unit ได้ |
| 15 | หน้ารายละเอียดพรรคแสดงผลสวยงามบนมือถือ | **X** | เป็นเรื่องหน้าตา (UI/responsive) ตรวจด้วยคนดูบนอุปกรณ์จริง หรือ visual regression testing (เช่น Playwright screenshot) ไม่ใช่ functional test ของ backend |
| 16 | หลังปิดหีบแล้ว ผู้มีสิทธิเปลี่ยนคะแนนไม่ได้ | **C** | กฎอยู่ใน `voteRoutes.ts` เหมือนข้อ 14 จึงต้องทดสอบผ่าน HTTP + DB และตอนนี้โค้ดเช็กแค่ `opens_at` ยังไม่มีการเช็กปิดหีบเลย เทสต์นี้น่าจะแดง ถ้าย้าย logic ไป service ที่รับ `clock` จะทดสอบ unit ได้ |
