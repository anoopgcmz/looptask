'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SearchResult {
  _id: string;
  title: string;
  excerpt: string;
}

export default function TaskSearchPage() {
  const params = useSearchParams();
  const [data, setData] = useState<{ results: SearchResult[]; verification: any }>();

  useEffect(() => {
    const qs = params.toString();
    fetch(`/api/search/tasks?${qs}`).then((res) => res.json()).then(setData);
  }, [params]);

  return (
    <div className="p-4">
      <h1 className="text-lg mb-4">Task Search</h1>
      <form method="GET" className="flex flex-wrap gap-2 mb-4">
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
        <input
          type="date"
          name="dueFrom"
          defaultValue={params.get('dueFrom') ?? ''}
          className="border rounded px-2 py-1"
        />
        <input
          type="date"
          name="dueTo"
          defaultValue={params.get('dueTo') ?? ''}
          className="border rounded px-2 py-1"
        />
        <input
          type="text"
          name="ownerId"
          defaultValue={params.get('ownerId') ?? ''}
          placeholder="ownerId"
          className="border rounded px-2 py-1"
        />
        <input
          type="text"
          name="createdBy"
          defaultValue={params.get('createdBy') ?? ''}
          placeholder="createdBy"
          className="border rounded px-2 py-1"
        />
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

