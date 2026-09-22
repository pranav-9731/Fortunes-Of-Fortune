"use client";

import { useState } from "react";
import { Charity } from "@/lib/types";
import { Head } from "./UserManagement";

export default function CharityManagement({
  charities,
  onAdd,
  onEdit,
  onDelete,
}: {
  charities: Charity[];
  onAdd: (c: Omit<Charity, "id">) => void;
  onEdit: (id: string, fields: Partial<Charity>) => void;
  onDelete: (id: string) => void;
}) {
  const [showNew, setShowNew] = useState(false);

  return (
    <section>
      <Head
        tag="charity management"
        title="The directory subscribers pick from."
        desc="Add, edit or retire a charity here and it updates immediately in every subscriber's charity picker — this is the one directory, not a copy."
      />

      <div className="space-y-4 mb-6">
        {charities.map((c) => (
          <CharityRow key={c.id} charity={c} onSave={(f) => onEdit(c.id, f)} onDelete={() => onDelete(c.id)} />
        ))}
      </div>

      {showNew ? (
        <NewCharityForm onCancel={() => setShowNew(false)} onCreate={(c) => { onAdd(c); setShowNew(false); }} />
      ) : (
        <button onClick={() => setShowNew(true)} className="rounded border-[1.5px] border-hairline px-5 py-2.5 text-sm hover:border-muted hover:text-gold-glow">
          + Add charity
        </button>
      )}
    </section>
  );
}

function CharityRow({ charity, onSave, onDelete }: { charity: Charity; onSave: (f: Partial<Charity>) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(charity.name);
  const [blurb, setBlurb] = useState(charity.blurb);
  const [mediaNote, setMediaNote] = useState(charity.media_note);
  const [event, setEvent] = useState(charity.event);

  if (!editing) {
    return (
      <div className="rounded border border-hairline bg-surface p-5 flex justify-between items-start gap-4">
        <div>
          <div className="font-semibold mb-1">{charity.name}</div>
          <div className="text-muted text-sm mb-1">{charity.blurb}</div>
          <div className="font-mono text-xs text-dim">{charity.media_note} · {charity.event}</div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditing(true)} className="rounded border border-hairline px-3 py-1.5 text-xs font-mono hover:text-gold-glow hover:border-gold-glow">Edit</button>
          <button onClick={() => confirm(`Remove ${charity.name} from the directory?`) && onDelete()} className="rounded border border-hairline px-3 py-1.5 text-xs font-mono hover:text-coral hover:border-coral">Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border border-gold/50 bg-surface p-5 space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded bg-void border border-hairline px-3 py-2 text-sm" placeholder="Charity name" />
      <input value={blurb} onChange={(e) => setBlurb(e.target.value)} className="w-full rounded bg-void border border-hairline px-3 py-2 text-sm" placeholder="One-line description" />
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={mediaNote} onChange={(e) => setMediaNote(e.target.value)} className="rounded bg-void border border-hairline px-3 py-2 text-xs font-mono" placeholder="Media / image reference" />
        <input value={event} onChange={(e) => setEvent(e.target.value)} className="rounded bg-void border border-hairline px-3 py-2 text-xs font-mono" placeholder="Upcoming event" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { onSave({ name, blurb, media_note: mediaNote, event }); setEditing(false); }} className="rounded bg-gold text-void px-4 py-2 text-sm font-semibold">Save</button>
        <button onClick={() => setEditing(false)} className="rounded border border-hairline px-4 py-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}

function NewCharityForm({ onCreate, onCancel }: { onCreate: (c: Omit<Charity, "id">) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [mediaNote, setMediaNote] = useState("");
  const [event, setEvent] = useState("");

  return (
    <div className="rounded border border-gold/50 bg-surface p-5 space-y-3 mt-2">
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded bg-void border border-hairline px-3 py-2 text-sm" placeholder="Charity name" />
      <input value={blurb} onChange={(e) => setBlurb(e.target.value)} className="w-full rounded bg-void border border-hairline px-3 py-2 text-sm" placeholder="One-line description" />
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={mediaNote} onChange={(e) => setMediaNote(e.target.value)} className="rounded bg-void border border-hairline px-3 py-2 text-xs font-mono" placeholder="Media / image reference" />
        <input value={event} onChange={(e) => setEvent(e.target.value)} className="rounded bg-void border border-hairline px-3 py-2 text-xs font-mono" placeholder="Upcoming event" />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => name && blurb && onCreate({ name, blurb, media_note: mediaNote || "no media yet", event: event || "no event scheduled" })}
          className="rounded bg-gold text-void px-4 py-2 text-sm font-semibold"
        >
          Add to directory
        </button>
        <button onClick={onCancel} className="rounded border border-hairline px-4 py-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}
