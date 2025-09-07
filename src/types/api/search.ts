export interface SearchResult {
  _id: string;
  title: string;
  excerpt: string;
}

export interface SearchTasksResponse {
  results: SearchResult[];
  verification: unknown;
}

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
