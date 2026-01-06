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

  const IconImage = () => (
    <img 
      src="/icon-new.png" 
      alt="Mind Garden Icon" 
      className={config.icon}
      style={{ objectFit: 'contain' }}
    />
  );

  const LogoImage = () => (
    <img 
      src="/logo-new.png" 
      alt="Mind Garden Logo" 
      className={config.icon.replace('w-', 'w-auto h-').replace('h-', 'h-')}
      style={{ maxHeight: '100%', objectFit: 'contain' }}
    />
  );

  if (variant === 'icon') {
    return (
      <div className={className}>
        <IconImage />
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
      <IconImage />
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
