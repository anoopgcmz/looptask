import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import type { ITask } from '../models/Task';
import { canReadTask, canWriteTask } from './access';

describe('task access', () => {
  const creatorId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();
  const helperId = new Types.ObjectId();
  const mentionId = new Types.ObjectId();
  const teamId = new Types.ObjectId();
  const otherTeamId = new Types.ObjectId();
  const otherUserId = new Types.ObjectId();

  const baseTask = {
    creatorId,
    ownerId,
    helpers: [],
    mentions: [],
    teamId,
    visibility: 'PRIVATE',
  } as unknown as ITask;

  it('creator can read and write', () => {
    const task = { ...baseTask };
    const user = { _id: creatorId, teamId };
    expect(canReadTask(user, task)).toBe(true);
    expect(canWriteTask(user, task)).toBe(true);
  });

  it('owner can read and write', () => {
    const task = { ...baseTask };
    const user = { _id: ownerId, teamId };
    expect(canReadTask(user, task)).toBe(true);
    expect(canWriteTask(user, task)).toBe(true);
  });

  it('helper can read but not write', () => {
    const task = { ...baseTask, helpers: [helperId] };
    const user = { _id: helperId, teamId };
    expect(canReadTask(user, task)).toBe(true);
    expect(canWriteTask(user, task)).toBe(false);
  });

  it('mention can read but not write', () => {
    const task = { ...baseTask, mentions: [mentionId] };
    const user = { _id: mentionId, teamId };
    expect(canReadTask(user, task)).toBe(true);
    expect(canWriteTask(user, task)).toBe(false);
  });

  it('team member can read TEAM visibility', () => {
    const task = { ...baseTask, visibility: 'TEAM' };
    const user = { _id: otherUserId, teamId };
    expect(canReadTask(user, task)).toBe(true);
    expect(canWriteTask(user, task)).toBe(false);
  });

  it('non participant cannot read private task', () => {
    const task = { ...baseTask };
    const user = { _id: otherUserId, teamId: otherTeamId };
    expect(canReadTask(user, task)).toBe(false);
    expect(canWriteTask(user, task)).toBe(false);
  });
});
