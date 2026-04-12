"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Map, 
  Clock, 
  MessageSquare, 
  Lightbulb, 
  GitBranch,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Sparkles
} from "lucide-react";

type DemoTab = "map" | "timeline" | "query" | "nudges" | "genealogy";

const DEMO_TABS: { id: DemoTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "map", label: "Belief Map", icon: Map },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "query", label: "AI Query", icon: MessageSquare },
  { id: "nudges", label: "Nudges", icon: Lightbulb },
  { id: "genealogy", label: "Source Chain", icon: GitBranch },
];

export function DemoPreview() {
  const [activeTab, setActiveTab] = useState<DemoTab>("map");

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-x-auto">
        {DEMO_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Demo Content */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {activeTab === "map" && <DemoBeliefMap />}
            {activeTab === "timeline" && <DemoTimeline />}
            {activeTab === "query" && <DemoQuery />}
            {activeTab === "nudges" && <DemoNudges />}
            {activeTab === "genealogy" && <DemoGenealogy />}
          </motion.div>
        </AnimatePresence>

        {/* Demo Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            <Sparkles className="w-3 h-3 mr-1" />
            Live Demo
          </Badge>
        </div>
      </div>
    </div>
  );
}

function DemoBeliefMap() {
  const [selectedCluster, setSelectedCluster] = useState<string | null>("economics");

  const clusters = [
    {
      id: "economics",
      label: "Economics",
      direction: "negative",
      size: 32,
      claimCount: 47,
      concepts: [
        { label: "Inflation", direction: "negative", strength: 0.8, claims: 18 },
        { label: "Fed Policy", direction: "negative", strength: 0.7, claims: 15 },
        { label: "Labor Markets", direction: "positive", strength: 0.6, claims: 14 },
      ],
    },
    {
      id: "tech",
      label: "AI & Tech",
      direction: "mixed",
      size: 28,
      claimCount: 35,
      concepts: [
        { label: "AI Safety", direction: "positive", strength: 0.9, claims: 15 },
        { label: "Automation", direction: "mixed", strength: 0.5, claims: 12 },
        { label: "Open Source", direction: "positive", strength: 0.85, claims: 8 },
      ],
    },
    {
      id: "climate",
      label: "Climate",
      direction: "positive",
      size: 24,
      claimCount: 22,
      concepts: [
        { label: "Renewables", direction: "positive", strength: 0.9, claims: 14 },
        { label: "Carbon Tax", direction: "mixed", strength: 0.4, claims: 8 },
      ],
    },
    {
      id: "politics",
      label: "Policy",
      direction: "mixed",
      size: 20,
      claimCount: 16,
      concepts: [
        { label: "Healthcare", direction: "positive", strength: 0.7, claims: 9 },
        { label: "Education", direction: "positive", strength: 0.6, claims: 7 },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Map with Legend sidebar */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Map Visualization */}
        <div className="md:col-span-3">
          <div className="relative aspect-[16/10] bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-900/30 rounded-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50">
            <svg viewBox="0 0 500 300" className="w-full h-full">
              <defs>
                <linearGradient id="demoPositive" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="demoNegative" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="demoMixed" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.65" />
                </linearGradient>
                <pattern id="demoGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <circle cx="12.5" cy="12.5" r="0.7" fill="#71717a" opacity="0.12" />
                </pattern>
                <filter id="demoGlow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Background grid */}
              <rect width="500" height="300" fill="url(#demoGrid)" />

              {/* Connection lines */}
              <g className="opacity-50">
                <line x1="150" y1="100" x2="350" y2="85" stroke="#a1a1aa" strokeWidth="1.5" />
                <line x1="150" y1="100" x2="120" y2="200" stroke="#a1a1aa" strokeWidth="1.5" />
                <line x1="350" y1="85" x2="380" y2="180" stroke="#a1a1aa" strokeWidth="1.5" />
                <line x1="120" y1="200" x2="380" y2="180" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="4 2" />
                <line x1="150" y1="100" x2="350" y2="85" stroke="#a1a1aa" strokeWidth="1" />
                {/* Tension line - animated */}
                <line x1="150" y1="100" x2="120" y2="200" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="8 4" className="animate-pulse" />
              </g>

              {/* Cluster nodes with engagement info */}
              <g filter="url(#demoGlow)">
                {clusters.map((cluster, i) => {
                  const positions = [
                    { x: 150, y: 100 },
                    { x: 350, y: 85 },
                    { x: 120, y: 200 },
                    { x: 380, y: 180 },
                  ];
                  const pos = positions[i];
                  const gradient = cluster.direction === "positive" ? "url(#demoPositive)" 
                                : cluster.direction === "negative" ? "url(#demoNegative)" 
                                : "url(#demoMixed)";
                  const isSelected = selectedCluster === cluster.id;

                  return (
                    <g key={cluster.id} onClick={() => setSelectedCluster(cluster.id)} className="cursor-pointer">
                      {/* Selection ring */}
                      {isSelected && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={cluster.size + 6}
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                          className="animate-pulse"
                        />
                      )}
                      {/* Main node */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={cluster.size}
                        fill={gradient}
                        className={`transition-all duration-200 ${isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                      />
                      {/* Label */}
                      <text
                        x={pos.x}
                        y={pos.y - 2}
                        textAnchor="middle"
                        className="text-[10px] fill-white font-semibold pointer-events-none"
                      >
                        {cluster.label}
                      </text>
                      {/* Claim count */}
                      <text
                        x={pos.x}
                        y={pos.y + 10}
                        textAnchor="middle"
                        className="text-[8px] fill-white/80 pointer-events-none"
                      >
                        {cluster.claimCount} claims
                      </text>
                      {/* Direction indicator arrow */}
                      <g transform={`translate(${pos.x + cluster.size - 5}, ${pos.y - cluster.size + 5})`}>
                        <circle r="8" fill="white" className="opacity-90" />
                        {cluster.direction === "positive" && (
                          <path d="M0,-4 L0,4 M-3,1 L0,-4 L3,1" stroke="#f97316" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        )}
                        {cluster.direction === "negative" && (
                          <path d="M0,-4 L0,4 M-3,-1 L0,4 L3,-1" stroke="#f43f5e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        )}
                        {cluster.direction === "mixed" && (
                          <path d="M-4,0 L4,0" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                        )}
                      </g>
                    </g>
                  );
                })}
              </g>

              {/* Tension indicator */}
              <g className="opacity-90">
                <circle cx="135" cy="150" r="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
                <text x="135" y="154" textAnchor="middle" className="text-[10px] fill-amber-700 font-bold">!</text>
              </g>

              {/* Stats badge */}
              <g transform="translate(15, 260)">
                <rect width="90" height="28" rx="6" fill="white" fillOpacity="0.9" stroke="#e4e4e7" />
                <text x="10" y="18" className="text-[10px] fill-zinc-600 font-medium">120 total claims</text>
              </g>
            </svg>
          </div>
        </div>

        {/* Legend Sidebar */}
        <div className="space-y-4 p-3 bg-zinc-50/80 dark:bg-zinc-800/30 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
          <div>
            <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2 uppercase tracking-wide">Legend</h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-rose-500 to-rose-600" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Skeptical stance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-500 to-amber-500" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Supportive stance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-400" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Mixed/nuanced</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2 uppercase tracking-wide">Node Size</h5>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Larger nodes = more claims engaged</p>
          </div>
          
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2 uppercase tracking-wide">Lines</h5>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-zinc-400 rounded" />
                <span className="text-xs text-zinc-500">Related</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-rose-500 rounded" style={{ background: 'repeating-linear-gradient(90deg, #f43f5e, #f43f5e 4px, transparent 4px, transparent 8px)' }} />
                <span className="text-xs text-zinc-500">Tension</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <div className="p-4 bg-zinc-50/80 dark:bg-zinc-800/30 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {selectedCluster ? clusters.find(c => c.id === selectedCluster)?.label : "Select a cluster"}
          </h4>
          {selectedCluster && (
            <Badge variant="outline" className="text-xs">
              {clusters.find(c => c.id === selectedCluster)?.claimCount} claims
            </Badge>
          )}
        </div>
        
        {selectedCluster && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {clusters.find(c => c.id === selectedCluster)?.concepts.map((concept, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  {concept.direction === "positive" && <TrendingUp className="w-4 h-4 text-orange-500" />}
                  {concept.direction === "negative" && <TrendingDown className="w-4 h-4 text-rose-500" />}
                  {concept.direction === "mixed" && <Minus className="w-4 h-4 text-amber-500" />}
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{concept.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        concept.direction === "positive" ? "bg-orange-500" :
                        concept.direction === "negative" ? "bg-rose-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${concept.strength * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-8">{Math.round(concept.strength * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {selectedCluster === "economics" && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Tension detected</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Your economic skepticism (inflation, Fed policy) appears to conflict with your climate optimism (renewables support). 
                  This tension is noted but not judged — many hold nuanced positions across domains.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DemoTimeline() {
  const [currentIndex, setCurrentIndex] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  const timelineData = [
    { 
      date: "Jan 2024", 
      concepts: [
        { id: "ai-safety", label: "AI Safety", stance: 0.4, claimCount: 8, isNew: true },
        { id: "fed-policy", label: "Fed Policy", stance: -0.2, claimCount: 5, isNew: true },
        { id: "renewables", label: "Renewables", stance: 0.6, claimCount: 12, isNew: true },
      ],
      events: [
        { type: "new_concept" as const, description: "Started exploring AI Safety" },
        { type: "new_concept" as const, description: "First engagement with Fed Policy" },
      ]
    },
    { 
      date: "Feb 2024", 
      concepts: [
        { id: "ai-safety", label: "AI Safety", stance: 0.5, claimCount: 14, changedFrom: 0.4 },
        { id: "fed-policy", label: "Fed Policy", stance: -0.3, claimCount: 8, changedFrom: -0.2 },
        { id: "renewables", label: "Renewables", stance: 0.65, claimCount: 18 },
        { id: "crypto", label: "Crypto", stance: -0.1, claimCount: 3, isNew: true },
      ],
      events: [
        { type: "new_concept" as const, description: "Discovered Crypto content" },
        { type: "position_shift" as const, description: "AI Safety stance strengthening" },
      ]
    },
    { 
      date: "Mar 2024", 
      concepts: [
        { id: "ai-safety", label: "AI Safety", stance: 0.6, claimCount: 22, changedFrom: 0.5 },
        { id: "fed-policy", label: "Fed Policy", stance: -0.5, claimCount: 15, changedFrom: -0.3 },
        { id: "renewables", label: "Renewables", stance: 0.7, claimCount: 24 },
        { id: "crypto", label: "Crypto", stance: -0.3, claimCount: 8, changedFrom: -0.1 },
      ],
      events: [
        { type: "position_shift" as const, description: "Fed Policy skepticism growing" },
        { type: "tension_detected" as const, description: "Tension: Crypto vs Renewables" },
      ]
    },
    { 
      date: "Apr 2024", 
      concepts: [
        { id: "ai-safety", label: "AI Safety", stance: 0.7, claimCount: 31 },
        { id: "fed-policy", label: "Fed Policy", stance: -0.6, claimCount: 19 },
        { id: "renewables", label: "Renewables", stance: 0.75, claimCount: 28 },
        { id: "crypto", label: "Crypto", stance: -0.4, claimCount: 12 },
        { id: "ubi", label: "UBI", stance: 0.3, claimCount: 5, isNew: true },
      ],
      events: [
        { type: "new_concept" as const, description: "Started exploring UBI" },
      ]
    },
    { 
      date: "May 2024", 
      concepts: [
        { id: "ai-safety", label: "AI Safety", stance: 0.85, claimCount: 42, changedFrom: 0.7 },
        { id: "fed-policy", label: "Fed Policy", stance: -0.7, claimCount: 23 },
        { id: "renewables", label: "Renewables", stance: 0.85, claimCount: 35 },
        { id: "crypto", label: "Crypto", stance: -0.5, claimCount: 15 },
        { id: "ubi", label: "UBI", stance: 0.5, claimCount: 11, changedFrom: 0.3 },
      ],
      events: [
        { type: "position_shift" as const, description: "AI Safety conviction increased" },
        { type: "position_shift" as const, description: "UBI support growing" },
      ]
    },
    { 
      date: "Jun 2024", 
      concepts: [
        { id: "ai-safety", label: "AI Safety", stance: 0.9, claimCount: 47 },
        { id: "fed-policy", label: "Fed Policy", stance: -0.7, claimCount: 26 },
        { id: "renewables", label: "Renewables", stance: 0.9, claimCount: 41 },
        { id: "crypto", label: "Crypto", stance: -0.6, claimCount: 18 },
        { id: "ubi", label: "UBI", stance: 0.6, claimCount: 16 },
      ],
      events: []
    },
  ];

  const currentSnapshot = timelineData[currentIndex];
  const previousSnapshot = currentIndex > 0 ? timelineData[currentIndex - 1] : null;

  const getChanges = () => {
    if (!previousSnapshot) return { newConcepts: currentSnapshot.concepts.filter(c => 'isNew' in c && (c as { isNew?: boolean }).isNew), shifts: [], removed: [] };
    
    const newConcepts = currentSnapshot.concepts.filter(c => 'isNew' in c && (c as { isNew?: boolean }).isNew);
    const shifts = currentSnapshot.concepts.filter(c => c.changedFrom !== undefined);
    const previousIds = new Set(previousSnapshot.concepts.map(c => c.id));
    const currentIds = new Set(currentSnapshot.concepts.map(c => c.id));
    const removed = previousSnapshot.concepts.filter(c => !currentIds.has(c.id));
    
    return { newConcepts, shifts, removed };
  };

  const changes = getChanges();

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= timelineData.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, timelineData.length]);

  const getStanceColor = (stance: number) => {
    if (stance > 0.3) return "bg-amber-500";
    if (stance < -0.3) return "bg-rose-500";
    return "bg-amber-500";
  };

  const getStanceBadgeColor = (stance: number) => {
    if (stance > 0.3) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    if (stance < -0.3) return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  };

  const filteredConcepts = selectedConcept 
    ? currentSnapshot.concepts.filter(c => c.id === selectedConcept)
    : currentSnapshot.concepts;

  return (
    <div className="space-y-4">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button
            variant={isPlaying ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-8 px-3"
          >
            {isPlaying ? (
              <>
                <span className="w-2 h-2 bg-current rounded-sm mr-1.5" />
                <span className="w-2 h-2 bg-current rounded-sm" />
              </>
            ) : (
              <span className="w-0 h-0 border-l-[6px] border-l-current border-y-[4px] border-y-transparent ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex(Math.min(timelineData.length - 1, currentIndex + 1))}
            disabled={currentIndex === timelineData.length - 1}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {currentSnapshot.date}
        </div>

        <div className="flex items-center gap-1">
          {[0.5, 1, 2].map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-1 text-xs rounded ${
                playbackSpeed === speed 
                  ? "bg-rose-500 text-white" 
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Bar */}
      <div className="relative">
        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-500 to-amber-500"
            initial={false}
            animate={{ width: `${((currentIndex + 1) / timelineData.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-1">
          {timelineData.map((snapshot, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`relative group`}
            >
              <div className={`w-3 h-3 rounded-full border-2 transition-colors ${
                i <= currentIndex 
                  ? "bg-rose-500 border-rose-500" 
                  : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600"
              }`} />
              {snapshot.events.length > 0 && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
              )}
              <span className={`absolute top-4 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap ${
                i === currentIndex ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-400"
              }`}>
                {snapshot.date.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Concept Badges */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500">Filter by concept</span>
          {selectedConcept && (
            <button 
              onClick={() => setSelectedConcept(null)}
              className="text-xs text-rose-500 hover:text-rose-600"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {currentSnapshot.concepts.map(concept => (
            <button
              key={concept.id}
              onClick={() => setSelectedConcept(selectedConcept === concept.id ? null : concept.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedConcept === concept.id 
                  ? "ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-zinc-900"
                  : ""
              } ${getStanceBadgeColor(concept.stance)}`}
              style={{ 
                transform: `scale(${0.9 + (concept.claimCount / 50) * 0.2})`,
              }}
            >
              {concept.label}
              <span className="ml-1 opacity-70">({concept.claimCount})</span>
              {'isNew' in concept && (concept as { isNew?: boolean }).isNew && (
                <Sparkles className="w-3 h-3 ml-1 inline" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Position Bars */}
      <div className="space-y-2">
        {filteredConcepts.map(concept => {
          const barWidth = Math.abs(concept.stance) * 100;
          const isPositive = concept.stance >= 0;
          const change = concept.changedFrom !== undefined 
            ? concept.stance - concept.changedFrom 
            : 0;
          
          return (
            <motion.div 
              key={concept.id} 
              className="space-y-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                  {concept.label}
                  {'isNew' in concept && (concept as { isNew?: boolean }).isNew && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700">
                      New
                    </Badge>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <span className={isPositive ? "text-amber-600" : "text-rose-600"}>
                    {isPositive ? "+" : ""}{Math.round(concept.stance * 100)}%
                  </span>
                  {change !== 0 && (
                    <span className={`text-[10px] ${change > 0 ? "text-amber-500" : "text-rose-500"}`}>
                      ({change > 0 ? "↑" : "↓"}{Math.abs(Math.round(change * 100))})
                    </span>
                  )}
                </span>
              </div>
              <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-300 dark:bg-zinc-600 z-10" />
                <motion.div
                  className={`h-full absolute ${isPositive ? 'left-1/2' : 'right-1/2'} ${getStanceColor(concept.stance)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth / 2}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* What Changed Panel */}
      {(changes.newConcepts.length > 0 || changes.shifts.length > 0 || currentSnapshot.events.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 rounded-xl border border-amber-200/50 dark:border-amber-800/30"
        >
          <h4 className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            What Changed in {currentSnapshot.date}
          </h4>
          <ul className="space-y-1.5">
            {changes.newConcepts.map(concept => (
              <li key={concept.id} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                New topic: <strong>{concept.label}</strong>
              </li>
            ))}
            {changes.shifts.map(concept => (
              <li key={concept.id} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  concept.stance > (concept.changedFrom || 0) ? "bg-amber-500" : "bg-rose-500"
                }`} />
                <strong>{concept.label}</strong> stance shifted{" "}
                {concept.stance > (concept.changedFrom || 0) ? "more supportive" : "more skeptical"}
              </li>
            ))}
            {currentSnapshot.events.filter(e => e.type === "tension_detected").map((event, i) => (
              <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                {event.description}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Supportive
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Mixed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Skeptical
        </span>
      </div>
    </div>
  );
}

function DemoQuery() {
  const [showResponse, setShowResponse] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-rose-500 text-white px-4 py-2 rounded-2xl rounded-br-sm max-w-[80%]">
            <p className="text-sm">What have I read about AI safety recently?</p>
          </div>
        </div>

        {/* AI response */}
        {showResponse ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl rounded-bl-sm max-w-[90%]">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                Over the past month, you&apos;ve engaged with 8 sources on AI safety. Here&apos;s what I found:
              </p>
              
              <div className="space-y-2 mb-3">
                <CitationBlock
                  source="MIT Technology Review"
                  claim="AI alignment research needs more funding"
                  stance="agree"
                  date="Mar 18"
                />
                <CitationBlock
                  source="The Atlantic"
                  claim="Current AI systems lack true understanding"
                  stance="complicated"
                  date="Mar 12"
                />
                <CitationBlock
                  source="Lex Fridman Podcast"
                  claim="Open-source AI is safer than closed development"
                  stance="agree"
                  date="Mar 5"
                />
              </div>

              <p className="text-xs text-zinc-500">
                You&apos;ve consistently engaged positively with AI safety concerns, showing a 90% agreement rate on related claims.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="flex justify-center">
            <Button size="sm" onClick={() => setShowResponse(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Show AI Response
            </Button>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
        <p className="text-xs text-zinc-500 mb-2">Try asking:</p>
        <div className="flex flex-wrap gap-2">
          <SuggestedQuestion>How have my views on climate changed?</SuggestedQuestion>
          <SuggestedQuestion>What topics am I most engaged with?</SuggestedQuestion>
        </div>
      </div>
    </div>
  );
}

function CitationBlock({ source, claim, stance, date }: { source: string; claim: string; stance: string; date: string }) {
  return (
    <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-zinc-500">{source} · {date}</span>
        <Badge variant="outline" className={`text-[10px] ${
          stance === "agree" ? "border-amber-300 text-amber-600" :
          stance === "disagree" ? "border-rose-300 text-rose-600" :
          "border-amber-300 text-amber-600"
        }`}>
          {stance}
        </Badge>
      </div>
      <p className="text-xs text-zinc-700 dark:text-zinc-300">&quot;{claim}&quot;</p>
    </div>
  );
}

function SuggestedQuestion({ children }: { children: React.ReactNode }) {
  return (
    <button className="text-xs px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
      {children}
    </button>
  );
}

function DemoNudges() {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Echo Chamber Nudge */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-amber-500 text-white text-[10px]">Counter view</Badge>
                <span className="text-xs text-zinc-500">on <strong>Fed Policy</strong></span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
                You&apos;ve engaged with 7 critical pieces on the Fed lately. Here&apos;s a different take worth considering.
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>The Economist</span>
                <span>·</span>
                <span>&quot;Why the Fed&apos;s approach may be working&quot;</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3 ml-13">
            <Button size="sm" variant="outline">Read it</Button>
            <Button size="sm" variant="ghost">Not now</Button>
          </div>
        </div>

        {/* Blind Spot Nudge */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
              <Map className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-[10px]">Blind spot</Badge>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
                You&apos;re deeply engaged with AI but haven&apos;t explored <strong>quantum computing</strong> — a related topic you might find interesting.
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>Wired</span>
                <span>·</span>
                <span>&quot;How quantum computing will change AI&quot;</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-500 text-center">
        Nudges are framed as curiosity, never correction
      </p>
    </div>
  );
}

function DemoGenealogy() {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
        <p className="text-xs text-zinc-500 mb-1">Tracing claim from</p>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          &quot;AI systems will surpass human-level reasoning by 2030&quot;
        </p>
      </div>

      {/* Source Chain */}
      <div className="relative pl-6">
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-rose-500 via-orange-500 to-amber-500" />
        
        <div className="space-y-4">
          <ChainNode
            level="primary"
            source="MIT Technology Review"
            author="Will Douglas Heaven"
            date="Mar 2024"
            quote="Leading researchers predict AGI capabilities by end of decade"
          />
          
          <ChainNode
            level="secondary"
            source="Nature"
            author="Anthropic Research"
            date="Jan 2024"
            quote="Referenced survey of 352 AI researchers"
          />
          
          <ChainNode
            level="origin"
            source="arXiv Preprint"
            author="Grace et al."
            date="2022"
            quote="Original survey methodology and findings"
            isOrigin
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
        <Badge variant="outline">85% confidence</Badge>
        <span>in chain accuracy</span>
      </div>
    </div>
  );
}

function ChainNode({ 
  level, 
  source, 
  author, 
  date, 
  quote, 
  isOrigin = false 
}: { 
  level: string;
  source: string;
  author: string;
  date: string;
  quote: string;
  isOrigin?: boolean;
}) {
  return (
    <div className={`relative ${isOrigin ? 'opacity-100' : 'opacity-90'}`}>
      <div className={`absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${
        isOrigin 
          ? 'bg-amber-500 border-amber-300' 
          : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600'
      }`} />
      
      <div className={`p-3 rounded-lg border ${
        isOrigin 
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' 
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{source}</span>
          {isOrigin && <Badge className="bg-amber-500 text-white text-[10px]">Origin</Badge>}
        </div>
        <p className="text-xs text-zinc-500 mb-1">{author} · {date}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">&quot;{quote}&quot;</p>
      </div>
    </div>
  );
}
