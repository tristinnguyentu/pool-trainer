import { useCallback, useEffect, useMemo, useState } from 'react';
import { mirrorWalkthrough } from '../engine/mirror';
import { computeGuides } from '../engine/physics';
import { buildScene, SHOTS } from '../engine/shots';
import type { Ball, MirrorStep, Scene, ShotDef, Spin } from '../engine/types';
import { ControlsPanel } from './ControlsPanel';
import { MirrorWalkthroughPanel } from './MirrorWalkthroughPanel';
import { CueViewCanvas } from './CueViewCanvas';
import { DifficultyPips } from './DifficultyPips';
import { usePlayback } from './hooks/usePlayback';
import { predictedOutcome } from './outcome';
import { ShotInfo } from './ShotInfo';
import { Sidebar } from './Sidebar';
import { TopDownCanvas } from './TopDownCanvas';

const AIM_LIMIT = 8;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function isFormField(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

export function App() {
  const [scene, setScene] = useState<Scene>(() => buildScene(SHOTS[0]));
  const [showGuides, setShowGuides] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [mirrorStep, setMirrorStep] = useState<MirrorStep | null>(null);

  const playback = usePlayback(scene, speed);

  const guides = useMemo(() => computeGuides(scene), [scene]);
  const outcome = useMemo(() => predictedOutcome(scene.shot, guides), [scene.shot, guides]);
  const mirrorData = useMemo(() => mirrorWalkthrough(scene, guides), [scene, guides]);
  const mirror = mirrorStep !== null && mirrorData ? { data: mirrorData, step: mirrorStep } : null;

  const viewBalls: Ball[] = playback.status === 'idle' ? scene.balls : playback.balls ?? scene.balls;
  // 'settled' renders as animating too: the finished table stays clean (no
  // stale aim line, ghost outline, or cue stick) until Reset or Replay.
  const animating = playback.status !== 'idle';

  const selectShot = useCallback(
    (shot: ShotDef) => {
      playback.reset();
      setMirrorStep(null);
      setScene(buildScene(shot));
    },
    [playback],
  );

  const handleReset = useCallback(() => {
    playback.reset();
    setMirrorStep(null);
    setScene((prev) => buildScene(prev.shot));
  }, [playback]);

  const handlePlay = useCallback(() => {
    playback.play();
  }, [playback]);

  const setPower = useCallback((power: number) => {
    setScene((prev) => ({ ...prev, aim: { ...prev.aim, power } }));
  }, []);

  const setSpin = useCallback((spin: Spin) => {
    setScene((prev) => ({ ...prev, aim: { ...prev.aim, spin } }));
  }, []);

  const setAngleOffset = useCallback((angleOffsetDeg: number) => {
    setScene((prev) => ({
      ...prev,
      aim: { ...prev.aim, angleOffsetDeg: clamp(angleOffsetDeg, -AIM_LIMIT, AIM_LIMIT) },
    }));
  }, []);

  const nudgeAim = useCallback(
    (delta: number) => {
      setScene((prev) => ({
        ...prev,
        aim: { ...prev.aim, angleOffsetDeg: clamp(prev.aim.angleOffsetDeg + delta, -AIM_LIMIT, AIM_LIMIT) },
      }));
    },
    [],
  );

  const recenterAim = useCallback(() => setAngleOffset(0), [setAngleOffset]);

  const handleDragBall = useCallback(
    (id: string, x: number, y: number) => {
      // A drag always edits the live scene; if we were showing a settled animation's
      // final frame, drop back to idle so the canvas reflects scene.balls again.
      if (playback.status === 'settled') playback.reset();
      setScene((prev) => ({
        ...prev,
        balls: prev.balls.map((b) => (b.id === id ? { ...b, x, y } : b)),
      }));
    },
    [playback],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isFormField(document.activeElement)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (playback.status !== 'playing') playback.play();
      } else if (e.key === 'r' || e.key === 'R') {
        handleReset();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudgeAim(-0.25);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudgeAim(0.25);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playback, handleReset, nudgeAim]);

  return (
    <div className="app">
      <header className="header-bar">
        <h1>Pool Trainer</h1>
        <div className="header-shot">
          <span className="header-shot-name">{scene.shot.name}</span>
          <DifficultyPips value={scene.shot.difficulty} />
        </div>
      </header>

      <div className="body-grid">
        <Sidebar activeShotId={scene.shot.id} onSelect={selectShot} />

        <div className="center-col">
          <div className="topdown-wrap">
            <span className="view-label">Bird's-eye view</span>
            <TopDownCanvas
              scene={scene}
              guides={guides}
              balls={viewBalls}
              animating={animating}
              showGuides={showGuides}
              mirror={mirror}
              onDragBall={handleDragBall}
            />
          </div>
          <div className="cueview-wrap">
            <span className="view-label">Behind the cue ball (shooter's view)</span>
            <CueViewCanvas
              scene={scene}
              guides={guides}
              balls={viewBalls}
              animating={animating}
              showGuides={showGuides}
            />
          </div>
          <p className="hint-bar">
            Tip: drag any ball on the table to build your own shot · Space plays · R resets ·
            ← → nudge the aim
          </p>
        </div>

        <div className="right-panel">
          <ControlsPanel
            status={playback.status}
            onPlay={handlePlay}
            onReset={handleReset}
            power={scene.aim.power}
            onPowerChange={setPower}
            spin={scene.aim.spin}
            onSpinChange={setSpin}
            angleOffsetDeg={scene.aim.angleOffsetDeg}
            onAngleChange={setAngleOffset}
            onRecenterAim={recenterAim}
            showGuides={showGuides}
            onToggleGuides={setShowGuides}
            speed={speed}
            onSpeedChange={setSpeed}
            outcome={outcome}
          />
          <MirrorWalkthroughPanel
            shot={scene.shot}
            step={mirrorStep}
            onStart={() => setMirrorStep(1)}
            onStep={setMirrorStep}
            onExit={() => setMirrorStep(null)}
          />
          <ShotInfo shot={scene.shot} />
        </div>
      </div>
    </div>
  );
}
