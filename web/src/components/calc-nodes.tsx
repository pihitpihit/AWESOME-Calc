import { Handle, Position } from "@xyflow/react";
import { displayName, iconUrl } from "../lib/data";
import type { Item, Recipe } from "../types/data";

/**
 * BT 레이아웃: rank 0 (원자재) 가 아래, 최종 산물이 위.
 * 모든 노드: target 핸들 = Bottom, source 핸들 = Top.
 *
 * 클릭 처리는 ReactFlow 의 onNodeClick 으로 일원화 — 모바일 touch 호환성.
 * 노드 자체는 div 로 단순화 (button/Link 사용 안 함, pan/drag 캡처 충돌
 * 회피). cursor-pointer 로 시각 단서, title 로 마우스 hover 도움말.
 */

export interface ItemFlowNodeData {
  item: Item;
  isRoot?: boolean;
}

export function ItemFlowNode({ data }: { data: ItemFlowNodeData }) {
  const { item, isRoot } = data;

  const ringClass = isRoot
    ? "border-ficsit-orange ring-2 ring-ficsit-orange/30"
    : "border-ficsit-border";
  const fluidClass = item.is_fluid ? "ring-1 ring-cyan-400/40" : "";

  return (
    <div className="flex flex-col items-center cursor-pointer">
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <div
        className={[
          "rounded-full bg-ficsit-panel border-2 w-16 h-16",
          "flex items-center justify-center",
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
          className="rounded-full pointer-events-none"
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

/**
 * 비어있는 루트 노드 — 초기 화면. 탭하면 ItemBrowser 모달.
 * 클릭은 onNodeClick 에서 처리.
 */
export function PlaceholderFlowNode() {
  return (
    <div className="flex flex-col items-center cursor-pointer">
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <div
        className="rounded-full bg-ficsit-panel border-2 border-dashed border-ficsit-orange w-16 h-16 flex items-center justify-center text-3xl text-ficsit-orange/80"
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
}

export function RecipeFlowNode({ data }: { data: RecipeFlowNodeData }) {
  const { recipe } = data;
  const building = recipe.produced_in[0] ?? "";
  const buildingShort = building.replace(/^Desc_/, "").replace(/_C$/, "");
  return (
    <div className="flex flex-col items-stretch cursor-pointer">
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <div
        className="rounded-lg border-2 border-ficsit-border bg-ficsit-panel px-3 py-2 min-w-[180px]"
        title="다른 레시피 후보 보기"
      >
        <div className="text-xs text-zinc-400 uppercase tracking-wide pointer-events-none">
          {buildingShort || "조립"}
        </div>
        <div className="text-sm text-zinc-100 leading-tight pointer-events-none">
          {displayName(recipe.name)}
        </div>
        <div className="flex items-center gap-1.5 mt-1 pointer-events-none">
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
