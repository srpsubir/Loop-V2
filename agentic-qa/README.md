# Agentic QA (Loop)

Spike for MAV-251: agentic/LLM-driven UI testing tools layered on top of Loop's existing test stack (Vitest, Playwright e2e, wdio-electron-service, osascript). These tools drive a running Loop build like a real user and flag confusing UX, not just assertion failures.

## Layout
- `flows/` — plain-language test scenarios (objective, steps, what to flag). Not rigid selector scripts.
- `runs/` — dated output per tool run: screenshots, AX tree dumps, tool verdicts, human review notes.

## Tools
1. **Peekaboo** — screenshot capture + AI visual analysis (openclaw/Peekaboo). Local Ollama by default, $0 marginal cost.
2. **macos-use** — MCP server exposing the macOS accessibility tree for click/type/scroll via natural language (mediar-ai/mcp-server-macos-use). Model-agnostic, runs through Claude Code, $0 marginal cost.
3. **Midscene.js** — screenshot-driven vision LLM automation on Playwright (deferred — requires its own paid vision-model key, no Claude support).

## Status
Setup in progress. First calibration pass required before trusting any tool's verdicts unattended — see MAV-251 acceptance criteria.
