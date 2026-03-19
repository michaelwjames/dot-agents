import { FileSystem } from './data/file_system.js';
import { TokenTracker } from './analytics/token_tracker.js';
import type { ToolInterceptor } from './interceptors/base.js';
import type { Tool, ToolDefinition, ToolContext } from './tools/base.js';
import { WriteNoteTool } from './tools/write_note.js';
import { ReadMemoryTool } from './tools/read_memory.js';
import { GetContextStatsTool } from './tools/get_context_stats.js';
import { JulesTool } from './tools/jules.js';
import { DisplayLargeOutputTool } from './tools/display_large_output.js';
import { LinearTool } from './tools/linear.js';
import { VercelTool } from './tools/vercel.js';
import { Nomenclature } from './utils/nomenclature.js';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private interceptors: ToolInterceptor[] = [];
  private fs: FileSystem;

  constructor(fileSystem: FileSystem, _nomenclature: Nomenclature, tokenTracker: TokenTracker) {
    this.fs = fileSystem;

    // Register core tools
    this.register(new WriteNoteTool(fileSystem));
    this.register(new ReadMemoryTool(fileSystem));
    this.register(new GetContextStatsTool(tokenTracker));
    this.register(new JulesTool());
    this.register(new DisplayLargeOutputTool(fileSystem));
    this.register(new LinearTool());
    this.register(new VercelTool());
  }

  register(tool: Tool) {
    this.tools.set(tool.definition.function.name, tool);
  }

  addInterceptor(interceptor: ToolInterceptor) {
    this.interceptors.push(interceptor);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  async execute(name: string, args: any, context?: ToolContext): Promise<string> {
    let finalArgs = args;

    // Pre-execution interceptors
    for (const interceptor of this.interceptors) {
      if (interceptor.preExecute) {
        finalArgs = await interceptor.preExecute(name, finalArgs);
      }
    }

    const tool = this.tools.get(name);
    let result: string;

    if (tool) {
      result = await tool.execute(finalArgs, context);
    } else {
      result = JSON.stringify({
        success: false,
        stdout: "",
        stderr: `Tool '${name}' not found. Direct shell access via make targets is disabled.`,
        exitCode: 1
      });
    }

    // Post-execution interceptors
    for (const interceptor of this.interceptors) {
      if (interceptor.postExecute) {
        result = await interceptor.postExecute(name, finalArgs, result);
      }
    }

    return result;
  }
}
