// Test script to verify Spotify instrumental filtering
const lyricsKeywords = [
  // Basic vocal indicators
  'vocal', 'vocals', 'singing', 'singer', 'song', 'songs',
  'lyrics', 'lyric', 'feat', 'ft.', 'featuring', 'with',
  'rap', 'hip hop', 'hip-hop', 'r&b', 'rnb', 'pop',
  'acoustic', 'cover', 'covers', 'remix', 'remixes',
  'karaoke', 'sing along', 'sing-along', 'explicit', 'clean',
  // Artist names that typically have vocals (expanded list)
  'kendrick', 'lamar', 'drake', 'kanye', 'west', 'weeknd', 'the weeknd',
  'post malone', 'travis scott', 'j cole', 'eminem', 'snoop', 'dogg',
  'tupac', 'biggie', 'notorious', 'frank ocean', 'tyler the creator',
  'childish gambino', 'anderson paak', 'jhené', 'jhene aiko',
  'billie eilish', 'olivia rodrigo', 'taylor swift', 'ariana grande',
  'beyoncé', 'beyonce', 'rihanna', 'lady gaga', 'katy perry',
  'justin bieber', 'selena gomez', 'ed sheeran', 'bruno mars',
  'michael bublé', 'michael buble', 'adele', 'sam smith',
  'harry styles', 'dua lipa', 'bad bunny', 'ozuna', 'j balvin',
  // Vocal music genres and styles
  'indie', 'folk', 'country', 'blues', 'jazz vocal', 'vocal jazz',
  'soul', 'gospel', 'christian', 'worship', 'hymn', 'hymns',
  'broadway', 'musical', 'show tunes', 'opera', 'classical vocal',
  // Specific vocal terms
  'chorus', 'verse', 'bridge', 'hook', 'melody', 'harmony',
  'duet', 'trio', 'quartet', 'choir', 'ensemble', 'band',
  'singer-songwriter', 'ballad', 'anthem', 'theme song'
];

// Test playlists that should be rejected
const testPlaylistsWithLyrics = [
  { name: 'Lo-Fi Beats with Kendrick Lamar', description: 'Chill beats featuring Kendrick Lamar' },
  { name: 'Lofi Hip Hop Radio', description: 'Hip hop beats and rhymes' },
  { name: 'Drake - Certified Lover Boy', description: 'Drake\'s latest album' },
  { name: 'Taylor Swift - Midnights', description: 'Pop music by Taylor Swift' },
  { name: 'Jazz Vocals', description: 'Smooth jazz with vocals' },
  { name: 'Indie Folk Songs', description: 'Folk music with lyrics' },
  { name: 'Country Music Playlist', description: 'Country songs' },
  { name: 'Rap Remix Collection', description: 'Remixed rap songs' },
  { name: 'Kanye West Greatest Hits', description: 'Kanye\'s best songs' },
  { name: 'The Weeknd - After Hours', description: 'R&B music by The Weeknd' }
];

// Test playlists that should be accepted (instrumental)
const testPlaylistsInstrumental = [
  { name: 'Lo-Fi Beats to Study To', description: 'Instrumental lo-fi beats for focus' },
  { name: 'Deep Focus Instrumental', description: 'Instrumental music for concentration' },
  { name: 'Ambient Soundscapes', description: 'Nature sounds and ambient music' },
  { name: 'Piano Instrumental Collection', description: 'Instrumental piano music' },
  { name: 'Smooth Jazz Instrumental', description: 'Smooth jazz beats for relaxation' },
  { name: 'White Noise & Rain Sounds', description: 'Nature sounds for relaxation' },
  { name: 'Meditation Music - Instrumental', description: 'Instrumental meditation sounds' },
  { name: 'Background Music - Instrumental Only', description: 'Instrumental background music' }
];

function testPlaylistFiltering(playlist, lyricsKeywords) {
  const name = playlist.name.toLowerCase();
  const description = playlist.description?.toLowerCase() || '';

  const hasLyricsInName = lyricsKeywords.some(keyword => {
    // Don't reject if it's mentioning being instrumental/no vocals
    if (keyword === 'vocal' && (name.includes('no vocal') || name.includes('instrumental') || name.includes('no lyrics'))) {
      return false;
    }
    return name.includes(keyword);
  });

  const hasLyricsInDescription = lyricsKeywords.some(keyword => {
    // Don't reject if it's mentioning being instrumental/no vocals
    if (keyword === 'vocal' && (description.includes('no vocal') || description.includes('instrumental') || description.includes('no lyrics'))) {
      return false;
    }
    return description.includes(keyword);
  });

  const hasLyrics = hasLyricsInName || hasLyricsInDescription;

  return {
    name: playlist.name,
    hasLyrics,
    source: hasLyrics ? (hasLyricsInName ? 'name' : 'description') : null,
    matchedKeyword: hasLyrics ? lyricsKeywords.find(k => {
      if (k === 'vocal') {
        return (name.includes(k) && !name.includes('no vocal') && !name.includes('instrumental') && !name.includes('no lyrics')) ||
               (description.includes(k) && !description.includes('no vocal') && !description.includes('instrumental') && !description.includes('no lyrics'));
      }
      return name.includes(k) || description.includes(k);
    }) : null
  };
}

console.log('🧪 Testing Spotify Instrumental Filtering\n');

// Test playlists that should be rejected
console.log('❌ Testing playlists that should be REJECTED (contain lyrics):');
testPlaylistsWithLyrics.forEach(playlist => {
  const result = testPlaylistFiltering(playlist, lyricsKeywords);
  const status = result.hasLyrics ? '✅ CORRECTLY REJECTED' : '❌ SHOULD BE REJECTED';
  console.log(`  ${status}: "${playlist.name}"`);
  if (result.hasLyrics) {
    console.log(`    Reason: Found "${result.matchedKeyword}" in ${result.source}`);
  }
});

console.log('\n✅ Testing playlists that should be ACCEPTED (instrumental):');
testPlaylistsInstrumental.forEach(playlist => {
  const result = testPlaylistFiltering(playlist, lyricsKeywords);
  const status = !result.hasLyrics ? '✅ CORRECTLY ACCEPTED' : '❌ SHOULD BE ACCEPTED';
  console.log(`  ${status}: "${playlist.name}"`);
  if (result.hasLyrics) {
    console.log(`    Reason: Found "${result.matchedKeyword}" in ${result.source}`);
  }
});

console.log('\n📊 Summary:');
console.log(`Lyrics keywords: ${lyricsKeywords.length}`);
console.log(`Test playlists with lyrics: ${testPlaylistsWithLyrics.length}`);
console.log(`Test playlists instrumental: ${testPlaylistsInstrumental.length}`);

// Verify that all lyrics-containing playlists are correctly rejected
const rejectionErrors = testPlaylistsWithLyrics.filter(p => !testPlaylistFiltering(p, lyricsKeywords).hasLyrics);
const acceptanceErrors = testPlaylistsInstrumental.filter(p => testPlaylistFiltering(p, lyricsKeywords).hasLyrics);

console.log(`\nRejection accuracy: ${testPlaylistsWithLyrics.length - rejectionErrors.length}/${testPlaylistsWithLyrics.length}`);
console.log(`Acceptance accuracy: ${testPlaylistsInstrumental.length - acceptanceErrors.length}/${testPlaylistsInstrumental.length}`);

if (rejectionErrors.length > 0) {
  console.log('\n❌ Rejection errors:', rejectionErrors.map(p => p.name));
}

if (acceptanceErrors.length > 0) {
  console.log('\n❌ Acceptance errors:', acceptanceErrors.map(p => p.name));
}

if (rejectionErrors.length === 0 && acceptanceErrors.length === 0) {
  console.log('\n🎉 All tests passed! Spotify filtering is working correctly.');
} else {
  console.log('\n⚠️ Some tests failed. Filtering needs improvement.');
}
