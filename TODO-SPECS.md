# Boss Agent — Feature Specs

> Detailed implementation prompts for each TODO item. Each spec is written for a fresh agent with enough context to implement independently.

---

## Architecture Decision: Eliminate Make Dependency → Full Vercel Compatibility

**Decision (confirmed):** Eliminate all Makefile/`make` dependencies. Replace every Makefile target with a native TypeScript tool registered in `ToolRegistry`. Persist data to **Turso** (hosted LibSQL/SQLite) instead of the local file system, so the backend runs fully on Vercel serverless with zero infrastructure to manage.

**Why this is necessary:**
- Vercel Lambda runtime does not include `make`
- Vercel Lambda has a read-only file system (except `/tmp`, which is ephemeral)
- All current file writes (`data/session_history/`, `data/memory/`, `data/logs/`) silently fail in production

**Migration map — every current Makefile target and its replacement:**

| Makefile target | Replacement |
|---|---|
| `jules-*` (all Jules targets) | `JulesClient` TypeScript class → spec #11 |
| `pr-list`, `pr-diff`, `pr-view`, `pr-merge`, `pr-close` | GitHub tool via `@octokit/rest` → spec #12 |
| `git-status`, `git-diff`, `git-log`, `git-summary` | Not replaced — local git ops not needed as agent tools. Remove. |
| `safe-gemini`, `gemini-image` | Gemini tool → spec #13 |
| `linear-task` | Linear tool → spec #0c (new) |
| `vercel-logs` | Vercel tool → spec #0d (new) |
| `remind` | `remind.ts` already exists — just register it → spec #10 |
| `read-file`, `list-files`, `read-skill` | Covered by existing `read_memory` tool |
| `context-stats` | Covered by existing `get_context_stats` tool |
| `create-boss-skills` | Keep as-is (meta skill, not agent-critical) |
| `status`, `test`, `help` | Remove — not agent-facing tools |

**Storage migration:**

| Current (file-based) | Replacement (Turso) |
|---|---|
| `data/session_history/{id}.json` | `sessions` table in Turso |
| `data/memory/*.md` | `memory` table in Turso |
| `data/logs/console-*.log` | `logs` table in Turso (or Vercel Log Drains) |
| `data/large_outputs/` | Turso BLOB column or Vercel KV |
| `data/jules_cache.db` | `jules_cache` table in same Turso DB |

**Spec #0 below covers the foundational work. All other specs assume this is done first.**

---

---

## 0. Foundation: Turso Database + Eliminate MakeExecutor

**Complexity:** High — this is a prerequisite for Vercel compatibility. Do this before implementing other backend specs.
**New files:** `backend/src/core/lib/data/turso_db.ts`, `backend/src/core/lib/tools/git.ts`, `backend/src/core/lib/tools/linear.ts`, `backend/src/core/lib/tools/vercel.ts`

### Part A — Turso Database Layer

**Install:** `npm install @libsql/client`

**Environment variables (add to `.env.example`):**
```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

**Create `backend/src/core/lib/data/turso_db.ts`:**

A singleton `TursoDB` class wrapping `@libsql/client`. The client is HTTP-based so it works in Vercel serverless.

```ts
import { createClient, Client } from '@libsql/client'

class TursoDB {
  private client: Client

  constructor() {
    this.client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }

  async init(): Promise<void>  // runs all CREATE TABLE IF NOT EXISTS statements
  async execute(sql: string, args?: any[]): Promise<ResultSet>
  async batch(stmts: { sql: string; args?: any[] }[]): Promise<ResultSet[]>
}

export const db = new TursoDB()
```

**Schema — run in `init()`:**
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  last_activity_at TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]'  -- JSON array
);

CREATE TABLE IF NOT EXISTS memory (
  filename TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  always_remember INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jules_cache (
  session_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cache (
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  cache_data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, user_id)
);
```

Call `db.init()` at server startup in `backend/src/index.ts`.

### Part B — Migrate FileSystem to TursoDB

**Update `backend/src/core/lib/data/file_system.ts`:**

Replace all file-system operations with Turso queries. Keep the same public method signatures so no other code changes:

- `saveSession(sessionId, messages)` → `UPDATE/INSERT sessions SET messages = ?, last_activity_at = ? WHERE id = ?`
- `loadSession(sessionId)` → `SELECT messages, last_activity_at FROM sessions WHERE id = ?`
- `writeNote(filename, content)` → `INSERT OR REPLACE INTO memory ...`
- `readFileContent(filename)` → `SELECT content FROM memory WHERE filename = ?` (fall back to reading bundled `data/vault/` files for static content)
- `getFileSystemIndex()` → Query `memory` table for notes + read bundled `data/vault/` file listing (vault is static, bundled with deploy)

**For the vault (static read-only knowledge base):** Keep reading from the bundled `data/vault/` directory as before — these are read-only files deployed with the app, so they work fine in Vercel's read-only file system.

**For logs:** Update `backend/src/core/lib/utils/logger.ts` to write to the `logs` table instead of a daily file. Update `GET /api/logs` endpoint to query `SELECT message FROM logs ORDER BY id DESC LIMIT ?`.

**For the 10-minute inactivity session archiving logic:** Remove — with a database, archiving is unnecessary. Simply keep all sessions in the `sessions` table.

### Part C — Deprecate MakeExecutor and run_make Tool

1. Move `backend/src/core/lib/executors/make_executor.ts` to `backend/src/core/lib/executors/_deprecated/make_executor.ts`.
2. Remove `RunMakeTool` from `ToolRegistry` in `backend/src/core/lib/tools.ts`.
3. Remove the `run_make.ts` tool file (or move to `backend/src/core/lib/tools/_deprecated/`).
4. Remove the `MakeExecutor` fallback in `tools.ts` (lines 61-62: unregistered tools fall back to make targets).

### Part D — New Linear Tool

**Create `backend/src/core/lib/tools/linear.ts`:**

Install: `npm install @linear/sdk`

```ts
definition: {
  name: 'linear',
  parameters: {
    action: { enum: ['create-issue', 'list-issues', 'get-issue', 'get-comments'] },
    title: { type: 'string' },
    description: { type: 'string' },
    issue_id: { type: 'string' },
    team_id: { type: 'string' },
  }
}
```

Auth: `LINEAR_API_KEY` env var.

### Part E — New Vercel Tool

**Create `backend/src/core/lib/tools/vercel.ts`:**

Use Vercel REST API (no SDK needed, use `axios`).

```ts
definition: {
  name: 'vercel',
  parameters: {
    action: { enum: ['get-logs', 'list-deployments', 'get-deployment'] },
    deployment_id: { type: 'string' },
    limit: { type: 'number' },
  }
}
```

Auth: `VERCEL_TOKEN` env var.

**Update `.env.example`** with all new env vars:
```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
LINEAR_API_KEY=
VERCEL_TOKEN=
```

**Register all new tools** (Git, Linear, Vercel) in `backend/src/core/lib/tools.ts`.

---

## 1. Copy Button on Agent Messages

**Complexity:** Low
**Files:** `frontend/src/App.tsx`, `frontend/src/index.css`

### Context
The chat UI renders messages in `App.tsx`. Currently only `user` and `assistant` roles are shown (lines 168-174). Assistant messages are left-aligned white bubbles. There is no copy functionality.

### Spec

Add a copy icon button to every assistant (`role === 'assistant'`) message bubble. The button should:

1. Appear below/beneath the message text, right-aligned within the bubble.
2. Use the `Copy` icon from `lucide-react` (already installed).
3. On click, call `navigator.clipboard.writeText(message.content)`.
4. After copying, swap the icon for a `Check` icon from `lucide-react` for 2 seconds, then revert.
5. No toast library needed — the Check icon is sufficient feedback.

Style: The button should be subtle (e.g., `opacity: 0.5` at rest, `opacity: 1` on hover). It should sit flush right within the message bubble below the text.

---

## 2. Token Usage Tooltip Button

**Complexity:** Medium
**Files:** `backend/src/index.ts`, `backend/src/core/lib/services/boss_agent_service.ts`, `backend/src/core/lib/analytics/token_tracker.ts`, `frontend/src/App.tsx`

### Context
The backend already has a `TokenTracker` class (`backend/src/core/lib/analytics/token_tracker.ts`) that calculates context stats (system prompt tokens, history tokens, user message tokens, tool definition tokens, etc.) and rate limit stats. The `POST /api/message` endpoint returns `{intermediateMessages, ...lastMessage}` but does not currently include token data.

The `BossAgentService.processMessage()` assembles messages and calls the LLM. It knows the context window usage at the time of each call.

### Spec

**Backend changes:**
1. In `BossAgentService.processMessage()`, after the final LLM call, capture the token stats for that request using `TokenTracker.calculateContextStats(systemPrompt, history, userMessage, toolDefs, modelName)`.
2. Also capture `TokenTracker.getRateLimitStats(modelName)` for the model used.
3. Return this data as `tokenStats` alongside the existing response from `POST /api/message`. The shape should be:
   ```ts
   tokenStats: {
     inputTokens: number       // total context tokens sent
     outputTokens: number      // estimated response tokens
     model: string             // model name used
     systemPromptTokens: number
     historyTokens: number
     userMessageTokens: number
     toolDefinitionTokens: number
     percentOfContextWindow: number
     tpmUsed: number           // tokens per minute utilization %
     tpdUsed: number           // tokens per day utilization %
   }
   ```

**Frontend changes:**
1. Store `tokenStats` on each message object (extend the `Message` interface).
2. Add a small `BarChart2` icon button (from `lucide-react`) next to the copy button on assistant messages.
3. On click, show a **tooltip/popover** (not a modal) positioned above the button with the following stats formatted as a small table:
   - Model used
   - Input tokens / Output tokens (estimated)
   - Context window usage (e.g., "4,200 / 128,000 tokens — 3.3%")
   - System prompt / History / User message / Tools breakdown
   - TPM utilization % and TPD utilization %
4. Clicking anywhere else dismisses the tooltip.
5. Style the tooltip as a small dark card with white text, consistent with the existing dark theme.

---

## 3. Hamburger Menu + Console Modal

**Complexity:** Medium
**Files:** `backend/src/index.ts`, `frontend/src/App.tsx`, `frontend/src/index.css`

### Context
The backend writes logs to `data/logs/console-YYYY-MM-DD.log` via `backend/src/core/lib/utils/logger.ts`. The frontend header currently just shows the logo, "Boss Agent" title, and a logout button.

### Spec

**Backend changes:**
1. Add a new authenticated endpoint `GET /api/logs?lines=100` that:
   - Reads today's log file from `data/logs/console-YYYY-MM-DD.log`.
   - Returns the last N lines (default 100, max 500) as a JSON array of strings.
   - If the file doesn't exist, return an empty array.
   - Uses the existing `authenticateJWT` middleware.

**Frontend changes:**
1. Add a `Menu` icon (hamburger, from `lucide-react`) to the left side of the header.
2. On click, open a full-screen modal overlay (dark background, scrollable) with title "Console".
3. The modal should:
   - Fetch `GET /api/logs?lines=100` on open.
   - Display log lines in a monospace font, dark background (like a terminal). Each line is a separate `<div>`.
   - Include a `Copy` icon button at the top-right of the console area. On click, copies the last 100 lines to clipboard and briefly shows a `Check` icon.
   - Include a `X` close button in the top-right corner of the modal.
   - Auto-scroll to the bottom on open (newest logs).
4. Add a close-on-background-click behaviour.

---

## 4. Transcription Toggle Fix

**Complexity:** Medium
**Files:** `frontend/src/App.tsx`, `frontend/src/index.css`

### Context
The current transcription implementation (`App.tsx` lines 98-139) uses a hold-to-record pattern via `mousedown`/`mouseup` events. It auto-sends the transcribed text directly as a message. This needs to become a proper toggle with distinct states and a different UX flow.

### Current flow (broken/hold-to-record)
- `onMouseDown` → start recording
- `onMouseUp` → stop recording, transcribe, auto-send

### New flow (toggle-based)

**State machine:**
- `idle` → button shows mic icon
- `listening` → user pressed mic, recording in progress
- `sending` → user pressed mic again (toggle off), transcription in progress
- After transcription completes → populate the text input field (do NOT auto-send)

**UI behaviour:**
1. When `idle`: the mic button sits at the right of the input bar as currently.
2. When user presses mic button → enter `listening` state:
   - The mic button container expands leftward into the text input area (the text input shrinks proportionally using CSS flex/transition).
   - The expanded area shows a pulsing red dot + label `"Listening"`.
   - Start `MediaRecorder` recording.
3. When user presses mic button again → enter `sending` state:
   - Stop `MediaRecorder`.
   - Label changes to `"Sending"` (no pulsing dot, show a spinner or just text).
4. When transcription API returns → return to `idle` state:
   - Collapse the button back to its original size (text input expands back).
   - Populate the text input field (`<input>`) with the transcribed text.
   - Focus the text input so the user can review/edit before sending manually.
   - Do NOT auto-send.

**CSS requirements:**
- Use CSS transitions (`transition: all 0.25s ease`) on width changes.
- The expanded listening area should have a distinct background (e.g., dark red tint or similar).
- Remove the existing pulse animation CSS and replace with a simpler inline pulsing red circle.

**Error handling:**
- If transcription fails, return to `idle` state and show a brief error message in the expanded area before collapsing.

---

## 5. Forward-Slash Command Feature

**Complexity:** Medium
**Files:** `frontend/src/App.tsx`, `frontend/src/index.css`, `backend/src/index.ts`, `backend/src/core/lib/tools.ts`

### Design
Slash commands **bypass the LLM entirely** and invoke registered backend tools directly. The menu is dynamically generated from `ToolRegistry` — whatever tools are registered appear as commands. The user types `/tool-name [args]` and execution happens immediately via a dedicated endpoint.

> **⚠️ Vercel caveat:** Slash commands backed by `run_make` (which shells out to `make`) won't work on Vercel. As tools are converted to native Node implementations (specs #11–#14), those slash commands will work. The system should still be built now — the frontend and endpoint are valid regardless.

### Context
No existing slash command system. Input bar is a plain `<input>` in `App.tsx`. The `ToolRegistry` in `backend/src/core/lib/tools.ts` holds all registered tools with their definitions.

### Spec

**Backend — `GET /api/tools` (new, authenticated):**
- Returns all registered tools: `{ tools: [{ name, description, parameters }] }`
- Add `getAll()` method to `ToolRegistry` that returns each tool's `definition.function` object.

**Backend — `POST /api/tools/execute` (new, authenticated):**
- Body: `{ toolName: string, args: object, sessionId: string }`
- Directly invokes `ToolRegistry.execute(toolName, args, context)` — no LLM involved.
- Returns `{ result: string }` — raw tool output.
- If tool sends intermediate messages via `context.send()`, collect and include in response as `intermediateMessages`.

**Frontend — slash command trigger:**
- Typing `/` as the first character in the input field fetches `GET /api/tools` (cache result in module-level variable for the session).
- Show roll-up menu. As user types more (e.g., `/jul`), filter tool list in real time by name.
- Pressing `Enter` or tapping an item selects it.
- `Escape` or deleting the `/` dismisses the menu.

**Roll-up menu UI:**
- Slides up from the input bar: `transform: translateY(100%)` → `translateY(0)` with 200ms ease transition.
- Positioned just above the input bar, full width, max height 50vh, scrollable.
- Each item: `/tool-name` in bold monospace + description in muted smaller text.
- `↑`/`↓` arrow keys navigate. Active item has highlighted background.
- Tap/click outside dismisses.

**On selection:**
- If tool has required parameters: fill input with `/tool-name ` and place cursor at end (user types args).
- If tool has no required parameters: execute immediately via `POST /api/tools/execute`.

**Argument parsing (frontend):**
- Parse text after tool name as `key=value` pairs separated by spaces.
- For tools with a single required string parameter, treat the entire remainder as that parameter's value.
- Examples:
  - `/run_make git-status` → `{ target: 'git-status' }`
  - `/write_note filename=ideas content=hello world` → `{ filename: 'ideas', content: 'hello world' }`

**Result display:**
- Show a loading indicator while executing.
- Display result as an assistant message with a `[/tool-name]` prefix tag to distinguish from LLM responses.

---

## 6. Sidebar — Chat Thread Management

**Complexity:** High
**Files:** `backend/src/index.ts`, `backend/src/core/lib/data/file_system.ts`, `frontend/src/App.tsx`, `frontend/src/index.css`

### Design Decisions (confirmed)
- Show **all** sessions (not filtered by source — includes Discord and any other origin).
- Users **can delete** threads.
- Thread name = `{date} {time} — {first 10 words of first user message}` (auto-generated, not user-editable).

### Context
Currently the frontend hardcodes `'web-boss-session'` as the session ID. The backend already supports arbitrary session IDs. Session history files live in `data/session_history/{sessionId}.json` with shape `{ lastActivityAt: string, messages: Message[] }`.

### Spec

**Backend — `GET /api/sessions` (new, authenticated):**
- Reads all `.json` files (non-archived — exclude filenames containing `_` before `.json`, as archives are named `{id}_{timestamp}.json`) from `data/session_history/`.
- For each file:
  - Parse `lastActivityAt` and `messages`.
  - Compute thread name: format `lastActivityAt` as `"DD MMM YYYY HH:mm"` + ` — ` + first 10 words of the first `role: 'user'` message content.
  - Compute preview: first 80 chars of the **last** `role: 'user'` message content.
- Sort by `lastActivityAt` descending.
- Return:
  ```ts
  { sessions: [{ id: string, name: string, preview: string, lastActivityAt: string }] }
  ```

**Backend — `POST /api/sessions` (new, authenticated):**
- Generates a new session ID: `session-{Date.now()}`.
- Creates an empty session file: `{ lastActivityAt: new Date().toISOString(), messages: [] }`.
- Returns `{ sessionId: string }`.

**Backend — `DELETE /api/sessions/:sessionId` (new, authenticated):**
- Deletes `data/session_history/{sessionId}.json`.
- Safety check: reject if `sessionId` contains path traversal characters (`..`, `/`).
- Returns 204 on success.

**Frontend changes:**
1. Replace hardcoded `'web-boss-session'` with an `activeSessionId` state variable (initialised from `localStorage.getItem('activeSessionId') || null`).
2. On mount, if no `activeSessionId` in localStorage: call `POST /api/sessions` to create one, store in localStorage and state.
3. Add a `MessageSquare` icon button to the header (left side) that toggles the sidebar.
4. Sidebar: slides in from the left as an overlay (CSS `transform: translateX(-100%)` → `translateX(0)`, 250ms ease), covers ~70% of screen width.
5. Sidebar contents:
   - Header: "Threads" title + close (`X`) button.
   - "New Thread" button — calls `POST /api/sessions`, sets new session as active, closes sidebar, clears messages.
   - Scrollable list fetched from `GET /api/sessions`. Each item:
     - **Name** (bold): the auto-generated `{date} {time} — {first 10 words}` string.
     - **Preview** (muted): 80-char preview.
     - **Timestamp** (small, right-aligned): relative time (e.g., "2h ago").
     - Active session: highlighted background.
   - Swipe left on an item → reveals red "Delete" button → on confirm, calls `DELETE /api/sessions/:id`, removes from list; if deleted session was active, activate the next most recent session (or create a new one if empty).
6. Tapping a session item: sets it as `activeSessionId`, stores in localStorage, fetches history via `GET /api/history/:sessionId`, closes sidebar.
7. Tapping outside sidebar (on the dimmed overlay) closes it.
8. A semi-transparent dark overlay covers the rest of the screen when sidebar is open.

---

## 7. Security Review

**Complexity:** Medium (research + documentation)
**Files:** `backend/src/index.ts`, `frontend/src/App.tsx`, `.env.example`, `SECURITY_REVIEW.md` (to create)

### Spec

Perform a thorough security audit of the Boss Agent system and produce `SECURITY_REVIEW.md` at the repository root. The review must cover the following areas:

**1. Password / credential handling:**
- How is `BOSS_PASSWORD` used? Is it ever transmitted to the frontend or logged?
- Is it safely loaded from `.env` and never exposed in API responses?
- Check all API routes for any accidental exposure of environment variables.

**2. JWT security:**
- Token stored in `localStorage` — document the XSS risk and whether `httpOnly` cookies would be more appropriate.
- JWT expiry: currently 24h. Is this appropriate?
- `JWT_SECRET` fallback (`'your-fallback-secret'`) — flag this as a critical misconfiguration risk.

**3. Authentication coverage:**
- Are all sensitive API routes protected by `authenticateJWT`?
- Is `GET /api/health` intentionally unprotected?
- Are there any routes that could be accessed without auth?

**4. Input validation:**
- Is user message content sanitised before it reaches the LLM or file system?
- The `write_note` tool writes to `data/memory/` — can a malicious prompt cause path traversal?
- The `read_memory` tool reads files — can it be manipulated to read arbitrary files?

**5. Command injection (Makefile security model):**
- Document how `MakeExecutor` blocks dangerous characters.
- Are there edge cases where the sanitisation could be bypassed?

**6. Logging and data retention:**
- Are API tokens, passwords, or JWT values ever written to log files?
- Daily log rotation — is there a retention policy?

**7. CORS and network exposure:**
- Is the backend CORS configured? What origins are allowed?
- Is the API intended to be publicly accessible or local-only?

**Output format for SECURITY_REVIEW.md:**
- One section per area above.
- Each finding rated: `[LOW]`, `[MEDIUM]`, `[HIGH]`, `[CRITICAL]`.
- Recommended remediation for each finding.
- A summary table at the top with all findings.

---

## 8. Fix Tool Calling System

> **Note:** Model selection will be handled by the user directly. This spec covers the structural fix only — ensuring native tool call responses are handled correctly and the inline regex parsing is a true last-resort fallback.

### Context
The current tool calling implementation in `boss_agent_service.ts` (lines 341-417) manually parses LLM output for inline tool calls using regex — a pattern prone to failure when models don't follow the format exactly. Groq's native tool calling (via `tool_calls` in the response) is used but falls back to this fragile parsing. The loop runs up to 10 rounds (configurable via `MAX_TOOL_ROUNDS`).

### Spec

**1. Create `OpenAIProvider` class** at `backend/src/core/lib/core/openai_provider.ts`:
- Implement the same `LLMProvider` abstract class interface (`chat()` and `transcribe()`).
- Use `openai` npm package (`npm install openai`).
- Constructor accepts `apiKey`, `models` (array for fallback), `whisperModel`.
- `chat()` method uses native OpenAI tool calling (no regex parsing needed — the SDK returns structured `tool_calls`).
- `transcribe()` uses OpenAI Whisper API.
- Handles rate limit (429) and other errors the same way as `GroqProvider`.

**2. Update `backend/src/index.ts`** to instantiate the correct provider based on `LLM_PROVIDER` env var:
```
LLM_PROVIDER=openai  → use OpenAIProvider with OPENAI_API_KEY
LLM_PROVIDER=groq    → use GroqProvider (default, existing)
```

**3. In `BossAgentService`:**
- The inline tool-call parsing (lines 341-417) should remain as a last-resort fallback ONLY for providers that don't return structured `tool_calls`.
- Ensure that when a provider returns native `tool_calls`, those take precedence over regex parsing.
- The existing fallback chain (retry on `tool_use_failed`, reduce history on `reduce message length`) should be preserved.

**4. Update `.env.example`** to add:
```
LLM_PROVIDER=groq
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

---

## 9. Bootstrap Request + Turso Cache Sync

**Complexity:** High — **depends on spec #0 (Turso DB layer) being implemented first.**
**Files:** `backend/src/index.ts`, `frontend/src/App.tsx`

> Interpretation confirmed: "cache state" = the message history the PWA has cached locally. The bootstrap endpoint resolves the delta between what the PWA has and what Turso has, returning the authoritative merged result.

### Architecture

The PWA caches messages in `localStorage` per session. On every startup, it sends what it has to the backend. The backend — which has the authoritative Turso record — compares the two and returns the winner. Thereafter, the frontend only sends updates when the user sends a message (the backend writes to Turso after each `POST /api/message`).

```
PWA starts up
  → reads localStorage cache (may be stale / empty)
  → POST /api/bootstrap { sessionId, cache: [...localMessages] }
  → backend reads Turso: SELECT messages FROM sessions WHERE id = ?
  → compare: take whichever has more recent last_activity_at
     (Turso wins ties — it's authoritative)
  → return { messages: [...authoritative], sessionId }
  → PWA renders authoritative messages, writes back to localStorage
```

### Spec

**Backend — `POST /api/bootstrap` (new, authenticated):**
- Body: `{ sessionId: string, cache: Message[] }` — the PWA's locally stored messages.
- Logic (using `TursoDB` from spec #0):
  1. Query Turso: `SELECT messages, last_activity_at FROM sessions WHERE id = ?`
  2. If no Turso record → this is a new session. Insert the frontend cache into Turso and return it.
  3. If Turso has a record:
     - Compare `last_activity_at` of the Turso record vs the last message timestamp in the frontend cache.
     - Return whichever is newer. Turso is authoritative in case of a tie.
     - If frontend had newer data (e.g., Turso was cleared), upsert the frontend cache into Turso first.
  4. Return: `{ messages: Message[], sessionId: string, lastActivityAt: string }`
- This replaces `GET /api/history/:sessionId` for the PWA startup flow (keep the old endpoint for backwards compat / Discord bot).

**Backend — update `POST /api/message`:**
- After `BossAgentService.processMessage()` completes and saves to the (now Turso-backed) `FileSystem.saveSession()`, no additional cache write is needed — it's already in Turso.

**Frontend — update `App.tsx`:**

1. Add per-session localStorage cache:
   - Key: `messages-{sessionId}` — stores `Message[]` as JSON.
   - On startup, read this key; it may be empty/null if first use.

2. Replace the current `GET /api/history/:sessionId` startup call with `POST /api/bootstrap`:
   ```ts
   const localCache = JSON.parse(localStorage.getItem(`messages-${sessionId}`) || '[]')
   const response = await axios.post('/api/bootstrap', { sessionId, cache: localCache })
   setMessages(response.data.messages)
   localStorage.setItem(`messages-${sessionId}`, JSON.stringify(response.data.messages))
   ```

3. After each successful `POST /api/message` response:
   - Append the new messages to the existing localStorage cache (don't replace — append user message + response).
   - This keeps the localStorage cache in sync without a full re-fetch.

4. Active session ID:
   - Store in `localStorage.getItem('activeSessionId')`.
   - On first load (no stored session ID), call `POST /api/sessions` to create one, then bootstrap it.
   - On session switch (sidebar), update localStorage and re-run the bootstrap flow for the new session.

---

## 10. Transition Skills to Tools

**Complexity:** Medium — **do after spec #0 (MakeExecutor removal is handled there).**
**Files:** `backend/src/core/lib/tools/gemini_wrapper.ts`, `backend/src/core/lib/tools/remind.ts`, `backend/src/core/lib/tools.ts`

### Context
Two tool files exist but are not registered in `ToolRegistry`:
- `backend/src/core/lib/tools/gemini_wrapper.ts`
- `backend/src/core/lib/tools/remind.ts`

The `run_make` tool and MakeExecutor fallback are removed in spec #0.

### Spec

**Step 1 — Register existing unregistered tools:**
1. Read both `gemini_wrapper.ts` and `remind.ts` fully to verify they have a valid `definition` object and working `execute()` method.
2. If either is incomplete (missing `definition`, broken `execute`), fix it first.
3. Import and register both in `backend/src/core/lib/tools.ts` following the same pattern as existing tools.

**Step 2 — Update system prompt file index:**
1. The system prompt in `boss_agent_service.ts` injects a file system index listing `data/skills/` files.
2. Archive all skill markdown files that are now covered by native tools (move to `data/skills/_archive/`):
   - `jules-agent/` → archived (replaced by spec #11)
   - Any other skill files whose functionality is now a registered tool.
3. Keep `create-boss-skills/` skill as-is (meta skill, not a tool).
4. Do NOT delete — archive only.

**Step 3 — Update system prompt to remove skill references:**
- If the system prompt instructs the agent to use specific make targets or skill scripts, update those instructions to reference the equivalent tool names instead.

**Skills NOT to convert (keep as-is):**
- `data/skills/jules-agent/` — being replaced by Node Jules Tool (spec #11).
- `data/skills/create-boss-skills/` — meta-skill for creating new skills; keep for reference.

---

## 11. Convert Jules Tool: Python → Node/TypeScript

**Complexity:** High
**Files:** `backend/src/core/lib/tools/jules.ts`, `backend/src/core/lib/executors/make_executor.ts`
**New files:** `backend/src/core/lib/clients/jules_client.ts`

### Context
The existing `jules.ts` tool (186 lines) routes all actions through `MakeExecutor` → Makefile targets → Python scripts in `data/skills/jules-agent/`. The Python scripts (`jules_client.py`, `jules_api_controller.py`, `jules_service.py`, `jules_db.py`) call the Jules API via HTTP.

The goal is to eliminate the Python dependency entirely by implementing the Jules API client in TypeScript.

### Jules API
The Jules API is a REST API. Key information from `data/skills/jules-agent/SKILL.md`:
- Auth: `JULES_API_KEY` header
- Base URL: From existing Python client code
- Operations: create session, list sessions, get session, delete session, send message, approve plan, list sources, list activities

### Spec

**1. Create `backend/src/core/lib/clients/jules_client.ts`:**
- A TypeScript class `JulesClient` that wraps the Jules API using `axios` (already installed).
- Read the Python client files (`jules_client.py`, `jules_api_controller.py`) carefully to extract:
  - Exact API endpoint URLs
  - Request/response shapes
  - Authentication header format
  - Error handling patterns
- Implement each method as an `async` TypeScript function:
  ```ts
  class JulesClient {
    constructor(private apiKey: string, private baseUrl: string) {}

    async createSession(opts: CreateSessionOpts): Promise<Session>
    async listSessions(opts?: { pageSize?: number }): Promise<Session[]>
    async getSession(sessionId: string): Promise<Session>
    async deleteSession(sessionId: string): Promise<void>
    async sendMessage(sessionId: string, message: string): Promise<void>
    async approvePlan(sessionId: string): Promise<void>
    async listSources(opts?: { pageSize?: number, filter?: string }): Promise<Source[]>
    async listActivities(sessionId: string, opts?: { pageSize?: number }): Promise<Activity[]>
  }
  ```
- Type all request/response shapes.
- Handle HTTP errors gracefully (throw descriptive errors).

**2. Update `backend/src/core/lib/tools/jules.ts`:**
- Replace all `MakeExecutor.run()` calls with calls to `JulesClient`.
- Instantiate `JulesClient` with `process.env.JULES_API_KEY` and the base URL.
- Keep the existing:
  - `humanizeTimestamp()` function (lines 13-41)
  - `__NO_RESPONSE_NEEDED__` pattern (lines 165-172)
  - Truncation logic (500 char limit for LLM, full output in `_fullStdout`)
- Remove all Makefile target mapping logic (lines 99-149) and `MakeExecutor` import.

**3. Remove Jules-related Makefile targets** from the root `Makefile` once the Node client is verified working. Move the Python scripts (`jules_client.py`, `jules_api_controller.py`, `jules_service.py`, `jules_db.py`, `requirements.txt`) to `data/skills/jules-agent/_deprecated/` — do NOT delete them.

**4. Update `.env.example`** to clarify that `JULES_API_KEY` is now used directly by the Node client (no Python required).

---

## 12. Create GitHub Tool

**Complexity:** Medium
**Files:** `backend/src/core/lib/tools/github.ts` (new), `backend/src/core/lib/tools.ts`

### Context
This replaces the `pr-list`, `pr-diff`, `pr-view`, `pr-merge`, `pr-close` Makefile targets (which used `gh` CLI — not available on Vercel). This is **not** a local git tool — it's purely a GitHub REST API client for reading and acting on PRs and issues remotely.

### Spec

**Create `backend/src/core/lib/tools/github.ts`:**

Install: `npm install @octokit/rest`

Single `GitHubTool` class, action-based:

```ts
definition: {
  name: 'github',
  description: 'GitHub API — read PR details, comments, diffs, manage issues and PRs',
  parameters: {
    action: {
      enum: [
        'list-prs',
        'get-pr',           // PR details + status checks + reviewers
        'get-pr-diff',      // full file diff for a PR
        'get-pr-comments',  // all review comments + issue comments on a PR
        'merge-pr',
        'close-pr',
        'list-issues',
        'get-issue',        // issue body + all comments
        'create-issue',
        'close-issue',
        'list-repos',
        'get-repo'
      ]
    },
    repo: { type: 'string', description: 'owner/repo (e.g. "acme/my-app")' },
    pr_number: { type: 'number' },
    issue_number: { type: 'number' },
    title: { type: 'string' },
    body: { type: 'string' },
    label: { type: 'string' },           // optional filter for list-issues
    state: { type: 'string', enum: ['open', 'closed', 'all'] },
    merge_method: { type: 'string', enum: ['merge', 'squash', 'rebase'] }
  }
}
```

**Actions in detail:**

- `list-prs` — `octokit.pulls.list({ state: state || 'open' })` → returns array of: `{ number, title, author, created_at, updated_at, url, head_branch, base_branch, draft, mergeable_state }`

- `get-pr` — `octokit.pulls.get()` + `octokit.repos.getCombinedStatusForRef()` → returns full PR description, labels, assignees, reviewers, review states, CI check statuses, merge commit SHA

- `get-pr-diff` — `octokit.pulls.get({ mediaType: { format: 'diff' } })` → raw unified diff. Truncate to 4000 chars for LLM; save full diff via `display_large_output` pattern if larger.

- `get-pr-comments` — Fetch both review comments (`octokit.pulls.listReviewComments()`) and general issue comments (`octokit.issues.listComments()`). Merge, sort by `created_at`, format as:
  ```
  [2024-01-15 @username] path/to/file:42
  > quoted diff line
  Comment body here
  ```

- `merge-pr` — `octokit.pulls.merge({ merge_method: merge_method || 'squash' })`. Returns merge commit SHA or error.

- `close-pr` — `octokit.pulls.update({ state: 'closed' })`.

- `list-issues` — `octokit.issues.listForRepo({ state, labels: label })` → `{ number, title, author, created_at, labels, url }`

- `get-issue` — `octokit.issues.get()` + `octokit.issues.listComments()` → issue body + all comment bodies with author/date.

- `create-issue` — `octokit.issues.create({ title, body, labels? })`.

- `close-issue` — `octokit.issues.update({ state: 'closed' })`.

- `list-repos` — `octokit.repos.listForAuthenticatedUser()` → name, description, default branch, updated_at.

- `get-repo` — `octokit.repos.get()` → full metadata.

**Authentication:** `GITHUB_TOKEN` env var. Return a clear error if not set.

**Update `.env.example`:**
```
GITHUB_TOKEN=
```

**Register in `backend/src/core/lib/tools.ts`** following the existing pattern.

---

## 13. Verify Gemini Wrapper Is Registered

**Complexity:** Low
**Files:** `backend/src/core/lib/tools/gemini_wrapper.ts`, `backend/src/core/lib/tools.ts`

### Context
`backend/src/core/lib/tools/gemini_wrapper.ts` exists but it's unclear if it's registered in the `ToolRegistry` or included in the system's active tools.

### Spec
1. Read `backend/src/core/lib/tools/gemini_wrapper.ts` in full.
2. Read `backend/src/core/lib/tools.ts` to check if `GeminiWrapperTool` is imported and registered.
3. If not registered, add it.
4. Verify the tool's `execute()` method correctly:
   - Calls the Gemini CLI wrapper script.
   - Restricts to only: web search, deep research, image generation (per `docs/new-features.md` spec).
   - Returns sanitised output.
5. Verify `GEMINI_API_KEY` is in `.env.example`.
6. If the wrapper shell script doesn't exist, create it at `data/skills/gemini_wrapper.sh` with appropriate restrictions.

---

## 14. Claude CLI / Anthropic API Tool

**Complexity:** Medium
**Files:** `backend/src/core/lib/tools/` (new file), `backend/src/core/lib/tools.ts`

### Context
The objective is to allow the Boss Agent to delegate tasks to Claude (Anthropic). Two approaches:
1. **Claude CLI** (`claude` command) — if installed on the host, invoke it via MakeExecutor or a direct child process.
2. **Anthropic SDK** — call the Anthropic API directly from Node.

The Makefile gatekeeper model suggests approach 1 (via make targets). But approach 2 is cleaner as a native Node tool.

### Spec

**Create `backend/src/core/lib/tools/claude.ts`:**

Install `@anthropic-ai/sdk`: `npm install @anthropic-ai/sdk`

Implement a `ClaudeTool` class:

```ts
definition: {
  name: 'claude',
  description: 'Delegate a task to Claude (claude-sonnet-4-6). Use for complex reasoning, code generation, or analysis tasks.',
  parameters: {
    prompt: {
      type: 'string',
      description: 'The task or question to send to Claude'
    },
    model: {
      type: 'string',
      description: 'Model ID to use (default: claude-sonnet-4-6)',
      default: 'claude-sonnet-4-6'
    },
    max_tokens: {
      type: 'number',
      description: 'Max response tokens (default: 4096)',
      default: 4096
    }
  },
  required: ['prompt']
}
```

**`execute()` method:**
1. Instantiate `Anthropic` client with `process.env.ANTHROPIC_API_KEY`.
2. Call `client.messages.create()` with `model`, `max_tokens`, and `messages: [{ role: 'user', content: prompt }]`.
3. Return the text content of the response.
4. If `ANTHROPIC_API_KEY` not set, return a clear error.
5. Long responses (>2000 tokens) should use the `display_large_output` pattern: save to file, return reference.

**Update `.env.example`:**
```
ANTHROPIC_API_KEY=
```

**Register in `backend/src/core/lib/tools.ts`.**

---

## Design Decisions Log

| # | Question | Decision |
|---|----------|----------|
| Q1 | Slash commands — what do they do? | Bypass LLM, invoke tools directly. Menu = all registered ToolRegistry tools. |
| Q2 | Sidebar — all sessions or web-only? Nameable? Deletable? | All sessions. Name = `{date} {time} — {first 10 words}`. Users can delete. |
| Q3 | "Cache state" — what is it? | Message history cached in localStorage. Bootstrap sends it to backend → Turso. Confirmed. |
| Q4 | Model switch | User will handle model selection directly. Spec #8 covers structural fix only. |
| Q5 | Jules Python — delete or keep? | Keep Python scripts, move to `data/skills/jules-agent/_deprecated/`. |
| Q6 | Makefile on Vercel? | ❌ `make` not available in Vercel Lambda. Decision: eliminate make entirely. See spec #0. |
| Q7 | Database for Vercel persistence? | **Turso** (hosted LibSQL). HTTP-based, Vercel-compatible. Replaces all file-based storage. |
| Q8 | Cache/SQLite location? | Turso — no local file needed. `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` env vars. |

## Implementation Order (dependency-aware)

```
Spec #0  →  Spec #9  →  Spec #6 (sessions endpoint uses Turso)
Spec #0  →  Spec #10 (MakeExecutor already gone)
Spec #0  →  Spec #11 (Jules Node client, removes last Python/make dependency)
Spec #11 →  Spec #5  (slash commands work fully once tools are native)
Spec #0  →  Spec #12 (GitHub tool replaces pr-* make targets)
Specs #1, #2, #3, #4 are independent — no dependencies, do in any order
Spec #7 (security review) — do last, after architecture settles
```
