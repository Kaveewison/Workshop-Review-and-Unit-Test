// Unit tests for ElectionService.updateCandidate and deleteCandidate.
// Same seam as the addCandidate tests: jest.spyOn on the repository modules.
import * as candidateRepo from '../../src/repositories/candidate.repository';
import * as partyRepo from '../../src/repositories/party.repository';
import { ElectionService } from '../../src/services/election.service';
import { aCandidate, aConstituency, aParty, Candidate } from '../support/builders';

// Uploads are not under test, and loading the real S3 client only prints a missing-env warning.
jest.mock('../../src/services/upload.service', () => ({}));

const service = new ElectionService();

const district1 = aConstituency({ id: 1 });
const doiSuthep = aParty({ id: 10, name: 'พรรคดอยสุเทพ' });
const maePing = aParty({ id: 20, name: 'พรรคแม่ปิง' });
const candidate7 = aCandidate({ id: 7, candidateNumber: 1, constituency: district1, party: doiSuthep, userId: 100 });

/** STUBS: candidate 7 exists, number 1 of พรรคดอยสุเทพ in district 1; every new value is free. */
function givenCandidate7() {
  return {
    findCandidate: jest.spyOn(candidateRepo, 'findById').mockResolvedValue(candidate7),
    isNumberUsed: jest.spyOn(candidateRepo, 'isCandidateNumberUsed').mockResolvedValue(false),
    findParty: jest.spyOn(partyRepo, 'findById').mockImplementation(async (id) =>
      [doiSuthep, maePing].find((p) => p.id === id) ?? null,
    ),
    findCandidatesInConstituency: jest
      .spyOn(candidateRepo, 'findByConstituency')
      .mockResolvedValue([candidate7] as never),
    // SPY/MOCK: the indirect output — what would be written to the database.
    update: jest.spyOn(candidateRepo, 'update').mockResolvedValue(candidate7 as never),
    remove: jest.spyOn(candidateRepo, 'remove').mockResolvedValue(candidate7 as never),
  };
}

describe('ElectionService.updateCandidate', () => {
  it('changes the candidate number when the new number is free', async () => {
    const { update } = givenCandidate7();

    await service.updateCandidate(7, { candidateNumber: 2 });

    expect(update).toHaveBeenCalledWith(7, expect.objectContaining({ candidateNumber: 2 }));
  });

  it('checks the new number against other candidates only (excludes itself)', async () => {
    const { isNumberUsed } = givenCandidate7();

    await service.updateCandidate(7, { candidateNumber: 2 });

    expect(isNumberUsed).toHaveBeenCalledWith(1, 2, 7);
  });

  it('does not check the number when it stays the same', async () => {
    const { isNumberUsed } = givenCandidate7();

    await service.updateCandidate(7, { candidateNumber: 1, policy: 'นโยบายใหม่' });

    expect(isNumberUsed).not.toHaveBeenCalled();
  });

  it('rejects a number already used by another candidate in the constituency', async () => {
    const { isNumberUsed, update } = givenCandidate7();
    isNumberUsed.mockResolvedValue(true);

    await expect(service.updateCandidate(7, { candidateNumber: 2 })).rejects.toThrow(
      'หมายเลขผู้สมัคร 2 ถูกใช้ในเขตนี้แล้ว',
    );

    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a candidate that does not exist', async () => {
    const { findCandidate, update } = givenCandidate7();
    findCandidate.mockResolvedValue(null);

    await expect(service.updateCandidate(99, { policy: 'x' })).rejects.toThrow('ไม่พบผู้สมัคร ID: 99');

    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a party that does not exist', async () => {
    const { update } = givenCandidate7();

    await expect(service.updateCandidate(7, { partyId: 999 })).rejects.toThrow('ไม่พบพรรค ID: 999');

    expect(update).not.toHaveBeenCalled();
  });

  describe('bugs found by testing (it.failing = documents a bug in the original code)', () => {
    // The original passes title/firstName/lastName/imageUrl straight to prisma.candidate.update,
    // but those columns live on User — Prisma answers "Unknown argument `title`".
    it.failing("sends the person's name to the user record, not to the candidate row", async () => {
      const { update } = givenCandidate7();

      await service.updateCandidate(7, { title: 'นางสาว', firstName: 'สมศรี', lastName: 'มีสุข' });

      const sent = update.mock.calls[0][1] as Record<string, unknown>;
      expect(sent).not.toHaveProperty('firstName');
      expect(sent).toMatchObject({ user: { title: 'นางสาว', firstName: 'สมศรี', lastName: 'มีสุข' } });
    });

    // Moving to a party that already has a candidate here breaks @@unique([constituencyId, partyId]).
    it.failing('rejects moving to a party that already has a candidate in the constituency', async () => {
      const { findCandidatesInConstituency, update } = givenCandidate7();
      findCandidatesInConstituency.mockResolvedValue([
        candidate7,
        aCandidate({ id: 8, candidateNumber: 2, constituency: district1, party: maePing }),
      ] as never);

      await expect(service.updateCandidate(7, { partyId: 20 })).rejects.toThrow('พรรคนี้มีผู้สมัครในเขตนี้แล้ว');

      expect(update).not.toHaveBeenCalled();
    });

    // `if (data.candidateNumber && ...)` skips every check for 0, and nothing checks -1 or 1.5.
    it.failing.each([0, -1, 1.5])('rejects candidate number %p (must be a positive integer)', async (candidateNumber) => {
      const { update } = givenCandidate7();

      await expect(service.updateCandidate(7, { candidateNumber })).rejects.toThrow(
        'หมายเลขผู้สมัครต้องเป็นจำนวนเต็มบวก',
      );

      expect(update).not.toHaveBeenCalled();
    });
  });
});

describe('ElectionService.deleteCandidate', () => {
  it('deletes a candidate that exists', async () => {
    const { remove } = givenCandidate7();

    await service.deleteCandidate(7);

    expect(remove).toHaveBeenCalledWith(7);
  });

  it('rejects a candidate that does not exist and deletes nothing', async () => {
    const { findCandidate, remove } = givenCandidate7();
    findCandidate.mockResolvedValue(null as Candidate | null);

    await expect(service.deleteCandidate(99)).rejects.toThrow('ไม่พบผู้สมัคร ID: 99');

    expect(remove).not.toHaveBeenCalled();
  });
});
