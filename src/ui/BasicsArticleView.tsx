import type { BasicsArticle, BasicsBlock } from '../content/basics';

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
  return (
    <div className="basics-article-wrap">
      <article className="basics-article" aria-label={article.title}>
        <div className="basics-body">{article.body.map(renderBlock)}</div>
      </article>
    </div>
  );
}
