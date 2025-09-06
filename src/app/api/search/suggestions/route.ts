import { NextResponse, type NextRequest } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  if (!q) {
    return NextResponse.json({ suggestions: [] });
  }

  await dbConnect();

  const access: unknown[] = [
    { participantIds: new Types.ObjectId(session.userId) },
  ];
  if (session.teamId) {
    access.push({ visibility: 'TEAM', teamId: new Types.ObjectId(session.teamId) });
  }

  const useAtlas = process.env.ATLAS_SEARCH === 'true';
  const suggestions = new Set<string>();

  if (useAtlas) {
    const titlePipeline: unknown[] = [
      {
        $search: {
          index: 'tasks',
          autocomplete: { query: q, path: 'title' },
        },
      },
      { $match: { $or: access } },
      { $limit: 5 },
      { $project: { title: 1 } },
    ];
    const titleResults = await Task.aggregate(titlePipeline);
    titleResults.forEach((t: { title?: string }) => {
      if (t.title) suggestions.add(t.title);
    });

    const tagPipeline: unknown[] = [
      {
        $search: {
          index: 'tasks',
          autocomplete: { query: q, path: 'tags' },
        },
      },
      { $match: { $or: access } },
      { $limit: 5 },
      { $project: { tags: 1 } },
    ];
    const tagResults = await Task.aggregate(tagPipeline);
    tagResults.forEach((t: { tags?: string[] }) => {
      t.tags?.forEach((tag: string) => suggestions.add(tag));
    });
  } else {
    const regex = new RegExp('^' + q, 'i');
    const results = await Task.find(
      { $and: [{ $or: [{ title: regex }, { tags: regex }] }, { $or: access }] },
      { title: 1, tags: 1 }
    )
      .limit(10)
      .lean();
    results.forEach((t: { title?: string; tags?: string[] }) => {
      if (t.title && regex.test(t.title)) suggestions.add(t.title);
      t.tags?.forEach((tag: string) => {
        if (regex.test(tag)) suggestions.add(tag);
      });
    });
  }

  return NextResponse.json({ suggestions: Array.from(suggestions).slice(0, 10) });
}

