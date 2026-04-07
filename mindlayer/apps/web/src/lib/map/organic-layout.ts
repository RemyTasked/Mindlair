import { MergedMapNode, UserCategory, categoryColor } from '../services/belief-graph';

export interface OrganicPosition {
  x: number;
  y: number;
  radius: number;
  category: string;
}

export interface ZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

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
 * Compute dynamic zone allocation based on user categories.
 * Categories with more engagement get larger zones.
 * Uses a treemap-style allocation for variable-sized regions.
 */
export function computeDynamicZones(
  categories: UserCategory[],
  width: number,
  height: number
): Map<string, ZoneBounds> {
  const zones = new Map<string, ZoneBounds>();
  
  if (categories.length === 0) {
    return zones;
  }
  
  const padding = Math.min(width, height) * 0.06;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  
  const sorted = [...categories].sort((a, b) => b.positionCount - a.positionCount);
  
  const totalPositions = Math.max(1, sorted.reduce((sum, c) => sum + c.positionCount, 0));
  
  if (sorted.length <= 4) {
    const cols = sorted.length <= 2 ? sorted.length : 2;
    const rows = Math.ceil(sorted.length / cols);
    const cellWidth = usableWidth / cols;
    const cellHeight = usableHeight / rows;
    
    sorted.forEach((cat, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = padding + col * cellWidth;
      const y = padding + row * cellHeight;
      
      zones.set(cat.name, {
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        centerX: x + cellWidth / 2,
        centerY: y + cellHeight / 2,
      });
    });
    
    return zones;
  }
  
  const gridSize = Math.ceil(Math.sqrt(sorted.length));
  const cellWidth = usableWidth / gridSize;
  const cellHeight = usableHeight / gridSize;
  
  const centerCol = (gridSize - 1) / 2;
  const centerRow = (gridSize - 1) / 2;
  
  const cells: { row: number; col: number; distFromCenter: number }[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const dist = Math.sqrt((row - centerRow) ** 2 + (col - centerCol) ** 2);
      cells.push({ row, col, distFromCenter: dist });
    }
  }
  
  cells.sort((a, b) => a.distFromCenter - b.distFromCenter);
  
  sorted.forEach((cat, i) => {
    if (i >= cells.length) return;
    
    const cell = cells[i];
    const weight = cat.positionCount / totalPositions;
    const sizeBoost = 0.8 + weight * 0.4;
    
    const adjustedWidth = cellWidth * Math.min(1.2, sizeBoost);
    const adjustedHeight = cellHeight * Math.min(1.2, sizeBoost);
    
    const x = padding + cell.col * cellWidth + (cellWidth - adjustedWidth) / 2;
    const y = padding + cell.row * cellHeight + (cellHeight - adjustedHeight) / 2;
    
    zones.set(cat.name, {
      x,
      y,
      width: adjustedWidth,
      height: adjustedHeight,
      centerX: x + adjustedWidth / 2,
      centerY: y + adjustedHeight / 2,
    });
  });
  
  if (!zones.has('general') && sorted.length < cells.length) {
    const lastCell = cells[sorted.length];
    const x = padding + lastCell.col * cellWidth;
    const y = padding + lastCell.row * cellHeight;
    
    zones.set('general', {
      x,
      y,
      width: cellWidth,
      height: cellHeight,
      centerX: x + cellWidth / 2,
      centerY: y + cellHeight / 2,
    });
  }
  
  return zones;
}

/**
 * Compute organic, scattered planet positions grouped by dynamic category zones.
 * Planets are sized based on engagement (totalPositionCount).
 */
export function computeOrganicLayout(
  nodes: MergedMapNode[],
  categories: UserCategory[],
  width: number,
  height: number
): Record<string, OrganicPosition> {
  const out: Record<string, OrganicPosition> = {};
  
  if (nodes.length === 0) return out;
  
  const zones = computeDynamicZones(categories, width, height);
  
  const padding = Math.min(width, height) * 0.06;
  
  const maxPositionCount = Math.max(...nodes.map(n => n.totalPositionCount), 1);
  const minRadius = Math.min(width, height) * 0.022;
  const maxRadius = Math.min(width, height) * 0.07;
  
  const nodesByCategory = new Map<string, MergedMapNode[]>();
  for (const node of nodes) {
    const existing = nodesByCategory.get(node.category) || [];
    existing.push(node);
    nodesByCategory.set(node.category, existing);
  }
  
  const placements: Array<{ x: number; y: number; r: number }> = [];
  
  function doesOverlap(x: number, y: number, r: number): boolean {
    for (const p of placements) {
      const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
      if (dist < r + p.r + 3) return true;
    }
    return false;
  }
  
  for (const [category, categoryNodes] of nodesByCategory) {
    let zone = zones.get(category);
    
    if (!zone) {
      zone = zones.get('general');
    }
    
    if (!zone) {
      const fallbackCat = categories[0];
      if (fallbackCat) {
        zone = zones.get(fallbackCat.name);
      }
    }
    
    if (!zone) {
      zone = {
        x: padding,
        y: padding,
        width: width - padding * 2,
        height: height - padding * 2,
        centerX: width / 2,
        centerY: height / 2,
      };
    }
    
    const zoneCenterX = zone.centerX;
    const zoneCenterY = zone.centerY;
    const zoneWidth = zone.width;
    const zoneHeight = zone.height;
    const zoneLeft = zone.x;
    const zoneTop = zone.y;
    
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
        const distance = rand() * Math.min(spreadX, spreadY) * (0.3 + attempt * 0.015);
        
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
          const distance = (spreadX + spreadY) / 2 * (0.5 + attempt * 0.025);
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
      
      const jitterX = (rand() - 0.5) * 5;
      const jitterY = (rand() - 0.5) * 5;
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

export function getCategoryZoneBounds(
  categoryName: string,
  categories: UserCategory[],
  width: number,
  height: number
): ZoneBounds | null {
  const zones = computeDynamicZones(categories, width, height);
  return zones.get(categoryName) || null;
}

export { categoryColor };

export function formatCategoryLabel(name: string): string {
  return name
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
