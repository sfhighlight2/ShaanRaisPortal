import type {
  User, Client, Project, Phase, Task, Deliverable,
  Document, Update, Question, ActivityLog, Notification, PackageTemplate,
} from "./types";

// ===== Users =====
export const mockUsers: User[] = [
  {
    id: "u1", firstName: "Sarah", lastName: "Mitchell", email: "sarah@shaanrais.com",
    role: "admin", status: "active", createdAt: "2024-01-01",
  },
  {
    id: "u2", firstName: "James", lastName: "Chen", email: "james@shaanrais.com",
    role: "manager", status: "active", createdAt: "2024-01-15",
  },
  {
    id: "u3", firstName: "Aisha", lastName: "Patel", email: "aisha@shaanrais.com",
    role: "team_member", status: "active", createdAt: "2024-02-01",
  },
  {
    id: "u4", firstName: "David", lastName: "Thornton", email: "david@thorntongroup.com",
    role: "client", status: "active", createdAt: "2024-03-01",
  },
];

// ===== Clients =====
export const mockClients: Client[] = [
  {
    id: "c1", companyName: "Thornton Group", primaryContactName: "David Thornton",
    primaryContactEmail: "david@thorntongroup.com", phone: "+1 555-0101",
    status: "active", accountManagerId: "u2",
    googleDriveUrl: "https://drive.google.com/drive/folders/example1",
    createdAt: "2024-03-01",
  },
  {
    id: "c2", companyName: "Apex Ventures", primaryContactName: "Maria Santos",
    primaryContactEmail: "maria@apexventures.co", status: "onboarding",
    accountManagerId: "u2", createdAt: "2024-06-10",
  },
  {
    id: "c3", companyName: "Redline Media", primaryContactName: "Kevin Park",
    primaryContactEmail: "kevin@redlinemedia.io", status: "waiting_on_client",
    accountManagerId: "u1", createdAt: "2024-04-20",
  },
  {
    id: "c4", companyName: "Sterling & Co", primaryContactName: "Natalie Wells",
    primaryContactEmail: "natalie@sterlingco.com", status: "completed",
    accountManagerId: "u2", createdAt: "2024-01-15",
  },
  {
    id: "c5", companyName: "BlueShift Labs", primaryContactName: "Omar Hassan",
    primaryContactEmail: "omar@blueshiftlabs.com", status: "active",
    accountManagerId: "u1", createdAt: "2024-05-05",
  },
];

// ===== Projects =====
export const mockProjects: Project[] = [
  {
    id: "p1", clientId: "c1", packageTemplateId: "t1",
    projectName: "Growth Consulting Package", description: "120-Day Launch to Scale program",
    status: "active", currentPhaseId: "ph2", isMainProject: true, createdAt: "2024-03-01",
  },
  {
    id: "p2", clientId: "c2", packageTemplateId: "t1",
    projectName: "Brand Authority Program", status: "active",
    currentPhaseId: "ph6", isMainProject: true, createdAt: "2024-06-10",
  },
];

// ===== Phases (for project p1) =====
export const mockPhases: Phase[] = [
  { id: "ph1", projectId: "p1", name: "Onboarding", description: "Account setup and intake", estimatedTimeline: "Week 1-2", status: "completed", sortOrder: 1 },
  { id: "ph2", projectId: "p1", name: "Strategy Development", description: "Deep-dive into positioning and growth plan", estimatedTimeline: "Week 3-5", status: "current", sortOrder: 2 },
  { id: "ph3", projectId: "p1", name: "Execution", description: "Implementation of strategy assets", estimatedTimeline: "Week 6-12", status: "upcoming", sortOrder: 3 },
  { id: "ph4", projectId: "p1", name: "Review & Optimize", description: "Performance analysis and refinement", estimatedTimeline: "Week 13-15", status: "upcoming", sortOrder: 4 },
  { id: "ph5", projectId: "p1", name: "Completion", description: "Final deliverables and handoff", estimatedTimeline: "Week 16-17", status: "locked", sortOrder: 5 },
  // Phases for project p2
  { id: "ph6", projectId: "p2", name: "Onboarding", status: "current", sortOrder: 1 },
  { id: "ph7", projectId: "p2", name: "Brand Discovery", status: "upcoming", sortOrder: 2 },
];

// ===== Tasks =====
export const mockTasks: Task[] = [
  { id: "t1", phaseId: "ph1", title: "Complete company intake form", taskType: "form", status: "completed", visibleToClient: true, sortOrder: 1, completedAt: "2024-03-05" },
  { id: "t2", phaseId: "ph1", title: "Upload brand assets", taskType: "upload", status: "completed", visibleToClient: true, sortOrder: 2, completedAt: "2024-03-07" },
  { id: "t3", phaseId: "ph1", title: "Sign service agreement", taskType: "approval", status: "completed", visibleToClient: true, sortOrder: 3, completedAt: "2024-03-04" },
  { id: "t4", phaseId: "ph2", title: "Review positioning brief", taskType: "review", status: "pending", visibleToClient: true, sortOrder: 1 },
  { id: "t5", phaseId: "ph2", title: "Schedule strategy call", taskType: "scheduling", status: "pending", visibleToClient: true, sortOrder: 2 },
  { id: "t6", phaseId: "ph2", title: "Complete competitor analysis questionnaire", taskType: "form", status: "pending", visibleToClient: true, sortOrder: 3 },
  { id: "t7", phaseId: "ph3", title: "Review funnel blueprint", taskType: "review", status: "pending", visibleToClient: true, sortOrder: 1 },
  { id: "t8", phaseId: "ph3", title: "Approve content calendar", taskType: "approval", status: "pending", visibleToClient: true, sortOrder: 2 },
];

// ===== Deliverables =====
export const mockDeliverables: Deliverable[] = [
  { id: "d1", phaseId: "ph1", title: "Welcome Packet", description: "Onboarding guide and project overview", visibleToClient: true, uploadedBy: "u2", uploadedAt: "2024-03-02" },
  { id: "d2", phaseId: "ph2", title: "Brand Positioning Framework", description: "Strategic positioning analysis and recommendations", visibleToClient: true, uploadedBy: "u2", uploadedAt: "2024-03-18" },
  { id: "d3", phaseId: "ph2", title: "Growth Strategy Document", description: "Comprehensive 120-day growth roadmap", visibleToClient: false, uploadedBy: "u3" },
];

// ===== Documents =====
export const mockDocuments: Document[] = [
  { id: "doc1", clientId: "c1", title: "Service Agreement", documentType: "contract", visibleToClient: true, uploadedAt: "2024-03-01" },
  { id: "doc2", clientId: "c1", title: "Statement of Work", documentType: "sow", visibleToClient: true, uploadedAt: "2024-03-01" },
  { id: "doc3", clientId: "c1", title: "NDA", documentType: "agreement", visibleToClient: true, uploadedAt: "2024-03-01" },
];

// ===== Updates =====
export const mockUpdates: Update[] = [
  { id: "up1", clientId: "c1", projectId: "p1", title: "Strategy phase is underway", body: "We've completed your onboarding and are now deep into the strategy development phase. Your positioning brief will be ready for review this week.", visibleToClient: true, createdBy: "u2", createdAt: "2024-03-15" },
  { id: "up2", clientId: "c1", projectId: "p1", title: "Welcome to the portal!", body: "Your client portal is now active. Here you can track progress, complete tasks, and access all your project deliverables.", visibleToClient: true, createdBy: "u1", createdAt: "2024-03-01" },
];

// ===== Questions =====
export const mockQuestions: Question[] = [
  { id: "q1", clientId: "c1", projectId: "p1", subject: "Timeline for brand assets?", message: "When can I expect the first draft of the brand positioning framework?", status: "answered", response: "The brand positioning framework is currently being finalized and will be shared with you by end of this week.", respondedBy: "u2", createdAt: "2024-03-12" },
];

// ===== Activity Logs =====
export const mockActivityLogs: ActivityLog[] = [
  { id: "a1", clientId: "c1", projectId: "p1", userId: "u4", eventType: "login", eventLabel: "Client logged in", createdAt: "2024-03-15T10:30:00Z" },
  { id: "a2", clientId: "c1", projectId: "p1", userId: "u4", eventType: "task_completed", eventLabel: "Completed: Complete company intake form", createdAt: "2024-03-05T14:20:00Z" },
  { id: "a3", clientId: "c1", projectId: "p1", userId: "u4", eventType: "deliverable_viewed", eventLabel: "Viewed: Welcome Packet", createdAt: "2024-03-03T09:15:00Z" },
  { id: "a4", clientId: "c1", projectId: "p1", userId: "u4", eventType: "question_submitted", eventLabel: "Asked: Timeline for brand assets?", createdAt: "2024-03-12T11:45:00Z" },
];

// ===== Notifications =====
export const mockNotifications: Notification[] = [
  { id: "n1", userId: "u4", title: "New deliverable available", message: "Brand Positioning Framework has been uploaded to your portal.", read: false, link: "/deliverables", createdAt: "2024-03-18T09:00:00Z" },
  { id: "n2", userId: "u4", title: "Phase update", message: "You've entered the Strategy Development phase.", read: true, link: "/dashboard", createdAt: "2024-03-10T08:00:00Z" },
  { id: "n3", userId: "u4", title: "Question answered", message: "Your question about brand assets has been answered.", read: false, link: "/updates", createdAt: "2024-03-13T15:00:00Z" },
];

// ===== Package Templates =====
export const mockTemplates: PackageTemplate[] = [
  {
    id: "t1", name: "Growth Consulting Package", description: "120-Day Launch to Scale program for business owners ready to build authority and visibility.", active: true, createdBy: "u1", createdAt: "2024-01-01",
    phases: [
      {
        id: "tp1", templateId: "t1", name: "Onboarding", description: "Account setup, intake, and orientation", sortOrder: 1, estimatedTimeline: "Week 1-2",
        tasks: [
          { id: "tt1", phaseId: "tp1", title: "Complete company intake form", taskType: "form", required: true, sortOrder: 1 },
          { id: "tt2", phaseId: "tp1", title: "Upload brand assets", taskType: "upload", required: true, sortOrder: 2 },
          { id: "tt3", phaseId: "tp1", title: "Sign service agreement", taskType: "approval", required: true, sortOrder: 3 },
        ],
        deliverables: [
          { id: "td1", phaseId: "tp1", title: "Welcome Packet", description: "Onboarding guide and project overview", sortOrder: 1 },
        ],
      },
      {
        id: "tp2", templateId: "t1", name: "Strategy Development", sortOrder: 2, estimatedTimeline: "Week 3-5",
        tasks: [
          { id: "tt4", phaseId: "tp2", title: "Review positioning brief", taskType: "review", required: true, sortOrder: 1 },
          { id: "tt5", phaseId: "tp2", title: "Schedule strategy call", taskType: "scheduling", required: true, sortOrder: 2 },
        ],
        deliverables: [
          { id: "td2", phaseId: "tp2", title: "Brand Positioning Framework", sortOrder: 1 },
          { id: "td3", phaseId: "tp2", title: "Growth Strategy Document", sortOrder: 2 },
        ],
      },
      {
        id: "tp3", templateId: "t1", name: "Execution", sortOrder: 3, estimatedTimeline: "Week 6-12",
        tasks: [
          { id: "tt6", phaseId: "tp3", title: "Review funnel blueprint", taskType: "review", required: true, sortOrder: 1 },
          { id: "tt7", phaseId: "tp3", title: "Approve content calendar", taskType: "approval", required: true, sortOrder: 2 },
        ],
        deliverables: [
          { id: "td4", phaseId: "tp3", title: "Funnel Blueprint", sortOrder: 1 },
          { id: "td5", phaseId: "tp3", title: "Content Calendar", sortOrder: 2 },
        ],
      },
      {
        id: "tp4", templateId: "t1", name: "Review & Optimize", sortOrder: 4, estimatedTimeline: "Week 13-15",
        tasks: [],
        deliverables: [
          { id: "td6", phaseId: "tp4", title: "Performance Report", sortOrder: 1 },
        ],
      },
      {
        id: "tp5", templateId: "t1", name: "Completion", sortOrder: 5, estimatedTimeline: "Week 16-17",
        tasks: [],
        deliverables: [
          { id: "td7", phaseId: "tp5", title: "Final Handoff Package", sortOrder: 1 },
        ],
      },
    ],
  },
];

// Helper to get user by id
export const getUserById = (id: string) => mockUsers.find((u) => u.id === id);
export const getClientById = (id: string) => mockClients.find((c) => c.id === id);
export const getProjectsByClientId = (clientId: string) => mockProjects.filter((p) => p.clientId === clientId);
export const getPhasesByProjectId = (projectId: string) => mockPhases.filter((ph) => ph.projectId === projectId);
export const getTasksByPhaseId = (phaseId: string) => mockTasks.filter((t) => t.phaseId === phaseId);
export const getDeliverablesByPhaseId = (phaseId: string) => mockDeliverables.filter((d) => d.phaseId === phaseId);
