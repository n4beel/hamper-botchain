import { HTMLAttributes, ReactNode } from "react";

export type PanelVariant = "default" | "shelf" | "envelope" | "subtle" | "tinted";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant;
  interactive?: boolean;
  padded?: boolean;
  headerSlot?: ReactNode;
}

const variantStyles: Record<PanelVariant, string> = {
  default:
    "bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[0_2px_8px_rgba(58,29,40,0.04)]",
  shelf:
    "bg-[var(--bg-surface)] border-2 border-[var(--border-default)] border-b-4 shadow-[0_4px_12px_rgba(58,29,40,0.06)] rounded-2xl",
  envelope:
    "bg-[var(--bg-base)] border border-[var(--border-default)] hover:border-[var(--accent)] shadow-[0_4px_16px_rgba(224,69,123,0.08)] rounded-xl",
  subtle:
    "bg-transparent border border-[var(--border-subtle)] rounded-xl",
  tinted:
    "bg-[#FFF8FA] border border-[#F6DCE4] rounded-2xl",
};

export default function Panel({
  variant = "default",
  interactive = false,
  padded = true,
  headerSlot,
  children,
  className = "",
  style,
  ...props
}: PanelProps) {
  return (
    <div
      className={`relative overflow-hidden transition-all duration-200 ${variantStyles[variant]} ${
        interactive ? "hover:-translate-y-0.5 cursor-pointer" : ""
      } ${padded ? "p-4 sm:p-6" : ""} ${className}`}
      style={style}
      {...props}
    >
      {headerSlot && (
        <div className="mb-4 pb-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
          {headerSlot}
        </div>
      )}
      {children}
    </div>
  );
}
