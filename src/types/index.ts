

export type AssetState = 'Planning' | 'Procurement' | 'Implementation' | 'Commissioning' | 'Operational' | 'Maintenance' | 'Retirement';

export interface Asset {
  id?: string;
  name: string;
  type: string;
  departmentId: string;
  location: string;
  status: AssetState;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  riskLevel: 'Low' | 'Medium' | 'High';
  latitude?: number;
  longitude?: number;
  projectId?: string;
  owner: string;
  description: string;
  createdAt: any;
  updatedAt: any;
}

export interface Project {
  id?: string;
  name: string;
  assetId: string;
  departmentId: string;
  status: 'Planning' | 'Tender' | 'Awarded' | 'Construction' | 'Completed';
  progressPercent: number;
  contractor: string;
  budget: number;
  spent: number;
  description: string;
  createdAt: any;
  updatedAt: any;
}

export interface Issue {
  id?: string;
  assetId: string;
  projectId?: string;
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  reportedBy: string;
  assignedTo: string;
  dueDate: any;
  createdAt: any;
}

export interface Inspection {
  id?: string;
  assetId: string;
  inspector: string;
  date: any;
  condition: string;
  findings: string;
  recommendation: string;
  status: 'Pending' | 'Completed';
}

export interface MaintenanceRecord {
  id?: string;
  assetId: string;
  type: string;
  plannedDate: any;
  actualDate: any;
  cost: number;
  contractor: string;
  notes: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
}

export interface AuditLog {
  id?: string;
  action: string;
  entityType: 'Asset' | 'Project' | 'Issue' | 'Inspection' | 'Maintenance';
  entityId: string;
  userId: string;
  timestamp: any;
  details: string;
}

export interface CitizenFeedback {
  id?: string;
  itemId: string;
  itemType: 'Project' | 'Maintenance' | 'Issue';
  itemTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  category: string;
  createdAt: any;
  updatedAt: any;
}

