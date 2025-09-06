'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface FilterRow {
  field: string;
  op: string;
  value: string;
}

export default function FilterBuilder() {
  const params = useSearchParams();
  const [filters, setFilters] = useState<FilterRow[]>(() => {
    try {
      const existing = params.get('filters');
      if (existing) {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [{ field: '', op: 'eq', value: '' }];
  });
  const [logic, setLogic] = useState<'AND' | 'OR'>(
    params.get('logic') === 'OR' ? 'OR' : 'AND'
  );

  useEffect(() => {
    // update if params change
    try {
      const existing = params.get('filters');
      if (existing) {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed) && parsed.length) {
          setFilters(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
    setLogic(params.get('logic') === 'OR' ? 'OR' : 'AND');
  }, [params]);

  const update = (i: number, key: keyof FilterRow, val: string) => {
    const next = [...filters];
    next[i] = { ...next[i], [key]: val };
    setFilters(next);
  };

  return (
    <div className="flex flex-col gap-2 mb-2">
      <input type="hidden" name="filters" value={JSON.stringify(filters)} />
      <div className="flex items-center gap-2">
        <label className="text-sm">Logic</label>
        <select
          name="logic"
          value={logic}
          onChange={(e) => setLogic(e.target.value as 'AND' | 'OR')}
          className="border rounded px-2 py-1"
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      </div>
      {filters.map((f, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={f.field}
            onChange={(e) => update(i, 'field', e.target.value)}
            placeholder="field"
            className="border rounded px-2 py-1"
          />
          <select
            value={f.op}
            onChange={(e) => update(i, 'op', e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="eq">=</option>
            <option value="ne">!=</option>
            <option value="gt">&gt;</option>
            <option value="gte">&gt;=</option>
            <option value="lt">&lt;</option>
            <option value="lte">&lt;=</option>
            <option value="regex">contains</option>
          </select>
          <input
            type="text"
            value={f.value}
            onChange={(e) => update(i, 'value', e.target.value)}
            placeholder="value"
            className="border rounded px-2 py-1"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setFilters([...filters, { field: '', op: 'eq', value: '' }])}
        className="border rounded px-2 py-1 w-fit"
      >
        + Filter
      </button>
    </div>
  );
}

