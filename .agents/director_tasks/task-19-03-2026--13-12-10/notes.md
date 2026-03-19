# Research & Implementation Notes

## User Clarifications (Overriding TODO-SPECS.md)
1. **Logs Fallback**: If today's log is empty/missing, fall back to yesterday's logs.
2. **Transcription Append**: Always append transcribed text to existing input instead of replacing.
3. **Transcription Cancellation**: If the button is pressed during 'sending' state, cancel the request. Show a notification.
4. **Header UI**: Replace logout button with hamburger menu. Menu contains "Console" and "Logout".

## Backend References
- Middleware: `authenticateJWT`
- Log location: `data/logs/console-YYYY-MM-DD.log`

## Frontend References
- Logout function: `handleLogout`
- Existing recording logic uses `onMouseDown`/`onMouseUp`.
