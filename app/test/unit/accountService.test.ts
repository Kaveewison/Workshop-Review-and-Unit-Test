import { hashPassword } from '../../src/auth/passwords';
import { Principal, TokenService } from '../../src/auth/tokenService';
import { District, Role, User } from '../../src/domain/types';
import { ConflictError, UnauthorizedError, ValidationError } from '../../src/errors';
import { DistrictRepository } from '../../src/repositories/districtRepository';
import { NewUser, UserRepository } from '../../src/repositories/userRepository';
import { AccountService, Registration } from '../../src/services/accountService';

const CM1: District = { id: 'CM-1', province: 'เชียงใหม่', number: 1 };

const aRegistration = (overrides: Partial<Registration> = {}): Registration => ({
  nationalId: '1509900000017',
  password: 'voter1234',
  firstName: 'สมชาย',
  lastName: 'ใจดี',
  address: 'CAMT',
  districtId: 'CM-1',
  ...overrides,
});

// Dummy: ต้องส่งให้ constructor ครบ แต่ test นี้ไม่ควรเรียกใช้เลย — ถ้าถูกเรียกจะพังทันที
const dummyTokens: TokenService = {
  issue: () => {
    throw new Error('dummy TokenService should not be used');
  },
  verify: () => {
    throw new Error('dummy TokenService should not be used');
  },
};

// Stub: คืนเขตที่เรากำหนดเอง (input ทางอ้อม) — ไม่ต้องมี Postgres
const stubDistricts = (district: District | null = CM1): DistrictRepository => ({
  findById: jest.fn().mockResolvedValue(district),
  findAll: jest.fn().mockResolvedValue(district ? [district] : []),
});

// jest.fn() ที่ยังไม่ถูกตั้งค่า — ใช้เป็น spy/mock ได้ แล้วแต่ว่าจะตรวจอะไร
const stubUsers = (existing: User | null = null): jest.Mocked<UserRepository> => ({
  findById: jest.fn(),
  findByNationalId: jest.fn().mockResolvedValue(existing),
  create: jest.fn().mockImplementation(async (user: NewUser) => ({ id: 1, role: 'VOTER', ...user })),
  updateRole: jest.fn(),
});

// Fake: implementation จริงแต่ง่ายกว่า เก็บใน Map แทน database — จำสิ่งที่ create ไปแล้วได้เอง
class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<number, User>();
  private nextId = 1;

  async findById(id: number) {
    return this.users.get(id) ?? null;
  }

  async findByNationalId(nationalId: string) {
    return [...this.users.values()].find((user) => user.nationalId === nationalId) ?? null;
  }

  async create(user: NewUser) {
    const created: User = { id: this.nextId++, role: 'VOTER', ...user };
    this.users.set(created.id, created);
    return created;
  }

  async updateRole(id: number, role: Role) {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, role };
    this.users.set(id, updated);
    return updated;
  }
}

describe('AccountService', () => {
  describe('register', () => {
    it('registers a voter in an existing district (stub DistrictRepository, dummy TokenService)', async () => {
      // stub districts: ตอบว่ามีเขต CM-1 · dummy tokens: register ไม่ได้ใช้ token
      const service = new AccountService(stubUsers(), stubDistricts(), dummyTokens);

      const user = await service.register(aRegistration());

      expect(user).toMatchObject({ nationalId: '1509900000017', districtId: 'CM-1', role: 'VOTER' });
    });

    it('rejects an unknown district', async () => {
      // stub districts: ตอบว่าไม่พบเขต (null) — บังคับให้เข้าเส้นทาง error
      const service = new AccountService(stubUsers(), stubDistricts(null), dummyTokens);

      const result = service.register(aRegistration({ districtId: 'XX-9' }));

      await expect(result).rejects.toThrow(ValidationError);
    });

    it('stores a hash, never the plain-text password (spy on UserRepository.create)', async () => {
      // spy: users.create บันทึกว่าได้รับข้อมูลอะไร (output ทางอ้อม) แล้วเรามาตรวจทีหลัง
      const users = stubUsers();
      const service = new AccountService(users, stubDistricts(), dummyTokens);

      await service.register(aRegistration({ password: 'voter1234' }));

      const saved = users.create.mock.calls[0][0];
      expect(saved.passwordHash).not.toContain('voter1234');
      expect(saved).not.toHaveProperty('password');
    });

    it('rejects a national id that is already registered (fake UserRepository)', async () => {
      // fake: สมัครครั้งแรกผ่าน fake จะจำไว้เอง ครั้งที่สองจึงเจอซ้ำ — ไม่ต้อง stub ค่าทีละครั้ง
      const service = new AccountService(new InMemoryUserRepository(), stubDistricts(), dummyTokens);
      await service.register(aRegistration());

      const second = service.register(aRegistration());

      await expect(second).rejects.toThrow(ConflictError);
    });

    it('does not save anything when the national id is invalid (mock: create not called)', async () => {
      // mock: ตั้ง expectation ว่า users.create ต้องไม่ถูกเรียกเลย
      const users = stubUsers();
      const service = new AccountService(users, stubDistricts(), dummyTokens);

      await expect(service.register(aRegistration({ nationalId: '1509900000018' }))).rejects.toThrow(ValidationError);

      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const existing: User = {
      id: 42,
      nationalId: '1509900000017',
      passwordHash: hashPassword('voter1234'),
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      address: 'CAMT',
      districtId: 'CM-1',
      role: 'VOTER',
    };

    it('issues a token for the user (mock TokenService.issue called with the principal)', async () => {
      // stub users: คืนผู้ใช้ที่มีอยู่ · mock tokens.issue: ต้องถูกเรียกด้วย principal ที่ถูกต้อง
      const tokens = { issue: jest.fn().mockReturnValue('signed-token'), verify: jest.fn() };
      const service = new AccountService(stubUsers(existing), stubDistricts(), tokens);

      const token = await service.login('1509900000017', 'voter1234');

      expect(tokens.issue).toHaveBeenCalledWith<[Principal]>({ userId: 42, role: 'VOTER', districtId: 'CM-1' });
      expect(token).toBe('signed-token');
    });

    it('rejects a wrong password without issuing a token', async () => {
      // mock tokens.issue: รหัสผิดต้องไม่ได้ token
      const tokens = { issue: jest.fn(), verify: jest.fn() };
      const service = new AccountService(stubUsers(existing), stubDistricts(), tokens);

      await expect(service.login('1509900000017', 'wrong-password')).rejects.toThrow(UnauthorizedError);

      expect(tokens.issue).not.toHaveBeenCalled();
    });
  });

  describe('changeRole', () => {
    it('refuses to make anyone an ADMIN', async () => {
      // mock users.updateRole: ต้องไม่ถูกเรียก · dummy districts/tokens: changeRole ไม่ได้ใช้
      const users = stubUsers();
      const service = new AccountService(users, stubDistricts(), dummyTokens);

      await expect(service.changeRole(42, 'ADMIN')).rejects.toThrow(ValidationError);

      expect(users.updateRole).not.toHaveBeenCalled();
    });
  });
});
