interface DifficultyPipsProps {
  value: number;
  max?: number;
}

export function DifficultyPips({ value, max = 5 }: DifficultyPipsProps) {
  return (
    <span className="pips" aria-label={`difficulty ${value} of ${max}`} title={`Difficulty ${value}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? 'pip pip-filled' : 'pip'} />
      ))}
    </span>
  );
}
