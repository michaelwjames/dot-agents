# Vercel Deployment Instructions

To correctly deploy this monorepo to Vercel, use the following settings in the Vercel Dashboard:

1.  **Framework Preset**: `Other`
2.  **Root Directory**: `.` (the root of the repository)
3.  **Build Command**: `pnpm build`
4.  **Output Directory**: `.` (Leave as default/root, as `vercel.json` handles the routing to `frontend/dist`)
5.  **Install Command**: `pnpm install` (default)

## Environment Variables

Ensure the following environment variables are set in the Vercel Dashboard:

*   `GROQ_API_KEY`: Your Groq API key.
*   `JWT_SECRET`: A secret for signing JWT tokens.
*   `BOSS_PASSWORD`: The password for the web interface.
*   `BACKEND_PORT`: 3001 (optional, default is 3001).
*   `GROQ_MODEL`: e.g., `llama-3.3-70b-versatile`.
*   `GROQ_MODEL_2`: (optional)
*   `GROQ_MODEL_3`: (optional)
*   `GROQ_WHISPER_MODEL`: e.g., `whisper-large-v3`.
*   `MAX_TOOL_ROUNDS`: (optional, default is 10).

## Repository Structure

The repository has been reorganized to support Vercel's serverless functions and static file serving:

*   `/api/index.ts`: Entry point for Vercel Serverless Functions.
*   `/backend/src/index.ts`: Express application logic.
*   `/frontend/`: React/Vite frontend.
*   `/frontend/dist/`: Built frontend static files.
