import { useState } from "react";
import { displayName, iconUrl, itemByClass, perMin, rateLabel } from "../lib/data";
import type { TreeNode } from "../lib/calc";

/**
 * 들여쓰기 트리 — 파일 탐색기 스타일.
 * 각 노드: 펼치기/접기 + 아이콘 + 이름 + (×demand) + 빌딩 · 분당.
 * 클릭 영역:
 *   - chevron / 이름: 펼치기 토글
 *   - 빌딩 라벨: 레시피 변경 (onRecipeClick)
 *   - 아이콘: 다른 아이템 상세로 (옵션 — 일단 navigate)
 */

interface TreeViewProps {
  root: TreeNode;
  /** itemClass 와 그 클릭 위치의 demand 를 함께 넘긴다. */
  onRecipeClick: (outputItemClass: string, nodeDemand: number) => void;
  highlightedItem?: string | null;
}

export function TreeView({ root, onRecipeClick, highlightedItem }: TreeViewProps) {
  return (
    <div className="font-mono text-sm">
      <TreeNodeRow
        node={root}
        depth={0}
        onRecipeClick={onRecipeClick}
        highlightedItem={highlightedItem}
      />
    </div>
  );
}

interface RowProps {
  node: TreeNode;
  depth: number;
  onRecipeClick: (outputItemClass: string, nodeDemand: number) => void;
  highlightedItem?: string | null;
}

function formatNum(n: number): string {
  if (n === 0) return "0";
  if (n < 0.001) return n.toExponential(1);
  if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  if (n < 1) return n.toFixed(3);
  if (n < 100) return n.toFixed(2);
  return Math.round(n).toLocaleString();
}

function TreeNodeRow({ node, depth, onRecipeClick, highlightedItem }: RowProps) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children.length > 0;
  const item = itemByClass.get(node.itemClass);
  const isHighlighted = highlightedItem === node.itemClass;

  // 분당: 이 아이템을 얼마나 / 분 처리해야 하는가
  // recipe 있으면 (cycles * 사이클당_산출) / (recipe.time_seconds / 60) → demand 와 동일 ratio.
  // 대신 cycles 의 분당 환산: cycles 가 사이클 수면 분당 = cycles * 60 / time_seconds.
  // 여기서는 demand 가 "root 1 개 기준 누적 양" 이라 별 의미 없어, 그냥 demand 와 분당 시간 둘 다 표시.
  const ratePerMin = node.recipe ? perMin(node.demand, node.recipe.time_seconds) : null;

  return (
    <>
      <div
        className={[
          "flex items-center gap-1 py-0.5 rounded min-w-0 transition-colors",
          isHighlighted
            ? "bg-ficsit-orange/15 ring-1 ring-ficsit-orange/50"
            : "hover:bg-ficsit-panel/40",
        ].join(" ")}
        style={{ paddingLeft: depth * 16 }}
      >
        <button
          onClick={() => hasChildren && setCollapsed(!collapsed)}
          className={[
            "w-4 h-4 shrink-0 flex items-center justify-center text-zinc-500 hover:text-ficsit-orange",
            hasChildren ? "" : "invisible",
          ].join(" ")}
          aria-label={collapsed ? "펼치기" : "접기"}
        >
          {collapsed ? "▶" : "▼"}
        </button>

        {item && (
          <img
            src={iconUrl(item.slug)}
            alt=""
            width={20}
            height={20}
            className={[
              "rounded-sm bg-ficsit-dark shrink-0",
              item.is_fluid ? "ring-1 ring-cyan-400/40" : "",
            ].join(" ")}
          />
        )}

        <span
          className={[
            "text-xs shrink-0 truncate",
            node.isRaw ? "text-amber-300 font-semibold" : "text-zinc-100",
          ].join(" ")}
        >
          {item ? displayName(item.name) : node.itemClass}
        </span>

        <span className="text-[11px] font-mono text-ficsit-orange shrink-0">
          ×{formatNum(node.demand)}
        </span>

        {node.recipe && (
          <>
            <span className="text-zinc-700 shrink-0">·</span>
            <button
              onClick={() => onRecipeClick(node.itemClass, node.demand)}
              title="레시피 변경"
              className="text-[10px] text-zinc-400 hover:text-ficsit-orange truncate"
            >
              {buildingShort(node.recipe.produced_in[0])} · {displayName(node.recipe.name)}
              {node.recipe.alternate && <span className="text-cyan-400 ml-1">(대체)</span>}
            </button>
            {ratePerMin !== null && (
              <span className="text-[10px] text-zinc-500 font-mono shrink-0 whitespace-nowrap">
                {formatNum(ratePerMin)}{rateLabel(item)}
              </span>
            )}
          </>
        )}

        {node.isRaw && (
          <span className="text-[10px] text-amber-500/70 shrink-0">[원천]</span>
        )}

        {node.cycleStop && (
          <span className="text-[10px] text-red-400 shrink-0" title="사이클 차단">↻</span>
        )}
      </div>

      {!collapsed &&
        node.children.map((c) => (
          <TreeNodeRow
            key={c.id}
            node={c}
            depth={depth + 1}
            onRecipeClick={onRecipeClick}
            highlightedItem={highlightedItem}
          />
        ))}
    </>
  );
}

function buildingShort(cn?: string): string {
  if (!cn) return "—";
  return cn.replace(/^Desc_/, "").replace(/_C$/, "").replace(/Mk1$/, "");
}
