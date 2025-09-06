'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import FilterBuilder from '@/components/filter-builder';

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
  const [saved, setSaved] = useState<{ _id: string; name: string; query: string }[]>([]);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const qs = params.toString();
    fetch(`/api/search/global?${qs}`).then((res) => res.json()).then(setData);
  }, [params]);

  useEffect(() => {
    setQ(params.get('q') ?? '');
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

  useEffect(() => {
    const handler = setTimeout(() => {
      if (!q) {
        setSuggestions([]);
        return;
      }
      fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => setSuggestions(data.suggestions || []));
    }, 300);
    return () => clearTimeout(handler);
  }, [q]);

  const chooseSuggestion = (s: string) => {
    setQ(s);
    setSuggestions([]);
  };

  return (
    <div className="p-4">
      <h1 className="text-lg mb-4">Search</h1>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={saveCurrent} className="border rounded px-2 py-1">
          Save Search
        </button>
        {saved.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {saved.map((s) => (
              <li key={s._id}>
                <Link
                  href={`/search?${s.query}`}
                  className="text-blue-600 underline"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form method="GET" className="flex flex-wrap gap-2 mb-4">
        <FilterBuilder />
        <div className="relative">
          <input
            type="text"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="border rounded px-2 py-1"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 bg-white border rounded mt-1 z-10 max-h-40 overflow-auto">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className="block w-full text-left px-2 py-1 hover:bg-gray-100"
                    onClick={() => chooseSuggestion(s)}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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

