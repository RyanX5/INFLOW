export interface Edge {
  source: number;
  target: number;
}

export interface AgentTraits {
  agent_id: number;
  initial_belief: number;
  bias: number;
  trust_radius: number;
  skepticism: number;
}

export interface InfoItemMeta {
  item_id: number;
  label: 'truth' | 'misinfo';
  truth_value: number;
  emotional_intensity: number;
  origin_node: number;
}

export interface StepNodeState {
  agent_id: number;
  belief: number;
  received: number[];
}

export interface StepStats {
  item_id: number;
  spread_count: number;
  spread_fraction: number;
}

export interface SimStep {
  step: number;
  nodes: StepNodeState[];
  stats: StepStats[];
}

export interface SimData {
  edges: Edge[];
  agents: AgentTraits[];
  info_items: InfoItemMeta[];
  steps: SimStep[];
  config: {
    topology: string;
    num_agents: number;
    steps: number;
    seed: number;
    truth_emotion: number;
    misinfo_emotion: number;
  };
}

export interface SimConfig {
  topology: string;
  num_agents: number;
  steps: number;
  seed: number;
  truth_emotion: number;
  misinfo_emotion: number;
}
