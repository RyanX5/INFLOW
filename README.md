# INFLOW

Simulation of how information (and misinformation) spreads through a social network. Each agent has parameters like belief, bias, and skepticism that will affect how they evaluate and share information.

This is for my CSCI 412 senior seminar project.

## How to run

Install dependencies first:

```
pip install -r requirements.txt
```

Then just run:

```
python main.py
```

You can also pass some options:

```
python main.py --agents 100 --steps 20 --topology small_world
```

## Project structure

```
simulation/     core simulation code (agents, network, engine)
output/         CSV files generated after a run
main.py         entry point
```

## Output

Running the simulation creates a few CSV files in output/:

- spread_log.csv - how far the info item spread each step
- agent_states.csv - snapshot of each agent at the end
- info_items.csv - final state of the injected info item

## Notes

Belief update logic and trust-weighted sharing aren't implemented yet, coming in the next report. Right now sharing is random with a fixed probability.
