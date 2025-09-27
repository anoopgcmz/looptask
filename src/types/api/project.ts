export interface ProjectTaskStats {
  pending: number;
  done: number;
  total: number;
}

export interface ProjectType {
  _id: string;
  name: string;
  normalized: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  _id: string;
  name: string;
  description?: string | null;
  type?: ProjectType | null;
  stats: ProjectTaskStats;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectDetail extends ProjectSummary {
  organizationId: string;
  createdBy: string;
  updatedBy: string;
}
