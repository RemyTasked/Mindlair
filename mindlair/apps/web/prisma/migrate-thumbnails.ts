import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const THUMBNAIL_MAP: Record<string, string> = {
  // TECHNOLOGY
  "AI will replace most knowledge work within 10 years": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
  "Social media algorithms are making us more politically polarized": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
  "Open source software is more secure than proprietary software": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
  "Cryptocurrency has no legitimate use case beyond speculation": "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
  "We should be much more worried about AI existential risk": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80",

  // PSYCHOLOGY
  "Most self-help advice is unfalsifiable and therefore useless": "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&q=80",
  "Trauma is overdiagnosed and the concept has expanded beyond usefulness": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80",
  "Happiness is a skill that can be trained, not just a circumstance": "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&q=80",
  "Your personality is mostly fixed by adulthood and difficult to change": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",

  // ECONOMICS
  "Rent control does more harm than good in housing markets": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80",
  "Universal Basic Income would reduce innovation by removing economic pressure": "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80",
  "Most investment in actively managed funds is wasted money": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  "College degrees have become expensive signals with diminishing educational value": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
  "Your personal history with money shapes your financial decisions more than any financial education": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",

  // HEALTH
  "Morning sunlight exposure is the most effective tool for regulating your circadian rhythm": "https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=800&q=80",
  "Processed food is designed to override your satiety signals and cause overeating": "https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=800&q=80",
  "Strength training is more important than cardio for long-term health": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  "Most nutritional research is so flawed that we should ignore most diet studies": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",

  // PHILOSOPHY
  "Free will is incompatible with what neuroscience tells us about the brain": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80",
  "We should take seriously the possibility that we're living in a simulation": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80",
  "Effective altruism is the most rigorous framework for doing good": "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&q=80",
  "Moral progress is real and measurable across human history": "https://images.unsplash.com/photo-1529390079861-591f89a8d970?w=800&q=80",

  // CULTURE
  "Meritocracy is a myth that justifies existing inequality": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
  "Cancel culture is the modern equivalent of religious shunning": "https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800&q=80",
  "The decline of religion has left a meaning-shaped hole that politics is filling": "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&q=80",
  "Social media is making us lonelier, not more connected": "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80",

  // PRODUCTIVITY
  "The 40-hour work week is an arbitrary relic with no scientific basis": "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=800&q=80",
  "Deep work is becoming both rarer and more valuable": "https://images.unsplash.com/photo-1483058712412-4245e9b90334?w=800&q=80",
  "Most productivity advice optimizes the wrong variable": "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80",
  "Great work comes from following curiosity, not chasing what seems important": "https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?w=800&q=80",

  // SPORTS
  "The 'hot hand' in basketball is real enough that teams should act like it is": "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
  "Salary caps mostly shuffle who gets paid, not whether owners keep surplus": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
  "Youth sports have become a pay-to-play pipeline that screens for income, not love of the game": "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80",
  "Fourth-and-short aggression is correct often enough that conservative punting is a market inefficiency": "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80",
  "National-team fandom is cosplay with a passport — and that is mostly fine": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&q=80",

  // PLAYFUL
  "Cereal is absolutely a soup and we need to stop pretending otherwise": "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=800&q=80",
  "Replying 'k' to a paragraph text should be a misdemeanor": "https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=800&q=80",
  "The best seat on a plane is the aisle and I will not be taking questions": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80",
  "Dogs who make eye contact while pooping deserve extra treats": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80",
  "Brunch is just lunch with better PR and worse lines": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80",
  "Hot yoga is just regular yoga with extra drama and a smell": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
  "Pineapple on pizza is fine; the real crime is bad crust": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
  "Group chats should have term limits like elected office": "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800&q=80",
  "The five-second rule is optimistic engineering, not food safety": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80",
  "Monday meetings should be illegal before coffee has kicked in": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
  "Rom-coms lied: the grand gesture is usually just good listening": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80",
  "Economics is just vibes with spreadsheets": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80",
  "Philosophy of socks: losing one in the dryer is a metaphor for adulthood": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&q=80",
  "Scrolling in bed is not rest — it's a second shift with worse lighting": "https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=800&q=80",
  "Fantasy football is cosplay for people who own khakis": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80",
  "The best productivity hack is admitting you will never inbox zero": "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&q=80",
};

async function main() {
  console.log('🖼️  Starting thumbnail migration...');

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const [headline, thumbnailUrl] of Object.entries(THUMBNAIL_MAP)) {
    const result = await db.post.updateMany({
      where: { headlineClaim: headline },
      data: { thumbnailUrl },
    });

    if (result.count > 0) {
      updatedCount += result.count;
      console.log(`✓ Updated: "${headline.substring(0, 50)}..."`);
    } else {
      notFoundCount++;
      console.log(`⚠ Not found: "${headline.substring(0, 50)}..."`);
    }
  }

  console.log(`\n🎉 Migration complete!`);
  console.log(`   Updated: ${updatedCount} posts`);
  if (notFoundCount > 0) {
    console.log(`   Not found: ${notFoundCount} headlines`);
  }
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
