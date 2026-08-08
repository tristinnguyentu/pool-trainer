import { useCallback, useRef, type RefObject } from 'react';
import { clamp } from '../engine/constants';

const MIN_TOP_SHARE = 0.25;
const MAX_TOP_SHARE = 0.85;

interface ViewSplitterProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onChange: (topShare: number) => void;
  onReset: () => void;
}

/**
 * Drag handle between the two center-column canvas wraps. Reports the pointer's
 * fractional position within `containerRef` as the new topShare; double-click
 * restores the default 2:1 split.
 *
 * The stacking axis is read off the container's computed flex-direction rather
 * than from a duplicate media query: CSS already flips the views side by side on
 * a phone held sideways, so this can never measure the wrong axis.
 */
export function ViewSplitter({ containerRef, onChange, onReset }: ViewSplitterProps) {
  const draggingRef = useRef(false);
  const rowRef = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      const container = containerRef.current;
      rowRef.current = container
        ? getComputedStyle(container).flexDirection.startsWith('row')
        : false;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [containerRef],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const row = rowRef.current;
      const rect = container.getBoundingClientRect();
      const extent = row ? rect.width : rect.height;
      if (extent <= 0) return;
      const fraction = (row ? e.clientX - rect.left : e.clientY - rect.top) / extent;
      onChange(clamp(fraction, MIN_TOP_SHARE, MAX_TOP_SHARE));
    },
    [containerRef, onChange],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  return (
    <div
      className="view-splitter"
      role="separator"
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
