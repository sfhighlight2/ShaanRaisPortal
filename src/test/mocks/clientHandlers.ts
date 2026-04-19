/**
 * MSW handlers for Supabase REST API (PostgREST) endpoints.
 * Covers: clients, profiles, tasks, deliverables, documents, client_links, client_notes, phases.
 *
 * Handlers return minimal but structurally correct fixture data.
 * Tests that need different payloads should use `server.use(http.get(...))` overrides.
 */
import { http, HttpResponse } from "msw";

const SB = "http://localhost:54321/rest/v1";

// ── Fixtures ────────────────────────────────────────────
export const mockAdmin = {
  id: "user-admin-001",
  first_name: "Sarah",
  last_name: "Admin",
  email: "admin@example.com",
  role: "admin",
  status: "active",
  created_at: "2024-01-01T00:00:00Z",
};

export const mockClient = {
  id: "client-001",
  company_name: "Acme Corp",
  primary_contact_name: "John Doe",
  primary_contact_email: "john@acme.com",
  phone: "555-1234",
  status: "active",
  google_drive_url: null,
  airtable_url: null,
  account_manager_id: "user-admin-001",
  package_template_id: null,
  manager: { id: "user-admin-001", first_name: "Sarah", last_name: "Admin" },
  created_at: "2024-01-01T00:00:00Z",
};

export const mockPhase = {
  id: "phase-001",
  project_id: "project-001",
  name: "Discovery",
  status: "current",
  sort_order: 1,
};

export const mockTask = {
  id: "task-001",
  phase_id: "phase-001",
  title: "Initial kickoff call",
  task_type: "review",
  status: "pending",
  sort_order: 1,
};

export const mockDeliverable = {
  id: "deliv-001",
  phase_id: "phase-001",
  title: "Brand Guidelines",
  visible_to_client: true,
};

export const mockDocument = {
  id: "doc-001",
  client_id: "client-001",
  title: "Contract.pdf",
  document_type: "contract",
  file_url: "https://example.com/contract.pdf",
  visible_to_client: true,
  uploaded_at: "2024-01-01T00:00:00Z",
};

export const mockLink = {
  id: "link-001",
  client_id: "client-001",
  title: "Drive Folder",
  url: "https://drive.google.com/drive/folders/123",
  link_type: "folder",
  description: null,
  visible_to_client: true,
  created_at: "2024-01-01T00:00:00Z",
};

export const mockNote = {
  id: "note-001",
  client_id: "client-001",
  content: "Client prefers email communication.",
  created_by: "user-admin-001",
  visible_to_client: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  author: { first_name: "Sarah", last_name: "Admin" },
};

// ── Handlers ─────────────────────────────────────────────
export const clientHandlers = [
  // Profiles (admin/manager list)
  http.get(`${SB}/profiles`, () =>
    HttpResponse.json([mockAdmin])
  ),

  // Package templates
  http.get(`${SB}/package_templates`, () =>
    HttpResponse.json([{ id: "tmpl-001", name: "Starter Package", active: true }])
  ),

  // Clients list
  http.get(`${SB}/clients`, ({ request }) => {
    const url = new URL(request.url);
    const idFilter = url.searchParams.get("id");
    // Single-record fetch (eq=id)
    if (idFilter) {
      return HttpResponse.json([mockClient]);
    }
    return HttpResponse.json([mockClient]);
  }),

  // PATCH client (edit)
  http.patch(`${SB}/clients`, () =>
    HttpResponse.json([mockClient])
  ),

  // Projects
  http.get(`${SB}/projects`, () =>
    HttpResponse.json([{ id: "project-001" }])
  ),

  // Phases
  http.get(`${SB}/phases`, () =>
    HttpResponse.json([mockPhase])
  ),

  // Tasks
  http.get(`${SB}/tasks`, () =>
    HttpResponse.json([mockTask])
  ),

  // POST task (new)
  http.post(`${SB}/tasks`, () =>
    HttpResponse.json([{ ...mockTask, id: "task-new" }], { status: 201 })
  ),

  // PATCH task (edit)
  http.patch(`${SB}/tasks`, () =>
    HttpResponse.json([mockTask])
  ),

  // DELETE task
  http.delete(`${SB}/tasks`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  // Deliverables
  http.get(`${SB}/deliverables`, () =>
    HttpResponse.json([mockDeliverable])
  ),

  http.post(`${SB}/deliverables`, () =>
    HttpResponse.json([{ ...mockDeliverable, id: "deliv-new" }], { status: 201 })
  ),

  http.patch(`${SB}/deliverables`, () =>
    HttpResponse.json([mockDeliverable])
  ),

  // Documents
  http.get(`${SB}/documents`, () =>
    HttpResponse.json([mockDocument])
  ),

  http.post(`${SB}/documents`, () =>
    HttpResponse.json([{ ...mockDocument, id: "doc-new" }], { status: 201 })
  ),

  http.patch(`${SB}/documents`, () =>
    HttpResponse.json([mockDocument])
  ),

  http.delete(`${SB}/documents`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  // Client links
  http.get(`${SB}/client_links`, () =>
    HttpResponse.json([mockLink])
  ),

  http.post(`${SB}/client_links`, () =>
    HttpResponse.json([{ ...mockLink, id: "link-new" }], { status: 201 })
  ),

  http.patch(`${SB}/client_links`, () =>
    HttpResponse.json([mockLink])
  ),

  http.delete(`${SB}/client_links`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  // Client notes
  http.get(`${SB}/client_notes`, () =>
    HttpResponse.json([mockNote])
  ),

  http.post(`${SB}/client_notes`, () =>
    HttpResponse.json([{ ...mockNote, id: "note-new" }], { status: 201 })
  ),

  http.patch(`${SB}/client_notes`, () =>
    HttpResponse.json([mockNote])
  ),

  http.delete(`${SB}/client_notes`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  // Updates
  http.get(`${SB}/updates`, () =>
    HttpResponse.json([])
  ),

  // Questions
  http.get(`${SB}/questions`, () =>
    HttpResponse.json([])
  ),

  // Activity logs
  http.get(`${SB}/activity_logs`, () =>
    HttpResponse.json([])
  ),
];
