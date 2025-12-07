import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthCallback from './pages/AuthCallback';
import Logo from './components/Logo';
import { UpdateNotificationManager } from './components/UpdateNotification';

// Import garden theme CSS
import './styles/garden-theme.css';

// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const GardenDashboard = lazy(() => import('./pages/GardenDashboard'));
const FocusRooms = lazy(() => import('./pages/FocusRooms'));
const Settings = lazy(() => import('./pages/Settings'));
const GamesHub = lazy(() => import('./pages/GamesHub'));
const FlowPage = lazy(() => import('./pages/FlowPage'));
const FlowsLibrary = lazy(() => import('./pages/FlowsLibrary'));
const Activities = lazy(() => import('./pages/Activities'));
const GratitudeGarden = lazy(() => import('./pages/GratitudeGarden'));
const Insights = lazy(() => import('./pages/Insights'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-teal-50">
    <div className="text-center">
      <div className="mx-auto mb-4">
        <Logo size="lg" />
      </div>
      <p className="text-emerald-700">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          
          {/* Main app routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/garden" element={<GardenDashboard />} />
          <Route path="/flows" element={<FlowsLibrary />} />
          <Route path="/flow/:flowId" element={<FlowPage />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/activities/gratitude" element={<GratitudeGarden />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/focus-rooms" element={<FocusRooms />} />
          <Route path="/games" element={<GamesHub />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
      
      {/* Global Update Notification Manager */}
      <UpdateNotificationManager />
    </>
  );
}

export default App;
