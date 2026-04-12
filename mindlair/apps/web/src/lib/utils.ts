import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

export function getDomainFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function calculateEngagementScore(metrics: {
  dwellTimeMs?: number;
  scrollDepth?: number;
  completionPercent?: number;
}): number {
  const { dwellTimeMs = 0, scrollDepth = 0, completionPercent = 0 } = metrics;
  
  // Normalize dwell time (cap at 10 minutes = 600000ms)
  const normalizedDwell = Math.min(dwellTimeMs / 600000, 1);
  
  // Weight: 40% dwell time, 30% scroll depth, 30% completion
  const score = (normalizedDwell * 0.4) + (scrollDepth * 0.3) + (completionPercent * 0.3);
  
  return Math.round(score * 100) / 100;
}

export function shouldTriggerRealtimePrompt(metrics: {
  dwellTimeMs: number;
  scrollDepth: number;
  completionPercent: number;
}): boolean {
  // Require minimum 30 seconds dwell time
  if (metrics.dwellTimeMs < 30000) return false;
  
  // Require at least 60% scroll depth OR 70% completion
  if (metrics.scrollDepth < 0.6 && metrics.completionPercent < 0.7) return false;
  
  return true;
}

export function getDigestWindow(): 'morning' | 'evening' | null {
  const hour = new Date().getHours();
  
  // Morning window: 6-11am
  if (hour >= 6 && hour < 11) return 'morning';
  
  // Evening window: 5-10pm
  if (hour >= 17 && hour < 22) return 'evening';
  
  return null;
}
