# Makefile Security Model 🛡️

The Makefile Security Model is the cornerstone of the Boss Agent's safety architecture. It ensures that the agent can never execute arbitrary shell commands, restricting it to a predefined set of audited actions.

## Overview

The system uses a "Gatekeeper" pattern where all external tool executions are routed through a root-level `Makefile`. The agent interacts with this via the `MakeExecutor`, which acts as a high-security firewall.

## Core Components

### 1. The Root `Makefile`
The `Makefile` serves as the authoritative list of allowed actions. Each target represents a specific, sanitized command that the agent is permitted to run (e.g., `git-status`, `pr-list`, `linear-task`).

### 2. `MakeExecutor`
Located in `backend/src/core/lib/executors/make_executor.ts`, this class is responsible for:
- **Target Discovery:** It parses the `Makefile` at runtime to extract valid target names.
- **Validation:** It rejects any request for a target not explicitly defined in the `Makefile`.
- **Sanitization:** It uses a strict regex (`DANGEROUS_CHARS`) to block shell metacharacters like `;`, `&`, `|`, `` ` ``, `$`, etc., in both target names and argument values.
- **Normalization:** It automatically converts argument keys from kebab-case or camelCase to the `UPPER_CASE` convention required by `make` variables.
- **Execution:** It wraps the final command in a `make -f Makefile target KEY="VALUE"` call.

### 3. `RunMakeTool`
The primary interface for the LLM to trigger system actions. It provides a structured way to pass a `target` and an `args` object.

## Security Features

-   **No Direct Shell Access:** The agent does not have access to `exec` or `spawn` directly.
-   **Whitelist Enforcement:** Only targets listed in the `Makefile` (excluding `.PHONY`) are executable.
-   **Argument Gating:** Arguments are passed as environment variables to the `make` process, preventing simple command injection.
-   **Timeout Management:** The `MakeExecutor` enforces a 60-second timeout on all executions to prevent resource exhaustion.
-   **Target Caching:** For performance, the executor caches allowed targets and only reloads them if the `Makefile` timestamp (`mtimeMs`) changes.

## Tool Registry & Interceptors
The `ToolRegistry` manages the lifecycle of tool execution and allows for cross-cutting concerns through interceptors:
-   **`TokenTruncationInterceptor`:** Prevents massive tool outputs from flooding the LLM's context.
-   **`LoggingInterceptor`:** Records all tool calls, arguments, and results for auditing.

---
*Documented by Chronicler Agent.*
