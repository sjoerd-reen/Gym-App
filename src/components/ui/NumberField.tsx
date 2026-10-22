import React, { forwardRef } from "react";
import { cn } from "@/src/lib/utils";
import { sanitizeDecimal, sanitizeInteger } from "@/src/lib/format";

interface NumberFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> {
  value: string;
  onValueChange: (value: string) => void;
  mode?: "decimal" | "integer";
  label: string;
  unit?: string;
  size?: "lg" | "md";
  state?: "default" | "done";
}

// Plain text input with a numeric keyboard: avoids type="number" which rejects "6,25" on Dutch iOS keyboards
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { value, onValueChange, mode = "decimal", label, unit, size = "lg", state = "default", className, onFocus, ...props },
  ref
) {
  return (
    <div className={cn("relative", className)}>
      <input
        ref={ref}
        type="text"
        inputMode={mode === "decimal" ? "decimal" : "numeric"}
        pattern={mode === "decimal" ? "[0-9]*[.,]?[0-9]*" : "[0-9]*"}
        autoComplete="off"
        enterKeyHint="next"
        aria-label={label}
        value={value}
        onChange={e => onValueChange(mode === "decimal" ? sanitizeDecimal(e.target.value) : sanitizeInteger(e.target.value))}
        onFocus={e => {
          const el = e.currentTarget;
          requestAnimationFrame(() => el.select());
          onFocus?.(e);
        }}
        className={cn(
          "w-full text-center font-semibold tabular-nums tracking-tight outline-none transition-all duration-150",
          "rounded-2xl border placeholder:font-medium",
          size === "lg" ? "h-14 text-[22px]" : "h-12 text-lg",
          unit && "pr-7",
          state === "done"
            ? "bg-success-soft border-success/25 text-ink placeholder:text-success/40"
            : "bg-subtle border-transparent text-ink placeholder:text-muted/45",
          "focus:bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15"
        )}
        {...props}
      />
      {unit && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
          {unit}
        </span>
      )}
    </div>
  );
});
