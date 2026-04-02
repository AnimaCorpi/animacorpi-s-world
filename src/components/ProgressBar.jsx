export default function ProgressBar({ percentage, label, className = "" }) {
  const clampedPercentage = Math.min(Math.max(percentage || 0, 0), 100);
  
  return (
    <div className={`w-full ${className}`}>
      {label && <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{Math.round(clampedPercentage)}% complete</p>
    </div>
  );
}