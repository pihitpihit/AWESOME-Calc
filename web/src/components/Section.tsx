import { Card } from "@pihitpihit/plastic";
import type { ReactNode } from "react";

/**
 * plastic Card 의 Header/Body 위에 얇게 얹은 wrapper.
 * Title/Description 슬롯을 제공한다 (plastic Card 자체엔 없음).
 */
export function Section({
  title,
  description,
  children,
  bodyClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <Card.Root>
      <Card.Header>
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </Card.Header>
      <Card.Body className={bodyClassName}>{children}</Card.Body>
    </Card.Root>
  );
}
