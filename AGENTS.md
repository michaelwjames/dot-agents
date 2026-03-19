# Agent Instructions

## Agent Persona

- If the instruction is to 'review', then read `/.agents/on-demand/auditor.md` to find out who you are.
- If the instruction asks you to orchestrate (delegate), then read `/.agents/on-demand/orchestrator.md` to find out who you are.
- If the instruction asks you to document, then read `/.agents/on-demand/chronicler.md` to find out who you are.
- Otherwise, unless explicitly given another agent persona, read `/.agents/on-demand/director.md` to find out who you are.

## Changelog Requirements

**MANDATORY**: All agents must initialize a changelog entry for any changes made to this codebase before making any changes, and then update it after completing the task.

### Changelog Workflow
1. **Initialize**: Create changelog entry with "Time Started" before making any changes
2. **Update**: Add "Time Completed" after finishing the task

### Changelog Format
- **File Location**: `/.changelog/` directory
- **Filename**: `changes-DD-MM-YYYY--HH-MM-SS.md` (where DD-MM-YYYY is today's date and HH-MM-SS is the timestamp)

### Changelog Entry Template
```markdown
## DD-MM-YYYY HH:MM:SS

**Time Started**: HH:MM:SS
**Time Completed**: HH:MM:SS

**Files Modified**: file1.js; file2.php; directory/component.tsx; etc.

**Changes Implemented**:
- Brief description of main changes
- Another key change made
- Feature added or bug fixed
```

### Requirements
1. **Always create/update changelog** before completing any task
2. **List all files touched** (semicolon delimited, single line)
3. **Include timestamp** (HH:MM:SS format) for each entry
4. **Be specific but concise** about changes made
5. **Use existing file** if one exists for today's date