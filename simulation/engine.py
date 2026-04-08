import csv
import os
import random
from simulation.agent import Agent
from simulation.information import InfoItem
from simulation.network import get_neighbors


class SimulationEngine:
    """
    Manages the INFLOW simulation: network state, information propagation,
    time-step execution, and output logging.

    """

    def __init__(self, graph, agents: dict, seed: int = 42,
                 share_probability: float = 1.0):
        """
        Initialize the simulation engine.

        """
        self.graph = graph
        self.agents = agents
        self.info_items = []
        self.step = 0
        self.spread_log = []
        self.share_probability = share_probability
        self.seed = seed
        random.seed(seed)

    def inject_information(self, info_item: InfoItem):
        """
        Inject an information item into the network at its origin node.

        The origin agent immediately receives the item, beginning potential spread.

        """
        self.info_items.append(info_item)
        origin_agent = self.agents[info_item.origin_node]
        origin_agent.receive_information(info_item)
        info_item.spread_count = 1
        print(f"  [Step {self.step}] Injected {info_item} at agent {info_item.origin_node}")

    def run(self, num_steps: int):
        """
        Execute the simulation for a given number of time steps.

        """
        print(f"\nStarting simulation: {num_steps} steps, "
              f"{len(self.agents)} agents, {len(self.info_items)} info item(s)\n")

        for _ in range(num_steps):
            self.step += 1
            self._step()
            self._log_step()
            self._print_step_summary()

        print(f"\nSimulation complete after {self.step} steps.")

    def _step(self):
        """
        Execute one simulation time step.

        """
        for item in self.info_items:
            # Collect agents that currently have this item
            holders = [
                agent for agent in self.agents.values()
                if item.item_id in agent.received_info
            ]

            for agent in holders:
                neighbors = get_neighbors(self.graph, agent.agent_id)
                for neighbor_id in neighbors:
                    neighbor = self.agents[neighbor_id]
                    # Skip if neighbor already received this item
                    if item.item_id in neighbor.received_info:
                        continue
                    # Share decision based on agent personality and props
                    p = self._sharing_probability(agent, neighbor, item)
                    if random.random() < p:
                        neighbor.receive_information(item)
                        agent.shared_info.append(item.item_id)
                        item.spread_count += 1

    def _sharing_probability(self, agent, neighbor, item):
        """
        Compute sharing probability based on agent personality and item properties.
        
        """
        # Belief alignment: 1.0 = perfectly aligned, 0.0 = opposite
        alignment = 1.0 - abs(agent.belief - item.truth_value)

        # Weighted combination; complexity dampens sharing (complex info is harder to pass on)
        prob = (
            0.4 * item.emotional_intensity +
            0.3 * alignment +
            0.3 * agent.trust_radius
        ) * (1.0 - 0.5 * item.complexity) * self.share_probability

        return max(0.0, min(1.0, prob))

    def _log_step(self):
        """
        Record spread metrics and belief distribution for this step.
        """
        for item in self.info_items:
            # Get beliefs of all agents who have received this item
            holders = [
                agent for agent in self.agents.values()
                if item.item_id in agent.received_info
            ]
            beliefs = [a.belief for a in holders] if holders else [0.0]
            
            self.spread_log.append({
                "step": self.step,
                "item_id": item.item_id,
                "spread_count": item.spread_count,
                "total_agents": len(self.agents),
                "spread_fraction": round(item.spread_count / len(self.agents), 4),
                "avg_belief": round(sum(beliefs) / len(beliefs), 4),
                "min_belief": round(min(beliefs), 4),
                "max_belief": round(max(beliefs), 4),
            })

    def _print_step_summary(self):
        """
        Print a one-line summary of current spread status to stdout.
        """
        for item in self.info_items:
            frac = item.spread_count / len(self.agents)
            print(f"  Step {self.step:>3} | Item {item.item_id} | "
                  f"Reached {item.spread_count}/{len(self.agents)} agents "
                  f"({frac:.1%})")

    def save_outputs(self, output_dir: str = "output"):
        """
        Write simulation results to CSV files in the output directory.

        """
        os.makedirs(output_dir, exist_ok=True)

        
        spread_path = os.path.join(output_dir, "spread_log.csv")
        if self.spread_log:
            with open(spread_path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=self.spread_log[0].keys())
                writer.writeheader()
                writer.writerows(self.spread_log)
            print(f"\nSaved: {spread_path}")

    
        agent_path = os.path.join(output_dir, "agent_states.csv")
        agent_rows = [a.to_dict() for a in self.agents.values()]
        if agent_rows:
            with open(agent_path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=agent_rows[0].keys())
                writer.writeheader()
                writer.writerows(agent_rows)
            print(f"Saved: {agent_path}")

       
        info_path = os.path.join(output_dir, "info_items.csv")
        info_rows = [item.to_dict() for item in self.info_items]
        if info_rows:
            with open(info_path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=info_rows[0].keys())
                writer.writeheader()
                writer.writerows(info_rows)
            print(f"Saved: {info_path}")
        
        # Save edge list
        edges_path = os.path.join(output_dir, "edges.csv")
        edge_rows = [{"source": u, "target": v} for u, v in self.graph.edges()]
        if edge_rows:
            with open(edges_path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=["source", "target"])
                writer.writeheader()
                writer.writerows(edge_rows)
            print(f"Saved: {edges_path}")

        viz_public = os.path.join("visualization", "public")
        if os.path.exists(viz_public):
            import shutil
            for filename in ["spread_log.csv", "agent_states.csv", "info_items.csv", "edges.csv"]:
                src = os.path.join(output_dir, filename)
                if os.path.exists(src):
                    shutil.copy(src, os.path.join(viz_public, filename))
            print(f"Copied outputs to {viz_public}")
