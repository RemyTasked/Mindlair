import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import FocusScene from './pages/FocusScene';
import FocusSceneDemo from './pages/FocusSceneDemo';
import Dashboard from './pages/Dashboard';
import AuthCallback from './pages/AuthCallback';
import Settings from './pages/Settings';
import MeetingRating from './pages/MeetingRating';
import PresleyFlow from './pages/PresleyFlow';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/focus/demo" element={<FocusSceneDemo />} />
      <Route path="/focus/:userId/:meetingId" element={<FocusScene />} />
      <Route path="/rate/:userId/:meetingId" element={<MeetingRating />} />
      <Route path="/presley-flow/:userId/:date" element={<PresleyFlow />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
    </Routes>
  );
}

export default App;

