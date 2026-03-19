import axios, { AxiosInstance } from 'axios';

export interface CreateSessionOpts {
  prompt: string;
  title?: string;
  repo?: string;
  branch?: string;
  requirePlanApproval?: boolean;
  automationMode?: 'AUTOMATION_MODE_UNSPECIFIED' | 'AUTO_CREATE_PR';
}

export interface Session {
  name: string;
  title?: string;
  state: string;
  createTime: string;
  updateTime: string;
  url?: string;
  prompt?: string;
  sourceContext?: any;
  automationMode?: string;
  requirePlanApproval?: boolean;
  outputs?: any[];
}

export interface Source {
  name: string;
  githubRepo?: {
    owner: string;
    repo: string;
    isPrivate?: boolean;
    defaultBranch?: {
      displayName: string;
    };
  };
}

export interface Activity {
  id: string;
  description?: string;
  originator: string;
  createTime: string;
  agentMessaged?: {
    agentMessage: string;
  };
  userMessaged?: {
    userMessage: string;
  };
  planGenerated?: {
    plan: any;
  };
  planApproved?: {
    planId: string;
  };
  progressUpdated?: {
    description?: string;
    title?: string;
  };
  sessionCompleted?: any;
  sessionFailed?: {
    reason: string;
  };
}

export class JulesClient {
  private client: AxiosInstance;

  constructor(apiKey: string, baseUrl: string = 'https://jules.googleapis.com/v1alpha') {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async listSources(opts?: { pageSize?: number; pageToken?: string; filter?: string }): Promise<{ sources: Source[]; nextPageToken?: string }> {
    const params: any = {};
    if (opts?.pageSize) params.pageSize = opts.pageSize;
    if (opts?.pageToken) params.pageToken = opts.pageToken;
    if (opts?.filter) params.filter = opts.filter;

    const response = await this.client.get('/sources', { params });
    return response.data;
  }

  async getSource(sourceId: string): Promise<Source> {
    const response = await this.client.get(`/sources/${sourceId}`);
    return response.data;
  }

  private async getSourceId(repoName: string): Promise<string> {
    const { sources } = await this.listSources({ pageSize: 100 });
    for (const source of sources) {
      if (source.githubRepo) {
        const fullName = `${source.githubRepo.owner}/${source.githubRepo.repo}`;
        if (fullName === repoName || source.name.includes(repoName)) {
          return source.name;
        }
      }
    }
    throw new Error(`Repository '${repoName}' not found in connected sources.`);
  }

  async createSession(opts: CreateSessionOpts): Promise<Session> {
    let sourceId: string | undefined;
    if (opts.repo) {
      sourceId = await this.getSourceId(opts.repo);
    }

    const payload: any = {
      prompt: opts.prompt,
      automationMode: opts.automationMode || 'AUTOMATION_MODE_UNSPECIFIED',
    };

    if (opts.title) {
      payload.title = opts.title;
    }

    if (sourceId) {
      payload.sourceContext = {
        source: sourceId,
        githubRepoContext: {
          startingBranch: opts.branch || 'main',
        },
      };
      if (!payload.title) {
        payload.title = `Task: ${opts.prompt.substring(0, 30)}...`;
      }
    } else if (!payload.title) {
      payload.title = 'Repoless Session';
    }

    if (opts.requirePlanApproval) {
      payload.requirePlanApproval = true;
    }

    const response = await this.client.post('/sessions', payload);
    return response.data;
  }

  async listSessions(opts?: { pageSize?: number; pageToken?: string }): Promise<{ sessions: Session[]; nextPageToken?: string }> {
    const params: any = {};
    if (opts?.pageSize) params.pageSize = opts.pageSize;
    if (opts?.pageToken) params.pageToken = opts.pageToken;

    const response = await this.client.get('/sessions', { params });
    return response.data;
  }

  async getSession(sessionId: string): Promise<Session> {
    const id = this.normalizeSessionId(sessionId);
    const response = await this.client.get(`/sessions/${id}`);
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const id = this.normalizeSessionId(sessionId);
    await this.client.delete(`/sessions/${id}`);
  }

  async sendMessage(sessionId: string, message: string): Promise<any> {
    const id = this.normalizeSessionId(sessionId);
    const response = await this.client.post(`/sessions/${id}:sendMessage`, {
      prompt: message,
    });
    return response.data;
  }

  async approvePlan(sessionId: string): Promise<any> {
    const id = this.normalizeSessionId(sessionId);
    const response = await this.client.post(`/sessions/${id}:approvePlan`, {});
    return response.data;
  }

  async listActivities(sessionId: string, opts?: { pageSize?: number; pageToken?: string; createTime?: string }): Promise<{ activities: Activity[]; nextPageToken?: string }> {
    const id = this.normalizeSessionId(sessionId);
    const params: any = {};
    if (opts?.pageSize) params.pageSize = opts.pageSize;
    if (opts?.pageToken) params.pageToken = opts.pageToken;
    if (opts?.createTime) params.createTime = opts.createTime;

    const response = await this.client.get(`/sessions/${id}/activities`, { params });
    return response.data;
  }

  private normalizeSessionId(sessionId: string): string {
    if (sessionId.startsWith('sessions/')) {
      return sessionId.substring(9);
    }
    return sessionId;
  }
}
