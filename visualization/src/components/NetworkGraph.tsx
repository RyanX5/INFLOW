import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { SimData, AgentTraits } from '../types';

interface SimNode extends AgentTraits {
  id: number;
  degree: number;
  x?: number; y?: number;
  vx?: number; vy?: number;
  fx?: number | null; fy?: number | null;
}

interface SimLink {
  source: number | SimNode;
  target: number | SimNode;
}

interface TooltipState {
  agent: SimNode;
  belief: number;
  received: number[];
  x: number;
  y: number;
}

// Color scheme
const NODE_COLORS = {
  none:   { fill: '#2d333b', stroke: '#444c56' },
  truth:  { fill: '#1158c7', stroke: '#2f81f7' },
  misinfo:{ fill: '#a4161a', stroke: '#cf222e' },
  both:   { fill: '#5a189a', stroke: '#9d4edd' },
};

function getColors(received: number[]) {
  const hasT = received.includes(0);
  const hasF = received.includes(1);
  if (hasT && hasF) return NODE_COLORS.both;
  if (hasT) return NODE_COLORS.truth;
  if (hasF) return NODE_COLORS.misinfo;
  return NODE_COLORS.none;
}

interface Props {
  simData: SimData | null;
  currentStep: number;
}

export default function NetworkGraph({ simData, currentStep }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeCirclesRef = useRef<d3.Selection<SVGCircleElement, SimNode, SVGGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const simDataRef = useRef(simData);
  const currentStepRef = useRef(currentStep);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Keep refs in sync
  useEffect(() => { simDataRef.current = simData; }, [simData]);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);

  // Build graph when simData changes
  useEffect(() => {
    if (simulationRef.current) simulationRef.current.stop();
    nodeCirclesRef.current = null;

    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    if (!simData || !containerRef.current) return;

    const { clientWidth: W, clientHeight: H } = containerRef.current;

    // Degree map for node sizing
    const degreeMap = new Map<number, number>();
    simData.edges.forEach(e => {
      degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
      degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
    });

    const nodes: SimNode[] = simData.agents.map(a => ({
      ...a,
      id: a.agent_id,
      degree: degreeMap.get(a.agent_id) ?? 1,
    }));

    const links: SimLink[] = simData.edges.map(e => ({ source: e.source, target: e.target }));

    const nodeRadius = (d: SimNode) => 4 + Math.sqrt(d.degree) * 1.8;

    // Initial colors from step 0
    const step0 = simData.steps[0];
    const initReceived = new Map(step0.nodes.map(n => [n.agent_id, n.received]));

    // Defs
    const defs = svg.append('defs');
    const glow = defs.append('filter').attr('id', 'glow');
    glow.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'blur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Background
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#161b22');

    // Links
    const linkG = svg.append('g');
    linkG.selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#30363d')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5);

    // Origin rings (permanent markers)
    const originG = svg.append('g');
    simData.info_items.forEach(item => {
      const node = nodes.find(n => n.id === item.origin_node);
      if (!node) return;
      const color = item.item_id === 0 ? '#2f81f7' : '#cf222e';
      originG.append('circle')
        .attr('class', `origin-ring-${item.origin_node}`)
        .attr('r', nodeRadius(node) + 7)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4 3')
        .attr('opacity', 0.7);
    });

    // Nodes
    const nodeG = svg.append('g');
    const nodeCircles = nodeG.selectAll<SVGCircleElement, SimNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('class', 'node')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => getColors(initReceived.get(d.agent_id) ?? []).fill)
      .attr('stroke', d => getColors(initReceived.get(d.agent_id) ?? []).stroke)
      .attr('stroke-width', 1.5)
      .attr('filter', 'url(#glow)')
      .style('cursor', 'pointer')
      .on('mousemove', (event: MouseEvent, d: SimNode) => {
        const sd = simDataRef.current;
        const cs = currentStepRef.current;
        if (!sd) return;
        const stepNode = sd.steps[cs].nodes.find(n => n.agent_id === d.agent_id);
        setTooltip({
          agent: d,
          belief: stepNode?.belief ?? d.initial_belief,
          received: stepNode?.received ?? [],
          x: event.clientX,
          y: event.clientY,
        });
      })
      .on('mouseleave', () => setTooltip(null));

    nodeCirclesRef.current = nodeCircles;

    // Force simulation - tick synchronously to get stable layout immediately
    const sim = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links).id(d => d.id).distance(35).strength(0.6))
      .force('charge', d3.forceManyBody<SimNode>().strength(d => -80 - d.degree * 8))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide<SimNode>().radius(d => nodeRadius(d) + 3))
      .stop();

    simulationRef.current = sim;

    // Run ticks synchronously for instant stable layout
    sim.tick(200);

    // Freeze all positions
    nodes.forEach(d => {
      d.fx = Math.max(20, Math.min(W - 20, d.x!));
      d.fy = Math.max(20, Math.min(H - 20, d.y!));
    });

    // Apply computed positions
    linkG.selectAll<SVGLineElement, SimLink>('line')
      .attr('x1', d => (d.source as SimNode).x!)
      .attr('y1', d => (d.source as SimNode).y!)
      .attr('x2', d => (d.target as SimNode).x!)
      .attr('y2', d => (d.target as SimNode).y!);

    nodeCircles
      .attr('cx', d => d.x!)
      .attr('cy', d => d.y!);

    // Position origin rings
    simData.info_items.forEach(item => {
      const node = nodes.find(n => n.id === item.origin_node);
      if (!node) return;
      originG.select(`.origin-ring-${item.origin_node}`)
        .attr('cx', node.x!)
        .attr('cy', node.y!);
    });

    // Dragging - updates fx/fy so node stays where you put it
    const drag = d3.drag<SVGCircleElement, SimNode>()
      .on('start', (_event, d) => {
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = Math.max(20, Math.min(W - 20, event.x));
        d.fy = Math.max(20, Math.min(H - 20, event.y));
        d3.select(event.sourceEvent.target as SVGCircleElement)
          .attr('cx', d.fx!)
          .attr('cy', d.fy!);
        // Update attached origin rings
        originG.select(`.origin-ring-${d.id}`)
          .attr('cx', d.fx!)
          .attr('cy', d.fy!);
        // Update connected links
        linkG.selectAll<SVGLineElement, SimLink>('line')
          .filter(l => (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id)
          .attr('x1', l => (l.source as SimNode).x!)
          .attr('y1', l => (l.source as SimNode).y!)
          .attr('x2', l => (l.target as SimNode).x!)
          .attr('y2', l => (l.target as SimNode).y!);
      })
      .on('end', (_event, d) => {
        d.x = d.fx!;
        d.y = d.fy!;
      });

    nodeCircles.call(drag as any);

  }, [simData]);

  // Update node colors when step changes
  useEffect(() => {
    if (!nodeCirclesRef.current || !simData) return;
    const stepData = simData.steps[currentStep];
    const receivedMap = new Map(stepData.nodes.map(n => [n.agent_id, n.received]));

    nodeCirclesRef.current
      .transition().duration(180).ease(d3.easeLinear)
      .attr('fill', d => getColors(receivedMap.get(d.agent_id) ?? []).fill)
      .attr('stroke', d => getColors(receivedMap.get(d.agent_id) ?? []).stroke);
  }, [currentStep, simData]);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <svg ref={svgRef} width="100%" height="100%" />

      {/* Empty state */}
      {!simData && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#444c56', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>&#9762;</div>
          <div style={{ fontSize: 13 }}>Configure and run a simulation</div>
        </div>
      )}

      {/* Legend */}
      {simData && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          display: 'flex', flexDirection: 'column', gap: 5,
          background: 'rgba(13,17,23,0.8)', borderRadius: 8,
          padding: '10px 12px', border: '1px solid #21262d',
          fontSize: 10, color: '#8b949e',
        }}>
          {[
            { color: NODE_COLORS.none.fill, stroke: NODE_COLORS.none.stroke, label: 'Uninformed' },
            { color: NODE_COLORS.truth.fill, stroke: NODE_COLORS.truth.stroke, label: 'Has truth' },
            { color: NODE_COLORS.misinfo.fill, stroke: NODE_COLORS.misinfo.stroke, label: 'Has misinfo' },
            { color: NODE_COLORS.both.fill, stroke: NODE_COLORS.both.stroke, label: 'Has both' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="10" height="10">
                <circle cx="5" cy="5" r="4" fill={item.color} stroke={item.stroke} strokeWidth="1.5" />
              </svg>
              <span>{item.label}</span>
            </div>
          ))}
          <div style={{ marginTop: 3, paddingTop: 5, borderTop: '1px solid #21262d', display: 'flex', gap: 7, alignItems: 'center' }}>
            <svg width="10" height="10">
              <circle cx="5" cy="5" r="4" fill="none" stroke="#2f81f7" strokeWidth="1.5" strokeDasharray="2 1.5" />
            </svg>
            <span>Origin (truth)</span>
          </div>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <svg width="10" height="10">
              <circle cx="5" cy="5" r="4" fill="none" stroke="#cf222e" strokeWidth="1.5" strokeDasharray="2 1.5" />
            </svg>
            <span>Origin (misinfo)</span>
          </div>
          <div style={{ marginTop: 3, paddingTop: 5, borderTop: '1px solid #21262d', color: '#6e7681' }}>
            Node size = degree
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 14,
          top: tooltip.y - 10,
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 11,
          lineHeight: 1.9,
          pointerEvents: 'none',
          zIndex: 100,
          minWidth: 160,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontWeight: 600, color: '#e6edf3', marginBottom: 4, fontSize: 12 }}>
            Agent {tooltip.agent.agent_id}
          </div>
          {[
            ['belief', tooltip.belief.toFixed(3), (() => {
              const c = getColors(tooltip.received);
              return c.stroke;
            })()],
            ['bias', tooltip.agent.bias.toFixed(3), '#8b949e'],
            ['skepticism', tooltip.agent.skepticism.toFixed(3), '#8b949e'],
            ['trust', tooltip.agent.trust_radius.toFixed(3), '#8b949e'],
            ['degree', String(tooltip.agent.degree), '#8b949e'],
          ].map(([k, v, c]) => (
            <div key={k} style={{ color: '#6e7681' }}>
              {k.padEnd(10, '\u00A0')}
              <span style={{ color: c as string }}>{v}</span>
            </div>
          ))}
          {tooltip.received.length > 0 && (
            <div style={{ marginTop: 4, fontSize: 10, color: '#6e7681' }}>
              received: {tooltip.received.map(id => id === 0 ? 'truth' : 'misinfo').join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
