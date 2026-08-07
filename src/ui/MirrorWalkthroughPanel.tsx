import type { MirrorStep, ShotDef } from '../engine/types';
import { POCKET_NAMES } from './pocketNames';

interface MirrorWalkthroughPanelProps {
  shot: ShotDef;
  step: MirrorStep | null;
  onStart: () => void;
  onStep: (step: MirrorStep) => void;
  onExit: () => void;
}

function captions(shot: ShotDef): string[] | null {
  const spec = shot.aimSpec;
  if (spec.kind === 'bank') {
    const ball = `${spec.ball} ball`;
    const rail = spec.rail;
    const pocket = POCKET_NAMES[spec.pocket];
    return [
      `The goal: bank the ${ball} off the ${rail} rail into the ${pocket}. You can't aim straight at the pocket: the ball must hit the rail first, and a cushion rebounds at the same angle it arrives (angle in = angle out). So where on the rail should you aim?`,
      `Imagine folding the table over the ${rail} rail, like a mirror. The target pocket gets a phantom twin on the other side, exactly as far beyond the rail as the real pocket is inside it, both distances marked d.`,
      `Now draw a straight line from the ${ball} to the phantom pocket, as if the rail weren't there. Where it crosses the rail is your bank point.`,
      `Fold the mirror back. The straight line bends at the rail into the real path: in at the bank point, out at the same angle, into the real pocket. The trick works because reflection preserves angles.`,
      `So a bank is just a straight shot at a phantom target: ghost-ball aim the ${ball} at the phantom pocket and shoot. The orange dashed guide you normally see is exactly this line. Press Play to watch it.`,
    ];
  }
  if (spec.kind === 'kick') {
    const ball = `${spec.ball} ball`;
    const rail = spec.rail;
    return [
      `The goal: drive the cue ball off the ${rail} rail so it kicks back into the ${ball}. Same cushion rule: angle in = angle out.`,
      `Fold the table over the ${rail} rail: the ${ball} gets a phantom twin, exactly as far beyond the rail as the real ball is from it.`,
      `Draw a straight line from the cue ball to the phantom ball. Where it crosses the rail is your kick point.`,
      `Fold it back: the cue ball travels to the kick point, rebounds at the equal angle, and arrives at the real ball.`,
      `So a kick is aimed like a straight shot at the phantom ball, and that's the orange dashed guide. Press Play to watch it.`,
    ];
  }
  return null;
}

export function MirrorWalkthroughPanel({ shot, step, onStart, onStep, onExit }: MirrorWalkthroughPanelProps) {
  const text = captions(shot);
  if (!text) return null;

  if (step === null) {
    return (
      <section className="card mirror-panel">
        <button type="button" className="btn btn-mirror" onClick={onStart}>
          🪞 Step through the mirror system
        </button>
      </section>
    );
  }

  return (
    <section className="card mirror-panel" aria-label="Mirror system walkthrough">
      <div className="mirror-dots" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={5}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`mirror-dot${n === step ? ' active' : ''}${n < step ? ' done' : ''}`} />
        ))}
        <span className="mirror-step-label">
          Step {step} of 5
        </span>
      </div>
      <p className="mirror-caption">{text[step - 1]}</p>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn-small"
          disabled={step === 1}
          onClick={() => onStep((step - 1) as MirrorStep)}
        >
          ← Back
        </button>
        <button
          type="button"
          className="btn btn-small btn-primary"
          disabled={step === 5}
          onClick={() => onStep((step + 1) as MirrorStep)}
        >
          Next →
        </button>
        <button type="button" className="btn btn-small" onClick={onExit}>
          Got it
        </button>
      </div>
    </section>
  );
}
