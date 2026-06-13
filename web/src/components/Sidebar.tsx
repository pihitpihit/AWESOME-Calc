import { NavLink, useLocation } from "react-router-dom";
import { CATEGORY_LABELS, ITEM_CATEGORIES, items, recipes } from "../lib/data";

export function Sidebar() {
  const loc = useLocation();
  return (
    <aside className="hidden md:block">
      <nav className="text-sm space-y-6 sticky top-16">
        <Section title="둘러보기">
          <SideLink to="/">홈</SideLink>
          <SideLink to="/items">아이템 전체 ({items.length})</SideLink>
          <SideLink to="/recipes">레시피 전체 ({recipes.length})</SideLink>
          <SideLink to="/explorer">레시피 탐색기</SideLink>
          <SideLink to="/depmap">전체 의존성 지도</SideLink>
          <SideLink to="/calc">계산기 — 생산 BOM</SideLink>
        </Section>

        <Section title="카테고리">
          {ITEM_CATEGORIES.map((c) => {
            const count = items.filter((it) => it.category === c).length;
            const to = `/items?cat=${c}`;
            const isActive = loc.pathname === "/items" && loc.search.includes(`cat=${c}`);
            return (
              <SideLink key={c} to={to} active={isActive}>
                {CATEGORY_LABELS[c].ko}{" "}
                <span className="text-zinc-500 text-xs">({count})</span>
              </SideLink>
            );
          })}
        </Section>

        <Section title="레시피 필터">
          <SideLink to="/recipes?alt=true">대체 레시피만</SideLink>
          <SideLink to="/recipes?source=alternate">하드드라이브로 획득</SideLink>
          <SideLink to="/recipes?source=mam">MAM 연구로 획득</SideLink>
        </Section>
      </nav>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-zinc-500 uppercase text-[10px] tracking-wider mb-2">{title}</div>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function SideLink({
  to,
  children,
  active,
}: {
  to: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          [
            "block py-1 px-2 rounded no-underline",
            "hover:bg-ficsit-panel hover:text-ficsit-orange",
            (active ?? isActive) ? "bg-ficsit-panel text-ficsit-orange" : "text-zinc-300",
          ].join(" ")
        }
        end
      >
        {children}
      </NavLink>
    </li>
  );
}
