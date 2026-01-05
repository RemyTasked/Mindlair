import { useId } from 'react';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'full' | 'icon' | 'text';
}

const sizeConfig = {
  xs: { icon: 'w-5 h-5', text: 'text-sm', gap: 'gap-1.5' },
  sm: { icon: 'w-6 h-6', text: 'text-lg', gap: 'gap-2' },
  md: { icon: 'w-8 h-8', text: 'text-2xl', gap: 'gap-2' },
  lg: { icon: 'w-12 h-12', text: 'text-4xl', gap: 'gap-3' },
  xl: { icon: 'w-16 h-16', text: 'text-6xl', gap: 'gap-4' },
};

export default function Logo({ 
  className = '', 
  size = 'md', 
  showText = true,
  variant = 'full',
}: LogoProps) {
  const config = sizeConfig[size];
  const gradientId = useId();
  
  // Mind Garden brand colors - emerald/teal gradient
  const gradientStyle = {
    background: 'linear-gradient(135deg, #059669 0%, #14b8a6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  const IconSVG = () => (
    <svg 
      className={config.icon}
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${gradientId}-leaf`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      
      {/* Main sprout/plant icon */}
      <g transform="translate(16, 17)">
        {/* Stem */}
        <path 
          d="M0 7 Q-1 4, 0 0 Q1 -4, 0 -7" 
          stroke={`url(#${gradientId}-leaf)`}
          strokeWidth="2" 
          strokeLinecap="round" 
          fill="none"
        />
        
        {/* Left leaf */}
        <path 
          d="M-1 1 Q-8 -2, -10 -7 Q-8 -5, -5 -5 Q-2 -5, -1 1" 
          fill={`url(#${gradientId}-leaf)`}
        />
        
        {/* Right leaf */}
        <path 
          d="M1 1 Q8 -2, 10 -7 Q8 -5, 5 -5 Q2 -5, 1 1" 
          fill={`url(#${gradientId}-leaf)`}
        />
        
        {/* Center growing tip */}
        <path 
          d="M0 -4 Q-3 -7, -2 -11 Q0 -9, 0 -4 Q0 -9, 2 -11 Q3 -7, 0 -4" 
          fill={`url(#${gradientId}-leaf)`}
        />
        
        {/* Pot */}
        <path 
          d="M-4 7 L-3 11 Q0 12, 3 11 L4 7 Z" 
          fill={`url(#${gradientId}-leaf)`}
          opacity="0.85"
        />
        <rect x="-4.5" y="6" width="9" height="1.5" rx="0.5" fill={`url(#${gradientId}-leaf)`} opacity="0.85"/>
      </g>
    </svg>
  );

  const TextLogo = () => (
    <span 
      className={`${config.text} font-bold tracking-tight`}
      style={{
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}
    >
      <span style={gradientStyle}>Mind</span>
      <span style={{ ...gradientStyle, marginLeft: '0.1em' }}>Garden</span>
    </span>
  );

  if (variant === 'icon') {
    return (
      <div className={className}>
        <IconSVG />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={className}>
        <TextLogo />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${config.gap} ${className}`}>
      <IconSVG />
      {showText && <TextLogo />}
    </div>
  );
}

// Export the icon as a standalone component for use in headers/navs
export function MindGardenIcon({ 
  className = '',
  size = 24,
}: { 
  className?: string; 
  size?: number;
}) {
  const gradientId = useId();
  
  return (
    <svg 
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${gradientId}-leaf`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      
      <g transform="translate(16, 17)">
        <path 
          d="M0 7 Q-1 4, 0 0 Q1 -4, 0 -7" 
          stroke={`url(#${gradientId}-leaf)`}
          strokeWidth="2" 
          strokeLinecap="round" 
          fill="none"
        />
        <path 
          d="M-1 1 Q-8 -2, -10 -7 Q-8 -5, -5 -5 Q-2 -5, -1 1" 
          fill={`url(#${gradientId}-leaf)`}
        />
        <path 
          d="M1 1 Q8 -2, 10 -7 Q8 -5, 5 -5 Q2 -5, 1 1" 
          fill={`url(#${gradientId}-leaf)`}
        />
        <path 
          d="M0 -4 Q-3 -7, -2 -11 Q0 -9, 0 -4 Q0 -9, 2 -11 Q3 -7, 0 -4" 
          fill={`url(#${gradientId}-leaf)`}
        />
        <path 
          d="M-4 7 L-3 11 Q0 12, 3 11 L4 7 Z" 
          fill={`url(#${gradientId}-leaf)`}
          opacity="0.85"
        />
        <rect x="-4.5" y="6" width="9" height="1.5" rx="0.5" fill={`url(#${gradientId}-leaf)`} opacity="0.85"/>
      </g>
    </svg>
  );
}
