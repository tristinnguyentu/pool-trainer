interface ZoomControlsProps {
  scale: number;
  min: number;
  max: number;
  /** Multiplier applied by the − / + buttons. */
  step: number;
  onScaleBy: (factor: number) => void;
  onReset: () => void;
}

/**
 * Floating reset/−/+ cluster shared by the top-down and cue-view canvases.
 *
 * The reset chip comes first and the cluster is anchored to the right edge, so
 * the chip appearing on the first zoom grows the row leftwards instead of
 * shoving − and + out from under the finger that just pressed one.
 */
export function ZoomControls({ scale, min, max, step, onScaleBy, onReset }: ZoomControlsProps) {
  return (
    <div className="zoom-controls">
      {scale > min && (
        <button
          type="button"
          className="zoom-btn zoom-reset"
          aria-label={`Reset zoom (currently ${Math.round(scale * 100) / 100}×)`}
          title="Reset zoom"
          onClick={onReset}
        >
          {Math.round(scale * 100) / 100}× ✕
        </button>
      )}
      <button
        type="button"
        className="zoom-btn"
        aria-label="Zoom out"
        title="Zoom out (pinch or scroll works too)"
        disabled={scale <= min}
        onClick={() => onScaleBy(1 / step)}
      >
        −
      </button>
      <button
        type="button"
        className="zoom-btn"
        aria-label="Zoom in"
        title="Zoom in (pinch or scroll works too)"
        disabled={scale >= max}
        onClick={() => onScaleBy(step)}
      >
        +
      </button>
    </div>
  );
}
