import { useRef, useState } from "react";
import { Dumbbell, ImagePlus, Plus, X } from "lucide-react";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { NumberField } from "@/src/components/ui/NumberField";
import { TextField, FieldLabel } from "@/src/components/ui/TextField";
import { Routine, newExerciseUid } from "@/src/lib/storage";
import { uploadImageToFirestore } from "@/src/lib/firebase";
import { compressImage } from "@/src/lib/utils";
import { useResolvedImage } from "@/src/hooks/useResolvedImage";

interface DraftExercise {
  key: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  tempo: string;
  imageUrl?: string;
}

const EMPTY_FORM = { name: "", sets: "3", reps: "8-12", rest: "90", tempo: "", image: undefined as string | undefined };

function Thumb({ url }: { url?: string }) {
  const src = useResolvedImage(url);
  return (
    <div className="w-11 h-11 rounded-xl bg-subtle overflow-hidden flex items-center justify-center shrink-0">
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <Dumbbell className="w-4 h-4 text-muted" />}
    </div>
  );
}

export function CreateRoutineSheet({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (routine: Routine) => void }) {
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName("");
    setExercises([]);
    setAdding(false);
    setForm(EMPTY_FORM);
  };

  const addExercise = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    let imageUrl = form.image;
    if (imageUrl && !imageUrl.startsWith("firestore://")) {
      try {
        imageUrl = await uploadImageToFirestore(imageUrl);
      } catch {
        imageUrl = undefined;
      }
    }
    setExercises(prev => [...prev, {
      key: newExerciseUid(),
      name: form.name.trim(),
      sets: form.sets || "3",
      reps: form.reps.trim() || "8-12",
      rest: form.rest || "90",
      tempo: form.tempo.trim() || "-",
      imageUrl,
    }]);
    setForm(EMPTY_FORM);
    setAdding(false);
    setBusy(false);
  };

  const create = () => {
    if (!name.trim() || exercises.length === 0) return;
    onCreate({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
      workout_name: name.trim(),
      isArchived: false,
      exercises: exercises.map(ex => ({
        uid: ex.key,
        name: ex.name,
        sets_target: ex.sets,
        reps_target: ex.reps,
        tempo: ex.tempo,
        rest: ex.rest,
        notes: "",
        ...(ex.imageUrl ? { imageUrl: ex.imageUrl } : {}),
        sets: Array.from({ length: parseInt(ex.sets) || 3 }, (_, i) => ({ set_number: String(i + 1) })),
      })),
    });
    reset();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nieuwe routine"
      description="Geef je routine een naam en voeg oefeningen toe."
      size="lg"
      footer={
        <Button size="lg" block onClick={create} disabled={!name.trim() || exercises.length === 0}>
          Routine opslaan
        </Button>
      }
    >
      <div className="space-y-6">
        <TextField label="Naam" value={name} onChange={setName} placeholder="Bijv. Push Day, Rug & Biceps" />

        <div>
          <FieldLabel>Oefeningen</FieldLabel>
          <div className="space-y-2">
            {exercises.map(ex => (
              <div key={ex.key} className="flex items-center gap-3 p-2.5 pr-3 rounded-2xl bg-subtle">
                <Thumb url={ex.imageUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{ex.name}</p>
                  <p className="text-xs text-muted">{ex.sets} × {ex.reps} · {ex.rest}s rust</p>
                </div>
                <button
                  onClick={() => setExercises(prev => prev.filter(e => e.key !== ex.key))}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                  aria-label={`Verwijder ${ex.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {adding ? (
            <div className="mt-3 p-4 rounded-[24px] border border-line space-y-4">
              <TextField label="Naam oefening" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Bijv. Bench Press" autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Sets</FieldLabel>
                  <NumberField size="md" mode="integer" label="Sets" value={form.sets} onValueChange={v => setForm(f => ({ ...f, sets: v }))} />
                </div>
                <TextField label="Reps" value={form.reps} onChange={v => setForm(f => ({ ...f, reps: v }))} placeholder="8-12" />
                <div>
                  <FieldLabel>Rust</FieldLabel>
                  <NumberField size="md" mode="integer" label="Rust in seconden" unit="sec" value={form.rest} onValueChange={v => setForm(f => ({ ...f, rest: v }))} />
                </div>
                <TextField label="Tempo" value={form.tempo} onChange={v => setForm(f => ({ ...f, tempo: v }))} placeholder="3-1-1-0" />
              </div>
              <div className="flex items-center gap-3">
                {form.image && <img src={form.image} alt="" className="w-11 h-11 rounded-xl object-cover" />}
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="w-4 h-4" />
                  {form.image ? "Andere foto" : "Foto (optioneel)"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const image = await compressImage(file);
                        setForm(f => ({ ...f, image }));
                      } catch {}
                    }
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" block onClick={() => { setAdding(false); setForm(EMPTY_FORM); }}>
                  Annuleren
                </Button>
                <Button block onClick={addExercise} disabled={!form.name.trim() || busy}>
                  {busy ? "Bezig…" : "Toevoegen"}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="mt-3 w-full h-14 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-muted hover:text-accent hover:border-accent/40 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Oefening toevoegen
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
