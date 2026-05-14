import { Link, useParams } from "react-router-dom";
import {
  CATEGORY_LABELS,
  displayName,
  iconUrl,
  itemBySlug,
} from "../lib/data";
import { RecipeRow } from "../components/RecipeRow";
import { Section } from "../components/Section";
import { NotFound } from "./NotFound";

export function ItemDetail() {
  const { slug } = useParams();
  const item = slug ? itemBySlug.get(slug) : undefined;
  if (!item) return <NotFound />;

  return (
    <article className="space-y-5">
      <header className="flex items-start gap-4">
        <img
          src={iconUrl(item.slug)}
          alt={item.name.en}
          width={96}
          height={96}
          className="rounded-md bg-ficsit-panel border border-ficsit-border"
        />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{displayName(item.name)}</h1>
          <p className="text-zinc-400">{item.name.en}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="chip">{CATEGORY_LABELS[item.category].ko}</span>
            {item.is_fluid && <span className="chip">유체</span>}
            <span className="chip font-mono text-zinc-400">{item.class_name}</span>
          </div>
        </div>
      </header>

      {item.description_en && (
        <Section title="설명">
          <p className="text-zinc-300 whitespace-pre-line text-sm">{item.description_en}</p>
          <p className="text-xs text-zinc-500 mt-2">
            ※ 원문 영문. 게임 내 한국어 설명은 향후 보강 예정.
          </p>
        </Section>
      )}

      <Section title="속성">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-6 text-sm">
          <Stat label="스택 크기" value={item.stack_size} />
          <Stat label="싱크 포인트" value={item.sink_points} />
          <Stat label="에너지 (MJ)" value={item.energy_value_mj} />
          <Stat
            label="방사능"
            value={item.radioactive_decay ? item.radioactive_decay.toString() : null}
          />
        </dl>
      </Section>

      <Section
        title={
          <>
            제작 가능 레시피 <span className="text-zinc-500 text-sm">({item.produced_by.length})</span>
          </>
        }
        description="이 아이템을 산물로 가진 레시피 — 대체 포함"
      >
        {item.produced_by.length === 0 ? (
          <p className="text-zinc-500 text-sm">없음 (원자재이거나 채취 전용).</p>
        ) : (
          <ul className="space-y-1.5">
            {item.produced_by.map((p) => (
              <li key={p.recipe} className="flex items-center justify-between gap-3 text-sm">
                <RecipeRow recipeClass={p.recipe} />
                <span className="font-mono text-xs text-zinc-400">+{p.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={
          <>
            사용처 레시피 <span className="text-zinc-500 text-sm">({item.consumed_in.length})</span>
          </>
        }
        description="이 아이템을 재료로 사용하는 레시피 — 대체 포함"
      >
        {item.consumed_in.length === 0 ? (
          <p className="text-zinc-500 text-sm">없음 (최종 산물 또는 미사용).</p>
        ) : (
          <ul className="space-y-1.5">
            {item.consumed_in.map((c) => (
              <li key={c.recipe} className="flex items-center justify-between gap-3 text-sm">
                <RecipeRow recipeClass={c.recipe} />
                <span className="font-mono text-xs text-zinc-400">−{c.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="text-xs text-zinc-500">
        <Link to="/items">← 아이템 전체로</Link>
      </p>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div>
      <dt className="text-zinc-500 text-xs">{label}</dt>
      <dd className="text-zinc-200 font-mono">{value === null || value === undefined || value === "" ? "—" : value}</dd>
    </div>
  );
}
