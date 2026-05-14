import { Link } from "react-router-dom";
import { Button } from "@pihitpihit/plastic";
import { CATEGORY_LABELS, ITEM_CATEGORIES, items, recipes } from "../lib/data";
import { Section } from "../components/Section";

export function Home() {
  const altCount = recipes.filter((r) => r.alternate).length;
  const buildingCount = recipes.filter((r) => r.for_building).length;
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold mb-2">
          AWESOME-Calc <span className="text-ficsit-orange">Reference</span>
        </h1>
        <p className="text-zinc-400">
          Satisfactory v1.1 아이템·레시피·획득 경로 위키형 레퍼런스. 좌측 사이드바 또는 상단 메뉴로
          탐색하라. 데이터는{" "}
          <Link to="/items">{items.length}개 아이템</Link>,{" "}
          <Link to="/recipes">{recipes.length}개 레시피</Link>,{" "}
          {altCount}개 대체 레시피, {buildingCount}개 빌딩 건축 레시피.
        </p>
      </section>

      <Section title="카테고리별 아이템">
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {ITEM_CATEGORIES.map((c) => {
            const count = items.filter((it) => it.category === c).length;
            return (
              <li key={c}>
                <Link
                  to={`/items?cat=${c}`}
                  className="block panel p-3 hover:border-ficsit-orange/50 no-underline text-zinc-200"
                >
                  <div className="text-zinc-300">{CATEGORY_LABELS[c].ko}</div>
                  <div className="text-xs text-zinc-500">{CATEGORY_LABELS[c].en}</div>
                  <div className="mt-1 text-ficsit-orange font-mono">{count}</div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="빠른 시작" bodyClassName="flex flex-wrap gap-3">
        <Link to="/calc"><Button>계산기 — 의존성 다이어그램</Button></Link>
        <Link to="/items"><Button variant="secondary">아이템 전체 보기</Button></Link>
        <Link to="/recipes?alt=true"><Button variant="secondary">대체 레시피만 보기</Button></Link>
        <Link to="/recipes?source=mam"><Button variant="secondary">MAM 연구 잠금해제</Button></Link>
      </Section>
    </div>
  );
}
