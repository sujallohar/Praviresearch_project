import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Asset, Project, Issue, MaintenanceRecord, Inspection } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
if (API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
  } catch (err) {
    console.warn("Failed to initialize GoogleGenerativeAI:", err);
  }
}

export interface UserContext {
  name?: string;
  role?: string;
  email?: string;
  department?: string;
}

interface GroundedDataset {
  assets: Asset[];
  projects: Project[];
  issues: Issue[];
  maintenance: MaintenanceRecord[];
  inspections: Inspection[];
}

// Fetch all live Firestore collections for comprehensive AI grounding
const fetchLiveDataset = async (): Promise<GroundedDataset> => {
  try {
    const [assetsSnap, projectsSnap, issuesSnap, maintSnap, inspSnap] = await Promise.all([
      getDocs(collection(db, 'assets')),
      getDocs(collection(db, 'projects')),
      getDocs(collection(db, 'issues')),
      getDocs(collection(db, 'maintenanceRecords')),
      getDocs(collection(db, 'inspections'))
    ]);

    return {
      assets: assetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)),
      projects: projectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)),
      issues: issuesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Issue)),
      maintenance: maintSnap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRecord)),
      inspections: inspSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inspection))
    };
  } catch (error) {
    console.error('Failed to load Firestore data for AI grounding:', error);
    return { assets: [], projects: [], issues: [], maintenance: [], inspections: [] };
  }
};

// Build comprehensive prompt context with RBAC and user filtering
const buildSystemContext = (data: GroundedDataset, user?: UserContext): string => {
  const userName = user?.name || 'Authorized User';
  const userRole = user?.role || 'Government Officer';
  const userDept = user?.department || 'Public Works';

  // 1. Role & Access control description
  let rbacDetails = '';
  const isAdminOrOfficer = userRole === 'Government Officer' || userRole === 'Admin' || userRole === 'Official';
  if (isAdminOrOfficer) {
    rbacDetails = 'Full Administrative Authority. Authorized to review city-wide infrastructure, approve capital projects, allocate budget disbursements, register/modify assets, and audit cross-departmental operations.';
  } else if (userRole === 'Field Engineer') {
    rbacDetails = 'Field Operations & Inspection Access. Authorized to log on-site structural inspections, report physical discrepancies/hazards, and verify engineering compliance. Restricted from modifying core budget authorizations.';
  } else if (userRole === 'Contractor') {
    rbacDetails = 'Contractor Work Order Access. Authorized to review assigned preventative maintenance tasks, report milestone completion, and update work order logs. Filtered to contracted deliverables.';
  } else {
    rbacDetails = 'Viewer / Public Transparency Access. Read-only view of city infrastructure condition, capital improvement project status, and public safety advisories.';
  }

  // 2. Identify records associated specifically with this user
  const userAssets = data.assets.filter(a => {
    const ownerMatch = (a.owner || '').toLowerCase().includes(userName.toLowerCase()) || (a.owner || '').toLowerCase().includes(userRole.toLowerCase());
    const deptMatch = userDept && (
      (a.departmentId || '').toLowerCase().includes(userDept.toLowerCase()) ||
      userDept.toLowerCase().includes((a.departmentId || '').toLowerCase())
    );
    return ownerMatch || deptMatch || isAdminOrOfficer;
  });

  const userIssuesReported = data.issues.filter(i => (i.reportedBy || '').toLowerCase().includes(userName.toLowerCase()));
  const userIssuesAssigned = data.issues.filter(i => 
    (i.assignedTo || '').toLowerCase().includes(userName.toLowerCase()) || 
    (i.assignedTo || '').toLowerCase().includes(userRole.toLowerCase())
  );
  const userInspections = data.inspections.filter(i => (i.inspector || '').toLowerCase().includes(userName.toLowerCase()));
  const userMaintenance = data.maintenance.filter(m => 
    (m.contractor || '').toLowerCase().includes(userName.toLowerCase()) || 
    (userRole === 'Contractor' && m.status !== 'Completed')
  );

  // 3. High risk & alert summaries
  const criticalAssets = data.assets.filter(a => a.riskLevel === 'High' || a.condition === 'Critical');
  const openIssues = data.issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed');
  const scheduledTasks = data.maintenance.filter(m => m.status === 'Scheduled' || m.status === 'In Progress');

  let context = `GOVASSET 360 SYSTEM INTELLIGENCE CONTEXT\n`;
  context += `----------------------------------------\n`;
  context += `CURRENT OPERATOR: ${userName} (${user?.email || 'N/A'})\n`;
  context += `DESIGNATED ROLE: ${userRole}\n`;
  context += `DEPARTMENT: ${userDept}\n`;
  context += `SECURITY PRIVILEGES: ${rbacDetails}\n\n`;

  context += `USER-SPECIFIC RECORDS & ASSIGNMENTS:\n`;
  context += `- Assets in Department/Managed: ${userAssets.length} assets\n`;
  context += `- Issues Reported by You: ${userIssuesReported.length} (${userIssuesReported.map(i => i.title).slice(0, 3).join(', ') || 'None'})\n`;
  context += `- Issues Assigned to You/Role: ${userIssuesAssigned.length} (${userIssuesAssigned.map(i => i.title).slice(0, 3).join(', ') || 'None'})\n`;
  context += `- Inspections Conducted by You: ${userInspections.length}\n`;
  context += `- Maintenance Tasks Assigned: ${userMaintenance.length}\n\n`;

  context += `INSTITUTIONAL METRICS SUMMARY:\n`;
  context += `- Total Public Assets: ${data.assets.length}\n`;
  context += `- Critical/High Risk Assets (${criticalAssets.length}): ${criticalAssets.map(a => `${a.name} [${a.condition}, ${a.location}]`).slice(0, 5).join('; ')}\n`;
  context += `- Active Capital Projects: ${data.projects.length} (Avg Progress: ${Math.round(data.projects.reduce((s, p) => s + (p.progressPercent || 0), 0) / (data.projects.length || 1))}%\n`;
  context += `- Open Hazards/Issues: ${openIssues.length} (Critical: ${openIssues.filter(i => i.severity === 'Critical').length})\n`;
  context += `- Scheduled Maintenance: ${scheduledTasks.length} tasks\n\n`;

  return context;
};

// Smart reasoning engine: generates role-aware, data-grounded responses
const generateSmartLocalResponse = (prompt: string, data: GroundedDataset, user?: UserContext): string => {
  const query = prompt.toLowerCase().trim();
  const userName = user?.name || 'Officer';
  const userRole = user?.role || 'Government Officer';

  // 1. Greetings & Conversational check (English & Hindi / Hinglish)
  if (
    query === 'hi' || query === 'hello' || query === 'hey' || query === 'namaste' ||
    query.startsWith('hi ') || query.startsWith('hello ') || query.startsWith('hey ') ||
    query.includes('kaise ho') || query.includes('kya hal') || query.includes('kya haal') ||
    query.includes('good morning') || query.includes('good afternoon') || query.includes('good evening')
  ) {
    let greeting = `👋 **Hello ${userName}!** Welcome to the **GovAsset 360 Institutional Intelligence Engine**.\n\n`;
    greeting += `I am synchronized with your credentials as **${userRole}** (${user?.department || 'Public Works'}). Here is how I can assist you right now:\n\n`;

    if (userRole === 'Admin' || userRole === 'Government Officer') {
      greeting += `• 📊 **System Audit:** Ask *"Full system audit"* or *"Show budget utilization"*\n`;
      greeting += `• 🚨 **Risk Priorities:** Ask *"Which assets require attention?"* or *"Critical hazards"*\n`;
      greeting += `• 📁 **My Records:** Ask *"What are my assigned tasks?"* to see your supervised assets\n`;
    } else if (userRole === 'Field Engineer') {
      greeting += `• 🔍 **Safety Inspections:** Ask *"Which assets require urgent inspection?"*\n`;
      greeting += `• ⚠️ **Reported Discrepancies:** Ask *"Show critical issues in my zone"*\n`;
      greeting += `• 📋 **My Logs:** Ask *"What are my logged inspections?"*\n`;
    } else if (userRole === 'Contractor') {
      greeting += `• 🛠️ **Work Orders:** Ask *"What are my scheduled maintenance tasks?"*\n`;
      greeting += `• 💰 **Project Milestones:** Ask *"Show repair costs and deadlines"*\n`;
    } else {
      greeting += `• 🏙️ **Public Infrastructure:** Ask *"Overview of city infrastructure"* or *"Show road projects"*\n`;
      greeting += `• 📢 **Report Civic Hazard:** Ask *"How do I report a pothole or issue?"*\n`;
      greeting += `• ⭐ **Citizen Ratings:** Ask *"How can I rate a municipal project?"*\n`;
    }
    return greeting;
  }

  // 2. Questions about Developer, Architect, or Super Admin (Sujal Lohar)
  if (
    query.includes('sujal') || 
    query.includes('who created') || 
    query.includes('who made') || 
    query.includes('developer') || 
    query.includes('architect') || 
    query.includes('super admin') ||
    query.includes('creator')
  ) {
    return `### 👨‍💻 System Architect & Super Admin Information

**GovAsset 360** was architected and developed by **Sujal Lohar** (Full-Stack Engineer & AI Infrastructure Architect).

- 🛡️ **Super Admin Authority:** \`emailsujallohar17@gmail.com\`
- 🌐 **LinkedIn Profile:** [linkedin.com/in/sujallohar](https://www.linkedin.com/in/sujallohar)
- 💻 **GitHub Profile:** [github.com/sujallohar](https://github.com/sujallohar)
- 🏛️ **Role-Based Approvals:** Only Sujal holds master administrative privileges to grant elevated staff and departmental roles.

You can learn more about the technical stack and system vision on the **About Architect** page from the navigation bar.`;
  }

  // 3. How-to & Guidance inquiries (How to report, how to rate, how to scan QR, etc.)
  if (
    query.includes('how to report') || 
    query.includes('report issue') || 
    query.includes('issue kaise') || 
    query.includes('complaint') ||
    query.includes('how to rate') ||
    query.includes('how to review') ||
    query.includes('feedback kaise') ||
    query.includes('how to scan') ||
    query.includes('qr scan') ||
    query.includes('how to use') ||
    query.includes('kya kar sakte') ||
    query.includes('help') ||
    query.includes('madad')
  ) {
    let guide = `### 💡 Quick Guide & Operations Manual for ${userRole}\n\n`;
    guide += `Here are the step-by-step instructions for key actions:\n\n`;

    guide += `1. **Reporting Civic Hazards / Defects:**\n`;
    guide += `   - Go to the **Issues** tab or **Public Updates** page.\n`;
    guide += `   - Click **"Report a Civic Issue"** or tap **"AI Camera Defect Triage"** to upload/take a photo of a pothole, crack, or leak for automatic AI severity classification.\n\n`;

    guide += `2. **Submitting Citizen Ratings & Reviews:**\n`;
    guide += `   - Go to **Public Updates** from the menu.\n`;
    guide += `   - Find any completed or active capital project.\n`;
    guide += `   - Click the 1–5 star icons under *"Citizen Community Rating"*, write your observation, and hit **"Submit Review"**. It is saved permanently to the database under your account!\n\n`;

    guide += `3. **Scanning Physical Asset QR Codes:**\n`;
    guide += `   - Click the **"Scan QR"** button in the top search bar or menu.\n`;
    guide += `   - Point your phone camera at an infrastructure QR tag to instantly pull up live maintenance logs, lifecycle risk, and asset specs.\n\n`;

    guide += `4. **Exporting Institutional Records (CSV / PDF):**\n`;
    guide += `   - Head to the **Reports** tab to download full audit registers in CSV or audit-ready PDF tables for executive review.\n`;

    return guide;
  }

  // 4. Specific physical asset or keyword search (e.g. "road", "pothole", "bridge", "park", "water", "pipe", "light")
  const assetKeywords = ['road', 'bridge', 'pothole', 'park', 'water', 'pipe', 'pipeline', 'drain', 'drainage', 'light', 'street', 'hospital', 'school', 'metro', 'tunnel', 'building', 'vehicle', 'pump'];
  const matchedKeyword = assetKeywords.find(k => query.includes(k));

  if (matchedKeyword) {
    const matchingAssets = data.assets.filter(a => 
      (a.name || '').toLowerCase().includes(matchedKeyword) ||
      (a.type || '').toLowerCase().includes(matchedKeyword) ||
      (a.description || '').toLowerCase().includes(matchedKeyword) ||
      (a.location || '').toLowerCase().includes(matchedKeyword)
    );

    const matchingIssues = data.issues.filter(i => 
      (i.title || '').toLowerCase().includes(matchedKeyword) ||
      (i.description || '').toLowerCase().includes(matchedKeyword)
    );

    const matchingProjects = data.projects.filter(p => 
      (p.name || '').toLowerCase().includes(matchedKeyword) ||
      (p.description || '').toLowerCase().includes(matchedKeyword)
    );

    let res = `### 🔍 Live Database Records for **"${matchedKeyword.toUpperCase()}"**\n\n`;
    
    if (matchingAssets.length === 0 && matchingIssues.length === 0 && matchingProjects.length === 0) {
      res += `*No physical assets or open issues specifically mention "${matchedKeyword}".*\n\n`;
      res += `Total registered assets in database: **${data.assets.length}**. You can add a new asset in the Assets registry.`;
    } else {
      if (matchingAssets.length > 0) {
        res += `#### **Matching Physical Assets (${matchingAssets.length}):**\n`;
        matchingAssets.slice(0, 4).forEach(a => {
          res += `- **${a.name}** [${a.type}]  \n`;
          res += `  Location: \`${a.location}\` | Condition: **${a.condition}** | Risk Level: **${a.riskLevel}** | Status: \`${a.status}\`\n`;
        });
      }

      if (matchingIssues.length > 0) {
        res += `\n#### **Related Civic Issues & Defect Reports (${matchingIssues.length}):**\n`;
        matchingIssues.slice(0, 3).forEach(i => {
          res += `- **[${i.severity}] ${i.title}**  \n`;
          res += `  Status: \`${i.status}\` | Assigned: \`${i.assignedTo || 'Field Team'}\`\n`;
        });
      }

      if (matchingProjects.length > 0) {
        res += `\n#### **Active Capital Projects (${matchingProjects.length}):**\n`;
        matchingProjects.slice(0, 3).forEach(p => {
          res += `- **${p.name}** (Progress: **${p.progressPercent}%**) — Contractor: \`${p.contractor}\`\n`;
        });
      }
    }
    return res;
  }

  // 5. User-specific / "my" data queries
  if (
    query.includes('my') || 
    query.includes('added by me') || 
    query.includes('assigned to me') || 
    query.includes('my tasks') || 
    query.includes('my role') || 
    query.includes('access control') ||
    query.includes('privilege') ||
    query.includes('permission')
  ) {
    const isAdmin = userRole === 'Government Officer' || userRole === 'Admin' || userRole === 'Official';
    const userIssues = data.issues.filter(i => 
      (i.reportedBy || '').toLowerCase().includes(userName.toLowerCase()) || 
      (i.assignedTo || '').toLowerCase().includes(userName.toLowerCase()) || 
      (i.assignedTo || '').toLowerCase().includes(userRole.toLowerCase())
    );
    const userInsp = data.inspections.filter(i => (i.inspector || '').toLowerCase().includes(userName.toLowerCase()));
    const userMaint = data.maintenance.filter(m => (m.contractor || '').toLowerCase().includes(userName.toLowerCase()) || (userRole === 'Contractor' && m.status !== 'Completed'));
    const userAssets = data.assets.filter(a => {
      const ownerMatch = (a.owner || '').toLowerCase().includes(userName.toLowerCase()) || (a.owner || '').toLowerCase().includes(userRole.toLowerCase());
      const dept = user?.department || '';
      const deptMatch = dept && ((a.departmentId || '').toLowerCase().includes(dept.toLowerCase()) || dept.toLowerCase().includes((a.departmentId || '').toLowerCase()));
      return ownerMatch || deptMatch || isAdmin;
    });

    let res = `### 🏛️ Access Control Profile & Institutional Records for **${userName}**\n\n`;
    res += `**Designated Role:** \`${userRole}\`  \n`;
    res += `**Department:** \`${user?.department || 'Public Works'}\`  \n\n`;

    res += `#### **Access Privileges & Security Scope:**\n`;
    if (isAdmin) {
      res += `- 🛡️ **Full Administrative Authority:** You hold comprehensive executive privileges over the municipal infrastructure registry, budget allocations, maintenance approvals, and cross-departmental operations.\n`;
    } else if (userRole === 'Field Engineer') {
      res += `- 🔧 **Field Operations Authority:** You are authorized to conduct on-site engineering assessments, log safety inspections, and flag physical discrepancies/hazards.\n`;
    } else if (userRole === 'Contractor') {
      res += `- 🏗️ **Contractor Work Order Authority:** You can review assigned maintenance tasks, update execution progress, and record repair notes.\n`;
    } else {
      res += `- 👁️ **Transparency / Viewer Mode:** Read-only access to city infrastructure condition and capital projects.\n`;
    }

    res += `\n#### **Records Associated with You / Your Department:**\n`;
    res += `- **Supervised / Departmental Assets:** **${userAssets.length} assets**  \n`;
    if (userAssets.length > 0) {
      userAssets.slice(0, 4).forEach(a => {
        res += `  - **${a.name}** [${a.type} • ${a.condition} condition • ${a.location}]\n`;
      });
    }

    res += `- **Issues Reported / Assigned:** **${userIssues.length} records**  \n`;
    if (userIssues.length > 0) {
      userIssues.slice(0, 3).forEach(i => {
        res += `  - **[${i.severity}]** ${i.title} *(Status: ${i.status})*\n`;
      });
    }

    res += `- **Field Inspections Conducted:** **${userInsp.length} inspections**  \n`;
    res += `- **Active Work Orders / Tasks:** **${userMaint.length} scheduled**  \n`;

    return res;
  }

  // 6. High-risk, attention required, or critical condition queries
  if (query.includes('attention') || query.includes('high risk') || query.includes('critical') || query.includes('danger') || query.includes('condition') || query.includes('hazard')) {
    const critical = data.assets.filter(a => a.riskLevel === 'High' || a.condition === 'Critical' || a.condition === 'Poor');
    const urgentIssues = data.issues.filter(i => (i.severity === 'Critical' || i.severity === 'High') && i.status !== 'Resolved');

    let res = `### 🚨 Infrastructure Attention & Risk Audit\n\n`;
    res += `Currently, **${critical.length} physical assets** and **${urgentIssues.length} high-severity issues** require priority management:\n\n`;

    res += `#### **High-Risk Assets:**\n`;
    if (critical.length === 0) {
      res += `*No assets are currently evaluated as high-risk or critical.*\n`;
    } else {
      critical.slice(0, 6).forEach(a => {
        res += `- **${a.name}**  \n`;
        res += `  Location: \`${a.location}\` | Condition: **${a.condition}** | Risk: **${a.riskLevel}** | Phase: \`${a.status}\`\n`;
      });
    }

    res += `\n#### **Priority Safety & Defect Issues:**\n`;
    if (urgentIssues.length === 0) {
      res += `*No critical hazards are currently active.*\n`;
    } else {
      urgentIssues.slice(0, 4).forEach(i => {
        res += `- **[${i.severity}] ${i.title}**  \n`;
        res += `  Impacted Asset: \`${i.assetId}\` | Assigned To: \`${i.assignedTo || 'Unassigned'}\` | Status: \`${i.status}\`\n`;
      });
    }

    res += `\n> **Recommended Action for ${userRole}:** ${
      userRole === 'Government Officer' || userRole === 'Admin'
        ? 'Dispatch rapid engineering teams and allocate emergency maintenance funds for the flagged assets above.'
        : userRole === 'Field Engineer'
        ? 'Conduct immediate non-destructive ultrasonic and structural integrity testing on high-risk assets.'
        : 'Ensure active hazard zones are secured and work order parts are expedited.'
    }`;

    return res;
  }

  // 7. Projects and capital expenditure queries
  if (query.includes('project') || query.includes('delay') || query.includes('progress') || query.includes('budget') || query.includes('spent') || query.includes('cost') || query.includes('money') || query.includes('kharcha')) {
    const delayed = data.projects.filter(p => p.progressPercent < 50 && p.status === 'Construction');
    const totalBudget = data.projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const totalSpent = data.projects.reduce((sum, p) => sum + (Number(p.spent) || 0), 0);

    let res = `### 📊 Capital Project Lifecycle & Budget Analysis\n\n`;
    res += `- **Active Projects Tracked:** ${data.projects.length}\n`;
    res += `- **Total Capital Budget:** $${(totalBudget / 1000000).toFixed(2)}M\n`;
    res += `- **Disbursed Expenditure:** $${(totalSpent / 1000000).toFixed(2)}M (${Math.round((totalSpent / (totalBudget || 1)) * 100)}% utilized)\n\n`;

    res += `#### **Project Status Breakdown:**\n`;
    if (data.projects.length === 0) {
      res += `*No capital projects are currently logged in the database.*\n`;
    } else {
      data.projects.slice(0, 5).forEach(p => {
        res += `- **${p.name}** (${p.status})  \n`;
        res += `  Progress: **${p.progressPercent}%** | Contractor: \`${p.contractor}\` | Budget: $${(Number(p.budget) || 0).toLocaleString()}\n`;
      });
    }

    if (delayed.length > 0) {
      res += `\n⚠️ **Delayed or Low-Progress Milestones:** ${delayed.map(d => d.name).join(', ')}`;
    }

    return res;
  }

  // 8. Maintenance records and schedule queries
  if (query.includes('maintenance') || query.includes('repair') || query.includes('schedule') || query.includes('work order')) {
    const scheduled = data.maintenance.filter(m => m.status === 'Scheduled' || m.status === 'In Progress');
    const completed = data.maintenance.filter(m => m.status === 'Completed');
    const totalCost = data.maintenance.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);

    let res = `### 🛠️ Maintenance & Work Order Operations\n\n`;
    res += `- **Total Work Orders:** ${data.maintenance.length}\n`;
    res += `- **Scheduled / In-Progress Tasks:** ${scheduled.length}\n`;
    res += `- **Completed Jobs:** ${completed.length}\n`;
    res += `- **Total Budgeted Cost:** $${totalCost.toLocaleString()}\n\n`;

    res += `#### **Upcoming Scheduled Operations:**\n`;
    if (scheduled.length === 0) {
      res += `*All preventative maintenance tasks are up to date.*\n`;
    } else {
      scheduled.slice(0, 5).forEach(m => {
        const dateStr = m.plannedDate?.toDate 
          ? new Date(m.plannedDate.toDate()).toLocaleDateString() 
          : 'Pending schedule';
        res += `- **${m.type}** (Asset: \`${m.assetId}\`)  \n`;
        res += `  Contractor: \`${m.contractor}\` | Planned: \`${dateStr}\` | Cost: **$${(Number(m.cost) || 0).toLocaleString()}** | Status: **${m.status}**\n`;
      });
    }

    return res;
  }

  // 9. Inspections queries
  if (query.includes('inspection') || query.includes('audit') || query.includes('finding') || query.includes('inspector')) {
    let res = `### 📋 Structural Inspections & Quality Audits\n\n`;
    res += `Total recorded inspections: **${data.inspections.length}**\n\n`;

    if (data.inspections.length === 0) {
      res += `*No field inspections have been conducted yet. Click "Log Inspection" on an asset to record one.*\n`;
    } else {
      res += `#### **Recent Field Observations:**\n`;
      data.inspections.slice(0, 5).forEach(insp => {
        const dStr = insp.date?.toDate ? new Date(insp.date.toDate()).toLocaleDateString() : 'Recent';
        res += `- **Asset \`${insp.assetId}\`** — Evaluated **${insp.condition}**  \n`;
        res += `  Auditor: \`${insp.inspector}\` (${dStr})  \n`;
        res += `  Findings: "${insp.findings}"  \n`;
        if (insp.recommendation) {
          res += `  *Recommendation: ${insp.recommendation}*  \n`;
        }
      });
    }

    return res;
  }

  // 10. General synthesis / summary
  return `### 🏛️ GovAsset 360 Institutional Intelligence Summary

Hello **${userName}** (${userRole}). Here is the current live state of your public asset network:

- **🏛️ Public Assets:** **${data.assets.length}** registered across all municipal sectors.
- **🚨 Risk Overview:** **${data.assets.filter(a => a.riskLevel === 'High').length}** high-risk assets and **${data.issues.filter(i => i.status !== 'Resolved').length}** open discrepancies.
- **🏗️ Capital Projects:** **${data.projects.length}** active projects with an average milestone progress of **${Math.round(data.projects.reduce((s, p) => s + (p.progressPercent || 0), 0) / (data.projects.length || 1))}%**.
- **🛠️ Maintenance:** **${data.maintenance.filter(m => m.status === 'Scheduled').length}** work orders scheduled.

**Suggested actions:**
- Ask: *"What are my assigned tasks?"* to inspect records linked to your user profile.
- Ask: *"Which assets require attention this week?"* for critical infrastructure priorities.
- Ask: *"Show road assets"* or *"bridge"* to search specific infrastructure items.
- Ask: *"How do I report a civic issue?"* for reporting instructions.`;
};

// Main Exported Assistant Engine
export const askAssistant = async (
  prompt: string, 
  user?: UserContext
): Promise<{ text: string; isMock: boolean }> => {
  // 1. Fetch live Firestore dataset
  const dataset = await fetchLiveDataset();

  // 2. Build full context with RBAC & user associations
  const context = buildSystemContext(dataset, user);

  // 3. Try Gemini API first if configured
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: `You are the GovAsset 360 AI Assistant. Your role is to help government officers, field engineers, and contractors manage public infrastructure.
Always check who the operator is and enforce their Access Control permissions.
When answering, prioritize assets, tasks, and issues assigned to or reported by the current user when relevant.
Be concise, professional, structure data in clear markdown tables or bullet points, and ground your answers in the provided live context.`
      });

      const fullPrompt = `${context}\n\nUSER QUESTION: ${prompt}`;
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();
      if (text && text.trim().length > 0) {
        return { text, isMock: false };
      }
    } catch (err: any) {
      console.warn('Gemini API call failed or key invalid, falling back to local intelligence engine:', err.message);
    }
  }

  // 4. Smart Local Engine grounded in live Firestore data and user context
  const localResponse = generateSmartLocalResponse(prompt, dataset, user);
  return { 
    text: localResponse, 
    isMock: !genAI 
  };
};
