'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import FilterBuilder from '@/components/filter-builder';

interface SearchResult {
  _id: string;
  title: string;
  excerpt: string;
}

export default function TaskSearchPage() {
  const params = useSearchParams();
  const [data, setData] = useState<{ results: SearchResult[]; verification: any }>();
  const [saved, setSaved] = useState<{ _id: string; name: string; query: string }[]>([]);

  const [ownerIds, setOwnerIds] = useState<string[]>(() => {
    const vals = params.getAll('ownerId');
    return vals.length ? vals : [''];
  });
  const [helperIds, setHelperIds] = useState<string[]>(() => {
    const vals = params.getAll('helpers');
    return vals.length ? vals : [''];
  });
  const [createdByIds, setCreatedByIds] = useState<string[]>(() => {
    const vals = params.getAll('createdBy');
    return vals.length ? vals : [''];
  });
  const [dueRanges, setDueRanges] = useState<{ from: string; to: string }[]>(() => {
    const froms = params.getAll('dueFrom');
    const tos = params.getAll('dueTo');
    const max = Math.max(froms.length, tos.length, 1);
    return Array.from({ length: max }, (_, i) => ({ from: froms[i] ?? '', to: tos[i] ?? '' }));
  });
  const initialCustom = Array.from(params.entries())
    .filter(([k]) => k.startsWith('custom['))
    .map(([k, v]) => ({ key: k.slice(7, -1), value: v }));
  const [customFilters, setCustomFilters] = useState<{ key: string; value: string }[]>(
    initialCustom.length ? initialCustom : [{ key: '', value: '' }]
  );

  useEffect(() => {
    const qs = params.toString();
    fetch(`/api/search/tasks?${qs}`).then((res) => res.json()).then(setData);
  }, [params]);

  useEffect(() => {
    fetch('/api/search/saved').then((res) => res.json()).then(setSaved);
  }, []);

  const saveCurrent = () => {
    const name = prompt('Name this search');
    if (!name) return;
    const qs = params.toString();
    fetch('/api/search/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, query: qs }),
    }).then(() =>
      fetch('/api/search/saved').then((res) => res.json()).then(setSaved)
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-lg mb-4">Task Search</h1>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={saveCurrent} className="border rounded px-2 py-1">
          Save Search
        </button>
        {saved.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {saved.map((s) => (
              <li key={s._id}>
                <a
                  href={`/search/tasks?${s.query}`}
                  className="text-blue-600 underline"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form method="GET" className="flex flex-wrap gap-2 mb-4">
        <FilterBuilder />
        <input
          type="text"
          name="q"
          defaultValue={params.get('q') ?? ''}
          placeholder="Search"
          className="border rounded px-2 py-1"
        />
        <select
          name="status"
          multiple
          defaultValue={params.getAll('status')}
          className="border rounded px-2 py-1"
        >
          {['OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'REVISIONS', 'FLOW_IN_PROGRESS', 'DONE'].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            )
          )}
        </select>
        <input
          type="text"
          name="tag"
          defaultValue={params.get('tag') ?? ''}
          placeholder="tag"
          className="border rounded px-2 py-1"
        />
        {dueRanges.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="date"
              name="dueFrom"
              defaultValue={r.from}
              className="border rounded px-2 py-1"
            />
            <input
              type="date"
              name="dueTo"
              defaultValue={r.to}
              className="border rounded px-2 py-1"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setDueRanges([...dueRanges, { from: '', to: '' }])}
          className="border rounded px-2 py-1"
        >
          + Due
        </button>
        {ownerIds.map((v, i) => (
          <input
            key={i}
            type="text"
            name="ownerId"
            defaultValue={v}
            placeholder="ownerId"
            className="border rounded px-2 py-1"
          />
        ))}
        <button
          type="button"
          onClick={() => setOwnerIds([...ownerIds, ''])}
          className="border rounded px-2 py-1"
        >
          + Owner
        </button>
        {helperIds.map((v, i) => (
          <input
            key={i}
            type="text"
            name="helpers"
            defaultValue={v}
            placeholder="helperId"
            className="border rounded px-2 py-1"
          />
        ))}
        <button
          type="button"
          onClick={() => setHelperIds([...helperIds, ''])}
          className="border rounded px-2 py-1"
        >
          + Helper
        </button>
        {createdByIds.map((v, i) => (
          <input
            key={i}
            type="text"
            name="createdBy"
            defaultValue={v}
            placeholder="createdBy"
            className="border rounded px-2 py-1"
          />
        ))}
        <button
          type="button"
          onClick={() => setCreatedByIds([...createdByIds, ''])}
          className="border rounded px-2 py-1"
        >
          + Creator
        </button>
        <input
          type="text"
          name="teamId"
          defaultValue={params.get('teamId') ?? ''}
          placeholder="teamId"
          className="border rounded px-2 py-1"
        />
        <select
          name="visibility"
          defaultValue={params.get('visibility') ?? ''}
          className="border rounded px-2 py-1"
        >
          <option value="">Any visibility</option>
          <option value="PRIVATE">PRIVATE</option>
          <option value="TEAM">TEAM</option>
        </select>
        <select
          name="sort"
          defaultValue={params.get('sort') ?? 'relevance'}
          className="border rounded px-2 py-1"
        >
          <option value="relevance">Relevance</option>
          <option value="updatedAt">Updated</option>
          <option value="dueDate">Due date</option>
        </select>
        {customFilters.map((cf, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={cf.key}
              onChange={(e) => {
                const next = [...customFilters];
                next[i].key = e.target.value;
                setCustomFilters(next);
              }}
              placeholder="custom field"
              className="border rounded px-2 py-1"
            />
            <input
              type="text"
              name={cf.key ? `custom[${cf.key}]` : undefined}
              value={cf.value}
              onChange={(e) => {
                const next = [...customFilters];
                next[i].value = e.target.value;
                setCustomFilters(next);
              }}
              placeholder="value"
              className="border rounded px-2 py-1"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setCustomFilters([...customFilters, { key: '', value: '' }])}
          className="border rounded px-2 py-1"
        >
          + Custom
        </button>
        <button type="submit" className="border rounded px-2 py-1">
          Apply
        </button>
      </form>
      {data?.verification && (
        <p className="mb-2 text-sm text-gray-600">
          Search for "{data.verification.q}" with filters applied
        </p>
      )}
      <ul>
        {data?.results?.map((t) => (
          <li key={t._id} className="mb-4">
            <div className="font-semibold">{t.title}</div>
            {t.excerpt && (
              <div
                className="text-sm text-gray-700"
                dangerouslySetInnerHTML={{ __html: t.excerpt }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

