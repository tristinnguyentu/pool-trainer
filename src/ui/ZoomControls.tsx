interface ZoomControlsProps {
  scale: number;
  min: number;
  max: number;
  /** Multiplier applied by the − / + buttons. */
  step: number;
  onScaleBy: (factor: number) => void;
  onReset: () => void;
}

/** Floating −/+/reset cluster shared by the top-down and cue-view canvases. */
export function ZoomControls({ scale, min, max, step, onScaleBy, onReset }: ZoomControlsProps) {
  return (
    <div className="zoom-controls">
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
    </div>
  );
}
