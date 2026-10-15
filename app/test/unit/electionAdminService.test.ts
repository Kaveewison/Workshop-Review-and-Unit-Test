import { ConflictError, ValidationError } from '../../src/errors';
import { CandidateInput, ElectionAdminService } from '../../src/services/electionAdminService';
import {
  InMemoryCandidateRepository,
  InMemoryDistrictRepository,
  InMemoryPartyRepository,
} from '../support/inMemoryRepositories';

const aCandidate = (overrides: Partial<CandidateInput> = {}): CandidateInput => ({
  partyId: 1,
  number: 1,
  firstName: 'สมศรี',
  lastName: 'มีสุข',
  ...overrides,
});

// ใช้ fake ทั้ง 3 ตัว เพราะ addCandidate อ่านผู้สมัครที่มีอยู่ (findByDistrict) แล้วตัดสินใจ
// ถ้าใช้ jest.fn() ต้อง stub ให้ findByDistrict คืนค่าใหม่ทุกครั้งที่เพิ่มผู้สมัคร — fake จำให้เอง
async function setUp() {
  const districts = new InMemoryDistrictRepository([
    { id: 'CM-1', province: 'เชียงใหม่', number: 1 },
    { id: 'CM-2', province: 'เชียงใหม่', number: 2 },
  ]);
  const parties = new InMemoryPartyRepository();
  const candidates = new InMemoryCandidateRepository(parties);
  const partyA = await parties.create({ name: 'พรรคเอ', logoUrl: null, policy: 'การศึกษาฟรี' });
  const partyB = await parties.create({ name: 'พรรคบี', logoUrl: null, policy: 'ถนนดี' });
  const service = new ElectionAdminService(parties, candidates, districts);
  return { service, candidates, partyA, partyB };
}

describe('ElectionAdminService.addCandidate', () => {
  it('adds a candidate to a district', async () => {
    const { service, candidates, partyA } = await setUp();

    const added = await service.addCandidate('CM-1', aCandidate({ partyId: partyA.id, number: 1 }));

    expect(added).toMatchObject({ districtId: 'CM-1', number: 1, partyName: 'พรรคเอ' });
    expect(await candidates.findByDistrict('CM-1')).toEqual([added]);
  });

  it('rejects a candidate number already used in the district', async () => {
    const { service, partyA, partyB } = await setUp();
    await service.addCandidate('CM-1', aCandidate({ partyId: partyA.id, number: 1 }));

    const duplicate = service.addCandidate('CM-1', aCandidate({ partyId: partyB.id, number: 1 }));

    await expect(duplicate).rejects.toThrow(ConflictError);
  });

  it('rejects a second candidate from the same party in the district', async () => {
    const { service, partyA } = await setUp();
    await service.addCandidate('CM-1', aCandidate({ partyId: partyA.id, number: 1 }));

    const samePartyAgain = service.addCandidate('CM-1', aCandidate({ partyId: partyA.id, number: 2 }));

    await expect(samePartyAgain).rejects.toThrow(ConflictError);
  });

  it('allows the same number in a different district', async () => {
    const { service, candidates, partyA } = await setUp();
    await service.addCandidate('CM-1', aCandidate({ partyId: partyA.id, number: 1 }));

    await service.addCandidate('CM-2', aCandidate({ partyId: partyA.id, number: 1 }));

    expect(await candidates.findByDistrict('CM-2')).toHaveLength(1);
  });

  it('rejects an unknown party', async () => {
    const { service } = await setUp();

    const unknownParty = service.addCandidate('CM-1', aCandidate({ partyId: 999 }));

    await expect(unknownParty).rejects.toThrow(ValidationError);
  });
});
