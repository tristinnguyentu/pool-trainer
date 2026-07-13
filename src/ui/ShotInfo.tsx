import type { ShotDef } from '../engine/types';
import { DifficultyPips } from './DifficultyPips';

interface ShotInfoProps {
  shot: ShotDef;
}

export function ShotInfo({ shot }: ShotInfoProps) {
  return (
    <section className="card shot-info" aria-label="Shot info">
      <header className="shot-info-header">
        <h2>{shot.name}</h2>
        <DifficultyPips value={shot.difficulty} />
      </header>
      <p className="shot-info-category">{shot.category}</p>
      <p className="shot-info-desc">{shot.description}</p>
      <ul className="shot-info-tips">
        {shot.tips.map((tip, i) => (
          <li key={i}>{tip}</li>
        ))}
      </ul>
    </section>
  );
}
