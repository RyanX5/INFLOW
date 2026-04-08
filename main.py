

import argparse
import os
from simulation.network import build_network, network_summary, TOPOLOGY_SMALL_WORLD
from simulation.information import InfoItem
from simulation.engine import SimulationEngine
from simulation.agent import Agent


def parse_args():
    parser = argparse.ArgumentParser(
        description="INFLOW - Information Propagation Simulation"
    )
    parser.add_argument("--agents", type=int, default=50,
                        help="Number of agents in the network (default: 50)")
    parser.add_argument("--steps", type=int, default=15,
                        help="Number of simulation time steps (default: 15)")
    parser.add_argument("--topology", type=str, default=TOPOLOGY_SMALL_WORLD,
                        choices=["random", "small_world", "scale_free"],
                        help="Network topology (default: small_world)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for reproducibility (default: 42)")
    parser.add_argument("--reset", action="store_true",
                    help="Clear output directory before running")
    parser.add_argument("--share-prob", type=float, default=1.0,
                        help="Global sharing probability multiplier (default: 1.0)")
    parser.add_argument("--output-dir", type=str, default="output",
                        help="Directory for output CSV files (default: output/)")
    return parser.parse_args()


def main():
    args = parse_args()

    print("=" * 55)
    print("  INFLOW - Information Propagation Simulation")
    print("  Information Propagation Simulation")
    print("=" * 55)

   
    print(f"\nBuilding '{args.topology}' network with {args.agents} agents...")
    if args.reset:
        import shutil
        if os.path.exists(args.output_dir):
            shutil.rmtree(args.output_dir)
        print(f"Output directory '{args.output_dir}' cleared.\n")

    graph, agents = build_network(
        num_agents=args.agents,
        topology=args.topology,
        seed=args.seed
    )
    summary = network_summary(graph, args.topology)
    print(f"  Nodes: {summary['num_nodes']} | Edges: {summary['num_edges']} | "
          f"Avg degree: {summary['avg_degree']} | Connected: {summary['is_connected']}")

   
    # Inject a single high-emotion, low-truth item from a random origin node
    import random
    random.seed(args.seed)
    origin_true_id = random.choice(list(agents.keys()))
    origin_false_id = random.choice(list(agents.keys()))

    agents[origin_true_id].is_origin = True
    agents[origin_false_id].is_origin = False

    # True item - high truth, low emotion
    true_info = InfoItem(
        item_id=0,
        truth_value=0.9,
        emotional_intensity=0.2,
        complexity=0.5,
        origin_node=origin_true_id
    )

    # False item - low truth, high emotion (misinformation)
    false_info = InfoItem(
        item_id=1,
        truth_value=0.1,
        emotional_intensity=0.9,
        complexity=0.3,
        origin_node=origin_false_id
    )



   
    engine = SimulationEngine(
        graph=graph,
        agents=agents,
        seed=args.seed,
        share_probability=args.share_prob
    )
    engine.inject_information(true_info)
    engine.inject_information(false_info)
    engine.run(num_steps=args.steps)

   
    engine.save_outputs(output_dir=args.output_dir)

    print("\nDone. Check the output/ directory for results.")
    print("=" * 55)


if __name__ == "__main__":
    main()
