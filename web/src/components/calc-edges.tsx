import { getBezierPath, type EdgeProps } from "@xyflow/react";

/**
 * 컨베이어 벨트 느낌의 엣지.
 *
 * 라우팅:
 *   - data.points 가 있으면 dagre 가 계산한 우회 경로 (노드 회피) 를
 *     catmull-rom 보간 → 부드러운 cubic bezier 곡선
 *   - 없으면 getBezierPath fallback (source/target 직접 연결)
 *
 * z-order (위→아래):
 *   1. shadow — 검정 외곽선 (다른 라인·노드와 겹쳐도 윤곽 식별)
 *   2. belt 본체 — 밝은 회색
 *   3. 흐르는 dash — 오렌지, source → target 방향 dashoffset 애니메이션
 */

type Pt = { x: number; y: number };

export function ChevronEdge({
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const dagrePoints = (data?.points as Pt[] | undefined) ?? null;

  let path: string;
  if (dagrePoints && dagrePoints.length >= 2) {
    const pts: Pt[] = [
      { x: sourceX, y: sourceY },
      ...dagrePoints.slice(1, -1),
      { x: targetX, y: targetY },
    ];
    path = catmullRomPath(pts);
  } else {
    [path] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }

  return (
    <g pointerEvents="none">
      <path
        d={path}
        fill="none"
        stroke="#000000"
        strokeOpacity={0.55}
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={path}
        fill="none"
        stroke="#71717a"
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={path}
        fill="none"
        stroke="#fa9549"
        strokeWidth={5}
        strokeLinecap="butt"
        strokeDasharray="14 10"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="24"
          to="0"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </path>
    </g>
  );
}

function catmullRomPath(points: Pt[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export const edgeTypes = {
  chevron: ChevronEdge,
};
