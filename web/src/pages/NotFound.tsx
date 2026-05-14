import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold text-ficsit-orange">404</h1>
      <p className="text-zinc-400 mt-2">존재하지 않는 페이지다.</p>
      <p className="mt-4">
        <Link to="/">홈으로</Link>
      </p>
    </div>
  );
}
