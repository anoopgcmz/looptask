import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue(undefined),
}));

const orgDeleteMany = vi.fn().mockResolvedValue(undefined);
const orgCreate = vi.fn().mockResolvedValue([
  { _id: 'org1', name: 'Acme', domain: 'acme.com' },
]);
vi.mock('@/models/Organization', () => ({
  __esModule: true,
  default: { deleteMany: orgDeleteMany, create: orgCreate },
}));

const teamDeleteMany = vi.fn().mockResolvedValue(undefined);
const teamCreate = vi.fn().mockResolvedValue({ _id: 'team1', name: 'Team' });
vi.mock('@/models/Team', () => ({
  __esModule: true,
  default: { deleteMany: teamDeleteMany, create: teamCreate },
}));

const userDeleteMany = vi.fn().mockResolvedValue(undefined);
const userCreate = vi.fn().mockResolvedValue([
  { _id: 'u1' },
  { _id: 'u2' },
  { _id: 'u3' },
  { _id: 'u4' },
]);
vi.mock('@/models/User', () => ({
  __esModule: true,
  default: { deleteMany: userDeleteMany, create: userCreate },
}));

const taskDeleteMany = vi.fn().mockResolvedValue(undefined);
const taskCreate = vi.fn().mockResolvedValue({ _id: 't1' });
vi.mock('@/models/Task', () => ({
  __esModule: true,
  default: { deleteMany: taskDeleteMany, create: taskCreate },
}));

import { seed } from './seed';

describe('seed script', () => {
  it('clears collections before seeding', async () => {
    await seed();
    expect(orgDeleteMany).toHaveBeenCalledWith({});
    expect(teamDeleteMany).toHaveBeenCalledWith({});
    expect(userDeleteMany).toHaveBeenCalledWith({});
    expect(taskDeleteMany).toHaveBeenCalledWith({});
  });
});

