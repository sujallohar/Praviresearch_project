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
  const query = prompt.toLowerCase();
  const userName = user?.name || 'Officer';
  const userRole = user?.role || 'Government Officer';

  // 1. User-specific / "my" data queries
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

  // 2. High-risk, attention required, or critical condition queries
  if (query.includes('attention') || query.includes('high risk') || query.includes('critical') || query.includes('danger') || query.includes('condition')) {
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
      userRole === 'Government Officer' 
        ? 'Dispatch rapid engineering teams and allocate emergency maintenance funds for the flagged assets above.'
        : userRole === 'Field Engineer'
        ? 'Conduct immediate non-destructive ultrasonic and structural integrity testing on high-risk assets.'
        : 'Ensure active hazard zones are secured and work order parts are expedited.'
    }`;

    return res;
  }

  // 3. Projects and capital expenditure queries
  if (query.includes('project') || query.includes('delay') || query.includes('progress') || query.includes('budget') || query.includes('spent')) {
    const delayed = data.projects.filter(p => p.progressPercent < 50 && p.status === 'Construction');
    const totalBudget = data.projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const totalSpent = data.projects.reduce((sum, p) => sum + (Number(p.spent) || 0), 0);

    let res = `### 📊 Capital Project Lifecycle & Budget Analysis\n\n`;
    res += `- **Active Projects Tracked:** ${data.projects.length}\n`;
    res += `- **Total Capital Budget:** $${(totalBudget / 1000000).toFixed(2)}M\n`;
    res += `- **Disbursed Expenditure:** $${(totalSpent / 1000000).toFixed(2)}M (${Math.round((totalSpent / (totalBudget || 1)) * 100)}% utilized)\n\n`;

    res += `#### **Project Status Breakdown:**\n`;
    data.projects.forEach(p => {
      res += `- **${p.name}** (${p.status})  \n`;
      res += `  Progress: **${p.progressPercent}%** | Contractor: \`${p.contractor}\` | Budget: $${(Number(p.budget) || 0).toLocaleString()}\n`;
    });

    if (delayed.length > 0) {
      res += `\n⚠️ **Delayed or Low-Progress Milestones:** ${delayed.map(d => d.name).join(', ')}`;
    }

    return res;
  }

  // 4. Maintenance records and schedule queries
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

  // 5. Inspections queries
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

  // 6. General synthesis / summary
  return `### 🏛️ GovAsset 360 Institutional Intelligence Summary

Hello **${userName}** (${userRole}). Here is the current live state of your public asset network:

- **🏛️ Public Assets:** **${data.assets.length}** registered across all municipal sectors.
- **🚨 Risk Overview:** **${data.assets.filter(a => a.riskLevel === 'High').length}** high-risk assets and **${data.issues.filter(i => i.status !== 'Resolved').length}** open discrepancies.
- **🏗️ Capital Projects:** **${data.projects.length}** active projects with an average milestone progress of **${Math.round(data.projects.reduce((s, p) => s + (p.progressPercent || 0), 0) / (data.projects.length || 1))}%**.
- **🛠️ Maintenance:** **${data.maintenance.filter(m => m.status === 'Scheduled').length}** work orders scheduled.

**How to interact:**
- Ask: *"What are my assigned tasks?"* to view records linked to your user profile.
- Ask: *"Which assets require attention this week?"* for critical infrastructure priorities.
- Ask: *"Show delayed projects"* for contractor performance and budget variance analysis.
- Ask: *"Explain my access control permissions"* to inspect your authorization level.`;
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
