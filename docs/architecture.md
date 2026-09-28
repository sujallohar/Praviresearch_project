# Logical Architecture

## Overview
GovAsset 360 is built as a modular monolith optimized for rapid iteration.

- **Frontend:** React + TypeScript + Vite, using Tailwind CSS for UI.
- **Backend/Data:** Firebase (Firestore) for NoSQL database.
- **Authentication:** Firebase Auth.
- **AI Integration:** Client-side `@google/generative-ai` parsing live Firestore context (Gemini 1.5 Flash). Includes deterministic offline fallback.
- **Hosting:** Firebase Hosting.

## Modules
1. **Asset Management:** Core registry.
2. **Project/Lifecycle:** Project linking and status tracking.
3. **Inspection & Maintenance:** Field data collection.
4. **Issue Tracking:** Discrepancy lifecycle.
5. **Reporting:** Dashboard & Analytics.
6. **AI Assistant:** NLP querying module.
7. **Audit:** Logging of important mutations.

## Deployment Plan
- Deploy frontend to Firebase Hosting.
- CI/CD via GitHub Actions (if time permits).

## Scalability Roadmap
- Transition specific high-volume modules (e.g., Inspections, IoT telemetry) to microservices.
- Implement data warehousing (e.g., BigQuery) for advanced AI/Analytics as data grows.
