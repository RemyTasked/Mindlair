interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showText?: boolean;
  variant?: 'full' | 'icon' | 'text';
}

const sizeConfig = {
  xs: { icon: 'w-8 h-8', text: 'text-lg', gap: 'gap-2' },
  sm: { icon: 'w-10 h-10', text: 'text-xl', gap: 'gap-2' },
  md: { icon: 'w-12 h-12', text: 'text-2xl', gap: 'gap-2.5' },
  lg: { icon: 'w-16 h-16', text: 'text-3xl', gap: 'gap-3' },
  xl: { icon: 'w-20 h-20', text: 'text-4xl', gap: 'gap-3' },
  '2xl': { icon: 'w-24 h-24', text: 'text-5xl', gap: 'gap-4' },
  '3xl': { icon: 'w-32 h-32', text: 'text-6xl', gap: 'gap-4' },
  '4xl': { icon: 'w-40 h-40', text: 'text-7xl', gap: 'gap-5' },
  '5xl': { icon: 'w-48 h-48', text: 'text-8xl', gap: 'gap-6' },
};

// Mind Garden brand colors - matches logo gradient (blue → cyan → green)
const gradientStyle = {
  background: 'linear-gradient(90deg, #38bdf8 0%, #2dd4bf 50%, #4ade80 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} as const;

export default function Logo({ 
  className = '', 
  size = 'md', 
  showText = true,
  variant = 'full',
}: LogoProps) {
  const config = sizeConfig[size];

  if (variant === 'icon') {
    return (
      <div className={className}>
        <img 
          src="/icon-new.png" 
          alt="Mind Garden Icon" 
          className={config.icon}
          style={{ objectFit: 'contain' }}
        />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={className}>
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
      </div>
    );
  }

  // Full variant: icon + text
  return (
    <div className={`inline-flex items-center ${config.gap} ${className}`}>
      <img 
        src="/icon-new.png" 
        alt="Mind Garden Icon" 
        className={config.icon}
        style={{ objectFit: 'contain' }}
      />
      {showText && (
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
      )}
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
  return (
    <img 
      src="/icon-new.png" 
      alt="Mind Garden" 
      className={className}
      width={size}
      height={size}
      style={{ objectFit: 'contain' }}
    />
  );
}
