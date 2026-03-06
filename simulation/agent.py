

import random


class Agent:
    """
    Represents a single agent in the social network simulation.

    """

    def __init__(self, agent_id: int, belief: float = None, bias: float = None,
                 trust_radius: float = None, skepticism: float = None):
        """
        Initialize an agent with given or randomly generated parameters.

        """
        self.agent_id = agent_id
        self.belief = belief if belief is not None else random.uniform(0.0, 1.0)
        self.bias = bias if bias is not None else random.uniform(0.0, 1.0)
        self.trust_radius = trust_radius if trust_radius is not None else random.uniform(0.0, 1.0)
        self.skepticism = skepticism if skepticism is not None else random.uniform(0.0, 1.0)

        self.received_info = []   # list of InfoItem ids received
        self.shared_info = []     # list of InfoItem ids shared onward

    def receive_information(self, info_item):
        if info_item.item_id not in self.received_info:
            self.received_info.append(info_item.item_id)
            
            # Belief update based on skepticism and bias
            delta = (info_item.truth_value - self.belief) / (1 + self.skepticism)
            delta *= (1 - self.bias)
            self.belief = max(0.0, min(1.0, self.belief + delta))

    def to_dict(self) -> dict:
        """
        Serialize agent state to a dictionary for output logging.

        Returns:
            dict: Agent attributes as key-value pairs.
        """
        return {
            "agent_id": self.agent_id,
            "belief": round(self.belief, 4),
            "bias": round(self.bias, 4),
            "trust_radius": round(self.trust_radius, 4),
            "skepticism": round(self.skepticism, 4),
            "received_count": len(self.received_info),
            "shared_count": len(self.shared_info),
        }

    def __repr__(self) -> str:
        return (f"Agent(id={self.agent_id}, belief={self.belief:.3f}, "
                f"bias={self.bias:.3f}, skepticism={self.skepticism:.3f})")
