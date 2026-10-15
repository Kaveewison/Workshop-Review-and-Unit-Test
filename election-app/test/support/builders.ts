// TEST DATA BUILDERS: objects shaped like what the real repositories return,
// typed against those repositories so a schema change breaks the build, not the test.
// A test passes only the values it cares about; faker fills in the rest.
import { faker, fakerTH } from '@faker-js/faker';
import * as candidateRepo from '../../src/repositories/candidate.repository';
import * as constituencyRepo from '../../src/repositories/constituency.repository';
import * as partyRepo from '../../src/repositories/party.repository';
import * as userRepo from '../../src/repositories/user.repository';

/** `{ id }` only when the caller gave one, so an absent id keeps the faker default. */
const withId = (id: number | undefined) => (id === undefined ? {} : { id });

type Found<F extends (...args: any[]) => Promise<unknown>> = NonNullable<Awaited<ReturnType<F>>>;

export type Constituency = Found<typeof constituencyRepo.findById>;
export type Party = Found<typeof partyRepo.findById>;
export type User = Found<typeof userRepo.findById>;
export type Candidate = Found<typeof candidateRepo.findById>;
export type CreatedCandidate = Awaited<ReturnType<typeof candidateRepo.create>>;

/** 12 random digits + checksum digit, like a real Thai national id. */
export function aThaiNationalId(): string {
  const digits = Array.from({ length: 12 }, (_, i) => faker.number.int({ min: i === 0 ? 1 : 0, max: 9 }));
  const sum = digits.reduce((acc, digit, i) => acc + digit * (13 - i), 0);
  return [...digits, (11 - (sum % 11)) % 10].join('');
}

export function aConstituency(overrides: Partial<Constituency> = {}): Constituency {
  return {
    id: faker.number.int({ min: 1, max: 400 }),
    province: fakerTH.location.state(),
    districtNumber: faker.number.int({ min: 1, max: 10 }),
    isClosed: false,
    ...overrides,
  } as Constituency;
}

export function aParty(overrides: Partial<Party> = {}): Party {
  return {
    id: faker.number.int({ min: 1, max: 99 }),
    name: `พรรค${fakerTH.person.lastName()}`,
    logoUrl: null,
    policy: faker.lorem.sentence(),
    ...overrides,
  } as Party;
}

export function aUser(overrides: Partial<User> = {}): User {
  const constituency = overrides.constituency ?? aConstituency(withId(overrides.constituencyId));
  return {
    id: faker.number.int({ min: 1, max: 10_000 }),
    nationalId: aThaiNationalId(),
    laserCode: null,
    title: 'นาย',
    firstName: fakerTH.person.firstName(),
    lastName: fakerTH.person.lastName(),
    address: fakerTH.location.streetAddress(),
    imageUrl: null,
    role: 'VOTER',
    constituencyId: constituency.id,
    constituency,
    ...overrides,
  } as User;
}

export function aCandidate(overrides: Partial<Candidate> = {}): Candidate {
  const constituency = overrides.constituency ?? aConstituency(withId(overrides.constituencyId));
  const party = overrides.party ?? aParty(withId(overrides.partyId));
  return {
    id: faker.number.int({ min: 1, max: 10_000 }),
    candidateNumber: faker.number.int({ min: 1, max: 20 }),
    policy: faker.lorem.sentence(),
    userId: faker.number.int({ min: 1, max: 10_000 }),
    partyId: party.id,
    party,
    constituencyId: constituency.id,
    constituency,
    ...overrides,
  } as Candidate;
}
