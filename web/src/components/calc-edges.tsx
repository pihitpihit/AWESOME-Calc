import { getSmoothStepPath, type EdgeProps } from "@xyflow/react";

/**
 * 컨베이어 벨트 느낌의 엣지.
 *
 * 구성:
 *   1. 두꺼운 회색 base path (belt 본체, strokeLinecap/Linejoin=round)
 *   2. 같은 path 위에 오렌지 dash 가 흐르는 애니메이션
 *      (stroke-dasharray + stroke-dashoffset 애니메이션)
 *
 * 이전 구현은 <textPath> 로 chevron(›) 글자를 path 따라 그렸는데,
 * 글자 baseline 과 path 중심선이 어긋나고 코너에서 글자 box 가 회전하면서
 * 외곽으로 새는 SVG 특성상 정렬이 맞지 않았다. dash 방식은 stroke 자체이므로
 * path 중심선과 항상 일치한다.
 */
export function ChevronEdge({
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
  return (
    <g pointerEvents="none">
      {/* belt 본체 */}
      <path
        d={path}
        fill="none"
        stroke="#27272a"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 흐르는 dash — source → target 방향 */}
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
