import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { UNLOCK_LABELS, displayName, itemByClass, perMin, rateLabel, recipes } from "../lib/data";

const SOURCE_OPTIONS = ["default", "tutorial", "milestone", "mam", "alternate", "other"] as const;

export function RecipesIndex() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const altOnly = params.get("alt") === "true";
  const source = params.get("source");

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return recipes.filter((r) => {
      if (altOnly && !r.alternate) return false;
      if (source && r.unlock.source !== source) return false;
      if (r.for_building) return false; // 빌딩 건축 레시피는 위키 인덱스에서 제외
      if (!norm) return true;
      return (
        r.name.en.toLowerCase().includes(norm) ||
        (r.name.ko ?? "").toLowerCase().includes(norm) ||
        r.class_name.toLowerCase().includes(norm)
      );
    });
  }, [q, altOnly, source]);

  function toggle(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value == null) next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold">레시피</h1>
          <p className="text-sm text-zinc-400">
            {filtered.length} / {recipes.length}{" "}
            <span className="text-zinc-600">(빌딩 건축 레시피 제외)</span>
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

      <div className="flex flex-wrap gap-2 text-xs items-center">
        <span className="text-zinc-500">필터:</span>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={altOnly}
            onChange={(e) => toggle("alt", e.target.checked ? "true" : null)}
          />
          대체만
        </label>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-500">획득:</span>
        <button
          onClick={() => toggle("source", null)}
          className={`chip ${!source ? "chip-alt" : ""}`}
        >
          전체
        </button>
        {SOURCE_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => toggle("source", s)}
            className={`chip ${source === s ? "chip-alt" : ""}`}
          >
            {UNLOCK_LABELS[s]?.ko ?? s}
          </button>
        ))}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b border-ficsit-border text-zinc-400 text-xs">
            <tr>
              <th className="px-3 py-2">레시피</th>
              <th className="px-3 py-2">획득</th>
              <th className="px-3 py-2">생산 빌딩</th>
              <th className="px-3 py-2 text-right">시간(s)</th>
              <th className="px-3 py-2 text-right">분당 산물</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const main = r.products[0];
              const mainItem = main ? itemByClass.get(main.item) : undefined;
              const rate = main ? perMin(main.amount, r.time_seconds) : null;
              return (
                <tr key={r.class_name} className="border-b border-ficsit-border/40 hover:bg-ficsit-panel/50">
                  <td className="px-3 py-1.5">
                    <Link to={`/recipes/${r.slug}`} className="no-underline text-zinc-100 hover:text-ficsit-orange">
                      {displayName(r.name)}
                    </Link>
                    {r.alternate && <span className="chip-alt ml-2">대체</span>}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400">{r.unlock.ko}</td>
                  <td className="px-3 py-1.5 text-zinc-400 font-mono text-xs">
                    {r.produced_in.length === 0 ? "—" : r.produced_in.map(stripDesc).join(", ")}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-400">{r.time_seconds}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-300 whitespace-nowrap">
                    {rate !== null && mainItem ? (
                      <>
                        {rate}
                        <span className="text-zinc-500">{rateLabel(mainItem)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function stripDesc(cn: string) {
  return cn.replace(/^Desc_/, "").replace(/_C$/, "");
}
