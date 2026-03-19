# Context, Tokens & Memory Compression 📉

Managing the LLM's finite context window is critical for maintaining the Boss Agent's performance and cost-efficiency. The system employs a multi-layered strategy to handle large histories and tool outputs.

## Overview

The Boss Agent uses a combination of proactive token tracking, a sliding window for session history, background memory compression, and automated output truncation to ensure it never exceeds model limits.

## Core Components

### 1. `TokenTracker`
Located in `backend/src/core/lib/analytics/token_tracker.ts`, this service uses `js-tiktoken` (`cl100k_base` encoding) to provide accurate token counts.
-   **Model Limits Repository:** It maintains a database of context windows and rate limits (RPM, TPM) for various Groq models (e.g., Llama 3.3 70B, Llama 4 Scout).
-   **Context Statistics:** It calculates the precise breakdown of tokens consumed by the system prompt, history, user message, and tool definitions.
-   **Rate Limit Tracking:** It logs requests over a rolling 24-hour window to estimate current TPM/RPM usage.

### 2. Token-Aware Sliding Window
Implemented within the `BossAgentService.processMessage` loop:
-   Before sending a request to the LLM, the service calculates the token count.
-   If the count exceeds the `MAX_CONTEXT_TOKENS` (6000), it iteratively removes the oldest messages from the history until the count falls within the limit (plus a safety headroom of 1000 tokens).

### 3. `MemoryCompressor`
Located in `backend/src/core/lib/services/compressor.ts`, this service proactively manages long-running sessions.
-   **Trigger:** When a session exceeds 20 messages or 4000 tokens.
-   **Strategy:** It takes the older messages (everything except the last 5 turns) and asks a separate LLM call to generate a dense, factual summary.
-   **Result:** The original old messages are replaced with a single `SUMMARY OF PREVIOUS TURNS` system message, significantly freeing up context for new interactions.

### 4. `TokenTruncationInterceptor`
A specialized interceptor that gates tool outputs.
-   **Threshold:** By default, if a tool's output exceeds 2000 tokens.
-   **Action:** The full output is saved to a file in `data/large_outputs/`.
-   **Feedback:** The LLM receives a truncated notification with the file path, preventing the context window from being "blown out" by a single large `git diff` or log file.

## Visibility & Monitoring

-   **`get_context_stats` Tool:** The agent can use this tool to check its own current token usage and rate limit status.
-   **`context-stats` Makefile Target:** Allows developers to view token statistics from the terminal.

---
*Documented by Chronicler Agent.*
