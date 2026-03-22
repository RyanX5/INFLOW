import numpy as np
import matplotlib.pyplot as plt
import random
from simulation.network import build_network
from simulation.engine import SimulationEngine
from simulation.information import InfoItem

def run_topology_comparison(num_trials=100, num_steps=15, num_agents=100):
    # Storage: [topology_type, trial, step]
    # 0 = Small-World, 1 = Scale-Free
    results = np.zeros((2, num_trials, num_steps + 1))
    topologies = ["small_world", "scale_free"]

    for t_idx, topo in enumerate(topologies):
        print(f"Testing {topo} topology over {num_trials} trials...")
        for trial in range(num_trials):
            seed = 3000 + trial
            random.seed(seed)
            
            # 1. Build the specific network type
            graph, agents = build_network(num_agents=num_agents, topology=topo, seed=seed)
            
            # 2. Use the "Misinformation" item (Low Truth, High Emotion) 
            # This tests which network is more "vulnerable" to fake news
            item_fake = InfoItem(
                item_id=1, 
                truth_value=0.1, 
                emotional_intensity=0.9, 
                complexity=0.3, 
                origin_node=random.choice(list(agents.keys()))
            )

            # 3. Run Simulation
            engine = SimulationEngine(graph, agents, seed=seed)
            engine.inject_information(item_fake)
            
            results[t_idx, trial, 0] = item_fake.spread_count / num_agents

            for step in range(1, num_steps + 1):
                engine._step()
                results[t_idx, trial, step] = item_fake.spread_count / num_agents

    return results

def plot_topology_results(data):
    steps = np.arange(data.shape[2])
    plt.figure(figsize=(10, 6))

    # Using distinct colors to differentiate structures
    colors = ['#e03131', '#863bff'] 
    labels = ['Small-World (Clustered)', 'Scale-Free (Hub-Based)']

    for i in range(2):
        mean = np.mean(data[i], axis=0)
        std = np.std(data[i], axis=0)
        
        plt.plot(steps, mean, label=labels[i], color=colors[i], linewidth=2.5)
        plt.fill_between(steps, mean - std, mean + std, color=colors[i], alpha=0.15)

    plt.title('Vulnerability Analysis: Misinformation Spread by Topology')
    plt.xlabel('Time Steps')
    plt.ylabel('Average Network Reach (%)')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.4)
    plt.savefig('topology_comparison_results.png')
    plt.show()

if __name__ == "__main__":
    data = run_topology_comparison()
    plot_topology_results(data)