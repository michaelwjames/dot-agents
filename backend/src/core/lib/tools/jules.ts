import { Tool, ToolDefinition, ToolContext } from './base.js';
import { JulesClient, Session, Activity } from '../clients/jules_client.js';

const STDOUT_TRUNCATION_LIMIT = 500;
const DISCORD_CONTENT_LIMIT = 1900; // Leave some buffer under 2000 limit

/**
 * Tool to interact with the Jules AI agent.
 * @deprecated This tool currently relies on a Node client to be implemented in Spec #11.
 * For now, it is a stub that will be fully functional after Spec #11.
 */
export class JulesTool implements Tool {
  private _toRelativeTime(isoTimestamp: string): string {
    const parsed = Date.parse(isoTimestamp);
    if (Number.isNaN(parsed)) return isoTimestamp;

    const diffMs = Date.now() - parsed;
    const absMs = Math.abs(diffMs);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    const format = (value: number, unit: string): string => {
      const plural = value === 1 ? unit : `${unit}s`;
      return diffMs >= 0 ? `${value} ${plural} ago` : `in ${value} ${plural}`;
    };

    if (absMs < minute) return diffMs >= 0 ? 'just now' : 'in a few seconds';
    if (absMs < hour) return format(Math.floor(absMs / minute), 'minute');
    if (absMs < day) return format(Math.floor(absMs / hour), 'hour');
    return format(Math.floor(absMs / day), 'day');
  }

  private _humanizeTimestamps(output: string): string {
    return output.replace(/\[([^\]]+)\]/g, (match, ts) => {
      const relative = this._toRelativeTime(ts);
      return relative === ts ? match : `[${relative}]`;
    });
  }

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'jules',
      description: 'Interact with the Jules AI agent. Pass sessionId as the session identifier.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [
              'create',
              'list-sessions',
              'get-session',
              'get-session-status',
              'get-pending-feedback',
              'send-message',
              'approve-plan',
              'list-sources',
              'list-activities',
              'delete-session',
              'fetch-latest-sessions',
              'show-cached-sessions',
            ],
            description: 'The action to perform with Jules.',
          },
          prompt: {
            type: 'string',
            description: 'The instruction or message for Jules (used with create, send-message).',
          },
          repo: {
            type: 'string',
            description: 'The GitHub repository name (owner/repo) for the session.',
          },
          sessionId: {
            type: 'string',
            description: 'The ID of an existing Jules session.',
          },
          pageSize: {
            type: 'number',
            description: 'Number of items to return for list-sessions and list-activities (defaults to 10).',
          },
          extraArgs: {
            type: 'string',
            description: 'Any additional flags or arguments for the jules client.',
          },
        },
        required: ['action'],
      },
    },
  };

  constructor() {
    const apiKey = process.env.JULES_API_KEY || '';
    this.client = new JulesClient(apiKey);
  }

  async execute(args: any, context?: ToolContext): Promise<string> {
    let result: any;
    let stdout: string = '';
    let success = true;

    try {
      switch (args.action) {
        case 'create':
          result = await this.client.createSession({
            prompt: args.prompt,
            title: args.title,
            repo: args.repo,
            branch: args.branch,
          });
          stdout = `Session Created! ID: ${result.name}\nWeb URL: ${result.url || 'N/A'}`;
          break;

        case 'list-sessions':
        case 'fetch-latest-sessions':
          const sessionsResult = await this.client.listSessions({
            pageSize: args.pageSize || 10,
          });
          result = sessionsResult.sessions;
          stdout = "Sessions:\n" + result.map((s: Session) =>
            `  ${s.name} | ${s.title || 'No Title'} | ${s.state} | ${s.createTime}`
          ).join('\n');
          break;

        case 'get-session':
        case 'get-session-status':
          result = await this.client.getSession(args.sessionId);
          stdout = JSON.stringify(result, null, 2);
          break;

        case 'delete-session':
          await this.client.deleteSession(args.sessionId);
          stdout = `Session ${args.sessionId} deleted successfully.`;
          break;

        case 'send-message':
          result = await this.client.sendMessage(args.sessionId, args.prompt);
          stdout = `Message sent to session ${args.sessionId}`;
          break;

        case 'approve-plan':
          result = await this.client.approvePlan(args.sessionId);
          stdout = `Plan approved for session ${args.sessionId}`;
          break;

        case 'list-sources':
          const sourcesResult = await this.client.listSources({
            pageSize: args.pageSize || 10,
          });
          result = sourcesResult.sources;
          stdout = "Connected Sources:\n" + result.map((s: any) => {
            const github = s.githubRepo || {};
            return `  ${s.name} | ${github.owner}/${github.repo}`;
          }).join('\n');
          break;

        case 'list-activities':
          const activitiesResult = await this.client.listActivities(args.sessionId, {
            pageSize: args.pageSize || 10,
          });
          result = activitiesResult.activities;
          stdout = "Activities:\n" + result.map((act: Activity) => {
            let content = act.description || 'No description';
            if (act.agentMessaged) content = act.agentMessaged.agentMessage;
            else if (act.userMessaged) content = act.userMessaged.userMessage;

            return `  [${act.createTime}] ${act.originator.toUpperCase()}: ${content}`;
          }).join('\n');
          break;

        case 'get-pending-feedback':
          const feedbackResult = await this.client.listActivities(args.sessionId, {
            pageSize: 10,
          });
          const lastAgentMessage = feedbackResult.activities.reverse().find(act => act.agentMessaged);
          if (lastAgentMessage) {
            stdout = `Session: ${args.sessionId}\nLast agent message:\n${lastAgentMessage.agentMessaged?.agentMessage}`;
          } else {
            stdout = "No pending feedback found.";
          }
          break;

        case 'show-cached-sessions':
          stdout = "Cached sessions retrieval not supported in this client version.";
          break;

        default:
          throw new Error(`Unsupported action: ${args.action}`);
      }
    } catch (error: any) {
      success = false;
      stdout = `Error: ${error.message}`;
    }

    const humanizedStdout = this._humanizeTimestamps(stdout);

    // If context is available, send the output directly to the channel
    if (context && humanizedStdout) {
      let discordContent = humanizedStdout;
      if (humanizedStdout.length > DISCORD_CONTENT_LIMIT) {
        discordContent = `${humanizedStdout.substring(0, DISCORD_CONTENT_LIMIT)}...\n\n*(output truncated due to Discord limits - full output available in session history)*`;
      }
      await context.send(discordContent);
      
      const output = {
        stdout: "__NO_RESPONSE_NEEDED__",
        stderr: success ? '' : humanizedStdout,
        exitCode: success ? 0 : 1,
        success,
        _fullStdout: humanizedStdout
      };
      
      return JSON.stringify(output);
    }

    const output = {
      stdout: humanizedStdout.length > STDOUT_TRUNCATION_LIMIT ? `${humanizedStdout.substring(0, STDOUT_TRUNCATION_LIMIT)}... (full output displayed in channel)` : humanizedStdout,
      stderr: success ? '' : humanizedStdout,
      exitCode: success ? 0 : 1,
      success,
      _fullStdout: humanizedStdout
    };

    return JSON.stringify(output);
  }
}
