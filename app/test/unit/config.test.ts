import { loadConfig } from '../../src/config';

describe('loadConfig', () => {
  describe('when the env is empty', () => {
    const config = loadConfig({});

    it('uses port 3000', () => {
      expect(config.port).toBe(3000);
    });

    it('uses the local dev database', () => {
      expect(config.databaseUrl).toBe('postgres://election:election@localhost:5432/election_dev');
    });

    it('uses the dev JWT secret', () => {
      expect(config.jwtSecret).toBe('dev-secret');
    });
  });

  describe('when the env has values', () => {
    const config = loadConfig({
      PORT: '8080',
      JWT_SECRET: 'test-secret',
      DATABASE_URL: 'postgres://user:pass@db:5432/election_test',
    });

    it('reads PORT as a number', () => {
      expect(config.port).toBe(8080);
    });

    it('reads JWT_SECRET', () => {
      expect(config.jwtSecret).toBe('test-secret');
    });

    it('reads DATABASE_URL', () => {
      expect(config.databaseUrl).toBe('postgres://user:pass@db:5432/election_test');
    });
  });
});
