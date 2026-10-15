import { hashPassword, verifyPassword } from '../../src/auth/passwords';

describe('hashPassword', () => {
  it('does not return the plain text password', () => {
    const hash = hashPassword('voter1234');

    expect(hash).not.toContain('voter1234');
  });

  it('gives a different hash each time for the same password (random salt)', () => {
    const first = hashPassword('voter1234');

    const second = hashPassword('voter1234');

    expect(second).not.toBe(first);
  });
});

describe('verifyPassword', () => {
  const stored = hashPassword('voter1234');

  it('accepts the correct password', () => {
    const ok = verifyPassword('voter1234', stored);

    expect(ok).toBe(true);
  });

  it('rejects a wrong password', () => {
    const ok = verifyPassword('voter12345', stored);

    expect(ok).toBe(false);
  });

  it.each(['garbage', '', 'bcrypt$salt$hash', 'scrypt$$hash', 'scrypt$salt$'])(
    'returns false instead of throwing for a malformed stored hash "%s"',
    (malformed) => {
      const ok = verifyPassword('voter1234', malformed);

      expect(ok).toBe(false);
    },
  );
});
