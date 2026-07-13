import { useMemo } from 'react';
import { SHOTS } from '../engine/shots';
import type { ShotDef } from '../engine/types';
import { DifficultyPips } from './DifficultyPips';

interface SidebarProps {
  activeShotId: string;
  onSelect: (shot: ShotDef) => void;
}

function groupByCategory(shots: ShotDef[]): Array<[string, ShotDef[]]> {
  const map = new Map<string, ShotDef[]>();
  for (const shot of shots) {
    const bucket = map.get(shot.category);
    if (bucket) bucket.push(shot);
    else map.set(shot.category, [shot]);
  }
  return Array.from(map.entries());
}

export function Sidebar({ activeShotId, onSelect }: SidebarProps) {
  const groups = useMemo(() => groupByCategory(SHOTS), []);

  return (
    <nav className="sidebar" aria-label="Shot library">
      {groups.map(([category, shots]) => (
        <div className="sidebar-group" key={category}>
          <h2 className="sidebar-heading">{category}</h2>
          <ul className="sidebar-list">
            {shots.map((shot) => {
              const active = shot.id === activeShotId;
              return (
                <li key={shot.id}>
                  <button
                    type="button"
                    className={active ? 'shot-btn shot-btn-active' : 'shot-btn'}
                    onClick={() => onSelect(shot)}
                    aria-current={active}
                  >
                    <span className="shot-btn-name">{shot.name}</span>
                    <DifficultyPips value={shot.difficulty} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
