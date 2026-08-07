import type { BasicsArticle } from '../content/basics';
import { getShot } from '../engine/shots';

interface BasicsInfoProps {
  article: BasicsArticle;
  onJumpToShot: (shotId: string) => void;
}

export function BasicsInfo({ article, onJumpToShot }: BasicsInfoProps) {
  const relatedShots = (article.relatedShotIds ?? [])
    .map((id) => getShot(id))
    .filter((shot): shot is NonNullable<typeof shot> => shot != null);

  return (
    <section className="card basics-info" aria-label="Article info">
      <h2 className="basics-info-title">{article.title}</h2>
      <p className="basics-info-blurb">{article.blurb}</p>
      {relatedShots.length > 0 && (
        <div className="basics-related">
          <span className="field-label">Related lessons</span>
          <ul className="basics-related-list">
            {relatedShots.map((shot) => (
              <li key={shot.id}>
                <button type="button" className="basics-related-link" onClick={() => onJumpToShot(shot.id)}>
                  {shot.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
