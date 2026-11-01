// Shared sample data for WatchSpace AI

export const MOVIES = [
  {
    id: 'dune',
    title: 'Dune',
    year: '2021',
    genres: ['Sci-Fi', 'Adventure'],
    duration: '2h 35m',
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
    id: 'the-last-horizon',
    title: 'The Last Horizon',
    year: '2026',
    genres: ['Sci-Fi', 'Action'],
    duration: '2h 15m',
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
    id: 'interstellar',
    title: 'Interstellar',
    year: '2014',
    genres: ['Sci-Fi', 'Drama'],
    duration: '2h 49m',
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
    id: 'the-dark-knight',
    title: 'The Dark Knight',
    year: '2008',
    genres: ['Action', 'Thriller'],
    duration: '2h 32m',
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
    id: 'inception',
    title: 'Inception',
    year: '2010',
    genres: ['Sci-Fi', 'Action'],
    duration: '2h 28m',
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
    id: 'the-matrix',
    title: 'The Matrix',
    year: '1999',
    genres: ['Sci-Fi', 'Action'],
    duration: '2h 16m',
    rating: 8.7,
    votes: '2.0M',
    director: 'Lana & Lilly Wachowski',
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
    description: 'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.',
    poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80',
    category: 'Sci-Fi'
  },
  {
    id: 'breaking-bad',
    title: 'Breaking Bad',
    year: '2008',
    genres: ['Drama', 'Thriller'],
    duration: '5 Seasons',
    rating: 9.5,
    votes: '2.1M',
    director: 'Vince Gilligan',
    cast: ['Bryan Cranston', 'Aaron Paul', 'Anna Gunn'],
    description: 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family\'s future.',
    poster: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1600&auto=format&fit=crop&q=80',
    category: 'Drama'
  },
  {
    id: 'spiderman',
    title: 'Spider-Man: No Way Home',
    year: '2021',
    genres: ['Action', 'Adventure'],
    duration: '2h 28m',
    rating: 8.2,
    votes: '820K',
    director: 'Jon Watts',
    cast: ['Tom Holland', 'Zendaya', 'Benedict Cumberbatch'],
    description: 'With Spider-Man\'s identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds start to appear.',
    poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=1600&auto=format&fit=crop&q=80',
    category: 'Action'
  },
  {
    id: 'game-of-thrones',
    title: 'Game of Thrones',
    year: '2011',
    genres: ['Drama', 'Action'],
    duration: '8 Seasons',
    rating: 9.2,
    votes: '2.2M',
    director: 'David Benioff, D.B. Weiss',
    cast: ['Emilia Clarke', 'Peter Dinklage', 'Kit Harington'],
    description: 'Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    category: 'Drama'
  }
];

export const CONTINUE_WATCHING = [
  { id: 'the-last-horizon', title: 'The Last Horizon', progress: 75, timeLeft: '34m left', poster: MOVIES[1].poster },
  { id: 'stranger-things', title: 'Stranger Things', progress: 42, timeLeft: '28m left', poster: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' },
  { id: 'the-witcher', title: 'The Witcher', progress: 60, timeLeft: '22m left', poster: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80' },
  { id: 'dune', title: 'Dune', progress: 25, timeLeft: '1h 56m left', poster: MOVIES[0].poster }
];

export const UPCOMING_SPACES = [
  { id: 'space-1', title: 'Friday Movie Night', movie: 'Dune', time: 'Tomorrow • 7:30 PM', participants: 4, host: 'Rajat', code: 'ABC123' },
  { id: 'space-2', title: 'Sci-Fi Marathon', movie: 'The Matrix', time: 'Sat • 9:00 PM', participants: 6, host: 'Elena', code: 'SCI999' },
  { id: 'space-3', title: 'The Witcher S3', movie: 'The Witcher', time: 'Sun • 8:00 PM', participants: 3, host: 'Amit', code: 'WTC303' },
  { id: 'space-4', title: 'Anime Night', movie: 'Akira', time: 'Sun • 6:00 PM', participants: 5, host: 'Sneha', code: 'ANM777' }
];

export const RECOMMENDATIONS_RAIL = [
  { id: 'interstellar', title: 'Interstellar', rating: 8.8, poster: MOVIES[2].poster },
  { id: 'the-martian', title: 'The Martian', rating: 8.0, poster: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop&q=80' },
  { id: 'arrival', title: 'Arrival', rating: 7.9, poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80' },
  { id: 'blade-runner-2049', title: 'Blade Runner 2049', rating: 8.0, poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80' },
  { id: 'the-expanse', title: 'The Expanse', rating: 8.5, poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80' }
];

export const MORE_LIKE_THIS = [
  { id: 'gravity', title: 'Gravity', rating: 7.7, poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=80' },
  { id: 'wandering-earth', title: 'The Wandering Earth', rating: 6.0, poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80' },
  { id: 'oblivion', title: 'Oblivion', rating: 7.0, poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80' },
  { id: 'edge-of-tomorrow', title: 'Edge of Tomorrow', rating: 7.9, poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80' },
  { id: 'the-creator', title: 'The Creator', rating: 7.2, poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80' }
];

export const ROOM_PARTICIPANTS = [
  { id: 'p1', name: 'Rajat (Host)', role: 'Host', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', active: true },
  { id: 'p2', name: 'Priya', role: 'Viewer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', active: true },
  { id: 'p3', name: 'Amit', role: 'Viewer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', active: true },
  { id: 'p4', name: 'Sneha', role: 'Viewer', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80', active: true },
  { id: 'p5', name: 'Rohit', role: 'Invited', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', active: false }
];

export const TIMELINE_EVENTS = [
  { id: 1, time: '00:01:30', type: 'Trivia', content: 'This scene was filmed on location in the Liwa Oasis of Abu Dhabi under 45°C desert heat.' },
  { id: 2, time: '00:02:45', type: 'Character', content: 'Paul Atreides experiences his first prescient dream of Chani, signaling his dormant Kwisatz Haderach abilities.' },
  { id: 3, time: '00:03:10', type: 'Glossary', content: 'Spice Melange - A rare geriatric substance vital for interstellar travel, prolonged life, and heightened awareness.' },
  { id: 5, time: '00:05:00', type: 'Variation Point', content: 'Audience Choice: Choose alternate subtitle dialect or visual audio commentary path.' }
];

export const ANALYTICS_DATA = {
  movie: 'Dune',
  totalTime: '2h 15m',
  participantsCount: 5,
  watchTime: '1h 42m',
  peakParticipants: 5,
  aiQuestions: 18,
  triviaShown: 12,
  chatMessages: 86,
  topQuestions: [
    { rank: 1, question: 'Who is this character?', count: 4 },
    { rank: 2, question: 'What is Arrakis?', count: 3 },
    { rank: 3, question: 'What happened earlier?', count: 3 },
    { rank: 4, question: 'Who is the villain?', count: 2 },
    { rank: 5, question: 'What is the spice?', count: 2 }
  ]
};

export const INITIAL_USER = {
  name: 'Rajat Kumar Patel',
  handle: 'rajatpatel5459',
  role: 'Viewer & Host',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  stats: {
    watchSpaces: 8,
    watchTime: '12h 46m',
    aiQuestions: 24
  },
  genres: ['Sci-Fi', 'Action', 'Thriller', 'Drama'],
  subtitleLanguage: 'English',
  interests: ['Movies', 'TV Shows', 'Anime']
};
