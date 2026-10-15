// Unit tests for ElectionService.addCandidate — solitary: every repository is a test double.
// Seam: the service imports each repository module (`import * as candidateRepo`), so
// jest.spyOn can replace one function at a time. restoreMocks puts them back after each test.
import { faker, fakerTH } from '@faker-js/faker';
import * as candidateRepo from '../../src/repositories/candidate.repository';
import * as constituencyRepo from '../../src/repositories/constituency.repository';
import * as partyRepo from '../../src/repositories/party.repository';
import * as userRepo from '../../src/repositories/user.repository';
import { ElectionService } from '../../src/services/election.service';
import { aCandidate, aConstituency, aParty, aUser, CreatedCandidate } from '../support/builders';

// Uploads are not under test, and loading the real S3 client only prints a missing-env warning.
jest.mock('../../src/services/upload.service', () => ({}));

const service = new ElectionService();

const district1 = aConstituency({ id: 1, province: 'เชียงใหม่', districtNumber: 1 });
const party = aParty({ id: 10, name: 'พรรคดอยสุเทพ' });
const somchai = aUser({ id: 100, constituencyId: 1, constituency: district1 });

const validInput = { candidateNumber: 1, policy: 'รถแดงไฟฟ้า', partyId: 10, constituencyId: 1, userId: 100 };

/**
 * STUBS: every lookup answers "exists and is free", so the happy path runs.
 * A failure test then changes exactly one answer — the one that should make it fail.
 */
function givenEverythingIsAvailable() {
  const stubs = {
    findUser: jest.spyOn(userRepo, 'findById').mockResolvedValue(somchai),
    findExistingCandidate: jest.spyOn(candidateRepo, 'findByUserId').mockResolvedValue(null),
    findParty: jest.spyOn(partyRepo, 'findById').mockResolvedValue(party),
    findConstituency: jest.spyOn(constituencyRepo, 'findById').mockResolvedValue(district1),
    isNumberUsed: jest.spyOn(candidateRepo, 'isCandidateNumberUsed').mockResolvedValue(false),
    findCandidatesInConstituency: jest.spyOn(candidateRepo, 'findByConstituency').mockResolvedValue([]),
    // create is the indirect OUTPUT we check (spy/mock); it returns what Prisma would return.
    create: jest
      .spyOn(candidateRepo, 'create')
      .mockImplementation(async () => ({ ...aCandidate({ userId: 100 }), user: somchai }) as CreatedCandidate),
  };
  return stubs;
}

describe('ElectionService.addCandidate', () => {
  it('2.3.1 Success + 2.3.3 Stub: adds a user who lives in the constituency as a candidate', async () => {
    givenEverythingIsAvailable();

    const candidate = await service.addCandidate(validInput);

    expect(candidate).toMatchObject({ userId: 100 });
  });

  describe('2.3.4 Spy: what is sent to the database', () => {
    it('connects the candidate to the user, party and constituency', async () => {
      const { create } = givenEverythingIsAvailable();

      await service.addCandidate(validInput);

      expect(create).toHaveBeenCalledTimes(1);
      expect(create.mock.calls[0][0]).toEqual({
        candidateNumber: 1,
        policy: 'รถแดงไฟฟ้า',
        user: { connect: { id: 100 } },
        party: { connect: { id: 10 } },
        constituency: { connect: { id: 1 } },
      });
    });

    it('saves policy as null when none is given', async () => {
      const { create } = givenEverythingIsAvailable();

      await service.addCandidate({ ...validInput, policy: undefined });

      expect(create.mock.calls[0][0]).toMatchObject({ policy: null });
    });
  });

  it('2.3.6 Faker: passes any generated candidate through unchanged', async () => {
    const { create } = givenEverythingIsAvailable();
    const input = {
      candidateNumber: faker.number.int({ min: 1, max: 99 }),
      policy: fakerTH.lorem.paragraph(),
      partyId: party.id,
      constituencyId: district1.id,
      userId: somchai.id,
    };

    await service.addCandidate(input);

    expect(create.mock.calls[0][0]).toMatchObject({
      candidateNumber: input.candidateNumber,
      policy: input.policy,
    });
  });

  describe('2.3.2 Failure + 2.3.5 Mock: rejects and never writes to the database', () => {
    it('rejects a user who lives in another constituency', async () => {
      const { findUser, create } = givenEverythingIsAvailable();
      findUser.mockResolvedValue(aUser({ id: 100, constituencyId: 2 }));

      await expect(service.addCandidate(validInput)).rejects.toThrow('ไม่ได้อาศัยอยู่ในเขตเลือกตั้ง');

      expect(create).not.toHaveBeenCalled();
    });

    it('rejects a user who is already a candidate', async () => {
      const { findExistingCandidate, create } = givenEverythingIsAvailable();
      findExistingCandidate.mockResolvedValue(aCandidate({ userId: 100 }) as never);

      await expect(service.addCandidate(validInput)).rejects.toThrow('เป็นผู้สมัครอยู่แล้ว');

      expect(create).not.toHaveBeenCalled();
    });

    it('rejects a candidate number already used in the constituency', async () => {
      const { isNumberUsed, create } = givenEverythingIsAvailable();
      isNumberUsed.mockResolvedValue(true);

      await expect(service.addCandidate(validInput)).rejects.toThrow('หมายเลขผู้สมัคร 1 ถูกใช้ในเขตนี้แล้ว');

      expect(create).not.toHaveBeenCalled();
    });

    it('rejects a user that does not exist', async () => {
      const { findUser, create } = givenEverythingIsAvailable();
      findUser.mockResolvedValue(null);

      await expect(service.addCandidate(validInput)).rejects.toThrow('ไม่พบผู้ใช้ ID: 100');

      expect(create).not.toHaveBeenCalled();
    });

    it('rejects a party that does not exist', async () => {
      const { findParty, create } = givenEverythingIsAvailable();
      findParty.mockResolvedValue(null);

      await expect(service.addCandidate(validInput)).rejects.toThrow('ไม่พบพรรค ID: 10');

      expect(create).not.toHaveBeenCalled();
    });

    it('rejects a constituency that does not exist', async () => {
      const { findConstituency, create } = givenEverythingIsAvailable();
      findConstituency.mockResolvedValue(null);

      await expect(service.addCandidate(validInput)).rejects.toThrow('ไม่พบเขตเลือกตั้ง ID: 1');

      expect(create).not.toHaveBeenCalled();
    });

    it.each(['candidateNumber', 'partyId', 'constituencyId', 'userId'] as const)(
      'rejects a request without %s',
      async (field) => {
        const { create } = givenEverythingIsAvailable();

        await expect(service.addCandidate({ ...validInput, [field]: undefined as never })).rejects.toThrow(
          'กรุณากระบุข้อมูลที่จำเป็น',
        );

        expect(create).not.toHaveBeenCalled();
      },
    );
  });

  describe('bugs found by testing (it.failing = documents a bug in the original code)', () => {
    it.each([-1, 1.5])('rejects candidate number %p (must be a positive integer)', async (candidateNumber) => {
      const { create } = givenEverythingIsAvailable();

      await expect(service.addCandidate({ ...validInput, candidateNumber })).rejects.toThrow(
        'หมายเลขผู้สมัครต้องเป็นจำนวนเต็มบวก',
      );

      expect(create).not.toHaveBeenCalled();
    });

    it('rejects a party that already has a candidate in the constituency', async () => {
      const { findCandidatesInConstituency, create } = givenEverythingIsAvailable();
      findCandidatesInConstituency.mockResolvedValue([aCandidate({ partyId: 10, candidateNumber: 5 })] as never);

      await expect(service.addCandidate(validInput)).rejects.toThrow('พรรคนี้มีผู้สมัครในเขตนี้แล้ว');

      expect(create).not.toHaveBeenCalled();
    });
  });
});
