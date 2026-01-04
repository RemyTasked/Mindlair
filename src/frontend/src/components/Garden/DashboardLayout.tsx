/**
 * Mind Garden - Dashboard Layout
 * 
 * Main layout component featuring:
 * - Left sidebar for navigation
 * - Full-screen garden visualization area
 * - Bottom slide-up panel for active flows
 * - Top bar for profile and notifications
 */

import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Sparkles,
  Gamepad2,
  BarChart3,
  Settings,
  Music,
  Menu,
  X,
  ChevronUp,
  ChevronDown,
  LogOut,
  Bell,
  Sun,
  Moon,
  Calendar,
} from 'lucide-react';
import '../../styles/garden-theme.css';

interface DashboardLayoutProps {
  children: ReactNode;
  activeSection?: 'home' | 'flows' | 'activities' | 'insights' | 'settings' | 'sounds';
  gardenState?: {
    health: number;
    visualState: 'thriving' | 'growing' | 'stable' | 'idle' | 'dormant';
    flowsToday: number;
    streak: number;
  };
  user?: {
    name?: string;
    email: string;
    picture?: string;
  };
  onLogout?: () => void;
}

// Navigation items
const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
  { id: 'flows', label: 'Flows', icon: Sparkles, path: '/flows' },
  { id: 'activities', label: 'Activities', icon: Gamepad2, path: '/games' },
  { id: 'insights', label: 'Insights', icon: BarChart3, path: '/insights' },
  { id: 'sounds', label: 'Sounds', icon: Music, path: '/focus-rooms' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
] as const;

// Get time of day for theme
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Get garden state color
function getStateColor(state: string): string {
  switch (state) {
    case 'thriving': return 'var(--mg-state-thriving)';
    case 'growing': return 'var(--mg-state-growing)';
    case 'stable': return 'var(--mg-state-stable)';
    case 'idle': return 'var(--mg-state-idle)';
    default: return 'var(--mg-state-dormant)';
  }
}

export default function DashboardLayout({
  children,
  activeSection = 'home',
  gardenState,
  user,
  onLogout,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bottomPanelExpanded, setBottomPanelExpanded] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDay());
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Update time of day every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Determine active section from path
  const currentSection = NAV_ITEMS.find(item => 
    location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  )?.id || activeSection;

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div 
      className="min-h-screen bg-[var(--mg-bg-primary)] text-[var(--mg-text-primary)]"
      data-theme={isDarkMode ? 'dark' : 'light'}
      data-time={timeOfDay}
    >
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[199] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`mg-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${
          mobileMenuOpen ? 'mobile-open' : ''
        }`}
      >
        {/* Logo & Collapse Button */}
        <div className="mg-sidebar-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xl">
                🌱
              </div>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <h1 className="text-lg font-bold text-[var(--mg-accent-light)]">Mind Garden</h1>
                  <p className="text-xs text-[var(--mg-text-muted)]">Grow your focus</p>
                </motion.div>
              )}
            </div>
            
            {/* Collapse button (desktop) */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-2 rounded-lg hover:bg-[var(--mg-bg-card)] transition-colors"
            >
              <Menu className="w-5 h-5 text-[var(--mg-text-muted)]" />
            </button>
            
            {/* Close button (mobile) */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-2 rounded-lg hover:bg-[var(--mg-bg-card)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--mg-text-muted)]" />
            </button>
          </div>
        </div>

        {/* Garden Status Card */}
        {!sidebarCollapsed && gardenState && (
          <div className="px-4 py-3">
            <div className="mg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[var(--mg-text-secondary)]">Garden Status</span>
                <span 
                  className="px-2 py-1 text-xs font-semibold rounded-full"
                  style={{ 
                    backgroundColor: `${getStateColor(gardenState.visualState)}20`,
                    color: getStateColor(gardenState.visualState)
                  }}
                >
                  {gardenState.visualState.charAt(0).toUpperCase() + gardenState.visualState.slice(1)}
                </span>
              </div>
              
              {/* Health Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--mg-text-muted)]">Health</span>
                  <span className="text-[var(--mg-text-secondary)]">{gardenState.health}%</span>
                </div>
                <div className="h-2 bg-[var(--mg-bg-primary)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ 
                      backgroundColor: getStateColor(gardenState.visualState),
                      width: `${gardenState.health}%`
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${gardenState.health}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-lg bg-[var(--mg-bg-primary)]">
                  <div className="text-lg font-bold text-[var(--mg-accent-light)]">{gardenState.flowsToday}</div>
                  <div className="text-xs text-[var(--mg-text-muted)]">Today</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--mg-bg-primary)]">
                  <div className="text-lg font-bold text-[var(--mg-accent-light)]">{gardenState.streak}</div>
                  <div className="text-xs text-[var(--mg-text-muted)]">Streak</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="mg-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`mg-nav-item w-full ${currentSection === item.id ? 'active' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[var(--mg-border)]">
          {user && !sidebarCollapsed ? (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm font-semibold text-white">
                {user.picture ? (
                  <img src={user.picture} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  (user.name || user.email)[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--mg-text-primary)] truncate">
                  {user.name || 'User'}
                </div>
                <div className="text-xs text-[var(--mg-text-muted)] truncate">{user.email}</div>
              </div>
            </div>
          ) : null}
          
          <div className="flex gap-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex-1 p-2 rounded-lg bg-[var(--mg-bg-card)] hover:bg-[var(--mg-bg-primary)] transition-colors flex items-center justify-center gap-2"
              title={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {!sidebarCollapsed && <span className="text-sm">{isDarkMode ? 'Light' : 'Dark'}</span>}
            </button>
            
            {/* Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-[var(--mg-bg-card)] hover:bg-red-500/20 hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--mg-bg-secondary)] border-b border-[var(--mg-border)] z-[var(--mg-z-topbar)] flex items-center justify-between px-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-[var(--mg-bg-card)] transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm">
            🌱
          </div>
          <span className="font-bold text-[var(--mg-accent-light)]">Mind Garden</span>
        </div>
        
        <button 
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg hover:bg-[var(--mg-bg-card)] transition-colors"
          title="Notifications & Settings"
        >
          <Bell className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className={`mg-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''} pt-16 md:pt-0`}>
        {children}
      </main>

      {/* Bottom Panel (for active flows) */}
      <motion.div
        className={`mg-bottom-panel ${bottomPanelExpanded ? 'expanded' : ''}`}
        initial={false}
        animate={{
          height: bottomPanelExpanded ? 'var(--mg-bottom-panel-height)' : 'var(--mg-bottom-panel-collapsed)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ left: sidebarCollapsed ? 'var(--mg-sidebar-collapsed)' : 'var(--mg-sidebar-width)' }}
      >
        {/* Handle */}
        <button
          onClick={() => setBottomPanelExpanded(!bottomPanelExpanded)}
          className="w-full flex flex-col items-center pt-2 pb-1"
        >
          <div className="mg-bottom-panel-handle" />
          <div className="flex items-center gap-2 text-[var(--mg-text-muted)] text-sm mt-1">
            {bottomPanelExpanded ? (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Quick Actions</span>
              </>
            )}
          </div>
        </button>

        {/* Quick Actions Row (visible when collapsed) */}
        <div className="flex justify-center gap-4 px-4 py-2">
          <button
            onClick={() => navigate('/flow/quick-reset')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--mg-bg-card)] hover:bg-[var(--mg-accent)]/20 transition-colors"
          >
            <span className="text-xl">🔄</span>
            <span className="text-sm font-medium">Quick Reset</span>
          </button>
          <button
            onClick={() => navigate('/flow/breathing')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--mg-bg-card)] hover:bg-[var(--mg-accent)]/20 transition-colors"
          >
            <span className="text-xl">🌬️</span>
            <span className="text-sm font-medium">Breathe</span>
          </button>
          <button
            onClick={() => navigate('/flow/pre-meeting-focus')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--mg-bg-card)] hover:bg-[var(--mg-accent)]/20 transition-colors"
          >
            <span className="text-xl">🎯</span>
            <span className="text-sm font-medium">Focus</span>
          </button>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {bottomPanelExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 py-4"
            >
              <h3 className="text-lg font-semibold mb-4">Today's Schedule</h3>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--mg-bg-card)]">
                <Calendar className="w-5 h-5 text-[var(--mg-accent)]" />
                <span className="text-[var(--mg-text-secondary)]">
                  Connect your calendar to see upcoming meetings
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

