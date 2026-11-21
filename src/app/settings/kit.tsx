import type { ReactNode } from "react";
import { cx } from "../../lib/util";

export function Header({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-4 pb-6 md:px-6">
      <div className="flex h-16 items-center justify-between gap-4"><h2 className="text-[20px] leading-[26px] font-medium tracking-[-.3px]">{title}</h2>{action}</div>
      {sub && <p className="-mt-2 max-w-2xl text-[13px] text-ink-2">{sub}</p>}
    </div>
  );
}
export const Card = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx("rounded-2xl border border-line bg-white", className)}>{children}</div>;
export const Body = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-6 px-4 pb-12 md:px-6">{children}</div>;

