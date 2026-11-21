import type { ReactNode } from "react";
import { cx } from "../../lib/util";

export function Header({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-8 pb-6 md:px-10">
      <div><h2 className="text-[22px] font-medium tracking-[-.2px]">{title}</h2>{sub && <p className="mt-1.5 max-w-2xl text-sm text-ink-2">{sub}</p>}</div>
      {action}
    </div>
  );
}
export const Card = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx("rounded-2xl border border-line bg-white", className)}>{children}</div>;
export const Body = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-6 px-6 pb-12 md:px-10">{children}</div>;

