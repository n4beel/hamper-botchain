import React from "react";

export default function LimitationBlock({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="fine-print-heading"
      className={`rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[0_2px_8px_rgba(58,29,40,0.03)] ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] flex-shrink-0"
          aria-hidden="true"
        />
        <h2
          id="fine-print-heading"
          className="font-heading text-base font-bold text-[var(--text-primary)] tracking-tight"
        >
          Fine print
        </h2>
      </div>

      <ul className="space-y-2 text-xs sm:text-sm text-[var(--text-secondary)] font-sans list-none pl-0">
        <li className="flex items-start gap-2.5">
          <span className="text-[var(--accent)] font-bold select-none">•</span>
          <span>Each wish is all-or-nothing. If it isn't full by the deadline, everyone is refunded.</span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="text-[var(--accent)] font-bold select-none">•</span>
          <span>The host decides what to buy with a funded wish.</span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="text-[var(--accent)] font-bold select-none">•</span>
          <span>A gift can't be taken back, except by that refund.</span>
        </li>
      </ul>
    </section>
  );
}
