import React, { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { IconButton } from "./Button";
import { cn } from "@/src/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

// Bottom sheet on phones, centered dialog from sm and up
export function Sheet({ open, onClose, title, description, children, footer, size = "md" }: SheetProps) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            className={cn(
              "relative w-full bg-surface shadow-float flex flex-col max-h-[92dvh]",
              "rounded-t-[32px] sm:rounded-[32px] sm:m-6",
              size === "md" ? "sm:max-w-md" : "sm:max-w-lg"
            )}
          >
            <div className="sm:hidden mx-auto mt-3 h-1.5 w-10 rounded-full bg-line" />
            {(title || description) && (
              <div className="flex items-start gap-4 px-6 pt-5 sm:pt-7 pb-2">
                <div className="flex-1 min-w-0">
                  {title && <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>}
                  {description && <p className="mt-1 text-[15px] leading-relaxed text-muted">{description}</p>}
                </div>
                <IconButton label="Sluiten" onClick={onClose} className="-mr-2 -mt-1">
                  <X className="w-5 h-5" />
                </IconButton>
              </div>
            )}
            <div className="overflow-y-auto px-6 py-4">{children}</div>
            {footer && (
              <div className="px-6 pt-2 pb-[max(env(safe-area-inset-bottom),24px)] sm:pb-6">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
