# BRIEFING — 2026-09-17T23:54:11Z

## Mission
Orchestrate the development of the functional MVP of Platito (white-label gastronomic marketplace) adhering to all functional, architectural, security, and testing requirements.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: d:\platito\.agents\orchestrator
- Original parent: sentinel
- Original parent conversation ID: e7eb6d61-9410-4c8d-b568-2e626437ac32

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: d:\platito\PROJECT.md
1. **Decompose**: Survey full scope using 3 explorers, define Feature Inventory & Interface Contracts, split into clear modular milestones + parallel E2E testing track.
2. **Dispatch & Execute**:
   - **Delegate (sub-orchestrator)**: For multi-faceted milestones, delegate to sub-orchestrators; for individual milestones run Explorer -> Worker -> Reviewer -> Challenger -> Auditor gate cycle.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical, NEVER skip auditor)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: At 16 spawns, write handoff.md, cancel crons, spawn successor.
- **Work items**:
  1. Survey & Architecture Mapping [in-progress]
  2. Project Decomposition & E2E Test Strategy [pending]
  3. Milestone Execution (Provider Panel, Showcase, Firebase/Storage, Security Rules) [pending]
  4. Final Milestone E2E & Hardening (Tiers 1-5) [pending]
- **Current phase**: Survey (Phase 0)
- **Current focus**: Launching 3 Explorers (Spec Miner + Tech Explorer + Architecture/QA Explorer)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- You MAY use file-editing tools ONLY for metadata/state files (.md) in your .agents/ folder and PROJECT.md.
- Forensic Auditor INTEGRITY VIOLATION is a BINARY VETO — violation means unconditional failure.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Always include path to ORIGINAL_REQUEST.md in every subagent dispatch.

## Current Parent
- Conversation ID: e7eb6d61-9410-4c8d-b568-2e626437ac32
- Updated: 2026-09-17T23:54:11Z

## Key Decisions Made
- Initiated 3-Explorer survey phase to map specification details, environment capabilities, and data/storage/test architecture.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|---|---|---|---|---|
| survey_spec_miner | teamwork_preview_spec_miner | Requirements Spec Extraction | completed | eec9b64c-5b85-46fd-b5f1-98832a3cbc56 |
| survey_tech_stack | teamwork_preview_explorer | Environment & Tech Stack Investigation | completed | d43037b1-139e-40af-99c2-6b40092e8f20 |
| survey_arch_qa | teamwork_preview_explorer | Architecture, Schema & QA Strategy | completed | aaaa9d95-6c69-4738-9db2-54cdc5ab27f2 |
| m1_exp_scaffold | teamwork_preview_explorer | M1 Scaffold & Setup Blueprint | completed | 20477bf9-b50a-4160-995e-77e66bd56fda |
| m1_exp_services | teamwork_preview_explorer | M1 Services & Security Rules Plan | completed | d0f50589-0918-44b5-87f7-861b4c270ead |
| m1_exp_tests | teamwork_preview_explorer | M1 Pricing, Image & QA Plan | completed | cdb8301c-fd1e-4cdd-818a-8c81a66e53e3 |
| m1_worker | teamwork_preview_worker | M1 Implementation Worker | in-progress | c94ef8f5-d1f6-4b54-b032-b87cb4626229 |

## Succession Status
- Succession required: no
- Spawn count: 7 / 16
- Pending subagents: c94ef8f5-d1f6-4b54-b032-b87cb4626229
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-26 (*/10 * * * *)
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- d:\platito\ORIGINAL_REQUEST.md — Verbatim user request
- d:\platito\.agents\orchestrator\DISPATCH.md — Orchestrator dispatch log
- d:\platito\.agents\orchestrator\progress.md — Liveness & iteration progress tracking
- d:\platito\.agents\orchestrator\BRIEFING.md — Persistent working memory index
