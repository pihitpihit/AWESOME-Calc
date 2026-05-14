import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CATEGORY_LABELS, ITEM_CATEGORIES, displayName, iconUrl, items } from "../lib/data";
import type { ItemCategory } from "../types/data";

export function ItemsIndex() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const cat = (params.get("cat") as ItemCategory | null) ?? null;

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return items.filter((it) => {
      if (cat && it.category !== cat) return false;
      if (!norm) return true;
      return (
        it.name.en.toLowerCase().includes(norm) ||
        (it.name.ko ?? "").toLowerCase().includes(norm) ||
        it.class_name.toLowerCase().includes(norm)
      );
    });
  }, [q, cat]);

  function setCat(c: ItemCategory | null) {
    const next = new URLSearchParams(params);
    if (c) next.set("cat", c);
    else next.delete("cat");
    setParams(next);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold">아이템</h1>
          <p className="text-sm text-zinc-400">
            {filtered.length} / {items.length}
            {cat && (
              <>
                {" · "}필터: <span className="text-ficsit-orange">{CATEGORY_LABELS[cat].ko}</span>
                {" "}<button onClick={() => setCat(null)} className="text-zinc-500 underline ml-1">전체</button>
              </>
            )}
          </p>
        </div>
        <input
          type="search"
          placeholder="이름·class_name 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="panel px-3 py-1.5 text-sm focus:outline-none focus:border-ficsit-orange w-64"
        />
      </header>

      <div className="flex flex-wrap gap-1.5">
        <CatBtn onClick={() => setCat(null)} active={!cat}>전체</CatBtn>
        {ITEM_CATEGORIES.map((c) => (
          <CatBtn key={c} onClick={() => setCat(c)} active={cat === c}>
            {CATEGORY_LABELS[c].ko}
          </CatBtn>
        ))}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((it) => (
          <li key={it.class_name}>
            <Link
              to={`/items/${it.slug}`}
              className="panel flex items-center gap-3 p-2 no-underline hover:border-ficsit-orange/50"
            >
              <img
                src={iconUrl(it.slug)}
                alt={it.name.en}
                width={48}
                height={48}
                loading="lazy"
                className="rounded-sm bg-ficsit-dark"
              />
              <div className="min-w-0">
                <div className="text-zinc-100 truncate">{displayName(it.name)}</div>
                <div className="text-xs text-zinc-500 truncate">{it.name.en}</div>
                <div className="text-[10px] text-zinc-600 mt-0.5 flex gap-1.5">
                  <span className="chip">{CATEGORY_LABELS[it.category].ko}</span>
                  {it.is_fluid && <span className="chip">유체</span>}
                  {it.sink_points != null && (
                    <span className="chip">싱크 {it.sink_points}</span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
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
