import { NavLink, Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ficsit-border bg-ficsit-panel/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <NavLink to="/" className="font-bold tracking-wide text-ficsit-orange no-underline">
            AWESOME-Calc <span className="text-zinc-400 font-normal text-sm">/ reference</span>
          </NavLink>
          <nav className="flex gap-4 text-sm">
            <TopLink to="/items">아이템</TopLink>
            <TopLink to="/recipes">레시피</TopLink>
            <TopLink to="/calc">계산기</TopLink>
          </nav>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 px-4 py-6">
        <Sidebar />
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-ficsit-border text-xs text-zinc-500 py-4 text-center">
        <a href="https://github.com/pihitpihit/AWESOME-Calc" className="text-zinc-400">
          pihitpihit/AWESOME-Calc
        </a>
        {" · 데이터 기반: "}
        <a href="https://github.com/greeny/SatisfactoryTools" className="text-zinc-400">
          greeny/SatisfactoryTools
        </a>
        {" · UI: "}
        <a href="https://github.com/pihitpihit/plastic" className="text-zinc-400">
          plastic
        </a>
      </footer>
    </div>
  );
}

function TopLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "no-underline text-zinc-300 hover:text-ficsit-orange",
          isActive ? "text-ficsit-orange" : "",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}
