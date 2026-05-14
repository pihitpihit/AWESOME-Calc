import { Link } from "react-router-dom";
import { displayName, iconUrl, itemByClass } from "../lib/data";

export function ItemThumb({
  className,
  amount,
  size = 32,
}: {
  className: string;
  amount?: number;
  size?: 24 | 32 | 48 | 64;
}) {
  const item = itemByClass.get(className);
  if (!item) {
    return (
      <span className="chip text-zinc-400" title={className}>
        {className}
      </span>
    );
  }
  const px = `${size}px`;
  return (
    <Link to={`/items/${item.slug}`} className="inline-flex items-center gap-2 no-underline group">
      <img
        src={iconUrl(item.slug)}
        alt={item.name.en}
        width={size}
        height={size}
        loading="lazy"
        className="rounded-sm bg-ficsit-panel border border-ficsit-border"
        style={{ width: px, height: px }}
      />
      <span className="text-zinc-200 group-hover:text-ficsit-orange whitespace-nowrap">
        {amount !== undefined ? <span className="font-mono text-zinc-400 mr-1">×{amount}</span> : null}
        {displayName(item.name)}
      </span>
    </Link>
  );
}
