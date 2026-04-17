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
TOPOLOGIES = ["small_world", "scale_free"]


def get_hub_node(graph):
    return max(graph.degree(), key=lambda x: x[1])[0]


def run_hub_comparison(num_trials=NUM_TRIALS, num_steps=NUM_STEPS, num_agents=NUM_AGENTS):
    # results[topology_idx, condition_idx, trial, step]
    # condition: 0 = random origin, 1 = hub origin
    results = np.zeros((2, 2, num_trials, num_steps + 1))

    for t_idx, topo in enumerate(TOPOLOGIES):
        print(f"Testing {topo}...")
        for c_idx, condition in enumerate(["random", "hub"]):
            print(f"  Condition: {condition} injection ({num_trials} trials)...")
            for trial in range(num_trials):
                seed = 7000 + t_idx * 1000 + c_idx * 500 + trial
                random.seed(seed)

                graph, agents = build_network(num_agents=num_agents, topology=topo, seed=seed)

                if condition == "hub":
                    origin = get_hub_node(graph)
                else:
                    origin = random.choice(list(agents.keys()))

                item = InfoItem(
                    item_id=0,
                    truth_value=0.1,
                    emotional_intensity=0.9,
                    complexity=0.3,
                    origin_node=origin,
                )

                engine = SimulationEngine(graph, agents, seed=seed)
                engine.inject_information(item)

                results[t_idx, c_idx, trial, 0] = item.spread_count / num_agents
                for step in range(1, num_steps + 1):
                    engine._step()
                    results[t_idx, c_idx, trial, step] = item.spread_count / num_agents

    return results


def compute_hub_stats(results):
    rows = []
    for t_idx, topo in enumerate(TOPOLOGIES):
        for c_idx, condition in enumerate(["random", "hub"]):
            final_spreads = results[t_idx, c_idx, :, -1]
            t50_list = []
            peak_rates = []
            for trial in range(results.shape[2]):
                series = results[t_idx, c_idx, trial]
                idxs = np.where(series >= 0.5)[0]
                t50_list.append(int(idxs[0]) if len(idxs) > 0 else results.shape[3])
                peak_rates.append(float(np.max(np.diff(series))))
            rows.append({
                "topology": topo,
                "condition": condition,
                "mean_final_spread": round(float(np.mean(final_spreads)), 4),
                "std_final_spread": round(float(np.std(final_spreads)), 4),
                "mean_time_to_50": round(float(np.mean(t50_list)), 2),
                "std_time_to_50": round(float(np.std(t50_list)), 2),
                "mean_peak_rate": round(float(np.mean(peak_rates)), 4),
            })
    return rows


def print_hub_stats(rows):
    print(f"\n{'Topology':<14} {'Condition':<10} {'Final Spread':<18} {'Time to 50%':<14} {'Peak Rate'}")
    print("-" * 70)
    for r in rows:
        print(f"{r['topology']:<14} {r['condition']:<10} "
              f"{r['mean_final_spread']:.4f} +/- {r['std_final_spread']:.4f}   "
              f"{r['mean_time_to_50']:<14.2f} {r['mean_peak_rate']:.4f}")


def save_hub_stats(rows, filename="hub_injection_summary.csv"):
    with open(filename, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved: {filename}")


def plot_hub_results(results):
    steps = np.arange(results.shape[3])
    fig, axes = plt.subplots(1, 2, figsize=(14, 6), sharey=True)

    colors = {
        "random": "#58a6ff",
        "hub": "#e03131",
    }
    labels = {
        "random": "Random Origin",
        "hub": "Hub Origin",
    }

    for t_idx, (topo, ax) in enumerate(zip(TOPOLOGIES, axes)):
        for c_idx, condition in enumerate(["random", "hub"]):
            mean = np.mean(results[t_idx, c_idx], axis=0)
            std = np.std(results[t_idx, c_idx], axis=0)
            ax.plot(steps, mean, label=labels[condition],
                    color=colors[condition], linewidth=2.5)
            ax.fill_between(steps, mean - std, mean + std,
                            color=colors[condition], alpha=0.15)

        title = "Small-World" if topo == "small_world" else "Scale-Free"
        ax.set_title(f"{title} Network", fontsize=13)
        ax.set_xlabel("Time Steps")
        ax.grid(True, linestyle="--", alpha=0.4)
        ax.legend()

    axes[0].set_ylabel("Average Network Reach (%)")
    fig.suptitle("Hub vs. Random Injection: Misinformation Spread (50 Trials)", fontsize=14)
    plt.tight_layout()
    plt.savefig("hub_injection_results.png", dpi=150)
    plt.show()
    print("Saved: hub_injection_results.png")


if __name__ == "__main__":
    print("=== Hub vs. Random Injection Analysis ===\n")
    results = run_hub_comparison()
    rows = compute_hub_stats(results)
    print_hub_stats(rows)
    save_hub_stats(rows)
    plot_hub_results(results)
    print("\nDone.")
