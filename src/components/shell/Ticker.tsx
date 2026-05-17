import { Fragment, type ReactNode } from "react";

export interface TickerItem {
  /** Optional prefix shown in red Kalam (e.g. "DESK ●"). */
  pre?: string;
  /** Optional bold key (e.g. "Next slot"). */
  label?: string;
  body: ReactNode;
}

interface TickerProps {
  items: TickerItem[];
}

/**
 * The status strip beneath the topbar. Items are duplicated and the inner
 * track is keyframe-translated -50% so the scroll loops forever without a
 * visible seam.
 */
export function Ticker({ items }: TickerProps) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div
      aria-hidden="true"
      data-print="hide"
      className="flex gap-[18px] font-hand text-[12px] text-muted px-[22px] py-[6px] bg-paper-2 border-b border-ink/15 overflow-hidden whitespace-nowrap"
    >
      <div className="ticker-track">
        {doubled.map((item, idx) => (
          <Fragment key={idx}>
            <span>
              {item.pre && (
                <span className="text-accent font-bold tracking-[0.08em] mr-2">
                  {item.pre}
                </span>
              )}
              {item.label && (
                <b className="text-ink font-bold mr-1">{item.label}</b>
              )}
              {item.body}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
