import { Card } from "@pihitpihit/plastic";
import type { ReactNode } from "react";

/**
 * plastic Card 의 Header/Body 위에 얇게 얹은 wrapper.
 * - Title/Description 슬롯을 제공한다 (plastic Card 엔 없음).
 * - plastic 의 기본 흰 배경(`bg-white`)을 다크 사이트 톤(`bg-ficsit-panel`)으로
 *   강제 오버라이드한다 (! prefix). 이로써 카드 내부 텍스트를 light 톤으로
 *   안전하게 쓸 수 있다.
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
    <Card.Root className="!bg-ficsit-panel !border-ficsit-border !shadow-none">
      <Card.Header className="!border-ficsit-border">
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </Card.Header>
      <Card.Body className={["text-zinc-200", bodyClassName].filter(Boolean).join(" ")}>
        {children}
      </Card.Body>
    </Card.Root>
  );
}
