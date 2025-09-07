import { z } from 'zod';

export const SearchResultSchema = z.object({
  _id: z.string(),
  title: z.string(),
  excerpt: z.string(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchTasksResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number(),
  verification: z.object({
    q: z.string().optional(),
    filters: z.record(z.unknown()),
  }),
});
export type SearchTasksResponse = z.infer<typeof SearchTasksResponseSchema>;

export interface SearchItem {
  _id: string;
  type: 'task' | 'loop' | 'comment';
  taskId: string;
  title: string;
  excerpt: string;
}

export interface GlobalSearchResponse {
  results: SearchItem[];
  total: number;
}

export interface SavedSearch {
  _id: string;
  name: string;
  query: string;
}

export interface SuggestionsResponse {
  suggestions?: string[];
}
