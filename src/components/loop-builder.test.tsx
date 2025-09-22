import { describe, expect, it } from 'vitest';
import { normalizeLoopSteps, type LoopStep } from '@/hooks/useLoopBuilder';
import { buildLoopSaveRequest } from './loop-builder';

describe('loop builder helpers', () => {
  it('normalizes existing loop data without dropping steps', () => {
    const normalized = normalizeLoopSteps([
      { assignedTo: 'user-1', description: 'First step' },
      { assignedTo: 'user-2', description: 'Second step', dependencies: [0] },
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.description).toBe('First step');
    expect(normalized[1]?.description).toBe('Second step');
    expect(normalized[1]?.dependencies).toHaveLength(1);
    const dependencyId = normalized[1]?.dependencies?.[0];
    expect(dependencyId).toBeDefined();
    expect(normalized[0]?.id).toBe(dependencyId);
  });

  it('builds a PATCH request when editing an existing loop', () => {
    const steps: LoopStep[] = [
      {
        id: '0',
        index: 0,
        assignedTo: 'user-1',
        description: 'Updated description',
        dependencies: [],
      },
    ];

    const request = buildLoopSaveRequest(steps, true);
    expect(request.method).toBe('PATCH');
    expect(request.body.sequence).toEqual([
      { index: 0, assignedTo: 'user-1', description: 'Updated description' },
    ]);
    expect(request.orderedSteps).toHaveLength(1);
    expect(request.orderedSteps[0]?.description).toBe('Updated description');
  });
});
