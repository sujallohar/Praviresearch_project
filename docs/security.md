# Security Model

## Frontend
- Uses React Router protected routes to enforce authentication before viewing any dashboard data.
- Uses Firebase Authentication (Email/Password) to verify identities.

## AI & API Keys
- The Gemini API Key (`VITE_GEMINI_API_KEY`) is read from environment variables and is **never** committed to source control.
- In a production environment, AI processing should be moved to a secure serverless environment (Firebase Cloud Functions).

## Database
- Cloud Firestore is currently operating in "Test Mode" for the hackathon MVP.
- **Critical Action Needed**: Before going live, Firestore rules must be updated to restrict writes to Admin/Officer roles and restrict reads to authenticated users.
