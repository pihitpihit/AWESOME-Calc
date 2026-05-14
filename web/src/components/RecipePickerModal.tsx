import { useEffect } from "react";
import { displayName, itemByClass } from "../lib/data";
import { pickDefaultRecipe, recipesForItem } from "../lib/calc";

/**
 * 특정 산물 아이템에 대해 어떤 레시피를 쓸지 고르는 모달.
 * xyflow viewport 의 transform 영향을 받지 않게 fixed positioning 으로 띄운다.
 */
export function RecipePickerModal({
  itemClass,
  currentRecipeClass,
  onSelect,
  onClose,
}: {
  itemClass: string;
  currentRecipeClass: string | null;
  onSelect: (recipeClass: string) => void;
  onClose: () => void;
}) {
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

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="panel max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-ficsit-border">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">레시피 선택</div>
          <h3 className="text-lg font-semibold mt-0.5">
            <span className="text-ficsit-orange">{displayName(item.name)}</span>
            <span className="text-zinc-400 text-sm ml-2">를 만드는 레시피</span>
          </h3>
        </header>
        <ul className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {candidates.length === 0 && (
            <li className="text-sm text-zinc-400 px-2 py-3">
              이 아이템을 만드는 일반 레시피가 없다 (원자재이거나 채취 전용).
            </li>
          )}
          {candidates.map((r) => {
            const isCurrent = r.class_name === effectiveCurrent;
            const isDefault = r.class_name === defaultRecipe?.class_name;
            return (
              <li key={r.class_name}>
                <button
                  onClick={() => onSelect(r.class_name)}
                  className={[
                    "w-full text-left p-3 rounded border bg-ficsit-dark",
                    isCurrent
                      ? "border-ficsit-orange ring-1 ring-ficsit-orange/40"
                      : "border-ficsit-border hover:border-zinc-500",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-zinc-100">{displayName(r.name)}</span>
                    {r.alternate && <span className="chip-alt text-[10px]">대체</span>}
                    {isDefault && <span className="chip text-[10px]">기본</span>}
                    {isCurrent && <span className="chip text-[10px] text-ficsit-orange border-ficsit-orange">선택됨</span>}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{r.name.en}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    획득: <span className="text-zinc-300">{r.unlock.ko}</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    재료: {r.ingredients.map((i) => {
                      const it = itemByClass.get(i.item);
                      return it ? displayName(it.name) : i.item;
                    }).join(", ")}
                  </div>
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
