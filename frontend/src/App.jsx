import { Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Landing from './pages/Landing.jsx';
import NotFound from './pages/NotFound.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AppLayout from './components/common/AppLayout.jsx';
import AuthPage from './pages/auth/AuthPage.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import Websites from './pages/websites/Websites.jsx';
import WebsiteForm from './pages/websites/WebsiteForm.jsx';
import WebsiteDetails from './pages/websites/WebsiteDetails.jsx';
import Audits from './pages/audits/Audits.jsx';
import AuditDetails from './pages/audits/AuditDetails.jsx';
import Settings from './pages/Settings.jsx';
import Keywords from './pages/Keywords.jsx';
import ContentStudio from './pages/ContentStudio.jsx';
import './styles/workspace.css';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <AuthProvider><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<AuthPage />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
    <Route path="/reset-password" element={<AuthPage mode="reset" />} />
    <Route element={<AppLayout />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/websites" element={<Websites />} />
      <Route path="/websites/add" element={<WebsiteForm />} />
      <Route path="/websites/:id" element={<WebsiteDetails />} />
      <Route path="/websites/:id/edit" element={<WebsiteForm />} />
      <Route path="/audits" element={<Audits />} />
      <Route path="/audits/:id" element={<AuditDetails />} />
      <Route path="/keywords" element={<Keywords />} />
      <Route path="/content" element={<ContentStudio />} />
      <Route path="/assistant" element={<ContentStudio assistant />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes></AuthProvider>;
}

