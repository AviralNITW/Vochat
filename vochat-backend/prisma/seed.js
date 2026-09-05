// ============================================
// VoChat - Database Seeding Script
// ============================================

const prisma = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records (in order of relations)
  console.log('🧹 Cleaning old database records...');
  await prisma.deviceToken.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.story.deleteMany();
  await prisma.post.deleteMany();
  await prisma.message.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.streak.deleteMany();
  await prisma.media.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash default passwords
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 3. Create Users
  console.log('👤 Seeding users...');
  const users = [
    {
      id: 'usr_rohan',
      name: 'Rohan Sharma',
      username: 'rohan_sharma',
      email: 'rohan@vochat.com',
      password: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      isOnline: true,
      isVerified: true,
      isPrivate: false,
      textBio: 'Speak freely. Connect deeply. 💜',
    },
    {
      id: 'usr_ananya',
      name: 'Ananya Roy',
      username: 'ananya_roy',
      email: 'ananya@vochat.com',
      password: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      isOnline: true,
      isVerified: true,
      isPrivate: false,
      textBio: 'Just a vibe ✨ | Podcast enthusiast',
    },
    {
      id: 'usr_vivaan',
      name: 'Vivaan Patel',
      username: 'vivaan_patel',
      email: 'vivaan@vochat.com',
      password: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      isOnline: false,
      isVerified: false,
      isPrivate: true,
      textBio: 'Always listening 🎧',
    },
    {
      id: 'usr_ishika',
      name: 'Ishika Gupta',
      username: 'ishika_gupta',
      email: 'ishika@vochat.com',
      password: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      isOnline: true,
      isVerified: true,
      isPrivate: false,
      textBio: 'Voice bio is my personality 🎙️',
    },
    {
      id: 'usr_aviral',
      name: 'Aviral Mishra',
      username: 'aviral_mishra',
      email: 'maviral456@gmail.com',
      password: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      isOnline: true,
      isVerified: true,
      isPrivate: false,
      textBio: 'Vochat Developer 🛠️ | Music lover',
    }
  ];

  const dbUsers = [];
  for (const user of users) {
    const created = await prisma.user.create({ data: user });
    dbUsers.push(created);
  }
  console.log(`✅ Seeded ${dbUsers.length} users successfully!`);

  // 4. Create Friendships
  console.log('🤝 Seeding friendships...');
  const friendships = [
    { userId: 'usr_aviral', friendId: 'usr_rohan', status: 'ACCEPTED' },
    { userId: 'usr_aviral', friendId: 'usr_ananya', status: 'ACCEPTED' },
    { userId: 'usr_aviral', friendId: 'usr_ishika', status: 'ACCEPTED' },
    { userId: 'usr_rohan', friendId: 'usr_ananya', status: 'ACCEPTED' },
    { userId: 'usr_rohan', friendId: 'usr_vivaan', status: 'ACCEPTED' },
    { userId: 'usr_ananya', friendId: 'usr_ishika', status: 'ACCEPTED' },
    { userId: 'usr_ishika', friendId: 'usr_vivaan', status: 'PENDING' },
  ];

  for (const f of friendships) {
    await prisma.friendship.create({ data: f });
  }
  console.log('✅ Seeded friendships!');

  // 5. Create Follows (Followers/Following)
  console.log('📈 Seeding followers...');
  const follows = [
    { followerId: 'usr_aviral', followingId: 'usr_rohan' },
    { followerId: 'usr_rohan', followingId: 'usr_aviral' },
    { followerId: 'usr_ananya', followingId: 'usr_aviral' },
    { followerId: 'usr_ishika', followingId: 'usr_aviral' },
    { followerId: 'usr_aviral', followingId: 'usr_ananya' },
  ];

  for (const f of follows) {
    await prisma.follow.create({ data: f });
  }
  console.log('✅ Seeded follow connections!');

  // 6. Create Streaks
  console.log('🔥 Seeding streaks...');
  const streaks = [
    {
      user1Id: 'usr_aviral',
      user2Id: 'usr_rohan',
      streakCount: 25,
      user1Interacted: true,
      user2Interacted: true,
      lastInteractionDate: new Date(),
    },
    {
      user1Id: 'usr_aviral',
      user2Id: 'usr_ananya',
      streakCount: 64,
      user1Interacted: true,
      user2Interacted: false,
      lastInteractionDate: new Date(),
    },
    {
      user1Id: 'usr_rohan',
      user2Id: 'usr_ananya',
      streakCount: 12,
      user1Interacted: false,
      user2Interacted: false,
      lastInteractionDate: new Date(Date.now() - 12 * 3600000), // 12 hours ago
    }
  ];

  for (const s of streaks) {
    await prisma.streak.create({ data: s });
  }
  console.log('✅ Seeded streaks!');

  // 7. Create Posts (Voice Reels / Snap Posts)
  console.log('🎙️ Seeding voice posts...');
  const posts = [
    {
      id: 'post_1',
      userId: 'usr_rohan',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      duration: 12,
      caption: 'Late night thoughts 💭. Let me know what you think!',
      voiceFilter: 'Original',
      audience: 'ALL',
    },
    {
      id: 'post_2',
      userId: 'usr_ananya',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      duration: 9,
      caption: 'Just a vibe check ✨. Sound is amazing!',
      voiceFilter: 'Robot',
      audience: 'ALL',
    },
    {
      id: 'post_3',
      userId: 'usr_ishika',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      duration: 15,
      caption: 'Motivation of the day! Don’t stop now 💪',
      voiceFilter: 'Deep Voice',
      audience: 'ALL',
    },
    {
      id: 'post_4',
      userId: 'usr_vivaan',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      duration: 7,
      caption: 'Private snap for close friends only 🤫',
      voiceFilter: 'Spy Mode',
      audience: 'FRIENDS',
    }
  ];

  for (const p of posts) {
    await prisma.post.create({ data: p });
  }
  console.log('✅ Seeded voice posts!');

  // 8. Create Likes, Comments, and Bookmarks on Posts
  console.log('💬 Seeding post interactions...');
  // Likes
  await prisma.like.create({ data: { userId: 'usr_aviral', postId: 'post_1' } });
  await prisma.like.create({ data: { userId: 'usr_ananya', postId: 'post_1' } });
  await prisma.like.create({ data: { userId: 'usr_aviral', postId: 'post_2' } });

  // Bookmarks
  await prisma.bookmark.create({ data: { userId: 'usr_aviral', postId: 'post_1' } });
  await prisma.bookmark.create({ data: { userId: 'usr_rohan', postId: 'post_2' } });

  // Comments
  await prisma.comment.create({
    data: {
      userId: 'usr_aviral',
      postId: 'post_1',
      text: 'Totally agree with this! Nice voice quality.'
    }
  });
  await prisma.comment.create({
    data: {
      userId: 'usr_ananya',
      postId: 'post_1',
      text: 'Wow, deep thoughts.'
    }
  });
  await prisma.comment.create({
    data: {
      userId: 'usr_rohan',
      postId: 'post_2',
      text: 'Vibes match perfectly!'
    }
  });
  console.log('✅ Seeded comments and likes!');

  // 9. Create Ephemeral Stories (expires in 24 hours)
  console.log('⏰ Seeding stories...');
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 24);

  await prisma.story.create({
    data: {
      userId: 'usr_ananya',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      duration: 10,
      caption: 'Morning walk views ☀️',
      expiresAt: tomorrow
    }
  });

  await prisma.story.create({
    data: {
      userId: 'usr_rohan',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      duration: 15,
      caption: 'Exciting news coming today!',
      expiresAt: tomorrow
    }
  });
  console.log('✅ Seeded stories!');

  // 10. Create Direct Messages
  console.log('✉️ Seeding direct messages...');
  const msgExpiry = new Date();
  msgExpiry.setHours(msgExpiry.getHours() + 24);

  await prisma.message.create({
    data: {
      senderId: 'usr_rohan',
      receiverId: 'usr_aviral',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
      duration: 6,
      caption: 'Hey Aviral! Did you check out the new settings?',
      voiceFilter: 'Original',
      isPlayed: false,
      expiresAt: msgExpiry
    }
  });

  await prisma.message.create({
    data: {
      senderId: 'usr_aviral',
      receiverId: 'usr_rohan',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
      duration: 8,
      caption: 'Yes! It looks awesome.',
      voiceFilter: 'Original',
      isPlayed: true,
      playedAt: new Date(),
      expiresAt: msgExpiry
    }
  });
  console.log('✅ Seeded messages!');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
