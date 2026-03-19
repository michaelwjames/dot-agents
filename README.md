# Agent Directory

This directory contains an autonomous agent ecosystem for software development and maintenance. It houses both scheduled maintenance agents and on-demand execution agents that work together to maintain, improve, and extend codebases autonomously.

## 🏗️ Architecture Overview

The agent system is organized into two main categories:

### 📅 Scheduled Agents (`/scheduled`)
Autonomous agents that run on a schedule to perform specific maintenance tasks, keeping the codebase healthy and evolving incrementally.

### ⚡ On-Demand Agents (`/on-demand`)
Specialized agents that can be invoked as needed to handle complex, multi-step projects or specific tasks requiring human-like reasoning.

---

## 📅 Scheduled Agents

Scheduled agents operate autonomously on a regular schedule, each focused on a specific aspect of codebase maintenance. Each agent follows a consistent pattern:

- **Mission**: Single, well-defined purpose
- **Boundaries**: Clear do/ask/never-do guidelines
- **Journal**: Critical learnings only (not a log)
- **Task Records**: Lightweight run tracking
- **Process**: Scan → Select → Implement → Verify → Present

### Agent Categories

#### 🧪 Test & Quality Agents
- **Alchemist** ⚗️ - Consolidates test fixtures and mock data
- **Janitor** 🧹 - Removes dead code and tech debt
- **Dryad** 🌳 - Eliminates code duplication (DRY violations)

#### 🚀 Performance & Infrastructure Agents
- **Bolt** ⚡ - Performance optimization specialist
- **Conductor** 🚂 - Infrastructure and build pipeline optimizer
- **Nomad** ⛺ - Environment variable centralization

#### 🛡️ Security & Resilience Agents
- **Sentinel** 🛡️ - Security vulnerability detection and fixes
- **Bulwark** 🏰 - System resilience and error boundaries
- **Redactor** ⬛ - Privacy and compliance for PII masking
- **Archivist** 📦 - Client storage hygiene standardization

#### 🎨 User Experience & Design Agents
- **Designer** 📐 - Semantic styling and design system consistency
- **Palette** 🎨 - UX improvements and accessibility enhancements
- **Empath** 💖 - Microcopy and tone optimization

#### 🌐 Internationalization & SEO Agents
- **Polyglot** 🌍 - Internationalization preparation
- **Herald** 🎺 - SEO and structured data optimization

#### 🗺️ Navigation & Routing Agents
- **Cartographer** 🗺️ - Routing standardization and URL management

#### 🤝 API & Communication Agents
- **Diplomat** 🤝 - API contract and response format standardization

#### 🔧 Code Organization & Readability Agents
- **Linguist** 🗣️ - Naming convention improvements
- **Surgeon** 🔪 - Logic decoupling and extraction
- **Typist** 🕵️ - Type safety enhancements

#### 📚 Documentation & Knowledge Agents
- **Librarian** 📚 - Documentation and context mapping

---

## ⚡ On-Demand Agents

On-demand agents are invoked for specific, complex tasks that require human-like project management and execution capabilities.

### Available Personas

#### 🎬 Director
**Mission**: Complex, multi-step project execution from start to finish
- Handles autonomous project management
- Uses filesystem as external memory
- Follows structured 3-file pattern (task plan, notes, deliverable)
- Operates in phases: Interrogation → Initialization → Autonomous Loop → Task Offloading → Delivery

#### 🔍 Auditor
**Mission**: Code review and quality assessment
- Performs comprehensive code reviews
- Identifies issues and improvement opportunities
- Ensures code quality standards compliance

#### 📝 Chronicler
**Mission**: Documentation creation and updates
- Creates comprehensive documentation
- Updates existing documentation
- Maintains knowledge bases

#### 🎼 Orchestrator
**Mission**: Task delegation and coordination
- Coordinates multiple agents
- Delegates tasks appropriately
- Manages complex workflows

---

## 📋 Agent Selection Guide

Use the following rules to select the appropriate agent persona:

- **Review tasks** → Read `/.agents/on-demand/auditor/auditor.md`
- **Orchestration/Delegation** → Read `/.agents/on-demand/orchestrator/orchestrator.md`
- **Documentation** → Read `/.agents/on-demand/chronicler/chronicler.md`
- **Otherwise** → Read `/.agents/on-demand/director/director.md`

---

## 🔄 Workflow Patterns

### Scheduled Agent Workflow
1. **Scan**: Identify opportunities within their domain
2. **Select**: Choose the best improvement opportunity
3. **Implement**: Make focused, minimal changes
4. **Verify**: Test and validate changes
5. **Present**: Create PR with standardized format

### On-Demand Agent Workflow
1. **Interrogation**: Ask clarifying questions upfront
2. **Planning**: Create structured task plan
3. **Execution**: Autonomous implementation with filesystem memory
4. **Delivery**: Present completed work with documentation

---

## 📁 Directory Structure

```
.agents/
├── AGENTS.md                    # Agent selection rules and guidelines
├── README.md                    # This file
├── repo_details.txt             # Repository metadata
├── scheduled/                   # Autonomous maintenance agents
│   ├── CATALOGUE.md            # Complete agent catalogue
│   ├── alchemist/              # Test fixture consolidation
│   ├── archivist/              # Storage hygiene
│   ├── bolt/                   # Performance optimization
│   ├── bulwark/                # System resilience
│   ├── cartographer/           # Routing standardization
│   ├── conductor/              # Infrastructure optimization
│   ├── designer/               # Design system consistency
│   ├── diplomat/               # API contracts
│   ├── dryad/                  # Code deduplication
│   ├── empath/                 # Microcopy optimization
│   ├── herald/                 # SEO optimization
│   ├── janitor/                # Dead code removal
│   ├── librarian/              # Documentation
│   ├── linguist/               # Naming conventions
│   ├── nomad/                  # Environment variables
│   ├── palette/                # UX/accessibility
│   ├── polyglot/               # Internationalization
│   ├── redactor/               # Privacy compliance
│   ├── sentinel/               # Security
│   ├── surgeon/                # Logic decoupling
│   └── typist/                 # Type safety
└── on-demand/                  # Specialized execution agents
    ├── auditor/                # Code review
    ├── chronicler/             # Documentation
    ├── director/               # Project execution
    └── orchestrator/           # Task coordination
```

---

## 🎯 Key Principles

### Autonomous Operation
- Agents operate with clear boundaries and decision-making frameworks
- Minimal human intervention required after initial setup
- Consistent, predictable behavior across runs

### Incremental Improvement
- Small, focused changes per run
- Verification and testing before deployment
- Continuous, sustainable codebase evolution

### Knowledge Management
- Journals capture critical learnings, not routine logs
- Task records provide accountability and traceability
- Documentation catalogues maintain system knowledge

### Error Handling
- Transparent error logging and learning
- Graceful failure modes
- Continuous improvement from mistakes

---

## 🚀 Getting Started

1. **Explore the Catalogue**: Review `scheduled/CATALOGUE.md` for detailed agent descriptions
2. **Select Agent Type**: Choose between scheduled (maintenance) or on-demand (project) agents
3. **Follow Agent Guidelines**: Each agent has specific instructions and boundaries
4. **Monitor Progress**: Check changelog entries and task records for activity

---

## 📊 Agent Metrics

All agents maintain:
- **Task Records**: Lightweight run tracking with goals, files, and outcomes
- **Journals**: Critical learnings that improve future performance
- **Changelog Entries**: Comprehensive change tracking with timestamps
- **Verification Results**: Test outcomes and validation steps

---

## 🔧 Configuration

### Repository Details
- Repository: `your-repo-name`
- Branch: `main` (or your development branch)
- Agent System: Autonomous maintenance and execution

### Changelog Requirements
All agents must create changelog entries before making changes:
- Location: `/.changelog/`
- Format: `changes-DD-MM-YYYY--HH-MM-SS.md`
- Mandatory timestamps and file tracking

---

## 🤝 Contributing to Agents

When modifying agent behaviors:
1. Understand the agent's mission and boundaries
2. Maintain consistent patterns and formats
3. Update relevant documentation
4. Test thoroughly before deployment
5. Create appropriate changelog entries

---

## 📚 Additional Resources

- **Agent Catalogue**: `scheduled/CATALOGUE.md` - Complete agent descriptions
- **Selection Rules**: `AGENTS.md` - Agent persona selection guidelines
- **Task Records**: Individual agent `tasks/` directories - Run history and outcomes
- **Journals**: Individual agent `journal.md` files - Critical learnings and insights

---