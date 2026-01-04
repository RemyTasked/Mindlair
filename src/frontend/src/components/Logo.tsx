import { useId } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-6xl',
};

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClass = sizeClasses[size];
  const gradientId = useId();
  
  // Mind Garden brand colors - emerald/teal gradient
  const gradientStyle = {
    background: 'linear-gradient(to right, #059669, #14b8a6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Garden leaf/sprout icon */}
      <svg 
        className={`${size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-14 h-14'}`}
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
        {/* Main leaf */}
        <path 
          d="M16 4C16 4 8 8 8 16C8 20 10 24 16 28C22 24 24 20 24 16C24 8 16 4 16 4Z" 
          fill={`url(#${gradientId}-leaf)`}
        />
        {/* Leaf vein */}
        <path 
          d="M16 8V24" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeLinecap="round"
          opacity="0.6"
        />
        <path 
          d="M16 12L12 16M16 16L20 20" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
      
      <span 
        className={`${sizeClass} font-bold tracking-tight`}
        style={{
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        <span style={gradientStyle}>Mind</span>
        <span style={{ ...gradientStyle, marginLeft: '0.15em' }}>Garden</span>
      </span>
    </div>
  );
}
