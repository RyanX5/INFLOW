
import networkx as nx
from simulation.agent import Agent


# Supported topology options
TOPOLOGY_RANDOM = "random"
TOPOLOGY_SMALL_WORLD = "small_world"
TOPOLOGY_SCALE_FREE = "scale_free"


def build_network(num_agents: int, topology: str = TOPOLOGY_SMALL_WORLD,
                  seed: int = 42, **kwargs) -> tuple[nx.Graph, dict]:
    """
    Construct a social network and populate nodes with Agent instances.

    """
    graph = _build_graph(num_agents, topology, seed, **kwargs)
    agents = _populate_agents(graph, seed)
    return graph, agents


def _build_graph(num_agents: int, topology: str, seed: int, **kwargs) -> nx.Graph:
    """
    Build the raw NetworkX graph for the given topology.

    """
    if topology == TOPOLOGY_RANDOM:
        p = kwargs.get("p", 0.1)
        graph = nx.erdos_renyi_graph(n=num_agents, p=p, seed=seed)

    elif topology == TOPOLOGY_SMALL_WORLD:
        k = kwargs.get("k", 4)
        p = kwargs.get("p", 0.1)
        graph = nx.watts_strogatz_graph(n=num_agents, k=k, p=p, seed=seed)

    elif topology == TOPOLOGY_SCALE_FREE:
        m = kwargs.get("m", 2)
        graph = nx.barabasi_albert_graph(n=num_agents, m=m, seed=seed)

    else:
        raise ValueError(f"Unknown topology '{topology}'. "
                         f"Choose from: {TOPOLOGY_RANDOM}, {TOPOLOGY_SMALL_WORLD}, {TOPOLOGY_SCALE_FREE}")

    return graph


def _populate_agents(graph: nx.Graph, seed: int) -> dict:
    """
    Create Agent instances and attach them to graph nodes.

    """
    import random
    random.seed(seed)

    agents = {}
    for node_id in graph.nodes():
        agent = Agent(agent_id=node_id)
        agents[node_id] = agent
        # Store a reference on the node for easy graph traversal
        graph.nodes[node_id]["agent"] = agent

    return agents


def get_neighbors(graph: nx.Graph, agent_id: int) -> list:
    """
    Return the list of neighbor agent IDs for a given agent.

    """
    return list(graph.neighbors(agent_id))


def network_summary(graph: nx.Graph, topology: str) -> dict:
    """
    Compute basic structural statistics for the network.

    """
    return {
        "topology": topology,
        "num_nodes": graph.number_of_nodes(),
        "num_edges": graph.number_of_edges(),
        "avg_degree": round(sum(d for _, d in graph.degree()) / graph.number_of_nodes(), 4),
        "is_connected": nx.is_connected(graph),
    }
