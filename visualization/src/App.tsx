import { useEffect, useRef, useState } from 'react';
import type { SimConfig, SimData } from './types';
import ConfigPanel from './components/ConfigPanel';
import NetworkGraph from './components/NetworkGraph';
import PlayerControls from './components/PlayerControls';
import StatsPanel from './components/StatsPanel';

const DEFAULT_CONFIG: SimConfig = {
  topology: 'small_world',
  num_agents: 100,
  steps: 15,
  seed: 42,
  truth_emotion: 0.2,
  misinfo_emotion: 0.9,
};

export default function App() {
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [simData, setSimData] = useState<SimData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(400);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxStep = simData ? simData.steps.length - 1 : 0;

  // Animation loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying || !simData) return;

    intervalRef.current = setInterval(() => {
      setCurrentStep(s => {
        if (s >= maxStep) {
          setIsPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, speed);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, maxStep, simData]);

  async function runSimulation() {
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentStep(0);

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Server error ${res.status}`);
      }

      const data: SimData = await res.json();
      setSimData(data);
      setCurrentStep(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSeek(step: number) {
    setIsPlaying(false);
    setCurrentStep(Math.max(0, Math.min(step, maxStep)));
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0d1117' }}>
      <ConfigPanel
        config={config}
        onChange={setConfig}
        onRun={runSimulation}
        isLoading={isLoading}
      />

      {/* Center column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <NetworkGraph
          simData={simData}
          currentStep={currentStep}
        />

        {/* Error banner */}
        {error && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: '#3d1a1a', border: '1px solid #cf222e', borderRadius: 6,
            padding: '8px 14px', fontSize: 12, color: '#f85149', zIndex: 50,
          }}>
            {error}
            <button
              onClick={() => setError(null)}
              style={{ marginLeft: 10, background: 'none', color: '#f85149', fontSize: 14 }}
            >
              x
            </button>
          </div>
        )}

        <PlayerControls
          currentStep={currentStep}
          maxStep={maxStep}
          isPlaying={isPlaying}
          speed={speed}
          disabled={!simData || isLoading}
          onPlay={() => {
            if (currentStep >= maxStep) setCurrentStep(0);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onSeek={handleSeek}
          onSpeedChange={s => { setSpeed(s); }}
        />
      </div>

      <StatsPanel simData={simData} currentStep={currentStep} />
    </div>
  );
}
