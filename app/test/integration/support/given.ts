// GIVEN: put builder-made data into the real database through the real repositories,
// so a component test states its starting point in one line per row.
import { Pool } from 'pg';
import { TokenService } from '../../../src/auth/tokenService';
import { Candidate, Party, User } from '../../../src/domain/types';
import { PgCandidateRepository } from '../../../src/repositories/candidateRepository';
import { PgPartyRepository } from '../../../src/repositories/partyRepository';
import { PgUserRepository } from '../../../src/repositories/userRepository';
import { CandidateBuilder, PartyBuilder, UserBuilder } from '../../support/builders';

export function givenIn(pool: Pool, tokens: TokenService) {
  const users = new PgUserRepository(pool);
  const parties = new PgPartyRepository(pool);
  const candidates = new PgCandidateRepository(pool);

  return {
    async user(builder: UserBuilder): Promise<User> {
      const { role, ...newUser } = builder.build();
      const created = await users.create(newUser);
      // users.create always makes a VOTER — promote when the builder asked for another role.
      return role === created.role ? created : (await users.updateRole(created.id, role))!;
    },

    async party(builder: PartyBuilder): Promise<Party> {
      return parties.create(builder.build());
    },

    async candidate(builder: CandidateBuilder): Promise<Candidate> {
      return candidates.create(builder.build());
    },

    /** Same token the app would issue at login — no need to call POST /auth/login in every test. */
    authHeader(user: User): { Authorization: string } {
      const token = tokens.issue({ userId: user.id, role: user.role, districtId: user.districtId });
      return { Authorization: `Bearer ${token}` };
    },
  };
}
