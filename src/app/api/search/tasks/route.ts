import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Comment from '@/models/Comment';
import TaskLoop from '@/models/TaskLoop';
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
  dueFrom: z
    .union([z.coerce.date(), z.array(z.coerce.date())])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : []))
    .optional(),
  dueTo: z
    .union([z.coerce.date(), z.array(z.coerce.date())])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : []))
    .optional(),
  ownerId: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : []))
    .optional(),
  helpers: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : []))
    .optional(),
  createdBy: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : []))
    .optional(),
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
  const customRaw: Record<string, string[]> = {};
  url.searchParams.forEach((value, key) => {
    const customMatch = key.match(/^custom\[(.+)\]$/);
    if (customMatch) {
      const field = customMatch[1];
      customRaw[field] = customRaw[field] ? [...customRaw[field], value] : [value];
      return;
    }
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

  const filters: any[] = [];
  if (query.ownerId?.length)
    filters.push({ ownerId: { $in: query.ownerId.map((id) => new Types.ObjectId(id)) } });
  if (query.createdBy?.length)
    filters.push({ createdBy: { $in: query.createdBy.map((id) => new Types.ObjectId(id)) } });
  if (query.helpers?.length)
    filters.push({ helpers: { $in: query.helpers.map((id) => new Types.ObjectId(id)) } });
  if (query.status && query.status.length) filters.push({ status: { $in: query.status } });
  if (query.tag && query.tag.length) filters.push({ tags: { $in: query.tag } });
  if (query.visibility) filters.push({ visibility: query.visibility });
  if (query.teamId) filters.push({ teamId: new Types.ObjectId(query.teamId) });

  const dueRanges: any[] = [];
  const maxRange = Math.max(query.dueFrom?.length ?? 0, query.dueTo?.length ?? 0);
  for (let i = 0; i < maxRange; i++) {
    const range: any = {};
    if (query.dueFrom?.[i]) range.$gte = query.dueFrom[i];
    if (query.dueTo?.[i]) range.$lte = query.dueTo[i];
    if (Object.keys(range).length) dueRanges.push(range);
  }
  if (dueRanges.length === 1) {
    filters.push({ dueDate: dueRanges[0] });
  } else if (dueRanges.length > 1) {
    filters.push({ $or: dueRanges.map((r) => ({ dueDate: r })) });
  }

  const customFilters: any[] = [];
  Object.entries(customRaw).forEach(([field, values]) => {
    if (values.length === 1) {
      customFilters.push({ [`custom.${field}`]: values[0] });
    } else {
      customFilters.push({ $or: values.map((v) => ({ [`custom.${field}`]: v })) });
    }
  });
  if (customFilters.length) filters.push(...customFilters);

  const access: any[] = [
    { participantIds: new Types.ObjectId(session.userId) },
  ];
  if (session.teamId) {
    access.push({ visibility: 'TEAM', teamId: new Types.ObjectId(session.teamId) });
  }

  const useAtlas = process.env.ATLAS_SEARCH === 'true';

  let commentTaskIds: Types.ObjectId[] = [];
  let loopTaskIds: Types.ObjectId[] = [];
  if (!useAtlas && query.q) {
    const [cIds, lIds] = await Promise.all([
      Comment.find({ $text: { $search: query.q } }).distinct('taskId'),
      TaskLoop.find({ $text: { $search: query.q } }).distinct('taskId'),
    ]);
    commentTaskIds = cIds.map((id: any) => new Types.ObjectId(id));
    loopTaskIds = lIds.map((id: any) => new Types.ObjectId(id));
  }

  const baseFilter =
    filters.length ? { $and: [...filters, { $or: access }] } : { $or: access };

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
              {
                text: {
                  query: query.q!,
                  path: 'loops.sequence.description',
                },
              },
            ],
          },
          highlight: {
            path: ['title', 'description', 'comments.content', 'loops.sequence.description'],
          },
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
      {
        $lookup: {
          from: 'taskloops',
          localField: '_id',
          foreignField: 'taskId',
          as: 'loops',
        },
      },
      { $match: baseFilter },
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
    const sort: any = {};
    if (query.sort === 'updatedAt') sort.updatedAt = -1;
    if (query.sort === 'dueDate') sort.dueDate = 1;

    if (query.q) {
      const taskResults = await Task.find(
        { ...baseFilter, $text: { $search: query.q } },
        { score: { $meta: 'textScore' } }
      );

      const extraIds = [...commentTaskIds, ...loopTaskIds].filter(
        (id) => !taskResults.some((t: any) => t._id.equals(id))
      );

      let extraTasks: any[] = [];
      if (extraIds.length) {
        extraTasks = await Task.find({ ...baseFilter, _id: { $in: extraIds } });
      }

      results = taskResults.concat(extraTasks);

      if (query.sort === 'dueDate') {
        results.sort((a: any, b: any) => {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return ad - bd;
        });
      } else if (query.sort === 'updatedAt') {
        results.sort(
          (a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      } else {
        results.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
      }
    } else {
      results = await Task.find(baseFilter).sort(
        Object.keys(sort).length ? sort : { updatedAt: -1 }
      );
    }
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
        helpers: query.helpers,
        createdBy: query.createdBy,
        teamId: query.teamId,
        visibility: query.visibility,
        custom: customRaw,
        sort: query.sort,
      },
    },
  });
}

