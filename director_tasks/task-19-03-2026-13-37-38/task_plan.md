# Plan: Implement Spec #5 - Slash Commands

## Goal
Implement slash commands in the frontend and backend that bypass the LLM and directly invoke tools from the ToolRegistry.

## Backend Changes (backend/src/index.ts)
- [ ] Implement `POST /api/slash` endpoint (authenticated).
- [ ] Endpoint should accept `{ command: string, sessionId: string, args?: any }`.
- [ ] Parse the command (e.g., "/jules list-sessions").
- [ ] Extract the tool name (e.g., "jules").
- [ ] Pass the tool invocation to `tools.execute(toolName, args, { sessionId, send })`.
- [ ] Add `send` implementation to `ToolContext` inside the endpoint.
- [ ] Return the tool response directly to the client.
- [ ] Expose an endpoint `GET /api/tools` to return all registered tool names from `tools.getDefinitions()` for frontend autocomplete.

## Frontend Changes (frontend/src/App.tsx)
- [ ] Add state for `slashCommandSuggestions` (list of tool names).
- [ ] Fetch available tools from `GET /api/tools` on mount.
- [ ] Add `onChange` logic to input field:
  - If input starts with `/`, show `slashCommandSuggestions` matching the input.
- [ ] Update `handleSendMessage`:
  - If input starts with `/`, parse as slash command.
  - Call `/api/slash` with `command` and `sessionId`.
  - Format response and append to messages state directly (as assistant or system message) without LLM intervention.

## Pre-commit
- [ ] Complete pre-commit steps and checks before submission.

## Errors Encountered
- None yet.
