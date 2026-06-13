import { useMemo, useState } from "react";
import { displayName, iconUrl, itemByClass, perMin, rateLabel } from "../lib/data";
import type { BomRow } from "../lib/calc";

/**
 * BOM 표 — 트리 평탄화 + dedup.
 * 컬럼: Lv / 아이템 / 수량 (×N, 루트 1개 기준) / 분당 (산물) / 레시피 / 빌딩 / 사이클(s).
 * 정렬: depth 오름차순 (위에서 아래로 단계별), 검색 필터, raw 만 보기 토글.
 */

interface BomTableProps {
  rows: BomRow[];
  /** BOM 표에서는 dedup 된 합산값을 nodeDemand 로 전달 (= 전체 수요). */
  onRecipeClick: (outputItemClass: string, nodeDemand: number) => void;
}

function formatNum(n: number): string {
  if (n === 0) return "0";
  if (n < 0.001) return n.toExponential(1);
  if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  if (n < 1) return n.toFixed(3);
  if (n < 100) return n.toFixed(2);
  return Math.round(n).toLocaleString();
}

function buildingShort(cn?: string | null): string {
  if (!cn) return "—";
  return cn.replace(/^Desc_/, "").replace(/_C$/, "").replace(/Mk1$/, "");
}

export function BomTable({ rows, onRecipeClick }: BomTableProps) {
  const [q, setQ] = useState("");
  const [rawOnly, setRawOnly] = useState(false);

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (rawOnly && !r.isRaw) return false;
      if (!norm) return true;
      return (
        r.item.name.en.toLowerCase().includes(norm) ||
        (r.item.name.ko ?? "").toLowerCase().includes(norm) ||
        (r.recipe?.name.en.toLowerCase().includes(norm) ?? false) ||
        (r.recipe?.name.ko?.toLowerCase().includes(norm) ?? false)
      );
    });
  }, [rows, q, rawOnly]);

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="아이템 · 레시피 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="panel px-3 py-1.5 text-sm focus:outline-none focus:border-ficsit-orange flex-1 min-w-[14rem] max-w-md"
        />
        <label className="inline-flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rawOnly}
            onChange={(e) => setRawOnly(e.target.checked)}
            className="accent-[#fa9549]"
          />
          원천 자원만
        </label>
        <span className="text-xs text-zinc-500 ml-auto">
          {filtered.length} / {rows.length}
        </span>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b border-ficsit-border text-zinc-400 text-xs">
            <tr>
              <th className="px-2 py-2 text-center">Lv</th>
              <th className="px-3 py-2">아이템</th>
              <th className="px-3 py-2 text-right">수량 (×, 루트 1)</th>
              <th className="px-3 py-2 text-right">분당</th>
              <th className="px-3 py-2">레시피</th>
              <th className="px-3 py-2">빌딩</th>
              <th className="px-3 py-2 text-right">사이클 수</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const item = itemByClass.get(r.itemClass);
              const rate = r.recipe ? perMin(r.demand, r.recipe.time_seconds) : null;
              return (
                <tr
                  key={r.itemClass}
                  className={[
                    "border-b border-ficsit-border/40",
                    r.isRaw ? "bg-amber-950/20" : "hover:bg-ficsit-panel/50",
                  ].join(" ")}
                >
                  <td className="px-2 py-1.5 text-center font-mono text-xs text-zinc-500">
                    {r.depth}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-2 min-w-0">
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
                          "truncate",
                          r.isRaw ? "text-amber-300 font-medium" : "text-zinc-100",
                        ].join(" ")}
                      >
                        {item ? displayName(item.name) : r.itemClass}
                      </span>
                      {r.isRaw && (
                        <span className="text-[10px] text-amber-500/70 shrink-0">[원천]</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-ficsit-orange whitespace-nowrap">
                    ×{formatNum(r.demand)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-300 whitespace-nowrap">
                    {rate !== null ? (
                      <>
                        {formatNum(rate)}
                        <span className="text-zinc-500">{rateLabel(item)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-200">
                    {r.recipe ? (
                      <button
                        onClick={() => onRecipeClick(r.itemClass, r.demand)}
                        className="hover:text-ficsit-orange text-left truncate inline-flex items-center gap-1.5"
                        title="레시피 변경"
                      >
                        {displayName(r.recipe.name)}
                        {r.recipe.alternate && (
                          <span className="chip-alt text-[9px] shrink-0">대체</span>
                        )}
                      </button>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400 font-mono text-xs whitespace-nowrap">
                    {buildingShort(r.building)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-400 whitespace-nowrap">
                    {r.cycles > 0 ? formatNum(r.cycles) : "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-500 text-sm">
                  매칭되는 항목이 없다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
