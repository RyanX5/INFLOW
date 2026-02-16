

class InfoItem:
    """
    Represents a single piece of information in the simulation.

    Information items are injected into the network at a specific node
    and spread through agent interactions over time steps.

    """

    def __init__(self, item_id: int, truth_value: float, emotional_intensity: float,
                 complexity: float, origin_node: int):
        """
        Initialize an information item.

        """
        self.item_id = item_id
        self.truth_value = truth_value
        self.emotional_intensity = emotional_intensity
        self.complexity = complexity
        self.origin_node = origin_node
        self.spread_count = 0

    def to_dict(self) -> dict:
        """
        Serialize item state to a dictionary for output logging.

        """
        return {
            "item_id": self.item_id,
            "truth_value": round(self.truth_value, 4),
            "emotional_intensity": round(self.emotional_intensity, 4),
            "complexity": round(self.complexity, 4),
            "origin_node": self.origin_node,
            "spread_count": self.spread_count,
        }

    def __repr__(self) -> str:
        return (f"InfoItem(id={self.item_id}, truth={self.truth_value:.2f}, "
                f"emotion={self.emotional_intensity:.2f}, origin={self.origin_node})")
