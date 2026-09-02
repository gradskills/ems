"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { projectStatusLabel } from "@/lib/ems";
import type { Project, ProjectStatus } from "@/lib/types";

const statuses: ProjectStatus[] = ["planning", "active", "on_hold", "completed", "cancelled"];

export function EditProjectModal({ project, open, onClose }: { project: Project | undefined; open: boolean; onClose: () => void }) {
  const updateProject = useApp((s) => s.updateProject);
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "planning");
  const [repoUrl, setRepoUrl] = useState(project?.repoUrl ?? "");
  const [link, setLink] = useState(project?.link ?? "");

  if (!project) return null;
  const p = project;

  function save() {
    updateProject(p.id, { status, repoUrl: repoUrl.trim() || undefined, link: link.trim() || undefined });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit — ${p.name}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            {statuses.map((s) => <option key={s} value={s}>{projectStatusLabel[s]}</option>)}
          </select>
        </Field>
        <Field label="Git / repo URL" hint="Where the team can check code status.">
          <Input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="github.com/pixelforge/acme" />
        </Field>
        <Field label="Live preview URL">
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://staging.acme.in" />
        </Field>
      </div>
    </Modal>
  );
}
