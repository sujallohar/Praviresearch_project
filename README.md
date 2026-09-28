# GovAsset 360

*Intelligent lifecycle management for government infrastructure.*

🌐 **Live Production Deployment:** [https://govasset-360.web.app](https://govasset-360.web.app)  
*(Alternative Mirror: [https://govasset-360.firebaseapp.com](https://govasset-360.firebaseapp.com))*

## 🚀 The Problem
Government assets (roads, buildings, vehicles, and equipment) are currently managed in highly fragmented, disconnected systems. There is no unified view tracking an asset from its initial procurement through to its inspections, maintenance, and ultimate retirement. This leads to severe inefficiencies, delayed maintenance, budget overruns, and a lack of public transparency.

## 💡 The Solution: GovAsset 360
GovAsset 360 is a unified, intelligent platform designed to track the complete lifecycle of government assets. It provides a single pane of glass for Administrators, Department Officers, and Field Engineers to log issues, track projects, and schedule maintenance. 

**Key Features:**
- **Unified Asset Registry & GIS Map:** Comprehensive view of government assets with interactive OpenStreetMap/Leaflet visualization, dynamic clustering, and auto-zoom to asset locations.
- **End-to-End Lifecycle Tracking:** Visual timelines connecting physical assets to active construction projects, inspections, and maintenance records.
- **Role-Based Access Control (RBAC):** UI role switcher (Admin, Government Officer, Field Engineer, Contractor, Viewer) with permission gates across operations.
- **Dynamic Action Modals:** Full multi-field creation and editing modals for Assets, Maintenance Logs, Field Inspections, Projects, and Issues.
- **AI Intelligence Assistant (Gemini 2.5 Flash):** Generative AI assistant grounded in live Firestore collections that respects user access control and answers queries on asset health, budgets, and pending risks.
- **One-Click CSV Export:** Export filtered asset registers, maintenance logs, inspection logs, and issues for external auditing.
- **Real-time Discrepancy & Issue Tracking:** Instant issue reporting and resolution workflows.

## 🏗 Architecture
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS (v4) + Lucide Icons
- **Backend & Database:** Firebase Auth & Cloud Firestore (NoSQL)
- **AI Integration:** Google Gemini 1.5 Flash (Client-side grounded with Firestore context)
- **Deployment:** Firebase Hosting

## 💻 Local Setup Instructions

1. **Clone & Install**
   ```bash
   git clone <repo-url>
   cd govasset-360
   npm install
   ```

2. **Environment Variables**
   Create a `.env.local` file in the root directory and add your Firebase and Gemini credentials:
   ```env
   VITE_FIREBASE_API_KEY="your_api_key"
   VITE_FIREBASE_AUTH_DOMAIN="your_domain"
   VITE_FIREBASE_PROJECT_ID="your_project_id"
   VITE_FIREBASE_STORAGE_BUCKET="your_bucket"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
   VITE_FIREBASE_APP_ID="your_app_id"
   VITE_GEMINI_API_KEY="your_gemini_key" # Optional (Falls back to Demo Mode if missing)
   ```

3. **Run the Application**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:5173`. Use the **"Sign in (DEMO MODE)"** button to bypass authentication for local testing. Click **"Seed Demo Data"** on the dashboard to populate the database with realistic records.

---
*Built with ❤️ for the Pravi Hackathon.*
