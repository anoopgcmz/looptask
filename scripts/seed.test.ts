import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue(undefined),
}));

const orgDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const orgCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ _id: 'org1', name: 'Acme', domain: 'acme.com' }])
);
vi.mock('@/models/Organization', () => ({
  __esModule: true,
  Organization: { deleteMany: orgDeleteMany, create: orgCreate },
}));

const teamDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const teamCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ _id: 'team1', name: 'Team' })
);
vi.mock('@/models/Team', () => ({
  __esModule: true,
  Team: { deleteMany: teamDeleteMany, create: teamCreate },
}));

const userDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const userCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue([
    { _id: 'u1' },
    { _id: 'u2' },
    { _id: 'u3' },
    { _id: 'u4' },
  ])
);
vi.mock('@/models/User', () => ({
  __esModule: true,
  User: { deleteMany: userDeleteMany, create: userCreate },
}));

const taskDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const taskCreate = vi.hoisted(() => vi.fn().mockResolvedValue({ _id: 't1' }));
vi.mock('@/models/Task', () => ({
  __esModule: true,
  Task: { deleteMany: taskDeleteMany, create: taskCreate },
}));

const taskLoopDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const taskLoopCreate = vi.hoisted(() => vi.fn().mockResolvedValue({ _id: 'loop1' }));
vi.mock('@/models/TaskLoop', () => ({
  __esModule: true,
  TaskLoop: { deleteMany: taskLoopDeleteMany, create: taskLoopCreate },
}));

const loopHistoryDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const loopHistoryCreate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/models/LoopHistory', () => ({
  __esModule: true,
  LoopHistory: { deleteMany: loopHistoryDeleteMany, create: loopHistoryCreate },
}));

const projectTypeDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const projectTypeCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue([
    { _id: 'ptype1' },
    { _id: 'ptype2' },
  ])
);
vi.mock('@/models/ProjectType', () => ({
  __esModule: true,
  ProjectType: { deleteMany: projectTypeDeleteMany, create: projectTypeCreate },
}));

const projectDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const projectCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue([
    { _id: 'proj1' },
    { _id: 'proj2' },
  ])
);
vi.mock('@/models/Project', () => ({
  __esModule: true,
  Project: { deleteMany: projectDeleteMany, create: projectCreate },
}));

import { seed } from './seed';

describe('seed script', () => {
  it('clears collections before seeding', async () => {
    await seed();
    expect(orgDeleteMany).toHaveBeenCalledWith({});
    expect(teamDeleteMany).toHaveBeenCalledWith({});
    expect(userDeleteMany).toHaveBeenCalledWith({});
    expect(taskDeleteMany).toHaveBeenCalledWith({});
    expect(projectTypeDeleteMany).toHaveBeenCalledWith({});
    expect(projectDeleteMany).toHaveBeenCalledWith({});
  });
});

