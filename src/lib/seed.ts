import { collection, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';

export const seedDemoData = async () => {
  try {
    const batch = writeBatch(db);

    // 1. Assets (10-15)
    const assetRefs = [];
    const assetsData = [
      { name: 'National Highway 44 - Sector A', type: 'Infrastructure', dept: 'dept-transport', loc: 'North District', status: 'Operational', cond: 'Fair', risk: 'Medium', lat: 23.0225, lng: 72.5714 },
      { name: 'National Highway 44 - Sector B', type: 'Infrastructure', dept: 'dept-transport', loc: 'North District', status: 'Maintenance', cond: 'Poor', risk: 'High', lat: 23.0300, lng: 72.5800 },
      { name: 'City General Hospital Wing B', type: 'Building', dept: 'dept-health', loc: 'Central District', status: 'Operational', cond: 'Good', risk: 'Low', lat: 23.0250, lng: 72.5750 },
      { name: 'Downtown Pedestrian Bridge', type: 'Infrastructure', dept: 'dept-transport', loc: 'Central District', status: 'Operational', cond: 'Excellent', risk: 'Low', lat: 23.0200, lng: 72.5850 },
      { name: 'Westside Fire Station', type: 'Building', dept: 'dept-safety', loc: 'West District', status: 'Maintenance', cond: 'Fair', risk: 'Medium', lat: 23.0150, lng: 72.5650 },
      { name: 'East Water Treatment Plant', type: 'Facility', dept: 'dept-utilities', loc: 'East District', status: 'Operational', cond: 'Good', risk: 'Low', lat: 23.0350, lng: 72.5950 },
      { name: 'Central Park Pathways', type: 'Infrastructure', dept: 'dept-parks', loc: 'Central District', status: 'Implementation', cond: 'Excellent', risk: 'Low', lat: 23.0280, lng: 72.5780 },
      { name: 'Mobile Clinic Unit 01', type: 'Vehicle', dept: 'dept-health', loc: 'Mobile', status: 'Operational', cond: 'Good', risk: 'Low', lat: 23.0210, lng: 72.5710 },
      { name: 'Mobile Clinic Unit 02', type: 'Vehicle', dept: 'dept-health', loc: 'Mobile', status: 'Operational', cond: 'Poor', risk: 'High', lat: 23.0290, lng: 72.5810 },
      { name: 'North District Public Library', type: 'Building', dept: 'dept-education', loc: 'North District', status: 'Operational', cond: 'Fair', risk: 'Medium', lat: 23.0400, lng: 72.5700 },
      { name: 'Highway 99 Overpass', type: 'Infrastructure', dept: 'dept-transport', loc: 'South District', status: 'Planning', cond: 'Critical', risk: 'High', lat: 23.0100, lng: 72.5750 },
    ];

    for (const a of assetsData) {
      const ref = doc(collection(db, 'assets'));
      assetRefs.push(ref);
      batch.set(ref, {
        name: a.name, type: a.type, departmentId: a.dept, location: a.loc,
        status: a.status, condition: a.cond, riskLevel: a.risk,
        latitude: a.lat, longitude: a.lng,
        owner: 'GovAdmin', description: `Demo asset: ${a.name}`,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
    }

    // 2. Projects (4-6)
    const projectsData = [
      { name: 'NH44 Repaving', assetIdx: 1, status: 'Construction', progress: 45, contractor: 'Alpha Paving' },
      { name: 'Hospital Wing Expansion', assetIdx: 2, status: 'Planning', progress: 10, contractor: 'MedBuild Inc' },
      { name: 'Park Pathway Renovation', assetIdx: 6, status: 'Construction', progress: 80, contractor: 'GreenScapes' },
      { name: 'H99 Overpass Replacement', assetIdx: 10, status: 'Tender', progress: 0, contractor: 'TBD' },
      { name: 'Clinic Fleet Overhaul', assetIdx: 8, status: 'Construction', progress: 30, contractor: 'AutoMed Services' },
    ];

    for (const p of projectsData) {
      const ref = doc(collection(db, 'projects'));
      batch.set(ref, {
        name: p.name, assetId: assetRefs[p.assetIdx].id, departmentId: 'dept-demo',
        status: p.status, progressPercent: p.progress, contractor: p.contractor,
        budget: 5000000, spent: 1200000, description: `Project for ${p.name}`,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
    }

    // 3. Inspections (5+)
    for (let i = 0; i < 6; i++) {
      const ref = doc(collection(db, 'inspections'));
      batch.set(ref, {
        assetId: assetRefs[i].id, inspector: 'Eng. Smith', date: serverTimestamp(),
        condition: assetsData[i].cond, findings: 'Routine check completed.',
        recommendation: 'Continue monitoring.', status: 'Completed'
      });
    }

    // 4. Issues (5+)
    const issuesData = [
      { idx: 1, title: 'Severe Potholes Section 4', sev: 'High', status: 'Open' },
      { idx: 1, title: 'Guardrail Damage', sev: 'Medium', status: 'In Progress' },
      { idx: 4, title: 'Roof Leak - Generator Room', sev: 'Critical', status: 'Assigned' },
      { idx: 8, title: 'Engine Warning Light', sev: 'High', status: 'Open' },
      { idx: 10, title: 'Structural Cracks Detected', sev: 'Critical', status: 'Open' },
      { idx: 2, title: 'HVAC Filter Replacement', sev: 'Low', status: 'Resolved' },
    ];

    for (const issue of issuesData) {
      const ref = doc(collection(db, 'issues'));
      batch.set(ref, {
        assetId: assetRefs[issue.idx].id, title: issue.title, description: 'Requires attention.',
        severity: issue.sev, status: issue.status, reportedBy: 'Field Agent',
        assignedTo: 'Maintenance Team', dueDate: serverTimestamp(), createdAt: serverTimestamp()
      });
    }

    // 5. Maintenance (4+)
    const maintData = [
      { idx: 1, type: 'Repaving', status: 'In Progress' },
      { idx: 4, type: 'Roof Repair', status: 'Scheduled' },
      { idx: 8, type: 'Engine Service', status: 'Scheduled' },
      { idx: 3, type: 'Bridge Rust Treatment', status: 'Completed' },
      { idx: 5, type: 'Filter Replacement', status: 'Completed' },
    ];

    for (const m of maintData) {
      const ref = doc(collection(db, 'maintenanceRecords'));
      batch.set(ref, {
        assetId: assetRefs[m.idx].id, type: m.type, plannedDate: serverTimestamp(), actualDate: m.status === 'Completed' ? serverTimestamp() : null,
        cost: 5000, contractor: 'City Services', notes: 'Standard procedure', status: m.status
      });
    }

    await batch.commit();
    console.log("Seeding complete!");
    return true;
  } catch (error) {
    console.error("Error seeding data:", error);
    return false;
  }
};
