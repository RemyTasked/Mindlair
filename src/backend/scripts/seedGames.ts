import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed game questions and pairs for Games Hub
 * Updated with new comprehensive content
 */

const questions = [
  {
    question: 'Before a stressful event, which practice best signals safety to your body?',
    options: ['Rapid shallow breathing', 'Slow inhale, longer exhale', 'Holding your breath', 'Random yawning'],
    correctIndex: 1,
    category: 'calm',
    difficulty: 1,
    microTeach: 'Longer exhales help activate the body\'s relaxation response and turn down fight-or-flight.',
  },
  {
    question: 'What is a simple way to avoid feeling overwhelmed by a long to-do list?',
    options: ['Rewrite the entire list every hour', 'Start three tasks at once', 'Choose one next tiny step and do only that', 'Wait until you feel motivated'],
    correctIndex: 2,
    category: 'clarity',
    difficulty: 1,
    microTeach: 'Focusing on a single clear next action reduces cognitive overload and builds momentum.',
  },
  {
    question: 'Which self-talk line is generally most supportive before a big moment?',
    options: ['I must not mess this up.', 'If I\'m nervous, I\'m failing.', 'I can handle this, even if I feel nervous.', 'They\'re all better than me.'],
    correctIndex: 2,
    category: 'confidence',
    difficulty: 1,
    microTeach: 'Accepting nerves while trusting your ability is more effective than perfectionism or self-attack.',
  },
  {
    question: 'What\'s a good first step when you notice your heart racing?',
    options: ['Pretend nothing is happening', 'Judge yourself for being weak', 'Notice the sensation and slow your breathing', 'Immediately cancel your plans'],
    correctIndex: 2,
    category: 'calm',
    difficulty: 1,
    microTeach: 'Noticing physical sensations and adjusting breathing helps regulate your nervous system.',
  },
  {
    question: 'Which habit supports clearer thinking at the start of the day?',
    options: ['Diving into notifications immediately', 'Comparing yourself on social media', 'Spending a minute choosing your top priority', 'Skipping breakfast and coffee'],
    correctIndex: 2,
    category: 'clarity',
    difficulty: 1,
    microTeach: 'Naming one top priority gives your brain a clear focal point and reduces scatter.',
  },
  {
    question: 'When you\'re talking to someone, what usually builds connection the most?',
    options: ['Planning your next reply while they talk', 'Interrupting to fix their problem instantly', 'Making eye contact and listening fully', 'Checking your phone often'],
    correctIndex: 2,
    category: 'connection',
    difficulty: 1,
    microTeach: 'Presence and full listening are foundational for feeling seen and connected.',
  },
  {
    question: 'What is a realistic expectation about feeling anxious?',
    options: ['You should never feel it', 'It means you\'re not good enough', 'It\'s uncomfortable but very common', 'It always means something is wrong'],
    correctIndex: 2,
    category: 'calm',
    difficulty: 1,
    microTeach: 'Anxiety is a normal human response; learning to work with it is more helpful than trying to erase it.',
  },
  {
    question: 'Which of these usually supports confidence in your body language?',
    options: ['Staring at the floor', 'Curling your shoulders inward', 'Standing or sitting tall with open posture', 'Crossing your arms tightly'],
    correctIndex: 2,
    category: 'confidence',
    difficulty: 1,
    microTeach: 'Upright, open posture supports both how you feel and how others read your presence.',
  },
  {
    question: 'What is a quick way to reduce decision fatigue in a busy day?',
    options: ['Treat every choice as life-or-death', 'Refuse to decide anything', 'Pre-decide a few defaults like lunch or clothes', 'Ask five people for opinions on everything'],
    correctIndex: 2,
    category: 'control',
    difficulty: 1,
    microTeach: 'Default choices reduce mental load so you can save energy for important decisions.',
  },
  {
    question: 'After a tough day, what reflection pattern is most balanced?',
    options: ['Listing only what went wrong', 'Ignoring the day completely', 'Three things that went well and one thing to improve', 'Asking everyone if you were awkward'],
    correctIndex: 2,
    category: 'recovery',
    difficulty: 1,
    microTeach: 'Balanced reflection builds confidence and growth without fueling rumination.',
  },
  {
    question: 'Which breathing pattern is generally most calming?',
    options: ['Inhale 2, exhale 2', 'Inhale 4, exhale 4', 'Inhale 4, exhale 6', 'Inhale 6, exhale 1'],
    correctIndex: 2,
    category: 'calm',
    difficulty: 2,
    microTeach: 'Slightly longer exhales often activate the parasympathetic rest-and-digest response.',
  },
  {
    question: 'What mental move can reduce the intensity of a strong emotion?',
    options: ['Pretending it isn\'t there', 'Blaming yourself for feeling it', 'Naming it, like this is anxiety', 'Overexplaining it to everyone'],
    correctIndex: 2,
    category: 'calm',
    difficulty: 2,
    microTeach: 'Labeling an emotion activates brain regions that help regulate it.',
  },
  {
    question: 'Which thought best supports healthy boundaries?',
    options: ['If I say no, people will hate me.', 'My needs matter too.', 'I must always be available.', 'Only other people\'s feelings count.'],
    correctIndex: 1,
    category: 'control',
    difficulty: 2,
    microTeach: 'Recognizing that your needs matter is a core foundation of setting boundaries.',
  },
  {
    question: 'What\'s a helpful way to prepare for a difficult conversation?',
    options: ['Decide you must win', 'Rehearse every word you\'ll say', 'Clarify what you feel and what you need', 'Wait until you\'re extremely angry'],
    correctIndex: 2,
    category: 'connection',
    difficulty: 2,
    microTeach: 'Knowing your feelings and needs makes it easier to speak clearly and respectfully.',
  },
  {
    question: 'You\'re overwhelmed by tasks. Which strategy helps most?',
    options: ['Try to do everything at once', 'Sort tasks into today, later, and maybe', 'Work until you collapse', 'Ignore everything'],
    correctIndex: 1,
    category: 'clarity',
    difficulty: 2,
    microTeach: 'Prioritizing and deferring reduces overload and builds a sense of control.',
  },
  {
    question: 'Which self-talk line is most supportive after a small mistake?',
    options: ['I always mess everything up.', 'I\'m such an idiot.', 'That didn\'t go how I wanted; I can adjust next time.', 'I should never try anything again.'],
    correctIndex: 2,
    category: 'recovery',
    difficulty: 2,
    microTeach: 'Growth-oriented self-talk helps you learn without attacking your worth.',
  },
  {
    question: 'What\'s one way to feel less on display in social situations?',
    options: ['Focus on how you look from the outside', 'Try to impress everyone', 'Shift attention to being curious about others', 'Avoid eye contact and hope no one notices you'],
    correctIndex: 2,
    category: 'connection',
    difficulty: 2,
    microTeach: 'Curiosity about others moves focus away from self-judgment and builds connection.',
  },
  {
    question: 'Which habit most supports long-term mental resilience?',
    options: ['Sleeping less to get more done', 'Ignoring stress until you crash', 'Scheduling regular rest and breaks', 'Relying only on willpower'],
    correctIndex: 2,
    category: 'recovery',
    difficulty: 2,
    microTeach: 'Rest is a key part of resilience; the brain and body need recovery to perform well.',
  },
  {
    question: 'You\'re spiraling on what if thoughts. What helps most?',
    options: ['Chasing every scenario in detail', 'Asking what\'s in my control right now', 'Asking others to reassure you repeatedly', 'Pretending you\'re not worried'],
    correctIndex: 1,
    category: 'control',
    difficulty: 2,
    microTeach: 'Focusing on controllable actions grounds your attention and reduces helplessness.',
  },
  {
    question: 'Which daily habit best supports clarity of mind?',
    options: ['Constant multitasking', 'Zero breaks all day', 'Short intentional pauses between activities', 'Checking notifications every minute'],
    correctIndex: 2,
    category: 'clarity',
    difficulty: 2,
    microTeach: 'Pausing gives your brain space to reset and prevents mental smear between tasks.',
  },
  {
    question: 'What\'s a healthier expectation about relationships?',
    options: ['No one should ever disagree with you', 'Conflict means the relationship is doomed', 'Some tension is normal; how you handle it matters', 'You must keep everyone happy'],
    correctIndex: 2,
    category: 'connection',
    difficulty: 2,
    microTeach: 'Mindful conflict and repair are part of healthy relationships.',
  },
  {
    question: 'Which action can quickly shift your mood during a heavy day?',
    options: ['Sitting still and catastrophizing', 'Getting a small dose of movement and light', 'Doom-scrolling', 'Replaying an argument repeatedly'],
    correctIndex: 1,
    category: 'recovery',
    difficulty: 2,
    microTeach: 'Light and movement influence brain chemistry and can lift mood.',
  },
  {
    question: 'What\'s an effective way to prepare for performance situations?',
    options: ['Visualize everything going perfectly only', 'Visualize yourself coping well even if it\'s imperfect', 'Avoid thinking about it until the last minute', 'Assume failure to protect yourself'],
    correctIndex: 1,
    category: 'confidence',
    difficulty: 3,
    microTeach: 'Visualizing coping skills builds confidence that you can handle challenges, not just best-case scenarios.',
  },
  {
    question: 'When is it most useful to say no?',
    options: ['When you want to punish someone', 'When a request violates your limits or priorities', 'When you feel slightly bored', 'When you don\'t understand your own needs'],
    correctIndex: 1,
    category: 'control',
    difficulty: 3,
    microTeach: 'Boundaries protect your time, energy, and values, not random moods.',
  },
  {
    question: 'Which practice is most likely to reduce long-term anxiety?',
    options: ['Avoiding anything that feels scary', 'Gradually facing manageable challenges with support', 'Overthinking every possible outcome', 'Forcing yourself to just get over it instantly'],
    correctIndex: 1,
    category: 'calm',
    difficulty: 3,
    microTeach: 'Gradual exposure builds evidence that you can tolerate discomfort and still function.',
  },
  {
    question: 'You notice you often feel resentful. What might be missing?',
    options: ['Enough self-criticism', 'Constant agreement with everyone', 'Clear boundaries and honest communication', 'More people-pleasing'],
    correctIndex: 2,
    category: 'connection',
    difficulty: 3,
    microTeach: 'Resentment often signals unspoken needs and weak boundaries.',
  },
  {
    question: 'What\'s a strong signal of emotional safety with someone?',
    options: ['You feel you must edit everything you say', 'You\'re scared to share mistakes', 'You can show vulnerability without constant fear of attack', 'You never disagree'],
    correctIndex: 2,
    category: 'connection',
    difficulty: 3,
    microTeach: 'Safety shows up when you can be imperfect and still feel accepted.',
  },
  {
    question: 'Which combination best supports deep work?',
    options: ['Constantly checking messages and social tabs', 'One defined block of time with notifications off', 'No plan and reacting to everything', 'Switching tasks every two minutes'],
    correctIndex: 1,
    category: 'clarity',
    difficulty: 3,
    microTeach: 'Protected time and reduced distractions help the brain sustain focus.',
  },
  {
    question: 'Which self-belief is most supportive of long-term growth?',
    options: ['If I\'m not naturally good, it\'s pointless.', 'Effort and feedback can improve most skills.', 'Trying is embarrassing.', 'Only other people improve.'],
    correctIndex: 1,
    category: 'confidence',
    difficulty: 3,
    microTeach: 'A growth mindset frames effort as the path to mastery instead of proof of inadequacy.',
  },
  {
    question: 'You\'ve had a very emotionally intense day. What\'s a healthy evening response?',
    options: ['Numb out with endless stimulation', 'Replay every conversation in detail', 'Do a short grounding practice and choose one nurturing activity', 'Decide you\'re broken'],
    correctIndex: 2,
    category: 'recovery',
    difficulty: 3,
    microTeach: 'Grounding plus one caring action supports recovery without denial or obsession.',
  },
  {
    question: 'Which best describes emotional regulation?',
    options: ['Never feeling strong emotions', 'Controlling other people\'s behavior', 'Noticing emotions and responding skillfully', 'Ignoring your feelings until they explode'],
    correctIndex: 2,
    category: 'calm',
    difficulty: 2,
    microTeach: 'Regulation is about managing your response, not suppressing emotions or controlling others.',
  },
  {
    question: 'Which quick question can help during a conflict?',
    options: ['How do I win this?', 'How do I make you feel guilty?', 'What am I actually needing right now?', 'How can I avoid saying anything?'],
    correctIndex: 2,
    category: 'connection',
    difficulty: 2,
    microTeach: 'Knowing your underlying need makes it easier to communicate constructively.',
  },
  {
    question: 'What is a common thinking trap when anxious?',
    options: ['Seeing multiple viewpoints', 'Assuming the best', 'Catastrophizing about worst-case scenarios', 'Pausing to verify facts'],
    correctIndex: 2,
    category: 'clarity',
    difficulty: 1,
    microTeach: 'Catastrophizing jumps to worst-case outcomes without evidence and feeds anxiety.',
  },
  {
    question: 'Which is a helpful minimum plan on very low-energy days?',
    options: ['Do everything perfectly or nothing at all', 'Choose one tiny win and one act of care', 'Force maximum productivity no matter what', 'Hide from life completely'],
    correctIndex: 1,
    category: 'recovery',
    difficulty: 2,
    microTeach: 'Tiny goals and self-care maintain momentum without unrealistic pressure.',
  },
  {
    question: 'What does self-compassion not mean?',
    options: ['Letting yourself off the hook for everything forever', 'Treating yourself with basic kindness', 'Recognizing common human struggles', 'Encouraging yourself like a friend'],
    correctIndex: 0,
    category: 'recovery',
    difficulty: 3,
    microTeach: 'Self-compassion is not avoiding responsibility; it\'s facing reality without self-cruelty.',
  },
  {
    question: 'Which short phrase can interrupt a spiral of self-criticism?',
    options: ['This proves I\'m worthless.', 'Hold on, what else is true?', 'Let\'s list all my flaws.', 'I must replay this forever.'],
    correctIndex: 1,
    category: 'clarity',
    difficulty: 2,
    microTeach: 'Asking what else is true widens your perspective beyond the harsh narrative.',
  },
  {
    question: 'What\'s a good rule of thumb when sending emotional messages?',
    options: ['Send when furious, no edits', 'Share them with everyone you know', 'Draft, pause, and send after emotions settle', 'Never express feelings at all'],
    correctIndex: 2,
    category: 'control',
    difficulty: 2,
    microTeach: 'Time creates distance that helps you communicate more clearly and less reactively.',
  },
  {
    question: 'You often say yes when you mean no. What\'s a helpful first step?',
    options: ['Blame others for asking', 'Notice your body\'s reaction when someone asks', 'Agree even faster', 'Stop speaking to people'],
    correctIndex: 1,
    category: 'control',
    difficulty: 2,
    microTeach: 'Your body often reacts before your words; noticing tension can signal a boundary is needed.',
  },
  {
    question: 'Which practice can deepen your sense of meaning in life?',
    options: ['Constant comparison', 'Naming what matters to you and acting in line with it', 'Ignoring your values', 'Doing what others expect 100% of the time'],
    correctIndex: 1,
    category: 'confidence',
    difficulty: 3,
    microTeach: 'Values-based actions create a sense of coherence and meaning.',
  },
  {
    question: 'Which is a good indicator that you may need a reset, not more effort?',
    options: ['You still care and feel energized', 'You feel chronically exhausted and numb', 'You\'re excited to experiment', 'You feel rested and curious'],
    correctIndex: 1,
    category: 'recovery',
    difficulty: 2,
    microTeach: 'Exhaustion and numbness suggest burnout; rest and reset come before sustainable effort.',
  },
  {
    question: 'Which short mental move can reduce social anxiety in a group?',
    options: ['Everyone is judging me', 'I have to impress all of them', 'Someone else here probably feels nervous too', 'I should leave immediately'],
    correctIndex: 2,
    category: 'connection',
    difficulty: 1,
    microTeach: 'Recognizing shared humanity softens the sense of isolation and scrutiny.',
  },
  {
    question: 'Which trio is a strong basic self-care check?',
    options: ['Sleep, food, movement', 'Status, followers, likes', 'Gossip, complaints, judgment', 'Work, work, work'],
    correctIndex: 0,
    category: 'recovery',
    difficulty: 1,
    microTeach: 'Sleep, nutrition, and physical movement strongly influence mental state.',
  },
  {
    question: 'You\'re stuck overthinking a decision with similar options. What helps?',
    options: ['Gather infinite more data', 'Ask 20 people what to do', 'Set a time limit, decide, and commit to learning from it', 'Do nothing and hope it disappears'],
    correctIndex: 2,
    category: 'control',
    difficulty: 3,
    microTeach: 'For good-enough choices, timely decisions plus learning beat perfectionistic delay.',
  },
  {
    question: 'Which question can help you reprioritize a crowded day?',
    options: ['What will impress people most?', 'What would be most embarrassing to skip?', 'What, if done today, would matter most a week from now?', 'What lets me avoid my feelings?'],
    correctIndex: 2,
    category: 'clarity',
    difficulty: 3,
    microTeach: 'Future-oriented thinking highlights tasks with lasting impact.',
  },
  {
    question: 'What\'s a healthy way to respond when someone else is emotional?',
    options: ['Tell them they\'re overreacting', 'Compete with your own story', 'Listen, reflect what you heard, then respond', 'Change the subject quickly'],
    correctIndex: 2,
    category: 'connection',
    difficulty: 2,
    microTeach: 'Reflection helps them feel understood and lowers defensiveness.',
  },
  {
    question: 'Which technique can help transform I am anxious into something less fused?',
    options: ['I am anxiety forever.', 'I feel some anxiety right now.', 'Anxiety means I\'m broken.', 'Anxiety will always win.'],
    correctIndex: 1,
    category: 'calm',
    difficulty: 3,
    microTeach: 'Describing emotions as experiences, not identities, reduces fusion and increases flexibility.',
  },
  {
    question: 'When is it often better to rest rather than push?',
    options: ['When you\'re slightly bored', 'When you\'re deeply exhausted and nothing feels meaningful', 'When you\'re mildly challenged', 'When you\'re close to finishing something important'],
    correctIndex: 1,
    category: 'recovery',
    difficulty: 2,
    microTeach: 'Deep exhaustion is a sign you need recovery for long-term functioning.',
  },
  {
    question: 'What is one benefit of writing worries down on paper?',
    options: ['It makes them bigger', 'It guarantees they come true', 'It gets them out of your head and into a container', 'It proves you\'re dramatic'],
    correctIndex: 2,
    category: 'calm',
    difficulty: 1,
    microTeach: 'Externalizing worries gives you distance and allows prioritization.',
  },
  {
    question: 'If you want to build more confidence socially, which is a better goal?',
    options: ['Never feel nervous again', 'Always be the most interesting person', 'Take one small social risk regularly', 'Only talk when you\'re perfect'],
    correctIndex: 2,
    category: 'confidence',
    difficulty: 2,
    microTeach: 'Small, repeated risks create evidence that you can handle social discomfort.',
  },
  {
    question: 'What\'s a simple grounding exercise you can use almost anywhere?',
    options: ['Holding your breath until you feel dizzy', 'Listing every mistake you\'ve made', 'Naming 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell, 1 you can taste', 'Shouting your worries'],
    correctIndex: 2,
    category: 'calm',
    difficulty: 1,
    microTeach: 'The 5-4-3-2-1 technique anchors you in your senses and the present moment.',
  },
];

const pairs = [
  {
    cardA: 'Grounding breath',
    cardB: 'Longer exhale',
    domain: 'calm',
    difficulty: 1,
    microTeach: 'Grounding plus extended exhale work together to pull your body out of fight-or-flight.',
  },
  {
    cardA: 'Set one intention',
    cardB: 'Name one next step',
    domain: 'clarity',
    difficulty: 1,
    microTeach: 'An intention defines how you want to show up; a next step makes it actionable.',
  },
  {
    cardA: 'Posture reset',
    cardB: 'Soft eye contact',
    domain: 'confidence',
    difficulty: 1,
    microTeach: 'Upright posture and relaxed eye contact combine to signal confidence without aggression.',
  },
  {
    cardA: 'Listen fully',
    cardB: 'Reflect back',
    domain: 'connection',
    difficulty: 1,
    microTeach: 'Full presence plus reflection make others feel deeply heard.',
  },
  {
    cardA: 'Name your need',
    cardB: 'Make a simple request',
    domain: 'control',
    difficulty: 2,
    microTeach: 'Knowing what you need and stating it clearly is the heart of a healthy boundary.',
  },
  {
    cardA: 'One win from today',
    cardB: 'One thing to improve',
    domain: 'recovery',
    difficulty: 1,
    microTeach: 'Recognizing a win protects confidence; naming one improvement fuels growth.',
  },
  {
    cardA: 'Longer exhale',
    cardB: 'Slower pace of speech',
    domain: 'confidence',
    difficulty: 2,
    microTeach: 'Calm breathing lets your words slow down, making you sound more grounded and sure.',
  },
  {
    cardA: 'Phone face-down',
    cardB: 'Single-focused task',
    domain: 'clarity',
    difficulty: 1,
    microTeach: 'Removing visual triggers and choosing one task protects your attention.',
  },
  {
    cardA: 'Feel feet on the floor',
    cardB: 'Relax jaw and shoulders',
    domain: 'calm',
    difficulty: 1,
    microTeach: 'Grounding your lower body and relaxing upper tension pulls attention into the present.',
  },
  {
    cardA: 'What\'s in my control?',
    cardB: 'One small action now',
    domain: 'control',
    difficulty: 2,
    microTeach: 'Shifting from worry to control then acting interrupts helplessness.',
  },
  {
    cardA: 'Name the feeling',
    cardB: 'Name the story',
    domain: 'calm',
    difficulty: 2,
    microTeach: 'Separating raw feeling from the story you\'re telling loosens their grip.',
  },
  {
    cardA: 'Notice tension',
    cardB: 'Breathe into that spot',
    domain: 'recovery',
    difficulty: 1,
    microTeach: 'Directing breath and attention to tight areas helps muscles let go.',
  },
  {
    cardA: 'Ask one open question',
    cardB: 'Wait through the silence',
    domain: 'connection',
    difficulty: 2,
    microTeach: 'Open questions and silence invite more honest, thoughtful responses.',
  },
  {
    cardA: 'Pre-decide good enough',
    cardB: 'Stop at that point',
    domain: 'control',
    difficulty: 3,
    microTeach: 'Knowing your good enough point in advance prevents endless tweaking.',
  },
  {
    cardA: 'Short walk',
    cardB: 'No phone',
    domain: 'recovery',
    difficulty: 1,
    microTeach: 'Movement plus mental quiet clears cognitive residue from previous tasks.',
  },
  {
    cardA: 'Remember one past win',
    cardB: 'Bring that version of you into today',
    domain: 'confidence',
    difficulty: 2,
    microTeach: 'Connecting past competence to current challenges supports self-trust.',
  },
  {
    cardA: 'What matters most here?',
    cardB: 'What can I let go of?',
    domain: 'clarity',
    difficulty: 2,
    microTeach: 'Clarifying importance and release trims mental clutter around an event.',
  },
  {
    cardA: 'Say I feel...',
    cardB: 'Follow with I need...',
    domain: 'connection',
    difficulty: 2,
    microTeach: 'Linking emotion to need turns vague discomfort into clear communication.',
  },
  {
    cardA: 'Choose one tiny task',
    cardB: 'Do it for 5 minutes',
    domain: 'control',
    difficulty: 1,
    microTeach: 'Committing to a tiny window lowers resistance and often gets you started.',
  },
  {
    cardA: 'Limit doom-scroll window',
    cardB: 'Buffer with something soothing',
    domain: 'calm',
    difficulty: 3,
    microTeach: 'Containing stressful input and soothing afterward protects your nervous system.',
  },
  {
    cardA: 'Identify one supportive person',
    cardB: 'Share one honest sentence',
    domain: 'connection',
    difficulty: 2,
    microTeach: 'Reaching out breaks isolation and gives emotions a safe channel.',
  },
  {
    cardA: 'Schedule worry time',
    cardB: 'Redirect outside that window',
    domain: 'control',
    difficulty: 3,
    microTeach: 'Giving worry a time slot reduces all-day rumination.',
  },
  {
    cardA: 'Notice self-criticism',
    cardB: 'Add and I\'m learning',
    domain: 'recovery',
    difficulty: 2,
    microTeach: 'Pairing criticism with learning shifts the tone from attack to growth.',
  },
  {
    cardA: 'Choose one value',
    cardB: 'Take one aligned action',
    domain: 'confidence',
    difficulty: 3,
    microTeach: 'Values without action stay abstract; action makes them feel real and empowering.',
  },
  {
    cardA: 'Set a time boundary',
    cardB: 'End on time',
    domain: 'control',
    difficulty: 3,
    microTeach: 'Respecting your time trains others to respect it too.',
  },
  {
    cardA: 'Put it on paper',
    cardB: 'Sort into keep, park, release',
    domain: 'recovery',
    difficulty: 2,
    microTeach: 'Externalizing and sorting turns chaotic thoughts into organized decisions.',
  },
  {
    cardA: 'Notice comparison',
    cardB: 'Shift to what do I want to build?',
    domain: 'clarity',
    difficulty: 3,
    microTeach: 'Comparing drains energy; focusing on your path restores direction.',
  },
  {
    cardA: 'Check sleep, food, water',
    cardB: 'Adjust one',
    domain: 'calm',
    difficulty: 1,
    microTeach: 'Many emotional spikes intensify when basic needs are off.',
  },
  {
    cardA: 'Say not right now',
    cardB: 'Offer a concrete later time',
    domain: 'control',
    difficulty: 2,
    microTeach: 'Delaying a response gives space while maintaining respect and clarity.',
  },
  {
    cardA: 'Gratitude for one small thing',
    cardB: 'Savor it for 10 seconds',
    domain: 'recovery',
    difficulty: 1,
    microTeach: 'Noticing and lingering on small positives tilts attention away from constant threat.',
  },
  {
    cardA: 'Label the trigger',
    cardB: 'Rate intensity 1–10',
    domain: 'calm',
    difficulty: 2,
    microTeach: 'Naming triggers and intensity creates distance and trackability.',
  },
  {
    cardA: 'Choose a good enough wording',
    cardB: 'Send without over-editing',
    domain: 'clarity',
    difficulty: 3,
    microTeach: 'Accepting good enough defeats perfectionistic paralysis around communication.',
  },
  {
    cardA: 'One honest sentence to yourself',
    cardB: 'One kind sentence to yourself',
    domain: 'recovery',
    difficulty: 2,
    microTeach: 'Reality plus kindness beats denial or harshness alone.',
  },
  {
    cardA: 'What would I say to a friend?',
    cardB: 'Say that to myself',
    domain: 'confidence',
    difficulty: 1,
    microTeach: 'Using your friend voice tones down inner criticism.',
  },
  {
    cardA: 'Set a 10-minute timer',
    cardB: 'Focus on one energy leak',
    domain: 'control',
    difficulty: 2,
    microTeach: 'Short bursts aimed at one leak restore a sense of order.',
  },
  {
    cardA: 'Notice urge to avoid',
    cardB: 'Take a 10% version of the action',
    domain: 'confidence',
    difficulty: 3,
    microTeach: 'Slightly approaching what you fear teaches your brain it\'s survivable.',
  },
  {
    cardA: 'Name one thing you can\'t control',
    cardB: 'Name one thing you can',
    domain: 'control',
    difficulty: 2,
    microTeach: 'Sorting helps you stop wasting energy where you have no influence.',
  },
  {
    cardA: 'Identify your energy level',
    cardB: 'Match task difficulty to it',
    domain: 'clarity',
    difficulty: 3,
    microTeach: 'Matching tasks to energy avoids burnout and all-or-nothing cycles.',
  },
  {
    cardA: 'What am I afraid this means about me?',
    cardB: 'Challenge that assumption',
    domain: 'calm',
    difficulty: 3,
    microTeach: 'You often suffer more from the meaning you add than from the event itself.',
  },
  {
    cardA: 'Start day with one card',
    cardB: 'End day with one reflection',
    domain: 'recovery',
    difficulty: 1,
    microTeach: 'Morning intention and evening reflection create a stable rhythm for growth.',
  },
  {
    cardA: 'Name the relationship role',
    cardB: 'Ask what is realistic here',
    domain: 'connection',
    difficulty: 3,
    microTeach: 'Different roles support different expectations; realism prevents chronic disappointment.',
  },
  {
    cardA: 'Plan a micro-pleasure',
    cardB: 'Schedule it intentionally',
    domain: 'recovery',
    difficulty: 1,
    microTeach: 'Scheduled small joys counterbalance stress and give you something to look forward to.',
  },
  {
    cardA: 'Create a no template sentence',
    cardB: 'Practice saying it aloud',
    domain: 'control',
    difficulty: 3,
    microTeach: 'Having language ready makes boundaries easier to execute under pressure.',
  },
  {
    cardA: 'Scan for always or never',
    cardB: 'Replace with sometimes or this time',
    domain: 'clarity',
    difficulty: 2,
    microTeach: 'Softening extremes helps your thinking become more realistic and less harsh.',
  },
  {
    cardA: 'Ask for clarification once',
    cardB: 'Confirm what you heard',
    domain: 'connection',
    difficulty: 1,
    microTeach: 'Checking understanding reduces misunderstandings and assumptions.',
  },
  {
    cardA: 'Choose a scene for the day',
    cardB: 'Pick one action that matches it',
    domain: 'confidence',
    difficulty: 2,
    microTeach: 'Acting in line with a chosen vibe builds identity coherence.',
  },
  {
    cardA: 'Limit caffeine after a set hour',
    cardB: 'Add one calming pre-bed ritual',
    domain: 'recovery',
    difficulty: 3,
    microTeach: 'Reducing stimulation and adding a soothing cue prepares your nervous system for rest.',
  },
  {
    cardA: 'Notice urge to check your phone',
    cardB: 'Take one breath before acting',
    domain: 'control',
    difficulty: 2,
    microTeach: 'A tiny pause increases conscious choice instead of pure habit.',
  },
  {
    cardA: 'Ask what is this emotion trying to protect',
    cardB: 'Thank it silently',
    domain: 'calm',
    difficulty: 3,
    microTeach: 'Seeing emotions as protectors softens resistance and invites cooperation.',
  },
  {
    cardA: 'End day with one tiny win',
    cardB: 'End day with one tiny kindness',
    domain: 'recovery',
    difficulty: 1,
    microTeach: 'Ending on competence and care rewires how your day lands in memory.',
  },
];

async function main() {
  console.log('🌱 Starting game data seeding...');

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
          options: JSON.parse(JSON.stringify(q.options)),
          correctIndex: q.correctIndex,
          category: q.category,
          difficulty: q.difficulty,
          sceneMatch: null,
          microTeach: q.microTeach,
        },
        create: {
          id,
          question: q.question,
          options: JSON.parse(JSON.stringify(q.options)),
          correctIndex: q.correctIndex,
          category: q.category,
          difficulty: q.difficulty,
          sceneMatch: null,
          microTeach: q.microTeach,
        },
      });
    } catch (error) {
      console.error(`Error seeding question ${id}:`, error);
    }
  }

  // Seed pairs
  console.log('🎯 Seeding pairs...');
  let pairCount = 0;
  for (const p of pairs) {
    // Create a stable ID based on pair content
    const pairHash = Buffer.from(p.cardA + p.cardB).toString('base64').substring(0, 16).replace(/[^a-zA-Z0-9]/g, '');
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
    } catch (error) {
      console.error(`Error seeding pair ${id}:`, error);
    }
  }

  console.log(`✅ Seeded ${questionCount} questions and ${pairCount} pairs`);
  console.log('🎉 Game seeding complete!');
}

// Allow running as script or importing
if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Error seeding games:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { main as seedGames };
