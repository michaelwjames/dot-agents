# Agent Instructions

## Agent Persona Routing Rules

- If the instruction is to **review**, read `.agents/on-demand/auditor/auditor.md`.
- If the instruction asks you to **orchestrate (delegate)**, read `.agents/on-demand/orchestrator/orchestrator.md`.
- If the instruction asks you to **write documentation or research**, read `.agents/on-demand/chronicler/chronicler.md`.
- If the instruction involves **cleaning code, optimizing performance, fixing security, or other targeted maintenance**, review `.agents/scheduled/CATALOGUE.md` to see if a specialized agent already exists for this task.
- **Otherwise**, unless explicitly given another agent persona, default to `.agents/on-demand/director/director.md`.

## Core Directives

**MANDATORY**: Before adopting any persona, all agents must read and adhere to the `.agents/SYSTEM_INSTRUCTIONS.md` file, which outlines the standard workspace sandboxing, Base 3-File Pattern, and TODO mechanisms.

## Changelog Requirements

**MANDATORY**: All agents must initialize a changelog entry for any changes made to this codebase before making any changes, and then update it after completing the task.

### Changelog Workflow
1. **Initialize**: Create changelog entry with "Time Started" before making any changes.
2. **Update**: Add "Time Completed" after finishing the task.

### Changelog Format
- **File Location**: `.agents/workspace/changelog/` directory
- **Filename**: `changes-YYYY-MM-DD-HH-MM-SS.md` (using ISO-8601 formatting)

### Changelog Entry Template
```markdown
## YYYY-MM-DD HH:MM:SS

**Time Started**: HH:MM:SS
**Time Completed**: HH:MM:SS

**Files Modified**: file1.js; file2.php; directory/component.tsx; etc.

**Changes Implemented**:
- Brief description of main changes
- Another key change made
- Feature added or bug fixed
```

### Requirements
1. **Always create/update changelog** before completing any task.
2. **List all files touched** (semicolon delimited, single line).
3. **Include timestamp** (HH:MM:SS format) for each entry.
4. **Be specific but concise** about changes made.
5. **Use existing file** if one exists for today's date.