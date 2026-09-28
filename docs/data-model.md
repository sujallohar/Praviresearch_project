# Data Model

## Collections
- `users`: User profiles, roles, and department links.
- `departments`: Government departments (e.g., Transport, Health).
- `assets`: Core asset registry (assetId, name, type, location, status).
- `projects`: Construction/acquisition projects linked to assets.
- `inspections`: Inspection records for assets (date, findings, condition).
- `issues`: Discrepancies and problems (severity, status, assignedTo).
- `maintenanceRecords`: Scheduled and completed maintenance tasks.
- `auditLogs`: System changes and important mutations.
- `notifications`: Alerts for users.

## Security Model
- **Firestore Rules:** 
  - Admins: Read/Write all.
  - Officers: Read/Write within department.
  - Field Engineers: Write inspections/issues, Read assets.
  - Viewers: Read-only access to public status.
- **AI:** Bounded context, read-only queries. AI cannot execute writes or bypass Firestore rules.
