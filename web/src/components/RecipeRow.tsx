import { Link } from "react-router-dom";
import { displayName, recipeByClass } from "../lib/data";

export function RecipeRow({ recipeClass }: { recipeClass: string }) {
  const r = recipeByClass.get(recipeClass);
  if (!r) {
    return (
      <span className="chip text-zinc-400" title={recipeClass}>
        {recipeClass}
      </span>
    );
  }
  return (
    <Link
      to={`/recipes/${r.slug}`}
      className="no-underline text-zinc-200 hover:text-ficsit-orange inline-flex items-center gap-2"
    >
      <span>{displayName(r.name)}</span>
      {r.alternate && <span className="chip-alt">대체</span>}
    </Link>
  );
}
