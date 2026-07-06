"use client";

import * as React from "react";
import type { GoalWithNodes, GoalNode } from "@/types";
import { nodeStatusMeta } from "@/lib/kairo/status";
import { cn } from "@/lib/utils";

const W = 800;
const H = 640;
const CX = 400;
const CY = 300;
const R = 224;
const ACCENT = "#e6b877";

function nextNodeId(nodes: GoalNode[]): string | null {
  return (
    nodes.find((n) => n.status === "in_motion")?.id ??
    nodes.find((n) => n.status === "at_risk")?.id ??
    nodes.find((n) => n.status === "not_started")?.id ??
    null
  );
}

function polar(i: number, count: number) {
  const angle = (-90 + (360 / count) * i) * (Math.PI / 180);
  return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle), angle };
}

export function LivingGoalMap({
  goal,
  selectedId,
  onSelect,
  className,
}: {
  goal: GoalWithNodes;
  selectedId?: string | null;
  onSelect?: (node: GoalNode) => void;
  className?: string;
}) {
  const nodes = goal.nodes;
  const nextId = nextNodeId(nodes);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full", className)} role="img" aria-label={`Living map for ${goal.title}`}>
      <defs>
        <radialGradient id="lm-core" cx="50%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#fdf3e0" />
          <stop offset="46%" stopColor={ACCENT} />
          <stop offset="100%" stopColor="#22190c" />
        </radialGradient>
        <radialGradient id="lm-core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(230,184,119,0.4)" />
          <stop offset="100%" stopColor="rgba(230,184,119,0)" />
        </radialGradient>
      </defs>

      {/* connectors */}
      {nodes.map((node, i) => {
        const { x, y, angle } = polar(i, nodes.length);
        const ctrlR = R * 0.52;
        const cxp = CX + ctrlR * Math.cos(angle + 0.4);
        const cyp = CY + ctrlR * Math.sin(angle + 0.4);
        const isNext = node.id === nextId;
        return (
          <path
            key={`link-${node.id}`}
            d={`M ${CX} ${CY} Q ${cxp} ${cyp} ${x} ${y}`}
            fill="none"
            stroke={isNext ? ACCENT : "rgba(255,255,255,0.14)"}
            strokeWidth={isNext ? 2 : 1.25}
            strokeLinecap="round"
            strokeDasharray={isNext ? "4 8" : undefined}
            className={isNext ? "animate-dash" : undefined}
            opacity={node.status === "not_started" ? 0.55 : 0.9}
          />
        );
      })}

      {/* core */}
      <circle cx={CX} cy={CY} r={116} fill="url(#lm-core-glow)" className="animate-pulse-soft" />
      <circle cx={CX} cy={CY} r={52} fill="url(#lm-core)" stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
      <text x={CX} y={CY - 3} textAnchor="middle" fontSize="25" fontWeight="700" fill="#1b1206">
        {Math.round(goal.progress)}%
      </text>
      <text x={CX} y={CY + 16} textAnchor="middle" fontSize="9.5" fontWeight="600" letterSpacing="1.6" fill="#3a2c12">
        IN MOTION
      </text>

      {/* nodes */}
      {nodes.map((node, i) => {
        const { x, y } = polar(i, nodes.length);
        const meta = nodeStatusMeta[node.status];
        const isNext = node.id === nextId;
        const selected = node.id === selectedId;
        const done = node.status === "done";
        const rNode = 25;
        const circ = 2 * Math.PI * (rNode + 6);
        const offset = circ * (1 - Math.max(0, Math.min(100, node.progress)) / 100);
        return (
          <g
            key={node.id}
            transform={`translate(${x}, ${y})`}
            onClick={() => onSelect?.(node)}
            className={onSelect ? "cursor-pointer" : undefined}
            role="button"
            aria-label={`${node.title} — ${meta.label}`}
          >
            {(isNext || selected) && (
              <circle r={rNode + 12} fill="none" stroke={meta.hex} strokeWidth={selected ? 1.75 : 1.25} opacity={0.45} className={isNext ? "animate-pulse-soft" : undefined} />
            )}
            {/* progress arc */}
            <circle r={rNode + 6} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={2.5} />
            <circle
              r={rNode + 6}
              fill="none"
              stroke={meta.hex}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90)"
            />
            {/* body */}
            <circle
              r={rNode}
              fill={done ? meta.hex : "#111317"}
              stroke={meta.hex}
              strokeWidth={1.25}
              opacity={node.status === "not_started" ? 0.85 : 1}
            />
            <circle r={4.5} fill={meta.hex} opacity={done ? 0 : 1} />

            {/* label */}
            <foreignObject x={-70} y={rNode + 12} width={140} height={56} style={{ overflow: "visible" }}>
              <div className="text-center leading-tight">
                <div className={cn("truncate text-[12.5px]", selected ? "font-semibold text-ink" : "text-ink/85")}>{node.title}</div>
                <div className="mt-0.5 font-mono text-[10px] tracking-wide" style={{ color: meta.hex }}>
                  {node.estimatedMinutes}m · {meta.label}
                </div>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}
