// TEST DATA BUILDERS: a test states only the values it cares about
// (`aVoter().inDistrict('CM-2')`); faker fills in everything else.
// Seeded in test/support/seedFaker.ts, so a failing test sees the same data on every run.
import { faker, fakerTH } from '@faker-js/faker';
import { hashPassword } from '../../src/auth/passwords';
import { Role } from '../../src/domain/types';
import { NewCandidate } from '../../src/repositories/candidateRepository';
import { NewParty } from '../../src/repositories/partyRepository';
import { NewUser } from '../../src/repositories/userRepository';

export const DEFAULT_PASSWORD = 'password1234';

// scrypt is slow on purpose — hash once, not once per built user.
const DEFAULT_PASSWORD_HASH = hashPassword(DEFAULT_PASSWORD);

/** 12 random digits + the checksum digit, so the id always passes isValidThaiNationalId. */
export function aThaiNationalId(): string {
  const digits = [faker.number.int({ min: 1, max: 8 }), ...Array.from({ length: 11 }, () => faker.number.int(9))];
  const sum = digits.reduce((acc, digit, i) => acc + digit * (13 - i), 0);
  const checksum = (11 - (sum % 11)) % 10;
  return [...digits, checksum].join('');
}

export type UserSpec = NewUser & { role: Role };

export class UserBuilder {
  private spec: UserSpec;

  constructor(role: Role) {
    this.spec = {
      nationalId: aThaiNationalId(),
      passwordHash: DEFAULT_PASSWORD_HASH,
      firstName: fakerTH.person.firstName(),
      lastName: fakerTH.person.lastName(),
      address: fakerTH.location.streetAddress(),
      districtId: 'CM-1',
      role,
    };
  }

  inDistrict(districtId: string): this {
    this.spec.districtId = districtId;
    return this;
  }

  withNationalId(nationalId: string): this {
    this.spec.nationalId = nationalId;
    return this;
  }

  build(): UserSpec {
    return { ...this.spec };
  }
}

export const aVoter = () => new UserBuilder('VOTER');
export const aCommissioner = () => new UserBuilder('COMMISSIONER');
export const anAdmin = () => new UserBuilder('ADMIN');

export class PartyBuilder {
  private party: NewParty = {
    name: `พรรค${fakerTH.person.lastName()} ${faker.string.alphanumeric(4)}`,
    logoUrl: null,
    policy: faker.lorem.sentence(),
  };

  named(name: string): this {
    this.party.name = name;
    return this;
  }

  build(): NewParty {
    return { ...this.party };
  }
}

export const aParty = () => new PartyBuilder();

export class CandidateBuilder {
  private candidate: NewCandidate = {
    districtId: 'CM-1',
    partyId: 1,
    number: faker.number.int({ min: 1, max: 99 }),
    firstName: fakerTH.person.firstName(),
    lastName: fakerTH.person.lastName(),
    photoUrl: null,
  };

  inDistrict(districtId: string): this {
    this.candidate.districtId = districtId;
    return this;
  }

  forParty(partyId: number): this {
    this.candidate.partyId = partyId;
    return this;
  }

  numbered(number: number): this {
    this.candidate.number = number;
    return this;
  }

  build(): NewCandidate {
    return { ...this.candidate };
  }
}

export const aCandidate = () => new CandidateBuilder();
