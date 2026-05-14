import { useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  ITEM_CATEGORIES,
  displayName,
  iconUrl,
  items,
} from "../lib/data";
import type { Item, ItemCategory } from "../types/data";

type ViewMode = "grid" | "list";

/**
 * 아이템 브라우저 — 검색 + 카테고리 필터 + 그리드/리스트 토글.
 *
 * 사용처:
 *  - Calculator: 루트 미선택 시 인라인 노출 (큰 영역)
 *  - Calculator: 루트 선택 시 모달 안에 노출 (다른 아이템 고르기)
 *
 * `disabledCategories` 로 의미 없는 카테고리(예: special) 숨김.
 * `compact` 로 모달용 축소 모드 (검색바 폭 축소, 그리드 셀 더 작게).
 */
export function ItemBrowser({
  onPick,
  initialQuery = "",
  initialCategory = null,
  initialView = "grid",
  excludeCategories = [],
  compact = false,
}: {
  onPick: (slug: string) => void;
  initialQuery?: string;
  initialCategory?: ItemCategory | null;
  initialView?: ViewMode;
  excludeCategories?: ItemCategory[];
  compact?: boolean;
}) {
  const [q, setQ] = useState(initialQuery);
  const [cat, setCat] = useState<ItemCategory | null>(initialCategory);
  const [view, setView] = useState<ViewMode>(initialView);

  const visibleCategories = useMemo(
    () => ITEM_CATEGORIES.filter((c) => !excludeCategories.includes(c)),
    [excludeCategories],
  );

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return items.filter((it) => {
      if (excludeCategories.includes(it.category)) return false;
      if (cat && it.category !== cat) return false;
      if (!norm) return true;
      return (
        it.name.en.toLowerCase().includes(norm) ||
        (it.name.ko ?? "").toLowerCase().includes(norm) ||
        it.class_name.toLowerCase().includes(norm)
      );
    });
  }, [q, cat, excludeCategories]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          autoFocus={!compact}
          placeholder="이름 · class_name 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={[
            "panel px-3 py-1.5 text-sm focus:outline-none focus:border-ficsit-orange",
            compact ? "flex-1 min-w-[12rem]" : "flex-1 min-w-[14rem] max-w-md",
          ].join(" ")}
        />
        <ViewToggle view={view} onChange={setView} />
        <span className="text-xs text-zinc-500 whitespace-nowrap">
          {filtered.length} / {items.length - excludeCategories.length * 0}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <CatBtn onClick={() => setCat(null)} active={!cat}>
          전체
        </CatBtn>
        {visibleCategories.map((c) => (
          <CatBtn key={c} onClick={() => setCat(c)} active={cat === c}>
            {CATEGORY_LABELS[c].ko}
          </CatBtn>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500 py-6 text-center">매칭되는 아이템이 없다.</p>
      ) : view === "grid" ? (
        <GridList items={filtered} onPick={onPick} compact={compact} />
      ) : (
        <RowList items={filtered} onPick={onPick} />
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div role="tablist" aria-label="보기 모드" className="inline-flex panel p-0.5 text-xs">
      {(["grid", "list"] as const).map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={view === v}
          onClick={() => onChange(v)}
          className={[
            "px-2.5 py-1 rounded",
            view === v ? "bg-ficsit-orange/15 text-ficsit-orange" : "text-zinc-400 hover:text-zinc-200",
          ].join(" ")}
        >
          {v === "grid" ? "격자" : "목록"}
        </button>
      ))}
    </div>
  );
}

function CatBtn({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-2 py-1 text-xs rounded border",
        active
          ? "border-ficsit-orange text-ficsit-orange bg-ficsit-orange/10"
          : "border-ficsit-border text-zinc-300 hover:border-zinc-500",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function GridList({
  items,
  onPick,
  compact,
}: {
  items: Item[];
  onPick: (slug: string) => void;
  compact: boolean;
}) {
  return (
    <ul
      className={[
        "grid gap-2",
        compact
          ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
      ].join(" ")}
    >
      {items.map((it) => (
        <li key={it.class_name}>
          <button
            onClick={() => onPick(it.slug)}
            className="w-full panel p-2 flex flex-col items-center gap-1.5 hover:border-ficsit-orange text-left"
            title={`${it.name.en} (${it.class_name})`}
          >
            <img
              src={iconUrl(it.slug)}
              alt={it.name.en}
              width={48}
              height={48}
              loading="lazy"
              className="rounded-sm bg-ficsit-dark"
            />
            <span className="text-xs text-zinc-100 text-center leading-tight truncate w-full">
              {displayName(it.name)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function RowList({
  items,
  onPick,
}: {
  items: Item[];
  onPick: (slug: string) => void;
}) {
  return (
    <ul className="divide-y divide-ficsit-border panel overflow-hidden">
      {items.map((it) => (
        <li key={it.class_name}>
          <button
            onClick={() => onPick(it.slug)}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-ficsit-dark text-left"
            title={`${it.name.en} (${it.class_name})`}
          >
            <img
              src={iconUrl(it.slug)}
              alt={it.name.en}
              width={32}
              height={32}
              loading="lazy"
              className="rounded-sm bg-ficsit-dark shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-zinc-100 truncate">{displayName(it.name)}</span>
              <span className="block text-xs text-zinc-500 truncate">{it.name.en}</span>
            </span>
            <span className="chip text-[10px] shrink-0">
              {CATEGORY_LABELS[it.category].ko}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
