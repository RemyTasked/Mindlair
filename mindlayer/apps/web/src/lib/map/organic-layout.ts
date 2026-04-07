import { MapCategory, MergedMapNode } from '../services/belief-graph';

export interface OrganicPosition {
  x: number;
  y: number;
  radius: number;
  category: MapCategory;
}

const CATEGORY_ZONES: Record<MapCategory, { row: number; col: number }> = {
  philosophy: { row: 0, col: 0 },
  psychology: { row: 0, col: 1 },
  health: { row: 0, col: 2 },
  economics: { row: 1, col: 0 },
  general: { row: 1, col: 1 },
  sports: { row: 1, col: 2 },
  technology: { row: 2, col: 0 },
  culture: { row: 2, col: 1 },
  productivity: { row: 2, col: 2 },
};

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Compute organic, scattered planet positions grouped by category zones.
 * Planets are sized based on engagement (totalPositionCount).
 */
export function computeOrganicLayout(
  nodes: MergedMapNode[],
  width: number,
  height: number
): Record<string, OrganicPosition> {
  const out: Record<string, OrganicPosition> = {};
  
  if (nodes.length === 0) return out;
  
  const padding = Math.min(width, height) * 0.08;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  
  const zoneWidth = usableWidth / 3;
  const zoneHeight = usableHeight / 3;
  
  const maxPositionCount = Math.max(...nodes.map(n => n.totalPositionCount), 1);
  const minRadius = Math.min(width, height) * 0.025;
  const maxRadius = Math.min(width, height) * 0.08;
  
  const nodesByCategory = new Map<MapCategory, MergedMapNode[]>();
  for (const node of nodes) {
    const existing = nodesByCategory.get(node.category) || [];
    existing.push(node);
    nodesByCategory.set(node.category, existing);
  }
  
  const placements: Array<{ x: number; y: number; r: number }> = [];
  
  function doesOverlap(x: number, y: number, r: number): boolean {
    for (const p of placements) {
      const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
      if (dist < r + p.r + 4) return true;
    }
    return false;
  }
  
  for (const [category, categoryNodes] of nodesByCategory) {
    const zone = CATEGORY_ZONES[category];
    const zoneLeft = padding + zone.col * zoneWidth;
    const zoneTop = padding + zone.row * zoneHeight;
    const zoneCenterX = zoneLeft + zoneWidth / 2;
    const zoneCenterY = zoneTop + zoneHeight / 2;
    
    categoryNodes.sort((a, b) => b.totalPositionCount - a.totalPositionCount);
    
    for (const node of categoryNodes) {
      const engagementRatio = node.totalPositionCount / maxPositionCount;
      const radius = minRadius + (maxRadius - minRadius) * Math.sqrt(engagementRatio);
      
      const rand = seededRandom(hashString(node.id));
      
      let bestX = zoneCenterX;
      let bestY = zoneCenterY;
      let placed = false;
      
      const maxAttempts = 50;
      const spreadX = (zoneWidth - radius * 2) / 2;
      const spreadY = (zoneHeight - radius * 2) / 2;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const angle = rand() * Math.PI * 2;
        const distance = rand() * Math.min(spreadX, spreadY) * (0.3 + attempt * 0.02);
        
        const x = zoneCenterX + Math.cos(angle) * distance;
        const y = zoneCenterY + Math.sin(angle) * distance;
        
        const clampedX = Math.max(zoneLeft + radius, Math.min(zoneLeft + zoneWidth - radius, x));
        const clampedY = Math.max(zoneTop + radius, Math.min(zoneTop + zoneHeight - radius, y));
        
        if (!doesOverlap(clampedX, clampedY, radius)) {
          bestX = clampedX;
          bestY = clampedY;
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        for (let attempt = 0; attempt < 20; attempt++) {
          const angle = (attempt / 20) * Math.PI * 2;
          const distance = (spreadX + spreadY) / 2 * (0.5 + attempt * 0.03);
          const x = zoneCenterX + Math.cos(angle) * distance;
          const y = zoneCenterY + Math.sin(angle) * distance;
          
          const clampedX = Math.max(padding + radius, Math.min(width - padding - radius, x));
          const clampedY = Math.max(padding + radius, Math.min(height - padding - radius, y));
          
          if (!doesOverlap(clampedX, clampedY, radius)) {
            bestX = clampedX;
            bestY = clampedY;
            break;
          }
        }
      }
      
      const jitterX = (rand() - 0.5) * 6;
      const jitterY = (rand() - 0.5) * 6;
      bestX += jitterX;
      bestY += jitterY;
      
      placements.push({ x: bestX, y: bestY, r: radius });
      
      out[node.id] = {
        x: bestX,
        y: bestY,
        radius,
        category: node.category,
      };
    }
  }
  
  return out;
}

export const CATEGORY_COLORS: Record<MapCategory, string> = {
  technology: '#3b82f6',
  psychology: '#a855f7',
  economics: '#22c55e',
  health: '#ef4444',
  philosophy: '#8b5cf6',
  culture: '#f97316',
  productivity: '#eab308',
  sports: '#06b6d4',
  general: '#6b7280',
};

export const CATEGORY_LABELS: Record<MapCategory, string> = {
  technology: 'Technology',
  psychology: 'Psychology',
  economics: 'Economics',
  health: 'Health',
  philosophy: 'Philosophy',
  culture: 'Culture',
  productivity: 'Productivity',
  sports: 'Sports',
  general: 'General',
};

export function getCategoryZoneBounds(
  category: MapCategory,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } {
  const padding = Math.min(width, height) * 0.08;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const zoneWidth = usableWidth / 3;
  const zoneHeight = usableHeight / 3;
  
  const zone = CATEGORY_ZONES[category];
  return {
    x: padding + zone.col * zoneWidth,
    y: padding + zone.row * zoneHeight,
    width: zoneWidth,
    height: zoneHeight,
  };
}
