# Kairos Engine & Autonomy 🕰️

The `KairosEngine` provides the "autonomous heartbeat" for the Boss Agent, enabling it to transition from a reactive chatbot to a proactive digital assistant.

## Overview

Most conversational agents only act when a user sends a message. Kairos changes this by periodically "waking up" the agent with a synthetic system message, allowing it to check the status of long-running tasks or notify the user of pending items without direct prompting.

## Core Components

### 1. `KairosEngine` Class
Located in `backend/src/core/lib/engine/kairos.ts`, it manages a `NodeJS.Timeout` loop. By default, it fires every 30 minutes.

### 2. The Synthetic Tick Message
When the timer fires, Kairos generates a special `[SYSTEM: KAIROS_TICK]` message. This message contains:
-   **Context-Review Instructions:** A prompt for the agent to review its current tasks and session logs.
-   **Proactive Directives:** Specific instructions to check for active Jules sessions, particularly those in the `AWAITING_USER_FEEDBACK` state.
-   **Silence Protocol:** A clear instruction to reply with `NO_ACTION_REQUIRED` if no work is needed.

## Integration & Lifecycle

1.  **Initialization:** In `backend/src/bot.ts`, the `KairosEngine` is started if `KAIROS_ENABLED` is true.
2.  **Session Discovery:**
    -   Upon a tick, the bot reads the `data/session_history/` directory to identify active (non-archived) sessions.
    -   It maps the generic tick to each active session ID.
3.  **The Reasoning Loop:**
    -   Each session's tick is enqueued via the **Lane Queue Management** system.
    -   The `BossAgentService` processes the tick as it would any other message, but with the specialized `[SYSTEM: KAIROS_TICK]` context.
4.  **Proactive Action:**
    -   If the agent identifies an issue (e.g., a Jules PR needs approval), it sends a message directly to the Discord channel using the session's `send` method.
5.  **Spam Prevention:**
    -   The `BossAgentService` includes logic to suppress the `NO_ACTION_REQUIRED` response, ensuring the user's channel remains clean unless real action is taken.

## Safety & Ethics

-   **Archival Awareness:** Kairos ignores archived sessions (pattern: `{id}_{ISO_TIMESTAMP}.json`), preventing it from "waking up" old or irrelevant conversations.
-   **Strict Silence:** The `NO_ACTION_REQUIRED` protocol is a mandatory safety feature to prevent the agent from becoming an "autonomous spam bot."

---
*Documented by Chronicler Agent.*
