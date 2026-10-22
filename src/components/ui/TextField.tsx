import React from "react";
import { cn } from "@/src/lib/utils";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block mb-2 text-[13px] font-semibold text-ink-2">{children}</label>;
}

const fieldClass =
  "w-full rounded-2xl bg-subtle border border-transparent px-4 text-[16px] text-ink placeholder:text-muted/60 outline-none transition-all focus:bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15";

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextField({ label, value, onChange, className, ...props }: TextFieldProps) {
  return (
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className={cn(fieldClass, "h-12")} {...props} />
    </div>
  );
}

interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextArea({ label, value, onChange, className, rows = 3, ...props }: TextAreaProps) {
  return (
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        rows={rows}
        onChange={e => onChange(e.target.value)}
        className={cn(fieldClass, "py-3 resize-none leading-relaxed")}
        {...props}
      />
    </div>
  );
}
