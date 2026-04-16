// ===== Core Types for Shaan Rais Client Portal =====

export type UserRole = "admin" | "manager" | "team_member" | "client";

export type ClientStatus =
  | "lead"
  | "onboarding"
  | "active"
  | "waiting_on_client"
  | "completed"
  | "archived";

export type PhaseStatus = "completed" | "current" | "upcoming" | "locked";

export type TaskType =
  | "checklist"
  | "form"
  | "upload"
  | "approval"
  | "scheduling"
  | "review";

export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";

export type QuestionStatus = "open" | "answered" | "closed";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  profilePhoto?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Client {
  id: string;
  companyName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  phone?: string;
  status: ClientStatus;
  accountManagerId: string;
  googleDriveUrl?: string;
  airtableUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  clientId: string;
  packageTemplateId?: string;
  projectName: string;
  description?: string;
  status: "active" | "paused" | "completed";
  currentPhaseId?: string;
  isMainProject: boolean;
  parentProjectId?: string;
  createdAt: string;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  estimatedTimeline?: string;
  status: PhaseStatus;
  sortOrder: number;
}

export interface Task {
  id: string;
  phaseId: string;
  title: string;
  description?: string;
  taskType: TaskType;
  status: TaskStatus;
  completedAt?: string;
  assignedToUserId?: string;
  visibleToClient: boolean;
  sortOrder: number;
}

export interface Deliverable {
  id: string;
  phaseId: string;
  title: string;
  description?: string;
  fileUrl?: string;
  status: string;
  completedAt?: string;
  visibleToClient: boolean;
  uploadedBy?: string;
  uploadedAt?: string;
}

export interface Document {
  id: string;
  clientId: string;
  title: string;
  documentType: "contract" | "sow" | "agreement" | "other";
  fileUrl?: string;
  visibleToClient: boolean;
  uploadedAt: string;
}

export type LinkType = "folder" | "document" | "video" | "spreadsheet" | "design" | "other";

export interface ClientLink {
  id: string;
  clientId: string;
  title: string;
  url: string;
  linkType: LinkType;
  description?: string;
  visibleToClient: boolean;
  createdAt: string;
}

export interface Update {
  id: string;
  clientId: string;
  projectId?: string;
  title: string;
  body: string;
  visibleToClient: boolean;
  createdBy: string;
  createdAt: string;
  _author?: {
    firstName: string;
    lastName: string;
  };
}

export interface Question {
  id: string;
  clientId: string;
  projectId?: string;
  subject: string;
  message: string;
  attachmentUrl?: string;
  status: QuestionStatus;
  response?: string;
  respondedBy?: string;
  responderProfile?: {
    first_name: string;
    last_name: string;
  };
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  clientId: string;
  projectId?: string;
  userId: string;
  eventType: string;
  eventLabel: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface PackageTemplate {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
  phases: TemplatePhase[];
}

export interface TemplatePhase {
  id: string;
  templateId: string;
  name: string;
  description?: string;
  sortOrder: number;
  estimatedTimeline?: string;
  tasks: TemplateTask[];
  deliverables: TemplateDeliverable[];
}

export interface TemplateTask {
  id: string;
  phaseId: string;
  title: string;
  description?: string;
  taskType: TaskType;
  required: boolean;
  sortOrder: number;
}

export interface TemplateDeliverable {
  id: string;
  phaseId: string;
  title: string;
  description?: string;
  sortOrder: number;
}

// ===== Onboarding Types =====

export interface OnboardingPhase {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  createdAt: string;
}

export interface OnboardingTask {
  id: string;
  phaseId: string;
  title: string;
  description?: string;
  displayOrder: number;
  required: boolean;
  resourceLink?: string;
}

export interface ManagerTaskCompletion {
  id: string;
  managerId: string;
  taskId: string;
  completed: boolean;
  completedAt?: string;
}

// ===== Resource Types =====

export type ResourceType = "link" | "pdf" | "video" | "gdoc" | "file";

export interface Resource {
  id: string;
  title: string;
  description?: string;
  category: string;
  type: ResourceType;
  url?: string;
  filePath?: string;
  displayOrder: number;
  visibleToRole: UserRole[];
}
