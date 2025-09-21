import React, { useEffect, useState, useMemo } from 'react';
import { EdgeProps, getSmoothStepPath, BaseEdge, Edge } from '@xyflow/react';

// CableData is just the additional data, not the full edge type
type CableData = {
  tension?: number;
  sag?: number;
  animated?: boolean;
  particleCount?: number;
  color?: string;
};

// The full edge type with CableData
type CableEdgeType = Edge<CableData>;

// Calculate catenary curve for realistic cable physics
function calculateCablePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  sag: number = 30
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Number of segments for smooth curve
  const segments = Math.max(20, Math.floor(distance / 10));
  const points: [number, number][] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = x1 + dx * t;

    // Catenary-like sag calculation
    const sagAmount = sag * Math.sin(Math.PI * t) * (1 + Math.sin(Date.now() * 0.001) * 0.05);
    const y = y1 + dy * t + sagAmount;

    points.push([x, y]);
  }

  // Convert points to SVG path
  return points.reduce((path, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;

    // Use quadratic Bezier curves for smoother appearance
    const prevPoint = points[i - 1];
    const cpx = prevPoint[0] + (x - prevPoint[0]) * 0.5;
    const cpy = prevPoint[1] + (y - prevPoint[1]) * 0.5;

    return `${path} Q ${cpx} ${cpy}, ${x} ${y}`;
  }, '');
}

export const CableEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data = {},
  selected,
  ...props
}) => {
  const [particles, setParticles] = useState<number[]>([]);
  const { tension = 0.5, sag = 30, animated = true, particleCount = 3, color = '#3B82F6' } = data as CableData;

  // Calculate cable path
  const cablePath = useMemo(
    () => calculateCablePath(sourceX, sourceY, targetX, targetY, sag),
    [sourceX, sourceY, targetX, targetY, sag]
  );

  // Initialize particles
  useEffect(() => {
    if (animated && particleCount > 0) {
      const initialParticles = Array.from({ length: particleCount }, (_, i) => i * (100 / particleCount));
      setParticles(initialParticles);
    }
  }, [animated, particleCount]);

  // Animate particles
  useEffect(() => {
    if (!animated || particleCount === 0) return;

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => (p + 2) % 100));
    }, 50);

    return () => clearInterval(interval);
  }, [animated, particleCount]);

  return (
    <g className="cable-edge-group">
      {/* Cable shadow */}
      <path
        d={cablePath}
        fill="none"
        stroke="rgba(0, 0, 0, 0.2)"
        strokeWidth={8}
        filter="blur(4px)"
        style={{ transform: 'translate(2px, 4px)' }}
      />

      {/* Outer cable glow */}
      {selected && (
        <path
          d={cablePath}
          fill="none"
          stroke={color}
          strokeWidth={12}
          opacity={0.3}
          className="animate-pulse"
        />
      )}

      {/* Main cable gradient */}
      <defs>
        <linearGradient id={`cable-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity={0.8} />
          <stop offset="50%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0.8} />
        </linearGradient>

        {/* Glow filter for particles */}
        <filter id={`glow-${id}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Main cable body */}
      <path
        id={`cable-${id}`}
        d={cablePath}
        fill="none"
        stroke={`url(#cable-gradient-${id})`}
        strokeWidth={6}
        strokeLinecap="round"
        className="cable-main"
        style={{
          filter: selected ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none',
        }}
      />

      {/* Inner wire highlight */}
      <path
        d={cablePath}
        fill="none"
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="10 20"
        className="cable-highlight"
      >
        {animated && (
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-30"
            dur="2s"
            repeatCount="indefinite"
          />
        )}
      </path>

      {/* Data flow particles */}
      {animated && particles.map((position, i) => (
        <circle
          key={i}
          r={3}
          fill="#60A5FA"
          filter={`url(#glow-${id})`}
        >
          <animateMotion
            dur="5s"
            repeatCount="indefinite"
            begin={`${i * (5 / particleCount)}s`}
          >
            <mpath href={`#cable-${id}`} />
          </animateMotion>
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            dur="5s"
            repeatCount="indefinite"
            begin={`${i * (5 / particleCount)}s`}
          />
        </circle>
      ))}

      {/* Connection plugs */}
      <g>
        {/* Source plug */}
        <circle
          cx={sourceX}
          cy={sourceY}
          r={8}
          fill={color}
          stroke="#fff"
          strokeWidth={2}
          className="cable-plug"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
          }}
        />
        <circle
          cx={sourceX}
          cy={sourceY}
          r={4}
          fill="#fff"
          opacity={0.6}
        />

        {/* Target plug */}
        <circle
          cx={targetX}
          cy={targetY}
          r={8}
          fill={color}
          stroke="#fff"
          strokeWidth={2}
          className="cable-plug"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
          }}
        />
        <circle
          cx={targetX}
          cy={targetY}
          r={4}
          fill="#fff"
          opacity={0.6}
        />
      </g>

      {/* Interactive hit area (invisible, larger for easier selection) */}
      <path
        d={cablePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />
    </g>
  );
};