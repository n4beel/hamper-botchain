"use client";

import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "ribbon";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1 text-xs rounded-full gap-1.5",
  sm: "px-3.5 py-1.5 text-xs font-semibold rounded-full gap-1.5",
  md: "px-5 py-2.5 text-sm font-semibold rounded-full gap-2",
  lg: "px-6 py-3 text-base font-bold rounded-full gap-2.5",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-105 active:scale-[0.98] shadow-sm hover:shadow-md transition-all font-sans border border-transparent",
  secondary:
    "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[#FCECEF] hover:border-[var(--accent)] active:scale-[0.98] transition-all font-sans",
  ghost:
    "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-[0.98] transition-all font-sans border border-transparent",
  danger:
    "bg-transparent text-[var(--danger)] border border-[var(--danger)] hover:bg-[#FDF2F2] active:scale-[0.98] transition-all font-sans",
  ribbon:
    "bg-gradient-to-r from-[var(--accent)] to-[#C73365] text-white shadow-sm hover:shadow-md active:scale-[0.98] transition-all font-sans border border-transparent",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center tracking-normal font-sans select-none cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <span
              className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0"
              aria-hidden="true"
            />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "HamperButton";
export default Button;
