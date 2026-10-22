import React from "react";
import { cn } from "@/src/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-accent hover:bg-accent-strong",
  secondary: "bg-surface text-ink border border-line shadow-soft hover:bg-subtle",
  ghost: "bg-transparent text-ink-2 hover:bg-subtle",
  danger: "bg-danger text-white hover:brightness-95",
  dark: "bg-ink text-white hover:bg-ink-2",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-2xl gap-2",
  lg: "h-14 px-6 text-base rounded-2xl gap-2",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({ variant = "primary", size = "md", block, className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-semibold whitespace-nowrap select-none",
        "transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20",
        variants[variant],
        sizes[size],
        block && "w-full",
        className
      )}
      {...props}
    />
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "default" | "surface" | "accent";
}

export function IconButton({ label, tone = "default", className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl w-10 h-10 shrink-0 transition-all duration-150 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20",
        tone === "default" && "text-ink-2 hover:bg-subtle",
        tone === "surface" && "bg-surface text-ink-2 border border-line shadow-soft hover:bg-subtle",
        tone === "accent" && "bg-accent-soft text-accent hover:bg-accent/15",
        className
      )}
      {...props}
    />
  );
}
