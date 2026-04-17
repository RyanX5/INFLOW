import type { SimConfig } from '../types';

interface Props {
  config: SimConfig;
  onChange: (config: SimConfig) => void;
  onRun: () => void;
  isLoading: boolean;
}

function Slider({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#8b949e', fontSize: 11 }}>
        <span>{label}</span>
        <span style={{ color: '#58a6ff' }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export default function ConfigPanel({ config, onChange, onRun, isLoading }: Props) {
  const set = (k: keyof SimConfig, v: number | string) =>
    onChange({ ...config, [k]: v });

  return (
    <div style={{
      width: 230,
      flexShrink: 0,
      background: '#161b22',
      borderRight: '1px solid #21262d',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid #21262d' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#58a6ff', textTransform: 'uppercase', marginBottom: 4 }}>
          Information Propagation
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#e6edf3', letterSpacing: '-0.02em' }}>
          INFLOW
        </div>
      </div>

      {/* Config form */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>

        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#8b949e', textTransform: 'uppercase', marginBottom: 10 }}>
          Network
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>Topology</div>
          <select value={config.topology} onChange={e => set('topology', e.target.value)}>
            <option value="small_world">Small World</option>
            <option value="scale_free">Scale Free</option>
            <option value="random">Random (ER)</option>
          </select>
        </div>

        <Slider label="Agents" value={config.num_agents} min={20} max={200} step={10}
          format={v => String(v)} onChange={v => set('num_agents', v)} />

        <Slider label="Steps" value={config.steps} min={5} max={30} step={1}
          format={v => String(v)} onChange={v => set('steps', v)} />

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>Seed</div>
          <input
            type="number" min={0} max={99999} value={config.seed}
            onChange={e => set('seed', Number(e.target.value))}
            style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 6,
              padding: '6px 8px', color: '#e6edf3', fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12, width: '100%', outline: 'none',
            }}
          />
        </div>

        <div style={{ height: 1, background: '#21262d', margin: '16px 0' }} />

        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: '#8b949e', textTransform: 'uppercase', marginBottom: 10 }}>
          Content
        </div>

        <div style={{ marginBottom: 4, fontSize: 10, color: '#2f81f7', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Truth item
        </div>
        <Slider label="Emotional intensity" value={config.truth_emotion} min={0} max={1} step={0.05}
          format={v => v.toFixed(2)} onChange={v => set('truth_emotion', v)} />

        <div style={{ marginBottom: 4, fontSize: 10, color: '#cf222e', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 8 }}>
          Misinfo item
        </div>
        <Slider label="Emotional intensity" value={config.misinfo_emotion} min={0} max={1} step={0.05}
          format={v => v.toFixed(2)} onChange={v => set('misinfo_emotion', v)} />
      </div>

      {/* Run button */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid #21262d' }}>
        <button
          onClick={onRun}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px',
            background: isLoading ? '#21262d' : '#1f6feb',
            color: isLoading ? '#8b949e' : '#ffffff',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.05em',
            transition: 'background 0.15s',
          }}
        >
          {isLoading ? 'Running...' : 'Run Simulation'}
        </button>
      </div>
    </div>
  );
}
