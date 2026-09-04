"use client";

import { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Avatar, Button } from "@/components/ui/primitives";
import { Camera, Trash2 } from "lucide-react";
import type { User } from "@/lib/types";

/**
 * Downscale + compress an uploaded image to a small square JPEG data URI so it
 * fits comfortably in the users.avatar_url text column (no storage bucket in
 * this prototype). Center-crops to a square, caps the longest edge at 256px.
 */
function fileToAvatarDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = Math.min(side, max);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas context"));
      ctx.drawImage(img, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not load image"));
    };
    img.src = url;
  });
}

/** Round avatar preview with change / remove controls — reused across edit modals. */
export function AvatarPicker({ name, value, onChange }: { name: string; value?: string; onChange: (dataUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function pick(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > 8 * 1024 * 1024) return setError("Image is too large (max 8 MB).");
    setError(undefined);
    setBusy(true);
    try {
      onChange(await fileToAvatarDataUrl(file));
    } catch {
      setError("Couldn't process that image. Try another.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name} size={72} src={value} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--primary)] text-white shadow-[var(--shadow-sm)]"
          title="Change photo"
        >
          <Camera size={13} />
        </button>
      </div>
      <div className="space-y-1">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Camera size={14} /> {busy ? "Processing…" : value ? "Change photo" : "Upload photo"}
          </Button>
          {value && (
            <Button variant="ghost" size="sm" onClick={() => onChange("")} disabled={busy}>
              <Trash2 size={14} /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-[var(--muted-2)]">{error ?? "JPG or PNG · square works best."}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}

/**
 * Self-service profile editor for the acting employee. Only exposes personal
 * fields employees should own (photo, name, phone, location) — role, department,
 * pay and reporting line stay admin-only via EditEmployeeModal.
 */
export function MyProfileEditModal({ open, onClose, employee }: { open: boolean; onClose: () => void; employee: User }) {
  const updateEmployee = useApp((s) => s.updateEmployee);

  const [avatarUrl, setAvatarUrl] = useState(employee.avatarUrl ?? "");
  const [name, setName] = useState(employee.name);
  const [phone, setPhone] = useState(employee.phone);
  const [location, setLocation] = useState(employee.location ?? "");

  useEffect(() => {
    if (open) {
      setAvatarUrl(employee.avatarUrl ?? "");
      setName(employee.name);
      setPhone(employee.phone);
      setLocation(employee.location ?? "");
    }
  }, [open, employee]);

  const valid = name.trim().length > 0;

  function submit() {
    if (!valid) return;
    updateEmployee(employee.id, {
      name: name.trim(),
      phone: phone.trim(),
      location: location.trim() || undefined,
      avatarUrl,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit my profile"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!valid}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Profile photo">
          <AvatarPicker name={name || employee.name} value={avatarUrl} onChange={setAvatarUrl} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Work email" hint="Contact an admin to change your email.">
            <Input value={employee.email} disabled />
          </Field>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 98765 43210" /></Field>
          <Field label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Mumbai" /></Field>
        </div>
      </div>
    </Modal>
  );
}
