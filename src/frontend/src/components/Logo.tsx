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
  
  const gradientStyle = {
    background: 'linear-gradient(to right, #4f46e5, #14b8a6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <span 
        className={`${sizeClass} font-bold tracking-tight relative`}
        style={{
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        {/* All letters explicitly rendered - M, e, e, t, C, u, t, e */}
        <span style={gradientStyle}>M</span>
        <span style={gradientStyle}>e</span>
        <span style={gradientStyle}>e</span>
        <span className="relative inline-block">
          <span style={gradientStyle}>t</span>
          {/* Artistic flowing connection from 't' to 'C' - decorative line connecting the two words */}
          <svg 
            className="absolute left-full top-1/2 -translate-y-1/2 pointer-events-none"
            width="10" 
            height="6" 
            viewBox="0 0 10 6" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transform: 'translateY(-50%) translateX(2px)',
            }}
          >
            <path 
              d="M 0 3 Q 3 1, 5 2 T 10 3" 
              stroke={`url(#${gradientId})`}
              strokeWidth="1.5" 
              strokeLinecap="round"
              fill="none"
            />
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
          </svg>
        </span>
        <span className="relative inline-block" style={{ marginLeft: '0.3em' }}>
          <span style={gradientStyle}>C</span>
        </span>
        <span style={gradientStyle}>u</span>
        <span style={gradientStyle}>t</span>
        <span style={gradientStyle}>e</span>
      </span>
    </div>
  );
}

