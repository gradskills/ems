"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { tagColor } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { X, Tag as TagIcon } from "lucide-react";

/** Read-only coloured tag chips for cards / rows. */
export function TagChips({ tags, className }: { tags?: string[]; className?: string }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {tags.map((t) => (
        <Badge key={t} color={tagColor(t)} className="px-2 py-0 text-[10px]">
          {t}
        </Badge>
      ))}
    </div>
  );
}

/** Editable multi-tag input: type + Enter to add, suggestions from existing tags. */
export function TagInput({
  tags,
  onChange,
  suggestions = [],
  disabled,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const matches = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return suggestions
      .filter((s) => !tags.includes(s) && (!q || s.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [draft, suggestions, tags]);

  function add(tag: string) {
    const t = tag.trim();
    if (!t || tags.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...tags, t]);
    setDraft("");
  }
  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  if (disabled) {
    return tags.length ? <TagChips tags={tags} /> : <span className="text-sm text-[var(--muted-2)]">No tags</span>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <Badge color={tagColor(t)} className="pr-1 text-[11px]">
              {t}
              <button type="button" onClick={() => remove(t)} className="ml-0.5 rounded-full p-0.5 hover:bg-black/10" aria-label={`Remove ${t}`}>
                <X size={10} />
              </button>
            </Badge>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && tags.length) {
              remove(tags[tags.length - 1]);
            }
          }}
          placeholder={tags.length ? "Add…" : "Add a tag…"}
          className="h-6 min-w-[80px] flex-1 bg-transparent px-1 text-sm outline-none"
        />
      </div>
      {matches.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border-strong)] px-2 py-0.5 text-[11px] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              <TagIcon size={10} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
