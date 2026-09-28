# Requirements

## MVP Scope
- Asset Registration & View
- Project/Lifecycle Tracking
- Inspections & Issues/Discrepancy Reporting
- Maintenance Records
- Dashboard with key operational metrics
- AI Assistant for querying data naturally

## Functional Requirements
- **Auth:** Role-based access control (Admin, Officer, Field Engineer, Contractor).
- **Assets:** CRUD operations for assets. Link assets to projects.
- **Inspections:** Create and view inspection records against assets.
- **Issues:** Create, update, and resolve issues/discrepancies.
- **AI:** Read-only queries to summarize assets, projects, and issues based on bounded context.

## Non-Functional Requirements
- **Performance:** Fast dashboard load times.
- **Usability:** Responsive, accessible design suitable for field engineers on mobile.
- **Security:** Secure authentication, restricted read/write permissions via Firestore Security Rules.
- **Auditability:** Core mutations should produce audit logs.

## Explicit Out-of-Scope Items
- Full e-procurement or tender bidding engine.
- Real-time IoT sensor integration.
- Offline-first capabilities for this 3-hour MVP.
- Complex GIS/Map integration.
- Autonomous AI actions (AI is read-only).
