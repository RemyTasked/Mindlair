import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const EDITORIAL_USER = {
  email: 'discover@mindlair.app',
  name: 'Mindlair Discover',
  emailVerified: new Date(),
  onboardingComplete: true,
};

interface SeedPost {
  headlineClaim: string;
  body: string;
  authorStance: 'arguing' | 'exploring' | 'steelmanning';
  topicTags: string[];
  thumbnailUrl?: string;
  source?: {
    url: string;
    title: string;
    outlet: string;
    author: string;
    contentType: 'article' | 'video' | 'podcast' | 'thread';
  };
}

const SEED_POSTS: SeedPost[] = [
  // ============================================
  // TECHNOLOGY (5 posts)
  // ============================================
  {
    headlineClaim: "AI will replace most knowledge work within 10 years",
    body: `The rapid advancement of large language models suggests a fundamental shift in how cognitive work gets done. GPT-4 already passes the bar exam, writes functional code, and drafts legal documents faster than humans.

The pattern is clear: any task that can be described in language can be automated. Customer service, content creation, data analysis, basic legal work, medical diagnosis, financial planning—all of these are being transformed.

The counterargument is that AI lacks creativity and judgment. But does most knowledge work actually require creativity? Or is it pattern matching dressed up as expertise? When you review the actual day-to-day tasks of most white-collar jobs, they're more routine than we'd like to admit.

The question isn't whether AI can do these jobs—it's already doing them. The question is how quickly the economic and social systems adapt to this new reality.`,
    authorStance: 'arguing',
    topicTags: ['technology', 'ai', 'future of work', 'automation'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    source: {
      url: 'https://www.oneusefulthing.org/p/what-ai-can-do-with-a-toolbox',
      title: 'What AI Can Do With a Toolbox',
      outlet: 'One Useful Thing',
      author: 'Ethan Mollick',
      contentType: 'article',
    },
  },
  {
    headlineClaim: "Social media algorithms are making us more politically polarized",
    body: `The filter bubble hypothesis has become conventional wisdom: algorithms show us what we want to see, creating echo chambers that radicalize our views.

But the evidence is more complicated. Large-scale studies on Facebook and Twitter found that exposure to cross-cutting content actually increased on these platforms compared to pre-social-media news consumption. We see MORE opposing views, not fewer.

The real mechanism might be different: social media doesn't hide opposing views—it presents them in the most inflammatory way possible. We see the worst arguments from the other side, strawmanned and mocked by our tribe.

Perhaps polarization isn't about bubbles. It's about seeing the other side clearly for the first time—and finding them contemptible.`,
    authorStance: 'exploring',
    topicTags: ['technology', 'social media', 'politics', 'polarization'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
    source: {
      url: 'https://www.theatlantic.com/ideas/archive/2022/04/social-media-makes-people-mean/629676/',
      title: 'Why the Past 10 Years of American Life Have Been Uniquely Stupid',
      outlet: 'The Atlantic',
      author: 'Jonathan Haidt',
      contentType: 'article',
    },
  },
  {
    headlineClaim: "Open source software is more secure than proprietary software",
    body: `The argument for open source security is elegant: more eyes mean more bugs found. When code is public, thousands of developers can audit it, identify vulnerabilities, and contribute fixes.

This is the "Linus's Law" argument: given enough eyeballs, all bugs are shallow. The track record supports this—major open source projects like Linux and OpenSSL are the backbone of global infrastructure.

But the counterexamples are damning. Heartbleed lurked in OpenSSL for two years despite theoretically being visible to anyone. The Log4j vulnerability existed for a decade in one of the most widely-used logging libraries. Having code available doesn't mean anyone is actually reading it.

The truth may be that security depends more on funding and attention than on source availability. Well-resourced proprietary software can be more secure than underfunded open source, and vice versa.`,
    authorStance: 'steelmanning',
    topicTags: ['technology', 'open source', 'security', 'software'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
    source: {
      url: 'https://www.youtube.com/watch?v=U_nK6nP_RC8',
      title: 'Why Open Source Security Matters',
      outlet: 'YouTube / Computerphile',
      author: 'Dr Mike Pound',
      contentType: 'video',
    },
  },
  {
    headlineClaim: "Cryptocurrency has no legitimate use case beyond speculation",
    body: `Thirteen years after Bitcoin's creation, we still can't point to a killer app that requires a blockchain. Every proposed use case either works better with traditional technology or serves primarily to facilitate speculation.

Payments? Visa handles 65,000 transactions per second. Bitcoin does 7. Smart contracts? Most are either trivial or fail catastrophically (see: every DeFi hack). Store of value? Tell that to anyone who bought at $65,000.

The technology is genuinely interesting—distributed consensus, cryptographic verification, permissionless innovation. But interesting technology doesn't guarantee useful applications. Flying cars are interesting too.

The strongest argument for crypto is regulatory arbitrage: doing things governments don't want you to do. Whether that's a feature or a bug depends on your view of government.`,
    authorStance: 'arguing',
    topicTags: ['technology', 'cryptocurrency', 'finance', 'speculation'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80',
    source: {
      url: 'https://www.stephendiehl.com/blog/web3-bullshit.html',
      title: 'Web3 is Bullshit',
      outlet: 'Stephen Diehl Blog',
      author: 'Stephen Diehl',
      contentType: 'article',
    },
  },
  {
    headlineClaim: "We should be much more worried about AI existential risk",
    body: `The case for AI risk is straightforward: we are building systems we don't understand that are becoming more capable each year. If we succeed in creating something smarter than us, we have no idea how to ensure it shares our values.

The alignment problem isn't about Terminator scenarios. It's about optimization pressure: an AI that optimizes for something slightly different from human flourishing might displace us as a side effect, the way we displace other species without malice.

Skeptics argue we're nowhere near such systems. But the track record of AI predictions is humbling—researchers consistently underestimate timelines. GPT-4 can already do things experts thought were decades away.

Even if risk is low, the stakes are high enough that caution seems warranted. We don't drive drunk even though most drunk drivers arrive safely.`,
    authorStance: 'arguing',
    topicTags: ['technology', 'ai', 'existential risk', 'future'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
    source: {
      url: 'https://80000hours.org/problem-profiles/artificial-intelligence/',
      title: 'Preventing an AI-related catastrophe',
      outlet: '80,000 Hours',
      author: 'Benjamin Hilton',
      contentType: 'article',
    },
  },

  // ============================================
  // PSYCHOLOGY (4 posts)
  // ============================================
  {
    headlineClaim: "Most self-help advice is unfalsifiable and therefore useless",
    body: `The self-help industry generates billions annually selling ideas that cannot be proven wrong. Consider "think positive and good things will happen." If good things happen, the advice worked. If they don't, you weren't thinking positive enough.

Karl Popper argued that claims which can't be falsified aren't scientific—they're closer to religion. By this standard, most self-help is secular theology dressed in scientific language.

But not all self-help is worthless. "Exercise improves mood" has empirical support. "Meditation reduces anxiety" has controlled studies. The question is: can you design an experiment that could prove the advice wrong?

The test for any self-help claim: what would failure look like? If there's no answer, be skeptical.`,
    authorStance: 'arguing',
    topicTags: ['psychology', 'self-improvement', 'science', 'advice'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&q=80',
    source: {
      url: 'https://open.spotify.com/episode/4Xv0i3uKd5d9s4YLZawxL0',
      title: 'The Science of Self-Help',
      outlet: 'Huberman Lab Podcast',
      author: 'Andrew Huberman',
      contentType: 'podcast',
    },
  },
  {
    headlineClaim: "Trauma is overdiagnosed and the concept has expanded beyond usefulness",
    body: `The concept of trauma has expanded from shell shock and assault to include microaggressions, difficult conversations, and uncomfortable ideas. This expansion may be doing more harm than good.

The therapeutic model tells people they are fragile, that uncomfortable experiences cause lasting damage, that recovery requires professional intervention. But humans are remarkably resilient, and most people who experience adversity don't develop PTSD.

Research on "trigger warnings" suggests they don't help—and may actually increase anxiety by implying content is dangerous. The expectation of harm can become self-fulfilling.

This doesn't mean trauma isn't real. It is, and its victims deserve support. But applying the trauma framework to ordinary difficulties may be teaching a generation to see themselves as wounded.`,
    authorStance: 'exploring',
    topicTags: ['psychology', 'trauma', 'mental health', 'resilience'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80',
    source: {
      url: 'https://www.theatlantic.com/magazine/archive/2015/09/the-coddling-of-the-american-mind/399356/',
      title: 'The Coddling of the American Mind',
      outlet: 'The Atlantic',
      author: 'Greg Lukianoff & Jonathan Haidt',
      contentType: 'article',
    },
  },
  {
    headlineClaim: "Happiness is a skill that can be trained, not just a circumstance",
    body: `We treat happiness like weather—something that happens to us based on external conditions. Research suggests otherwise.

Lottery winners return to baseline happiness within months. Paraplegics do too. The hedonic treadmill is real: we adapt to circumstances with remarkable consistency.

Meanwhile, practices like meditation, gratitude journaling, and cognitive reframing show durable effects in controlled studies. Monks with thousands of hours of meditation show measurably different brain activity.

This doesn't mean circumstances don't matter—poverty and illness genuinely reduce wellbeing. But above a basic threshold, internal determinants dominate external ones.

The implication is uncomfortable: if happiness is substantially a skill, then some of our unhappiness is, in a sense, our own responsibility.`,
    authorStance: 'arguing',
    topicTags: ['psychology', 'happiness', 'meditation', 'wellbeing'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&q=80',
    source: {
      url: 'https://www.youtube.com/watch?v=WPPPFqsECz0',
      title: 'The Neuroscience of Happiness',
      outlet: 'YouTube / Rich Roll Podcast',
      author: 'Dr. Rick Hanson',
      contentType: 'video',
    },
  },
  {
    headlineClaim: "Your personality is mostly fixed by adulthood and difficult to change",
    body: `The Big Five personality traits—openness, conscientiousness, extraversion, agreeableness, neuroticism—are remarkably stable from early adulthood onward. Twin studies suggest roughly 50% of personality variation is genetic.

Self-help culture promises transformation. Research suggests incremental adjustment at best. You can learn coping strategies for anxiety, but you probably won't become a naturally calm person. You can practice public speaking, but you probably won't become a natural extrovert.

This isn't fatalism—it's strategic self-awareness. Knowing your personality helps you choose environments where your natural tendencies are assets rather than liabilities.

The path to wellbeing may be less about changing who you are and more about finding where who you are fits.`,
    authorStance: 'arguing',
    topicTags: ['psychology', 'personality', 'self-improvement', 'identity'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    source: {
      url: 'https://open.spotify.com/episode/3lPvwI1fVHJ8yFHKpbj0oA',
      title: 'The Science of Personality',
      outlet: 'Lex Fridman Podcast',
      author: 'Jordan Peterson',
      contentType: 'podcast',
    },
  },

  // ============================================
  // ECONOMICS (5 posts)
  // ============================================
  {
    headlineClaim: "Rent control does more harm than good in housing markets",
    body: `Rent control is popular because it has obvious beneficiaries (current tenants) and hidden victims (future tenants who never find apartments).

The economic consensus is overwhelming: rent control reduces housing supply. Landlords convert to condos, neglect maintenance, or exit the market entirely. A Stanford study found that San Francisco's rent control reduced rental housing supply by 15%.

The short-term winners are current renters who lock in low prices. The long-term losers are everyone else: newcomers face tighter markets and higher prices on uncontrolled units. The overall effect is to make housing more expensive and less available.

The alternative—building more housing—is politically harder but economically superior. Tokyo has abundant, affordable housing because they build it. San Francisco has neither because they don't.`,
    authorStance: 'arguing',
    topicTags: ['economics', 'housing', 'policy', 'rent control'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    source: {
      url: 'https://www.igmchicago.org/surveys/rent-control/',
      title: 'IGM Forum: Rent Control',
      outlet: 'Chicago Booth',
      author: 'IGM Forum',
      contentType: 'article',
    },
  },
  {
    headlineClaim: "Universal Basic Income would reduce innovation by removing economic pressure",
    body: `The case against UBI isn't just fiscal—it's motivational. Necessity drives invention. The pressure to pay rent motivates work. Remove that pressure, and we might get less entrepreneurship, less risk-taking, less creation.

History suggests adversity spurs achievement. Immigrants, often fleeing difficult circumstances, start businesses at higher rates than natives. Many successful entrepreneurs describe early financial pressure as motivating.

The counterargument: most innovation comes from people with safety nets—tenured professors, trust fund kids, employees with savings. Security enables risk-taking; desperation causes short-term thinking.

Perhaps the optimal level of economic pressure isn't zero—but it also isn't "work or starve." The question is where on that spectrum we want to be.`,
    authorStance: 'steelmanning',
    topicTags: ['economics', 'ubi', 'innovation', 'policy'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
    source: {
      url: 'https://www.youtube.com/watch?v=ydKcaIE6O1k',
      title: 'UBI: The Great Debate',
      outlet: 'YouTube / Intelligence Squared',
      author: 'Various',
      contentType: 'video',
    },
  },
  {
    headlineClaim: "Most investment in actively managed funds is wasted money",
    body: `The data is unambiguous: over any 15-year period, roughly 90% of actively managed funds underperform simple index funds. After fees, the average active investor does worse than the market average.

This isn't because fund managers are stupid. It's because markets are efficient enough that consistent outperformance is nearly impossible. Every trade has a counterparty who thinks they're right. On average, they're both wrong after fees.

The survivor bias makes active management look better than it is. We remember the Warren Buffetts and forget the thousands of funds that quietly closed after underperforming.

The optimal strategy for most investors is boring: buy a diversified index fund, contribute regularly, and ignore market news. You'll beat most professionals by doing less.`,
    authorStance: 'arguing',
    topicTags: ['economics', 'investing', 'personal finance', 'money'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
    source: {
      url: 'https://jlcollinsnh.com/2012/04/15/stocks-part-1-theres-a-major-market-crash-coming-and-dr-lo-cant-save-you/',
      title: 'The Stock Series',
      outlet: 'JL Collins Blog',
      author: 'JL Collins',
      contentType: 'article',
    },
  },
  {
    headlineClaim: "College degrees have become expensive signals with diminishing educational value",
    body: `The average college graduate spends $100,000+ and four years to demonstrate... what exactly?

Bryan Caplan's research suggests 80% of education's value is signaling, not learning. Employers don't care what you learned in art history—they care that you could complete four years of arbitrary requirements. The degree signals conscientiousness and conformity.

Evidence: grade inflation means a 3.0 today would have been a 2.3 in 1980. Credits required for graduation have dropped. Time spent studying has fallen from 24 hours/week to 14. Yet graduate salaries keep rising relative to non-graduates.

If college taught valuable skills, skills would matter more than credentials. Instead, graduating matters far more than what you actually learned. This creates a tragic arms race.`,
    authorStance: 'arguing',
    topicTags: ['economics', 'education', 'signaling', 'credentials'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
    source: {
      url: 'https://www.econtalk.org/bryan-caplan-on-the-case-against-education/',
      title: 'Bryan Caplan on The Case Against Education',
      outlet: 'EconTalk',
      author: 'Bryan Caplan',
      contentType: 'podcast',
    },
  },
  {
    headlineClaim: "Your personal history with money shapes your financial decisions more than any financial education",
    body: `A child of the Great Depression and a child of the 1990s bull market will make systematically different financial decisions—not because one is smarter, but because they have different emotional reference points.

Morgan Housel's insight is that financial decision-making is not primarily about spreadsheets. It's about narratives: what money means to you, what risks feel tolerable, what wealth looks like.

This explains why financial education often fails. You can tell someone that market timing doesn't work, but if they lived through 2008, their body remembers panic. Knowledge and behavior are different systems.

The path to better financial decisions isn't just learning the math—it's understanding your own money story and how it biases your choices.`,
    authorStance: 'arguing',
    topicTags: ['economics', 'money', 'psychology', 'personal finance'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
    source: {
      url: 'https://collabfund.com/blog/the-psychology-of-money/',
      title: 'The Psychology of Money',
      outlet: 'Collaborative Fund',
      author: 'Morgan Housel',
      contentType: 'article',
    },
  },

  // ============================================
  // HEALTH (4 posts)
  // ============================================
  {
    headlineClaim: "Morning sunlight exposure is the most effective tool for regulating your circadian rhythm",
    body: `The master clock in your brain—the suprachiasmatic nucleus—sets itself primarily through light exposure to the eyes. Morning sunlight is the strongest signal for synchronizing this clock.

Get 10-30 minutes of sunlight within an hour of waking (more on cloudy days), and you set a cascade of hormonal events: cortisol rises appropriately in the morning, melatonin is suppressed, and 12-14 hours later, melatonin rises to promote sleep.

This is more effective than any supplement, app, or sleep hack. It's also free and has no side effects beyond occasional squinting.

The modern problem is that we live in light environments our biology never anticipated—dim indoors during the day, bright screens at night. We've inverted the natural signal.`,
    authorStance: 'arguing',
    topicTags: ['health', 'sleep', 'circadian rhythm', 'neuroscience'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=800&q=80',
    source: {
      url: 'https://hubermanlab.com/master-your-sleep-and-be-more-alert-when-awake/',
      title: 'Master Your Sleep & Be More Alert When Awake',
      outlet: 'Huberman Lab Podcast',
      author: 'Andrew Huberman',
      contentType: 'podcast',
    },
  },
  {
    headlineClaim: "Processed food is designed to override your satiety signals and cause overeating",
    body: `Ultra-processed foods are engineered for "bliss point"—the combination of salt, sugar, and fat that maximizes craving while minimizing satisfaction. They are designed to be easy to overeat.

The evidence: people eat roughly 500 more calories per day when given access to ultra-processed versus unprocessed food with identical macronutrients and palatability ratings. Something about processing itself drives overconsumption.

The mechanism may involve how quickly these foods are absorbed. Whole foods require digestion; processed foods hit your bloodstream immediately. The faster the spike, the faster the crash, the sooner the craving returns.

This doesn't mean all processed food is poison. But understanding that these products are optimized for consumption, not satiation, is useful for making informed choices.`,
    authorStance: 'arguing',
    topicTags: ['health', 'nutrition', 'food', 'obesity'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=800&q=80',
    source: {
      url: 'https://www.youtube.com/watch?v=aO31M8CKwWk',
      title: 'Why Are We Eating So Much?',
      outlet: 'YouTube / Kurzgesagt',
      author: 'Kurzgesagt',
      contentType: 'video',
    },
  },
  {
    headlineClaim: "Strength training is more important than cardio for long-term health",
    body: `The health establishment has emphasized aerobic exercise for decades. But emerging research suggests resistance training may matter more for longevity.

Muscle mass is the single biggest predictor of all-cause mortality in older adults. Sarcopenia—age-related muscle loss—predicts falls, fractures, metabolic disease, and death. You can't cardio your way out of this.

Strength training builds muscle, improves insulin sensitivity, increases bone density, and preserves functional independence. A 70-year-old who can get up from a chair without using their arms has a dramatically better prognosis than one who can't.

This doesn't mean cardio is worthless—it's great for heart and brain. But if you're choosing one form of exercise, and especially as you age, lifting weights may be the higher priority.`,
    authorStance: 'arguing',
    topicTags: ['health', 'fitness', 'longevity', 'strength training'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    source: {
      url: 'https://peterattiamd.com/how-to-slow-the-aging-process/',
      title: 'How to Slow the Aging Process',
      outlet: 'Peter Attia MD',
      author: 'Peter Attia',
      contentType: 'article',
    },
  },
  {
    headlineClaim: "Most nutritional research is so flawed that we should ignore most diet studies",
    body: `Nutritional epidemiology has a replication crisis. Studies linking red meat to cancer, eggs to heart disease, and fat to obesity have repeatedly failed to hold up. The effect sizes are tiny, the confounders enormous, and the conclusions often reversed.

The methodological problems are fundamental. Most nutrition studies rely on food frequency questionnaires asking people to remember what they ate months ago. They compare populations with dozens of lifestyle differences beyond diet. They confuse correlation with causation.

When randomized controlled trials are done—the gold standard—they often contradict observational findings. The Framingham Study found no link between cholesterol intake and blood cholesterol. The Women's Health Initiative found low-fat diets didn't reduce heart disease.

The honest answer to "what should I eat?" might be: we don't really know, and anyone who's confident is probably oversimplifying.`,
    authorStance: 'arguing',
    topicTags: ['health', 'nutrition', 'science', 'research'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
    source: {
      url: 'https://www.youtube.com/watch?v=xAdqLB6bTuQ',
      title: 'Why Most Nutrition Research is Unreliable',
      outlet: 'YouTube / What Ive Learned',
      author: 'What Ive Learned',
      contentType: 'video',
    },
  },

  // ============================================
  // PHILOSOPHY (4 posts)
  // ============================================
  {
    headlineClaim: "Free will is incompatible with what neuroscience tells us about the brain",
    body: `Your brain decides before "you" do. In the famous Libet experiments, brain activity predicting a decision occurred 300ms before subjects reported "deciding." Subsequent studies pushed this to 7-10 seconds for some decisions.

Every thought arises from prior causes: genetics, upbringing, brain chemistry, the last thing you ate. You didn't choose your genes. You didn't choose your parents. You didn't choose the neural architecture that generates your "choices."

The counterarguments are sophisticated: maybe free will doesn't require being uncaused, just being uncoerced. Maybe consciousness plays a causal role we don't yet understand.

But if determinism is true, does anything change? We'd still need prisons (to deter and contain), still feel love (determined or not), still experience choice (even if illusory). The question is whether "moral responsibility" survives.`,
    authorStance: 'arguing',
    topicTags: ['philosophy', 'free will', 'neuroscience', 'consciousness'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80',
    source: {
      url: 'https://samharris.org/podcasts/free-will-revisited/',
      title: 'Free Will Revisited',
      outlet: 'Making Sense Podcast',
      author: 'Sam Harris',
      contentType: 'podcast',
    },
  },
  {
    headlineClaim: "We should take seriously the possibility that we're living in a simulation",
    body: `Nick Bostrom's simulation argument is simple and has never been refuted. One of these must be true: (1) civilizations destroy themselves before creating simulations, (2) advanced civilizations choose not to run simulations, or (3) we are almost certainly in a simulation.

Why? If civilizations CAN and DO run ancestor simulations, they'd run billions of them. The ratio of simulated beings to real beings would be billions to one. Any randomly selected conscious being is therefore almost certainly simulated.

The counterarguments are weak: "We can't simulate consciousness" (we don't know that). "It would require too much compute" (our video games already simulate billions of entities). "It's unfalsifiable" (so was the heliocentric model initially).

Does it matter? Perhaps not practically. But it should introduce humility about the nature of reality.`,
    authorStance: 'exploring',
    topicTags: ['philosophy', 'simulation theory', 'reality', 'consciousness'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
    source: {
      url: 'https://www.simulation-argument.com/simulation.html',
      title: 'Are You Living in a Simulation?',
      outlet: 'Philosophical Quarterly',
      author: 'Nick Bostrom',
      contentType: 'article',
    },
  },
  {
    headlineClaim: "Effective altruism is the most rigorous framework for doing good",
    body: `The core insight of effective altruism is simple: if you want to help others, you should figure out how to help the most. This means comparing interventions, considering counterfactuals, and following evidence rather than emotion.

The results are striking. Distributing malaria nets saves a life for roughly $5,000. The same amount spent on guide dogs for the blind yields perhaps 1% of that impact. Emotional resonance and effectiveness are not correlated.

Critics argue EA is cold, that it reduces charity to calculation, that it privileges quantifiable outcomes over justice and solidarity.

But the alternative—giving based on feelings—systematically allocates resources to whatever tugs heartstrings rather than whatever helps most. If you genuinely care about the beneficiaries rather than your own warm glow, shouldn't you want to help effectively?`,
    authorStance: 'arguing',
    topicTags: ['philosophy', 'effective altruism', 'ethics', 'charity'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&q=80',
    source: {
      url: 'https://www.youtube.com/watch?v=Diuv3XZQXyc',
      title: 'The Life You Can Save',
      outlet: 'TEDx',
      author: 'Peter Singer',
      contentType: 'video',
    },
  },
  {
    headlineClaim: "Moral progress is real and measurable across human history",
    body: `Violence has declined dramatically over centuries. Slavery, once universal, is now universally condemned. Rights have expanded to include previously excluded groups. Torture and cruel punishment have retreated. The circle of moral concern keeps widening.

Steven Pinker documents this in exhaustive detail. Per-capita violence has fallen by orders of magnitude. Wars between great powers have nearly ceased. Even with the horrors of the 20th century, your odds of dying violently are lower than at any point in history.

The skeptical view: moral progress is an illusion. We've just changed what we condemn, not become more moral. And the potential for atrocity remains—give people the right circumstances and they'll do terrible things.

But if reducing suffering is the measure, the trend is clear. We may not be getting morally better—but we're getting morally better organized.`,
    authorStance: 'arguing',
    topicTags: ['philosophy', 'morality', 'progress', 'history'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1529390079861-591f89a8d970?w=800&q=80',
    source: {
      url: 'https://www.youtube.com/watch?v=ramBFRt1Uzk',
      title: 'Is the World Getting Better or Worse?',
      outlet: 'TED',
      author: 'Steven Pinker',
      contentType: 'video',
    },
  },

  // ============================================
  // CULTURE (4 posts)
  // ============================================
  {
    headlineClaim: "Meritocracy is a myth that justifies existing inequality",
    body: `The American dream says anyone can make it if they work hard enough. The data says your zip code at birth predicts your zip code at death.

Social mobility in the US is lower than in most developed countries. A child born poor has a 4% chance of reaching the top quintile. The biggest predictor of your income is your parents' income.

But we NEED to believe in meritocracy. If success comes from effort, then the successful deserve their wealth and the poor deserve their poverty. The myth does ideological work: it transforms a system that advantages the already-advantaged into a fair competition.

The tension: if we acknowledge that success is largely luck, how do we motivate effort? And if we pretend it's merit, how do we justify not helping those who "failed"?`,
    authorStance: 'exploring',
    topicTags: ['culture', 'meritocracy', 'inequality', 'social mobility'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    source: {
      url: 'https://www.theatlantic.com/magazine/archive/2018/06/the-birth-of-a-new-american-aristocracy/559130/',
      title: 'The Birth of a New American Aristocracy',
      outlet: 'The Atlantic',
      author: 'Matthew Stewart',
      contentType: 'article',
    },
  },
  {
    headlineClaim: "Cancel culture is the modern equivalent of religious shunning",
    body: `The pattern is ancient: someone violates community norms, the group mobilizes to exclude them, and the transgressor loses status, livelihood, or social connection. The mechanism is shame, amplified by collective action.

What's new is the technology. Social media enables mobs to form instantly across vast distances, amplifies the most extreme voices, and creates permanent records of alleged transgressions. The punishment is often disproportionate to the offense.

Defenders argue this is accountability, not cancellation. Powerful people facing consequences for harmful actions is justice, not mob rule.

But the mechanism doesn't distinguish between genuine accountability and pile-ons for minor mistakes or misunderstandings. When the punishment is loss of livelihood for an awkward joke, something has gone wrong.`,
    authorStance: 'exploring',
    topicTags: ['culture', 'cancel culture', 'social media', 'speech'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800&q=80',
    source: {
      url: 'https://www.nytimes.com/2020/07/14/opinion/cancel-culture-free-speech.html',
      title: 'A Letter on Justice and Open Debate',
      outlet: 'Harpers',
      author: 'Various',
      contentType: 'article',
    },
  },
  {
    headlineClaim: "The decline of religion has left a meaning-shaped hole that politics is filling",
    body: `Humans need frameworks for meaning, community, and moral identity. Religion provided these for millennia. As religious participation declines, something must fill the void.

Politics increasingly serves religious functions: it provides an explanation for suffering (oppression, corruption), a path to salvation (the right policies), a community of believers, and heretics to oppose. Political identities have become tribal identities.

This explains why political disagreements feel existential, why compromise seems like betrayal, why partisans describe opponents in moral terms. We're not debating policy—we're fighting a religious war.

The solution isn't obvious. You can't just tell people to care less about politics. But recognizing the religious shape of political passion might help us respond with less fervor and more charity.`,
    authorStance: 'arguing',
    topicTags: ['culture', 'religion', 'politics', 'meaning'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&q=80',
    source: {
      url: 'https://open.spotify.com/episode/1bXLKWPKNOEfQ4LCnrYSjd',
      title: 'Our New Religious Politics',
      outlet: 'Ezra Klein Show',
      author: 'Ezra Klein',
      contentType: 'podcast',
    },
  },
  {
    headlineClaim: "Social media is making us lonelier, not more connected",
    body: `We have more ways to connect than ever before, and loneliness has reached epidemic levels. Since 2010, teen depression has increased 60%. Young people report having fewer close friends. Time spent with friends in person has dropped by nearly half.

The mechanisms are plausible: social media provides the illusion of connection without the vulnerability of real intimacy. We curate highlight reels instead of sharing struggles. We accumulate followers instead of deepening friendships.

But correlation isn't causation. Loneliness was rising before social media. Economic precarity, geographic mobility, and declining community institutions all play roles.

The honest answer is: we don't know yet. The experiment is still running, and we're all subjects.`,
    authorStance: 'exploring',
    topicTags: ['culture', 'social media', 'loneliness', 'mental health'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80',
    source: {
      url: 'https://www.youtube.com/watch?v=I9hJ_Rux9y0',
      title: 'Is Social Media Hurting Your Mental Health?',
      outlet: 'TEDx',
      author: 'Bailey Parnell',
      contentType: 'video',
    },
  },

  // ============================================
  // PRODUCTIVITY (4 posts)
  // ============================================
  {
    headlineClaim: "The 40-hour work week is an arbitrary relic with no scientific basis",
    body: `We work 40 hours because Henry Ford said so. In 1926, Ford discovered that reducing hours from 48 to 40 increased productivity in his factories. This made sense for repetitive manual labor where fatigue causes errors.

But knowledge work isn't factory work. Studies consistently show that cognitive workers are productive for about 4-6 hours daily. After that, quality drops, errors increase, and we just look busy.

Companies experimenting with 4-day weeks report maintained or increased productivity with dramatic improvements in wellbeing. But widespread adoption threatens something deeper: if we can do the work in less time, what justifies the salary?

Perhaps the 40-hour week persists not because it's optimal, but because it's psychologically necessary—a way to justify compensation and structure life.`,
    authorStance: 'arguing',
    topicTags: ['productivity', 'work', 'work-life balance', 'culture'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=800&q=80',
    source: {
      url: 'https://www.newyorker.com/culture/office-space/the-frustration-with-productivity-culture',
      title: 'The Frustration with Productivity Culture',
      outlet: 'The New Yorker',
      author: 'Cal Newport',
      contentType: 'article',
    },
  },
  {
    headlineClaim: "Deep work is becoming both rarer and more valuable",
    body: `Cal Newport defines deep work as cognitively demanding tasks performed without distraction. It's becoming rare because modern workplaces are optimized for the opposite: constant communication, open offices, and always-on availability.

This creates an arbitrage opportunity. In a world of distraction, the ability to focus for extended periods is a superpower. The knowledge workers who can produce deeply will outcompete those who can only work shallowly.

The implications are practical: protect blocks of uninterrupted time, resist the urge to constantly check email, batch communication, and treat attention as a scarce resource.

Most people won't do this. The social pressure toward availability is intense. But that's precisely what makes the skill valuable.`,
    authorStance: 'arguing',
    topicTags: ['productivity', 'focus', 'work', 'attention'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1483058712412-4245e9b90334?w=800&q=80',
    source: {
      url: 'https://www.youtube.com/watch?v=gTaJhjQHcf8',
      title: 'Deep Work: Rules for Focused Success',
      outlet: 'YouTube / Cal Newport',
      author: 'Cal Newport',
      contentType: 'video',
    },
  },
  {
    headlineClaim: "Most productivity advice optimizes the wrong variable",
    body: `Productivity culture focuses on efficiency: doing more in less time. But efficiency only matters if you're doing the right things. Most people don't have a time management problem—they have a priority problem.

Greg McKeown's insight: the word "priority" was singular until the 20th century. You can't have multiple top priorities. Yet we pretend we can, scattering attention across dozens of "important" tasks.

The highest-leverage move isn't optimizing your todo list—it's deleting items from it. Not finding better ways to do things, but finding things that don't need to be done at all.

The uncomfortable truth: saying yes to something means saying no to everything else. Every commitment has an opportunity cost. The disciplined pursuit of less may matter more than the frantic pursuit of more.`,
    authorStance: 'arguing',
    topicTags: ['productivity', 'priorities', 'essentialism', 'focus'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
    source: {
      url: 'https://tim.blog/2020/09/14/greg-mckeown-essentialism/',
      title: 'Greg McKeown on Essentialism',
      outlet: 'Tim Ferriss Show',
      author: 'Greg McKeown',
      contentType: 'podcast',
    },
  },
  {
    headlineClaim: "Great work comes from following curiosity, not chasing what seems important",
    body: `Paul Graham argues that the path to exceptional work starts with genuine curiosity, not strategic career planning. The people who do great work are usually those who found a problem so interesting they couldn't stop thinking about it.

This is counterintuitive. We're told to identify important problems and work on them. But importance is socially determined and often wrong. What's obviously important is usually crowded. What's genuinely interesting to you specifically may be underexplored.

The strategy: notice what you're drawn to when no one is watching. What do you read when you don't have to? What questions won't leave you alone? That's probably where your best work lies.

The risk is that your interests don't lead anywhere useful. But the alternative—forcing yourself to care about "important" things—usually produces mediocre work. Genuine curiosity is too rare and valuable to waste.`,
    authorStance: 'arguing',
    topicTags: ['productivity', 'creativity', 'career', 'curiosity'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?w=800&q=80',
    source: {
      url: 'https://paulgraham.com/greatwork.html',
      title: 'How to Do Great Work',
      outlet: 'Paul Graham Essays',
      author: 'Paul Graham',
      contentType: 'article',
    },
  },

  // ============================================
  // SPORTS (5 posts)
  // ============================================
  {
    headlineClaim: "The 'hot hand' in basketball is real enough that teams should act like it is",
    body: `For decades, textbooks said streak shooting was a cognitive illusion — randomness dressed up as momentum. Newer work with richer data and better models suggests the effect is small but not always zero, and the cost of ignoring a heating shooter is asymmetric.

Even if you are skeptical of the effect size, defense and play-calling already behave as if heat exists: switches, traps, and late-clock isolations track who "has it tonight." The interesting debate is not binary; it is when belief outruns evidence and when ignoring the signal is lazier than testing it.

A falsifiable claim: over a large sample, conditional on shot quality proxies, recent makes still predict the next attempt slightly better than coin-flips would. If that holds, "ride the hot hand" is not superstition — it is a modest edge managers should price correctly.`,
    authorStance: 'arguing',
    topicTags: ['sports', 'basketball', 'statistics', 'decision-making'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
  },
  {
    headlineClaim: "Salary caps mostly shuffle who gets paid, not whether owners keep surplus",
    body: `Caps are sold as competitive balance and fan fairness. They also function as a coordinated brake on labor's share of league revenue. Stars still capture huge upside; the middle class and rookies absorb more of the compression.

The test is what happens to total player compensation versus revenue over time, and how risk shifts to shorter contracts, incentives, and non-guaranteed money. Fans get closer games on paper; unions negotiate harder for exceptions.

If you want parity, caps help a little. If you want labor power, caps are a feature, not a bug, for franchise balance sheets — and the debate should name that tradeoff honestly.`,
    authorStance: 'exploring',
    topicTags: ['sports', 'economics', 'labor', 'policy'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  },
  {
    headlineClaim: "Youth sports have become a pay-to-play pipeline that screens for income, not love of the game",
    body: `Travel teams, private coaching, and tournament fees filter who stays in the funnel by middle school. Talent exists everywhere; access does not. The result is a narrower base and a stranger merit story than we tell on broadcast.

Reform is not "abolish competitive sports." It is subsidized leagues, better public facilities, sane scheduling so multi-sport kids exist, and coaches paid like educators when programs claim developmental missions.

The claim worth arguing: countries and communities that widen early access see better late-stage outcomes — not because everyone goes pro, but because more kids stay active and the talent pool deepens.`,
    authorStance: 'steelmanning',
    topicTags: ['sports', 'youth', 'inequality', 'health'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80',
  },
  {
    headlineClaim: "Fourth-and-short aggression is correct often enough that conservative punting is a market inefficiency",
    body: `Expected points models have been screaming for years: midfield fourth-and-short is frequently worth more than a punt's field-position lottery. Coaches still punt because job risk is asymmetric — a failed gamble is memorable; a wasted possession is noise.

As analytics staffs grow, you see more go-for-it calls, but culture lags spreadsheets. Fans reward "guts" only when it works; media narratives punish failures on repeat.

If decision-makers internalized base rates instead of highlights, we'd see fewer surrender punts and more honest postgame explanations than "we liked our defense today."`,
    authorStance: 'arguing',
    topicTags: ['sports', 'football', 'analytics', 'strategy'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80',
  },
  {
    headlineClaim: "National-team fandom is cosplay with a passport — and that is mostly fine",
    body: `You did not clear a hurdle at dawn or scout teenagers in the rain. You bought a scarf and learned two chants. The emotional payoff is still real: synchronized hope, strangers hugging, a calendar event that is not about work.

Critics say it is manufactured identity. Maybe — but so are a lot of healthy rituals. The line is when nationalism curdles into hostility; the game is an excuse either way.

Enjoy the tournament. Tip your bartender. Remember the athletes did the work; you did the cheering — both can matter without pretending they're the same job.`,
    authorStance: 'exploring',
    topicTags: ['sports', 'culture', 'identity', 'fandom'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&q=80',
  },

  // ============================================
  // Playful / everyday Discover mix (shorter)
  // ============================================
  {
    headlineClaim: "Cereal is absolutely a soup and we need to stop pretending otherwise",
    body: `Hear me out: liquid base, solid bits floating in it, eaten with a spoon. If gazpacho counts, breakfast cereal counts.

The pushback is always "but it's cold" — so is vichyssoise. "But it's sweet" — tomato soup exists. I'm not saying you serve Cheerios at a dinner party. I'm saying taxonomically we're all in denial.

The real reason we resist: calling it soup makes us feel silly. Embrace the soup. Life is short.`,
    authorStance: 'arguing',
    topicTags: ['culture', 'food', 'humor'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=800&q=80',
  },
  {
    headlineClaim: "Replying 'k' to a paragraph text should be a misdemeanor",
    body: `You got three heartfelt sentences and a question. They got one letter. Not even uppercase. Linguists should study this as a form of emotional minimalism.

I'm not asking for a thesis. A thumbs-up emoji carries more semantic weight. "Ok" with two letters is already luxury service.

If you're busy, say you're busy. If you're annoyed, say you're annoyed. 'k' is the Schrödinger's reply — simultaneously fine and fighting words.`,
    authorStance: 'steelmanning',
    topicTags: ['culture', 'communication', 'relationships'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=800&q=80',
  },
  {
    headlineClaim: "The best seat on a plane is the aisle and I will not be taking questions",
    body: `Window people talk about views. On a six-hour flight you're looking at a wing and regret. Aisle: bathroom freedom, stretch-a-leg rights, and you escape first when the person next to you won't stop talking about crypto.

Middle seat should come with a federal subsidy. Window is for people who can sleep sitting up — a superpower I respect from afar.

Fight me in the galley.`,
    authorStance: 'arguing',
    topicTags: ['culture', 'travel', 'opinions'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80',
  },
  {
    headlineClaim: "Dogs who make eye contact while pooping deserve extra treats",
    body: `It's vulnerable. They're saying "I trust you with this moment." The least we can do is nod respectfully and maybe upgrade the kibble.

Cats would never. Cats would sue for invasion of privacy. Dogs are optimists in a cynical world.

Science might say it's pack behavior. I say it's performance art. Either way: treat budget line item.`,
    authorStance: 'exploring',
    topicTags: ['culture', 'pets', 'humor'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80',
  },
  {
    headlineClaim: "Brunch is just lunch with better PR and worse lines",
    body: `You waited 90 minutes for eggs that cost $4 at home. The mimosa is orange juice doing cosplay. Nobody needs a waffle tower before noon except Instagram.

That said: I'll still go. The social contract of brunch is powerful. We're all pretending this is a meal and not a group therapy session with hollandaise.

Peak brunch is 11:02 a.m., slightly hungover, someone says "we should do this more often," and nobody means it.`,
    authorStance: 'exploring',
    topicTags: ['culture', 'food', 'social'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80',
  },
  {
    headlineClaim: "Hot yoga is just regular yoga with extra drama and a smell",
    body: `You paid to do sun salutations in a rainforest simulator. Respect. I tried once and learned my body does not consent to being a human dumpling.

Fans say the sweat is detox. Skeptics say it's water. Both sides agree: you will never find your towel again.

If it makes you feel alive, keep going. If it makes you dizzy, that's also data.`,
    authorStance: 'steelmanning',
    topicTags: ['health', 'fitness', 'culture'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
  },
  {
    headlineClaim: "Pineapple on pizza is fine; the real crime is bad crust",
    body: `We've been arguing about fruit while ignoring structural engineering. A soggy base ruins everything — pepperoni, politics, your will to live.

Sweet + salty works everywhere else: fries and shakes, prosciutto and melon, me and regret after midnight snacks.

Order what you like. Judge the dough first.`,
    authorStance: 'arguing',
    topicTags: ['culture', 'food', 'humor'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  },
  {
    headlineClaim: "Group chats should have term limits like elected office",
    body: `Year three of the same meme format. Someone's cousin's fundraiser every Tuesday. The mute button is democracy's last hope.

Small groups stay golden. At fifteen people you're not chatting — you're receiving a newsletter you didn't subscribe to.

Proposed rule: annual retention vote. Majority keeps the chat; minority starts a splinter faction that dies in a week.`,
    authorStance: 'exploring',
    topicTags: ['culture', 'technology', 'social'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800&q=80',
  },
  {
    headlineClaim: "The five-second rule is optimistic engineering, not food safety",
    body: `Floors have opinions about your snack. That opinion is "hello." Bacteria don't respect your stopwatch.

In practice: dry cracker, clean-ish kitchen, you're probably fine. Wet food, public sidewalk, maybe let it go.

The rule survives because hope sells better than microbiology. I'm still picking up the good chip. We contain multitudes.`,
    authorStance: 'exploring',
    topicTags: ['health', 'culture', 'humor'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80',
  },
  {
    headlineClaim: "Monday meetings should be illegal before coffee has kicked in",
    body: `Nothing important has ever been decided in the first 15 minutes of Monday except "whose turn was it to book the room."

Productivity isn't about more meetings — it's about fewer meetings where everyone is a NPC until 10 a.m.

Async updates exist. Use them. Save the circle of trust for when pupils are functional.`,
    authorStance: 'arguing',
    topicTags: ['productivity', 'work', 'culture'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
  },
  {
    headlineClaim: "Rom-coms lied: the grand gesture is usually just good listening",
    body: `Airport sprints are cinematic. Remembering their mom's name is sustainable.

Hollywood sells peaks; relationships run on maintenance mode. Boring is underrated. Boring is "I picked up milk without being asked."

Grand gestures are fun once. Consistency is the long game. Sorry to whoever paid for a flash mob.`,
    authorStance: 'steelmanning',
    topicTags: ['psychology', 'culture', 'relationships'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80',
  },
  {
    headlineClaim: "Economics is just vibes with spreadsheets",
    body: `Inflation feels like the universe charging a convenience fee. Interest rates are a mood ring for central bankers. We're all guessing with confidence.

That doesn't mean data is useless — it means humility is part of the toolkit. The joke is anyone who says they fully understand the economy while sober.

Buy the coffee. Save a little. Panic-read one headline. Repeat.`,
    authorStance: 'exploring',
    topicTags: ['economics', 'culture', 'humor'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80',
  },
  {
    headlineClaim: "Philosophy of socks: losing one in the dryer is a metaphor for adulthood",
    body: `You started with pairs. You end with an orphan drawer and denial. The dryer didn't eat it — entropy did.

Stoics would say focus on what you control: buy identical socks. Existentialists would say the missing sock is freedom. I'm saying buy a mesh bag.

Wisdom is expensive at Target but worth it.`,
    authorStance: 'exploring',
    topicTags: ['philosophy', 'culture', 'humor'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&q=80',
  },
  {
    headlineClaim: "Scrolling in bed is not rest — it's a second shift with worse lighting",
    body: `Your brain thinks it's still on duty. Blue light, tiny stress hits, infinite tab. Morning-you files a complaint; night-you ignores HR.

Real rest is boring: dark room, no plot twist. Phones are pocket casinos dressed as tools.

I'm not your parent. I'm the voice you already knew was right when you said "just five more minutes."`,
    authorStance: 'arguing',
    topicTags: ['health', 'psychology', 'technology'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=800&q=80',
  },
  {
    headlineClaim: "Fantasy football is cosplay for people who own khakis",
    body: `You're a general manager for imaginary points. The trash talk is real. The trophy is plastic. The bond is oddly sincere.

Sports analytics meet group chat chaos. Nobody reads the waiver wire until 11:58 p.m.

Hate the game or love it — either way you're still checking injuries on a Tuesday.`,
    authorStance: 'exploring',
    topicTags: ['sports', 'culture', 'social'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80',
  },
  {
    headlineClaim: "The best productivity hack is admitting you will never inbox zero",
    body: `Peace isn't empty — it's negotiated surrender. Filters, snooze, and the sacred art of "not my problem."

Inbox zero is a personality for people who enjoy winning against email. For the rest of us: good enough is a feature.

Close the laptop. The emails will wait. They always do.`,
    authorStance: 'steelmanning',
    topicTags: ['productivity', 'psychology', 'culture'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&q=80',
  },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Create or find editorial user
  const editorialUser = await db.user.upsert({
    where: { email: EDITORIAL_USER.email },
    update: {},
    create: EDITORIAL_USER,
  });

  console.log(`✓ Editorial user: ${editorialUser.email}`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const post of SEED_POSTS) {
    // Check if post already exists (by headline claim)
    const existing = await db.post.findFirst({
      where: {
        authorId: editorialUser.id,
        headlineClaim: post.headlineClaim,
      },
    });

    if (existing) {
      skippedCount++;
      continue;
    }

    // Create source if provided
    let sourceId: string | undefined;
    if (post.source) {
      const source = await db.source.create({
        data: {
          userId: editorialUser.id,
          url: post.source.url,
          title: post.source.title,
          outlet: post.source.outlet,
          author: post.source.author,
          contentType: post.source.contentType,
          surface: 'editorial_seed',
          consumedAt: new Date(),
        },
      });
      sourceId = source.id;
    }

    // Create post
    await db.post.create({
      data: {
        authorId: editorialUser.id,
        headlineClaim: post.headlineClaim,
        body: post.body,
        authorStance: post.authorStance,
        topicTags: post.topicTags,
        thumbnailUrl: post.thumbnailUrl || null,
        status: 'published',
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
        sourceId,
      },
    });

    createdCount++;
  }

  console.log(`✓ Created ${createdCount} posts`);
  if (skippedCount > 0) {
    console.log(`  (skipped ${skippedCount} existing posts)`);
  }

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
