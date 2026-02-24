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
                 share_probability: float = 0.3):
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
                    # Uniform random share decision (Report 1 placeholder)
                    if random.random() < self.share_probability:
                        neighbor.receive_information(item)
                        agent.shared_info.append(item.item_id)
                        item.spread_count += 1

    def _log_step(self):
        """
        Record spread metrics for this step to the spread log.
        """
        for item in self.info_items:
            self.spread_log.append({
                "step": self.step,
                "item_id": item.item_id,
                "spread_count": item.spread_count,
                "total_agents": len(self.agents),
                "spread_fraction": round(item.spread_count / len(self.agents), 4),
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
