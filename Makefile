# Makefile for .agents Subtree Workflow
# This provides convenient commands for managing the .agents subtree
# Works from both the .agents directory and project root

.PHONY: help update push setup status clean pr lint-agents test-client

# Detect if we're in the .agents directory or project root
ifeq ($(notdir $(CURDIR)),.agents)
  # We're in the .agents directory, go up one level
  GIT_ROOT := ..
  AGENTS_PREFIX := .agents
else
  # We're in the project root
  GIT_ROOT := .
  AGENTS_PREFIX := .agents
endif

# Default target
help:
	@echo "Available commands:"
	@echo "  make setup       - Add .agents subtree to a new project"
	@echo "  make update      - Pull latest changes from dot-agents repository"
	@echo "  make push        - Push local changes to dot-agents repository"
	@echo "  make pr          - Create pull request for changes"
	@echo "  make status      - Show subtree status and remotes"
	@echo "  make clean       - Remove .agents subtree (use with caution)"
	@echo "  make lint-agents - Run markdown linter on .md files"
	@echo "  make test-client - Run unit tests for jules_client.py"
	@echo ""
	@echo "Repository: https://github.com/michaelwjames/dot-agents.git"
	@echo "Working from: $(CURDIR)"

# Setup .agents subtree in a new project
setup:
	@echo "Setting up .agents subtree..."
	@cd $(GIT_ROOT) && if ! git remote get-url dot-agents >/dev/null 2>&1; then \
		git remote add dot-agents https://github.com/michaelwjames/dot-agents.git; \
		echo "Added dot-agents remote"; \
	else \
		echo "dot-agents remote already exists"; \
	fi
	@cd $(GIT_ROOT) && if [ ! -d ".agents" ]; then \
		git subtree add --prefix=.agents dot-agents main --squash; \
		echo "Added .agents subtree"; \
	else \
		echo ".agents directory already exists"; \
	fi

# Update .agents from central repository
update:
	@echo "Updating .agents from dot-agents repository..."
	@cd $(GIT_ROOT) && git subtree pull --prefix=$(AGENTS_PREFIX) dot-agents main --squash
	@echo "Update complete!"

# Push changes to central repository
push:
	@echo "Pushing changes to dot-agents repository..."
	@cd $(GIT_ROOT) && git subtree push --prefix=$(AGENTS_PREFIX) dot-agents main
	@echo "Push complete!"

# Show subtree status
status:
	@echo "=== Remote Repositories ==="
	@cd $(GIT_ROOT) && git remote -v | grep -E "(origin|dot-agents)"
	@echo ""
	@echo "=== Subtree Status ==="
	@cd $(GIT_ROOT) && if [ -d ".agents" ]; then \
		echo ".agents directory exists"; \
		echo "Last update: $$(git log -1 --pretty=format:'%h %s' -- .agents 2>/dev/null || echo 'Not tracked')"; \
	else \
		echo ".agents directory not found"; \
	fi

# Remove .agents subtree (use with caution)
clean:
	@echo "⚠️  This will remove the .agents subtree and remote!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Removing .agents subtree..."
	@cd $(GIT_ROOT) && git remote remove dot-agents 2>/dev/null || true
	@cd $(GIT_ROOT) && rm -rf .agents
	@cd $(GIT_ROOT) && git add -A
	@cd $(GIT_ROOT) && git commit -m "Remove .agents subtree" 2>/dev/null || true
	@echo "Subtree removed!"

# Quick sync (update then push if there are local changes)
sync: update
	@echo "Checking for local changes to push..."
	@cd $(GIT_ROOT) && if ! git diff --quiet --cached HEAD -- .agents 2>/dev/null || ! git diff --quiet HEAD -- .agents; then \
		echo "Local changes detected, pushing..."; \
		$(MAKE) push; \
	else \
		@echo "No local changes to push"; \
	fi

# Create pull request for changes
pr:
	@echo "Creating pull request for .agents changes..."
	@cd $(GIT_ROOT) && if ! git diff --quiet --cached HEAD -- .agents 2>/dev/null || ! git diff --quiet HEAD -- .agents; then \
		echo "Local changes detected, creating PR..."; \
		BRANCH_NAME="agents-update-$$(date +%Y%m%d-%H%M%S)"; \
		echo "Creating branch: $$BRANCH_NAME"; \
		cd $(GIT_ROOT) && git checkout -b $$BRANCH_NAME; \
		cd $(GIT_ROOT) && git add .agents; \
		cd $(GIT_ROOT) && git commit -m "Update .agents: $$(git status --porcelain .agents | head -1 | cut -c4-)"; \
		echo "Branch created and changes committed."; \
		echo "To create PR, run:"; \
		echo "  gh pr create --title 'Update .agents' --body 'Automated .agents update' --base main --head $$BRANCH_NAME"; \
		echo "Or visit GitHub to create PR manually."; \
	else \
		echo "No local changes to create PR from."; \
	fi

# Lint markdown files
lint-agents:
	@echo "Linting markdown files..."
	@if command -v markdownlint >/dev/null 2>&1; then \
		cd $(GIT_ROOT) && markdownlint $(AGENTS_PREFIX)/**/*.md; \
	else \
		echo "markdownlint-cli is not installed. Please install it first (e.g. npm install -g markdownlint-cli)."; \
	fi

# Test jules terminal client
test-client:
	@echo "Testing Jules Terminal Client..."
	@if [ -d "$(GIT_ROOT)/$(AGENTS_PREFIX)/skills/jules-subagent" ]; then \
		cd $(GIT_ROOT)/$(AGENTS_PREFIX)/skills/jules-subagent && python -m unittest discover -s . -p "*test*.py" 2>/dev/null || echo "No tests found or test runner failed."; \
	elif [ -d "$(GIT_ROOT)/skills/jules-subagent" ]; then \
		cd $(GIT_ROOT)/skills/jules-subagent && python -m unittest discover -s . -p "*test*.py" 2>/dev/null || echo "No tests found or test runner failed."; \
	else \
		echo "Could not find jules-subagent directory."; \
	fi
