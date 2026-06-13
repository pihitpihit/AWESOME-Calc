import { useEffect, useMemo } from "react";
import { displayName, iconUrl, itemByClass, perMin, rateLabel } from "../lib/data";
import {
  buildProductionTree,
  flattenToBom,
  pickDefaultRecipe,
  recipesForItem,
  type BomRow,
} from "../lib/calc";
import type { Recipe } from "../types/data";

/**
 * 특정 산물에 대해 어떤 레시피를 쓸지 고르는 모달.
 *
 * 각 후보 카드에 다음 통계 표시 (사용자가 root 정보 전달했을 때):
 *   - 분당 생산량
 *   - 빌딩, 사이클 시간
 *   - 가상 BOM 시뮬레이션:
 *       · 이 노드의 수요량 (이 레시피로 바꿨을 때)
 *       · 원천 자원 chips (icon + name + ×demand)
 *       · 중간 산물 chips (옵션)
 *       · 전체 raw 합산
 */
interface Props {
  itemClass: string;
  currentRecipeClass: string | null;
  onSelect: (recipeClass: string) => void;
  onClose: () => void;
  // 시뮬레이션용 root 정보 (없으면 기본 카드만)
  rootItemClass?: string;
  rootQty?: number;
  overrides?: Record<string, string>;
  /** 트리에서 사용자가 클릭한 그 노드 한 위치의 demand. BOM 표에서 클릭 시는 합산값. */
  selectedNodeDemand?: number;
}

interface CandidateStats {
  recipe: Recipe;
  perMinProduct: number;
  productAmount: number;
  thisItemDemand: number; // 가상 BOM 에서 이 itemClass 의 수요량
  rawRows: BomRow[];
  intermediateRows: BomRow[];
  totalRawCount: number; // raw 종류 수
  totalNodes: number; // BOM 행 수
}

export function RecipePickerModal({
  itemClass,
  currentRecipeClass,
  onSelect,
  onClose,
  rootItemClass,
  rootQty = 1,
  overrides = {},
  selectedNodeDemand,
}: Props) {
  const item = itemByClass.get(itemClass);
  const candidates = recipesForItem(itemClass);
  const defaultRecipe = pickDefaultRecipe(itemClass);
  const effectiveCurrent = currentRecipeClass ?? defaultRecipe?.class_name ?? null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 각 후보에 대해 가상 BOM 시뮬레이션 — root 정보가 있을 때만
  const stats = useMemo<Map<string, CandidateStats>>(() => {
    const out = new Map<string, CandidateStats>();
    if (!rootItemClass) return out;
    for (const r of candidates) {
      const productAmount = r.products.find((p) => p.item === itemClass)?.amount ?? 1;
      const perMinProduct = perMin(productAmount, r.time_seconds);
      // 가상 overrides: 이 itemClass 에 이 후보 적용
      const virtualOverrides = { ...overrides, [itemClass]: r.class_name };
      const tree = buildProductionTree(rootItemClass, virtualOverrides, rootQty);
      if (!tree) {
        out.set(r.class_name, {
          recipe: r,
          perMinProduct,
          productAmount,
          thisItemDemand: 0,
          rawRows: [],
          intermediateRows: [],
          totalRawCount: 0,
          totalNodes: 0,
        });
        continue;
      }
      const bom = flattenToBom(tree);
      const thisRow = bom.find((b) => b.itemClass === itemClass);
      const rawRows = bom.filter((b) => b.isRaw);
      const intermediateRows = bom.filter(
        (b) => !b.isRaw && b.depth > 0 && b.itemClass !== itemClass,
      );
      out.set(r.class_name, {
        recipe: r,
        perMinProduct,
        productAmount,
        thisItemDemand: thisRow?.demand ?? 0,
        rawRows,
        intermediateRows,
        totalRawCount: rawRows.length,
        totalNodes: bom.length,
      });
    }
    return out;
  }, [candidates, itemClass, rootItemClass, rootQty, overrides]);

  if (!item) return null;

  // 현재 선택된 후보의 stats — 헤더 요약용
  const currentStats = effectiveCurrent ? stats.get(effectiveCurrent) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="panel max-w-3xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-ficsit-border">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">레시피 선택</div>
          <h3 className="text-lg font-semibold mt-0.5 flex items-center gap-2 flex-wrap">
            <img
              src={iconUrl(item.slug)}
              alt=""
              width={24}
              height={24}
              className="rounded-sm bg-ficsit-dark"
            />
            <span className="text-ficsit-orange">{displayName(item.name)}</span>
            <span className="text-zinc-400 text-sm">를 만드는 레시피</span>
          </h3>
          {rootItemClass && currentStats && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
              {selectedNodeDemand !== undefined && (
                <span>
                  선택 노드 수요:{" "}
                  <span className="text-ficsit-orange font-mono">
                    ×{formatNum(selectedNodeDemand)}
                  </span>
                </span>
              )}
              <span>
                전체 수요 (이 산물 모든 위치 합산):{" "}
                <span className="text-ficsit-orange font-mono">
                  ×{formatNum(currentStats.thisItemDemand)}
                </span>
              </span>
            </div>
          )}
        </header>

        <ul className="flex-1 overflow-y-auto p-2 space-y-2">
          {candidates.length === 0 && (
            <li className="text-sm text-zinc-400 px-2 py-3">
              이 아이템을 만드는 일반 레시피가 없다 (원자재이거나 채취 전용).
            </li>
          )}
          {candidates.map((r) => {
            const isCurrent = r.class_name === effectiveCurrent;
            const isDefault = r.class_name === defaultRecipe?.class_name;
            const s = stats.get(r.class_name);
            return (
              <li key={r.class_name}>
                <button
                  onClick={() => onSelect(r.class_name)}
                  className={[
                    "w-full text-left p-3 rounded border bg-ficsit-dark space-y-2",
                    isCurrent
                      ? "border-ficsit-orange ring-1 ring-ficsit-orange/40"
                      : "border-ficsit-border hover:border-zinc-500",
                  ].join(" ")}
                >
                  {/* 1줄: 레시피 이름 + 뱃지 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-zinc-100 font-medium">{displayName(r.name)}</span>
                    {r.alternate && <span className="chip-alt text-[10px]">대체</span>}
                    {isDefault && <span className="chip text-[10px]">기본</span>}
                    {isCurrent && (
                      <span className="chip text-[10px] text-ficsit-orange border-ficsit-orange">
                        선택됨
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-500 ml-auto">{r.unlock.ko}</span>
                  </div>

                  {/* 2줄: 빌딩 · 사이클 · 분당 생산 · 이 노드 수요 */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-mono text-zinc-400">
                      {buildingShort(r.produced_in[0])}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-400">
                      {r.time_seconds}s, 사이클당 ×{r.products.find((p) => p.item === itemClass)?.amount ?? "?"}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-200 font-mono">
                      {s ? formatNum(s.perMinProduct) : "—"}
                      {rateLabel(item)} 생산
                    </span>
                    {s && rootItemClass && (
                      <>
                        <span className="text-zinc-600">·</span>
                        <span className="text-ficsit-orange font-mono">
                          전체 수요 ×{formatNum(s.thisItemDemand)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* 3줄: 사이클 재료 */}
                  <div className="text-xs">
                    <span className="text-zinc-500">재료: </span>
                    {r.ingredients.map((ing, i) => {
                      const it = itemByClass.get(ing.item);
                      return (
                        <span key={i} className="inline-flex items-center gap-1 mr-2">
                          {it && (
                            <img
                              src={iconUrl(it.slug)}
                              alt=""
                              width={14}
                              height={14}
                              className="rounded-sm bg-ficsit-dark inline-block align-middle"
                            />
                          )}
                          <span className="text-zinc-300">
                            ×{ing.amount} {it ? displayName(it.name) : ing.item}
                          </span>
                        </span>
                      );
                    })}
                  </div>

                  {/* 4-5줄: 가상 BOM 미리보기 (rootItemClass 있을 때만) */}
                  {s && rootItemClass && (
                    <>
                      {s.rawRows.length > 0 && (
                        <ChipRow
                          label="원천"
                          rows={s.rawRows}
                          tone="amber"
                        />
                      )}
                      {s.intermediateRows.length > 0 && (
                        <ChipRow
                          label="중간"
                          rows={s.intermediateRows}
                          tone="zinc"
                          limit={8}
                        />
                      )}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <footer className="p-3 border-t border-ficsit-border text-right">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-zinc-300 hover:text-ficsit-orange"
          >
            닫기 (Esc)
          </button>
        </footer>
      </div>
    </div>
  );
}

function ChipRow({
  label,
  rows,
  tone,
  limit,
}: {
  label: string;
  rows: BomRow[];
  tone: "amber" | "zinc";
  limit?: number;
}) {
  const shown = limit && rows.length > limit ? rows.slice(0, limit) : rows;
  const more = limit && rows.length > limit ? rows.length - limit : 0;
  return (
    <div className="flex flex-wrap items-start gap-1.5">
      <span
        className={[
          "text-[10px] uppercase tracking-wide pt-0.5",
          tone === "amber" ? "text-amber-400/80" : "text-zinc-500",
        ].join(" ")}
      >
        {label}
      </span>
      {shown.map((r) => (
        <span
          key={r.itemClass}
          className={[
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border",
            tone === "amber"
              ? "border-amber-700/40 bg-amber-950/30 text-amber-200"
              : "border-ficsit-border bg-ficsit-panel/60 text-zinc-300",
          ].join(" ")}
        >
          <img
            src={iconUrl(r.item.slug)}
            alt=""
            width={12}
            height={12}
            className="rounded-sm"
          />
          <span className="truncate max-w-[120px]">{displayName(r.item.name)}</span>
          <span className="text-ficsit-orange font-mono">×{formatNum(r.demand)}</span>
        </span>
      ))}
      {more > 0 && (
        <span className="text-[10px] text-zinc-500 pt-0.5">+{more}개 더</span>
      )}
    </div>
  );
}

function formatNum(n: number): string {
  if (n === 0) return "0";
  if (n < 0.001) return n.toExponential(1);
  if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  if (n < 1) return n.toFixed(3);
  if (n < 100) return n.toFixed(2);
  return Math.round(n).toLocaleString();
}

function buildingShort(cn?: string): string {
  if (!cn) return "—";
  return cn.replace(/^Desc_/, "").replace(/_C$/, "").replace(/Mk1$/, "");
}
