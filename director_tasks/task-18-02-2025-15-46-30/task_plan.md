# Task Plan: Implement GitHub Tool (Spec #12)

## Phase 1: Preparation & Setup
- [ ] Install `@octokit/rest` package in the `backend` workspace.
- [ ] Ensure `GITHUB_TOKEN` is in `.env.example`.

## Phase 2: Implementation
- [ ] Create `backend/src/core/lib/tools/github.ts`.
- [ ] Implement the `GitHubTool` class implementing the `Tool` interface.
- [ ] Implement action handling logic: `list-prs`, `get-pr`, `get-pr-diff`, `get-pr-comments`, `merge-pr`, `close-pr`, `list-issues`, `get-issue`, `create-issue`, `close-issue`, `list-repos`, `get-repo`.
- [ ] Add rate limiting and error handling (wrapping octokit calls).
- [ ] Format diffs/comments correctly according to the spec.

## Phase 3: Registration
- [ ] Register `GitHubTool` in `backend/src/core/lib/tools.ts`.

## Phase 4: Pre-commit Steps
- [ ] Complete pre-commit checks to ensure proper testing, verifications, reviews and reflections are done.

## Status
Pending

## Errors Encountered
None yet