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
 * Horizontal drag handle between the two center-column canvas wraps. Reports
 * the pointer's fractional position within `containerRef` as the new topShare;
 * double-click restores the default 2:1 split.
 */
export function ViewSplitter({ containerRef, onChange, onReset }: ViewSplitterProps) {
  const draggingRef = useRef(false);

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
      if (rect.height <= 0) return;
      const fraction = (e.clientY - rect.top) / rect.height;
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
      aria-orientation="horizontal"
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
