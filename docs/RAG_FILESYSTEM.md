# RAG & FileSystem Architecture 📁

The Boss Agent uses a local, filesystem-based Retrieval-Augmented Generation (RAG) system. It prioritizes simplicity, auditability, and ease of maintenance over complex vector databases.

## Overview

All "knowledge" and "memory" are stored as Markdown files in a structured `data/` directory. The `FileSystem` service manages the indexing, retrieval, and persistence of these files.

## Directory Structure

-   **`vault/` (data/vault/)**: Read-only (for the agent) knowledge base containing core documentation and static facts.
-   **`memory/` (data/memory/)**: Agent-writable notes. This is where the agent stores project plans, meeting summaries, and long-term state.
-   **`skills/` (data/skills/)**: Contains documentation and scripts for specific external integrations (e.g., `git_wrapper.js`).
-   **`large_outputs/` (data/large_outputs/)**: Storage for tool outputs that exceed token limits, preventing them from bloating the context window.
-   **`session_history/` (data/session_history/)**: JSON logs of every conversation, isolated by Session ID (Channel ID).

## Core Components

### 1. `FileSystem` Service
Located in `backend/src/core/lib/data/file_system.ts`, it provides the primary API for file operations.
-   **Root Resolution:** Automatically discovers the `projectRoot` across development and production environments.
-   **FileSystem Indexing:** Generates a lightweight summary of all available files. It parses file content for metadata like `[ALWAYS_REMEMBER]` (triggered by `always_remember: true` in YAML frontmatter).
-   **Header-Based Chunking:** Transparently splits large Markdown files into smaller chunks (approx. 2000-3000 chars) based on headers, ensuring the LLM only receives relevant sections.
-   **Path Traversal Protection:** Strictly validates filenames against a whitelist of allowed directories.

### 2. Note Management
When the agent uses the `write_note` tool:
-   **Automatic Frontmatter:** The `FileSystem` injects a YAML header with `title`, `tags`, `date_created`, and `always_remember` status.
-   **Markdown Enforcement:** Files are saved with `.md` extensions for compatibility with RAG tools.

### 3. Session Isolation & Archival
-   **Isolation:** Each Discord channel or Web session gets a unique JSON file.
-   **Archival:** Sessions are moved to an archive (e.g., `sessionId_TIMESTAMP.json`) after 10 minutes of inactivity. This "clears the slate" for new conversations while preserving history for audit.

## RAG Workflow

1.  **Index Injection:** The system prompt includes the `FileSystem` index, showing the agent what files exist.
2.  **Explicit Retrieval:** The agent uses the `read_memory` tool to fetch the full content of a file it identifies as relevant from the index.
3.  **Metadata Prioritization:** Notes marked with `always_remember: true` are flagged in the index, signaling their importance to the agent's attention mechanism.

---
*Documented by Chronicler Agent.*
