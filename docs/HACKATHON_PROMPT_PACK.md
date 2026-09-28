# Pravi Research — GovAsset 360
## Antigravity Hackathon Prompt Pack

> **Purpose:** Copy and paste the prompts below into Antigravity sequentially during the 3-hour Pravi Tech Track hackathon.
>
> **Recommended approach:** Use **one prompt at a time**, wait for Antigravity to finish and verify the result, then paste the next prompt. Do not paste all six prompts at once. The prompts are deliberately time-boxed so the agent can build a working end-to-end MVP before spending time on polish.

### Hackathon operating rule

**Priority order:** Working end-to-end product → core workflow → data → AI assistant → deployment → documentation → polish.

If time becomes tight, reduce scope rather than leaving the application half-built.

---

PRAVI RESEARCH — TECH TRACK

GovAsset 360

3-Hour Hackathon • Antigravity Prompt Pack

Government Asset Lifecycle & Intelligence Platform

How to use this document

Use the prompts sequentially. Do not paste all prompts at once.

Each prompt is written to make Antigravity inspect the current state and continue from where the previous prompt stopped.

The prompts deliberately prioritize a working end-to-end MVP over unnecessary feature breadth because the hackathon is only 3 hours.

If Antigravity is still executing a prompt, do not interrupt it merely because it is taking time. If it finishes early, immediately issue the next prompt.

The target is a demonstrable vertical slice: asset → project/lifecycle → inspection/issue → dashboard → AI assistant → deployment.

Create a PUBLIC GitHub repository. Never commit Gemini credentials, Firebase service-account JSON, .env files, or other secrets.

Core product definition

GovAsset 360 is a unified government asset lifecycle and intelligence platform. It should demonstrate how government can register and manage multiple asset types, connect assets to projects and workflows, track inspections and discrepancies, manage maintenance, produce operational dashboards, and query the system through an AI assistant.

Pravi Tech Track alignment

Understand Problems — model the problem using user, process and data lenses.

Design Solutions — design a secure and scalable governance platform.

Make Prototypes — rapidly build a proof-of-concept around a complete workflow.

Build Product — produce a deployable, documented working system.

Working product narrative: Problem → Research/Assumptions → Root Cause → Stakeholders → User Journey → Solution → Architecture → Prototype → Testing → Deployment → Impact → Scale.

Recommended 3-hour execution strategy

| Stage | Time | Primary outcome | Do not overbuild |
| --- | --- | --- | --- |
| Prompt 1 | 0–15 min | Scope, architecture, repo, Firebase plan | No elaborate research portal |
| Prompt 2 | 15–40 min | Scaffold + auth + Firestore + core layout | No microservice explosion |
| Prompt 3 | 40–95 min | Core asset/project/issue workflows | No perfect UI |
| Prompt 4 | 95–120 min | AI assistant + analytics | No autonomous AI actions |
| Prompt 5 | 120–150 min | Testing, hardening, deployment | No new major features |
| Prompt 6 | 150–180 min | Docs, demo data, final polish, GitHub | No architectural rewrites |

## PROMPT 1 — Scope, Architecture & Project Bootstrap

Purpose: Lock the problem, MVP, architecture, repository structure and implementation direction before spending time coding.

Suggested timebox: 0–15 minutes

PASTE THIS ENTIRE PROMPT INTO ANTIGRAVITY:

You are the lead technical product engineer for a 3-hour Pravi Research Tech Track hackathon.PROJECT:GovAsset 360 — Government Asset Lifecycle & Intelligence Platform.CONTEXT:The challenge is intentionally broad: build a complete working software flow for a real-world government/governance problem. Pravi's Tech Associate expectations emphasize understanding problems through user/process/data lenses, designing secure scalable systems, rapidly prototyping, and building deployable governance platforms.IMPORTANT CONSTRAINT:We have only 3 hours. Optimize aggressively for a credible working vertical slice, not a huge enterprise system.FIRST, INSPECT:1. Inspect the current workspace/repository.2. Inspect all existing files before changing anything.3. If a repository already exists, preserve useful work.4. If no repository exists, initialize a clean project and prepare it for a PUBLIC GitHub repository.5. Do not create unnecessary frameworks or microservices.PRODUCT SCOPE:GovAsset 360 should provide a unified lifecycle view of government assets such as roads, bridges, buildings, vehicles, medical equipment and other public assets. The architecture must be asset-type agnostic, but the demo should use a small realistic dataset, primarily infrastructure/road assets.CORE STORY:Government needs to know:- what assets exist,- where they are,- who owns/manages them,- what project created/acquired them,- current status/condition,- inspections,- maintenance,- discrepancies/issues,- documents/evidence,- upcoming actions,- and overall operational risk.MVP VERTICAL SLICE:Asset registration → project/lifecycle tracking → inspection → issue/discrepancy → resolution → dashboard → AI assistant.TECHNOLOGY DIRECTION:- Frontend: React + TypeScript + Vite.- UI: Tailwind CSS or the fastest stable styling approach already present.- Backend/data: Firebase.- Database: Cloud Firestore.- Authentication: Firebase Authentication.- Hosting: Firebase Hosting if available.- AI: Prefer Firebase AI Logic with the Gemini Developer API rather than putting a raw Gemini API key in client code. Use a currently available free-tier Gemini model selected from the current Firebase/Google configuration.- If Firebase AI Logic cannot be configured quickly in this environment, implement the AI behind a server-side/serverless boundary and read GEMINI_API_KEY from environment variables; never hardcode or commit the key.- GitHub: public repository, clean README, .gitignore, no secrets.ARCHITECTURE PRINCIPLES:1. Prefer a modular monolith for the hackathon.2. Separate logical modules even if they live in one frontend/backend codebase.3. Do not create microservices unless there is a compelling requirement.4. Use RBAC concepts even if the demo uses a small set of roles.5. Use audit-friendly data structures.6. Make AI read-only for the MVP. It must not autonomously approve tenders, modify assets, close issues, or perform privileged actions.INITIAL ROLES:- Administrator- Department Officer- Field Engineer- Contractor- Viewer/Citizen (read-only where appropriate)CORE ENTITIES:User, Department, Asset, Project, Tender/Procurement placeholder, Contractor, Milestone, Inspection, Issue/Discrepancy, MaintenanceRecord, Document/Evidence, Notification, AuditLog.DELIVERABLE FROM THIS PROMPT:Before coding heavily, create:1. /docs/PRAVI-HACKATHON.md2. /docs/architecture.md3. /docs/requirements.md4. /docs/data-model.md5. /docs/decisions.mdInclude:- problem framing,- assumptions,- stakeholders,- MVP scope,- functional requirements,- non-functional requirements,- logical architecture,- data model,- security model,- deployment plan,- scalability roadmap,- explicit out-of-scope items.Then scaffold the project enough that Prompt 2 can continue immediately.DO NOT:- wait for clarification unless absolutely blocked,- build every possible feature,- add fake claims about government integrations,- expose secrets,- use placeholder architecture diagrams that contradict the actual implementation.At the end, report exactly:A. What existsB. Files createdC. Commands to runD. Any credentials/setup needed from meE. What Prompt 2 should continue with

## PROMPT 2 — Foundation, Firebase, Auth & Dashboard

Purpose: Create the working application shell, Firebase data layer, roles and dashboard quickly.

Suggested timebox: 15–40 minutes

PASTE THIS ENTIRE PROMPT INTO ANTIGRAVITY:

Continue working on the existing GovAsset 360 project from the current workspace. Do not restart or rewrite working code.TIME CONSTRAINT:The entire hackathon is 3 hours. Build only what is necessary for a convincing working MVP.GOAL:Implement the application foundation and the first usable product shell.REQUIRED:1. React + TypeScript + Vite application.2. Clean responsive government-admin dashboard UI.3. Firebase initialization.4. Firebase Authentication.5. Firestore integration.6. Environment/configuration structure.7. Protected application routes.8. Role-aware navigation.9. Seed/demo-data mechanism that can populate realistic assets and related records.10. Error/loading/empty states.PAGES / ROUTES:- /login- /dashboard- /assets- /assets/:id- /projects- /issues- /inspections- /maintenance- /reports- /assistant- /settings or /admin only if time permitsDASHBOARD:Show:- total assets- active projects- overdue inspections- open issues- maintenance due- high-risk assets- project progress- recent activity- attention-required listDESIGN:Use a professional government/enterprise visual language:- clear typography- blue/neutral palette- accessible contrast- compact cards- data tables- status badges- charts only where useful- responsive layout- sidebar navigation- no excessive gradients or decorative UIFIRESTORE MODEL:Implement practical collections/documents. Suggested collections:usersdepartmentsassetsprojectsinspectionsissuesmaintenanceRecordsauditLogsnotificationsEach important record should contain timestamps. Use createdAt/updatedAt consistently.ASSET FIELDS:assetIdnametypedepartmentIdlocationlatitudelongitudestatusconditionriskLevelprojectIdowneracquisitionDateestimatedValuelastInspectionDatenextInspectionDatelastMaintenanceDatenextMaintenanceDatedescriptioncreatedAtupdatedAtPROJECT FIELDS:projectIdnameassetId(s)departmentIdlocationstatusprogressPercentplannedStartDateplannedEndDateactualStartDateexpectedCompletionDatebudgetspentcontractordescriptioncreatedAtupdatedAtISSUE FIELDS:issueIdassetIdprojectIdtitledescriptionseveritystatusreportedByassignedToevidencereportedAtdueDateresolvedAtINSPECTION FIELDS:inspectionIdassetIdinspectordateconditionfindingsphotos/evidencerecommendationstatusRBAC:Implement the role model cleanly. Firestore Security Rules should be restrictive enough to demonstrate security. Do not leave everything publicly writable.DEMO MODE:If real Firebase Auth setup is unavailable during development, create a development-only demo authentication path clearly marked as DEMO ONLY. Do not weaken production rules to make the demo work.DOCUMENTATION:Update /docs/architecture.md and /docs/data-model.md to match the actual implementation.IMPORTANT:Do not spend time building complex tender bidding workflows yet. Create a credible procurement/tender placeholder in the project lifecycle so the architecture can demonstrate:planning → tender/procurement → award → construction/implementation → inspection → issue → maintenance.At the end:- run the app,- fix build/type errors,- verify main routes,- verify Firestore reads/writes,- report what works,- list any Firebase console actions I must perform manually.

## PROMPT 3 — Complete Asset Lifecycle & Working MVP

Purpose: Turn the shell into a coherent end-to-end government asset lifecycle system that can actually be demonstrated.

Suggested timebox: 40–95 minutes

PASTE THIS ENTIRE PROMPT INTO ANTIGRAVITY:

Continue from the existing GovAsset 360 implementation. Do not restart the project.PRIORITY:Build the complete demonstrable government asset lifecycle. We need a working vertical slice, not dozens of disconnected screens.IMPLEMENT THESE CORE FLOWS:FLOW A — ASSET LIFECYCLECreate/view asset→ link asset to project→ show lifecycle/status→ inspection→ maintenance→ issue/discrepancy→ resolution→ audit history.FLOW B — PROJECT LIFECYCLEPlanning→ Procurement/Tender→ Awarded→ Implementation/Construction→ Inspection→ Completed→ Operational→ MaintenanceRepresent procurement/tender as a useful but lightweight module:- tender reference- project- publication date- deadline- status- contractor- award valueDo not build a full e-procurement engine.FLOW C — INSPECTIONField Engineer:- select asset- record condition- findings- date- optional evidence/photo- recommendation- statusAfter inspection:- update asset condition/last inspection- calculate/display next inspection- create an issue when a serious discrepancy is detectedFLOW D — ISSUE / DISCREPANCYCreate issue:- title- asset/project- severity- description- evidence- assigned person- due dateStatuses:Open → Assigned → In Progress → Resolved → Verified/ClosedShow:- aging- overdue issues- severity- responsible person- timestampsFLOW E — MAINTENANCECreate maintenance record:- asset- type- planned date- actual date- cost- vendor/contractor- notes- statusDashboard should identify maintenance due/overdue.ASSET DETAIL PAGE:Make this the strongest page in the product.Tabs/sections:1. Overview2. Lifecycle3. Project4. Inspections5. Issues6. Maintenance7. Documents/Evidence8. Audit HistoryShow a visual lifecycle timeline:Planning → Procurement → Implementation → Commissioning → Operational → Maintenance → Retirement.REPORTS:Build a simple reports page with:- asset counts by type- asset status- condition distribution- open issues by severity- overdue inspections- maintenance due- project progress- estimated vs spent where data existsUse simple charts if they can be implemented quickly and reliably.DEMO DATA:Create at least:- 10–15 assets- 4–6 projects- 5+ inspections- 5+ issues- 4+ maintenance records- several different asset types- at least 2 high-risk/overdue examplesUse realistic but clearly synthetic/demo data. Do not imply the data is real government data.AUDIT LOG:For important mutations, create audit events:- created asset- updated asset- inspection submitted- issue created- issue status changed- maintenance created- project status changedUI:Make all flows demonstrable in under 5 minutes:Dashboard → asset → lifecycle → inspection → issue → resolve → report.VALIDATION:- Add basic form validation.- Prevent impossible dates/empty required fields.- Handle Firestore failures gracefully.- Avoid data duplication where practical.DO NOT:- add social features,- add unnecessary AI features yet,- build a complex map if it risks the timeline,- create microservices,- rewrite the architecture.At the end:1. Run build/typecheck.2. Fix all blocking errors.3. Verify the main demo flow end-to-end.4. Update documentation with the implemented flow.5. Report exactly what remains before final deployment.

## PROMPT 4 — AI Asset Intelligence Assistant

Purpose: Add a genuinely useful Gemini-powered assistant grounded in the platform's data while keeping credentials and permissions safe.

Suggested timebox: 95–120 minutes

PASTE THIS ENTIRE PROMPT INTO ANTIGRAVITY:

Continue from the current GovAsset 360 project.GOAL:Add the AI Assistant as an intelligence layer over the existing application, not as a generic chatbot.AI NAME:Asset Intelligence AssistantPRIMARY USER:Department Officer / Administrator.CORE AI USE CASES:1. Natural-language questions about current system data.2. Summarization of asset/project/issue status.3. Identification of attention-required items.4. Explainable operational insights based on retrieved application data.EXAMPLE QUESTIONS THE DEMO MUST HANDLE:- "Which assets require attention this week?"- "Show projects delayed by more than 30 days."- "Which inspections are overdue?"- "Which high-risk assets have unresolved issues?"- "Summarize the current status of road projects."- "What are the most urgent maintenance items?"- "Why is Project PRJ-001 delayed?" when the relevant structured data exists.- "Summarize the open issues for Asset AST-001."IMPORTANT AI ARCHITECTURE:Do NOT simply send the entire Firestore database to Gemini.Implement a controlled flow:User question→ intent/context handling→ retrieve only relevant structured data→ construct a bounded prompt→ Gemini→ response→ UIThe AI must not have arbitrary database-write authority.AI MUST BE READ-ONLY for this hackathon.SECURITY:Preferred implementation:- Use Firebase AI Logic with the Gemini Developer API if the Firebase project supports it.- Use a currently available free-tier model.- Use Firebase App Check/authentication according to the current Firebase setup.- Do not put a standalone Gemini Developer API key in public source code.- If a server-side Gemini API path is used instead, read GEMINI_API_KEY from environment variables and never commit it.- Do not store sensitive government/personal data in prompts for the demo.- Clearly label the assistant as an AI-generated decision-support tool and not an autonomous authority.FALLBACK:If AI setup cannot be completed in time, implement a graceful "AI demo mode" using deterministic responses generated from the real Firestore/demo data, while leaving the Gemini integration interface ready. Do not fake that Gemini was used if it wasn't.AI UI:Create a polished assistant page/panel:- chat messages- suggested questions- loading state- error state- source/context indicator such as "Based on 6 current asset records"- clear disclaimer that AI responses are advisory- preserve conversation for the current session onlyDO NOT:- allow AI to approve/reject tenders,- change asset records,- close issues,- modify permissions,- execute arbitrary database queries,- expose credentials.Also add at least one non-chat AI feature if time permits:"Executive Summary" button that generates a concise summary of dashboard conditions from a bounded dataset.TEST:- Ask at least 5 representative questions.- Verify answers are grounded in actual seeded records.- Ensure the assistant does not invent asset IDs or project facts when data is unavailable.- If data is unavailable, it should say so.Update:- /docs/architecture.md with AI architecture- /docs/security.md- /docs/ai-assistant.mdAt the end, report:- which Gemini/Firebase AI method was used,- which model was selected,- whether any credential is needed,- what manual Firebase setup remains,- which AI demo questions were verified.

## PROMPT 5 — Testing, Security, Public GitHub & Deployment

Purpose: Make the prototype reliable, safe to publish, and actually accessible through a deployment.

Suggested timebox: 120–150 minutes

PASTE THIS ENTIRE PROMPT INTO ANTIGRAVITY:

Continue from the current GovAsset 360 implementation.GOAL:Harden the MVP, test it, configure deployment, and make the public GitHub repository presentable.PUBLIC REPOSITORY:Repository should be public and named something like:govasset-360orpravi-govasset-360Before committing:- inspect git status,- ensure .env files are ignored,- ensure no API keys are present,- ensure no Firebase service account JSON is present,- ensure no passwords/tokens/secrets are present,- search the repository for likely secrets.GITHUB:Create/use the public repository if the environment has GitHub authentication.If GitHub authentication is unavailable, prepare the repository locally and clearly tell me the exact manual push steps.Do not fabricate a GitHub URL.TESTING:Run:- npm install if needed- npm run build- npm run lint if configured- type checking if configured- relevant unit/component tests if presentFix all blocking errors.MANUAL SMOKE TEST:Verify:1. Login/demo access2. Dashboard loads3. Assets list loads4. Asset detail opens5. Project/lifecycle data appears6. Inspection can be created7. Issue can be created8. Issue status can change9. Maintenance record works10. Reports render11. AI assistant opens12. At least 3 AI questions work13. Logout/access control behaves correctlyFIREBASE SECURITY:Review Firestore Security Rules.Do not use allow read, write: if true in the final implementation.Use authenticated/role-aware rules appropriate to the MVP.If role claims are too time-consuming, implement a safe Firestore user-profile-based approach and document the limitation.DEPLOYMENT:Preferred:Firebase Hosting for the frontend.If Firebase Hosting is configured:- build the production frontend,- configure firebase.json,- configure SPA rewrites if required,- deploy using Firebase CLI,- verify the public URL.If Firebase Hosting cannot be completed in time:- create a deployment-ready configuration and use another available static hosting provider only if already authenticated,- otherwise provide exact final deployment commands.GITHUB CI/CD:If time permits, add a GitHub Actions workflow that:- installs dependencies,- builds the project,- optionally runs tests,- deploys to Firebase Hosting only if secrets/configuration are available.Do not spend more than 10 minutes fighting CI/CD. A working manual deployment is more valuable than a broken automation pipeline.README:Create a strong README with:- project name- one-line problem- solution- key features- architecture diagram (Mermaid is fine)- tech stack- Firebase setup- AI setup- local run commands- deployment- demo credentials/process if applicable- screenshots placeholders/section- security notes- limitations- future roadmapCreate:docs/deployment.mddocs/testing.mddocs/security.mdIMPORTANT:Do not introduce new major features in this prompt.At the end, provide:A. Build statusB. Deployment URL if successfully deployedC. GitHub URL if successfully createdD. Remaining manual setupE. Known limitationsF. Exact demo path for the final presentation

## PROMPT 6 — Final Polish, Demo Story & Interview Readiness

Purpose: Freeze the product, make the demo coherent, and make the documentation support the final Pravi interview.

Suggested timebox: 150–180 minutes

PASTE THIS ENTIRE PROMPT INTO ANTIGRAVITY:

This is the final 30-minute stage of the GovAsset 360 Pravi Research Tech Track hackathon.DO NOT REARCHITECT.DO NOT ADD MAJOR FEATURES.DO NOT START A NEW FRAMEWORK.Your job is to make the project presentation-ready and interview-defensible.1. FINAL DEMO DATAEnsure the database contains a coherent story:- at least one road/infrastructure asset with a linked project,- project has a progress value and contractor,- at least one inspection,- at least one discrepancy,- issue has a status progression,- maintenance record exists,- dashboard reflects the same data,- AI assistant can answer questions about those records.2. DEMO SCENARIOCreate/verify this exact 4–5 minute flow:Dashboard→ identify high-risk/overdue item→ open asset→ inspect lifecycle→ show project/progress→ show inspection→ show discrepancy→ update/resolve issue→ show dashboard/report change→ ask AI:   "Which assets require attention and why?"→ ask:   "Which projects are delayed?"→ show architecture and explain how data flows through the system.3. DOCUMENTATIONMake sure these documents exist and match the implementation:- README.md- docs/PRAVI-HACKATHON.md- docs/requirements.md- docs/architecture.md- docs/data-model.md- docs/security.md- docs/ai-assistant.md- docs/deployment.md- docs/testing.md- docs/decisions.mdPRAVI DECISION LOG:In docs/decisions.md include:- why this problem,- why Firebase,- why Firestore,- why modular monolith for MVP,- why the selected AI integration,- why the chosen authentication model,- why the MVP excludes full procurement,- how the architecture scales later.4. FINAL ARCHITECTUREEnsure the README/docs contain a clean architecture diagram showing:Users→ Web App→ Auth→ Application modules→ Firestore→ AI Assistant→ Reporting→ HostingAnd show logical modules:AssetProjectProcurementInspectionIssueMaintenanceReportingAIAudit5. FINAL QUALITYCheck:- no broken routes,- no console-breaking errors,- no fake links,- no secrets,- no placeholder "TODO" visible in the product,- no irrelevant sample text,- consistent naming,- mobile/responsive layout is acceptable,- loading/error states exist.6. FINAL GITCreate clean commits if GitHub access is available.Use a meaningful final commit message such as:"feat: complete GovAsset 360 hackathon MVP"Push only non-secret source.7. FINAL REPORTAt the end, output a concise final status:- Live URL- GitHub URL- Stack- Firebase services- AI method/model- Main workflows- Known limitations- 60-second explanation of the project- 5-minute demo sequence- 10 likely interviewer questions and the correct technical answer based ONLY on what was actually implemented.CRITICAL:Never claim a feature is implemented unless it is actually implemented and tested.

If Antigravity gets stuck: recovery prompts

Recovery A — Fix instead of redesign

Stop adding features. Inspect the current error/output, identify the smallest root cause, fix it, run the relevant build/test command again, and continue from the current state. Do not rewrite working modules or change the architecture unless the current architecture makes the MVP impossible.

Recovery B — Time is running out

We have less than 30 minutes remaining. Freeze the feature set. Prioritize: working dashboard, asset detail, one complete lifecycle flow, issue/inspection workflow, AI assistant if already configured, production build, deployment, README. Remove or disable unfinished features rather than leaving broken UI. Do not add new frameworks.

Recovery C — Firebase setup is blocked

Firebase configuration is blocking progress. Preserve the Firebase-compatible architecture, but switch to demo/local data for the presentation if necessary. Keep the data-access layer abstracted so Firestore can be connected later. Do not hardcode secrets. Make the app fully demonstrable with seeded local demo data.

Recovery D — Gemini setup is blocked

Gemini integration is blocked. Do not spend more than 10 minutes troubleshooting. Preserve the AI service interface and implement a clearly labeled demo-mode assistant that generates deterministic answers from the actual seeded application data. Do not claim that Gemini is being used if it is not. Document exactly what remains for Gemini activation.

Recovery E — Deployment is blocked

Deployment is blocked. Stop changing application features. Run a production build, verify it locally, prepare firebase.json/hosting configuration, ensure README has exact deployment commands, and if an authenticated hosting target is available deploy it. Otherwise leave a deployment-ready repository and report the precise blocker.

Firebase + Gemini implementation note (current)

Recommended path for this hackathon: Firebase AI Logic with the Gemini Developer API. Current Firebase documentation says the web SDK can access Gemini through Firebase AI Logic; current guidance also emphasizes App Check and authenticated-user controls. Firebase's current security guidance says not to put a standalone Gemini Developer API key into a public web app. For the hackathon, use the current Firebase AI Logic setup if available; otherwise use a server-side secret boundary.

Deployment note: Firebase Hosting supports deployment from the CLI and can be integrated with GitHub Actions. A public GitHub repository is compatible with that workflow.

## Important implementation rules

Never commit .env, service-account JSON, Gemini Developer API keys, access tokens, passwords, or private credentials.

Do not put a standalone Gemini Developer API key in React/Vite client code.

Do not let the AI directly execute arbitrary database queries or mutate privileged records.

Do not claim real government integration unless an actual API/data source is connected.

Use synthetic demo data and label it as demo/synthetic.

Prefer one complete vertical slice over many incomplete features.

If a feature cannot be completed reliably, remove it from the UI and document it as future work.

Do not use microservices simply for appearance. Explain architecture decisions from requirements.

Every major technical decision should have a reason that can be defended in the interview.

Suggested final one-minute explanation

GovAsset 360 is a government asset lifecycle and intelligence platform.The problem we target is fragmented visibility across asset creation,projects, inspections, discrepancies, maintenance and reporting.We model the lifecycle from planning/procurement through operation andmaintenance, with role-based workflows and an audit trail.The MVP uses React, Firebase Authentication and Firestore, with amodular architecture that can scale to larger government deployments.The AI assistant is an intelligence layer over application data: officerscan ask natural-language questions about delayed projects, overdueinspections, high-risk assets and unresolved issues.We deliberately keep the AI read-only and grounded in retrieved systemdata rather than allowing autonomous government decisions.

Suggested final interview defense topics

Why did you choose this problem?

What is the root cause rather than the symptom?

Who are your primary users and stakeholders?

Why did you choose Firebase/Firestore?

Why did you use a modular monolith rather than microservices?

How does RBAC work?

How do you protect government/PII data?

How is the AI assistant grounded in system data?

How do you prevent the AI from making unauthorized changes?

How would you scale from a district pilot to state/national scale?

What happens when connectivity is poor?

How would you integrate existing government systems?

How would you measure impact?

What would you build next if given another month?

Source basis used for this prompt pack

Pravi source documents supplied for the hackathon preparation: About Pravi; Pravi Associate JD (Tech Track). The Tech Track describes understanding governance problems through user/process/data lenses, designing secure scalable systems, rapidly building proofs-of-concept, and developing/deploying production-grade governance platforms.

Current external technical verification: Firebase documentation reviewed for Firebase AI Logic, security/App Check, and Firebase Hosting/GitHub deployment. These details can change; Antigravity should verify the currently available Firebase console flow at the time of setup.
