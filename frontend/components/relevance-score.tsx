"use client";

import { cn } from "@/lib/utils";

interface RelevanceScoreProps {
  score: number; // 0-10
  size?: number;
  className?: string;
}

export function RelevanceScore({
  score,
  size = 44,
  className,
}: RelevanceScoreProps) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;

  // green(10) → amber(5) → red(0)
  const hue = (score / 10) * 120; // 0 = red, 60 = amber, 120 = green

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-zinc-800"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`hsl(${hue}, 80%, 55%)`}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span
        className="absolute font-mono text-xs font-bold"
        style={{ color: `hsl(${hue}, 80%, 55%)` }}
      >
        {score}
      </span>
    </div>
  );
}
