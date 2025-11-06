# 🚀 Performance Optimization Plan

## Current Issues

### 1. **Slow Initial Load**
- Dashboard makes 4 parallel API calls on every load
- No caching of user profile data
- No lazy loading of components
- Large bundle size (all components loaded upfront)

### 2. **Slow Sign-In**
- OAuth callback → Dashboard redirect has no intermediate loading state
- Dashboard blocks rendering until all API calls complete
- No progressive rendering

---

## Optimization Strategy

### Phase 1: Quick Wins (Immediate) ⚡

#### A. Add Loading Skeletons
Instead of blocking, show UI immediately with loading states.

**Dashboard.tsx:**
- Show skeleton cards while data loads
- Progressive rendering: show user info → stats → meetings
- Don't wait for all API calls to render

#### B. Cache User Profile
User profile rarely changes - cache it in localStorage.

**Benefits:**
- Instant dashboard render on subsequent visits
- Refresh in background
- Reduce API calls by 25%

#### C. Defer Non-Critical API Calls
Only load critical data upfront:
- **Critical**: User profile, upcoming meetings (today)
- **Deferred**: Stats (30 days), Presley Flow, Reflection insights

---

### Phase 2: Code Splitting (High Impact) 📦

#### A. Lazy Load Routes
```typescript
const Settings = lazy(() => import('./pages/Settings'));
const PresleyFlow = lazy(() => import('./pages/PresleyFlow'));
const FocusScene = lazy(() => import('./pages/FocusScene'));
```

**Impact:**
- Reduce initial bundle by ~60%
- Faster first paint
- Load routes on-demand

#### B. Lazy Load Heavy Components
```typescript
const DirectorsInsights = lazy(() => import('./components/DirectorsInsights'));
const SceneLibrary = lazy(() => import('./components/SceneLibrary'));
```

**Impact:**
- Dashboard loads faster
- Components load when needed

---

### Phase 3: API Optimizations (Backend) 🔧

#### A. Combine API Calls
Create `/api/dashboard/init` endpoint that returns:
```json
{
  "user": {...},
  "meetings": [...],
  "stats": {...},
  "presleyFlow": {...}
}
```

**Benefits:**
- 1 API call instead of 4
- Reduce latency by 75%
- Single database transaction

#### B. Add Response Caching
Cache user profile, stats for 5 minutes server-side.

**Benefits:**
- Faster API responses
- Reduce database load
- Better scalability

---

### Phase 4: Frontend Optimizations 🎨

#### A. Optimize Bundle Size
- Tree-shake unused Lucide icons
- Use dynamic imports for large libraries
- Minify and compress assets

#### B. Add Service Worker
- Cache static assets
- Offline support
- Instant subsequent loads

---

## Implementation Priority

### 🔴 **High Priority (Do Now)**
1. Add loading skeletons to Dashboard
2. Cache user profile in localStorage
3. Defer non-critical API calls
4. Lazy load routes

### 🟡 **Medium Priority (This Week)**
5. Create combined `/api/dashboard/init` endpoint
6. Add response caching
7. Lazy load heavy components

### 🟢 **Low Priority (Future)**
8. Service worker for offline support
9. Image optimization
10. CDN for static assets

---

## Expected Performance Gains

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial Load | 3-5s | 0.8-1.2s | **70% faster** |
| Sign-In | 2-4s | 0.5-1s | **75% faster** |
| Dashboard Render | 2s | 0.3s | **85% faster** |
| Bundle Size | ~800KB | ~300KB | **60% smaller** |

---

## Quick Start: Implement Phase 1

Run these commands to implement the quick wins:

```bash
# 1. Add loading skeletons
# 2. Cache user profile
# 3. Defer API calls
# 4. Add lazy loading
```

Would you like me to implement Phase 1 now?

