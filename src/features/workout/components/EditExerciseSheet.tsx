import { useEffect, useState } from "react";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { NumberField } from "@/src/components/ui/NumberField";
import { FieldLabel, TextArea, TextField } from "@/src/components/ui/TextField";
import { SessionExercise } from "../lib/exercises";
import type { ExerciseEdits } from "../hooks/useWorkoutSession";

interface EditExerciseSheetProps {
  open: boolean;
  exercise: SessionExercise;
  onClose: () => void;
  onSave: (edits: ExerciseEdits) => void;
}

function initialFields(exercise: SessionExercise) {
  return {
    name: exercise.name,
    sets: String(exercise.targetSets),
    reps: exercise.targetReps === "-" ? "" : exercise.targetReps,
    rest: String(exercise.restSeconds),
    tempo: exercise.tempo === "-" ? "" : exercise.tempo,
    techniqueNote: exercise.techniqueNote ?? "",
  };
}

export function EditExerciseSheet({ open, exercise, onClose, onSave }: EditExerciseSheetProps) {
  const [fields, setFields] = useState(() => initialFields(exercise));

  useEffect(() => {
    if (open) setFields(initialFields(exercise));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: keyof typeof fields) => (value: string) => setFields(f => ({ ...f, [key]: value }));

  const save = () => {
    const sets = parseInt(fields.sets, 10);
    const rest = parseInt(fields.rest, 10);
    onSave({
      name: fields.name.trim() || exercise.name,
      targetSets: sets > 0 && sets <= 20 ? sets : exercise.targetSets,
      targetReps: fields.reps.trim() || exercise.targetReps,
      tempo: fields.tempo.trim() || "-",
      // Keep the stored value untouched when the rest time was not changed
      rest: rest > 0 && rest !== exercise.restSeconds ? String(rest) : exercise.rest,
      techniqueNote: fields.techniqueNote.trim(),
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Oefening bewerken"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" block onClick={onClose}>Annuleren</Button>
          <Button size="lg" block onClick={save}>Opslaan</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <TextField label="Naam" value={fields.name} onChange={set("name")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Sets</FieldLabel>
            <NumberField size="md" mode="integer" label="Aantal sets" value={fields.sets} onValueChange={set("sets")} />
          </div>
          <TextField label="Reps" value={fields.reps} onChange={set("reps")} placeholder="8-12" />
          <div>
            <FieldLabel>Rusttijd</FieldLabel>
            <NumberField size="md" mode="integer" label="Rusttijd in seconden" unit="sec" value={fields.rest} onValueChange={set("rest")} />
          </div>
          <TextField label="Tempo" value={fields.tempo} onChange={set("tempo")} placeholder="3-1-1-0" />
        </div>
        <TextArea
          label="Techniek notitie"
          value={fields.techniqueNote}
          onChange={set("techniqueNote")}
          placeholder="Bijv. schouderbladen naar achteren, rustig zakken"
        />
      </div>
    </Sheet>
  );
}
