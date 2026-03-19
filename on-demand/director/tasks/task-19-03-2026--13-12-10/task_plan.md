# Task Plan - Sets #3 & #4 Implementation

## Status
- Overall Status: In Progress
- Current Phase: Initialization

## Phases

### 1. Initialization [x]
- [x] Create changelog entry
- [x] Create director task folder and files
- [x] Declare interrogation phase closed

### 2. Backend: Log Retrieval [ ]
- [ ] Add GET /api/logs endpoint to `backend/src/index.ts`
- [ ] Implement today/yesterday fallback logic
- [ ] Verify endpoint with test script

### 3. Frontend: Hamburger Menu [ ]
- [ ] Replace Logout button with Menu button in `App.tsx`
- [ ] Implement dropdown menu with "Console" and "Logout"
- [ ] Verify menu functionality

### 4. Frontend: Console Modal [ ]
- [ ] Implement `ConsoleModal` component/logic in `App.tsx`
- [ ] Implement log fetching and auto-scroll
- [ ] Implement Copy to Clipboard with feedback
- [ ] Add styles to `index.css`
- [ ] Verify modal UI and behavior

### 5. Frontend: Transcription Toggle Fix [ ]
- [ ] Refactor recording logic to toggle-based state machine (`idle`, `listening`, `sending`)
- [ ] Implement cancellation logic with `AbortController`
- [ ] Implement append logic for transcribed text
- [ ] Implement expanding UI and pulsing dot
- [ ] Add styles to `index.css`
- [ ] Verify toggle, expansion, and cancellation

### 6. Final Steps [ ]
- [ ] Run pnpm test
- [ ] Complete pre-commit steps
- [ ] Finalize changelog and submit

## Errors Encountered
- None yet.
