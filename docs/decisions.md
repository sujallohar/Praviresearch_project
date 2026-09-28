# Architectural Decisions Record

## 1. Modular Monolith vs Microservices
**Decision:** We built GovAsset 360 as a modular monolith (React SPA + Firebase).
**Reasoning:** Given the 3-hour hackathon constraint and the need to prove a complete end-to-end lifecycle, microservices would have added unnecessary DevOps overhead. A monolith allowed us to move fast and maintain a shared state.

## 2. Firebase as Backend-as-a-Service (BaaS)
**Decision:** Selected Firebase (Firestore, Auth, Hosting).
**Reasoning:** Instant real-time document syncing, out-of-the-box authentication, and zero-config deployment. The NoSQL nature of Firestore allowed us to iterate on the asset data model rapidly without running schema migrations.

## 3. Tailwind CSS (v4)
**Decision:** Used Tailwind CSS directly integrated with Vite.
**Reasoning:** Guaranteed a professional, government-grade aesthetic without spending time writing custom CSS classes. It ensured the UI is fully responsive out of the box.

## 4. AI Assistant Integration Strategy
**Decision:** Utilized `@google/generative-ai` (Gemini 1.5 Flash) on the client side, initialized via `VITE_GEMINI_API_KEY`.
**Reasoning:** While server-side execution is preferred for API key security, this approach enabled us to deliver a working, context-aware AI prototype instantly. We also implemented a deterministic fallback if the key is missing to ensure the demo never breaks.

## 5. Role-Based Access Simulation
**Decision:** Built a Role Switcher into the UI header instead of complex backend custom claims for the MVP.
**Reasoning:** Allowed judges and stakeholders to easily test the application from the perspective of an Admin, Officer, or Field Engineer without having to create multiple accounts. We also wrote the corresponding `firestore.rules` template to show how this would be locked down in production.
