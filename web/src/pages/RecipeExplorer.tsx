import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CATEGORY_LABELS,
  ITEM_CATEGORIES,
  displayName,
  iconUrl,
  itemByClass,
  items,
  perMin,
  rateLabel,
  recipes,
} from "../lib/data";
import type { Item, ItemCategory, Recipe } from "../types/data";

/**
 * 어떤 레시피(빌딩 건축 제외)에서도 재료로 등장하는 아이템 class_name 집합.
 * 모드 A에서 "유효한 재료" 판정에 사용. 모듈 로드 시 1회 계산.
 */
const INGREDIENT_CLASSES: Set<string> = new Set(
  recipes
    .filter((r) => !r.for_building)
    .flatMap((r) => r.ingredients.map((s) => s.item)),
);

/**
 * 원자재(raw) 수동 큐레이션 순서 — 게임 진행 흐름 기준.
 * Tier 0~9 의 milestone 정보와 MAM 시점, 일반적 플레이 흐름을 고려한 직관적 순서.
 * 누락 시 999 로 떨어져 한글명 정렬로 fallback.
 */
const RAW_ORDER: Record<string, number> = {
  Desc_OreIron_C: 1,        // 철광석 — HUB 시작
  Desc_OreCopper_C: 2,      // 구리 광석 — HUB 시작
  Desc_Stone_C: 3,          // 석회암 — Tier 0 (콘크리트)
  Desc_Coal_C: 4,           // 석탄 — Tier 3 (강철/석탄 발전)
  Desc_Water_C: 5,          // 물 — 워터 익스트랙터 (Tier 3 전후)
  Desc_OreGold_C: 6,        // 카테륨 광석 — MAM 초중반
  Desc_RawQuartz_C: 7,      // 천연 석영 — MAM 중반
  Desc_Sulfur_C: 8,         // 황 — MAM 중반
  Desc_LiquidOil_C: 9,      // 원유 — Tier 5 (오일 가공)
  Desc_OreBauxite_C: 10,    // 보크사이트 — Tier 7 (알루미늄)
  Desc_OreUranium_C: 11,    // 우라늄 — Tier 8 (원자력)
  Desc_NitrogenGas_C: 12,   // 질소 가스 — Tier 7+ (질소 가스)
  Desc_SAM_C: 13,           // SAM — Tier 8 후반
};

/**
 * 카테고리 우선순위 — 게임 흐름 기반.
 * raw(채굴) → biomass(채집) → ingot(제련) → part(가공) → fluid → fuel → ammo → equipment → nuclear → special
 * 같은 티어 내에서의 그룹핑에 사용.
 */
const CATEGORY_PRIORITY: Record<string, number> = {
  raw: 0,
  biomass: 1,
  ingot: 2,
  part: 3,
  fluid: 4,
  fuel: 5,
  ammo: 6,
  equipment: 7,
  nuclear: 8,
  special: 9,
};

/**
 * 게임 흐름 기반 아이템 정렬.
 *
 * 정렬 우선순위:
 *   1) 최단 획득 티어 — 자세한 계산 규칙은 itemEarliestTier 참고
 *   2) 같은 티어 내에서 원자재끼리는 RAW_ORDER (수동 큐레이션)
 *   3) CATEGORY_PRIORITY (raw → biomass → ingot → part → ...)
 *   4) 한글 이름
 *
 * 레시피 티어 추정:
 *   - default / tutorial: 0 (하지만 후술하는 이유로 보조 용도)
 *   - milestone (tier 명시): 해당 tier
 *   - mam: 2 (대략 초반-중반)
 *   - alternate (하드 드라이브): 100 (보통 후반)
 *   - 기타: 99
 *
 * 아이템 티어 계산 — 같은 아이템에 default + milestone 레시피가 공존하는 경우
 * (예: Ficsite Ingot — Converter 가 Tier 9 에 unlock 되지만 레시피 자체는 default)
 * milestone 정보를 우선 사용해야 정확. produced_by 가 없는 채집형(biomass) 은 0 으로.
 */
const SORTED_ITEMS: Item[] = (() => {
  function recipeTier(r: Recipe): number {
    const u = r.unlock;
    if (u.source === "default" || u.source === "tutorial") return 0;
    if (typeof u.tier === "number") return u.tier;
    if (u.source === "mam") return 2;
    if (u.source === "alternate") return 100;
    return 99;
  }

  // source 정보가 필요해서 tier 와 isDefault 모두 저장
  const recipeMeta = new Map<string, { tier: number; isDefault: boolean }>();
  for (const r of recipes) {
    const u = r.unlock;
    recipeMeta.set(r.class_name, {
      tier: recipeTier(r),
      isDefault: u.source === "default" || u.source === "tutorial",
    });
  }

  function itemEarliestTier(it: Item): number {
    if (it.category === "raw") return -1;
    if (it.produced_by.length === 0) {
      // 채집형(잎, 나무, 균사체, 외계 단백질 등) — 게임 시작부터 채집 가능
      return it.category === "biomass" ? 0 : 99;
    }
    // milestone/mam/alternate 정보가 있는 producer 를 우선.
    // 같은 아이템에 default + milestone 둘 다 있으면 milestone 이 실제 unlock 시점에 더 가까움
    // (default 레시피라도 빌딩 자체가 후반 unlock 인 경우가 있음 — Ficsite 가 그 예).
    let minDefault = Infinity;
    let minSpecific = Infinity;
    for (const ref of it.produced_by) {
      const m = recipeMeta.get(ref.recipe);
      if (!m) continue;
      if (m.isDefault) {
        if (m.tier < minDefault) minDefault = m.tier;
      } else {
        if (m.tier < minSpecific) minSpecific = m.tier;
      }
    }
    if (minSpecific !== Infinity) return minSpecific;
    if (minDefault !== Infinity) return minDefault;
    return 99;
  }

  return [...items].sort((a, b) => {
    const ta = itemEarliestTier(a);
    const tb = itemEarliestTier(b);
    if (ta !== tb) return ta - tb;
    // 같은 티어 — 둘 다 원자재면 큐레이션 순서
    if (a.category === "raw" && b.category === "raw") {
      const oa = RAW_ORDER[a.class_name] ?? 999;
      const ob = RAW_ORDER[b.class_name] ?? 999;
      if (oa !== ob) return oa - ob;
    }
    const ca = CATEGORY_PRIORITY[a.category] ?? 99;
    const cb = CATEGORY_PRIORITY[b.category] ?? 99;
    if (ca !== cb) return ca - cb;
    return (a.name.ko ?? a.name.en).localeCompare(b.name.ko ?? b.name.en, "ko");
  });
})();

// ── Page ──────────────────────────────────────────────────────────────────────

export function RecipeExplorer() {
  const [mode, setMode] = useState<"ingredient" | "product">("ingredient");

  // Mode A
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [matchMode, setMatchMode] = useState<"any" | "all">("any");

  // Mode B
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  function toggleIngredient(cn: string) {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(cn)) next.delete(cn);
      else next.add(cn);
      return next;
    });
  }

  function toggleProduct(cn: string) {
    setSelectedProduct((prev) => (prev === cn ? null : cn));
  }

  function toggleProductsAsIngredients(recipe: Recipe) {
    const productClasses = recipe.products.map((s) => s.item);
    setSelectedIngredients((prev) => {
      const isActive = productClasses.every((cn) => prev.has(cn));
      const next = new Set(prev);
      if (isActive) {
        productClasses.forEach((cn) => next.delete(cn));
      } else {
        productClasses.forEach((cn) => next.add(cn));
      }
      return next;
    });
  }

  const ingredientResults = useMemo(() => {
    if (selectedIngredients.size === 0) return [];
    return recipes.filter((r) => {
      if (r.for_building) return false;
      if (matchMode === "any") return r.ingredients.some((s) => selectedIngredients.has(s.item));
      return r.ingredients.length > 0 && r.ingredients.every((s) => selectedIngredients.has(s.item));
    });
  }, [selectedIngredients, matchMode]);

  const productResults = useMemo(() => {
    if (!selectedProduct) return [];
    return recipes.filter(
      (r) => !r.for_building && r.products.some((s) => s.item === selectedProduct),
    );
  }, [selectedProduct]);

  const productSelectedSet = useMemo(
    () => (selectedProduct ? new Set([selectedProduct]) : new Set<string>()),
    [selectedProduct],
  );

  return (
    <div className="min-w-0">
      {/*
       * 상단 sticky 영역 — Layout 헤더(h-12) 바로 아래에 고정.
       * 모드 탭, 선택된 칩, 검색 방식까지 포함. 재료 그리드는 이 아래에서 스크롤.
       * bg-ficsit-dark 로 스크롤되는 그리드 내용을 가린다.
       */}
      <div className="sticky top-12 z-20 bg-ficsit-dark py-3 space-y-3 border-b border-ficsit-border">
        <header>
          <h1 className="text-2xl font-bold">레시피 탐색기</h1>
          <p className="text-sm text-zinc-400">재료 또는 산물로 레시피를 찾는다.</p>
        </header>

        <div className="flex gap-0 border-b border-ficsit-border">
          <ModeTab active={mode === "ingredient"} onClick={() => setMode("ingredient")}>
            재료로 찾기
          </ModeTab>
          <ModeTab active={mode === "product"} onClick={() => setMode("product")}>
            산물로 찾기
          </ModeTab>
        </div>

        {mode === "ingredient" ? (
          <IngredientTopBar
            selected={selectedIngredients}
            onToggle={toggleIngredient}
            onClearAll={() => setSelectedIngredients(new Set())}
            matchMode={matchMode}
            onMatchModeChange={setMatchMode}
          />
        ) : (
          <ProductTopBar selected={selectedProduct} onClear={() => setSelectedProduct(null)} />
        )}
      </div>

      {/* 스크롤 영역 — 재료 그리드 + 검색 결과 */}
      <div className="pt-4 space-y-4 min-w-0">
        {mode === "ingredient" ? (
          <>
            <ItemPickerGrid
              selected={selectedIngredients}
              onToggle={toggleIngredient}
              validClasses={INGREDIENT_CLASSES}
            />
            <RecipeResultList
              recipes={ingredientResults}
              highlightClasses={selectedIngredients}
              selectedIngredients={selectedIngredients}
              onToggleProducts={toggleProductsAsIngredients}
            />
          </>
        ) : (
          <>
            <ItemPickerGrid
              selected={productSelectedSet}
              onToggle={toggleProduct}
            />
            <RecipeResultList recipes={productResults} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Top bars (sticky 영역의 mode-specific 컨트롤) ──────────────────────────────

function IngredientTopBar({
  selected,
  onToggle,
  onClearAll,
  matchMode,
  onMatchModeChange,
}: {
  selected: Set<string>;
  onToggle: (cn: string) => void;
  onClearAll: () => void;
  matchMode: "any" | "all";
  onMatchModeChange: (m: "any" | "all") => void;
}) {
  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-500 shrink-0">선택된 재료:</span>
          {[...selected].map((cn) => {
            const item = itemByClass.get(cn);
            if (!item) return null;
            return (
              <button
                key={cn}
                onClick={() => onToggle(cn)}
                className="chip inline-flex items-center gap-1 hover:border-ficsit-orange hover:text-ficsit-orange"
              >
                <img src={iconUrl(item.slug)} width={14} height={14} className="rounded-sm" alt="" />
                <span>{displayName(item.name)}</span>
                <span className="text-zinc-500 ml-0.5">×</span>
              </button>
            );
          })}
          <button
            onClick={onClearAll}
            className="text-xs text-zinc-500 hover:text-ficsit-orange"
          >
            전체 해제
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-xs text-zinc-500 shrink-0">검색 방식:</span>
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="radio"
            checked={matchMode === "any"}
            onChange={() => onMatchModeChange("any")}
            className="accent-[#fa9549]"
          />
          <span className="text-xs">이 재료가 포함된 레시피</span>
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="radio"
            checked={matchMode === "all"}
            onChange={() => onMatchModeChange("all")}
            className="accent-[#fa9549]"
          />
          <span className="text-xs">이 재료만으로 만들 수 있는 레시피</span>
        </label>
      </div>
    </div>
  );
}

function ProductTopBar({
  selected,
  onClear,
}: {
  selected: string | null;
  onClear: () => void;
}) {
  if (!selected) return null;
  const item = itemByClass.get(selected);
  if (!item) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">선택된 산물:</span>
      <button
        onClick={onClear}
        className="chip inline-flex items-center gap-1 hover:border-ficsit-orange hover:text-ficsit-orange"
      >
        <img src={iconUrl(item.slug)} width={14} height={14} className="rounded-sm" alt="" />
        <span>{displayName(item.name)}</span>
        <span className="text-zinc-500 ml-0.5">×</span>
      </button>
    </div>
  );
}

// ── Item Picker Grid ──────────────────────────────────────────────────────────

function ItemPickerGrid({
  selected,
  onToggle,
  validClasses,
}: {
  selected: Set<string>;
  onToggle: (cn: string) => void;
  /** 지정 시 이 집합 외 아이템은 표시만 되고 클릭 비활성화. 미지정 시 전체 클릭 가능. */
  validClasses?: Set<string>;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ItemCategory | null>(null);

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return SORTED_ITEMS.filter((it) => {
      if (it.category === "special") return false;
      if (cat && it.category !== cat) return false;
      if (!norm) return true;
      return (
        it.name.en.toLowerCase().includes(norm) ||
        (it.name.ko ?? "").toLowerCase().includes(norm)
      );
    });
  }, [q, cat]);

  return (
    <div className="panel p-3 space-y-3 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="이름 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="panel px-3 py-1.5 text-sm focus:outline-none focus:border-ficsit-orange flex-1 min-w-[10rem]"
        />
        {selected.size > 0 && (
          <span className="text-xs text-zinc-500 shrink-0">{selected.size}개 선택</span>
        )}
        <span className="text-xs text-zinc-600 shrink-0">{filtered.length}개</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <CatBtn active={!cat} onClick={() => setCat(null)}>전체</CatBtn>
        {ITEM_CATEGORIES.filter((c) => c !== "special").map((c) => (
          <CatBtn key={c} active={cat === c} onClick={() => setCat(c)}>
            {CATEGORY_LABELS[c].ko}
          </CatBtn>
        ))}
      </div>

      <ul className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
        {filtered.map((it) => (
          <ItemCell
            key={it.class_name}
            item={it}
            selected={selected.has(it.class_name)}
            onToggle={onToggle}
            disabled={validClasses !== undefined && !validClasses.has(it.class_name)}
          />
        ))}
      </ul>
    </div>
  );
}

function ItemCell({
  item,
  selected,
  onToggle,
  disabled = false,
}: {
  item: Item;
  selected: boolean;
  onToggle: (cn: string) => void;
  disabled?: boolean;
}) {
  const stateClass = selected
    ? "border-ficsit-orange bg-ficsit-orange/10 text-ficsit-orange"
    : disabled
      ? "text-zinc-500 cursor-not-allowed"
      : "border-zinc-400 text-zinc-200 hover:border-ficsit-orange hover:text-ficsit-orange";

  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(item.class_name)}
        disabled={disabled}
        title={
          disabled
            ? `${item.name.en} — 이 아이템을 재료로 쓰는 레시피 없음`
            : item.name.en
        }
        className={[
          "w-full panel p-1.5 flex flex-col items-center gap-1 text-center transition-colors",
          stateClass,
        ].join(" ")}
      >
        <img
          src={iconUrl(item.slug)}
          alt={item.name.en}
          width={36}
          height={36}
          loading="lazy"
          className={["rounded-sm bg-ficsit-dark", disabled && !selected ? "opacity-40" : ""].join(" ")}
        />
        <span className="text-[10px] leading-tight truncate w-full">
          {displayName(item.name)}
        </span>
      </button>
    </li>
  );
}

// ── Results ───────────────────────────────────────────────────────────────────

function RecipeResultList({
  recipes: list,
  highlightClasses,
  selectedIngredients,
  onToggleProducts,
}: {
  recipes: Recipe[];
  highlightClasses?: Set<string>;
  selectedIngredients?: Set<string>;
  onToggleProducts?: (recipe: Recipe) => void;
}) {
  if (list.length === 0) return null;
  return (
    <div className="space-y-3 min-w-0">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">
        결과{" "}
        <span className="text-ficsit-orange font-semibold">{list.length}</span>개
      </div>
      <div className="space-y-2">
        {list.map((r) => (
          <RecipeCard
            key={r.class_name}
            recipe={r}
            highlightClasses={highlightClasses}
            selectedIngredients={selectedIngredients}
            onToggleProducts={onToggleProducts}
          />
        ))}
      </div>
    </div>
  );
}

function RecipeCard({
  recipe,
  highlightClasses,
  selectedIngredients,
  onToggleProducts,
}: {
  recipe: Recipe;
  highlightClasses?: Set<string>;
  selectedIngredients?: Set<string>;
  onToggleProducts?: (recipe: Recipe) => void;
}) {
  const building = recipe.produced_in[0]
    ? recipe.produced_in[0].replace(/^Desc_/, "").replace(/_C$/, "")
    : recipe.in_hand
      ? "손 제작"
      : recipe.in_workshop
        ? "작업대"
        : "—";

  const productsActive =
    selectedIngredients !== undefined &&
    recipe.products.length > 0 &&
    recipe.products.every((s) => selectedIngredients.has(s.item));

  /**
   * 산물 중 하나라도 다른 레시피의 재료로 쓰이는 경우에만 토글 버튼 노출.
   * 어떤 레시피도 이 산물들을 재료로 쓰지 않으면 추가해도 새 결과가 안 나오므로 무의미.
   */
  const hasUsefulProducts = recipe.products.some((s) => INGREDIENT_CLASSES.has(s.item));

  return (
    <div className="panel p-3 space-y-2 min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <Link
          to={`/recipes/${recipe.slug}`}
          className="text-sm font-medium text-zinc-100 hover:text-ficsit-orange no-underline truncate"
        >
          {displayName(recipe.name)}
        </Link>
        {recipe.alternate && <span className="chip-alt shrink-0">대체</span>}
        <span className="chip text-[10px] text-zinc-400 shrink-0">{recipe.unlock.ko}</span>
        {onToggleProducts && hasUsefulProducts && (
          <button
            onClick={() => onToggleProducts(recipe)}
            title={productsActive ? "산물을 재료에서 제거" : "산물을 재료에 추가"}
            className={[
              "ml-auto shrink-0 chip transition-colors",
              productsActive
                ? "border-ficsit-orange text-ficsit-orange bg-ficsit-orange/10 hover:bg-ficsit-orange/20"
                : "text-zinc-500 hover:border-zinc-400 hover:text-zinc-200",
            ].join(" ")}
          >
            {productsActive ? "✓ 재료에 추가됨" : "+ 재료에 추가"}
          </button>
        )}
      </div>

      {/* Ingredients → Products */}
      <div className="flex items-start gap-2 min-w-0 flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-0 flex flex-wrap gap-x-3 gap-y-1">
          {recipe.ingredients.length === 0 ? (
            <span className="text-xs text-zinc-500">재료 없음</span>
          ) : (
            recipe.ingredients.map((s, i) => {
              const item = itemByClass.get(s.item);
              const highlighted = highlightClasses?.has(s.item);
              const rate = perMin(s.amount, recipe.time_seconds);
              return (
                <div
                  key={i}
                  className={[
                    "inline-flex items-center gap-1",
                    highlighted ? "text-ficsit-orange" : "text-zinc-300",
                  ].join(" ")}
                >
                  {item && (
                    <img
                      src={iconUrl(item.slug)}
                      width={18}
                      height={18}
                      className="rounded-sm bg-ficsit-dark shrink-0"
                      alt=""
                    />
                  )}
                  <span className="text-xs whitespace-nowrap">
                    ×{s.amount} {item ? displayName(item.name) : s.item}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                    {rate}{rateLabel(item)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <span className="text-zinc-500 text-sm shrink-0 self-center">→</span>

        <div className="flex-1 min-w-0 flex flex-wrap gap-x-3 gap-y-1">
          {recipe.products.map((s, i) => {
            const item = itemByClass.get(s.item);
            const rate = perMin(s.amount, recipe.time_seconds);
            return (
              <div key={i} className="inline-flex items-center gap-1 text-zinc-100">
                {item && (
                  <img
                    src={iconUrl(item.slug)}
                    width={18}
                    height={18}
                    className="rounded-sm bg-ficsit-dark shrink-0"
                    alt=""
                  />
                )}
                <span className="text-xs whitespace-nowrap">
                  ×{s.amount} {item ? displayName(item.name) : s.item}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                  {rate}{rateLabel(item)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="text-[10px] font-mono text-zinc-500">
        {recipe.time_seconds}s · {building}
      </div>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function ModeTab({
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

function CatBtn({
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
        "px-2 py-0.5 text-xs rounded border",
        active
          ? "border-ficsit-orange text-ficsit-orange bg-ficsit-orange/10"
          : "border-ficsit-border text-zinc-300 hover:border-zinc-500",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
