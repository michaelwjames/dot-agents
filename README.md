# .agents

This directory contains an autonomous agent ecosystem for software development and maintenance. It is designed as a reusable, drop-in solution that can be added to any repository using Git Subtree.

## Installation

Add this agent ecosystem to any repository in seconds:

```bash
git remote add dot-agents https://github.com/michaelwjames/dot-agents.git
git subtree add --prefix=.agents dot-agents main --squash
```

## Getting Started / How to Execute

To start a task using an autonomous agent, prompt your AI assistant (e.g., Jules or another LLM) with the following pattern:

*"Adopt the [Agent Persona] located at `.agents/[path_to_agent].md` and execute the following task: [Task Description]."*

**Example for a complex task:**
> "Adopt the Director persona located at `.agents/on-demand/director/director.md` and implement a new payment gateway integration."

**Example for a code review:**
> "Adopt the Auditor persona located at `.agents/on-demand/auditor/auditor.md` and review the changes in the `src/auth/` directory."

*Note: You do not need to instruct the agent on how to manage files or logs; they will automatically follow the instructions in `.agents/SYSTEM_INSTRUCTIONS.md`.*

## Managing Updates

Use the included Makefile to keep agents synced. Commands work from both the project root and the `.agents` directory:

```bash
# From project root
make -C .agents update  # Pull latest updates from central repo
make -C .agents push    # Push your improvements back
make -C .agents pr      # Create pull request for changes
make -C .agents status  # Check subtree status

# From .agents directory (cd .agents first)
make update             # Pull latest updates from central repo
make push               # Push your improvements back
make pr                 # Create pull request for changes
make status             # Check subtree status
make help               # Show all available commands
```
*See `SUBTREE_WORKFLOW.md` for detailed git subtree operations.*

## Architecture Overview

The system is divided into two categories:
- **Scheduled Agents** (`/scheduled`): Autonomous maintenance for specific domains (tests, dead code, performance, security). See `scheduled/CATALOGUE.md` for the full list.
- **On-Demand Agents** (`/on-demand`): Specialized agents for complex, multi-step tasks.

## Agent Selection Guide

Use these rules to select the appropriate on-demand persona for your task:
- **Review tasks**: Read `/.agents/on-demand/auditor/auditor.md`
- **Orchestration/Delegation**: Read `/.agents/on-demand/orchestrator/orchestrator.md`
- **Documentation**: Read `/.agents/on-demand/chronicler/chronicler.md`
- **Otherwise**: Read `/.agents/on-demand/director/director.md`

## Directory Structure

```text
.agents/
├── AGENTS.md                    # Agent selection rules
├── Makefile                     # Automated subtree workflows
├── README.md                    # This file
├── SUBTREE_WORKFLOW.md          # Subtree documentation
├── repo_details.txt             # Repository metadata
├── on-demand/                   # Specialized execution agents
└── scheduled/                   # Maintenance agents
    └── CATALOGUE.md             # Complete agent catalogue
```

## Core Guidelines

1. **Changelog**: Agents must log changes in `/.changelog/changes-DD-MM-YYYY--HH-MM-SS.md` before completing tasks.
2. **Journals**: Agents maintain `journal.md` files for critical learnings to improve future performance.
3. **Task Records**: Lightweight tracking is kept in agent-specific `tasks/` directories.

## Resources & Support

- **Central Repository**: https://github.com/michaelwjames/dot-agents
- **Contributions**: Welcome via pull requests to the central repository.
