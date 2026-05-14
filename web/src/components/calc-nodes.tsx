import { Handle, Position } from "@xyflow/react";
import { displayName, iconUrl } from "../lib/data";
import type { Item, Recipe } from "../types/data";

/**
 * BT 레이아웃: rank 0 (원자재) 가 아래, 최종 산물이 위.
 * 모든 노드: target 핸들 = Bottom, source 핸들 = Top.
 *
 * 클릭 처리 — 다중 방어:
 *  - ReactFlow 의 onNodeClick prop (Calculator 에서) 으로 일원 처리가 1차
 *  - 그게 어떤 환경에서 안 먹어도 outer div 의 onClick 이 백업 (data.onClick)
 *  - nodrag/nopan 클래스 + e.stopPropagation 으로 xyflow pan 핸들러가
 *    touch 를 가로채지 않게 함
 *  - cursor-pointer + title 로 시각·hover 단서
 */

type ClickHandler = (e: React.MouseEvent) => void;

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export interface ItemFlowNodeData {
  item: Item;
  isRoot?: boolean;
  onClick?: ClickHandler;
}

export function ItemFlowNode({ data }: { data: ItemFlowNodeData }) {
  const { item, isRoot, onClick } = data;

  const ringClass = isRoot
    ? "border-ficsit-orange ring-2 ring-ficsit-orange/30"
    : "border-ficsit-border";
  const fluidClass = item.is_fluid ? "ring-1 ring-cyan-400/40" : "";

  return (
    <div
      className="nodrag nopan touch-manipulation flex flex-col items-center cursor-pointer"
      onClick={onClick}
      onMouseDown={stop}
      onTouchStart={stop}
    >
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <div
        className={[
          "rounded-full bg-ficsit-panel border-2 w-16 h-16",
          "flex items-center justify-center pointer-events-none",
          ringClass,
          fluidClass,
        ].join(" ")}
        title={isRoot ? "눌러서 다른 아이템 선택" : `${item.name.en} (${item.class_name})`}
      >
        <img
          src={iconUrl(item.slug)}
          alt={item.name.en}
          width={44}
          height={44}
          className="rounded-full"
          draggable={false}
        />
      </div>
      <div className="mt-1 text-[11px] text-zinc-200 max-w-[120px] text-center leading-tight truncate pointer-events-none">
        {displayName(item.name)}
      </div>
      <Handle type="source" position={Position.Top} className="!opacity-0" />
    </div>
  );
}

export interface PlaceholderFlowNodeData {
  onClick?: ClickHandler;
}

export function PlaceholderFlowNode({ data }: { data: PlaceholderFlowNodeData }) {
  return (
    <div
      className="nodrag nopan touch-manipulation flex flex-col items-center cursor-pointer"
      onClick={data.onClick}
      onMouseDown={stop}
      onTouchStart={stop}
    >
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <div
        className="rounded-full bg-ficsit-panel border-2 border-dashed border-ficsit-orange w-16 h-16 flex items-center justify-center text-3xl text-ficsit-orange/80 pointer-events-none"
        title="아이템 선택"
      >
        +
      </div>
      <div className="mt-1 text-[11px] text-zinc-300 text-center max-w-[160px] leading-tight pointer-events-none">
        만들고 싶은
        <br />
        아이템 선택
      </div>
      <Handle type="source" position={Position.Top} className="!opacity-0" />
    </div>
  );
}

export interface RecipeFlowNodeData {
  recipe: Recipe;
  outputItemClass: string;
  onClick?: ClickHandler;
}

export function RecipeFlowNode({ data }: { data: RecipeFlowNodeData }) {
  const { recipe, onClick } = data;
  const building = recipe.produced_in[0] ?? "";
  const buildingShort = building.replace(/^Desc_/, "").replace(/_C$/, "");
  return (
    <div
      className="nodrag nopan touch-manipulation flex flex-col items-stretch cursor-pointer"
      onClick={onClick}
      onMouseDown={stop}
      onTouchStart={stop}
    >
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <div
        className="rounded-lg border-2 border-ficsit-border bg-ficsit-panel px-3 py-2 min-w-[180px] pointer-events-none"
        title="다른 레시피 후보 보기"
      >
        <div className="text-xs text-zinc-400 uppercase tracking-wide">
          {buildingShort || "조립"}
        </div>
        <div className="text-sm text-zinc-100 leading-tight">{displayName(recipe.name)}</div>
        <div className="flex items-center gap-1.5 mt-1">
          {recipe.alternate && <span className="chip-alt text-[10px]">대체</span>}
          <span className="text-[10px] text-zinc-500">눌러서 변경</span>
        </div>
      </div>
      <Handle type="source" position={Position.Top} className="!opacity-0" />
    </div>
  );
}

export const nodeTypes = {
  itemFlow: ItemFlowNode,
  recipeFlow: RecipeFlowNode,
  placeholderFlow: PlaceholderFlowNode,
};
