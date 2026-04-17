interface Props {
  currentStep: number;
  maxStep: number;
  isPlaying: boolean;
  speed: number;
  disabled: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (step: number) => void;
  onSpeedChange: (speed: number) => void;
}

const SPEEDS = [
  { label: '0.5x', ms: 800 },
  { label: '1x', ms: 400 },
  { label: '2x', ms: 200 },
  { label: '4x', ms: 80 },
];

const iconBtn = (disabled: boolean): React.CSSProperties => ({
  background: 'none',
  color: disabled ? '#444c56' : '#8b949e',
  fontSize: 16,
  padding: '4px 8px',
  borderRadius: 4,
  cursor: disabled ? 'default' : 'pointer',
  lineHeight: 1,
  transition: 'color 0.1s',
});

export default function PlayerControls({
  currentStep, maxStep, isPlaying, speed, disabled,
  onPlay, onPause, onSeek, onSpeedChange,
}: Props) {
  const pct = maxStep > 0 ? (currentStep / maxStep) * 100 : 0;

  return (
    <div style={{
      height: 68,
      flexShrink: 0,
      background: '#161b22',
      borderTop: '1px solid #21262d',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
    }}>
      {/* Step back */}
      <button
        style={iconBtn(disabled || currentStep === 0)}
        disabled={disabled || currentStep === 0}
        onClick={() => onSeek(currentStep - 1)}
        title="Step back"
      >
        &#9664;
      </button>

      {/* Play / Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={disabled || currentStep === maxStep}
        style={{
          background: disabled ? '#21262d' : '#1f6feb',
          color: disabled ? '#444c56' : '#fff',
          borderRadius: '50%',
          width: 36,
          height: 36,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Step forward */}
      <button
        style={iconBtn(disabled || currentStep === maxStep)}
        disabled={disabled || currentStep === maxStep}
        onClick={() => onSeek(currentStep + 1)}
        title="Step forward"
      >
        &#9654;
      </button>

      {/* Scrubber + step counter */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          type="range"
          min={0} max={maxStep || 0} step={1} value={currentStep}
          disabled={disabled}
          onChange={e => onSeek(Number(e.target.value))}
          style={{ opacity: disabled ? 0.3 : 1 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8b949e' }}>
          <span>Step <span style={{ color: '#58a6ff' }}>{currentStep}</span> / {maxStep}</span>
          <span style={{ color: '#58a6ff' }}>{pct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Speed buttons */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {SPEEDS.map(s => (
          <button
            key={s.ms}
            onClick={() => onSpeedChange(s.ms)}
            disabled={disabled}
            style={{
              padding: '3px 7px',
              borderRadius: 4,
              fontSize: 10,
              background: speed === s.ms ? '#1f6feb' : '#21262d',
              color: speed === s.ms ? '#fff' : '#8b949e',
              border: '1px solid',
              borderColor: speed === s.ms ? '#1f6feb' : '#30363d',
              transition: 'all 0.1s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
