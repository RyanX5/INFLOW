import csv
import random

import matplotlib.pyplot as plt
import numpy as np

from simulation.engine import SimulationEngine
from simulation.information import InfoItem
from simulation.network import build_network

NUM_TRIALS = 50
NUM_STEPS = 15
NUM_AGENTS = 100
PARAM_VALUES = [0.1, 0.3, 0.5, 0.7, 0.9]


def run_sweep(param_name, param_values=PARAM_VALUES, num_trials=NUM_TRIALS,
              num_steps=NUM_STEPS, num_agents=NUM_AGENTS):
    """
    Sweep a single agent parameter across values using Monte Carlo trials.
    Returns results of shape (len(param_values), num_trials, num_steps+1).
    """
    results = np.zeros((len(param_values), num_trials, num_steps + 1))

    for p_idx, p_val in enumerate(param_values):
        print(f"  {param_name}={p_val:.1f} — {num_trials} trials...")
        for trial in range(num_trials):
            seed = 5000 + p_idx * 1000 + trial
            random.seed(seed)

            graph, agents = build_network(num_agents=num_agents, topology="small_world", seed=seed)

            # Override the target parameter uniformly across all agents
            for agent in agents.values():
                setattr(agent, param_name, p_val)

            item = InfoItem(
                item_id=0,
                truth_value=0.1,
                emotional_intensity=0.9,
                complexity=0.3,
                origin_node=random.choice(list(agents.keys()))
            )

            engine = SimulationEngine(graph, agents, seed=seed)
            engine.inject_information(item)

            results[p_idx, trial, 0] = item.spread_count / num_agents
            for step in range(1, num_steps + 1):
                engine._step()
                results[p_idx, trial, step] = item.spread_count / num_agents

    return results


def plot_sweep(results, param_name, param_values=PARAM_VALUES):
    steps = np.arange(results.shape[2])
    plt.figure(figsize=(10, 6))

    cmap = plt.cm.plasma
    colors = [cmap(i / (len(param_values) - 1)) for i in range(len(param_values))]

    for i, p_val in enumerate(param_values):
        mean = np.mean(results[i], axis=0)
        std = np.std(results[i], axis=0)
        plt.plot(steps, mean, label=f'{param_name}={p_val:.1f}', color=colors[i], linewidth=2)
        plt.fill_between(steps, mean - std, mean + std, color=colors[i], alpha=0.15)

    plt.title(f'Misinformation Spread vs. Agent {param_name.capitalize()} ({NUM_TRIALS} Trials)')
    plt.xlabel('Time Steps')
    plt.ylabel('Average Network Reach (%)')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.4)
    fname = f'{param_name}_sweep.png'
    plt.savefig(fname)
    plt.show()
    print(f'Saved: {fname}')


def save_summary_csv(skepticism_results, trust_radius_results, param_values=PARAM_VALUES,
                     filename="parameter_sweep_summary.csv"):
    rows = []
    for param_name, results in [("skepticism", skepticism_results), ("trust_radius", trust_radius_results)]:
        for i, p_val in enumerate(param_values):
            final_spreads = results[i, :, -1]

            t50_list = []
            for trial in range(results.shape[1]):
                idxs = np.where(results[i, trial] >= 0.5)[0]
                t50_list.append(int(idxs[0]) if len(idxs) > 0 else results.shape[2])

            peak_rates = [float(np.max(np.diff(results[i, trial]))) for trial in range(results.shape[1])]

            rows.append({
                "parameter": param_name,
                "value": round(p_val, 2),
                "mean_final_spread": round(float(np.mean(final_spreads)), 4),
                "std_final_spread": round(float(np.std(final_spreads)), 4),
                "mean_time_to_50": round(float(np.mean(t50_list)), 2),
                "mean_peak_rate": round(float(np.mean(peak_rates)), 4),
            })

    with open(filename, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved: {filename}")

    # Print a readable summary table
    print(f"\n{'Parameter':<14} {'Value':<8} {'Final Spread':<15} {'Time to 50%':<14} {'Peak Rate'}")
    print("-" * 65)
    for row in rows:
        print(f"{row['parameter']:<14} {row['value']:<8} "
              f"{row['mean_final_spread']:.3f} ± {row['std_final_spread']:.3f}   "
              f"{row['mean_time_to_50']:<14.1f} {row['mean_peak_rate']:.4f}")


if __name__ == "__main__":
    print("=== Parameter Sensitivity Analysis ===\n")

    print("Sweeping skepticism...")
    s_results = run_sweep("skepticism")
    plot_sweep(s_results, "skepticism")

    print("\nSweeping trust_radius...")
    t_results = run_sweep("trust_radius")
    plot_sweep(t_results, "trust_radius")

    save_summary_csv(s_results, t_results)
    print("\nDone.")
