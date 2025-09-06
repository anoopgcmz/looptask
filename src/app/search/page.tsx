'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SearchItem {
  _id: string;
  type: 'task' | 'loop' | 'comment';
  taskId: string;
  title: string;
  excerpt: string;
}

export default function GlobalSearchPage() {
  const params = useSearchParams();
  const [data, setData] = useState<{ results: SearchItem[]; total: number }>();

  useEffect(() => {
    const qs = params.toString();
    fetch(`/api/search/global?${qs}`).then((res) => res.json()).then(setData);
  }, [params]);

  return (
    <div className="p-4">
      <h1 className="text-lg mb-4">Search</h1>
      <form method="GET" className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          name="q"
          defaultValue={params.get('q') ?? ''}
          placeholder="Search"
          className="border rounded px-2 py-1"
        />
        <input
          type="number"
          name="limit"
          defaultValue={params.get('limit') ?? '20'}
          className="border rounded px-2 py-1 w-20"
        />
        <input
          type="number"
          name="skip"
          defaultValue={params.get('skip') ?? '0'}
          className="border rounded px-2 py-1 w-20"
        />
        <select
          name="sort"
          defaultValue={params.get('sort') ?? 'recent'}
          className="border rounded px-2 py-1"
        >
          <option value="recent">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <button type="submit" className="border rounded px-2 py-1">
          Apply
        </button>
      </form>
      <ul>
        {data?.results?.map((r) => (
          <li key={r.type + r._id} className="mb-4">
            <div className="text-xs uppercase text-gray-500">{r.type}</div>
            <Link
              href={r.type === 'task' ? `/tasks/${r._id}` : `/tasks/${r.taskId}`}
              className="font-semibold text-blue-600"
            >
              {r.title || '(no title)'}
            </Link>
            {r.excerpt && (
              <div className="text-sm text-gray-700">{r.excerpt}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

