import axios from 'axios';
import { Tool, ToolDefinition, ToolContext } from './base.js';

/**
 * Tool to interact with Vercel REST API.
 */
export class VercelTool implements Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'vercel',
      description: 'Interact with Vercel — get logs, list deployments, or get deployment details.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['get-logs', 'list-deployments', 'get-deployment'],
            description: 'The action to perform in Vercel.',
          },
          deployment_id: {
            type: 'string',
            description: 'The ID of the deployment (required for get-logs and get-deployment).',
          },
          limit: {
            type: 'number',
            description: 'The number of logs to return (default: 10).',
          },
        },
        required: ['action'],
      },
    },
  };

  private getClient() {
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      throw new Error('VERCEL_TOKEN is not set in environment variables.');
    }
    return axios.create({
      baseURL: 'https://api.vercel.com',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async execute(args: any, _context?: ToolContext): Promise<string> {
    try {
      const client = this.getClient();

      switch (args.action) {
        case 'get-logs':
          if (!args.deployment_id) {
            throw new Error('deployment_id is required for get-logs');
          }
          const logsResponse = await client.get(`/v2/now/deployments/${args.deployment_id}/events`, {
            params: { limit: args.limit || 10 },
          });
          return JSON.stringify({
            success: true,
            stdout: `Fetched ${logsResponse.data.length} logs for deployment ${args.deployment_id}`,
            logs: logsResponse.data
          });

        case 'list-deployments':
          const deploymentsResponse = await client.get('/v6/deployments', {
            params: { limit: args.limit || 10 },
          });
          return JSON.stringify({
            success: true,
            stdout: `Fetched ${deploymentsResponse.data.deployments.length} deployments`,
            deployments: deploymentsResponse.data.deployments
          });

        case 'get-deployment':
          if (!args.deployment_id) {
            throw new Error('deployment_id is required for get-deployment');
          }
          const deploymentResponse = await client.get(`/v13/deployments/${args.deployment_id}`);
          return JSON.stringify({
            success: true,
            stdout: `Fetched deployment ${args.deployment_id}`,
            deployment: deploymentResponse.data
          });

        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        stdout: "",
        stderr: error?.response?.data?.error?.message || error.message,
        exitCode: 1
      });
    }
  }
}
