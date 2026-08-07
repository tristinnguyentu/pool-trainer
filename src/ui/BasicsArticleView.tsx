import type { BasicsArticle, BasicsBlock } from '../content/basics';
import { BASICS_HEROES } from './basicsMedia';

interface BasicsArticleViewProps {
  article: BasicsArticle;
}

function renderBlock(block: BasicsBlock, i: number) {
  switch (block.kind) {
    case 'h':
      return (
        <h3 className="basics-h" key={i}>
          {block.text}
        </h3>
      );
    case 'p':
      return (
        <p className="basics-p" key={i}>
          {block.text}
        </p>
      );
    case 'list':
      return (
        <ul className="basics-list" key={i}>
          {block.items.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>
      );
    case 'term':
      return (
        <div className="basics-term" key={i}>
          <span className="basics-term-word">{block.term}</span>
          <span className="basics-term-def">{block.def}</span>
        </div>
      );
    default:
      return null;
  }
}

export function BasicsArticleView({ article }: BasicsArticleViewProps) {
  const hero = BASICS_HEROES[article.id];
  return (
    <div className="basics-article-wrap">
      <article className="basics-article" aria-label={article.title}>
        <header className="basics-header">
          <span className="basics-eyebrow">The basics</span>
          <h2 className="basics-title">{article.title}</h2>
          <p className="basics-lede">{article.blurb}</p>
        </header>
        {hero && (
          <figure className={hero.light ? 'basics-hero basics-hero-light' : 'basics-hero'}>
            <img src={hero.src} alt={hero.alt} loading="lazy" />
            <figcaption>
              {hero.alt}
              {' · '}
              <a href={hero.href} target="_blank" rel="noreferrer">
                {hero.credit}
              </a>
            </figcaption>
          </figure>
        )}
        <div className="basics-body">{article.body.map(renderBlock)}</div>
      </article>
    </div>
  );
}
