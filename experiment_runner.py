import csv
import random

import matplotlib.pyplot as plt
import numpy as np

from simulation.engine import SimulationEngine
from simulation.information import InfoItem
from simulation.network import build_network


def run_monte_carlo(num_trials=100, num_steps=15, num_agents=100):
    truth_results = np.zeros((num_trials, num_steps + 1))
    fake_results = np.zeros((num_trials, num_steps + 1))
    polarization = np.zeros(num_trials)

    print(f"Running {num_trials} trials...")

    for trial in range(num_trials):
        seed = 1000 + trial
        random.seed(seed)

        graph, agents = build_network(num_agents=num_agents, topology="small_world", seed=seed)

        item_true = InfoItem(0, truth_value=0.9, emotional_intensity=0.2, complexity=0.5,
                             origin_node=random.choice(list(agents.keys())))
        item_fake = InfoItem(1, truth_value=0.1, emotional_intensity=0.9, complexity=0.3,
                             origin_node=random.choice(list(agents.keys())))

        engine = SimulationEngine(graph, agents, seed=seed)
        engine.inject_information(item_true)
        engine.inject_information(item_fake)

        truth_results[trial, 0] = item_true.spread_count / num_agents
        fake_results[trial, 0] = item_fake.spread_count / num_agents

        for step in range(1, num_steps + 1):
            engine._step()
            truth_results[trial, step] = item_true.spread_count / num_agents
            fake_results[trial, step] = item_fake.spread_count / num_agents

        # Final polarization: std dev of agent beliefs across the network
        beliefs = [a.belief for a in agents.values()]
        polarization[trial] = np.std(beliefs)

    return truth_results, fake_results, polarization


def compute_summary_stats(truth_data, fake_data, polarization):
    """Derive per-trial metrics and aggregate across trials."""
    num_trials = truth_data.shape[0]

    stats = {}
    for label, data in [("truth", truth_data), ("misinformation", fake_data)]:
        time_to_50, peak_rates, final_spreads = [], [], []

        for trial in range(num_trials):
            series = data[trial]

            idxs = np.where(series >= 0.5)[0]
            time_to_50.append(int(idxs[0]) if len(idxs) > 0 else data.shape[1])

            peak_rates.append(float(np.max(np.diff(series))))
            final_spreads.append(float(series[-1]))

        stats[label] = {
            "mean_final_spread":  round(float(np.mean(final_spreads)), 4),
            "std_final_spread":   round(float(np.std(final_spreads)), 4),
            "mean_time_to_50":    round(float(np.mean(time_to_50)), 2),
            "std_time_to_50":     round(float(np.std(time_to_50)), 2),
            "mean_peak_rate":     round(float(np.mean(peak_rates)), 4),
            "std_peak_rate":      round(float(np.std(peak_rates)), 4),
            "mean_polarization":  round(float(np.mean(polarization)), 4),
            "std_polarization":   round(float(np.std(polarization)), 4),
        }

    return stats


def print_summary_table(stats):
    print("\n=== Experiment Summary ===")
    print(f"{'Metric':<25} {'Truth':<20} {'Misinformation'}")
    print("-" * 65)
    metrics = [
        ("Final spread",     "mean_final_spread",  "std_final_spread"),
        ("Time to 50%",      "mean_time_to_50",    "std_time_to_50"),
        ("Peak spread rate", "mean_peak_rate",      "std_peak_rate"),
        ("Polarization",     "mean_polarization",   "std_polarization"),
    ]
    for label, mean_key, std_key in metrics:
        t = stats["truth"]
        m = stats["misinformation"]
        print(f"{label:<25} {t[mean_key]:.4f} ± {t[std_key]:.4f}    "
              f"{m[mean_key]:.4f} ± {m[std_key]:.4f}")


def save_experiment_summary(stats, filename="experiment_summary.csv"):
    rows = []
    for item_type, s in stats.items():
        row = {"item_type": item_type}
        row.update(s)
        rows.append(row)

    with open(filename, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved: {filename}")


def plot_results(truth_data, fake_data):
    steps = np.arange(truth_data.shape[1])

    mean_truth = np.mean(truth_data, axis=0)
    std_truth = np.std(truth_data, axis=0)
    mean_fake = np.mean(fake_data, axis=0)
    std_fake = np.std(fake_data, axis=0)

    plt.figure(figsize=(10, 6))

    plt.plot(steps, mean_truth, label='Truth (Low Emotion)', color='blue', linewidth=2)
    plt.fill_between(steps, mean_truth - std_truth, mean_truth + std_truth, color='blue', alpha=0.2)

    plt.plot(steps, mean_fake, label='Misinformation (High Emotion)', color='red', linewidth=2)
    plt.fill_between(steps, mean_fake - std_fake, mean_fake + std_fake, color='red', alpha=0.2)

    plt.title('Information Propagation: Truth vs. Misinformation (100 Trials)')
    plt.xlabel('Time Steps')
    plt.ylabel('Average Network Reach (%)')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.savefig('propagation_analysis.png')
    plt.show()


if __name__ == "__main__":
    t_data, f_data, pol = run_monte_carlo()
    plot_results(t_data, f_data)
    stats = compute_summary_stats(t_data, f_data, pol)
    print_summary_table(stats)
    save_experiment_summary(stats)
