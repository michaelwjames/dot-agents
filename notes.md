# Chronicler Research Notes 📓

*This scratchpad contains raw architectural data, dependency graphs, and intermediate findings.*

---

## Repository Structure Overview
- `backend/`: Node.js/Express app & Boss Agent core logic.
- `frontend/`: React PWA.
- `data/`: RAG storage (Vault, Memory, Skills) and session logs.
- `lib/`: Shared logic (mapped to `backend/src/core/lib`).

## Initial Dependency Trace
- `BossAgentService` (Core Reasoning)
  - -> `GroqProvider` (LLM/Whisper)
  - -> `FileSystem` (RAG/Persistence)
  - -> `ToolRegistry` (Execution)
  - -> `MemoryCompressor` (Context Optimization)
- `ToolRegistry`
  - -> `MakeExecutor` (Shell Gating)
  - -> `Nomenclature` (Fuzzy Resolution)
  - -> Interceptors (`Logging`, `TokenTruncation`)

## Known Systems to Deep Dive
1. **Kairos:** Proactive heartbeat. How it avoids spam with `NO_ACTION_REQUIRED`.
2. **Jules:** External Python client interaction and caching in `jules_cache.db`.
3. **PWA Auth:** Simple JWT with `BOSS_PASSWORD`.
