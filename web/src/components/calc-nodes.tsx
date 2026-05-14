import { Handle, Position } from "@xyflow/react";
import { Link } from "react-router-dom";
import { displayName, iconUrl } from "../lib/data";
import type { Item, Recipe } from "../types/data";

/**
 * 아이템·유체 노드 — 원형. 아이콘 + 한글 이름.
 * 사용자가 클릭하면 아이템 상세 페이지로 이동.
 */
export function ItemFlowNode({ data }: { data: { item: Item; isRoot?: boolean } }) {
  const { item, isRoot } = data;
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Left} className="!opacity-0" />
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
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
}

/**
 * 빌딩+레시피 노드 — 라운드 사각형.
 * 클릭하면 레시피 상세 페이지로 이동.
 */
export function RecipeFlowNode({ data }: { data: { recipe: Recipe } }) {
  const { recipe } = data;
  const building = recipe.produced_in[0] ?? "";
  const buildingShort = building.replace(/^Desc_/, "").replace(/_C$/, "");
  return (
    <div className="flex flex-col items-stretch">
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Link
        to={`/recipes/${recipe.slug}`}
        className="block rounded-lg border-2 border-ficsit-border bg-ficsit-panel px-3 py-2 no-underline hover:border-ficsit-orange min-w-[160px]"
        title={`${recipe.name.en} (${recipe.class_name})`}
      >
        <div className="text-xs text-zinc-400 uppercase tracking-wide">
          {buildingShort || "조립"}
        </div>
        <div className="text-sm text-zinc-100 leading-tight">
          {displayName(recipe.name)}
        </div>
        {recipe.alternate && (
          <span className="chip-alt mt-1 inline-block text-[10px]">대체</span>
        )}
      </Link>
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
}

export const nodeTypes = {
  itemFlow: ItemFlowNode,
  recipeFlow: RecipeFlowNode,
};
