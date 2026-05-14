import { Handle, Position } from "@xyflow/react";
import { Link } from "react-router-dom";
import { displayName, iconUrl } from "../lib/data";
import type { Item, Recipe } from "../types/data";

/**
 * BT 레이아웃: rank 0 (원자재) 가 아래, rank N (최종 산물) 이 위.
 * 모든 노드: target 핸들 = Bottom (들어옴), source 핸들 = Top (나감).
 */

export function ItemFlowNode({ data }: { data: { item: Item; isRoot?: boolean } }) {
  const { item, isRoot } = data;
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <Link
        to={`/items/${item.slug}`}
        className={[
          "block rounded-full bg-ficsit-panel border-2",
          isRoot ? "border-ficsit-orange ring-2 ring-ficsit-orange/30" : "border-ficsit-border",
          "w-16 h-16 flex items-center justify-center no-underline hover:border-ficsit-orange",
          item.is_fluid ? "ring-1 ring-cyan-400/40" : "",
        ].join(" ")}
        title={`${item.name.en} (${item.class_name})`}
      >
        <img
          src={iconUrl(item.slug)}
          alt={item.name.en}
          width={44}
          height={44}
          className="rounded-full"
        />
      </Link>
      <div className="mt-1 text-[11px] text-zinc-200 max-w-[120px] text-center leading-tight truncate">
        {displayName(item.name)}
      </div>
      <Handle type="source" position={Position.Top} className="!opacity-0" />
    </div>
  );
}

export interface RecipeFlowNodeData {
  recipe: Recipe;
  outputItemClass: string;
  onPick: (outputItemClass: string) => void;
}

export function RecipeFlowNode({ data }: { data: RecipeFlowNodeData }) {
  const { recipe, outputItemClass, onPick } = data;
  const building = recipe.produced_in[0] ?? "";
  const buildingShort = building.replace(/^Desc_/, "").replace(/_C$/, "");
  return (
    <div className="flex flex-col items-stretch">
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPick(outputItemClass);
        }}
        className="text-left block rounded-lg border-2 border-ficsit-border bg-ficsit-panel px-3 py-2 hover:border-ficsit-orange min-w-[180px] cursor-pointer"
        title="클릭해서 다른 레시피 후보 보기"
      >
        <div className="text-xs text-zinc-400 uppercase tracking-wide">
          {buildingShort || "조립"}
        </div>
        <div className="text-sm text-zinc-100 leading-tight">{displayName(recipe.name)}</div>
        <div className="flex items-center gap-1.5 mt-1">
          {recipe.alternate && <span className="chip-alt text-[10px]">대체</span>}
          <span className="text-[10px] text-zinc-500">클릭하여 변경</span>
        </div>
      </button>
      <Handle type="source" position={Position.Top} className="!opacity-0" />
    </div>
  );
}

export const nodeTypes = {
  itemFlow: ItemFlowNode,
  recipeFlow: RecipeFlowNode,
};
