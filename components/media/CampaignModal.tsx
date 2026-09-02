"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import type { Campaign, CampaignStatus } from "@/lib/types";

const statuses: CampaignStatus[] = ["draft", "scheduled", "running", "completed", "paused"];
const channels = ["Instagram", "Facebook", "Meta Ads", "Google Ads", "LinkedIn", "WhatsApp"];

export function CampaignModal({ campaign, open, onClose }: { campaign: Campaign | null; open: boolean; onClose: () => void }) {
  const createCampaign = useApp((s) => s.createCampaign);
  const updateCampaign = useApp((s) => s.updateCampaign);
  const clients = useApp((s) => s.clients);

  const editing = !!campaign;
  const [name, setName] = useState(campaign?.name ?? "");
  const [clientId, setClientId] = useState(campaign?.clientId ?? "");
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status ?? "draft");
  const [channel, setChannel] = useState(campaign?.channel ?? "Instagram");
  const [startAt, setStartAt] = useState(campaign?.startAt ? campaign.startAt.slice(0, 10) : "");
  const [endAt, setEndAt] = useState(campaign?.endAt ? campaign.endAt.slice(0, 10) : "");
  const [reach, setReach] = useState(campaign?.reach?.toString() ?? "");
  const [engagement, setEngagement] = useState(campaign?.engagement?.toString() ?? "");
  const [spend, setSpend] = useState(campaign?.spend?.toString() ?? "");
  const [leads, setLeads] = useState(campaign?.leads?.toString() ?? "");
  const [checkUrl, setCheckUrl] = useState(campaign?.checkUrl ?? "");
  const [liveUrl, setLiveUrl] = useState(campaign?.liveUrl ?? "");

  const valid = name.trim() && clientId && channel.trim();

  function save() {
    if (!valid) return;
    const base = {
      clientId,
      name: name.trim(),
      status,
      channel,
      startAt: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      reach: reach ? +reach : 0,
      engagement: engagement ? +engagement : 0,
      spend: spend ? +spend : 0,
      leads: leads ? +leads : 0,
      checkUrl: checkUrl.trim() || undefined,
      liveUrl: liveUrl.trim() || undefined,
    };
    if (editing && campaign) updateCampaign(campaign.id, base);
    else createCampaign(base);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit — ${campaign?.name}` : "Create campaign"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid} onClick={save}>{editing ? "Save changes" : "Create campaign"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Campaign name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Monsoon Wellness Push" autoFocus /></Field>
        <Field label="Client *">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
          </select>
        </Field>
        <Field label="Channel">
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            {channels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Start date"><Input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></Field>
        <Field label="End date"><Input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></Field>
      </div>

      <div className="mt-4">
        <h4 className="mb-2 text-sm font-semibold">Links</h4>
        <div className="grid grid-cols-1 gap-3">
          <Field label="Check status URL" hint="Dashboard / ad-manager link to check the campaign status.">
            <Input value={checkUrl} onChange={(e) => setCheckUrl(e.target.value)} placeholder="https://adsmanager.facebook.com/campaigns/…" />
          </Field>
          <Field label="Live preview URL" hint="Link to view the live campaign or creative.">
            <Input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://instagram.com/…" />
          </Field>
        </div>
      </div>

      {editing && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Reach"><Input type="number" value={reach} onChange={(e) => setReach(e.target.value)} /></Field>
          <Field label="Engagement %"><Input type="number" value={engagement} onChange={(e) => setEngagement(e.target.value)} /></Field>
          <Field label="Spend ₹"><Input type="number" value={spend} onChange={(e) => setSpend(e.target.value)} /></Field>
          <Field label="Leads"><Input type="number" value={leads} onChange={(e) => setLeads(e.target.value)} /></Field>
        </div>
      )}
    </Modal>
  );
}
