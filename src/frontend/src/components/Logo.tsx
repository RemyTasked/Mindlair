interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'full' | 'icon' | 'text';
}

const sizeConfig = {
  xs: { icon: 'w-7 h-7', text: 'text-base', gap: 'gap-1.5' },
  sm: { icon: 'w-9 h-9', text: 'text-xl', gap: 'gap-2' },
  md: { icon: 'w-11 h-11', text: 'text-2xl', gap: 'gap-2' },
  lg: { icon: 'w-16 h-16', text: 'text-4xl', gap: 'gap-2.5' },
  xl: { icon: 'w-20 h-20', text: 'text-5xl', gap: 'gap-3' },
};

// Mind Garden brand colors - emerald/teal gradient (shared)
const gradientStyle = {
  background: 'linear-gradient(135deg, #059669 0%, #14b8a6 100%)',
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
