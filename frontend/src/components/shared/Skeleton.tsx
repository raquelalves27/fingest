export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-ink/5 dark:bg-paper/10 ${className}`} />;
}
