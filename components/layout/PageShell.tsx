"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ui/ConnectButton";
import NetworkBadge from "@/components/botchain/NetworkBadge";
import { footerLinks } from "@/lib/botchain/chain";
import BuiltOnBotChain from "@/components/botchain/BuiltOnBotChain";
import { app } from "@/lib/app-config";

export type NavItem = { href: string; label: string };

interface PageShellProps {
  children: React.ReactNode;
  nav?: NavItem[];
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const defaultNav: NavItem[] = [
  { href: "/", label: "Gallery" },
  { href: "/new", label: "Create Registry" },
  { href: "/me", label: "My Gifts & Till" },
];

/**
 * Archetype AL · Registry Shelf Application Shell.
 *
 * Designed with a celebratory ribbon header, warm plum ink, raspberry accents,
 * soft shelf background, responsive navigation, and compliant 3-link BOT Chain footer.
 */
export default function PageShell({
  children,
  nav = defaultNav,
  title,
  description,
  action,
}: PageShellProps) {
  const pathname = usePathname();
  const links = footerLinks();

  return (
    <div
      className="flex flex-col min-h-[100dvh] overflow-x-hidden"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Top Shelf Ribbon Navigation */}
      <header
        className="sticky top-0 z-30 flex-shrink-0 border-b border-[var(--border-default)] shadow-[0_1px_6px_rgba(58,29,40,0.04)]"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 py-3">
            {/* Logo / Brand with Ribbon Accent */}
            <Link
              href="/"
              className="flex items-center gap-2.5 flex-shrink-0 no-underline group"
              title={app.tagline}
            >
              <div
                className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--accent-ink)] shadow-xs transition-transform group-hover:scale-105"
                aria-hidden="true"
              >
                {/* Ribbon Bow SVG */}
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v20M2 12h20M12 12a5 5 0 0 1-5-5c0-2 2-3 4-2l1 7M12 12a5 5 0 0 0 5-5c0-2-2-3-4-2l-1 7" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-base tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  {app.name}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-sans hidden sm:inline -mt-0.5">
                  Registry Shelf
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
              {nav.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-normal transition-all no-underline ${
                      isActive
                        ? "bg-[var(--accent)] text-white shadow-xs"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#FBE8EE]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Controls: Network & Wallet */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <NetworkBadge />
              <ConnectButton />
            </div>
          </div>

          {/* Mobile Navigation Row */}
          <div className="md:hidden flex items-center justify-around gap-1 pb-2.5 pt-0.5 border-t border-[var(--border-subtle)]">
            {nav.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all no-underline ${
                    isActive
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Page Title & Action Bar (if provided) */}
      {(title || description || action) && (
        <section className="border-b border-[var(--border-subtle)] bg-[#FFF9FB] py-5 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-[980px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {title && (
                <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-sans max-w-xl">
                  {description}
                </p>
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        </section>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-[980px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Standard Shared UI Footer with 3 Links */}
      <footer
        className="mt-auto border-t border-[var(--border-default)] bg-[var(--bg-surface)] py-6 px-4 sm:px-6 text-xs text-[var(--text-muted)]"
      >
        <div className="mx-auto w-full max-w-[980px] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-heading font-semibold text-[var(--text-primary)]">
              {app.name}
            </span>
            <span className="text-[var(--border-default)]">|</span>
            <span>{app.tagline}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <BuiltOnBotChain />
            {links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[var(--text-muted)] hover:text-[var(--accent)] underline transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
