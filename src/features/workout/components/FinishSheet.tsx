import { useEffect, useState } from "react";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";

interface FinishSheetProps {
  open: boolean;
  completedSets: number;
  totalSets: number;
  canDiscard: boolean;
  onClose: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}

export function FinishSheet({ open, completedSets, totalSets, canDiscard, onClose, onFinish, onDiscard }: FinishSheetProps) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (open) setArmed(false);
  }, [open]);

  const remaining = totalSets - completedSets;
  const description =
    completedSets === 0
      ? "Je hebt nog geen sets ingevuld. Er wordt dan niets in je historie opgeslagen."
      : remaining > 0
        ? `Je hebt ${completedSets} van ${totalSets} sets ingevuld. ${remaining} ${remaining === 1 ? "set wordt" : "sets worden"} overgeslagen.`
        : `Alle ${totalSets} sets zijn ingevuld. Sterk gedaan!`;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Training afronden?"
      description={description}
      footer={
        <div className="space-y-3">
          <Button size="lg" block onClick={onFinish} disabled={completedSets === 0}>
            Opslaan en afronden
          </Button>
          <Button variant="secondary" size="lg" block onClick={onClose}>
            Verder trainen
          </Button>
          {canDiscard && (
            <button
              onClick={() => (armed ? onDiscard() : setArmed(true))}
              className="w-full h-10 text-sm font-semibold text-danger/80 hover:text-danger transition-colors"
            >
              {armed ? "Zeker weten? Tik nogmaals om te verwerpen" : "Training verwerpen zonder opslaan"}
            </button>
          )}
        </div>
      }
    >
      <div className="h-2 rounded-full bg-subtle overflow-hidden">
        <div
          className="h-full rounded-full bg-success transition-all"
          style={{ width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%` }}
        />
      </div>
    </Sheet>
  );
}
