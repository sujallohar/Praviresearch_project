import { serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';

export const seedDemoData = async () => {
  try {
    const batch = writeBatch(db);

    // 1. Assets (Deterministic IDs to prevent shifting/duplicates on click)
    const assetsData = [
      { id: 'asset-nh44-a', name: 'National Highway 44 - Sector A', type: 'Infrastructure', dept: 'dept-transport', loc: 'North District', status: 'Operational', cond: 'Fair', risk: 'Medium', lat: 23.0225, lng: 72.5714, val: 1500000 },
      { id: 'asset-nh44-b', name: 'National Highway 44 - Sector B', type: 'Infrastructure', dept: 'dept-transport', loc: 'North District', status: 'Maintenance', cond: 'Poor', risk: 'High', lat: 23.0300, lng: 72.5800, val: 1200000 },
      { id: 'asset-hospital-b', name: 'City General Hospital Wing B', type: 'Building', dept: 'dept-health', loc: 'Central District', status: 'Operational', cond: 'Good', risk: 'Low', lat: 23.0250, lng: 72.5750, val: 3500000 },
      { id: 'asset-pedestrian-bridge', name: 'Downtown Pedestrian Bridge', type: 'Infrastructure', dept: 'dept-transport', loc: 'Central District', status: 'Operational', cond: 'Excellent', risk: 'Low', lat: 23.0200, lng: 72.5850, val: 850000 },
      { id: 'asset-fire-station-west', name: 'Westside Fire Station', type: 'Building', dept: 'dept-safety', loc: 'West District', status: 'Maintenance', cond: 'Fair', risk: 'Medium', lat: 23.0150, lng: 72.5650, val: 1800000 },
      { id: 'asset-water-plant-east', name: 'East Water Treatment Plant', type: 'Facility', dept: 'dept-utilities', loc: 'East District', status: 'Operational', cond: 'Good', risk: 'Low', lat: 23.0350, lng: 72.5950, val: 4200000 },
      { id: 'asset-park-pathways', name: 'Central Park Pathways', type: 'Infrastructure', dept: 'dept-parks', loc: 'Central District', status: 'Implementation', cond: 'Excellent', risk: 'Low', lat: 23.0280, lng: 72.5780, val: 320000 },
      { id: 'asset-mobile-clinic-01', name: 'Mobile Clinic Unit 01', type: 'Vehicle', dept: 'dept-health', loc: 'Mobile Fleet', status: 'Operational', cond: 'Good', risk: 'Low', lat: 23.0210, lng: 72.5710, val: 180000 },
      { id: 'asset-mobile-clinic-02', name: 'Mobile Clinic Unit 02', type: 'Vehicle', dept: 'dept-health', loc: 'Mobile Fleet', status: 'Operational', cond: 'Poor', risk: 'High', lat: 23.0290, lng: 72.5810, val: 175000 },
      { id: 'asset-library-north', name: 'North District Public Library', type: 'Building', dept: 'dept-education', loc: 'North District', status: 'Operational', cond: 'Fair', risk: 'Medium', lat: 23.0400, lng: 72.5700, val: 2100000 },
      { id: 'asset-h99-overpass', name: 'Highway 99 Overpass', type: 'Infrastructure', dept: 'dept-transport', loc: 'South District', status: 'Planning', cond: 'Critical', risk: 'High', lat: 23.0100, lng: 72.5750, val: 2800000 }
    ];

    for (const a of assetsData) {
      const ref = doc(db, 'assets', a.id);
      batch.set(ref, {
        name: a.name,
        type: a.type,
        departmentId: a.dept,
        location: a.loc,
        status: a.status,
        condition: a.cond,
        riskLevel: a.risk,
        latitude: a.lat,
        longitude: a.lng,
        estimatedValue: a.val,
        owner: 'Directorate of Municipal Public Works',
        description: `Government capital infrastructure asset: ${a.name}.`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // 2. Capital Projects (Deterministic IDs)
    const projectsData = [
      { id: 'proj-nh44-repaving', name: 'NH44 Repaving & Asphalt Polymer', assetId: 'asset-nh44-b', status: 'Construction', progress: 45, contractor: 'Alpha Paving Corp', budget: 1200000, spent: 540000 },
      { id: 'proj-hospital-expansion', name: 'Hospital Wing Expansion Project', assetId: 'asset-hospital-b', status: 'Planning', progress: 10, contractor: 'MedBuild Infra Ltd', budget: 2500000, spent: 250000 },
      { id: 'proj-park-pathways', name: 'Park Pathway Drainage Overhaul', assetId: 'asset-park-pathways', status: 'Construction', progress: 80, contractor: 'GreenScapes Civic', budget: 350000, spent: 280000 },
      { id: 'proj-h99-replacement', name: 'H99 Overpass Structural Retrofit', assetId: 'asset-h99-overpass', status: 'Tender', progress: 0, contractor: 'Pending Municipal Bid', budget: 3100000, spent: 0 },
      { id: 'proj-clinic-fleet', name: 'Mobile Clinic Fleet Servicing', assetId: 'asset-mobile-clinic-02', status: 'Construction', progress: 30, contractor: 'AutoMed Services', budget: 90000, spent: 27000 },
    ];

    for (const p of projectsData) {
      const ref = doc(db, 'projects', p.id);
      batch.set(ref, {
        name: p.name,
        assetId: p.assetId,
        departmentId: 'dept-transport',
        status: p.status,
        progressPercent: p.progress,
        contractor: p.contractor,
        budget: p.budget,
        spent: p.spent,
        description: `Capital project execution for ${p.name}.`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // 3. Inspections (Deterministic IDs)
    const inspectionsData = [
      { id: 'insp-nh44-a', assetId: 'asset-nh44-a', inspector: 'Officer Raman Sharma', cond: 'Fair', findings: 'Surface aggregate wear detected in lanes 2 and 3.', rec: 'Schedule slurry seal within 6 months.' },
      { id: 'insp-nh44-b', assetId: 'asset-nh44-b', inspector: 'Senior Inspector Verma', cond: 'Poor', findings: 'Cavity voids and high-stress transverse cracks observed.', rec: 'Prioritize deep mill and asphalt overlay.' },
      { id: 'insp-hospital', assetId: 'asset-hospital-b', inspector: 'Civil Eng. K. Patel', cond: 'Good', findings: 'Structural columns sound. HVAC dampers calibrated.', rec: 'Standard cycle monitoring.' },
      { id: 'insp-bridge', assetId: 'asset-pedestrian-bridge', inspector: 'Vikram Singh', cond: 'Excellent', findings: 'No corrosion on cable stays or expansion joints.', rec: 'Next ultrasonic audit in 24 months.' },
      { id: 'insp-overpass', assetId: 'asset-h99-overpass', inspector: 'Lead Auditor Gupta', cond: 'Critical', findings: 'Severe spalling on pier 4. Rebar oxidation visible.', rec: 'Impose 15-ton load restriction immediately.' },
    ];

    for (const insp of inspectionsData) {
      const ref = doc(db, 'inspections', insp.id);
      batch.set(ref, {
        assetId: insp.assetId,
        inspector: insp.inspector,
        date: serverTimestamp(),
        condition: insp.cond,
        findings: insp.findings,
        recommendation: insp.rec,
        status: 'Completed',
        geofenceVerified: true,
        geofenceDistanceMeters: 42,
        geofenceStatus: 'GPS Anti-Fraud Verified On-Site (42m delta)',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // 4. Issues (Deterministic IDs)
    const issuesData = [
      { id: 'issue-pothole-nh44', assetId: 'asset-nh44-b', title: 'Deep Pothole Void on KM 14.2', sev: 'High', status: 'Open', reportedBy: 'Citizen Patrol' },
      { id: 'issue-crack-overpass', assetId: 'asset-h99-overpass', title: 'Structural Pier Spalling & Rebar Exposure', sev: 'Critical', status: 'Open', reportedBy: 'Field Inspector' },
      { id: 'issue-fire-leak', assetId: 'asset-fire-station-west', title: 'Secondary Reservoir Valve Leak', sev: 'Medium', status: 'In Progress', reportedBy: 'Station Chief' },
      { id: 'issue-filter-water', assetId: 'asset-water-plant-east', title: 'Sand Bed Filter Replacement Due', sev: 'Low', status: 'Resolved', reportedBy: 'Operations Tech' },
    ];

    for (const iss of issuesData) {
      const ref = doc(db, 'issues', iss.id);
      batch.set(ref, {
        assetId: iss.assetId,
        title: iss.title,
        description: 'Recorded through GovAsset 360 Municipal Safety Protocol.',
        severity: iss.sev,
        status: iss.status,
        reportedBy: iss.reportedBy,
        assignedTo: 'Rapid Municipal Response Team',
        dueDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // 5. Maintenance Records (Deterministic IDs)
    const maintData = [
      { id: 'maint-nh44-repave', assetId: 'asset-nh44-b', type: 'Asphalt Mill & Repaving', status: 'In Progress', cost: 18500, contractor: 'Alpha Paving' },
      { id: 'maint-fire-roof', assetId: 'asset-fire-station-west', type: 'Membrane Weatherproofing', status: 'Scheduled', cost: 9200, contractor: 'Apex Roofing' },
      { id: 'maint-bridge-coating', assetId: 'asset-pedestrian-bridge', type: 'Anti-Corrosion Zinc Primer', status: 'Completed', cost: 14500, contractor: 'CorroShield Ltd' },
      { id: 'maint-clinic-servicing', assetId: 'asset-mobile-clinic-02', type: 'Transmission & Hydraulic Inspection', status: 'Scheduled', cost: 4200, contractor: 'FleetWorks' }
    ];

    for (const m of maintData) {
      const ref = doc(db, 'maintenanceRecords', m.id);
      batch.set(ref, {
        assetId: m.assetId,
        type: m.type,
        plannedDate: serverTimestamp(),
        actualDate: m.status === 'Completed' ? serverTimestamp() : null,
        cost: m.cost,
        contractor: m.contractor,
        notes: 'Official municipal maintenance service record.',
        status: m.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    await batch.commit();
    console.log("Idempotent seeding completed without record shifting or duplicate accumulation.");
    return true;
  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
};
