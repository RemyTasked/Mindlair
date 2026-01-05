/**
 * Garden Components - One Plant System
 * 
 * Export all garden-related components for the one-plant growth system.
 */

// Core display components
export { default as OneGardenDisplay } from './OneGardenDisplay';
export { default as OnePlantSVG } from './OnePlantSVG';
export { default as PlantSelector } from './PlantSelector';
export { default as MaturityCelebration } from './MaturityCelebration';
export { default as MilestoneToast } from './MilestoneToast';
export { default as GardenOnboarding } from './GardenOnboarding';

// Types
export type { PlantType, GrowthStage } from './OnePlantSVG';
export type { MilestoneNotification } from './MilestoneToast';
export { PLANT_CONFIGS, calculateVisuals } from './OnePlantSVG';
export { useMaturityCelebration } from './MaturityCelebration';
export { useMilestoneToast } from './MilestoneToast';

// Legacy exports (for backward compatibility during transition)
export { default as GardenCanvas } from './GardenCanvas';
export { default as DashboardLayout } from './DashboardLayout';

