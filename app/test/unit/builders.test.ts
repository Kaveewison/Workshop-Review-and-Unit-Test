import { faker, fakerTH } from '@faker-js/faker';
import { verifyPassword } from '../../src/auth/passwords';
import { isValidThaiNationalId } from '../../src/domain/thaiNationalId';
import { aCandidate, aCommissioner, aParty, aThaiNationalId, aVoter, DEFAULT_PASSWORD } from '../support/builders';

describe('test data builders', () => {
  it('always generates a national id with a valid checksum', () => {
    const ids = Array.from({ length: 200 }, () => aThaiNationalId());

    expect(ids.filter((id) => !isValidThaiNationalId(id))).toEqual([]);
  });

  it('builds a voter whose password is DEFAULT_PASSWORD', () => {
    const voter = aVoter().build();

    expect(voter.role).toBe('VOTER');
    expect(verifyPassword(DEFAULT_PASSWORD, voter.passwordHash)).toBe(true);
  });

  it('keeps the values the test asks for and fills in the rest', () => {
    const commissioner = aCommissioner().inDistrict('CM-2').withNationalId('1100000000024').build();

    expect(commissioner).toMatchObject({ role: 'COMMISSIONER', districtId: 'CM-2', nationalId: '1100000000024' });
    expect(commissioner.firstName).not.toBe('');
  });

  it('builds a party and a candidate with the given name, party and number', () => {
    const party = aParty().named('พรรคดอยสุเทพ').build();
    const candidate = aCandidate().inDistrict('CM-2').forParty(7).numbered(3).build();

    expect(party.name).toBe('พรรคดอยสุเทพ');
    expect(candidate).toMatchObject({ districtId: 'CM-2', partyId: 7, number: 3 });
  });

  it('gives the same data again after re-seeding (deterministic)', () => {
    faker.seed(42);
    fakerTH.seed(42);
    const first = aVoter().build();

    faker.seed(42);
    fakerTH.seed(42);
    const second = aVoter().build();

    expect(second).toEqual(first);
  });
});
