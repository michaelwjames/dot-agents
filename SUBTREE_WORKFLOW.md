# Git Subtree Workflow for .agents

This document explains how to use the `.agents` subtree across multiple projects.

## Overview

The `.agents` folder is now a git subtree that pulls from the central repository: `https://github.com/michaelwjames/dot-agents.git`

This allows you to:
- Use the same agent ecosystem across multiple projects
- Pull updates from the central repository
- Contribute changes back to the central repository

## Setup for New Projects

To add the `.agents` subtree to a new project:

```bash
# Add the remote repository
git remote add dot-agents https://github.com/michaelwjames/dot-agents.git

# Add the subtree (creates .agents folder)
git subtree add --prefix=.agents dot-agents main --squash
```

## Updating from Central Repository

To pull the latest changes from the central `.agents` repository:

```bash
git subtree pull --prefix=.agents dot-agents main --squash
```

## Contributing Changes

If you make changes to the `.agents` folder that should be shared with other projects:

```bash
# Push changes back to the central repository
git subtree push --prefix=.agents dot-agents main
```

## Important Notes

- **Use `--squash` flag** to keep commit history clean
- **Always pull before pushing** to avoid conflicts
- **Coordinate with other projects** when making structural changes
- **Test thoroughly** as changes affect all projects using this subtree

## Troubleshooting

### Merge Conflicts
If conflicts occur during pull:
1. Resolve conflicts in the `.agents` folder
2. Commit the resolution
3. Continue with the subtree pull

### Removing the Subtree
If you need to remove the subtree:
```bash
git remote rm dot-agents
rm -rf .agents
git add -A
git commit -m "Remove .agents subtree"
```

## Repository Structure

The central `dot-agents` repository maintains:
- All scheduled maintenance agents
- All on-demand execution agents
- Documentation and configuration
- Agent catalogues and guidelines

This structure ensures consistency across all projects that use this subtree.
