# Agent Ecosystem (.agents)

This directory contains an autonomous agent ecosystem for software development and maintenance. It is designed as a reusable, drop-in solution that can be added to any repository using Git Subtree.

## Installation

Add this agent ecosystem to any repository in seconds:

```bash
# Option 1: Git Subtree Setup
git remote add dot-agents https://github.com/michaelwjames/dot-agents.git
git subtree add --prefix=.agents dot-agents main --squash

# Option 2: Setup Script
curl -s https://raw.githubusercontent.com/michaelwjames/dot-agents/main/INSTALL.sh | bash
```

## Managing Updates

Use the included Makefile from the root of your project to keep agents synced:

```bash
make -C .agents update  # Pull latest updates from central repo
make -C .agents push    # Push your improvements back
make -C .agents status  # Check subtree status
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
