import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { SimData } from '../types';

interface Props {
  simData: SimData | null;
  currentStep: number;
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
      <span style={{ color: '#8b949e' }}>{label}</span>
      <span style={{ color: color ?? '#e6edf3' }}>{value}</span>
    </div>
  );
}

const customTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: '#8b949e', marginBottom: 4 }}>Step {label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {(p.value * 100).toFixed(1)}%
        </div>
      ))}
    </div>
  );
};

export default function StatsPanel({ simData, currentStep }: Props) {
  if (!simData) {
    return (
      <div style={{
        width: 260,
        flexShrink: 0,
        background: '#161b22',
        borderLeft: '1px solid #21262d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{ textAlign: 'center', color: '#444c56' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#128202;</div>
          <div style={{ fontSize: 11 }}>Run a simulation<br />to see stats</div>
        </div>
      </div>
    );
  }

  const chartData = simData.steps.map(s => ({
    step: s.step,
    truth: s.stats.find(x => x.item_id === 0)?.spread_fraction ?? 0,
    misinfo: s.stats.find(x => x.item_id === 1)?.spread_fraction ?? 0,
  }));

  const stepData = simData.steps[currentStep];
  const truthStats = stepData.stats.find(x => x.item_id === 0);
  const misinfoStats = stepData.stats.find(x => x.item_id === 1);

  const totalInformed = new Set(
    stepData.nodes.flatMap(n => n.received.length > 0 ? [n.agent_id] : [])
  ).size;

  const avgBelief = stepData.nodes.reduce((s, n) => s + n.belief, 0) / stepData.nodes.length;

  const polarization = Math.sqrt(
    stepData.nodes.reduce((s, n) => {
      return s + Math.pow(n.belief - avgBelief, 2);
    }, 0) / stepData.nodes.length
  );

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      background: '#161b22',
      borderLeft: '1px solid #21262d',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Section: Spread chart */}
      <div style={{ padding: '16px 16px 0', borderBottom: '1px solid #21262d', paddingBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#8b949e', textTransform: 'uppercase', marginBottom: 12 }}>
          Spread over time
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis dataKey="step" tick={{ fontSize: 9, fill: '#6e7681' }} tickLine={false} axisLine={false} />
            <YAxis
              domain={[0, 1]}
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 9, fill: '#6e7681' }}
              tickLine={false}
              axisLine={false}
            />
            <RechartTooltip content={customTooltip} />
            <ReferenceLine x={currentStep} stroke="#444c56" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="truth" stroke="#2f81f7" strokeWidth={2} dot={false} name="truth" />
            <Line type="monotone" dataKey="misinfo" stroke="#cf222e" strokeWidth={2} dot={false} name="misinfo" />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10, color: '#8b949e' }}>
          <span><span style={{ color: '#2f81f7' }}>&#9646;</span> Truth</span>
          <span><span style={{ color: '#cf222e' }}>&#9646;</span> Misinfo</span>
        </div>
      </div>

      {/* Section: Current step */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #21262d' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#8b949e', textTransform: 'uppercase', marginBottom: 12 }}>
          Step {currentStep}
        </div>
        <StatRow label="Truth reach" value={`${((truthStats?.spread_fraction ?? 0) * 100).toFixed(1)}%`} color="#2f81f7" />
        <StatRow label="Misinfo reach" value={`${((misinfoStats?.spread_fraction ?? 0) * 100).toFixed(1)}%`} color="#cf222e" />
        <StatRow label="Any info" value={`${totalInformed} / ${simData.config.num_agents}`} />
        <StatRow label="Avg belief" value={avgBelief.toFixed(3)} />
        <StatRow label="Polarization" value={polarization.toFixed(3)} />
      </div>

      {/* Section: Network info */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#8b949e', textTransform: 'uppercase', marginBottom: 12 }}>
          Network
        </div>
        <StatRow label="Topology" value={simData.config.topology.replace('_', ' ')} />
        <StatRow label="Agents" value={String(simData.config.num_agents)} />
        <StatRow label="Edges" value={String(simData.edges.length)} />
        <StatRow label="Seed" value={String(simData.config.seed)} />
        <StatRow label="Truth emotion" value={simData.config.truth_emotion.toFixed(2)} color="#2f81f7" />
        <StatRow label="Misinfo emotion" value={simData.config.misinfo_emotion.toFixed(2)} color="#cf222e" />
      </div>
    </div>
  );
}
