import { LinearClient } from '@linear/sdk';
import { Tool, ToolDefinition, ToolContext } from './base.js';

/**
 * Tool to interact with Linear.
 */
export class LinearTool implements Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'linear',
      description: 'Interact with Linear — create issues, list issues, get issue details, or get comments.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create-issue', 'list-issues', 'get-issue', 'get-comments'],
            description: 'The action to perform in Linear.',
          },
          title: {
            type: 'string',
            description: 'The title of the issue (required for create-issue).',
          },
          description: {
            type: 'string',
            description: 'The description of the issue (optional for create-issue).',
          },
          issue_id: {
            type: 'string',
            description: 'The ID or key of the issue (required for get-issue and get-comments).',
          },
          team_id: {
            type: 'string',
            description: 'The ID of the team to create the issue in (required for create-issue).',
          },
        },
        required: ['action'],
      },
    },
  };

  private getClient(): LinearClient {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      throw new Error('LINEAR_API_KEY is not set in environment variables.');
    }
    return new LinearClient({ apiKey });
  }

  async execute(args: any, _context?: ToolContext): Promise<string> {
    try {
      const client = this.getClient();

      switch (args.action) {
        case 'create-issue':
          if (!args.title || !args.team_id) {
            throw new Error('title and team_id are required for create-issue');
          }
          const issuePayload = await client.createIssue({
            title: args.title,
            description: args.description,
            teamId: args.team_id,
          });
          const issue = await issuePayload.issue;
          return JSON.stringify({
            success: true,
            stdout: `Issue created: ${issue?.url}`,
            issue: { id: issue?.id, identifier: issue?.identifier, url: issue?.url }
          });

        case 'list-issues':
          const issues = await client.issues();
          const issueList = issues.nodes.map(i => ({
            id: i.id,
            identifier: i.identifier,
            title: i.title,
            state: i.state
          }));
          return JSON.stringify({
            success: true,
            stdout: `Found ${issueList.length} issues.`,
            issues: issueList
          });

        case 'get-issue':
          if (!args.issue_id) {
            throw new Error('issue_id is required for get-issue');
          }
          const issueDetails = await client.issue(args.issue_id);
          return JSON.stringify({
            success: true,
            stdout: `Fetched issue ${args.issue_id}`,
            issue: {
              id: issueDetails.id,
              identifier: issueDetails.identifier,
              title: issueDetails.title,
              description: issueDetails.description,
              url: issueDetails.url
            }
          });

        case 'get-comments':
          if (!args.issue_id) {
            throw new Error('issue_id is required for get-comments');
          }
          const issueForComments = await client.issue(args.issue_id);
          const comments = await issueForComments.comments();
          const commentList = comments.nodes.map(c => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt
          }));
          return JSON.stringify({
            success: true,
            stdout: `Found ${commentList.length} comments for issue ${args.issue_id}.`,
            comments: commentList
          });

        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        stdout: "",
        stderr: error.message,
        exitCode: 1
      });
    }
  }
}
