import { useCallback, useRef, type RefObject } from 'react';
import { clamp } from '../engine/constants';

const MIN_TOP_SHARE = 0.25;
const MAX_TOP_SHARE = 0.85;

interface ViewSplitterProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onChange: (topShare: number) => void;
  onReset: () => void;
  /** 'row' when the views sit side by side (phone held sideways). */
  direction?: 'column' | 'row';
}

/**
 * Drag handle between the two center-column canvas wraps. Reports the pointer's
 * fractional position within `containerRef` as the new topShare; double-click
 * restores the default 2:1 split. Measures along whichever axis the views are
 * stacked on.
 */
export function ViewSplitter({ containerRef, onChange, onReset, direction = 'column' }: ViewSplitterProps) {
  const draggingRef = useRef(false);
  const row = direction === 'row';

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const extent = row ? rect.width : rect.height;
      if (extent <= 0) return;
      const fraction = ((row ? e.clientX - rect.left : e.clientY - rect.top)) / extent;
      onChange(clamp(fraction, MIN_TOP_SHARE, MAX_TOP_SHARE));
    },
    [containerRef, onChange, row],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  return (
    <div
      className={row ? 'view-splitter view-splitter-row' : 'view-splitter'}
      role="separator"
      aria-orientation={row ? 'vertical' : 'horizontal'}
      aria-label="Resize views"
      title="Drag to resize · double-click to reset"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={onReset}
    >
      <span className="view-splitter-grip" aria-hidden="true" />
    </div>
  );
}
