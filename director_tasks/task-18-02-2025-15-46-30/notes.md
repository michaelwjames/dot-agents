# Scratchpad / Notes

- Tool should use `GITHUB_TOKEN` from process.env.
- If no token, return a clear error string.
- The `action` parameter dictates the operation.
- Use `display_large_output` pattern? The prompt for Spec #12 says:
> "get-pr-diff — octokit.pulls.get({ mediaType: { format: 'diff' } }) → raw unified diff. Truncate to 4000 chars for LLM; save full diff via display_large_output pattern if larger."
Wait, the `display_large_output` pattern is automatically handled by the `TokenTruncationInterceptor` (from the memory). I don't need to manually implement the "save full diff via display_large_output pattern if larger" logic directly inside the tool, or I can just return the string and the interceptor truncates it, OR I can manually do it if needed, but normally interceptors do this. Actually, the spec says: "Truncate to 4000 chars for LLM; save full diff via display_large_output pattern if larger." I will implement it by returning the diff string; the interceptor might handle it, or I can manually write it. Let's look at `backend/src/core/lib/tools/base.ts` to see what is expected.