import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { displayName, iconUrl, itemBySlug } from "../lib/data";
import {
  buildProductionTree,
  flattenToBom,
  pickDefaultRecipe,
  type BomRow,
} from "../lib/calc";
import { RecipePickerModal } from "../components/RecipePickerModal";
import { ItemBrowser } from "../components/ItemBrowser";
import { TreeView } from "../components/calc-tree";
import { BomTable } from "../components/calc-bom";

type ViewMode = "tree" | "bom";

export function Calculator() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const rootItem = slug ? itemBySlug.get(slug) : undefined;

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [pickingForItem, setPickingForItem] = useState<{
    itemClass: string;
    nodeDemand: number;
  } | null>(null);
  const [rootPickerOpen, setRootPickerOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("tree");
  const [rootQty, setRootQty] = useState(1);
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);

  useEffect(() => {
    setOverrides({});
    setRootQty(1);
    setHighlightedItem(null);
  }, [rootItem?.class_name]);

  const tree = useMemo(() => {
    if (!rootItem) return null;
    return buildProductionTree(rootItem.class_name, overrides, rootQty);
  }, [rootItem, overrides, rootQty]);

  const bom = useMemo(() => (tree ? flattenToBom(tree) : []), [tree]);

  function pickRoot(s: string) {
    setRootPickerOpen(false);
    navigate(s ? `/calc/${s}` : "/calc");
  }

  return (
    <div className="space-y-4 min-w-0">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold break-words">
          생산 BOM
          {rootItem && (
            <>
              {": "}
              <span className="text-ficsit-orange">{displayName(rootItem.name)}</span>
              <span className="text-zinc-500 font-normal text-base ml-2">
                ×{formatSummary(rootQty)}
              </span>
            </>
          )}
        </h1>
        <p className="text-sm text-zinc-400 break-words">
          {rootItem
            ? "출력 수량을 조정하면 재료 양도 비례 계산된다. 레시피 셀을 눌러 대체 레시피로 변경."
            : "만들고 싶은 아이템을 선택하면 생산 BOM 이 만들어진다."}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setRootPickerOpen(true)}
          className="chip hover:border-ficsit-orange hover:text-ficsit-orange"
        >
          {rootItem ? "아이템 변경" : "아이템 선택"}
        </button>

        {rootItem && (
          <div className="inline-flex items-center gap-1 panel px-2 py-1">
            <span className="text-xs text-zinc-500 mr-1">출력 수량</span>
            <button
              onClick={() => setRootQty((q) => Math.max(0.01, Math.round((q - 1) * 100) / 100))}
              className="w-6 h-6 rounded text-zinc-300 hover:bg-ficsit-orange/20 hover:text-ficsit-orange font-mono text-sm"
              aria-label="감소"
            >
              −
            </button>
            <input
              type="number"
              min={0.01}
              step="any"
              value={rootQty}
              onChange={(e) => {
                if (e.target.value === "") {
                  setRootQty(1);
                  return;
                }
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v > 0) setRootQty(v);
              }}
              className="w-20 bg-transparent text-center text-sm font-mono text-ficsit-orange focus:outline-none"
            />
            <button
              onClick={() => setRootQty((q) => Math.round((q + 1) * 100) / 100)}
              className="w-6 h-6 rounded text-zinc-300 hover:bg-ficsit-orange/20 hover:text-ficsit-orange font-mono text-sm"
              aria-label="증가"
            >
              +
            </button>
            {[10, 60, 100].map((preset) => (
              <button
                key={preset}
                onClick={() => setRootQty(preset)}
                className="text-[10px] px-1.5 py-0.5 rounded text-zinc-400 hover:text-ficsit-orange hover:bg-ficsit-orange/10"
              >
                ×{preset}
              </button>
            ))}
            {rootQty !== 1 && (
              <button
                onClick={() => setRootQty(1)}
                className="text-[10px] px-1.5 py-0.5 rounded text-zinc-500 hover:text-ficsit-orange"
              >
                초기화
              </button>
            )}
          </div>
        )}

        {Object.keys(overrides).length > 0 && (
          <button
            onClick={() => setOverrides({})}
            className="chip hover:border-ficsit-orange hover:text-ficsit-orange"
          >
            기본 레시피로 초기화 ({Object.keys(overrides).length}개 변경됨)
          </button>
        )}
      </div>

      {!tree ? (
        <div className="panel p-8 text-center text-zinc-500">
          위에서 아이템을 선택하시오.
        </div>
      ) : (
        <>
          {/* View 토글 */}
          <div className="flex gap-0 border-b border-ficsit-border">
            <ViewTab active={view === "tree"} onClick={() => setView("tree")}>
              🌳 들여쓰기 트리
            </ViewTab>
            <ViewTab active={view === "bom"} onClick={() => setView("bom")}>
              📋 BOM 표
            </ViewTab>
          </div>

          <div className="panel p-3 min-w-0 overflow-x-auto">
            {view === "tree" ? (
              <TreeView
                root={tree}
                onRecipeClick={(itemClass, nodeDemand) =>
                  setPickingForItem({ itemClass, nodeDemand })
                }
                highlightedItem={highlightedItem}
              />
            ) : (
              <BomTable
                rows={bom}
                onRecipeClick={(itemClass, nodeDemand) =>
                  setPickingForItem({ itemClass, nodeDemand })
                }
              />
            )}
          </div>

          {/* 요약 — 원천 + 중간 산물 */}
          <SummarySection
            title="원천 자원 요약"
            subtitle="채굴 · 채집 라인"
            rows={bom.filter((r) => r.isRaw)}
            tone="amber"
            highlightedItem={highlightedItem}
            onItemClick={(cn) => {
              setHighlightedItem(highlightedItem === cn ? null : cn);
              setView("tree");
            }}
            emptyText="원천 자원 없음"
          />
          <SummarySection
            title="중간 산물 요약"
            subtitle="가공이 필요한 산물"
            rows={bom.filter((r) => !r.isRaw && r.depth > 0)}
            tone="zinc"
            highlightedItem={highlightedItem}
            onItemClick={(cn) => {
              setHighlightedItem(highlightedItem === cn ? null : cn);
              setView("tree");
            }}
            emptyText="중간 산물 없음"
          />
        </>
      )}

      {rootPickerOpen && (
        <BrowserModal onClose={() => setRootPickerOpen(false)}>
          <ItemBrowser
            onPick={(s) => pickRoot(s)}
            excludeCategories={["special"]}
          />
        </BrowserModal>
      )}

      {pickingForItem && (
        <RecipePickerModal
          itemClass={pickingForItem.itemClass}
          selectedNodeDemand={pickingForItem.nodeDemand}
          currentRecipeClass={
            overrides[pickingForItem.itemClass] ??
            pickDefaultRecipe(pickingForItem.itemClass)?.class_name ??
            null
          }
          rootItemClass={rootItem?.class_name}
          rootQty={rootQty}
          overrides={overrides}
          onSelect={(recipeClass) => {
            const def = pickDefaultRecipe(pickingForItem.itemClass);
            setOverrides((prev) => {
              const next = { ...prev };
              if (def && def.class_name === recipeClass) {
                delete next[pickingForItem.itemClass];
              } else {
                next[pickingForItem.itemClass] = recipeClass;
              }
              return next;
            });
            setPickingForItem(null);
          }}
          onClose={() => setPickingForItem(null)}
        />
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-ficsit-orange text-ficsit-orange"
          : "border-transparent text-zinc-400 hover:text-zinc-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function formatSummary(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n - Math.round(n)) < 0.001) return Math.round(n).toLocaleString();
  if (n < 100) return n.toFixed(2);
  return Math.round(n).toLocaleString();
}

function SummarySection({
  title,
  subtitle,
  rows,
  tone,
  highlightedItem,
  onItemClick,
  emptyText,
}: {
  title: string;
  subtitle?: string;
  rows: BomRow[];
  tone: "amber" | "zinc";
  highlightedItem: string | null;
  onItemClick: (itemClass: string) => void;
  emptyText: string;
}) {
  return (
    <div className="panel p-3 text-sm">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{title}</span>
        {subtitle && <span className="text-[10px] text-zinc-600">— {subtitle}</span>}
        <span className="text-[10px] text-zinc-600 ml-auto">{rows.length}개</span>
      </div>
      {rows.length === 0 ? (
        <span className="text-zinc-500 text-xs">{emptyText}</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {rows.map((r) => {
            const isHL = highlightedItem === r.itemClass;
            return (
              <button
                key={r.itemClass}
                onClick={() => onItemClick(r.itemClass)}
                title={`${r.item.name.en} — 클릭하면 트리에서 하이라이트`}
                className={[
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded border transition-colors",
                  isHL
                    ? "border-ficsit-orange bg-ficsit-orange/15 text-ficsit-orange"
                    : tone === "amber"
                      ? "border-amber-700/40 bg-amber-950/20 text-amber-200 hover:border-ficsit-orange hover:text-ficsit-orange"
                      : "border-ficsit-border bg-ficsit-panel/60 text-zinc-200 hover:border-ficsit-orange hover:text-ficsit-orange",
                ].join(" ")}
              >
                <img
                  src={iconUrl(r.item.slug)}
                  alt=""
                  width={18}
                  height={18}
                  className="rounded-sm bg-ficsit-dark shrink-0"
                />
                <span className="text-xs truncate max-w-[180px]">
                  {displayName(r.item.name)}
                </span>
                <span className="text-[11px] font-mono text-ficsit-orange whitespace-nowrap">
                  ×{formatSummary(r.demand)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BrowserModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="panel w-full max-w-4xl my-4 sm:my-8 min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-3 border-b border-ficsit-border flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold truncate">아이템 고르기</h3>
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-ficsit-orange shrink-0"
          >
            닫기 (Esc)
          </button>
        </header>
        <div className="p-3 min-w-0">{children}</div>
      </div>
    </div>
  );
}
