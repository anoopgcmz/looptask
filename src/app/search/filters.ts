export interface PresetSearch {
  _id: string;
  name: string;
  query: string;
}

const formatDate = (d: Date) => d.toISOString().split('T')[0];

export function getPresets(userId?: string | null): PresetSearch[] {
  const presets: PresetSearch[] = [];

  if (userId) {
    presets.push({
      _id: 'preset-myTasks',
      name: 'My Tasks',
      query: `ownerId=${userId}`,
    });
  }

  const today = new Date();
  presets.push({
    _id: 'preset-overdue',
    name: 'Overdue',
    query:
      'status=OPEN&status=IN_PROGRESS&status=IN_REVIEW&status=REVISIONS&status=FLOW_IN_PROGRESS&dueTo=' +
      formatDate(today),
  });

  const start = new Date(today);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day; // start week on Monday
  start.setDate(start.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  presets.push({
    _id: 'preset-thisWeek',
    name: 'This Week',
    query: `dueFrom=${formatDate(start)}&dueTo=${formatDate(end)}`,
  });

  return presets;
}
