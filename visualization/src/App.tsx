import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Papa from "papaparse";

const WIDTH = 900;
const HEIGHT = 600;

interface AgentRow {
  agent_id: number;
  belief: number;
  bias: number;
  trust_radius: number;
  skepticism: number;
  received_count: number;
  shared_count: number;
  is_origin: string | null | boolean;
}

interface EdgeRow {
  source: number;
  target: number;
}

interface SimNode extends AgentRow {
  id: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink {
  source: number | SimNode;
  target: number | SimNode;
}

function parseCSV<T>(text: string): T[] {
  return Papa.parse<T>(text, { header: true, dynamicTyping: true }).data.filter(
    (r) => r && Object.keys(r as object).length > 1,
  );
}

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [edges, setEdges] = useState<EdgeRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hoveredAgent, setHoveredAgent] = useState<SimNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const ORIGIN_MAP = new Map(
    agents
      .filter((n) => n.is_origin !== null && n.is_origin !== undefined)
      .map((n) => [n.agent_id, n.is_origin === true || n.is_origin === "True"]),
  );

  useEffect(() => {
    Promise.all([
      fetch("/agent_states.csv").then((r) => r.text()),
      fetch("/edges.csv").then((r) => r.text()),
    ]).then(([agentText, edgeText]) => {
      setAgents(parseCSV<AgentRow>(agentText));
      setEdges(parseCSV<EdgeRow>(edgeText));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded || agents.length === 0 || edges.length === 0) return;

    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    // Belief color: red (0) → amber (0.5) → green (1)
    const beliefColor = d3
      .scaleSequential()
      .domain([0, 1])
      .interpolator(d3.interpolateRgbBasis(["#e03131", "#f08c00", "#2f9e44"]));

    const nodes: SimNode[] = agents.map((a) => ({ ...a, id: a.agent_id }));
    const links: SimLink[] = edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    // Defs
    const defs = svg.append("defs");

    // Glow filter
    const glowFilter = defs.append("filter").attr("id", "glow");
    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Background gradient
    const bgGrad = defs
      .append("radialGradient")
      .attr("id", "bgGrad")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "70%");
    bgGrad.append("stop").attr("offset", "0%").attr("stop-color", "#161b22");
    bgGrad.append("stop").attr("offset", "100%").attr("stop-color", "#0d1117");

    // Background rect
    svg
      .append("rect")
      .attr("width", WIDTH)
      .attr("height", HEIGHT)
      .attr("fill", "url(#bgGrad)");

    // Grid lines (subtle)
    const gridGroup = svg.append("g").attr("opacity", 0.04);
    for (let x = 0; x <= WIDTH; x += 50) {
      gridGroup
        .append("line")
        .attr("x1", x)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", HEIGHT)
        .attr("stroke", "#58a6ff")
        .attr("stroke-width", 0.5);
    }
    for (let y = 0; y <= HEIGHT; y += 50) {
      gridGroup
        .append("line")
        .attr("x1", 0)
        .attr("y1", y)
        .attr("x2", WIDTH)
        .attr("y2", y)
        .attr("stroke", "#58a6ff")
        .attr("stroke-width", 0.5);
    }

    // Link group
    const linkGroup = svg.append("g");
    const linkSel = linkGroup
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#30363d")
      .attr("stroke-width", 1)
      .attr("opacity", 0.6);

    // Node group
    const nodeGroup = svg.append("g");
    const nodeSel = nodeGroup
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => 5 + d.shared_count * 1.5)
      .attr("fill", (d) => beliefColor(d.belief))
      .attr("stroke", (d) =>
        d3.color(beliefColor(d.belief))!.brighter(0.8).toString(),
      )
      .attr("stroke-width", 1.5)
      .attr("filter", "url(#glow)")
      .style("cursor", "pointer")
      .on("mousemove", (event: MouseEvent, d: SimNode) => {
        setHoveredAgent(d);
        setMousePos({ x: event.clientX, y: event.clientY });
      })
      .on("mouseleave", () => setHoveredAgent(null));

    const originRingSel = nodeGroup
      .selectAll<SVGCircleElement, SimNode>("circle.origin-ring")
      .data(nodes.filter((d) => ORIGIN_MAP.has(d.id)))
      .join("circle")
      .attr("class", "origin-ring")
      .attr("r", (d) => 5 + d.shared_count * 1.5 + 6)
      .attr("fill", "none")
      .attr("stroke", (d) =>
        ORIGIN_MAP.get(d.id) === true ? "#2f9e44" : "#e03131",
      )
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 2")
      .attr("opacity", 0.8);

    // Force simulation
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(40)
          .strength(0.5),
      )
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("collision", d3.forceCollide().radius(12));

    simulation.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as SimNode).x!)
        .attr("y1", (d) => (d.source as SimNode).y!)
        .attr("x2", (d) => (d.target as SimNode).x!)
        .attr("y2", (d) => (d.target as SimNode).y!);

      nodeSel
        .attr("cx", (d) => Math.max(10, Math.min(WIDTH - 10, d.x!)))
        .attr("cy", (d) => Math.max(10, Math.min(HEIGHT - 10, d.y!)));

      originRingSel.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
    });

    // Drag behavior
    const drag = d3
      .drag<SVGCircleElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeSel.call(drag);

    return () => {
      simulation.stop();
    };
  }, [loaded, agents, edges]);

  // Belief color for legend/tooltip (pure JS version)
  const beliefToColor = (v: number) => {
    if (v < 0.5) {
      const t = v * 2;
      const r = Math.round(224 + (240 - 224) * t);
      const g = Math.round(49 + (140 - 49) * t);
      const b = Math.round(49 + (0 - 49) * t);
      return `rgb(${r},${g},${b})`;
    } else {
      const t = (v - 0.5) * 2;
      const r = Math.round(240 + (47 - 240) * t);
      const g = Math.round(140 + (158 - 140) * t);
      const b = Math.round(0 + (68 - 0) * t);
      return `rgb(${r},${g},${b})`;
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'IBM Plex Mono', monospace",
        color: "#c9d1d9",
        padding: "32px 16px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "#58a6ff",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          INFLOW — Information Propagation Simulation
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            margin: 0,
            color: "#e6edf3",
            letterSpacing: "-0.02em",
          }}
        >
          Network Belief State
        </h1>
        <p style={{ fontSize: 12, color: "#8b949e", margin: "6px 0 0" }}>
          Node size → shares sent &nbsp;|&nbsp; Node color → final belief value
        </p>
      </div>

      {/* SVG */}
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #21262d",
          boxShadow: "0 0 40px rgba(88,166,255,0.05)",
          position: "relative",
        }}
      >
        <svg ref={svgRef} width={WIDTH} height={HEIGHT} />

        {/* Tooltip */}
        {hoveredAgent && (
          <div
            style={{
              position: "fixed",
              left: mousePos.x + 14,
              top: mousePos.y - 10,
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 11,
              lineHeight: 1.8,
              pointerEvents: "none",
              zIndex: 100,
              minWidth: 160,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: beliefToColor(hoveredAgent.belief),
                marginBottom: 4,
                fontSize: 12,
              }}
            >
              Agent {hoveredAgent.agent_id}
            </div>
            <div style={{ color: "#8b949e" }}>
              belief&nbsp;&nbsp;&nbsp;&nbsp;
              <span style={{ color: beliefToColor(hoveredAgent.belief) }}>
                {hoveredAgent.belief.toFixed(3)}
              </span>
            </div>
            <div style={{ color: "#8b949e" }}>
              bias&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span style={{ color: "#c9d1d9" }}>
                {hoveredAgent.bias.toFixed(3)}
              </span>
            </div>
            <div style={{ color: "#8b949e" }}>
              skepticism&nbsp;
              <span style={{ color: "#c9d1d9" }}>
                {hoveredAgent.skepticism.toFixed(3)}
              </span>
            </div>
            <div style={{ color: "#8b949e" }}>
              trust&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span style={{ color: "#c9d1d9" }}>
                {hoveredAgent.trust_radius.toFixed(3)}
              </span>
            </div>
            <div style={{ color: "#8b949e" }}>
              shared&nbsp;&nbsp;&nbsp;&nbsp;
              <span style={{ color: "#c9d1d9" }}>
                {hoveredAgent.shared_count}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 11,
          color: "#8b949e",
        }}
      >
        <span>Low belief</span>
        <div
          style={{
            width: 160,
            height: 8,
            borderRadius: 4,
            background: "linear-gradient(to right, #e03131, #f08c00, #2f9e44)",
          }}
        />
        <span>High belief</span>
      </div>

      {/* Stats bar */}
      {loaded && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 32,
            fontSize: 11,
            color: "#8b949e",
            borderTop: "1px solid #21262d",
            paddingTop: 16,
          }}
        >
          <span>
            <span style={{ color: "#58a6ff" }}>{agents.length}</span> agents
          </span>
          <span>
            <span style={{ color: "#58a6ff" }}>{edges.length}</span> connections
          </span>
          <span>
            avg belief&nbsp;
            <span style={{ color: "#58a6ff" }}>
              {(
                agents.reduce((s, a) => s + a.belief, 0) / agents.length
              ).toFixed(3)}
            </span>
          </span>
          <span>
            polarization&nbsp;
            <span style={{ color: "#58a6ff" }}>
              {Math.sqrt(
                agents.reduce((s, a) => {
                  const mean =
                    agents.reduce((ss, aa) => ss + aa.belief, 0) /
                    agents.length;
                  return s + Math.pow(a.belief - mean, 2);
                }, 0) / agents.length,
              ).toFixed(3)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
