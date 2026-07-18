# AfterYou application foundation

The existing landing page remains an untouched static experience at `/`. The Next.js layer provides the mission API, domain foundation, and provider-agnostic agent runtime without rendering or changing that page.

## Start

```bash
npm install
npm run dev
```

## API

- `POST /api/missions` creates a queued mission and starts the modular in-memory pipeline.
- `GET /api/missions` lists missions.
- `GET`, `PATCH`, and `DELETE /api/missions/:id` manage an individual mission.

Mission data is stored through the `MissionRepository` interface. Replace `InMemoryMissionRepository` in `server/mission-container.ts` with a PostgreSQL or Supabase implementation when persistence is introduced.

## Agent runtime

`AgentOrchestrator` runs Planner → task decomposition → selected specialist agent → Reviewer → final mission result. Each agent implements `plan`, `execute`, `review`, and `handoff`; messages are Zod-validated JSON envelopes and each action writes a structured mission log.

The runtime is provider-neutral. `OPENAI_API_KEY` enables the included OpenAI Responses API adapter for Planner and specialist reasoning; `OPENAI_MODEL` optionally selects its model. Anthropic, Gemini, Ollama, and Grok are reserved provider identities; each only needs to implement the `AIProvider` contract in `server/ai/types.ts` and can be injected when constructing the runtime.

`TINYFISH_API_KEY` is an optional tool-provider credential only. When configured, the Search, Fetch, and Browser tools use TinyFish's corresponding APIs; it never receives Planner, Research, Coding, Document, or Reviewer reasoning prompts. `TINYFISH_BASE_URL` remains available for a supported TinyFish service-host override.

## Autonomous reasoning runtime

The Planner produces objectives and task ownership but never executes work. Each specialist then runs a bounded reasoning loop: decide → choose one tool → execute → observe → decide again. The `SharedMissionMemory` persists tool outputs, searches, visited resources, artifacts, failures, and reviewer feedback to prevent duplicate work across agents and rework cycles.

Runtime limits are configured through environment variables. All values are optional and use safe defaults:

- `AFTERYOU_MAX_REASONING_STEPS`
- `AFTERYOU_MAX_TOOL_CALLS`
- `AFTERYOU_RUNTIME_LIMIT_MS`
- `AFTERYOU_TOKEN_BUDGET`
- `AFTERYOU_HIGH_CONFIDENCE_THRESHOLD`
- `AFTERYOU_MAX_REVIEW_CYCLES`

Every decision is emitted as a structured mission log, so the existing Mission Workspace timeline automatically displays agent reasoning, tool choice, observations, confidence, and the next action without requiring a UI change.

## Specialist quality capabilities

- Research uses normalized source URLs, persisted source memory, claim-level citations, confidence estimates, and contradiction reporting.
- Browser supports retryable Playwright actions, explicit loading strategies, downloaded-file capture, screenshots on failures, and persisted storage state.
- Coding is prompted to inspect before editing, make incremental changes, validate with terminal output, and repair failed checks before claiming success.
- Document generation supports executive summaries, Markdown-aware PDF layout, tables, and simple data charts.
- Reviewer scoring is numerical. A mission completes only when `approved` is true and the configurable `AFTERYOU_REVIEW_QUALITY_THRESHOLD` (default `85`) is reached.
