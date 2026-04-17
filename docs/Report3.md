# INFLOW - Progress Report 3

**Rohan Upadhyay** | CSCI 412: Senior Seminar II | April 8, 2026

GitHub: https://github.com/RyanX5/INFLOW

---

## 1. Project Overview

INFLOW is an agent-based simulation designed to study how information and misinformation propagate through social networks. The system models individual users as agents with psychological traits that influence how they receive, believe, and share information. By combining network science with behavioral modeling, INFLOW simulates how different types of content spread across a population.

The central goal of the project is to explore the dynamics that allow misinformation to spread rapidly in online environments. In particular, the simulation examines how emotional intensity, individual skepticism, trust, and network structure interact to shape information diffusion.

Agents exist within a network topology that approximates real social networks. Information items are introduced into the network from origin nodes and propagate through agent interactions. Each agent updates its belief state when receiving information and may choose to share it with neighbors based on a probabilistic behavioral model.

At the midpoint of the project, the simulation engine, agent models, and visualization system were fully implemented. In the second progress report, experimentation and topology comparison tools were introduced, producing initial findings on how network structure and emotional content affect spread. This report describes the work completed since then: a refined propagation model, a formal statistical analysis framework, and a parameter sensitivity study examining how individual agent traits control misinformation dynamics.

---

## 2. Implementation Status

The core system remains fully implemented as described in prior reports. The following modules are complete:

| Module | Status | Description |
|---|---|---|
| `simulation/network.py` | Complete | Network generation across three topologies |
| `simulation/agent.py` | Complete | Agent behavioral model with belief updating |
| `simulation/information.py` | Complete | Information item representation |
| `simulation/engine.py` | Complete | Simulation execution and propagation engine |
| `visualization/` | Complete | React + D3 visualization frontend |
| `experiment_runner.py` | Complete | Monte Carlo propagation experiments |
| `topology_comparison.py` | Complete | Cross-topology vulnerability analysis |

### New Additions

| Module | Status | Description |
|---|---|---|
| `parameter_analysis.py` | Complete | Parameter sensitivity sweep framework |
| `experiment_runner.py` (updated) | Complete | Derived statistical metrics and summary export |

### Model Refinements

Two corrections were made to the propagation model since Report 2:

- **Complexity wired into sharing probability.** The `complexity` field on `InfoItem` was previously stored but unused. It now acts as a dampener on sharing probability, reflecting that more complex information is harder to pass on regardless of its emotional charge.

- **`share_probability` made functional.** The engine accepted a `share_probability` parameter since its initial implementation but never applied it. It now acts as a global multiplier on computed sharing probabilities, enabling controlled sweeps of overall network sharing tendency.

---

## 3. System Architecture

INFLOW consists of three primary subsystems:

- `simulation/` - backend simulation engine
- `visualization/` - React + D3 frontend
- `output/` - generated CSV datasets

Pipeline:

$$
\text{Network Generation} \rightarrow \text{Agent Initialization} \rightarrow \text{Information Injection}
$$

$$
\rightarrow \text{Simulation Execution} \rightarrow \text{Data Logging} \rightarrow \text{Visualization}
$$

---

## 4. Key Implementations

### Refined Sharing Probability Model

The probability that an agent shares an information item was updated to incorporate all item and agent properties. The revised formula is:

$$P_{\text{share}} = \bigl(0.4 \cdot E + 0.3 \cdot A + 0.3 \cdot \tau\bigr)\,(1 - 0.5 \cdot C)\,\cdot\,\rho$$

Where:

- $E$ = emotional intensity of the information item
- $A$ = belief alignment between agent and item, defined as $A = 1 - |b - T|$
- $\tau$ = agent trust radius
- $C$ = complexity of the information item
- $\rho$ = global share probability multiplier (default 1.0)
- $b$ = current agent belief, $T$ = item truth value

The complexity dampener $(1 - 0.5 \cdot C)$ reduces sharing probability proportionally. At $C = 0$, the term has no effect; at $C = 1.0$, it halves the computed probability. This reflects the empirical observation that complex or technical content spreads more slowly through social networks regardless of its emotional charge.

Implementation:

```python
def _sharing_probability(self, agent, neighbor, item):
    alignment = 1.0 - abs(agent.belief - item.truth_value)
    prob = (
        0.4 * item.emotional_intensity +
        0.3 * alignment +
        0.3 * agent.trust_radius
    ) * (1.0 - 0.5 * item.complexity) * self.share_probability
    return max(0.0, min(1.0, prob))
```

### Agent Belief Update

When an agent receives an information item, its belief shifts toward the item's truth value. The magnitude of the shift is dampened by the agent's skepticism and bias:

$$\Delta b = \frac{T - b}{1 + s}\,(1 - \beta)$$

$$b' = \text{clamp}(b + \Delta b,\; 0,\; 1)$$

Where $s$ is skepticism and $\beta$ is bias. Higher skepticism divides the update, and higher bias scales it down multiplicatively. These parameters interact with the sharing model indirectly: as an agent's belief shifts, its alignment $A$ with future information items changes, which in turn affects subsequent sharing decisions.

### Statistical Analysis Framework

The experiment runner was extended to compute derived metrics from each Monte Carlo trial. After all trials complete, the following statistics are aggregated across runs:

**Time to 50% saturation** - the first step at which a given item has reached at least half the network:

$$t_{50} = \min\bigl\{\,t \;:\; f(t) \geq 0.5\,\bigr\}$$

**Peak spread rate** - the largest single-step increase in network reach across the simulation:

$$r_{\text{peak}} = \max_{t}\;\bigl(f(t) - f(t-1)\bigr)$$

**Spread fraction** at any step:

$$f(t) = \frac{\text{agents reached at step } t}{\text{total agents}}$$

**Polarization index** - the standard deviation of agent beliefs across the network at the end of a trial:

$$\sigma_b = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(b_i - \bar{b})^2}$$

A higher polarization index indicates that the network has settled into divided belief clusters rather than converging on a shared belief state.

Implementation excerpt:

```python
def compute_summary_stats(truth_data, fake_data, polarization):
    for label, data in [("truth", truth_data),
                        ("misinformation", fake_data)]:
        for trial in range(num_trials):
            series = data[trial]
            idxs = np.where(series >= 0.5)[0]
            t50 = int(idxs[0]) if len(idxs) > 0 else data.shape[1]
            time_to_50.append(t50)
            peak_rates.append(float(np.max(np.diff(series))))
            final_spreads.append(float(series[-1]))
```

Results are printed as a formatted summary table and exported to `experiment_summary.csv`.

### Parameter Sensitivity Framework

A new script, `parameter_analysis.py`, implements a sweep-based sensitivity analysis. For a given agent parameter, it iterates over a range of values, overrides that attribute uniformly across all agents in each trial network, and records spread dynamics across 50 Monte Carlo trials per value.

```python
def run_sweep(param_name, param_values, num_trials, num_steps, num_agents):
    for p_idx, p_val in enumerate(param_values):
        for trial in range(num_trials):
            graph, agents = build_network(
                num_agents, topology="small_world", seed=seed
            )
            for agent in agents.values():
                setattr(agent, param_name, p_val)
            # run simulation and record spread per step
```

This design allows any scalar agent attribute to be swept without modifying the simulation core. The script produces per-parameter line plots with shaded standard deviation bands and exports a consolidated summary CSV.

---

## 5. Metrics and Data Logging

The simulation logs propagation data into CSV files after each run:

- `agent_states.csv`
- `edges.csv`
- `info_items.csv`
- `spread_log.csv`
- `experiment_summary.csv` *(new)*
- `parameter_sweep_summary.csv` *(new)*

The spread log records per-step metrics for each information item, including spread count, spread fraction, and belief statistics across holders. The two new summary files aggregate derived metrics across Monte Carlo trials for downstream analysis.

---

## 6. Experimental Results

### Propagation Dynamics

The core propagation experiment was re-run with 100 Monte Carlo trials on a small-world network with 100 agents over 15 steps. Two information items compete simultaneously: a high-truth, low-emotion item representing factual content, and a low-truth, high-emotion item representing misinformation.

![Information Propagation: Truth vs. Misinformation](https://raw.githubusercontent.com/RyanX5/INFLOW/main/assets/screenshots/propagation_analysis.png)

*Fig 1: Average network reach over 15 steps across 100 trials. Red: misinformation (high emotion). Blue: truth (low emotion). Shaded regions show ±1 standard deviation.*

The misinformation item spreads consistently faster and reaches higher final coverage. The divergence between curves is most pronounced in the middle steps (4-10), where the emotional intensity of the misinformation item produces substantially higher sharing probabilities at each agent interaction.

### Summary Statistics

Running `experiment_runner.py` on the full 100-trial configuration produces the following aggregate statistics:

![Experiment Summary Table](https://raw.githubusercontent.com/RyanX5/INFLOW/main/assets/screenshots/experiment_summary_table.png)

*Fig 2: Derived metrics aggregated across 100 trials. Truth item has truth value 0.9, emotional intensity 0.2. Misinformation item has truth value 0.1, emotional intensity 0.9.*

Key observations:

- Misinformation reaches **99.8%** of the network on average, compared to **81.1%** for truth. The higher variance in truth spread ($\pm 0.159$) reflects that truthful, low-emotion content is more sensitive to where in the network it originates.
- Misinformation reaches 50% saturation at step **7.2** on average, versus step **11.4** for truth - a difference of over 4 steps in a 15-step simulation.
- The peak spread rate of misinformation (**0.179**) is approximately 50% higher than that of truth (**0.119**), indicating a sharper cascade phase.
- Both items produce an identical polarization index (**0.196**), since polarization is measured as the standard deviation of all agent beliefs at the end of the trial, after both items have propagated. The network settles into a mixed belief state regardless of which item dominates spread.

### Skepticism Sensitivity

The skepticism sweep varies average agent skepticism from 0.1 to 0.9 in increments of 0.2, running 50 trials per value. All other agent parameters are held at their randomly initialized defaults.

![Skepticism Sweep](https://raw.githubusercontent.com/RyanX5/INFLOW/main/assets/screenshots/skepticism_sweep.png)

*Fig 3: Misinformation spread under varying levels of agent skepticism (50 trials per value). Higher skepticism corresponds to slower belief convergence and reduced sharing through the alignment term.*

Skepticism does not directly appear in the sharing probability formula. Its effect on spread is indirect: higher skepticism slows belief updates, which means agents are slower to shift their beliefs toward the item's truth value. Since belief alignment $A = 1 - |b - T|$ determines 30% of the sharing probability, slower belief movement reduces alignment with the misinformation item over time, moderately dampening spread.

The result is visible but not dramatic. Time to 50% saturation increases from **6.7 steps** at skepticism 0.1 to **7.0 steps** at skepticism 0.9 - a modest effect. Final spread converges to near 100% regardless of skepticism level. This suggests that in a population exposed to highly emotional misinformation, individual skepticism alone is insufficient to prevent full network saturation. It slows the spread but does not contain it.

### Trust Radius Sensitivity

The trust radius sweep varies agent trust radius from 0.1 to 0.9, with the same experimental setup.

![Trust Radius Sweep](https://raw.githubusercontent.com/RyanX5/INFLOW/main/assets/screenshots/trust_radius_sweep.png)

*Fig 4: Misinformation spread under varying levels of agent trust radius (50 trials per value). Trust radius directly contributes 30% of the sharing probability.*

Unlike skepticism, trust radius appears directly in the sharing probability formula with a 0.3 weight. Its effect on spread is therefore immediate and consistent. Time to 50% saturation decreases from **7.6 steps** at trust radius 0.1 to **6.2 steps** at trust radius 0.9 - a difference of 1.4 steps, and a more consistent separation across values than the skepticism sweep.

High-trust networks diffuse misinformation faster and with lower variance across trials. Low-trust networks slow the cascade phase, though they still reach near-total saturation by step 15.

### Parameter Summary

![Parameter Summary Table](https://raw.githubusercontent.com/RyanX5/INFLOW/main/assets/screenshots/parameter_summary_table.png)

*Fig 5: Consolidated parameter sweep results across all skepticism and trust radius values. Columns show mean final spread, time to 50% saturation, and peak spread rate.*

The table highlights an asymmetry between the two parameters. Trust radius produces a monotonic relationship with spread speed: as trust increases from 0.1 to 0.9, time to 50% decreases steadily from 7.6 to 6.2 steps. The skepticism relationship is noisier and non-monotonic at the extremes, consistent with its indirect pathway through belief dynamics rather than a direct contribution to the sharing formula.

---

## 7. Analysis and Insights

The results of this report suggest several findings about the dynamics of misinformation propagation in agent-based networks:

**Emotional intensity dominates spread.** Across all experimental conditions, the misinformation item - defined by high emotional intensity rather than low truth value - consistently outpaces truthful content. The 40% weight assigned to emotional intensity in the sharing probability formula means that emotional content retains a structural sharing advantage regardless of how skeptical or trusting the population is.

**Trust is a direct amplifier.** Because trust radius contributes 30% of sharing probability, high-trust populations transmit information faster at every step. This mirrors observed dynamics in online communities where strong in-group trust accelerates information cascades, beneficial and harmful alike.

**Skepticism is a weak brake.** The indirect pathway of skepticism - dampening belief updates rather than sharing decisions - means that even highly skeptical populations eventually saturate when exposed to high-emotion content. The mechanism slows but does not stop the cascade. This has implications for interventions: reducing the emotional charge of misinformation may be more effective than attempting to increase population-level skepticism.

**Final reach is parameter-insensitive at high emotion.** Across all parameter sweep conditions, misinformation with emotional intensity 0.9 approaches full network coverage within 15 steps. The parameters modulate speed, not reach. Containing misinformation spread in such a model would require either structural changes to the network (reducing connectivity) or reducing the emotional intensity of the content itself.

**Polarization is stable.** The polarization index of approximately 0.196 across all 100 trials indicates that the final belief distribution is consistently spread - neither fully converged nor fully bifurcated. This reflects the mixed influence of competing true and false information items propagating simultaneously.

---

## 8. Remaining Work

The system is substantially complete. Remaining improvements include:

- Expanding topology sensitivity experiments to include the random (Erdos-Renyi) graph alongside small-world and scale-free
- Investigating targeted injection strategies (hub nodes vs. random origin) and their effect on cascade behavior
- Extending the visualization frontend to display summary statistics alongside the network graph
- Conducting a combined parameter sweep across both skepticism and trust radius simultaneously to examine interaction effects

---

## 9. Challenges Encountered

One challenge in this phase involved interpreting parameter sweep results where the expected effect did not manifest as clearly as anticipated. The skepticism sweep initially produced nearly identical curves across all values, which prompted investigation into how skepticism enters the model. This revealed the indirect mechanism - skepticism affects belief updates, which affect alignment, which affects future sharing - and led to a more nuanced interpretation of the results rather than a model correction.

A second challenge involved the polarization metric. Because polarization is computed over all agent beliefs at the end of a trial (after both information items have propagated), it cannot distinguish between the contributions of each item to the final belief distribution. Future work would compute polarization separately for subpopulations that received only one item versus both.

---

## 10. Conclusion

INFLOW has developed from a simulation framework into a structured experimental platform capable of producing reproducible, statistically grounded findings about information propagation dynamics. The additions in this report - the refined propagation model, statistical analysis framework, and parameter sensitivity study - represent a meaningful step toward systematic analysis of misinformation dynamics.

The key finding of this phase is that emotional intensity is the dominant driver of misinformation spread in this model, and that individual psychological traits such as skepticism and trust modulate the speed but not the ultimate reach of high-emotion content. These results are consistent with empirical studies of online information spread, particularly the findings of Vosoughi et al. (2018), who showed that false news spreads faster and farther than true news on social media, driven largely by its novelty and emotional content.

The final phase of the project will focus on completing the remaining experimental scenarios and refining the visualization system to better surface these dynamics interactively.

---

## 11. Use of AI Tools and Professional Conduct

During the development of this project, generative AI tools were used as a collaborative aid for implementation, debugging, and report formatting. All simulation logic, experimental design decisions, and analytical interpretations were developed and reviewed by the author.

In particular, AI assistance was used for:

- Implementation of the parameter sweep framework and statistical metrics
- Formatting and structuring written sections of this report
- Debugging and code review during development

All generated code was reviewed, tested, and integrated manually. The author maintained full responsibility for the design, correctness, and integrity of the final system and report. This use of AI tools complies with the course guidelines for professional conduct and responsible use of generative technologies.

---

## 12. References

Barabasi, A.-L. (2016). *Network Science*. Cambridge University Press. https://networksciencebook.com/

Watts, D. J., & Strogatz, S. H. (1998). Collective dynamics of "small-world" networks. *Nature*, 393(6684), 440-442.

Vosoughi, S., Roy, D., & Aral, S. (2018). The spread of true and false news online. *Science*, 359(6380), 1146-1151. https://doi.org/10.1126/science.aap9559

Newman, M. E. J. (2010). *Networks: An Introduction*. Oxford University Press.

D3.js Data Visualization Library. https://d3js.org/

React Documentation. https://react.dev/
