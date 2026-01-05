# MovieZdom 🎮 - Movie Trivia Battle Game

A real-time multiplayer movie trivia game where players compete in head-to-head battles answering questions about movies, actors, release years, and plots.

## 🎯 Project Overview

MovieZdom is a full-stack web application that combines:
- **Backend**: Node.js/Express server with MongoDB database and Socket.IO for real-time gameplay
- **Frontend**: EJS templated views with Bootstrap styling and vanilla JavaScript
- **Question Engine**: Python-based pipeline to fetch and enrich movie data from TMDB API

## 🚀 Features

### Competitive Features
- **Global Leaderboard**: View the top 10 players ranked by total wins
- **Ranking System**: Top 3 players displayed with special badges (🥇🥈🥉)
- **Real-time Rankings**: Leaderboard updates automatically as players win games

### Gameplay
- **Real-time Multiplayer**: Play against other users in live game lobbies (2 players per game)
- **Movie Trivia Questions**: Three question types:
  - 📅 Release year guessing
  - 🎬 Plot recognition (with movie title censored)
  - 🎭 Actor character matching
- **Difficulty System**: Questions automatically rated as Easy/Medium/Hard based on movie popularity
- **Live Scoring**: Points awarded for correct answers with real-time updates
- **10-Question Format**: Each game consists of exactly 10 trivia questions
- **Countdown Timer**: 10.5-second timer per question with visual progress bar

### Lobby System
- **Create Public/Private Lobbies**: Host custom game rooms with optional password protection
- **Category Filtering**: Filter questions by movie genre (Action, Comedy, Drama, Horror, Romance, Sci-Fi, Thriller, Western, Animation, Adventure, Family)
- **Lobby Management**: Browse available lobbies, join games, or host your own
- **Search & Browse**: Find lobbies by name and category on the dashboard

### User Features
- **User Authentication**: Registration with email verification
- **User Profiles**: View personal game statistics and history
- **Statistics Tracking**: 
  - Total games played
  - Wins/losses/draws
  - Win rate percentage
- **Leaderboard**: Global ranking table displaying the top 10 users with the most wins
- **Account Management**: 
  - View and manage personal profile
  - Permanently delete account with secure data removal
  - All personal data, statistics, and created lobbies are deleted

## 📁 Project Structure

```
WebEng_25_Group1/
├── MovieZdom/                   # Main application
│   ├── models/
│   │   ├── User.js              # User schema & authentication
│   │   └── Lobby.js             # Game lobby schema
│   ├── routes/
│   │   └── auth.js              # Authentication routes
│   ├── views/
│   │   ├── login.ejs            # Login page
│   │   ├── register.ejs         # Registration page
│   │   ├── dashboard.ejs        # Lobby browser & category filter
│   │   ├── lobby.ejs            # Game waiting room
│   │   ├── game.ejs             # Game play screen
│   │   ├── profile.ejs          # User statistics & account management
│   │   ├── leaderboard.ejs      # Top 10 players leaderboard
│   │   └── create-game.ejs      # Lobby creation form
│   ├── public/
│   │   ├── css/style.css        # Global styles & animations
│   │   └── js/main.js           # Client-side logic
│   ├── app.js                   # Main server & Socket.IO logic
│   ├── questions.json           # Trivia questions database
│   ├── package.json             # Node dependencies
│   └── .env                     # Environment variables (not in repo)
│
├── src/question_engine/         # Python question generation
│   ├── get_movie_list.py        # Fetch movies from TMDB API
│   ├── enrich_movie_list.py     # Add genres & cast to movies
│   ├── generate_questions.py    # Generate trivia questions
│   └── requirements.txt         # Python dependencies
│
├── data/                        # Generated data files
│   ├── movie_trivia_db.json     # Raw movie list
│   ├── movie_trivia_enriched.json # Movies with genres & cast
│   └── questions.json           # Final trivia questions
│
└── README.md
```

## 🛠 Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web server framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM

### Frontend
- **EJS** - Server-side templating engine
- **Bootstrap 5.3** - CSS framework
- **Animate.css** - Animation library
- **Socket.IO Client** - Real-time updates

### Question Generation
- **Python 3** - Script language
- **TMDB API** - Movie database source

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14+)
- Python 3.8+
- MongoDB (Atlas or local)
- TMDB API key (free at [themoviedb.org](https://www.themoviedb.org/settings/api))

### Quick Start

1. **Clone and navigate**
   ```bash
   git clone <repository-url>
   cd MovieZdom
   ```

2. **Install Node dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file** with required variables:
   ```env
   MONGO_URI=mongodb+srv://...
   SESSION_SECRET=your-secret-key
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   TMDB_API_KEY=your-api-key
   PORT=3000
   ```

4. **Generate questions** (one-time setup):
   ```bash
   cd src/question_engine
   pip install -r requirements.txt
   python get_movie_list.py
   python enrich_movie_list.py
   python generate_questions.py
   cd ../..
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🎮 How to Play

### Setup
1. Register and verify your email
2. Log in to your account
3. Browse available lobbies or create a new one

### Creating a Lobby
1. Click **"Νέο Παιχνίδι"** (New Game)
2. Enter lobby name, select a category, optionally set password
3. Click **"Δημιουργία & Είσοδος"** (Create & Join)
4. Wait for another player to join

### Playing a Game
1. Once 2 players join, a 3-second countdown begins
2. Answer 10 questions, one per screen
3. Each question has 10.5 seconds to answer
4. Correct answers = 3 points
5. View final scores and results
6. Return to dashboard or play again

### Viewing Leaderboard
1. Click **"Κατάταξη"** (Leaderboard) in the navigation menu
2. View the top 10 players ranked by total wins
3. See your position among the best players
4. Rankings update automatically as players win games

### Account Management
1. Navigate to your **Profile** page
2. View your game statistics and win rate
3. **Delete Account**: Click "Διαγραφή Λογαριασμού" (Delete Account)
4. Confirm deletion in the modal (irreversible action)
5. All your data will be permanently removed from the system

## 🎲 Question Categories

Available categories for filtering:
- 🎬 Action | Comedy | Crime | Documentary
- 🎭 Drama | Family | Fantasy | Horror
- 🎪 Mystery | Romance | Sci-Fi | Thriller
- 🤠 Western | Animation | Adventure

Questions are filtered by the selected category when creating a lobby.

## 📊 Game Mechanics

### Difficulty Rating
Questions are classified by movie popularity:
- **Easy**: Popular movies (prominence > 20)
- **Medium**: Moderate popularity (prominence 10-20)
- **Hard**: Lesser-known films (prominence < 10)

### Question Types
1. **Release Year** - Guess which year the movie was released
2. **Plot Description** - Identify movie from plot synopsis (title hidden)
3. **Actor & Character** - Name the actor playing a specific character

### Scoring
- Correct answer: +3 points
- Wrong answer: +0 points
- Fastest correct answer: No bonus (all correct answers equal)

## 🔒 Authentication & Security

- Email verification required before playing
- Password hashing for user accounts (bcrypt)
- Session-based authentication
- Optional private lobbies with password protection
- Secure account deletion with complete data removal
- All user data permanently deleted upon account deletion (user profile, statistics, created lobbies)

## 🎨 Design

### Color Palette
- **Primary**: #e94560 (vibrant red)
- **Background**: #1a1a2e (dark blue-black)
- **Cards**: #16213e (dark blue)
- **Accent**: #fca311 (orange)

### User Experience
- Dark theme for reduced eye strain
- Smooth animations and transitions
- Real-time timer visualization
- Mobile-responsive layout (Bootstrap grid)

## 📈 Database Models

### User
```javascript
{
  username: String,
  email: String (unique),
  password: String (bcrypt hashed),
  isVerified: Boolean,
  stats: {
    wins: Number,
    losses: Number,
    draws: Number,
    totalGames: Number
  },
  createdAt: Date
}
```

### Lobby
```javascript
{
  name: String,
  password: String (optional),
  category: String,
  creator: ObjectId (ref: User),
  players: [ObjectId] (ref: User, max 2),
  questions: Array (10 questions),
  status: String ('waiting' | 'playing' | 'finished'),
  playerScores: Map,
  createdAt: Date
}
```

## 🚀 Deployment Notes

- Server runs on `PORT` from `.env` (default 3000)
- MongoDB connection via `MONGO_URI`
- Email verification requires SMTP credentials
- Static files served from `public/` folder
- Socket.IO requires same origin or CORS configuration

## 📝 License

MIT License - See LICENSE file for details

## 👥 Contributors

**Group 1** - Web Engineering Master's Course (2025)

Group Members:
- ΒΡΑΧΑΣ ΧΑΡΗΣ
- ΑΡΓΥΡΙΟΥ ΓΙΑΝΝΗΣ
- ΜΟΥΡΑΤΙΔΗΣ ΠΑΥΛΟΣ
- ΑΠΟΣΤΟΛΙΔΗΣ ΚΩΝΣΤΑΝΤΙΝΟΣ
- ΜΩΡΑΤΗΣ ΚΩΝΣΤΑΝΤΙΝΟΣ
- LOSEVA TAISIA

---

**Made with ❤️ for movie trivia enthusiasts!** 🎬🍿

**Last Updated**: January 2026