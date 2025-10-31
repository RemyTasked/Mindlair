import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  startTime: Date;
  className?: string;
}

export default function CountdownTimer({ startTime, className = '' }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = startTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Meeting time!');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg ${className}`}
    >
      <Clock className="w-5 h-5" />
      <span className="font-mono text-xl font-semibold">{timeRemaining}</span>
    </motion.div>
  );
}

