import { getBezierPath, type EdgeProps } from "@xyflow/react";

/**
 * 컨베이어 벨트 느낌의 엣지.
 *
 * 구성 (위에서 아래로 겹쳐 그림):
 *   1. shadow — 짙은 검정 외곽선, 그림자/글로우 역할
 *      → 다른 엣지와 겹쳤을 때 시인성 확보
 *   2. belt 본체 — 밝은 회색 path (round cap/join)
 *   3. 흐르는 dash — 오렌지, source → target 방향 stroke-dashoffset 애니메이션
 *
 * smoothstep 의 90도 꺾임 대신 bezier 곡선 사용 — 노드 전후 불필요한
 * 직각 꺾임 제거.
 */
export function ChevronEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return (
    <g pointerEvents="none">
      {/* 그림자 — 다른 엣지·노드 위에서도 라인 윤곽이 보이게 */}
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

export const edgeTypes = {
  chevron: ChevronEdge,
};
