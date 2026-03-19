# Core Reasoning Loop & BossAgentService 🧠

The `BossAgentService` is the central nervous system of the Boss Agent. It orchestrates the flow of information between the user, the LLM, and the tool execution environment.

## Overview

The reasoning loop follows a classic "ReAct" (Reasoning and Acting) pattern, enhanced with multi-modal support (voice transcription), token-aware context management, and loop detection.

## Core Components

### 1. `BossAgentService` (The Orchestrator)
Located in `backend/src/core/lib/services/boss_agent_service.ts`, this class handles the `processMessage` method, which is the entry point for all user interactions.

### 2. `NormalizedMessage` Interface
Abstracts the source of the message (Discord, Web PWA, or Terminal), providing a consistent set of methods for replying and sending typing indicators.

### 3. `GroqProvider`
Wraps the Groq SDK to provide high-speed LLM completions and Whisper-based voice transcription. It includes robust error handling for rate limits (429) and context length issues.

## The Message Processing Flow

1.  **Input Normalization:**
    -   If an audio attachment is present, it is transcribed via Groq Whisper.
    -   Text content is extracted.
2.  **Context Assembly:**
    -   The **Soul Prompt** (Personality) is loaded from `data/soul.md`.
    -   A **File Index** is generated from `vault/`, `memory/`, and `skills/`.
    -   **Session History** is loaded from `data/session_history/`.
3.  **Token-Aware Sliding Window:**
    -   The service calculates the token count for the system prompt, history, and user input.
    -   If the count exceeds `MAX_CONTEXT_TOKENS` (6000), history is truncated, prioritizing the most recent messages.
4.  **The Reasoning Loop:**
    -   The agent sends the context to the LLM (Groq).
    -   **Loop Detection:** It tracks tool execution history to prevent infinite cycles.
    -   **Inline Tool Parsing:** It supports both standard tool calls and custom `<function/name>{args}</function>` tags.
5.  **Tool Execution:**
    -   Tool calls are dispatched to the `ToolRegistry`.
    -   Results are fed back into the next iteration of the loop.
6.  **Final Response:**
    -   The agent generates a final text response.
    -   If the response is `NO_ACTION_REQUIRED` (often triggered by Kairos ticks), it is suppressed.
7.  **History Persistence & Compression:**
    -   The updated session history is saved.
    -   If the history is too large, the `MemoryCompressor` is triggered in the background to summarize old turns.

## Safety & Hardening

-   **Max Tool Rounds:** Defaults to 10 to prevent runaway processes.
-   **Loop Detection:** If the same tool/args combination is repeated 3 times within 20 turns, the loop is aborted.
-   **Safe Chat:** Retries logic specifically for model hallucinations (invalid JSON in tool calls).
-   **History Sanitization:** Uses `history_sanitizer.ts` to restore full stdout for tools that use the display-and-truncate pattern, ensuring the LLM has complete context when reading history.

---
*Documented by Chronicler Agent.*
