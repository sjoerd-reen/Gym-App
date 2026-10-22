import React from "react";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, tone = "primary", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" block onClick={onCancel}>
            Annuleren
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} size="lg" block onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-[15px] leading-relaxed text-ink-2">{description}</div>
    </Sheet>
  );
}
