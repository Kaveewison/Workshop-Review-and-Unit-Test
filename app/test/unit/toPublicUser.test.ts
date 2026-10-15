import { User } from '../../src/domain/types';
import { toPublicUser } from '../../src/services/accountService';

describe('toPublicUser', () => {
  const user: User = {
    id: 7,
    nationalId: '1509900000017',
    passwordHash: 'scrypt$somesalt$somehash',
    firstName: 'Somchai',
    lastName: 'Jaidee',
    address: '239 Huay Kaew Rd, Chiang Mai',
    districtId: 'CM-1',
    role: 'VOTER',
  };

  it('does not expose the password hash', () => {
    const publicUser = toPublicUser(user);

    expect(publicUser).not.toHaveProperty('passwordHash');
  });

  it('keeps every other field unchanged', () => {
    const publicUser = toPublicUser(user);

    expect(publicUser).toEqual({
      id: 7,
      nationalId: '1509900000017',
      firstName: 'Somchai',
      lastName: 'Jaidee',
      address: '239 Huay Kaew Rd, Chiang Mai',
      districtId: 'CM-1',
      role: 'VOTER',
    });
  });

  it('does not change the user it was given', () => {
    toPublicUser(user);

    expect(user.passwordHash).toBe('scrypt$somesalt$somehash');
  });
});
