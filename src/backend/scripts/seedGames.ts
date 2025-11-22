import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed game questions and pairs for Games Hub
 * Based on Stage 2 specification
 */

const questions = [
  // Calm Category
  {
    question: 'Which moves stress hormones OUT of your body fastest?',
    options: ['Thinking positive', 'Ignoring the feeling', 'Slow exhales', 'Power pose'],
    correctIndex: 2,
    category: 'calm',
    difficulty: 1,
    microTeach: 'Longer exhales signal the body the threat has passed.',
  },
  {
    question: 'What creates presence more reliably than speaking?',
    options: ['Volume', 'Eye contact', 'Silence', 'Humor'],
    correctIndex: 2,
    category: 'calm',
    difficulty: 1,
    microTeach: 'Silence draws attention to you.',
  },
  {
    question: 'Which breath pattern tells your body you\'re safe?',
    options: ['Longer exhale', 'Quick inhale', 'Holding breath', 'Rapid breathing'],
    correctIndex: 0,
    category: 'calm',
    difficulty: 1,
    microTeach: 'Long exhales turn off fight or flight.',
  },
  {
    question: 'What happens when you lower your shoulders before speaking?',
    options: ['You look smaller', 'Your voice gets deeper', 'You feel more grounded', 'You appear nervous'],
    correctIndex: 2,
    category: 'calm',
    difficulty: 2,
    sceneMatch: 'presentation',
    microTeach: 'Physical grounding creates mental stability.',
  },
  {
    question: 'How do you stop a racing mind before a high-stakes moment?',
    options: ['Think harder', 'Breathe slower', 'Plan more', 'Visualize success'],
    correctIndex: 1,
    category: 'calm',
    difficulty: 2,
    sceneMatch: 'presentation',
    microTeach: 'Slow breathing slows the mind. The body leads.',
  },

  // Confidence Category
  {
    question: 'What makes you sound credible without saying a word?',
    options: ['Loud voice', 'Perfect posture', 'Eye contact', 'All of the above'],
    correctIndex: 1,
    category: 'confidence',
    difficulty: 1,
    microTeach: 'Posture signals authority before you speak.',
  },
  {
    question: 'How do you actually sound credible?',
    options: ['Speak faster', 'Use big words', 'Pause strategically', 'Never hesitate'],
    correctIndex: 2,
    category: 'confidence',
    difficulty: 1,
    microTeach: 'Pauses show you\'re thinking, not stalling.',
  },
  {
    question: 'What creates more impact: volume or pace?',
    options: ['Volume', 'Pace', 'Both equally', 'Neither matters'],
    correctIndex: 1,
    category: 'confidence',
    difficulty: 2,
    sceneMatch: 'presentation',
    microTeach: 'Slower pace = more authority. Speed signals anxiety.',
  },
  {
    question: 'How do you claim space in a room?',
    options: ['Stand taller', 'Speak louder', 'Move closer', 'Make eye contact'],
    correctIndex: 0,
    category: 'confidence',
    difficulty: 2,
    microTeach: 'Height signals dominance. Your body language sets the frame.',
  },
  {
    question: 'What\'s the fastest way to build confidence before a meeting?',
    options: ['Review notes', 'Power pose', 'Deep breath + posture', 'Visualize success'],
    correctIndex: 2,
    category: 'confidence',
    difficulty: 1,
    microTeach: 'Body first, mind follows. Breath + posture = instant shift.',
  },

  // Connection Category
  {
    question: 'How do you read the room without asking?',
    options: ['Watch faces', 'Listen to tone', 'Notice body language', 'All of the above'],
    correctIndex: 3,
    category: 'connection',
    difficulty: 1,
    microTeach: 'Social cues are everywhere. Pay attention to what\'s not said.',
  },
  {
    question: 'What builds rapport faster: words or presence?',
    options: ['Words', 'Presence', 'Both equally', 'Neither'],
    correctIndex: 1,
    category: 'connection',
    difficulty: 2,
    sceneMatch: '1:1',
    microTeach: 'Presence creates connection. Words come second.',
  },
  {
    question: 'How do you show you\'re listening without interrupting?',
    options: ['Nod constantly', 'Make eye contact', 'Repeat what they said', 'Stay silent'],
    correctIndex: 1,
    category: 'connection',
    difficulty: 1,
    sceneMatch: '1:1',
    microTeach: 'Eye contact signals engagement. It\'s the simplest connection tool.',
  },
  {
    question: 'What creates trust in a conversation?',
    options: ['Agreeing always', 'Being authentic', 'Talking more', 'Staying formal'],
    correctIndex: 1,
    category: 'connection',
    difficulty: 2,
    microTeach: 'Authenticity builds trust. Be real, not perfect.',
  },

  // Boundaries Category
  {
    question: 'How do you protect yourself without aggression?',
    options: ['Say no firmly', 'Avoid conflict', 'Be passive', 'Agree then ignore'],
    correctIndex: 0,
    category: 'boundaries',
    difficulty: 1,
    microTeach: 'Clear boundaries protect you. Firm doesn\'t mean aggressive.',
  },
  {
    question: 'What\'s the difference between a boundary and a wall?',
    options: ['Boundaries are flexible', 'Walls are permanent', 'Boundaries protect, walls isolate', 'No difference'],
    correctIndex: 2,
    category: 'boundaries',
    difficulty: 2,
    microTeach: 'Boundaries protect without cutting you off. Walls isolate.',
  },
  {
    question: 'How do you say no without burning bridges?',
    options: ['Apologize profusely', 'Be direct and respectful', 'Make excuses', 'Agree then cancel'],
    correctIndex: 1,
    category: 'boundaries',
    difficulty: 2,
    microTeach: 'Direct + respectful = clear boundaries without damage.',
  },

  // Clarity Category
  {
    question: 'How do you reduce overwhelm and cut noise?',
    options: ['Plan everything', 'Focus on one thing', 'Multitask', 'Ignore distractions'],
    correctIndex: 1,
    category: 'clarity',
    difficulty: 1,
    microTeach: 'One thing at a time. Clarity comes from focus.',
  },
  {
    question: 'What\'s the first step when you\'re overwhelmed?',
    options: ['Make a list', 'Take a breath', 'Start working', 'Ask for help'],
    correctIndex: 1,
    category: 'clarity',
    difficulty: 1,
    microTeach: 'Breath first. Then clarity. Then action.',
  },
  {
    question: 'How do you make one clear ask instead of many?',
    options: ['Prioritize', 'Combine requests', 'Focus on outcome', 'All of the above'],
    correctIndex: 3,
    category: 'clarity',
    difficulty: 2,
    sceneMatch: 'standup',
    microTeach: 'One clear ask > many unclear ones. Focus on what matters.',
  },
  {
    question: 'What reduces overwhelm fastest?',
    options: ['Planning more', 'Breaking it down', 'Working faster', 'Delegating everything'],
    correctIndex: 1,
    category: 'clarity',
    difficulty: 1,
    microTeach: 'Small steps > big plans. Break it down to move forward.',
  },

  // Recovery Category
  {
    question: 'How do you reset after stress?',
    options: ['Keep working', 'Take a break', 'Push through', 'Ignore it'],
    correctIndex: 1,
    category: 'recovery',
    difficulty: 1,
    microTeach: 'Recovery is active. Movement + breath = reset.',
  },
  {
    question: 'What helps you recover faster: rest or movement?',
    options: ['Rest', 'Movement', 'Both', 'Neither'],
    correctIndex: 2,
    category: 'recovery',
    difficulty: 2,
    microTeach: 'Movement + distraction off = faster recovery than just rest.',
  },
  {
    question: 'How do you turn off stress after a difficult meeting?',
    options: ['Think about it', 'Move your body', 'Talk about it', 'Ignore it'],
    correctIndex: 1,
    category: 'recovery',
    difficulty: 1,
    microTeach: 'Physical movement moves stress out. Body first, mind follows.',
  },
];

const pairs = [
  // Calm Domain
  {
    cardA: 'Grounded breath',
    cardB: 'Lower shoulders',
    domain: 'calm',
    difficulty: 1,
    microTeach: 'Breath + posture = instant calm. Your body leads, mind follows.',
  },
  {
    cardA: 'Slow the pace',
    cardB: 'Longer exhale',
    domain: 'calm',
    difficulty: 1,
    microTeach: 'Slower pace + longer exhales signal safety. The body responds.',
  },
  {
    cardA: 'Claim the frame',
    cardB: 'Hold the pause',
    domain: 'calm',
    difficulty: 2,
    sceneMatch: 'presentation',
    microTeach: 'Frame + pause = presence. You control the moment.',
  },
  {
    cardA: 'Breathe',
    cardB: 'Slow the scene',
    domain: 'calm',
    difficulty: 2,
    microTeach: 'Calm [down arrow] makes you the center.',
  },

  // Confidence Domain
  {
    cardA: 'Posture',
    cardB: 'Eye contact',
    domain: 'confidence',
    difficulty: 1,
    microTeach: 'Posture + eye contact = authority before you speak.',
  },
  {
    cardA: 'Set the tone',
    cardB: 'Slow the scene',
    domain: 'confidence',
    difficulty: 2,
    microTeach: 'Tone + pace = control. You lead, others follow.',
  },
  {
    cardA: 'Stand taller',
    cardB: 'Speak slower',
    domain: 'confidence',
    difficulty: 1,
    microTeach: 'Height + pace = credibility. Body language is everything.',
  },
  {
    cardA: 'Claim space',
    cardB: 'Hold attention',
    domain: 'confidence',
    difficulty: 2,
    sceneMatch: 'presentation',
    microTeach: 'Space + attention = presence. You own the room.',
  },

  // Boundaries Domain
  {
    cardA: 'Need',
    cardB: 'No',
    domain: 'boundaries',
    difficulty: 1,
    microTeach: 'Know your need. Say no clearly. Protection without aggression.',
  },
  {
    cardA: 'Clear ask',
    cardB: 'Firm boundary',
    domain: 'boundaries',
    difficulty: 2,
    microTeach: 'Clear communication + firm boundaries = respect.',
  },
  {
    cardA: 'Protect',
    cardB: 'Respect',
    domain: 'boundaries',
    difficulty: 2,
    microTeach: 'Boundaries protect you while respecting others. Both matter.',
  },

  // Clarity Domain
  {
    cardA: 'One ask',
    cardB: 'First step only',
    domain: 'clarity',
    difficulty: 1,
    microTeach: 'One clear ask > many unclear ones. First step only.',
  },
  {
    cardA: 'Name the feeling',
    cardB: 'Drop the story',
    domain: 'clarity',
    difficulty: 2,
    microTeach: 'Feel the feeling. Drop the story. Clarity follows.',
  },
  {
    cardA: 'Shrink the world',
    cardB: 'One page plan',
    domain: 'clarity',
    difficulty: 2,
    microTeach: 'Smaller scope = clearer path. One page > many pages.',
  },
  {
    cardA: 'Cut noise',
    cardB: 'Focus on one',
    domain: 'clarity',
    difficulty: 1,
    microTeach: 'Less noise = more clarity. One thing at a time.',
  },

  // Recovery Domain
  {
    cardA: 'Movement',
    cardB: 'Distraction off',
    domain: 'recovery',
    difficulty: 1,
    microTeach: 'Move your body. Turn off distractions. Recovery is active.',
  },
  {
    cardA: 'Reset breath',
    cardB: 'Change space',
    domain: 'recovery',
    difficulty: 2,
    microTeach: 'New breath + new space = mental reset. Environment matters.',
  },
  {
    cardA: 'Walk',
    cardB: 'Breathe',
    domain: 'recovery',
    difficulty: 1,
    microTeach: 'Movement + breath = fastest recovery. Body leads.',
  },
];

async function main() {
  console.log('🌱 Seeding game questions and pairs...');

  // Clear existing data (optional - comment out if you want to keep existing)
  // await prisma.gameSession.deleteMany({});
  // await prisma.gameQuestion.deleteMany({});
  // await prisma.gamePair.deleteMany({});

  // Seed questions
  console.log('📝 Seeding questions...');
  let questionCount = 0;
  for (const q of questions) {
    // Create a stable ID based on question content
    const questionHash = Buffer.from(q.question).toString('base64').substring(0, 16).replace(/[^a-zA-Z0-9]/g, '');
    const id = `q-${questionHash}-${questionCount++}`;
    
    try {
      await prisma.gameQuestion.upsert({
        where: { id },
        update: {
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          category: q.category,
          difficulty: q.difficulty,
          sceneMatch: q.sceneMatch || null,
          microTeach: q.microTeach,
        },
        create: {
          id,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          category: q.category,
          difficulty: q.difficulty,
          sceneMatch: q.sceneMatch || null,
          microTeach: q.microTeach,
        },
      });
    } catch (error: any) {
      // If upsert fails due to unique constraint, try create
      if (error.code === 'P2002') {
        console.warn(`⚠️ Question already exists, skipping: ${q.question.substring(0, 50)}...`);
      } else {
        throw error;
      }
    }
  }
  console.log(`✅ Seeded ${questions.length} questions`);

  // Seed pairs
  console.log('🎯 Seeding pairs...');
  let pairCount = 0;
  for (const p of pairs) {
    // Create a stable ID based on pair content
    const pairHash = Buffer.from(`${p.cardA}-${p.cardB}`).toString('base64').substring(0, 16).replace(/[^a-zA-Z0-9]/g, '');
    const id = `p-${pairHash}-${pairCount++}`;
    
    try {
      await prisma.gamePair.upsert({
        where: { id },
        update: {
          cardA: p.cardA,
          cardB: p.cardB,
          domain: p.domain,
          difficulty: p.difficulty,
          microTeach: p.microTeach,
        },
        create: {
          id,
          cardA: p.cardA,
          cardB: p.cardB,
          domain: p.domain,
          difficulty: p.difficulty,
          microTeach: p.microTeach,
        },
      });
    } catch (error: any) {
      // If upsert fails due to unique constraint, try create
      if (error.code === 'P2002') {
        console.warn(`⚠️ Pair already exists, skipping: ${p.cardA} + ${p.cardB}`);
      } else {
        throw error;
      }
    }
  }
  console.log(`✅ Seeded ${pairs.length} pairs`);

  console.log('🎉 Game seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding games:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

