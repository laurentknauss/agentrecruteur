import { useId } from "react";
import { cn } from "@/lib/utils";

interface GridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: string | number;
  numSquares?: number;
  className?: string;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

export function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  ...props
}: GridPatternProps) {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {Array.from({ length: numSquares }, (_, i) => (
          <rect
            strokeWidth="0"
            key={`${id}-${i}`}
            width={width - 1}
            height={height - 1}
            x={`${i % Math.floor(Math.sqrt(numSquares)) * width + 1}`}
            y={`${Math.floor(i / Math.floor(Math.sqrt(numSquares))) * height + 1}`}
            fill={`url(#${id})`}
            strokeDasharray={strokeDasharray}
          >
            <animate
              attributeName="opacity"
              values={`0;${maxOpacity};0`}
              dur={`${duration}s`}
              begin={`${i * repeatDelay}s`}
              repeatCount="indefinite"
            />
          </rect>
        ))}
      </svg>
    </svg>
  );
}