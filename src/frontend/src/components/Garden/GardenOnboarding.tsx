/**
 * Mind Garden - Comprehensive Onboarding Flow
 * 
 * Guides new users through:
 * 1. Welcome & app explanation
 * 2. How plant growth works (leaves, stems, flowers)
 * 3. Plant type selection with detailed descriptions
 * 4. Notification preferences
 * 5. PWA install prompt
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  Bell, 
  Download, 
  Check, 
  Leaf,
  Flower2,
  Sparkles,
  Target,
  Calendar,
  Clock,
  Heart,
  Share,
  Gift,
} from 'lucide-react';
import OnePlantSVG, { PlantType } from './OnePlantSVG';
import { pushNotificationService } from '../../services/pushNotificationService';
import api from '../../lib/axios';

interface GardenOnboardingProps {
  onComplete: (plantType: PlantType | null) => void;  // null if user already has a plant
  onSkip?: () => void;
  existingPlantType?: PlantType;  // If user already has a plant, skip selection
  hasExistingGarden?: boolean;    // Whether user has any plants
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Detailed plant type descriptions
const PLANT_DETAILS: Record<string, {
  type: PlantType;
  name: string;
  tagline: string;
  description: string;
  personality: string;
  growthStyle: string;
  flowerDescription: string;
  bestFor: string[];
  isPremium: boolean;
  emoji: string;
}> = {
  classic: {
    type: 'classic',
    name: 'Classic Houseplant',
    tagline: 'The Friendly Companion',
    description: 'A warm, welcoming plant with rounded leaves that grows steadily and reliably. Perfect for beginners starting their mindfulness journey.',
    personality: 'Reliable, friendly, and approachable. Like a trusted friend who\'s always there for you.',
    growthStyle: 'Balanced growth with elegant oval leaves that unfurl gracefully. Blooms delicate pink flowers at maturity.',
    flowerDescription: 'Soft pink blossoms with golden centers',
    bestFor: ['First-time gardeners', 'Those seeking consistency', 'Building daily habits'],
    isPremium: false,
    emoji: '🪴',
  },
  succulent: {
    type: 'succulent',
    name: 'Succulent',
    tagline: 'The Resilient One',
    description: 'A hardy, patient plant with thick clustered leaves. Thrives even when you miss a day, representing resilience and self-compassion.',
    personality: 'Patient, steady, and forgiving. Reminds you that growth happens at your own pace.',
    growthStyle: 'Compact rosette growth with plump, water-storing leaves. Produces cheerful yellow flowers.',
    flowerDescription: 'Bright yellow star-shaped blooms',
    bestFor: ['Busy schedules', 'Building resilience', 'Self-compassion practice'],
    isPremium: false,
    emoji: '🌵',
  },
  flowering: {
    type: 'flowering',
    name: 'Flowering Plant',
    tagline: 'The Celebrator',
    description: 'A vibrant, joyful plant with pointed leaves that celebrates every milestone. Its brilliant flowers reward your dedication.',
    personality: 'Vibrant, joyful, and celebratory. Turns each practice into a colorful celebration.',
    growthStyle: 'Upward-reaching leaves with dramatic flair. Blooms stunning magenta flowers.',
    flowerDescription: 'Vivid magenta blooms with deep rose centers',
    bestFor: ['Visual motivation', 'Celebrating wins', 'Those who love color'],
    isPremium: false,
    emoji: '🌸',
  },
  fern: {
    type: 'fern',
    name: 'Fern',
    tagline: 'The Abundant',
    description: 'A lush, tropical plant with delicate fronds that multiply beautifully. Represents abundance and natural flow.',
    personality: 'Lush, tropical, and abundant. Embodies the richness of consistent practice.',
    growthStyle: 'Cascading fronds that unfurl in elegant spirals. A non-flowering plant focused on foliage.',
    flowerDescription: 'Ferns focus on beautiful foliage rather than flowers',
    bestFor: ['Embracing abundance', 'Peaceful aesthetics', 'Nature lovers'],
    isPremium: true,
    emoji: '🌿',
  },
  bonsai: {
    type: 'bonsai',
    name: 'Bonsai',
    tagline: 'The Zen Master',
    description: 'A miniature tree that embodies patience and meditation. Each action shapes its artistic form over time.',
    personality: 'Zen, patient, and meditative. A living art piece that rewards mindful attention.',
    growthStyle: 'Compact tree form with carefully placed branches. Produces delicate cherry-blossom style flowers.',
    flowerDescription: 'Soft pink cherry-blossom petals',
    bestFor: ['Deep meditation practice', 'Patience building', 'Artistic souls'],
    isPremium: true,
    emoji: '🌳',
  },
  monstera: {
    type: 'monstera',
    name: 'Monstera',
    tagline: 'The Bold Statement',
    description: 'A modern, striking plant with iconic split leaves. Makes a bold statement about your commitment to growth.',
    personality: 'Bold, modern, and stylish. For those who want their growth to be noticed.',
    growthStyle: 'Large, dramatic leaves with signature splits that deepen with maturity. A foliage-focused plant.',
    flowerDescription: 'Monstera focuses on its iconic split leaves',
    bestFor: ['Making a statement', 'Modern aesthetics', 'Bold personalities'],
    isPremium: true,
    emoji: '🍃',
  },
  bamboo: {
    type: 'bamboo',
    name: 'Bamboo',
    tagline: 'The Strong & Flexible',
    description: 'A tall, resilient plant that bends but never breaks. Symbolizes strength through flexibility.',
    personality: 'Strong, flexible, and determined. Grows quickly and stands tall.',
    growthStyle: 'Vertical segmented stems with graceful leaves at nodes. A non-flowering plant.',
    flowerDescription: 'Bamboo is prized for its elegant stems and leaves',
    bestFor: ['Building strength', 'Flexibility in life', 'Quick visible progress'],
    isPremium: true,
    emoji: '🎋',
  },
  orchid: {
    type: 'orchid',
    name: 'Orchid',
    tagline: 'The Elegant Beauty',
    description: 'An exquisite, graceful plant with stunning blooms. Represents refined beauty and dedicated care.',
    personality: 'Elegant, graceful, and refined. A symbol of dedicated attention to well-being.',
    growthStyle: 'Elegant curved stems with broad leaves. Produces spectacular orchid blooms.',
    flowerDescription: 'Gorgeous purple and pink orchid flowers',
    bestFor: ['Appreciating beauty', 'Dedicated practice', 'Refined aesthetics'],
    isPremium: true,
    emoji: '🌺',
  },
  ivy: {
    type: 'ivy',
    name: 'Ivy',
    tagline: 'The Persistent Climber',
    description: 'A trailing vine that grows and spreads continuously. Represents persistent growth and expansion.',
    personality: 'Persistent, spreading, and adaptive. Grows in any direction you need.',
    growthStyle: 'Trailing vines with heart-shaped leaves. Produces small white flower clusters.',
    flowerDescription: 'Delicate clusters of tiny white flowers',
    bestFor: ['Continuous growth', 'Expanding practice', 'Adaptive journeys'],
    isPremium: true,
    emoji: '🌱',
  },
};

export default function GardenOnboarding({ 
  onComplete, 
  onSkip,
  existingPlantType,
  hasExistingGarden = false,
}: GardenOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(existingPlantType || null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if user has a pending referral gift
  const hasReferralGift = localStorage.getItem('mindgarden_has_referral_gift') === 'true';

  // Adjust steps based on whether user already has a plant
  // If they have a plant, skip plant selection step (4 steps instead of 5)
  const totalSteps = hasExistingGarden ? 4 : 5;

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Check if already installed as PWA
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode || isIOSStandalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        const token = localStorage.getItem('mindgarden_token') || localStorage.getItem('meetcute_token');
        if (token) {
          await pushNotificationService.subscribe(token);
        }
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleComplete = async () => {
    console.log('🌱 handleComplete called', { hasExistingGarden, selectedPlant });
    
    // For new users without a plant selected, don't proceed
    // (but this shouldn't happen since canProceed blocks them)
    if (!hasExistingGarden && !selectedPlant) {
      console.warn('⚠️ New user tried to complete without selecting plant');
      // Force them back to plant selection
      setCurrentStep(2);
      return;
    }
    
    setIsLoading(true);
    try {
      // Only call API to select seed if user doesn't have a garden yet
      if (!hasExistingGarden && selectedPlant) {
        localStorage.setItem('mindgarden_first_plant', selectedPlant);
        await api.post('/api/garden/select-seed', { plantType: selectedPlant });
      }
      
      console.log('✅ Calling onComplete with:', selectedPlant);
      onComplete(selectedPlant);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still proceed even if API fails - user should not be stuck
      console.log('⚠️ Error occurred but still completing onboarding');
      onComplete(selectedPlant);
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    // For existing users, skip plant selection validation
    if (hasExistingGarden) return true;
    // For new users, require plant selection on step 2
    if (currentStep === 2) return selectedPlant !== null;
    return true;
  };

  // Step 1: Welcome
  const WelcomeStep = () => (
    <div className="text-center space-y-8 px-4">
      {/* Referral Gift Banner */}
      {hasReferralGift && !hasExistingGarden && (
        <div className="max-w-md mx-auto bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-center gap-3">
            <Gift className="w-8 h-8 text-amber-600" />
            <div className="text-left">
              <p className="font-bold text-amber-800">Seedling Gift Received! 🎁</p>
              <p className="text-sm text-amber-700">
                Complete your first flow to unlock <span className="font-semibold">+2 bonus leaves</span>!
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/30 to-teal-500/30 blur-3xl rounded-full scale-150" />
        <div className="relative">
          <OnePlantSVG 
            plantType="classic" 
            actionsCount={25} 
            size={180} 
            animated={false}
            showPot={true}
          />
        </div>
      </div>

      <div className="space-y-4 max-w-lg mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
          Welcome to Mind Garden
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Transform your mental wellness into a beautiful garden. Each mindful moment helps your plant grow.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto pt-4">
        <div className="text-center p-3 rounded-xl bg-teal-50">
          <Leaf className="w-8 h-8 mx-auto text-teal-600 mb-2" />
          <p className="text-sm text-teal-700 font-medium">Grow Leaves</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-pink-50">
          <Flower2 className="w-8 h-8 mx-auto text-pink-500 mb-2" />
          <p className="text-sm text-pink-700 font-medium">Bloom Flowers</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-amber-50">
          <Sparkles className="w-8 h-8 mx-auto text-amber-500 mb-2" />
          <p className="text-sm text-amber-700 font-medium">Celebrate Growth</p>
        </div>
      </div>
    </div>
  );

  // Step 2: How It Works
  const HowItWorksStep = () => (
    <div className="space-y-6 px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">How Your Garden Grows</h2>
        <p className="text-gray-600">Every mindful action nurtures your plant</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {/* Growth Stages */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-teal-100">
          <h3 className="font-bold text-teal-700 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Growth Stages
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-xl">🌰</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Seed → Seedling</p>
                <p className="text-sm text-gray-500">0-10 actions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center">
                <span className="text-xl">🌱</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Growing</p>
                <p className="text-sm text-gray-500">11-20 actions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                <span className="text-xl">🌸</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Maturing</p>
                <p className="text-sm text-gray-500">21-30 actions, flowers bloom!</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <span className="text-xl">🌺</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Mature</p>
                <p className="text-sm text-gray-500">30+ actions, fully grown!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions That Grow */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-teal-100">
          <h3 className="font-bold text-teal-700 mb-4 flex items-center gap-2">
            <Leaf className="w-5 h-5" />
            Actions That Grow Your Plant
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-sky-50">
              <span className="text-xl">🧘</span>
              <div>
                <p className="font-medium text-gray-800">Complete a Flow</p>
                <p className="text-xs text-teal-600">+1 leaf 🍃</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50">
              <span className="text-xl">🎮</span>
              <div>
                <p className="font-medium text-gray-800">Play a Wellness Game</p>
                <p className="text-xs text-teal-600">+1 leaf 🍃</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-rose-50">
              <span className="text-xl">💭</span>
              <div>
                <p className="font-medium text-gray-800">Daily Check-In</p>
                <p className="text-xs text-teal-600">+1 leaf 🍃</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-50">
              <span className="text-xl">🎵</span>
              <div>
                <p className="font-medium text-gray-800">Focus Room Session</p>
                <p className="text-xs text-teal-600">+1 leaf 🍃</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Growth Demo */}
      <div className="max-w-md mx-auto pt-4">
        <div className="bg-gradient-to-r from-teal-50 to-teal-50 rounded-2xl p-4 border border-teal-200">
          <p className="text-sm text-teal-700 text-center mb-3">
            🌱 Watch your plant grow with each action!
          </p>
          <div className="flex justify-center items-end gap-2">
            <div className="text-center">
              <OnePlantSVG plantType="classic" actionsCount={5} size={60} showPot={false} />
              <p className="text-xs text-gray-500 mt-1">5 actions</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className="text-center">
              <OnePlantSVG plantType="classic" actionsCount={15} size={70} showPot={false} />
              <p className="text-xs text-gray-500 mt-1">15 actions</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className="text-center">
              <OnePlantSVG plantType="classic" actionsCount={30} size={80} showPot={false} />
              <p className="text-xs text-gray-500 mt-1">30 actions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 3: Plant Selection
  const PlantSelectionStep = () => {
    const freePlants = ['classic', 'succulent', 'flowering'];
    const premiumPlants = ['fern', 'bonsai', 'monstera', 'bamboo', 'orchid', 'ivy'];
    const [showPlantDetail, setShowPlantDetail] = useState<string | null>(null);

    const PlantCard = ({ plantKey, locked = false }: { plantKey: string; locked?: boolean }) => {
      const plant = PLANT_DETAILS[plantKey];
      if (!plant) return null;

      const isSelected = selectedPlant === plant.type;

      return (
        <motion.button
          whileHover={{ scale: locked ? 1 : 1.02 }}
          whileTap={{ scale: locked ? 1 : 0.98 }}
          onClick={() => {
            if (!locked) {
              setSelectedPlant(plant.type);
              setShowPlantDetail(plantKey);
            }
          }}
          className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
            isSelected
              ? 'border-teal-500 bg-teal-50 shadow-lg'
              : locked
              ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
              : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-md'
          }`}
        >
          {locked && (
            <div className="absolute top-2 right-2 bg-gray-200 rounded-full p-1">
              <span className="text-xs">🔒</span>
            </div>
          )}
          {isSelected && (
            <div className="absolute top-2 right-2 bg-teal-500 rounded-full p-1">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <OnePlantSVG 
                plantType={plant.type} 
                actionsCount={20} 
                size={60} 
                showPot={true}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 flex items-center gap-1">
                <span>{plant.emoji}</span> {plant.name}
              </p>
              <p className="text-xs text-teal-600 font-medium">{plant.tagline}</p>
              <p className="text-xs text-gray-500 line-clamp-2 mt-1">{plant.personality}</p>
            </div>
          </div>
        </motion.button>
      );
    };

    return (
      <div className="space-y-6 px-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Choose Your First Plant</h2>
          <p className="text-gray-600">Each plant has a unique personality. Pick one that resonates with you!</p>
        </div>

        {/* Free Plants */}
        <div>
          <h3 className="text-sm font-semibold text-teal-700 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Starter Plants (Free)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {freePlants.map(plantKey => (
              <PlantCard key={plantKey} plantKey={plantKey} />
            ))}
          </div>
        </div>

        {/* Premium Plants Preview */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            🔒 Premium Plants (Unlock after first plant matures)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {premiumPlants.map(plantKey => (
              <PlantCard key={plantKey} plantKey={plantKey} locked />
            ))}
          </div>
        </div>

        {/* Selected Plant Detail */}
        <AnimatePresence>
          {showPlantDetail && PLANT_DETAILS[showPlantDetail] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gradient-to-br from-teal-50 to-teal-50 rounded-2xl p-5 border border-teal-200">
                <div className="flex items-start gap-4">
                  <OnePlantSVG 
                    plantType={PLANT_DETAILS[showPlantDetail].type} 
                    actionsCount={30} 
                    size={100} 
                    showPot={true}
                    animated
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-800">
                      {PLANT_DETAILS[showPlantDetail].emoji} {PLANT_DETAILS[showPlantDetail].name}
                    </h4>
                    <p className="text-sm text-teal-600 font-medium mb-2">
                      {PLANT_DETAILS[showPlantDetail].tagline}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      {PLANT_DETAILS[showPlantDetail].description}
                    </p>
                    
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        <strong className="text-gray-700">Growth:</strong> {PLANT_DETAILS[showPlantDetail].growthStyle}
                      </p>
                      <p className="text-xs text-gray-500">
                        <strong className="text-gray-700">Flowers:</strong> {PLANT_DETAILS[showPlantDetail].flowerDescription}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {PLANT_DETAILS[showPlantDetail].bestFor.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Step 4: Notifications
  const NotificationsStep = () => (
    <div className="space-y-6 px-4">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-teal-100 rounded-full flex items-center justify-center">
          <Bell className="w-10 h-10 text-teal-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Stay on Track</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Get gentle reminders to practice mindfulness. We'll nudge you before stressful meetings and help you build a daily habit.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {notificationPermission === 'granted' ? (
          <div className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl">
            <Check className="w-6 h-6 text-teal-600" />
            <span className="text-teal-800 font-medium">Notifications enabled!</span>
          </div>
        ) : notificationPermission === 'denied' ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-800 text-sm">
              Notifications are blocked. You can enable them in your browser settings.
            </p>
          </div>
        ) : (
          <button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-500 text-white rounded-xl font-bold text-lg hover:from-teal-600 hover:to-teal-600 transition-all shadow-lg disabled:opacity-50"
          >
            {isLoading ? 'Enabling...' : 'Enable Notifications'}
          </button>
        )}

        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">You'll receive:</p>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-500" />
              Pre-meeting calm reminders
            </li>
            <li className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-500" />
              Daily practice nudges
            </li>
            <li className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-teal-500" />
              Growth celebrations
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  // Step 5: Install PWA
  const InstallStep = () => (
    <div className="space-y-6 px-4">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-teal-100 rounded-full flex items-center justify-center">
          <Download className="w-10 h-10 text-teal-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Add to Your Device</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Install Mind Garden for quick access and a better experience. Works offline too!
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {isStandalone ? (
          <div className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl">
            <Check className="w-6 h-6 text-teal-600" />
            <span className="text-teal-800 font-medium">Already installed!</span>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstallPWA}
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold text-lg hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg"
          >
            <Download className="w-5 h-5 inline mr-2" />
            Install Mind Garden
          </button>
        ) : isIOS ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 font-medium mb-2">Install on iPhone/iPad:</p>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Tap the <Share className="w-4 h-4 inline" /> Share button</li>
              <li>2. Scroll and tap "Add to Home Screen"</li>
              <li>3. Tap "Add" to confirm</li>
            </ol>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-gray-700 text-sm">
              Use the browser menu to add Mind Garden to your home screen for quick access.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 pt-4">
          <div className="text-center p-3 rounded-xl bg-gray-50">
            <span className="text-2xl">⚡</span>
            <p className="text-xs text-gray-600 mt-1">Quick Launch</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-gray-50">
            <span className="text-2xl">📴</span>
            <p className="text-xs text-gray-600 mt-1">Works Offline</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-gray-50">
            <span className="text-2xl">🔔</span>
            <p className="text-xs text-gray-600 mt-1">Push Alerts</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Determine which step to render based on current step and user status
  const renderCurrentStep = () => {
    if (hasExistingGarden) {
      // Existing users: Welcome (0), HowItWorks (1), Notifications (2), Install (3)
      switch (currentStep) {
        case 0: return <WelcomeStep />;
        case 1: return <HowItWorksStep />;
        case 2: return <NotificationsStep />;
        case 3: return <InstallStep />;
        default: return <InstallStep />;
      }
    } else {
      // New users: Welcome (0), HowItWorks (1), PlantSelection (2), Notifications (3), Install (4)
      switch (currentStep) {
        case 0: return <WelcomeStep />;
        case 1: return <HowItWorksStep />;
        case 2: return <PlantSelectionStep />;
        case 3: return <NotificationsStep />;
        case 4: return <InstallStep />;
        default: return <InstallStep />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-teal-50 flex flex-col">
      {/* Progress Bar */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-teal-100 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-teal-700 font-medium">
              Step {currentStep + 1} of {totalSteps}
            </span>
            {onSkip && currentStep < totalSteps - 1 && (
              <button
                onClick={onSkip}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Skip for now
              </button>
            )}
          </div>
          <div className="h-2 bg-teal-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center py-8 overflow-y-auto">
        <div className="w-full max-w-3xl">
          {renderCurrentStep()}
        </div>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm border-t border-teal-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              currentStep === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <button
            onClick={nextStep}
            disabled={!canProceed() || isLoading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              canProceed() && !isLoading
                ? 'bg-gradient-to-r from-teal-500 to-teal-500 text-white hover:from-teal-600 hover:to-teal-600 shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              'Loading...'
            ) : currentStep === totalSteps - 1 ? (
              <>
                Start Growing
                <Sparkles className="w-5 h-5" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

