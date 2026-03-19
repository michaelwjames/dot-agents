# Frontend PWA (Mobile-First) 📱

The "Boss Agent" frontend is a modern, mobile-only React Progressive Web App (PWA) that provides an intuitive interface for interacting with the Boss Agent via text and voice.

## Overview

Located in the `frontend/` directory, the application is built with React 19, Vite, and Tailwind CSS. It focuses on a clean "Digital Butler" experience, featuring a chat-like interface and high-speed voice recording.

## Core Features

### 1. Locked Access
-   **No Registration:** The app is restricted to a single password-protected login.
-   **Security:** Uses JWT (JSON Web Token) stored in `localStorage` for persistent authentication.
-   **Validation:** All API calls include the `Authorization: Bearer <token>` header.

### 2. Multi-Modal Chat
-   **Chat History:** Loads previous messages for the `web-boss-session` upon login.
-   **Optimistic UI:** Displays user messages immediately while the agent processes the request.
-   **Intermediate Feedback:** Supports displaying "intermediate" messages (e.g., tool status updates) as they happen.

### 3. Voice-First Interaction
-   **Push-to-Talk:** A high-speed recording mechanism using `MediaRecorder`.
-   **In-App Transcription:** Voice notes are sent to the `/api/transcribe` endpoint for near-instant inference via Groq Whisper.
-   **Seamless Feedback:** Once transcribed, the text is automatically sent to the agent as a message.

## Components & Structure

-   **`App.tsx`**: The main application entry point, containing state management for auth, messages, and recording.
-   **`lucide-react`**: Provides consistent iconography (Send, Mic, LogOut).
-   **Axios**: Handles all backend communication with configured headers for JWT.
-   **`main.tsx`**: Standard Vite entry point.
-   **`index.css`**: Contains custom styles for the chat bubbles and mobile-responsive layout.

## Technical Details

-   **Session ID:** Defaults to `web-boss-session` to maintain a single continuous thread for the Web Boss.
-   **PWA Manifest:** Configured via standard Vite-PWA patterns to allow "Add to Home Screen" functionality on iOS and Android.
-   **Auto-Scroll:** Uses a `chatEndRef` and `useEffect` to ensure the most recent message is always in view.

## Build & Deployment

The frontend is compiled to a static `dist/` folder using `pnpm build` (which runs `tsc && vite build`). This folder is then served by the backend or a CDN.

---
*Documented by Chronicler Agent.*
