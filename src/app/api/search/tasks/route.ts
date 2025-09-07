import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Types, type FilterQuery, type PipelineStage } from 'mongoose';
import dbConnect from '@/lib/db';
import { Task, type ITask } from '@/models/Task';
import { Comment } from '@/models/Comment';
import { TaskLoop } from '@/models/TaskLoop';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';
import { meta } from '@/lib/mongo';

interface RangeFilter {
  $gte?: Date;
  $lte?: Date;
}

interface Highlight {
  texts: { value: string }[];
}

type SearchResult = ITask & {
  highlights?: Highlight[];
  score?: number;
};

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
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
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
      if (field) {
        customRaw[field] = customRaw[field]
          ? [...customRaw[field], value]
          : [value];
      }
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
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }

  await dbConnect();

  const limit = query.limit;
  const skip = (query.page - 1) * limit;

  const filters: FilterQuery<ITask>[] = [];
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

  const dueRanges: RangeFilter[] = [];
  const maxRange = Math.max(query.dueFrom?.length ?? 0, query.dueTo?.length ?? 0);
  for (let i = 0; i < maxRange; i++) {
    const range: RangeFilter = {};
    const from = query.dueFrom?.[i];
    if (from) range.$gte = from;
    const to = query.dueTo?.[i];
    if (to) range.$lte = to;
    if (Object.keys(range).length) dueRanges.push(range);
  }
  if (dueRanges.length === 1) {
    const [range] = dueRanges;
    if (range) filters.push({ dueDate: range });
  } else if (dueRanges.length > 1) {
    filters.push({ $or: dueRanges.map((r) => ({ dueDate: r })) });
  }

  const customFilters: FilterQuery<ITask>[] = [];
  Object.entries(customRaw).forEach(([field, values]) => {
    if (values.length === 1) {
      const [val] = values;
      if (val !== undefined) {
        customFilters.push({ [`custom.${field}`]: val });
      }
    } else {
      customFilters.push({ $or: values.map((v) => ({ [`custom.${field}`]: v })) });
    }
  });
  if (customFilters.length) filters.push(...customFilters);

  let logicOp: '$and' | '$or' = '$and';
  if (typeof raw.logic === 'string' && raw.logic.toUpperCase() === 'OR') {
    logicOp = '$or';
  }
  if (typeof raw.filters === 'string') {
    try {
      const parsed = JSON.parse(raw.filters as string) as unknown;
      if (Array.isArray(parsed)) {
        const dynamic: FilterQuery<ITask>[] = [];
        parsed.forEach(
          (f: { field?: string; op?: string; value?: unknown }) => {
            if (!f?.field || !f?.op) return;
            const val = f.value;
            let condition: FilterQuery<ITask>;
            switch (f.op) {
              case 'eq':
                condition = { [f.field]: val } as FilterQuery<ITask>;
                break;
              case 'ne':
                condition = { [f.field]: { $ne: val } } as FilterQuery<ITask>;
                break;
              case 'gt':
                condition = { [f.field]: { $gt: val } } as FilterQuery<ITask>;
                break;
              case 'gte':
                condition = { [f.field]: { $gte: val } } as FilterQuery<ITask>;
                break;
              case 'lt':
                condition = { [f.field]: { $lt: val } } as FilterQuery<ITask>;
                break;
              case 'lte':
                condition = { [f.field]: { $lte: val } } as FilterQuery<ITask>;
                break;
              case 'regex':
                condition = {
                  [f.field]: { $regex: val, $options: 'i' },
                } as FilterQuery<ITask>;
                break;
              default:
                return;
            }
            dynamic.push(condition);
          }
        );
        if (dynamic.length) {
          if (logicOp === '$or') {
            filters.push({ $or: dynamic });
          } else {
            filters.push(...dynamic);
          }
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const access: FilterQuery<ITask>[] = [
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
      Comment.find({ $text: { $search: query.q } }).distinct<string>('taskId'),
      TaskLoop.find({ $text: { $search: query.q } }).distinct<string>('taskId'),
    ]);
    commentTaskIds = cIds.map((id) => new Types.ObjectId(id));
    loopTaskIds = lIds.map((id) => new Types.ObjectId(id));
  }

  const baseFilter: FilterQuery<ITask> =
    filters.length ? { $and: [...filters, { $or: access }] } : { $or: access };

  let results: SearchResult[] = [];
  if (useAtlas && query.q) {
    const pipeline: PipelineStage[] = [
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
          highlights: meta('searchHighlights'),
          score: meta('searchScore'),
        },
      },
    ];
    if (query.sort === 'updatedAt') {
      pipeline.push({ $sort: { updatedAt: -1 } });
    } else if (query.sort === 'dueDate') {
      pipeline.push({ $sort: { dueDate: 1 } });
    } else {
      pipeline.push({
        $sort: { score: -1 },
      });
    }
    results = await Task.aggregate<SearchResult>(pipeline);
  } else {
    const sort: Record<string, 1 | -1> = {};
    if (query.sort === 'updatedAt') sort.updatedAt = -1;
    if (query.sort === 'dueDate') sort.dueDate = 1;

    if (query.q) {
      const taskResults = await Task.find<SearchResult>(
        { ...baseFilter, $text: { $search: query.q } },
        { score: { $meta: 'textScore' } }
      );

      const extraIds = [...commentTaskIds, ...loopTaskIds].filter(
        (id) => !taskResults.some((t) => t._id.equals(id))
      );

      let extraTasks: SearchResult[] = [];
      if (extraIds.length) {
        extraTasks = await Task.find<SearchResult>({
          ...baseFilter,
          _id: { $in: extraIds },
        });
      }

      results = taskResults.concat(extraTasks);

      if (query.sort === 'dueDate') {
        results.sort((a, b) => {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return ad - bd;
        });
      } else if (query.sort === 'updatedAt') {
        results.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      } else {
        results.sort((a, b) => (b.score || 0) - (a.score || 0));
      }
    } else {
      results = await Task.find<SearchResult>(baseFilter).sort(
        Object.keys(sort).length ? sort : { updatedAt: -1 }
      );
    }
  }

  const total = results.length;
  const paged = results.slice(skip, skip + limit);
  const output = paged.map((t: SearchResult) => {
    let excerpt = '';
    if (useAtlas && t.highlights) {
      excerpt = t.highlights
        .map((h) => h.texts.map((x) => x.value).join(''))
        .join(' ... ');
    } else {
      excerpt = t.description ? t.description.slice(0, 120) : '';
    }
    return { ...t, excerpt };
  });

  return NextResponse.json({
    results: output,
    total,
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

