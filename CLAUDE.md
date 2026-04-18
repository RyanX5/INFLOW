# INFLOW — Project Context for Claude Code

## What this is

INFLOW is an agent-based simulation of misinformation propagation through social networks. Built for CSCI 412: Senior Seminar II. The final deliverable is a comprehensive report PDF, a polished GitHub repo, and a working local app demo.

GitHub: https://github.com/RyanX5/INFLOW  
Live Demo: http://seminar2.duckdns.org  
Author: Rohan Upadhyay

---

## Codebase Map

```
simulation/
  agent.py         Agent(belief, bias, trust_radius, skepticism) — receive_information() updates belief
  engine.py        SimulationEngine — inject, run, _step, _sharing_probability, save_outputs → CSVs
                   Also has run_with_history() for per-step node state capture (animation use)
  information.py   InfoItem(truth_value, emotional_intensity, complexity, origin_node)
  network.py       build_network() — 3 topologies: random (ER), small_world (WS), scale_free (BA)

main.py                    CLI: --agents --steps --topology --seed --share-prob --output-dir --reset
experiment_runner.py       100-trial Monte Carlo: truth vs. misinformation on small_world
topology_comparison.py     100-trial: small_world vs. scale_free misinformation spread
parameter_analysis.py      50-trial sweep of skepticism and trust_radius vs. spread
hub_injection.py           50-trial: hub vs. random origin injection on small_world + scale_free

api/
  main.py                  FastAPI app — POST /api/simulate runs simulation live, returns step history JSON
  inflow-api.service       systemd service file for VPS deployment (runs uvicorn)

visualization/             React + D3 + TypeScript (Vite). Calls /api/simulate, animates step-by-step.
output/                    agent_states.csv, edges.csv, info_items.csv, spread_log.csv

assets/screenshots/        PNG screenshots used in reports
docs/                      All report PDFs + markdown drafts
```

---

## Core Model

**Sharing probability:**
```
P = (0.4 * emotional_intensity + 0.3 * alignment + 0.3 * trust_radius) * (1 - 0.5 * complexity) * share_probability
alignment = 1 - |agent.belief - item.truth_value|
```

**Belief update on receive:**
```
delta = (truth_value - belief) / (1 + skepticism) * (1 - bias)
belief = clamp(belief + delta, 0, 1)
```

---

## Report History

| Report | Date | What was added |
|---|---|---|
| Midterm | Mar 13 | Core simulation, visualization, basic CLI |
| Report 2 | Mar 25 | experiment_runner.py (Monte Carlo), topology_comparison.py |
| Report 3 | Apr 8 | parameter_analysis.py, refined sharing model (complexity wired in, share_prob fix), statistical metrics (t50, peak_rate, polarization) |
| Final | Apr 17 | hub_injection.py, FinalReport.md (full narrative), README rewrite, VPS deployment |

---

## Final Report Requirements (from assignment PDF)

Three deliverables required:
1. **Final Report PDF** — sections: Project Overview, Architecture, Implementation, Results/Evaluation, Challenges, User Guide
2. **GitHub Repository** — clean code, complete README (install/run/screenshots), commit history
3. **Final Product Link** — working app link or local execution instructions

---

## Known Gaps / Remaining Work

1. Add random (ER) topology to topology_comparison.py
2. ~~Hub injection vs. random injection analysis~~ — DONE (hub_injection.py)
3. Visualization: summary stats panel alongside network graph
4. Combined skepticism × trust_radius interaction sweep

---

## Key Findings (to cite in final report)

- High-emotion misinformation reaches 99.8% of network vs. 81.1% for truth
- Misinformation hits 50% saturation at step 7.2 vs. 11.4 for truth
- Trust radius has a direct, monotonic effect on spread speed (30% weight in formula)
- Skepticism has only an indirect, weak effect (slows belief updates, not sharing decisions)
- Scale-free networks more vulnerable than small-world (hub nodes amplify cascades)
- Final spread is parameter-insensitive at high emotion — parameters modulate speed, not reach
- Hub injection on scale-free reduces time to 50% by 33% vs. random injection (2.64 vs. 3.92 steps)
- Network structure dominates origin strategy: random injection on scale-free beats hub injection on small-world

---

## README Status

Up to date. Includes project description, live demo link, all CLI flags, all experiment scripts, visualization setup, project structure, and AI acknowledgment.
