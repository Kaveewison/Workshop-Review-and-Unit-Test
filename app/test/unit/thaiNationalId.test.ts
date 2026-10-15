import { isValidThaiNationalId } from '../../src/domain/thaiNationalId';

describe('isValidThaiNationalId', () => {
  it.each(['1509900000017', '1100000000016'])('accepts %s whose last digit matches the checksum', (id) => {
    const valid = isValidThaiNationalId(id);

    expect(valid).toBe(true);
  });

  it('rejects an id with a wrong checksum digit', () => {
    expect(isValidThaiNationalId('1509900000018')).toBe(false);
  });

  it.each(['', '150990000001', '15099000000170', '150990000001x', 'abcdefghijklm'])('rejects malformed id "%s"', (id) => {
    expect(isValidThaiNationalId(id)).toBe(false);
  });
});
