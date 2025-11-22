import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthCallback from './pages/AuthCallback';
import Logo from './components/Logo';
import { CueToastManager } from './components/CueToast';
import { UpdateNotificationManager } from './components/UpdateNotification';

// Lazy load heavy routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FocusRooms = lazy(() => import('./pages/FocusRooms'));
const Settings = lazy(() => import('./pages/Settings'));
const FocusScene = lazy(() => import('./pages/FocusScene'));
const FocusSceneDemo = lazy(() => import('./pages/FocusSceneDemo'));
const PresleyFlow = lazy(() => import('./pages/PresleyFlow'));
const WindingDown = lazy(() => import('./pages/WindingDown'));
const WeekendFlow = lazy(() => import('./pages/WeekendFlow'));
const MeetingRating = lazy(() => import('./pages/MeetingRating'));
const GamesHub = lazy(() => import('./pages/GamesHub'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-teal-50">
    <div className="text-center">
      <div className="mx-auto mb-4">
        <Logo size="lg" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-800">Loading...</h2>
    </div>
  </div>
);

function App() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/focus/demo" element={<FocusSceneDemo />} />
          <Route path="/focus/:userId/:meetingId" element={<FocusScene />} />
          <Route path="/rate/:userId/:meetingId" element={<MeetingRating />} />
          <Route path="/presley-flow/:userId/:date" element={<PresleyFlow />} />
          <Route path="/winding-down/:userId" element={<WindingDown />} />
          <Route path="/weekend-flow/:userId" element={<WeekendFlow />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/focus-rooms" element={<FocusRooms />} />
          <Route path="/games" element={<GamesHub />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </Suspense>
      
      {/* Global Cue Toast Manager */}
      <CueToastManager />
      
      {/* Global Update Notification Manager */}
      <UpdateNotificationManager />
    </>
  );
}

export default App;

