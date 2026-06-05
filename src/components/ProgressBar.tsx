type ProgressBarProps = {
  value: number;
  max: number;
  label: string;
};

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="progress-bar" aria-label={label}>
      <div className="progress-bar__label">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div
        className="progress-bar__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <span
          className="progress-bar__fill"
          style={{ inlineSize: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
