import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { POST as upsertObjective, GET as listObjectives } from './route';
import { PATCH as toggleObjective } from './[id]/route';
import { GET as dailyDashboard } from '../dashboard/daily/route';

vi.mock('@/lib/db', () => ({ default: vi.fn() }));

const objectives = new Map<string, unknown>();
const tasks = new Map<string, unknown>();

vi.mock('@/models/Objective', () => ({
  default: {
    create: vi.fn(async (doc: unknown) => {
      const _id = doc._id || new Types.ObjectId();
      const objective = { ...doc, _id };
      objective.save = async () => {
        objectives.set(_id.toString(), objective);
      };
      objectives.set(_id.toString(), objective);
      return objective;
    }),
    find: vi.fn(async (filter: unknown) => {
      return Array.from(objectives.values()).filter(
        (o) =>
          o.date === filter.date &&
          o.teamId.toString() === filter.teamId.toString()
      );
    }),
    findById: vi.fn(async (id: string) => {
      const obj = objectives.get(id);
      if (!obj) return null;
      obj.save = async () => {
        objectives.set(id, obj);
      };
      return obj;
    }),
  },
}));

vi.mock('@/models/Task', () => ({
  default: {
    find: vi.fn(async (filter: unknown) => {
      return Array.from(tasks.values()).filter((t) => {
        const due =
          t.dueDate >= filter.dueDate.$gte && t.dueDate < filter.dueDate.$lt;
        const accessible = filter.$or.some((c: unknown) => {
          if (c.participantIds) {
            return t.participantIds.some(
              (p: unknown) => p.toString() === c.participantIds.toString()
            );
          }
          if (c.visibility) {
            return (
              t.visibility === c.visibility &&
              t.teamId?.toString() === c.teamId.toString()
            );
          }
          return false;
        });
        return due && accessible;
      });
    }),
  },
}));

let session: unknown = {};
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => session) }));

const { Types } = mongoose;

describe('objectives api', () => {
  beforeEach(() => {
    objectives.clear();
    tasks.clear();
  });

  it('create/complete objectives and dashboard', async () => {
    const teamId = new Types.ObjectId();
    const u1 = new Types.ObjectId();
    const u2 = new Types.ObjectId();
    session = { userId: u1.toString(), teamId: teamId.toString() };

    let res = await upsertObjective(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({
          date: '2023-01-01',
          teamId: teamId.toString(),
          title: 'obj1',
          ownerId: u1.toString(),
        }),
      })
    );
    const obj1 = await res.json();

    res = await upsertObjective(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({
          date: '2023-01-01',
          teamId: teamId.toString(),
          title: 'obj2',
          ownerId: u2.toString(),
        }),
      })
    );
    await res.json();

    res = await listObjectives(
      new Request(
        `http://test?date=2023-01-01&teamId=${teamId.toString()}`
      )
    );
    const list = await res.json();
    expect(list.length).toBe(2);

    await toggleObjective(new Request('http://test', { method: 'PATCH' }), {
      params: { id: obj1._id },
    });

    const task1 = {
      _id: new Types.ObjectId(),
      title: 't1',
      ownerId: u1,
      dueDate: new Date('2023-01-01T10:00:00Z'),
      participantIds: [u1],
    };
    const task2 = {
      _id: new Types.ObjectId(),
      title: 't2',
      ownerId: u2,
      dueDate: new Date('2023-01-01T12:00:00Z'),
      visibility: 'TEAM',
      teamId,
      participantIds: [],
    };
    tasks.set(task1._id.toString(), task1);
    tasks.set(task2._id.toString(), task2);

    res = await dailyDashboard(
      new Request(
        `http://test?date=2023-01-01&teamId=${teamId.toString()}`
      )
    );
    const dash = await res.json();
    const s1 = dash.summary.find((s: unknown) => s.ownerId === u1.toString());
    const s2 = dash.summary.find((s: unknown) => s.ownerId === u2.toString());
    expect(s1.completed).toBe(1);
    expect(s1.total).toBe(1);
    expect(s2.completed).toBe(0);
    expect(s2.total).toBe(1);
    expect(dash.pending.length).toBe(1);
    expect(dash.tasks.length).toBe(2);
  });
});

