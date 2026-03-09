
# Shaan Rais Client Portal — Implementation Plan

## Design System: "Legacy Interface System"

**Color palette** — Premium dark/neutral with gold accent:
- **Background**: Deep charcoal (#0F0F0F) for sidebar, off-white (#FAFAF8) for main content
- **Text**: Near-black (#1A1A1A) on light, ivory (#F5F5F0) on dark
- **Accent**: Champagne gold (#C9A96E) for CTAs, highlights, active states
- **Neutral surfaces**: Warm stone grays for cards and borders
- **Functional**: Muted green (success), amber (warning), soft red (error)

**Typography**: Inter for UI body, plus a refined serif or display font for headlines to convey authority

**Components**: Clean cards with 16px radius, restrained shadows, thin refined icons (Lucide), generous spacing (24-32px card padding)

---

## Phase 1: Shell & Design Foundation
- App layout shell: collapsible sidebar + top bar + main content area
- Design tokens and color system in Tailwind config
- Role-based routing logic (client vs admin/manager/team views using mock auth)
- Shared layout components (sidebar nav, status strips, page shells)

## Phase 2: Authentication Screens (Mock)
- **Login page** — Split layout: left branded panel with logo + tagline, right login form
- **First-time welcome screen** — Concierge-style onboarding with 3-step explanation + "Begin" CTA
- Mock auth context to toggle between client/admin roles for development

## Phase 3: Client Dashboard
- **Hero status strip**: Current phase, package, status, account manager
- **Next Step card**: Single dominant CTA (most important pending action)
- **Phase journey tracker**: Horizontal stepper showing completed/current/upcoming phases
- **My Tasks section**: Task cards with type badges (Form, Upload, Review, Approval, Schedule, Complete)
- **Current Deliverables**: Cards with title, phase, date, view/download action
- **Recent Updates**: Timeline-style feed
- **Quick links**: Contracts/Documents, Google Drive link, Ask a Question

## Phase 4: Admin Dashboard
- **Master client table**: Sortable columns (Client, Package, Status, Phase, Manager, Last Activity)
- **Filter bar**: Search + filters by status, phase, manager, package, activity
- **Client Detail View**: Tabbed layout with overview, phase tracker, tasks, deliverables, internal notes, activity feed, questions, team assignments
- **Quick actions**: Change status, update phase, post update

## Phase 5: Template Builder
- **Package template list** with create/edit
- **Template editor**: Package name/description, sortable phases list, tasks per phase (with type selection), deliverables per phase, estimated timelines
- **Template preview** before saving

## Phase 6: Supporting Screens
- **Task detail page**: Full task view with completion forms based on task type
- **Deliverables & Documents page**: Organized by phase with type badges
- **Updates feed page**: Full timeline view
- **Ask a Question form**: Subject, message, optional attachment
- **Notification center**: Badge count + dropdown/page with notification list
- **Profile/Company Info page**

## Phase 7: Internal Team Screens
- **User & permissions management**: List internal users, assign roles
- **Question inbox**: View and respond to client questions
- **Activity log**: Filterable event feed per client
- **Status/Phase management**: Configure available statuses and phases

---

## Data Architecture (Mock)
All data will use TypeScript interfaces and mock data stores, structured to match the final Supabase schema:
- Users, Clients, Projects, Phases, Tasks, Deliverables, Documents, Updates, Questions, Activity Logs, Package Templates, Team Assignments, Notifications

## Navigation Structure

**Client sidebar**: Dashboard, My Tasks, Deliverables, Documents, Updates, Profile
**Admin sidebar**: Overview, Clients, Templates, Questions, Team, Settings

---

## Key UX Principles Applied
- Phase-first navigation — always show where the client is in the journey
- One primary action per screen
- Progressive disclosure (summaries first, expand for detail)
- Client language is human and aspirational, not technical
- Internal views are denser and operationally focused
