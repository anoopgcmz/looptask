import { NextResponse } from 'next/server';
import { GET as searchTasks } from '../tasks/route';
import { GET as searchGlobal } from '../global/route';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'csv';
  url.searchParams.delete('format');

  // Decide which search endpoint to use
  const sort = url.searchParams.get('sort');
  const hasTaskSpecific =
    ['status', 'tag', 'ownerId', 'helpers', 'createdBy', 'teamId', 'visibility'].some((p) =>
      url.searchParams.has(p)
    ) || (sort ? ['relevance', 'updatedAt', 'dueDate'].includes(sort) : false);

  let searchRes: Response;
  if (!hasTaskSpecific) {
    // global search: convert skip to page if present
    const skip = url.searchParams.get('skip');
    if (skip) {
      const limit = Number(url.searchParams.get('limit') || '20');
      const page = Math.floor(Number(skip) / limit) + 1;
      url.searchParams.delete('skip');
      url.searchParams.set('page', String(page));
    }
    searchRes = await searchGlobal(new Request(url.toString(), { headers: req.headers }));
  } else {
    searchRes = await searchTasks(new Request(url.toString(), { headers: req.headers }));
  }

  if (!searchRes.ok) {
    return searchRes;
  }
  const data = await searchRes.json();
  if (format === 'json') {
    return NextResponse.json(data);
  }

  // Build CSV depending on result shape
  let headersRow: string[];
  let rows: string[][];
  if (data.results?.[0]?.type) {
    headersRow = ['id', 'type', 'title', 'excerpt'];
    rows = data.results.map((r: any) => [
      r._id,
      r.type,
      '"' + String(r.title ?? '').replace(/"/g, '""') + '"',
      '"' + String(r.excerpt ?? '').replace(/"/g, '""') + '"',
    ]);
  } else {
    headersRow = ['id', 'title', 'status', 'dueDate'];
    rows = data.results.map((t: any) => [
      t._id,
      '"' + String(t.title ?? '').replace(/"/g, '""') + '"',
      t.status ?? '',
      t.dueDate ? new Date(t.dueDate).toISOString() : '',
    ]);
  }
  const csv = [headersRow.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="search-results.csv"',
    },
  });
}
