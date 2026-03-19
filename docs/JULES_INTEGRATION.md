# Jules Agent Skill Integration 🛠️

The Jules Agent is the Boss Agent's primary "Engineering Skill," allowing it to delegate complex coding tasks, repository-wide changes, and PR reviews to an external autonomous agent.

## Overview

The integration uses a specialized `JulesTool` in the backend that communicates with a Python-based CLI client. It features a sophisticated "Display-and-Truncate" pattern to manage long outputs and a local caching layer to reduce API latency.

## Core Components

### 1. `JulesTool` (The Bridge)
Located in `backend/src/core/lib/tools/jules.ts`, this tool:
-   **Action Mapping:** Maps high-level actions (e.g., `create`, `list-sessions`, `approve-plan`) to specific `jules-*` targets in the root `Makefile`.
-   **Display-and-Truncate Pattern:**
    -   It sends the **full output** of the Jules operation directly to the user's channel (e.g., Discord) using the `ToolContext`.
    -   It returns a **truncated version** (500 chars) to the LLM, keeping the reasoning context clean while ensuring the user sees the complete status.
    -   It attaches the `_fullStdout` to the result, which `history_sanitizer.ts` later restores to the session history so the agent has full context if it needs to "read back."
-   **Humanization:** Automatically converts ISO timestamps in the Jules output into relative time (e.g., "[3 minutes ago]") for better readability.

### 2. Python CLI Client (`jules-agent`)
Located in `data/skills/jules-agent/`, this consists of several modules:
-   **`jules_client.py`**: The low-level Axios-like client for the Jules API.
-   **`jules_service.py`**: Business logic for managing sessions and activities.
-   **`jules_db.py`**: Manages a local SQLite cache (`data/jules_cache.db`) for session metadata and activity logs.
-   **`jules_cli.py`**: The entry point for all Jules commands.

### 3. Caching Layer
To ensure the Boss Agent is "near-instant," the Jules skill implements state-aware TTL caching:
-   **Active Sessions:** Cached for 30 seconds.
-   **General Metadata:** Cached for 300 seconds.
-   **`jules-show-cached-sessions`**: A Makefile target that allows the agent to peek at its local database without making an external API call.

## Workflow: Creating a Jules Session

1.  **User Request:** "Boss, please fix the bug in repo-x."
2.  **Tool Call:** `jules(action="create", prompt="Fix bug...", repo="owner/repo-x")`.
3.  **Makefile Execution:** `make jules-create-session PROMPT="..." REPO="..."`.
4.  **CLI Action:** The Python client calls the Jules API, creates the session, and stores the ID in `jules_cache.db`.
5.  **Proactive Monitoring:** The `KairosEngine` periodically triggers `jules list-sessions` to check if any sessions have transitioned to `AWAITING_USER_FEEDBACK`.

---
*Documented by Chronicler Agent.*
