// Lab 04 — component tests: the whole app in-process + real Postgres.
// Data comes from builders (test/support/builders.ts) through givenIn(), and every test
// starts from an empty database (Fresh Fixture), so tests can run alone, repeated or shuffled.
import request from 'supertest';
import { Pool } from 'pg';
import { createApp, pgDeps } from '../../src/app';
import { JwtTokenService } from '../../src/auth/tokenService';
import { aCandidate, aCommissioner, anAdmin, aParty, aVoter } from '../support/builders';
import { createTestPool, truncateAll } from './support/database';
import { givenIn } from './support/given';

describe('election management (component)', () => {
  // Same secret as the app and the legacy vote routes (test/integration/env.ts).
  const tokens = new JwtTokenService(process.env.JWT_SECRET!);
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let given: ReturnType<typeof givenIn>;

  beforeAll(() => {
    pool = createTestPool();
    app = createApp(pgDeps(pool, tokens));
    given = givenIn(pool, tokens);
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /parties', () => {
    const newParty = { name: 'พรรคดอยสุเทพ', policy: 'รถแดงไฟฟ้า' };

    it('lets a commissioner create a party', async () => {
      const commissioner = await given.user(aCommissioner());

      const res = await request(app).post('/parties').set(given.authHeader(commissioner)).send(newParty);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: expect.any(Number), name: 'พรรคดอยสุเทพ' });
    });

    it('forbids a voter (403)', async () => {
      const voter = await given.user(aVoter());

      const res = await request(app).post('/parties').set(given.authHeader(voter)).send(newParty);

      expect(res.status).toBe(403);
    });

    it('requires a token (401)', async () => {
      const res = await request(app).post('/parties').send(newParty);

      expect(res.status).toBe(401);
    });

    it('rejects a duplicate party name (409)', async () => {
      const commissioner = await given.user(aCommissioner());
      await given.party(aParty().named('พรรคดอยสุเทพ'));

      const res = await request(app).post('/parties').set(given.authHeader(commissioner)).send(newParty);

      expect(res.status).toBe(409);
    });
  });

  describe('POST /districts/:id/candidates', () => {
    it('adds a candidate that then appears in the public results of that district', async () => {
      const commissioner = await given.user(aCommissioner());
      const party = await given.party(aParty().named('พรรคแม่ปิง'));

      const added = await request(app)
        .post('/districts/CM-2/candidates')
        .set(given.authHeader(commissioner))
        .send({ partyId: party.id, number: 3, firstName: 'สมศรี', lastName: 'มีสุข' });
      const results = await request(app).get('/districts/CM-2/results');

      expect(added.status).toBe(201);
      expect(results.body.candidates).toEqual([
        { number: 3, firstName: 'สมศรี', lastName: 'มีสุข', partyName: 'พรรคแม่ปิง' },
      ]);
    });
  });

  describe('PATCH /admin/users/:id/role', () => {
    it('lets an admin promote a voter to commissioner', async () => {
      const admin = await given.user(anAdmin());
      const voter = await given.user(aVoter());

      const res = await request(app)
        .patch(`/admin/users/${voter.id}/role`)
        .set(given.authHeader(admin))
        .send({ role: 'COMMISSIONER' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: voter.id, role: 'COMMISSIONER' });
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('GET /me/candidates', () => {
    it('shows a voter only the candidates of their own district', async () => {
      const party = await given.party(aParty());
      await given.candidate(aCandidate().inDistrict('CM-1').forParty(party.id).numbered(1));
      await given.candidate(aCandidate().inDistrict('CM-2').forParty(party.id).numbered(2));
      const voter = await given.user(aVoter().inDistrict('CM-1'));

      const res = await request(app).get('/me/candidates').set(given.authHeader(voter));

      expect(res.status).toBe(200);
      expect(res.body.map((c: { number: number }) => c.number)).toEqual([1]);
    });
  });
});
