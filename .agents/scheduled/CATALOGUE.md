# Software Development Agents Catalogue

This catalogue describes each autonomous agent in the `agents/software_development` directory, along with their specific missions and boundaries.

## 🧪 Test & Quality Agents

### **Alchemist** ⚗️ - Test Fixture & Mock Agent
**Mission:** Consolidates scattered, hardcoded test data into centralized, reusable test fixtures or mock factories.
- Finds repetitive mock objects across multiple test files
- Replaces them with single centralized factory functions
- Preserves all existing test behavior

### **Janitor** 🧹 - Codebase Cleaning Agent  
**Mission:** Removes dead code and tech debt to keep the application lean and maintainable.
- Safely removes one piece of dead code per run
- Preserves all existing behavior
- Keeps changes under 50 lines

### **Dryad** 🌳 - Code Quality Agent
**Mission:** Performs scheduled weekly reviews to eliminate code duplication (DRY violations).
- Identifies and resolves one duplication pattern per run
- Maintains all existing functionality
- Logs all decisions transparently

---

## 🚀 Performance & Infrastructure Agents

### **Bolt** ⚡ - Performance Optimization Agent
**Mission:** Makes the codebase faster through small, measurable optimizations.
- Implements one performance improvement per run
- Documents expected performance impact
- Never modifies package.json or tsconfig.json without instruction

### **Conductor** 🚂 - Infrastructure & Tooling Agent
**Mission:** Optimizes developer experience and build pipeline.
- Refactors configuration files, CI/CD workflows, and NPM scripts
- Verifies builds still compile correctly
- Creates minimum necessary file changes

### **Nomad** ⛺ - Configuration & Environment Agent
**Mission:** Centralizes and type-checks scattered environment variables.
- Extracts raw environment variable usage into centralized config
- Updates .env.example files
- Keeps changes under 50 lines

---

## 🛡️ Security & Resilience Agents

### **Sentinel** 🛡️ - Security Agent
**Mission:** Protects the codebase from vulnerabilities and security risks.
- Identifies and fixes one security issue per run
- Follows security coding standards
- Never exposes sensitive data

### **Bulwark** 🏰 - System Resilience Agent
**Mission:** Makes distributed applications fault-tolerant through error boundaries and retry logic.
- Adds localized fallbacks to vulnerable operations
- Prioritizes failing securely
- Preserves all successful execution paths

### **Redactor** ⬛ - Privacy & Compliance Agent
**Mission:** Identifies and masks PII before it's logged or exposed.
- Hunts for sensitive data in analytics or console logs
- Uses existing masking utilities
- Keeps changes under 50 lines

### **Archivist** 📦 - Client-Storage Hygiene Agent
**Mission:** Standardizes browser storage access (Local Storage, Session Storage, IndexedDB, Cookies).
- Wraps raw storage calls in safe utilities
- Handles JSON parsing and quota errors
- Preserves all existing execution paths

---

## 🎨 User Experience & Design Agents

### **Designer** 📐 - Semantic Styling Agent
**Mission:** Implements design consistency through unified design tokens.
- Replaces hardcoded CSS with semantic design system
- Uses existing classes and tokens
- Ensures accessibility is maintained

### **Palette** 🎨 - UX & Accessibility Agent
**Mission:** Adds micro-UX improvements and accessibility enhancements.
- Implements one UX improvement per run
- Focuses on intuitive interfaces and screen-reader accessibility
- Adds ARIA labels and focus states

### **Empath** 💖 - Microcopy & Tone Agent
**Mission:** Replaces robotic error messages with empathetic, user-friendly text.
- Rewrites technical text for human readability
- Only alters UI strings, not backend logic
- Maintains brand-aligned tone

---

## 🌐 Internationalization & SEO Agents

### **Polyglot** 🌍 - Internationalization Agent
**Mission:** Prepares hardcoded applications for global localization.
- Replaces hardcoded text with translation hooks
- Updates base language dictionaries
- Processes entire files comprehensively

### **Herald** 🎺 - SEO & Structured Data Agent
**Mission:** Enhances search engine discoverability through semantic metadata.
- Adds Open Graph tags, meta descriptions, JSON-LD
- Uses existing shared components
- Creates minimum necessary file changes

---

## 🗺️ Navigation & Routing Agents

### **Cartographer** 🗺️ - Routing & Navigation Agent
**Mission:** Standardizes routing paths and replaces hardcoded URLs.
- Replaces magic string URLs with dynamic helpers
- Uses existing route dictionaries
- Preserves all final resolved URLs

---

## 🤝 API & Communication Agents

### **Diplomat** 🤝 - API Contract & Envelope Agent
**Mission:** Ensures consistent API response formats and network request envelopes.
- Standardizes one inconsistent API response per run
- Maintains all existing functionality
- Preserves public API contracts

---

## 🔧 Code Organization & Readability Agents

### **Linguist** 🗣️ - Code Comprehension Agent
**Mission:** Reduces cognitive load through better naming conventions.
- Renames poorly named variables and "magic strings"
- Updates all call sites across codebase
- Keeps changes under 50 lines

### **Surgeon** 🔪 - Logic Decoupling Agent
**Mission:** Extracts complex business logic from UI components.
- Excises logic into pure, testable functions
- Preserves all existing behavior
- Keeps blast radius small and reviewable

### **Typist** 🕵️ - Type Safety Agent
**Mission:** Prevents runtime errors through strict type definitions.
- Narrows implicit `any` types and broad interfaces
- Preserves all runtime behavior
- Avoids complex type gymnastics

---

## 📚 Documentation & Knowledge Agents

### **Librarian** 📚 - Documentation & Context Agent
**Mission:** Maps out and documents complex systems for developers and agents.
- Updates existing stale documentation
- Maintains documentation catalogue
- Never modifies application source code