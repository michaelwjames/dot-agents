export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

/**
 * Base interface for all tool implementations.
 * Each tool co-locates its LLM schema definition with its implementation.
 */
export interface Tool {
  /** OpenAI-compatible tool schema sent to the LLM. */
  definition: ToolDefinition;
  /**
   * The primary entry point for tool logic.
   * @param args - Tool-specific arguments passed by the LLM
   * @returns - A string result to return to the LLM
   */
  execute(args: any): Promise<string>;
}
