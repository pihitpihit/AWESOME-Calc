import { getBezierPath, type EdgeProps } from "@xyflow/react";

/**
 * 컨베이어 벨트 느낌의 엣지.
 *
 * 라우팅 전략:
 *   - data.points 가 있으면 dagre 가 계산한 우회 경로 (노드를 피해 돌아감)
 *     를 catmull-rom 보간 → 부드러운 곡선으로 그린다.
 *   - 없으면 getBezierPath fallback (source/target 직접 연결).
 *
 * 시각 구성 (z-order 위에서 아래):
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
    // dagre 가 노드 사이를 우회하도록 만든 waypoint 들을 부드럽게 보간.
    // 시작/끝 좌표는 xyflow 의 handle 좌표로 보강 (dagre 의 node intersection
    // 점은 xyflow handle 과 미세하게 다를 수 있어 끝점 정합성을 위해 교체).
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
      {/* 그림자 — 다른 엣지·노드 위에서도 라인 윤곽이 식별되게 */}
      <path
        d={path}
        fill="none"
        stroke="#000000"
        strokeOpacity={0.55}
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* belt 본체 — 밝게 */}
      <path
        d={path}
        fill="none"
        stroke="#71717a"
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 흐르는 dash */}
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

/**
 * Catmull-Rom 보간 → 입력 점들을 모두 통과하는 부드러운 cubic bezier 곡선.
 * dagre 의 우회 waypoint 들이 각진 polyline 으로 보이지 않게 둥글린다.
 */
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
