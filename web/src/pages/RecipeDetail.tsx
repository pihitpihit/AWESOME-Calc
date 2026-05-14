import { Link, useParams } from "react-router-dom";
import { displayName, itemByClass, perMin, rateLabel, recipeBySlug } from "../lib/data";
import { ItemThumb } from "../components/ItemThumb";
import { Section } from "../components/Section";
import { NotFound } from "./NotFound";
import type { Stack } from "../types/data";

export function RecipeDetail() {
  const { slug } = useParams();
  const r = slug ? recipeBySlug.get(slug) : undefined;
  if (!r) return <NotFound />;

  return (
    <article className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          {displayName(r.name)}
          {r.alternate && <span className="chip-alt">대체</span>}
        </h1>
        <p className="text-zinc-400">{r.name.en}</p>
        <p className="font-mono text-xs text-zinc-500 mt-1">{r.class_name}</p>
      </header>

      <Section title="획득 방법">
        <div className="text-sm">{r.unlock.ko}</div>
        {r.unlock.en !== r.unlock.ko && (
          <div className="text-zinc-500 text-sm mt-1">{r.unlock.en}</div>
        )}
        {r.unlock.schematic_class && (
          <div className="text-xs text-zinc-500 font-mono mt-2">{r.unlock.schematic_class}</div>
        )}
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="재료">
          <StackList stacks={r.ingredients} timeSeconds={r.time_seconds} />
        </Section>

        <Section title="산물">
          <StackList stacks={r.products} timeSeconds={r.time_seconds} />
        </Section>
      </div>

      <Section title="제작">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 text-sm">
          <dt className="text-zinc-500 text-xs">사이클 시간</dt>
          <dd className="font-mono">{r.time_seconds}s</dd>
          <dt className="text-zinc-500 text-xs">생산 빌딩</dt>
          <dd className="font-mono">
            {r.produced_in.length === 0 ? "—" : r.produced_in.join(", ")}
          </dd>
          <dt className="text-zinc-500 text-xs">손 제작</dt>
          <dd>{r.in_hand ? "가능" : "—"}</dd>
          <dt className="text-zinc-500 text-xs">작업대</dt>
          <dd>{r.in_workshop ? "가능" : "—"}</dd>
        </dl>
      </Section>

      <p className="text-xs text-zinc-500">
        <Link to="/recipes">← 레시피 전체로</Link>
      </p>
    </article>
  );
}

function StackList({ stacks, timeSeconds }: { stacks: Stack[]; timeSeconds: number }) {
  return (
    <ul className="space-y-2">
      {stacks.map((s, idx) => {
        const item = itemByClass.get(s.item);
        const rate = perMin(s.amount, timeSeconds);
        return (
          <li key={`${s.item}-${idx}`} className="flex items-center justify-between gap-3">
            <ItemThumb className={s.item} amount={s.amount} size={32} />
            <span className="font-mono text-xs text-zinc-400 whitespace-nowrap">
              {rate} {rateLabel(item)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
