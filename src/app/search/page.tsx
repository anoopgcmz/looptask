'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import FilterBuilder from '@/components/filter-builder';
import { useSession } from 'next-auth/react';
import { getPresets } from './filters';
import type {
  SearchItem,
  GlobalSearchResponse,
  SavedSearch,
  SuggestionsResponse,
} from '@/types/api/search';

export default function GlobalSearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const presets = getPresets(session?.userId);
  const [data, setData] = useState<GlobalSearchResponse>();
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const qs = params.toString();
    const run = async () => {
      const res = await fetch(`/api/search/global?${qs}`);
      if (!res.ok) return;
      setData((await res.json()) as GlobalSearchResponse);
    };
    void run();
  }, [params]);

  useEffect(() => {
    setQ(params.get('q') ?? '');
  }, [params]);

  useEffect(() => {
    const run = async () => {
      const res = await fetch('/api/search/saved');
      if (!res.ok) return;
      setSaved((await res.json()) as SavedSearch[]);
    };
    void run();
  }, []);

  const saveCurrent = async () => {
    const name = prompt('Name this search');
    if (!name) return;
    const qs = params.toString();
    const res = await fetch('/api/search/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, query: qs }),
    });
    if (!res.ok) return;
    const savedRes = await fetch('/api/search/saved');
    if (!savedRes.ok) return;
    setSaved((await savedRes.json()) as SavedSearch[]);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      const run = async () => {
        if (!q) {
          setSuggestions([]);
          return;
        }
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(q)}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as SuggestionsResponse;
        setSuggestions(data.suggestions || []);
      };
      void run();
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
      {presets.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p._id}
              onClick={() => router.push(`?${p.query}`)}
              className="border rounded px-2 py-1"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={saveCurrent} className="border rounded px-2 py-1">
          Save Search
        </button>
        <a
          href={`/api/search/export?${params.toString()}`}
          className="border rounded px-2 py-1"
        >
          Export
        </a>
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
              {suggestions.map((s: string) => (
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
              <span
                dangerouslySetInnerHTML={{ __html: r.title || '(no title)' }}
              />
            </Link>
            {r.excerpt && (
              <div
                className="text-sm text-gray-700"
                dangerouslySetInnerHTML={{ __html: r.excerpt }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

