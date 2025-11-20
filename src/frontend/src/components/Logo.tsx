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
          {/* Artistic flowing connection from 't' to 'C' */}
          <svg 
            className="absolute left-full top-1/2 -translate-y-1/2"
            width="14" 
            height="10" 
            viewBox="0 0 14 10" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transform: 'translateY(-50%) translateX(-1px)',
            }}
          >
            <path 
              d="M 0 5 Q 4 2, 7 3 T 14 5" 
              stroke={`url(#${gradientId})`}
              strokeWidth="1.8" 
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
        <span className="inline-block relative ml-3">
          <span className="inline-block">C</span>
        </span>
        <span className="inline-block">ute</span>
      </span>
    </div>
  );
}

