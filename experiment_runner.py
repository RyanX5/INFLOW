import numpy as np
import matplotlib.pyplot as plt
from simulation.network import build_network
from simulation.engine import SimulationEngine
from simulation.information import InfoItem
import random

def run_monte_carlo(num_trials=100, num_steps=15, num_agents=100):
    # Storage for results: [trial, step]
    truth_results = np.zeros((num_trials, num_steps + 1))
    fake_results = np.zeros((num_trials, num_steps + 1))

    print(f"Running {num_trials} trials...")

    for trial in range(num_trials):
        seed = 1000 + trial # Unique seed per trial for reproducibility
        random.seed(seed)
        
        # 1. Setup Network
        graph, agents = build_network(num_agents=num_agents, topology="small_world", seed=seed)
        
        # 2. Define Items (Consistent with your Midterm params)
        # Item 0: Truth (High Truth, Low Emotion)
        item_true = InfoItem(0, truth_value=0.9, emotional_intensity=0.2, complexity=0.5, origin_node=random.choice(list(agents.keys())))
        # Item 1: Misinformation (Low Truth, High Emotion)
        item_fake = InfoItem(1, truth_value=0.1, emotional_intensity=0.9, complexity=0.3, origin_node=random.choice(list(agents.keys())))

        # 3. Run Simulation
        engine = SimulationEngine(graph, agents, seed=seed)
        engine.inject_information(item_true)
        engine.inject_information(item_fake)
        
        # Record initial state (Step 0)
        truth_results[trial, 0] = item_true.spread_count / num_agents
        fake_results[trial, 0] = item_fake.spread_count / num_agents

        for step in range(1, num_steps + 1):
            engine._step()
            truth_results[trial, step] = item_true.spread_count / num_agents
            fake_results[trial, step] = item_fake.spread_count / num_agents

    return truth_results, fake_results

def plot_results(truth_data, fake_data):
    steps = np.arange(truth_data.shape[1])
    
    # Calculate Mean and Std Dev
    mean_truth = np.mean(truth_data, axis=0)
    std_truth = np.std(truth_data, axis=0)
    
    mean_fake = np.mean(fake_data, axis=0)
    std_fake = np.std(fake_data, axis=0)

    plt.figure(figsize=(10, 6))

    # Plot Truth
    plt.plot(steps, mean_truth, label='Truth (Low Emotion)', color='blue', linewidth=2)
    plt.fill_between(steps, mean_truth - std_truth, mean_truth + std_truth, color='blue', alpha=0.2)

    # Plot Misinformation
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
    t_data, f_data = run_monte_carlo()
    plot_results(t_data, f_data)