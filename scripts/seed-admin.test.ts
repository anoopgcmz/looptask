import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue(undefined),
}));

const organizationMocks = vi.hoisted(() => ({
  orgFindOne: vi.fn(),
  orgCreate: vi.fn(),
}));

vi.mock('@/models/Organization', () => ({
  __esModule: true,
  Organization: {
    findOne: organizationMocks.orgFindOne,
    create: organizationMocks.orgCreate,
  },
}));

const userMocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  userCreate: vi.fn(),
}));

vi.mock('@/models/User', () => ({
  __esModule: true,
  User: {
    findOne: userMocks.userFindOne,
    create: userMocks.userCreate,
  },
}));

const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

import { seedAdmin } from './seed-admin';

describe('seedAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    organizationMocks.orgFindOne.mockReset();
    organizationMocks.orgCreate.mockReset();
    userMocks.userFindOne.mockReset();
    userMocks.userCreate.mockReset();
    logSpy.mockClear();
  });

  it('creates an admin when one does not exist', async () => {
    userMocks.userFindOne.mockResolvedValue(null);
    organizationMocks.orgFindOne.mockResolvedValue(null);
    organizationMocks.orgCreate.mockResolvedValue({ _id: 'org1' });
    userMocks.userCreate.mockResolvedValue({ _id: 'user1' });

    await seedAdmin();

    expect(organizationMocks.orgCreate).toHaveBeenCalledWith({
      name: 'LoopTask',
      domain: 'looptask.local',
    });
    expect(userMocks.userCreate).toHaveBeenCalledWith({
      name: 'LoopTask Admin',
      email: 'admin@looptask.local',
      username: 'admin',
      password: 'admin123',
      organizationId: 'org1',
      role: 'ADMIN',
    });
    expect(logSpy).toHaveBeenCalledWith('Admin account created.', {
      email: 'admin@looptask.local',
      username: 'admin',
      password: 'admin123',
    });
  });

  it('promotes an existing user to admin if necessary', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    userMocks.userFindOne.mockResolvedValue({
      role: 'USER',
      save,
    });

    await seedAdmin();

    expect(save).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Admin account already exists.', {
      email: 'admin@looptask.local',
      username: 'admin',
    });
  });

  it('does not save when existing user is already admin', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    userMocks.userFindOne.mockResolvedValue({
      role: 'ADMIN',
      save,
    });

    await seedAdmin();

    expect(save).not.toHaveBeenCalled();
    expect(organizationMocks.orgCreate).not.toHaveBeenCalled();
    expect(userMocks.userCreate).not.toHaveBeenCalled();
  });
});

afterAll(() => {
  logSpy.mockRestore();
});
