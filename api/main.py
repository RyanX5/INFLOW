import os
import random
import sys

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from simulation.engine import SimulationEngine
from simulation.information import InfoItem
from simulation.network import build_network

app = FastAPI(title="INFLOW API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class SimConfig(BaseModel):
    topology: str = "small_world"
    num_agents: int = Field(default=100, ge=20, le=200)
    steps: int = Field(default=15, ge=5, le=30)
    seed: int = Field(default=42, ge=0, le=99999)
    truth_emotion: float = Field(default=0.2, ge=0.0, le=1.0)
    misinfo_emotion: float = Field(default=0.9, ge=0.0, le=1.0)


VALID_TOPOLOGIES = {"random", "small_world", "scale_free"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/simulate")
def simulate(config: SimConfig):
    if config.topology not in VALID_TOPOLOGIES:
        raise HTTPException(status_code=400, detail=f"Invalid topology: {config.topology}")

    random.seed(config.seed)
    graph, agents = build_network(
        num_agents=config.num_agents,
        topology=config.topology,
        seed=config.seed,
    )

    # Capture initial traits before injection modifies beliefs
    agent_traits = [
        {
            "agent_id": a.agent_id,
            "initial_belief": round(a.belief, 4),
            "bias": round(a.bias, 4),
            "trust_radius": round(a.trust_radius, 4),
            "skepticism": round(a.skepticism, 4),
        }
        for a in agents.values()
    ]

    origin_true = random.choice(list(agents.keys()))
    origin_false = random.choice(list(agents.keys()))

    item_true = InfoItem(
        item_id=0,
        truth_value=0.9,
        emotional_intensity=config.truth_emotion,
        complexity=0.5,
        origin_node=origin_true,
    )
    item_false = InfoItem(
        item_id=1,
        truth_value=0.1,
        emotional_intensity=config.misinfo_emotion,
        complexity=0.3,
        origin_node=origin_false,
    )

    engine = SimulationEngine(graph, agents, seed=config.seed)
    engine.inject_information(item_true)
    engine.inject_information(item_false)

    history = engine.run_with_history(config.steps)

    return {
        "edges": [{"source": int(u), "target": int(v)} for u, v in graph.edges()],
        "agents": agent_traits,
        "info_items": [
            {
                "item_id": 0,
                "label": "truth",
                "truth_value": 0.9,
                "emotional_intensity": config.truth_emotion,
                "origin_node": int(origin_true),
            },
            {
                "item_id": 1,
                "label": "misinfo",
                "truth_value": 0.1,
                "emotional_intensity": config.misinfo_emotion,
                "origin_node": int(origin_false),
            },
        ],
        "steps": history,
        "config": config.model_dump(),
    }
