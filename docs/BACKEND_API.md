# Backend API Layer 🌐

The `backend` is a Node.js/Express application that serves as a high-performance wrapper for the `BossAgentService`, providing a secure gateway for the Web PWA and other external clients.

## Overview

Located in `backend/src/index.ts`, the server handles authentication, audio transcription, session management, and the core message-passing interface.

## Endpoints

### 1. Authentication (`POST /api/login`)
-   **Request:** `{ "password": "..." }`
-   **Validation:** Compares the provided password against `BOSS_PASSWORD` in the `.env` file.
-   **Response:** Returns a JWT `accessToken` valid for 24 hours.

### 2. Messaging (`POST /api/message`)
-   **Request:** `{ "sessionId": "...", "content": "..." }`
-   **Process:**
    1.  Authenticates the request via `authenticateJWT`.
    2.  Instantiates a `NormalizedMessage` for the `BossAgentService`.
    3.  Calls `bossAgentService.processMessage`.
    4.  Captures intermediate messages (e.g., from tools) and the final agent response.
-   **Response:** Returns the updated session history and any intermediate status messages.

### 3. Transcription (`POST /api/transcribe`)
-   **Request:** `multipart/form-data` with an `audio` blob.
-   **Process:**
    1.  Saves the incoming audio to a temporary file.
    2.  Calls `groq.transcribe` to perform the inference.
    3.  Deletes the temporary file.
-   **Response:** `{ "text": "..." }`

### 4. History (`GET /api/history/:sessionId`)
-   **Process:** Loads and returns the JSON session history for the specified `sessionId` from `data/session_history/`.

## Architecture & Security

-   **JWT Middleware:** All sensitive endpoints (messaging, history, transcription) are protected by the `authenticateJWT` middleware, which validates the `Authorization: Bearer <token>` header.
-   **Unified Boss Agent Instance:** The server initializes a single instance of `BossAgentService`, `GroqProvider`, `FileSystem`, and `ToolRegistry` on startup, ensuring consistent state across all API requests.
-   **Static Asset Hosting:** In production, the backend serves the compiled React PWA from `frontend/dist`.
-   **Nomenclature Loading:** The `Nomenclature` fuzzy-matching catalog is loaded asynchronously during server startup to avoid blocking initial requests.

## Deployment

The backend is configured for deployment as a Vercel Serverless Function (via `vercel.json` and `api/index.ts`) or as a standalone Node.js process.

---
*Documented by Chronicler Agent.*
