/**
 * Bulk operations utilities — CSV export/import for companies,
 * JSON export/import for package templates.
 * All functions are pure data transforms; no Supabase calls.
 */

import type { ClientStatus } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedCompanyRow {
  company_name: string;
  primary_contact_name: string;
  primary_contact_email?: string;
  phone?: string;
  status?: ClientStatus;
  google_drive_url?: string;
  airtable_url?: string;
  deal_url?: string;
}

// ── File download helper ───────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function csvEscape(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Companies CSV export ───────────────────────────────────────────────────────

const COMPANY_COLS = [
  "company_name", "primary_contact_name", "primary_contact_email",
  "phone", "status", "google_drive_url", "airtable_url", "deal_url",
] as const;

export function exportCompaniesCSV(clients: Record<string, unknown>[]): void {
  const header = COMPANY_COLS.join(",");
  const rows = clients.map((c) => COMPANY_COLS.map((col) => csvEscape(c[col])).join(","));
  downloadFile([header, ...rows].join("\n"), "companies.csv", "text/csv");
}

// ── Companies CSV import ───────────────────────────────────────────────────────

const VALID_STATUSES = new Set<string>([
  "lead", "onboarding", "active", "paused", "waiting_on_client", "completed", "archived",
]);

export function parseCompaniesCSV(text: string): { rows: ParsedCompanyRow[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { rows: [], errors: ["File must have a header row and at least one data row."] };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const missing = (["company_name", "primary_contact_name"] as const).filter((r) => !headers.includes(r));
  if (missing.length > 0) {
    return { rows: [], errors: [`Missing required columns: ${missing.join(", ")}`] };
  }

  const rows: ParsedCompanyRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] ?? ""; });

    if (!obj.company_name) { errors.push(`Row ${i + 1}: missing company_name, skipped.`); continue; }
    if (!obj.primary_contact_name) { errors.push(`Row ${i + 1}: missing primary_contact_name, skipped.`); continue; }

    const rawStatus = obj.status?.toLowerCase();
    rows.push({
      company_name: obj.company_name,
      primary_contact_name: obj.primary_contact_name,
      primary_contact_email: obj.primary_contact_email || undefined,
      phone: obj.phone || undefined,
      status: (rawStatus && VALID_STATUSES.has(rawStatus) ? rawStatus : undefined) as ClientStatus | undefined,
      google_drive_url: obj.google_drive_url || undefined,
      airtable_url: obj.airtable_url || undefined,
      deal_url: obj.deal_url || undefined,
    });
  }

  return { rows, errors };
}

// ── Template JSON export ───────────────────────────────────────────────────────

export function exportTemplateJSON(template: Record<string, unknown>): void {
  // Strip DB-specific fields callers shouldn't re-import verbatim
  const payload = {
    _exportVersion: 1,
    name: template.name,
    description: template.description ?? null,
    phases: template.phases,
  };
  const slug = String(template.name ?? "template").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  downloadFile(JSON.stringify(payload, null, 2), `${slug}.template.json`, "application/json");
}

// ── Template JSON import ───────────────────────────────────────────────────────

export interface ParsedTemplate {
  name: string;
  description: string | null;
  phases: Array<{
    name: string;
    estimatedTimeline?: string;
    description?: string;
    tasks: Array<{
      title: string;
      taskType: string;
      notes?: string;
      visibleToClient: boolean;
      required?: boolean;
      subtasks: Array<{ title: string; visibleToClient: boolean }>;
    }>;
    deliverables: Array<{ title: string; description?: string; visibleToClient: boolean }>;
  }>;
}

export function parseTemplateJSON(text: string): { template: ParsedTemplate | null; error: string | null } {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch {
    return { template: null, error: "Invalid JSON file." };
  }

  if (!raw.name || typeof raw.name !== "string") {
    return { template: null, error: "Template must have a \"name\" field." };
  }
  if (!Array.isArray(raw.phases)) {
    return { template: null, error: "Template must have a \"phases\" array." };
  }

  const phases = (raw.phases as Record<string, unknown>[]).map((ph) => ({
    name: String(ph.name ?? "Phase"),
    description: ph.description ? String(ph.description) : undefined,
    estimatedTimeline: (ph.estimatedTimeline ?? ph.estimated_timeline) ? String(ph.estimatedTimeline ?? ph.estimated_timeline) : undefined,
    tasks: Array.isArray(ph.tasks)
      ? (ph.tasks as Record<string, unknown>[]).map((tk) => ({
          title: String(tk.title ?? "Task"),
          taskType: String(tk.task_type ?? tk.taskType ?? "checklist"),
          notes: tk.notes ? String(tk.notes) : undefined,
          visibleToClient: Boolean(tk.visible_to_client ?? tk.visibleToClient ?? true),
          required: Boolean(tk.required ?? true),
          subtasks: Array.isArray(tk.subtasks)
            ? (tk.subtasks as Record<string, unknown>[]).map((st) => ({
                title: String(st.title ?? ""),
                visibleToClient: Boolean(st.visible_to_client ?? st.visibleToClient ?? true),
              }))
            : [],
        }))
      : [],
    deliverables: Array.isArray(ph.deliverables)
      ? (ph.deliverables as Record<string, unknown>[]).map((d) => ({
          title: String(d.title ?? "Deliverable"),
          description: d.description ? String(d.description) : undefined,
          visibleToClient: Boolean(d.visible_to_client ?? d.visibleToClient ?? true),
        }))
      : [],
  }));

  return {
    template: {
      name: raw.name,
      description: raw.description ? String(raw.description) : null,
      phases,
    },
    error: null,
  };
}
