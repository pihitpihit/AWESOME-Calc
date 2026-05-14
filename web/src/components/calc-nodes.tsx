import { Handle, Position } from "@xyflow/react";
import { Link } from "react-router-dom";
import { displayName, iconUrl } from "../lib/data";
import type { Item, Recipe } from "../types/data";

/**
 * BT 레이아웃: rank 0 (원자재) 가 아래, 최종 산물이 위.
 * 모든 노드: target 핸들 = Bottom, source 핸들 = Top.
 *
 * 모바일 탭 동작 보장:
 *   - nodrag / nopan 으로 xyflow 의 pan/drag 가 touch 를 흡수하지 않게
 *   - touch-manipulation 으로 더블탭 줌 지연 제거
 */

export interface ItemFlowNodeData {
  item: Item;
  isRoot?: boolean;
  /** isRoot 일 때 제공되면 클릭 시 호출. 없으면 Link 로 아이템 상세로 이동. */
  onPickRoot?: () => void;
}

export function ItemFlowNode({ data }: { data: ItemFlowNodeData }) {
  const { item, isRoot, onPickRoot } = data;

  const ringClass = isRoot
    ? "border-ficsit-orange ring-2 ring-ficsit-orange/30"
    : "border-ficsit-border";
  const fluidClass = item.is_fluid ? "ring-1 ring-cyan-400/40" : "";
  const baseClass = [
    "nodrag nopan touch-manipulation",
    "block rounded-full bg-ficsit-panel border-2",
    "w-16 h-16 flex items-center justify-center no-underline",
    "hover:border-ficsit-orange active:border-ficsit-orange",
    ringClass,
    fluidClass,
  ].join(" ");

  const img = (
    <img
      src={iconUrl(item.slug)}
      alt={item.name.en}
      width={44}
      height={44}
      className="rounded-full pointer-events-none"
    />
  );

  const isInteractiveRoot = !!(isRoot && onPickRoot);

  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      {isInteractiveRoot ? (
        <button
          type="button"
          onClick={onPickRoot}
          className={baseClass + " cursor-pointer"}
          title="여기를 눌러 다른 아이템 선택"
        >
          {img}
        </button>
      ) : (
        <Link
          to={`/items/${item.slug}`}
          className={baseClass}
          title={`${item.name.en} (${item.class_name})`}
        >
          {img}
        </Link>
      )}
      <div className="mt-1 text-[11px] text-zinc-200 max-w-[120px] text-center leading-tight truncate">
        {displayName(item.name)}
      </div>
      <Handle type="source" position={Position.Top} className="!opacity-0" />
    </div>
  );
}

/**
 * 비어있는 루트 노드 — 초기 화면에서 사용자가 아직 아이템을 안 골랐을 때.
 * 점선 테두리. 탭하면 ItemBrowser 모달이 열린다.
 */
export function PlaceholderFlowNode({ data }: { data: { onPickRoot: () => void } }) {
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <button
        type="button"
        onClick={data.onPickRoot}
        className="nodrag nopan touch-manipulation block rounded-full bg-ficsit-panel border-2 border-dashed border-ficsit-orange w-16 h-16 flex items-center justify-center cursor-pointer text-3xl text-ficsit-orange/80 hover:bg-ficsit-orange/10 active:bg-ficsit-orange/20"
        title="아이템 선택"
      >
        +
      </button>
      <div className="mt-1 text-[11px] text-zinc-300 text-center max-w-[160px] leading-tight">
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
        className="nodrag nopan touch-manipulation text-left block rounded-lg border-2 border-ficsit-border bg-ficsit-panel px-3 py-2 hover:border-ficsit-orange active:border-ficsit-orange min-w-[180px] cursor-pointer"
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
      </button>
      <Handle type="source" position={Position.Top} className="!opacity-0" />
    </div>
  );
}

export const nodeTypes = {
  itemFlow: ItemFlowNode,
  recipeFlow: RecipeFlowNode,
  placeholderFlow: PlaceholderFlowNode,
};
