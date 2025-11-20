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
  
  return (
    <div className={`inline-flex items-center ${className}`}>
      <span 
        className={`${sizeClass} font-bold bg-gradient-to-r from-indigo-600 to-teal-600 bg-clip-text text-transparent tracking-tight relative`}
        style={{
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        <span className="inline-block">Mee</span>
        <span className="inline-block relative">
          <span className="inline-block">t</span>
          {/* Artistic flowing connection from 't' to 'C' - subtle curved line between letters */}
          <svg 
            className="absolute left-full top-1/2 -translate-y-1/2 pointer-events-none"
            width="8" 
            height="5" 
            viewBox="0 0 8 5" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transform: 'translateY(-50%) translateX(2px)',
            }}
          >
            <path 
              d="M 0 2.5 Q 2 1, 4 1.5 T 8 2.5" 
              stroke={`url(#${gradientId})`}
              strokeWidth="1.2" 
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
          </svg>
        </span>
        <span className="inline-block relative" style={{ marginLeft: '0.2em' }}>
          <span className="inline-block">C</span>
        </span>
        <span className="inline-block">ute</span>
      </span>
    </div>
  );
}

