# INFLOW - Final Report

**Rohan Upadhyay** | CSCI 412: Senior Seminar II | April 2026

GitHub: https://github.com/RyanX5/INFLOW

---

## 1. Project Overview

### Problem Statement and Motivation

Misinformation spreads faster than truth on social media. This has been documented empirically (Vosoughi et al., 2018), but the underlying mechanisms are not straightforward. Is it network structure? Is it the emotional charge of the content? Is it the psychology of the individual users sharing it? Probably all three, but figuring out which factors matter most - and how much - is hard to study in a real system where you cannot control variables.

Simulation gives you that control. The goal of INFLOW is to build an agent-based model of a social network where you can adjust the emotional intensity of content, the psychological traits of users, and the structure of the network, and then directly observe how those changes affect how information spreads. The aim is not to perfectly replicate any real platform, but to explore the dynamics at a mechanistic level and draw out insights that are hard to see otherwise.

### Objectives

- Build a simulation engine where agents share information probabilistically based on their traits and the properties of the content
- Support multiple network topologies (random, small-world, scale-free) to test how structure affects spread
- Run controlled experiments comparing truth vs. misinformation, different topologies, individual parameters, and injection strategies
- Visualize the simulation output as an interactive network graph
- Produce statistically grounded findings from Monte Carlo experiments

### Solution Summary

INFLOW is a Python simulation backend paired with a React + D3 visualization frontend. The backend models a social network as a graph where each node is an agent with four psychological attributes. Information items are injected at origin nodes and propagate step by step through the network based on a sharing probability formula. The system supports three network topologies and a full suite of experimental scripts for analyzing propagation dynamics across hundreds of trials.

---

## 2. System Design and Architecture

### Overall Architecture

The system has three main layers: the simulation backend, the data output layer, and the visualization frontend.

```
main.py / experiment scripts
        |
        v
+-------------------+
|  simulation/      |
|  network.py       |  <-- graph generation + agent init
|  agent.py         |  <-- belief update model
|  information.py   |  <-- info item representation
|  engine.py        |  <-- propagation loop + logging
+-------------------+
        |
        v
   output/ (CSVs)
        |
        v
+-------------------+
|  visualization/   |  <-- React + D3 frontend
+-------------------+
```

A simulation run starts with `main.py` or one of the experiment scripts. The network module builds the graph and populates it with agents. Information items are injected at origin nodes, and the engine runs the propagation loop for a set number of steps. After the run, results are written to CSV files in `output/` and also copied to `visualization/public/` so the frontend can load them.

### Technologies and Tools

| Component | Technology |
|---|---|
| Simulation backend | Python 3.10, NetworkX |
| Data processing | NumPy, Matplotlib |
| Visualization frontend | React, TypeScript, D3.js, Vite |
| CSV parsing (frontend) | PapaParse |

### Key Components

**`simulation/network.py`** - Builds the network graph and creates agent instances. Supports three topologies: Erdos-Renyi (random), Watts-Strogatz (small-world), and Barabasi-Albert (scale-free). Returns both the graph and a dictionary of Agent objects keyed by node ID.

**`simulation/agent.py`** - Defines the Agent class with four attributes: `belief` (0 to 1), `bias` (0 to 1), `trust_radius` (0 to 1), and `skepticism` (0 to 1). All are initialized randomly unless overridden. The `receive_information()` method updates the agent's belief when it receives an item.

**`simulation/information.py`** - Defines the InfoItem class with `truth_value`, `emotional_intensity`, `complexity`, and an `origin_node`. These properties feed directly into the sharing probability formula.

**`simulation/engine.py`** - The core simulation loop. At each step, every agent that holds an info item tries to share it with each of their neighbors. The sharing decision is made probabilistically based on the agent's traits and the item's properties. The engine logs per-step spread metrics and exports everything to CSV at the end.

**`visualization/src/App.tsx`** - A React component that loads the simulation CSVs via fetch, builds a D3 force-directed graph, colors nodes by belief value, and renders an interactive tooltip on hover.

---

## 3. Implementation Details

### Agent Model

Each agent has four scalar attributes, all in the range $[0, 1]$:

- **belief** ($b$) - how much the agent currently believes information it receives is true
- **bias** ($\beta$) - how resistant the agent is to updating their belief (high bias = rigid)
- **skepticism** ($s$) - dampens the magnitude of belief updates
- **trust_radius** ($\tau$) - how willing the agent is to share information with neighbors

When an agent receives an information item, their belief shifts toward the item's truth value. The update rule is:

$$\Delta b = \frac{T - b}{1 + s}(1 - \beta)$$

$$b' = \text{clamp}(b + \Delta b,\ 0,\ 1)$$

Where $T$ is the item's truth value. Higher skepticism divides the update magnitude, and higher bias scales it down. These two parameters work independently but both reduce how much an agent's belief moves per received item.

### Sharing Probability Model

After an agent receives an item, the engine checks each of their neighbors. For each neighbor that has not yet received the item, a sharing probability is computed:

$$P_{\text{share}} = \bigl(0.4 \cdot E + 0.3 \cdot A + 0.3 \cdot \tau\bigr)(1 - 0.5 \cdot C) \cdot \rho$$

Where:

- $E$ = emotional intensity of the item
- $A = 1 - |b - T|$ is the belief alignment between the agent and the item
- $\tau$ = agent trust radius
- $C$ = item complexity
- $\rho$ = global share probability multiplier (default 1.0)

The weights were chosen to reflect the observation that emotional content is the primary driver of sharing behavior online (Vosoughi et al., 2018), followed equally by belief alignment and individual trust tendency. The complexity dampener $(1 - 0.5C)$ reflects that complex or technical content travels more slowly regardless of how emotionally charged it is. At $C = 0$ there is no dampening; at $C = 1$, sharing probability is halved.

One design decision worth noting: the sharing probability is computed from the *sender's* perspective, not the receiver's. The receiver's skepticism and bias only matter at the belief update step after they actually receive the item, not at the sharing decision. This models the idea that whether someone shares content is primarily driven by the sharer's psychology and the content's properties, while how much it changes the recipient's mind depends on the recipient.

### Network Topologies

Three network types are supported, each approximating a different class of real social network:

**Erdos-Renyi (random)** - Each possible edge exists with probability $p$. Produces roughly uniform degree distribution with no clustering structure. Used as a baseline.

**Watts-Strogatz (small-world)** - Starts from a ring lattice with $k$ neighbors per node and rewires each edge with probability $p$. Produces high clustering with short average path lengths, similar to how real social networks have friend groups with a few long-range connections.

**Barabasi-Albert (scale-free)** - Grows the network by preferential attachment: new nodes preferentially connect to existing high-degree nodes. Produces a power-law degree distribution with a small number of very high-degree hub nodes. Approximates the structure of platforms like Twitter where a few accounts have enormous reach.

### Experiment Design

All experiments use Monte Carlo trials (50 to 100 per condition) to account for the randomness in network generation and agent initialization. Results are reported as means with standard deviation bands.

The core experiments are:

1. **Truth vs. misinformation** (`experiment_runner.py`) - two items compete simultaneously on the same small-world network. The truth item has high truth value and low emotional intensity; the misinformation item has low truth value and high emotional intensity.

2. **Topology comparison** (`topology_comparison.py`) - misinformation only, comparing small-world vs. scale-free networks.

3. **Parameter sensitivity** (`parameter_analysis.py`) - sweeps agent skepticism and trust radius from 0.1 to 0.9, holding all other parameters at randomly initialized defaults.

4. **Hub injection** (`hub_injection.py`) - compares starting misinformation from the highest-degree node (hub) vs. a random node, on both topologies.

---

## 4. Results and Evaluation

### Truth vs. Misinformation

The baseline experiment runs 100 Monte Carlo trials on a small-world network with 100 agents over 15 time steps. Two items are injected simultaneously at random origin nodes: a truth item with `truth_value=0.9, emotional_intensity=0.2, complexity=0.5`, and a misinformation item with `truth_value=0.1, emotional_intensity=0.9, complexity=0.3`.

![Propagation Analysis](https://raw.githubusercontent.com/RyanX5/INFLOW/main/assets/screenshots/propagation_analysis.png)

*Figure 1: Mean network reach over 15 steps across 100 trials. Red = misinformation (high emotion). Blue = truth (low emotion). Shaded bands show +/- 1 standard deviation.*

| Metric | Truth | Misinformation |
|---|---|---|
| Mean final spread | 0.8113 +/- 0.1594 | 0.9979 +/- 0.0120 |
| Time to 50% saturation | 11.36 +/- 2.31 steps | 7.19 +/- 1.48 steps |
| Peak spread rate | 0.1193 +/- 0.0244 | 0.1786 +/- 0.0310 |
| Polarization index | 0.196 | 0.196 |

Misinformation reaches near-total network coverage (99.8%) while truth tops out at 81.1% on average. The divergence is largest in the middle steps (roughly 4 to 10), where the high emotional intensity of the misinformation item produces consistently higher sharing probabilities at each agent interaction. The 50% saturation gap is 4.2 steps out of a 15-step simulation, which is substantial.

The high variance in truth spread (0.159 standard deviation vs. 0.012 for misinformation) reflects that low-emotion content is more sensitive to where in the network it starts. If the truth item originates in a well-connected region it can spread broadly; if it starts at the periphery it may stall. The misinformation item, carrying a 0.4 weight from its high emotional intensity, is much less sensitive to origin location.

Both items produce an identical polarization index of 0.196. This is because polarization is measured as the standard deviation of all agent beliefs after both items have propagated through the network. The competing influences of the two items produce a consistent spread of final beliefs regardless of which item dominates in a given trial.

### Topology Comparison

The next experiment isolates network structure by running only the misinformation item across small-world and scale-free networks.

![Topology Comparison](https://raw.githubusercontent.com/RyanX5/INFLOW/main/assets/screenshots/topology_comparison.png)

*Figure 2: Misinformation spread across 100 trials per topology. Red = small-world. Purple = scale-free.*

Scale-free networks are noticeably more vulnerable. The mean time to 50% saturation is substantially lower in scale-free networks, and the spread curve rises more steeply in early steps. This is explained by the hub nodes in scale-free networks: a small number of agents with very high degree serve as amplifiers, passing the misinformation to many neighbors in a single step. Small-world networks have more uniform degree, so the spread is smoother and slightly slower.

Both topologies converge to near-full saturation by step 15, which reflects the high emotional intensity of the test item. For lower-emotion content, topology differences would likely persist into the final step counts.

### Parameter Sensitivity

The parameter sweep runs 50 trials per value across five values of each parameter (0.1, 0.3, 0.5, 0.7, 0.9). One parameter is fixed at the swept value across all agents per trial; all others remain at their randomly initialized defaults. The misinformation item is used throughout.

**Skepticism sweep:**

![Skepticism Sweep](https://raw.githubusercontent.com/RyanX5/INFLOW/main/assets/screenshots/skepticism_sweep.png)

*Figure 3: Misinformation spread vs. agent skepticism. 50 trials per value.*

| Skepticism | Mean Final Spread | Time to 50% |
|---|---|---|
| 0.1 | 0.9996 | 6.68 steps |
| 0.3 | 0.9988 | 6.90 steps |
| 0.5 | 0.9938 | 6.86 steps |
| 0.7 | 0.9966 | 7.14 steps |
| 0.9 | 0.9996 | 6.96 steps |

The effect of skepticism is weak and non-monotonic. Time to 50% increases by about 0.5 steps from the lowest to highest skepticism level, and the relationship is noisy. This is because skepticism does not appear directly in the sharing probability formula. Its effect is indirect: higher skepticism slows belief updates, which slows how quickly an agent's belief aligns with an item's truth value, which slightly reduces the alignment term $A$ over time. But since the 0.9 emotional intensity already dominates the sharing formula (0.4 weight), a small reduction in the alignment term (0.3 weight) barely moves the total probability.

**Trust radius sweep:**

![Trust Radius Sweep](https://raw.githubusercontent.com/RyanX5/INFLOW/main/assets/screenshots/trust_radius_sweep.png)

*Figure 4: Misinformation spread vs. agent trust radius. 50 trials per value.*

| Trust Radius | Mean Final Spread | Time to 50% |
|---|---|---|
| 0.1 | 0.9928 | 7.58 steps |
| 0.3 | 0.9954 | 7.24 steps |
| 0.5 | 0.9942 | 6.84 steps |
| 0.7 | 0.9998 | 6.76 steps |
| 0.9 | 1.0000 | 6.16 steps |

Trust radius shows a clean monotonic relationship: as trust increases from 0.1 to 0.9, time to 50% saturation decreases from 7.58 to 6.16 steps and the variance drops. This is expected since trust radius contributes 0.3 weight directly to the sharing formula. Higher trust means higher per-step sharing probability at every agent interaction, which compounds across the network over time.

The contrast between the two sweeps illustrates something important about model design: where a parameter appears in the formula determines whether its effect is direct or indirect. Trust radius plugs directly into $P_{\text{share}}$, so tuning it has immediate and consistent effects. Skepticism goes through belief updates first, so its influence is attenuated and context-dependent.

### Hub vs. Random Injection

The final experiment compares starting misinformation at the highest-degree node (hub) versus a random node, across both small-world and scale-free networks. 50 trials per condition.

![Hub Injection Results](https://raw.githubusercontent.com/RyanX5/INFLOW/main/assets/screenshots/hub_cascade.png)

*Figure 5: Hub vs. random origin injection across topologies. 50 trials per condition.*

| Topology | Condition | Mean Final Spread | Time to 50% | Peak Rate |
|---|---|---|---|---|
| small_world | random | 0.9936 +/- 0.0379 | 6.88 steps | 0.1856 |
| small_world | hub | 1.0000 +/- 0.0000 | 5.94 steps | 0.1794 |
| scale_free | random | 1.0000 +/- 0.0000 | 3.92 steps | 0.3622 |
| scale_free | hub | 1.0000 +/- 0.0000 | 2.64 steps | 0.3698 |

A few things stand out here. First, starting from the hub node accelerates spread in both topologies, but the magnitude of the effect differs. In small-world, hub injection reduces time to 50% by about 0.94 steps (from 6.88 to 5.94). In scale-free, the reduction is 1.28 steps (from 3.92 to 2.64) - a 33% speedup on an already fast baseline. The hub effect is stronger where hubs matter more.

Second, scale-free networks spread misinformation dramatically faster than small-world regardless of origin. Even random injection on scale-free (3.92 steps to 50%) beats hub injection on small-world (5.94 steps to 50%). The network structure matters more than the origin strategy.

Third, the peak spread rate in scale-free networks (around 0.36) is roughly double that of small-world (around 0.18). This is the signature of a hub cascade: once a high-degree node shares the item, it reaches many neighbors simultaneously, causing a sharp single-step jump in coverage.

The zero standard deviation for final spread in scale-free (both conditions) and small-world hub injection reflects that these conditions consistently saturate the full network within 15 steps. The only condition with nonzero final spread variance is small-world random injection, confirming that origin location matters in more uniform networks.

### Limitations

A few limitations are worth being upfront about.

The belief update model is simple. Real users do not update their beliefs by a fixed linear formula based on a scalar "truth value." The model captures the general direction of the effect (skeptical people update less) but the specific dynamics are clearly abstracted.

The simulation also does not model forgetting, unfollowing, or changes in network structure over time. Real networks are dynamic: people lose interest in content, platforms suppress or amplify certain posts algorithmically, and connections form and break. None of that is in the model.

The parameter sweep experiments only vary one parameter at a time. The skepticism and trust radius results described above assume all other parameters are random; an interaction where both skepticism and trust radius are high simultaneously is not tested.

Finally, all experiments use misinformation items with `emotional_intensity=0.9`. This is close to the saturation point of the emotional term in the sharing formula, which is part of why final spread is near 100% in most conditions. The model's behavior under moderate emotional intensity (say, 0.5) is less fully characterized.

---

## 5. Challenges and Solutions

**Debugging the indirect path of skepticism.** When the parameter sweep first ran, the skepticism curves were nearly identical across all values. This looked like a bug. Tracing through the model revealed that skepticism only affects belief updates, not sharing decisions directly. The sharing formula was working as intended; the indirect mechanism just produces a weak signal. The solution was to reread the model equations carefully and reframe the result as a finding rather than an error.

**Wiring complexity into the sharing formula.** The `complexity` field on `InfoItem` was in the model from the start but was never actually used in the sharing probability calculation. It was just stored as an attribute. Fixing this required going back to the original design intent, deciding on a reasonable functional form (a linear dampener), and choosing a coefficient (0.5) that would produce a noticeable but not dominant effect.

**Visualization data pipeline.** The React frontend fetches CSVs from `visualization/public/`. Early versions of the simulation only wrote outputs to `output/`, so the frontend would show stale data unless you manually copied files. The fix was to add a copy step at the end of `save_outputs()` that automatically syncs the files to `visualization/public/` if that directory exists.

**Hub detection across topologies.** For the hub injection experiment, the hub node is defined as the node with the highest degree in a given trial's network. In small-world graphs (Watts-Strogatz), the degree distribution is much more uniform, so the "hub" is only marginally better connected than average. In scale-free graphs, the hub can have degree 20+ while the average is around 4. This means the hub injection effect is stronger in scale-free not just because of the topology, but because the hub is more meaningfully a hub.

**Polarization interpretation.** The polarization metric (standard deviation of agent beliefs at the end of a trial) initially seemed surprising when it came out identical for both truth and misinformation runs. The reason is that polarization is computed over *all* agents after both items have propagated, so it captures the combined effect of both items in the system. It does not distinguish between which item shifted which agent's beliefs. A more informative metric would track polarization over time or separately for agents who only received one item.

---

## 6. User Guide

### Prerequisites

- Python 3.10 or later
- Node.js 18 or later (for the visualization only)

Install Python dependencies from the project root:

```bash
pip install -r requirements.txt
```

### Running the Simulation

To run a single simulation and generate output CSVs and visualization data:

```bash
python main.py
```

The default configuration uses 50 agents, a small-world network, and 15 time steps. Customize it:

```bash
python main.py --agents 100 --steps 20 --topology scale_free --seed 123
```

After the run, check `output/` for the generated CSV files:
- `spread_log.csv` - step-by-step spread fraction for each info item
- `agent_states.csv` - final belief, bias, skepticism, trust radius, and share count per agent
- `info_items.csv` - truth value, emotional intensity, complexity, and final spread count
- `edges.csv` - edge list of the generated network

### Viewing the Network Visualization

The visualization reads the CSVs produced by `main.py`. Files are automatically copied to `visualization/public/` after a simulation run.

Start the development server:

```bash
cd visualization
npm install  # only needed the first time
npm run dev
```

Open `http://localhost:5173` in your browser. You should see a force-directed graph where:
- Node color represents final belief (red = low, amber = mid, green = high)
- Node size represents how many times the agent shared information
- Dashed rings mark origin nodes (green ring = truth origin, red ring = misinformation origin)
- Hovering a node shows its ID and all four trait values in a tooltip
- Nodes can be dragged to rearrange the layout

If the graph does not appear, make sure you ran `python main.py` first so the CSV files exist.

### Running Experiments

Each experiment script can be run independently from the project root:

```bash
# Truth vs. misinformation (100 trials, ~1 minute)
python experiment_runner.py

# Topology comparison (100 trials per topology)
python topology_comparison.py

# Parameter sensitivity sweep (50 trials per value)
python parameter_analysis.py

# Hub vs. random injection (50 trials per condition)
python hub_injection.py
```

Each script prints a summary table to the terminal and saves a PNG plot and CSV summary file to the project root.

---

## 7. Conclusion

INFLOW started as a basic simulation framework and ended up as a full experimental platform for studying misinformation dynamics. Over the course of the project, the model was extended from a minimal working simulation to a system that can run hundreds of controlled Monte Carlo trials and produce statistically grounded comparisons across network topologies, agent parameters, and injection strategies.

The main findings are worth summarizing. Emotional intensity is the dominant factor in spread. A misinformation item with high emotional charge consistently outpaces factual content regardless of the network structure or agent configuration tested. Trust radius has a direct, monotonic effect on spread speed because it enters the sharing formula explicitly. Skepticism has a much weaker and noisier effect because its influence travels through the belief update pathway rather than the sharing decision. Network structure matters: scale-free networks are substantially more vulnerable than small-world networks, and this is amplified when misinformation starts at a hub node. Hub injection reduces time to 50% saturation by about a third in scale-free networks compared to random injection.

These findings are consistent with the empirical literature on online misinformation. Vosoughi et al. (2018) found that false news spreads faster and farther than true news on Twitter, driven largely by novelty and emotional resonance. The model here reproduces that dynamic mechanically: the emotional intensity term in the sharing formula directly encodes a structural sharing advantage for high-emotion content.

---

## 8. AI Tool Acknowledgment

AI tools were used as a collaborative aid throughout the project for implementation, debugging, and report formatting. All simulation design decisions, experimental setups, parameter choices, and analytical interpretations were made and reviewed by the author. All generated code was tested and integrated manually.

---

## References

Barabasi, A.-L. (2016). *Network Science*. Cambridge University Press. https://networksciencebook.com/

Watts, D. J., & Strogatz, S. H. (1998). Collective dynamics of "small-world" networks. *Nature*, 393(6684), 440-442.

Vosoughi, S., Roy, D., & Aral, S. (2018). The spread of true and false news online. *Science*, 359(6380), 1146-1151. https://doi.org/10.1126/science.aap9559

Newman, M. E. J. (2010). *Networks: An Introduction*. Oxford University Press.

D3.js Data Visualization Library. https://d3js.org/

React Documentation. https://react.dev/
