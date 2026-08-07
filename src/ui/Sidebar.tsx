import { useMemo } from 'react';
import { BASICS_ARTICLES, type BasicsArticle } from '../content/basics';
import { SHOTS } from '../engine/shots';
import type { ShotDef } from '../engine/types';
import { DifficultyPips } from './DifficultyPips';

interface SidebarProps {
  activeShotId: string | null;
  activeArticleId: string | null;
  onSelect: (shot: ShotDef) => void;
  onSelectArticle: (article: BasicsArticle) => void;
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

export function Sidebar({ activeShotId, activeArticleId, onSelect, onSelectArticle }: SidebarProps) {
  const groups = useMemo(() => groupByCategory(SHOTS), []);

  return (
    <nav className="sidebar" aria-label="Shot library">
      <div className="sidebar-group">
        <h2 className="sidebar-heading">The Basics</h2>
        <ul className="sidebar-list">
          {BASICS_ARTICLES.map((article) => {
            const active = article.id === activeArticleId;
            return (
              <li key={article.id}>
                <button
                  type="button"
                  className={active ? 'shot-btn shot-btn-active' : 'shot-btn'}
                  onClick={() => onSelectArticle(article)}
                  aria-current={active}
                  title={article.title}
                >
                  <span className="shot-btn-name">{article.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
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
                    title={shot.name}
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
