import { Link } from "react-router-dom";
import {
  displayName,
  iconUrl,
  itemByClass,
  perMin,
  rateLabel,
} from "../lib/data";
import type { Recipe, Stack } from "../types/data";

/**
 * 레시피 정보를 카드로 펼쳐 보이는 공통 컴포넌트.
 * 비교 시나리오 (이 산물을 만드는 N개 후보 / 이 산물을 쓰는 N개 레시피 등)
 * 에서 한 화면에 재료·산물·분당이 함께 보이도록.
 *
 * highlightItemClass 가 주어지면 그 itemClass 의 stack 을 오렌지로 강조
 * (= "이 페이지의 주인공" 표시).
 */
export function RecipeCard({
  recipe,
  highlightItemClass,
}: {
  recipe: Recipe;
  highlightItemClass?: string;
}) {
  const building = recipe.produced_in[0];
  const buildingShort = building
    ? building.replace(/^Desc_/, "").replace(/_C$/, "").replace(/Mk1$/, "")
    : recipe.in_workshop
      ? "작업대"
      : "—";

  return (
    <div className="panel p-3 space-y-2 min-w-0">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <Link
          to={`/recipes/${recipe.slug}`}
          className="text-sm font-semibold text-zinc-100 hover:text-ficsit-orange no-underline truncate"
        >
          {displayName(recipe.name)}
        </Link>
        {recipe.alternate && <span className="chip-alt text-[10px] shrink-0">대체</span>}
        <span className="chip text-[10px] text-zinc-400 ml-auto shrink-0">{recipe.unlock.ko}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
        <span className="font-mono">{buildingShort}</span>
        <span className="text-zinc-600">·</span>
        <span>{recipe.time_seconds}s 사이클</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <StackList
          label="재료"
          stacks={recipe.ingredients}
          timeSeconds={recipe.time_seconds}
          highlightItemClass={highlightItemClass}
        />
        <StackList
          label="산물"
          stacks={recipe.products}
          timeSeconds={recipe.time_seconds}
          highlightItemClass={highlightItemClass}
        />
      </div>
    </div>
  );
}

function StackList({
  label,
  stacks,
  timeSeconds,
  highlightItemClass,
}: {
  label: string;
  stacks: Stack[];
  timeSeconds: number;
  highlightItemClass?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">{label}</div>
      <ul className="space-y-1">
        {stacks.length === 0 ? (
          <li className="text-xs text-zinc-600">—</li>
        ) : (
          stacks.map((s, i) => {
            const stackItem = itemByClass.get(s.item);
            const rate = perMin(s.amount, timeSeconds);
            const highlighted = stackItem?.class_name === highlightItemClass;
            return (
              <li
                key={i}
                className={[
                  "flex items-center gap-1.5 text-xs min-w-0",
                  highlighted ? "text-ficsit-orange font-medium" : "text-zinc-200",
                ].join(" ")}
              >
                {stackItem && (
                  <img
                    src={iconUrl(stackItem.slug)}
                    width={18}
                    height={18}
                    className={[
                      "rounded-sm bg-ficsit-dark shrink-0",
                      stackItem.is_fluid ? "ring-1 ring-cyan-400/40" : "",
                    ].join(" ")}
                    alt=""
                  />
                )}
                <span className="font-mono shrink-0">×{s.amount}</span>
                <Link
                  to={`/items/${stackItem?.slug ?? ""}`}
                  className={[
                    "truncate no-underline",
                    highlighted
                      ? "text-ficsit-orange hover:underline"
                      : "text-zinc-300 hover:text-ficsit-orange",
                  ].join(" ")}
                >
                  {stackItem ? displayName(stackItem.name) : s.item}
                </Link>
                <span className="font-mono text-zinc-500 ml-auto whitespace-nowrap shrink-0">
                  {rate}
                  {rateLabel(stackItem)}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
