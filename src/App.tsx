import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PublicUpdates } from './pages/PublicUpdates';
import { Assets } from './pages/Assets';
import { AssetDetail } from './pages/AssetDetail';
import { Projects } from './pages/Projects';
import { Issues } from './pages/Issues';
import { Inspections } from './pages/Inspections';
import { Maintenance } from './pages/Maintenance';
import { Assistant } from './pages/Assistant';
import { Reports } from './pages/Reports';
import { About } from './pages/About';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login & Role Switcher Portal */}
          <Route path="/login" element={<Login />} />
          
          {/* Main App Routes - Open to Public Citizens with Granular RBAC */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="updates" element={<PublicUpdates />} />
            <Route path="assets" element={<Assets />} />
            <Route path="assets/:id" element={<AssetDetail />} />
            <Route path="projects" element={<Projects />} />
            <Route path="issues" element={<Issues />} />
            <Route path="inspections" element={<Inspections />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="about" element={<About />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
