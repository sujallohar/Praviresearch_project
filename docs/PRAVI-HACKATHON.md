# Pravi Hackathon: GovAsset 360

## Problem Framing
Government assets (roads, buildings, vehicles, equipment) are currently managed in fragmented systems. There is no unified view of asset creation, lifecycle, inspections, maintenance, and issue reporting. This leads to inefficiencies, delayed maintenance, and lack of transparency. GovAsset 360 aims to solve this by providing a unified lifecycle view of government assets.

## Assumptions
- A modular monolith is sufficient for MVP.
- A single region deployment is acceptable for this phase.
- We have access to Firebase for Authentication, Firestore, and Hosting.
- Gemini API (via Firebase AI Logic or serverless) is available for the AI assistant.

## Stakeholders
- Administrators: Manage overall system configurations and high-level oversight.
- Department Officers: Oversee assets and workflows for their specific department.
- Field Engineers: Perform on-site inspections and record issues.
- Contractors: View and update tasks/maintenance (lightweight view).
- Citizens/Viewers: Access public reports (read-only).
