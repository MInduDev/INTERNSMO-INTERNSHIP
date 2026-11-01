// seed/seedData.js
// Populate MongoDB with sample data
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Movie = require('../models/Movie');
const WatchSpace = require('../models/WatchSpace');
const TimelineEvent = require('../models/TimelineEvent');
const Analytics = require('../models/Analytics');
const Interaction = require('../models/Interaction');

function requireDemoPasswords() {
  const hostPassword = process.env.DEMO_HOST_PASSWORD;
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  if (
    typeof hostPassword !== 'string' ||
    hostPassword.length < 12 ||
    typeof adminPassword !== 'string' ||
    adminPassword.length < 12 ||
    hostPassword === adminPassword
  ) {
    throw new Error(
      'Set different DEMO_HOST_PASSWORD and DEMO_ADMIN_PASSWORD values (at least 12 characters each) in server/.env before seeding.'
    );
  }
  return { hostPassword, adminPassword };
}

const seedDatabase = async () => {
  try {
    const { hostPassword, adminPassword } = requireDemoPasswords();
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/watchspace_db';
    console.log('[Seed] Connecting to configured MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to database.');

    // 1. Clear existing collections for a fresh start
    await User.deleteMany({});
    await Movie.deleteMany({});
    await WatchSpace.deleteMany({});
    await TimelineEvent.deleteMany({});
    await Analytics.deleteMany({});
    await Interaction.deleteMany({});
    console.log('[Seed] Cleared existing data.');


    // 2. Create Users (Default User & Admin)
    const user1 = await User.create({
      name: 'Rajat Kumar Patel',
      email: 'rajat@watchspace.tv',
      password: hostPassword,
      role: 'host',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      stats: {
        watchSpaces: 8,
        watchTime: '12h 46m',
        aiQuestions: 24
      },
      genres: ['Sci-Fi', 'Action', 'Thriller', 'Drama'],
      subtitleLanguage: 'English'
    });

    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@watchspace.tv',
      password: adminPassword,
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
    });

    console.log(`[Seed] Created ${2} users (Rajat & Admin).`);

    // 3. Create Movies Catalog
    const movies = [
      {
        slug: 'dune',
        title: 'Dune',
        year: '2021',
        genres: ['Sci-Fi', 'Adventure'],
        duration: '2h 35m',
        durationSeconds: 9300,
        rating: 8.0,
        votes: '482K',
        director: 'Denis Villeneuve',
        cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Oscar Isaac'],
        description: 'Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe to ensure the future of his family and his people.',
        poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
        category: 'Sci-Fi'
      },
      {
        slug: 'the-last-horizon',
        title: 'The Last Horizon',
        year: '2026',
        genres: ['Sci-Fi', 'Action'],
        duration: '2h 15m',
        durationSeconds: 8100,
        rating: 8.9,
        votes: '210K',
        director: 'Sarah Nolan',
        cast: ['Marcus Vance', 'Elena Rostova', 'Kaelen Miller'],
        description: 'When humanity\'s last exploratory vessel detects a mysterious signal at the edge of the galaxy, the crew must choose between saving Earth or discovering the origin of consciousness itself.',
        poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
        category: 'Sci-Fi'
      },
      {
        slug: 'interstellar',
        title: 'Interstellar',
        year: '2014',
        genres: ['Sci-Fi', 'Drama'],
        duration: '2h 49m',
        durationSeconds: 10140,
        rating: 8.8,
        votes: '1.9M',
        director: 'Christopher Nolan',
        cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
        description: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to helm a spacecraft, along with a team of researchers, to find a new planet for humans.',
        poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80',
        category: 'Sci-Fi'
      },
      {
        slug: 'the-dark-knight',
        title: 'The Dark Knight',
        year: '2008',
        genres: ['Action', 'Thriller'],
        duration: '2h 32m',
        durationSeconds: 9120,
        rating: 9.0,
        votes: '2.8M',
        director: 'Christopher Nolan',
        cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
        description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
        poster: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=600&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&auto=format&fit=crop&q=80',
        category: 'Action'
      },
      {
        slug: 'inception',
        title: 'Inception',
        year: '2010',
        genres: ['Sci-Fi', 'Action'],
        duration: '2h 28m',
        durationSeconds: 8880,
        rating: 8.8,
        votes: '2.4M',
        director: 'Christopher Nolan',
        cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
        description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
        poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
        category: 'Sci-Fi'
      },
      {
        slug: 'the-matrix',
        title: 'The Matrix',
        year: '1999',
        genres: ['Sci-Fi', 'Action'],
        duration: '2h 16m',
        durationSeconds: 8160,
        rating: 8.7,
        votes: '2.0M',
        director: 'Lana & Lilly Wachowski',
        cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
        description: 'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.',
        poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80',
        category: 'Sci-Fi'
      }
    ];

    await Movie.insertMany(movies);
    console.log(`[Seed] Created ${movies.length} movies in catalog.`);

    // 4. Create Timeline Events for Grounded AI & Overlays
    const timelineEvents = [
      {
        movieId: 'dune',
        sourceId: 'evt_trivia_01',
        timestampSeconds: 90,
        timeFormatted: '00:01:30',
        type: 'Trivia',
        content: 'This scene was filmed on location in the Liwa Oasis of Abu Dhabi under 45°C desert heat.',
        metadata: { tags: ['filming', 'oasis', 'heat'] }
      },
      {
        movieId: 'dune',
        sourceId: 'evt_char_01',
        timestampSeconds: 165,
        timeFormatted: '00:02:45',
        type: 'Character',
        content: 'Paul Atreides experiences his first prescient dream of Chani, signaling his dormant Kwisatz Haderach abilities.',
        metadata: { characterName: 'Paul Atreides', actorName: 'Timothée Chalamet' }
      },
      {
        movieId: 'dune',
        sourceId: 'evt_gloss_01',
        timestampSeconds: 190,
        timeFormatted: '00:03:10',
        type: 'Glossary',
        content: 'Spice Melange - A rare geriatric substance vital for interstellar travel, prolonged life, and heightened awareness.',
        metadata: { term: 'Spice Melange' }
      },
      {
        movieId: 'dune',
        sourceId: 'evt_var_01',
        timestampSeconds: 300,
        timeFormatted: '00:05:00',
        type: 'Variation Point',
        content: 'Audience Choice: Choose alternate subtitle dialect or visual audio commentary path.',
        metadata: { variationOptions: ['Original Audio Commentary', 'Chakobsa Subtitle Dialect'] }
      },
      {
        movieId: 'interstellar',
        sourceId: 'evt_interstellar_trivia_01',
        timestampSeconds: 90,
        timeFormatted: '00:01:30',
        type: 'Trivia',
        content: 'Christopher Nolan planted a real 500-acre cornfield specifically for the film, and sold the crop after filming for a profit.',
        metadata: { tags: ['nolan', 'trivia', 'cornfield'] }
      },
      {
        movieId: 'interstellar',
        sourceId: 'evt_interstellar_char_01',
        timestampSeconds: 180,
        timeFormatted: '00:03:00',
        type: 'Character',
        content: 'Joseph Cooper, a former NASA test pilot turned farmer, prepares to find an inhabitable sanctuary for humanity.',
        metadata: { characterName: 'Joseph Cooper', actorName: 'Matthew McConaughey' }
      },
      {
        movieId: 'interstellar',
        sourceId: 'evt_interstellar_var_01',
        timestampSeconds: 300,
        timeFormatted: '00:05:00',
        type: 'Variation Point',
        content: 'Which commentary stream should the group activate?',
        metadata: {
          variationOptions: [
            'Director Christopher Nolan Vision',
            'Physicist Kip Thorne Science Lore'
          ]
        }
      }
    ];

    await TimelineEvent.insertMany(timelineEvents);
    console.log(`[Seed] Created ${timelineEvents.length} timeline events.`);

    // 5. Create Sample Watch Space (Room ABC123)
    await WatchSpace.create({
      code: 'ABC123',
      title: 'Friday Movie Night',
      movie: {
        slug: 'dune',
        title: 'Dune',
        poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        duration: '2h 35m',
        durationSeconds: 9300
      },
      host: {
        userId: user1._id,
        name: 'Rajat (Host)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
      },
      participants: [
        { name: 'Rajat (Host)', role: 'Host', isReady: true, isOnline: true },
        { name: 'Priya', role: 'Viewer', isReady: true, isOnline: true },
        { name: 'Amit', role: 'Viewer', isReady: false, isOnline: true },
        { name: 'Sneha', role: 'Viewer', isReady: true, isOnline: false }
      ],
      visibility: 'Public',
      aiCoPilotLevel: 'Normal',
      sceneVotingEnabled: true,
      playbackState: {
        isPlaying: true,
        currentTime: 252,
        hostConnected: true
      },
      chatMessages: [
        { senderName: 'Rajat (Host)', content: 'Welcome everyone! Video starting now 🍿' },
        { senderName: 'Priya', content: 'Audio sounds super crisp on my headphones!' },
        { senderName: 'AI Co-Pilot', isAi: true, content: 'Tip: You are watching the opening sequence on Caladan. Ask me anytime about lore!' }
      ],
      status: 'active'
    });

    // 6. Create Initial Analytics Record
    await Analytics.create({
      spaceCode: 'ABC123',
      movieTitle: 'Dune',
      totalWatchTime: '1h 42m',
      peakParticipants: 5,
      aiQuestionsCount: 18,
      triviaShownCount: 12,
      chatMessagesCount: 86,
      topQuestions: [
        { question: 'Who is this character?', count: 4 },
        { question: 'What is Arrakis?', count: 3 },
        { question: 'What happened earlier?', count: 3 },
        { question: 'Who is the villain?', count: 2 },
        { question: 'What is the spice?', count: 2 }
      ]
    });

    console.log('[Seed] Sample Watch Space ABC123 and Analytics seeded successfully.');

    // 7. Seed Sample Interactions (feeds recommendation engine — PRD §7.2.1)
    // Simulate Rajat having watched and rated movies during his testing
    await Interaction.insertMany([
      {
        userId: user1._id,
        titleId: 'dune',
        watchedSeconds: 7200,
        completed: true,
        rating: 5,
        coWatchedWith: [],
        watchSpaceCode: 'ABC123',
        genresWatched: ['Sci-Fi', 'Adventure']
      },
      {
        userId: user1._id,
        titleId: 'the-last-horizon',
        watchedSeconds: 4050,  // ~50% watched
        completed: false,
        rating: 4,
        coWatchedWith: [],
        watchSpaceCode: null,
        genresWatched: ['Sci-Fi', 'Action']
      },
      {
        userId: user1._id,
        titleId: 'inception',
        watchedSeconds: 8880,
        completed: true,
        rating: 5,
        coWatchedWith: [],
        watchSpaceCode: null,
        genresWatched: ['Sci-Fi', 'Action']
      },
      {
        userId: user1._id,
        titleId: 'the-dark-knight',
        watchedSeconds: 3000,  // partial
        completed: false,
        rating: null,
        coWatchedWith: [],
        watchSpaceCode: null,
        genresWatched: ['Action', 'Thriller']
      }
    ]);
    console.log('[Seed] Created 4 sample Interactions for recommendation engine.');

    console.log('----------------------------------------------------');
    console.log('✅ DATABASE SEED COMPLETED SUCCESSFULLY!');
    console.log('Demo accounts created: rajat@watchspace.tv and admin@watchspace.tv');
    console.log('Use the private DEMO_HOST_PASSWORD and DEMO_ADMIN_PASSWORD values configured in server/.env.');
    console.log('Room Code: ABC123');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

seedDatabase();
