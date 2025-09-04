import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';

const querySchema = z.object({
  q: z.string().optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : []))
    .optional(),
  tag: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : []))
    .optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  ownerId: z.string().optional(),
  createdBy: z.string().optional(),
  teamId: z.string().optional(),
  visibility: z.enum(['PRIVATE', 'TEAM']).optional(),
  sort: z.enum(['relevance', 'updatedAt', 'dueDate']).optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }

  const url = new URL(req.url);
  const raw: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    if (raw[key]) {
      raw[key] = Array.isArray(raw[key])
        ? [...(raw[key] as string[]), value]
        : [raw[key] as string, value];
    } else {
      raw[key] = value;
    }
  });

  let query: z.infer<typeof querySchema>;
  try {
    query = querySchema.parse(raw);
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }

  await dbConnect();

  const filter: any = {};
  if (query.ownerId) filter.ownerId = new Types.ObjectId(query.ownerId);
  if (query.createdBy) filter.createdBy = new Types.ObjectId(query.createdBy);
  if (query.status && query.status.length) filter.status = { $in: query.status };
  if (query.dueFrom || query.dueTo) {
    filter.dueDate = {};
    if (query.dueFrom) filter.dueDate.$gte = query.dueFrom;
    if (query.dueTo) filter.dueDate.$lte = query.dueTo;
  }
  if (query.tag && query.tag.length) filter.tags = { $in: query.tag };
  if (query.visibility) filter.visibility = query.visibility;
  if (query.teamId) filter.teamId = new Types.ObjectId(query.teamId);

  const access: any[] = [
    { participantIds: new Types.ObjectId(session.userId) },
  ];
  if (session.teamId) {
    access.push({ visibility: 'TEAM', teamId: new Types.ObjectId(session.teamId) });
  }

  const useAtlas = process.env.ATLAS_SEARCH === 'true';

  let results: any[] = [];
  if (useAtlas && query.q) {
    const pipeline: any[] = [
      {
        $search: {
          index: 'tasks',
          compound: {
            should: [
              {
                text: {
                  query: query.q!,
                  path: ['title', 'description'],
                },
              },
              {
                text: {
                  query: query.q!,
                  path: 'comments.content',
                },
              },
            ],
          },
          highlight: { path: ['title', 'description', 'comments.content'] },
        },
      },
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'taskId',
          as: 'comments',
        },
      },
      { $match: { $and: [filter, { $or: access }] } },
      {
        $project: {
          title: 1,
          description: 1,
          status: 1,
          tags: 1,
          ownerId: 1,
          createdBy: 1,
          teamId: 1,
          visibility: 1,
          dueDate: 1,
          highlights: { $meta: 'searchHighlights' },
          score: { $meta: 'searchScore' },
        },
      },
    ];
    if (query.sort === 'updatedAt') {
      pipeline.push({ $sort: { updatedAt: -1 } });
    } else if (query.sort === 'dueDate') {
      pipeline.push({ $sort: { dueDate: 1 } });
    } else {
      pipeline.push({ $sort: { score: { $meta: 'searchScore' } } });
    }
    results = await Task.aggregate(pipeline);
  } else {
    const mongoFilter: any = { ...filter };
    if (query.q) mongoFilter.$text = { $search: query.q };
    const sort: any = {};
    if (query.q) sort.score = { $meta: 'textScore' };
    if (query.sort === 'updatedAt') sort.updatedAt = -1;
    if (query.sort === 'dueDate') sort.dueDate = 1;
    results = await Task.find(
      { $and: [mongoFilter, { $or: access }] },
      query.q ? { score: { $meta: 'textScore' } } : undefined
    ).sort(Object.keys(sort).length ? sort : { updatedAt: -1 });
  }

  const output = results.map((t: any) => {
    let excerpt = '';
    if (useAtlas && t.highlights) {
      excerpt = t.highlights
        .map((h: any) => h.texts.map((x: any) => x.value).join(''))
        .join(' ... ');
    } else {
      excerpt = t.description ? t.description.slice(0, 120) : '';
    }
    return { ...t, excerpt };
  });

  return NextResponse.json({
    results: output,
    verification: {
      q: query.q,
      filters: {
        status: query.status,
        tag: query.tag,
        dueFrom: query.dueFrom,
        dueTo: query.dueTo,
        ownerId: query.ownerId,
        createdBy: query.createdBy,
        teamId: query.teamId,
        visibility: query.visibility,
        sort: query.sort,
      },
    },
  });
}

