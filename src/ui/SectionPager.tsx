interface SectionPagerProps {
  /** The section being paged through, e.g. "Cut Shots" or "The Basics". */
  label: string;
  /** Zero-based position of the current page within the section. */
  index: number;
  total: number;
  prevName: string | null;
  nextName: string | null;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Step through the pages of the current section without opening the library.
 * Paging stays inside the section — the counter and the disabled arrows say
 * where its edges are, rather than silently spilling into the next one.
 */
export function SectionPager({
  label,
  index,
  total,
  prevName,
  nextName,
  onPrev,
  onNext,
}: SectionPagerProps) {
  if (total < 2) return null;
  const position = `${label} · ${index + 1} of ${total}`;

  return (
    <div className="pager" role="group" aria-label={`${label} navigation`}>
      <button
        type="button"
        className="pager-btn"
        onClick={onPrev}
        disabled={!prevName}
        aria-label={prevName ? `Previous in ${label}: ${prevName}` : `Start of ${label}`}
        title={prevName ? `← ${prevName}` : `Start of ${label}`}
      >
        ‹
      </button>
      <span className="pager-count" title={position} aria-label={position}>
        {index + 1}/{total}
      </span>
      <button
        type="button"
        className="pager-btn"
        onClick={onNext}
        disabled={!nextName}
        aria-label={nextName ? `Next in ${label}: ${nextName}` : `End of ${label}`}
        title={nextName ? `${nextName} →` : `End of ${label}`}
      >
        ›
      </button>
    </div>
  );
}
