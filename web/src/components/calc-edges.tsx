import { getSmoothStepPath, type EdgeProps } from "@xyflow/react";

/**
 * 컨베이어 벨트 느낌의 엣지.
 *
 * - 두꺼운 회색 base path (모서리 round)
 * - 그 위에 textPath 로 진행 방향 chevron(›) 을 path 길이만큼 반복
 *   textPath 는 SVG path 의 tangent 따라 자동 회전되므로 곡선부에서도
 *   chevron 이 흐름 방향을 가리킨다.
 * - 화살표를 path 끝에만 두지 않고 belt 전체에 흐름을 표현 (요구사항).
 */
export function ChevronEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 22,
  });
  const pathId = `edge-path-${id}`;
  return (
    <g pointerEvents="none">
      <path
        id={pathId}
        d={path}
        fill="none"
        stroke="#27272a"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        fill="#fa9549"
        fontSize={16}
        fontWeight={900}
        letterSpacing="4px"
        dominantBaseline="central"
      >
        <textPath href={`#${pathId}`} startOffset="0" spacing="auto">
          {"›".repeat(120)}
        </textPath>
      </text>
    </g>
  );
}

export const edgeTypes = {
  chevron: ChevronEdge,
};
