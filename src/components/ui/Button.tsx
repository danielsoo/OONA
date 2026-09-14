import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xiio-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-xiio-bg " +
  "disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  /** Light pill: the main action on dark imagery (Play). */
  primary: "bg-ink text-xiio-bg hover:bg-white",
  /** Blue pill: the main action in app chrome (Upload, Connect, Save). */
  accent: "bg-xiio-accent text-white hover:bg-xiio-accent-hover",
  /** Outline pill: the secondary action next to a primary one (My List). */
  secondary: "border border-line-strong bg-white/[0.04] text-ink hover:bg-white/[0.1]",
  /** Text button: low-emphasis actions (Report, Cancel). */
  ghost: "text-ink-2 hover:bg-white/[0.06] hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-small",
  md: "h-10 px-5 text-small",
  lg: "h-12 px-7 text-body",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim();
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Button({
  variant,
  size,
  icon,
  children,
  className,
  type = "button",
  ...rest
}: CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">) {
  return (
    <button type={type} className={buttonClass({ variant, size, className })} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  icon,
  children,
  className,
  ...rest
}: CommonProps & Omit<ComponentProps<typeof Link>, "children" | "className">) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
