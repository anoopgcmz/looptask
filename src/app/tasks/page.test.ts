import { describe, expect, it } from 'vitest';
import { buildTaskQueryParams, type TaskFilterState } from './page';

describe('buildTaskQueryParams', () => {
  const baseFilters: TaskFilterState = {
    assignee: '',
    priority: '',
    dueFrom: '',
    dueTo: '',
    sort: '',
    projectId: '',
  };

  it('includes projectId when provided', () => {
    const params = buildTaskQueryParams(
      { ...baseFilters, projectId: 'project-123' },
      'design',
      ['OPEN', 'IN_PROGRESS'],
      2,
    );

    expect(params.get('projectId')).toBe('project-123');
    expect(params.get('page')).toBe('2');
    expect(params.getAll('status')).toEqual(['OPEN', 'IN_PROGRESS']);
    expect(params.get('q')).toBe('design');
  });

  it('omits projectId when empty', () => {
    const params = buildTaskQueryParams(baseFilters, '', ['DONE'], 1);

    expect(params.get('projectId')).toBeNull();
    expect(params.get('page')).toBe('1');
    expect(params.getAll('status')).toEqual(['DONE']);
  });
});
