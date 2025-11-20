# 🎭 Chor-Sipahi Game - Technical Guide & Presentation Summary

## 📋 Project Overview

**Chor-Sipahi** is a full-stack multiplayer online game platform built using the MERN stack with real-time communication capabilities. It's a digital adaptation of the classic Indian card game where 4 players compete across 10 rounds, with role-based gameplay involving strategy, deception, and deduction.

---

## 🎯 Core Concept

- **Game Type**: Multiplayer role-playing game (4 players required)
- **Rounds**: 10 rounds per match
- **Roles**: Raja (King), Mantri (Minister), Sipahi (Police), Chor (Thief)
- **Objective**: Sipahi must identify the Chor; Chor must hide their identity
- **Scoring System**: Points awarded based on role and game outcome
- **Winner**: Player with highest accumulated points after 10 rounds

---

## 🛠️ Technology Stack

### **Frontend Technologies**

#### Core Framework & Build Tools

- **React 18.3.1** - Modern UI library with hooks and functional components
- **Vite 5.0.8** - Next-generation frontend build tool (faster than Webpack)
- **React Router DOM 6.20.0** - Client-side routing and navigation

#### State Management & Data Fetching

- **Zustand 4.4.7** - Lightweight state management (alternative to Redux)
- **Axios 1.6.2** - Promise-based HTTP client for API calls

#### UI & Styling

- **Tailwind CSS 4.0.0** - Utility-first CSS framework
- **Framer Motion 10.16.16** - Animation library for smooth transitions
- **Lucide React 0.294.0** - Beautiful icon library

#### Real-time Communication

- **Socket.IO Client 4.6.0** - WebSocket library for real-time bidirectional communication

#### Additional Features

- **React Hot Toast 2.4.1** - Toast notifications for user feedback
- **Simple Peer 9.11.1** - WebRTC wrapper for video calls

---

### **Backend Technologies**

#### Runtime & Framework

- **Node.js v24.6.0** - JavaScript runtime environment
- **Express 4.18.2** - Minimal and flexible web application framework

#### Database

- **MongoDB** - NoSQL database for flexible document storage
- **Mongoose 8.0.3** - ODM (Object Data Modeling) library for MongoDB

#### Authentication & Security

- **JSON Web Token (JWT) 9.0.2** - Secure token-based authentication
- **bcryptjs 2.4.3** - Password hashing and encryption
- **express-validator 7.0.1** - Request validation and sanitization
- **express-rate-limit 7.1.5** - API rate limiting for security

#### Real-time Communication

- **Socket.IO 4.6.0** - Server-side WebSocket implementation

#### Utilities

- **dotenv 16.3.1** - Environment variable management
- **cors 2.8.5** - Cross-Origin Resource Sharing middleware
- **winston 3.11.0** - Logging library for debugging and monitoring
- **nodemon 3.0.2** - Auto-restart development server on file changes

---

## 🏗️ Project Architecture

### **Frontend Architecture**

```
frontend/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Navbar.jsx     # Navigation bar
│   │   ├── Modal.jsx      # Reusable modal component
│   │   ├── Loading.jsx    # Loading spinner
│   │   ├── FloatingChat.jsx # In-game chat
│   │   ├── RoleBadge.jsx  # Role display component
│   │   └── VideoGrid.jsx  # WebRTC video windows (draggable)
│   │
│   ├── pages/             # Main application pages
│   │   ├── Login.jsx      # User authentication
│   │   ├── Register.jsx   # User registration
│   │   ├── Lobby.jsx      # Room browsing & creation
│   │   ├── GameRoom.jsx   # Waiting room before game starts
│   │   ├── GamePanel.jsx  # Main gameplay interface
│   │   ├── Leaderboard.jsx # Global rankings
│   │   ├── History.jsx    # Match history
│   │   └── Profile.jsx    # User profile & stats
│   │
│   ├── context/           # Global state management
│   │   ├── authStore.js   # Authentication state (Zustand)
│   │   └── gameStore.js   # Game state management
│   │
│   ├── services/          # External service integrations
│   │   ├── api.js         # REST API calls
│   │   └── socket.js      # Socket.IO connection management
│   │
│   └── utils/             # Helper functions
│       └── helpers.js     # Common utilities
```

### **Backend Architecture**

```
backend/
├── src/
│   ├── config/            # Configuration files
│   │   ├── database.js    # MongoDB connection
│   │   ├── logger.js      # Winston logger setup
│   │   └── game.config.js # Game rules configuration
│   │
│   ├── models/            # MongoDB schemas
│   │   ├── User.model.js  # User data & stats
│   │   ├── Room.model.js  # Game room data
│   │   └── Match.model.js # Match history records
│   │
│   ├── controllers/       # Business logic
│   │   ├── auth.controller.js  # Authentication logic
│   │   ├── user.controller.js  # User management
│   │   ├── room.controller.js  # Room operations
│   │   └── match.controller.js # Match queries
│   │
│   ├── routes/            # API endpoints
│   │   ├── auth.routes.js      # /api/auth/*
│   │   ├── user.routes.js      # /api/users/*
│   │   ├── room.routes.js      # /api/rooms/*
│   │   ├── match.routes.js     # /api/matches/*
│   │   └── leaderboard.routes.js # /api/leaderboard/*
│   │
│   ├── middleware/        # Express middleware
│   │   ├── auth.middleware.js  # JWT verification
│   │   └── validate.middleware.js # Request validation
│   │
│   ├── socket/            # Real-time functionality
│   │   └── socketHandler.js # All game socket events
│   │
│   └── services/          # Business services
│       ├── gameEngine.service.js    # Game logic
│       └── matchmaking.service.js   # Queue system
```

---

## 🔌 Key Features & Implementation

### **1. Authentication System**

- **JWT-based authentication** with HTTP-only cookies
- **Password hashing** using bcrypt (10 salt rounds)
- **Token expiration** and refresh mechanism
- **Protected routes** on both frontend and backend

### **2. Real-time Game System**

- **Socket.IO** for bidirectional communication
- **Event-driven architecture** for game actions:
  - `join_room` - Player joins a room
  - `player_ready` - Ready status toggle
  - `start_round` - Host starts the game
  - `shuffle_roles` - Shuffler assigns roles
  - `role_assigned` - Each player receives secret role
  - `guess_chor` - Sipahi makes their guess
  - `guess_result` - Round results with points
  - `next_round` - Proceed to next round
  - `game_finished` - Game completion with winner

### **3. Video Call Feature (WebRTC)**

- **Peer-to-peer video streaming** using native WebRTC
- **4 draggable camera windows** (one for each player)
- **Mute/unmute audio** and disable/enable video controls
- **Automatic cleanup** when players leave or disconnect
- **STUN servers** for NAT traversal (Google STUN servers)
- **Signal relay** through Socket.IO for peer discovery

### **4. Game Modes**

- **Random Chat Match** - Text-based gameplay with quick room creation
- **Video Room Match** - Game with live video streaming
- **Private Rooms** - Password-protected rooms for friends
- **Public Rooms** - Open rooms visible in lobby

### **5. Scoring System**

Points per round based on role and outcome:

- **Raja**: 1000 points (if Sipahi guesses correctly), 0 (if wrong)
- **Mantri**: 500 points (if Sipahi guesses correctly), 0 (if wrong)
- **Sipahi**: 300 points (if guess correctly), 0 (if wrong)
- **Chor**: 300 points (if escapes), 0 (if caught)

### **6. Statistics & History**

- **Match History** - Complete record of all games with round details
- **Leaderboard** - Global rankings by total points
- **Profile Stats** - Win rate, role performance, matches played
- **Persistent Storage** - All data saved to MongoDB

---

## 📊 Database Schema

### **User Model**

```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  displayName: String,
  avatar: String,
  stats: {
    matchesPlayed: Number,
    wins: Number,
    losses: Number,
    totalPoints: Number,
    roles: {
      Raja: { timesPlayed, wins, points },
      Mantri: { timesPlayed, wins, points },
      Sipahi: { timesPlayed, correct, wrong },
      Chor: { timesPlayed, escaped, caught }
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

### **Room Model**

```javascript
{
  roomId: String (unique),
  name: String,
  mode: Enum ['chat', 'video'],
  isPublic: Boolean,
  passkey: String (hashed, optional),
  host: ObjectId (User ref),
  players: Array [{ userId, username, displayName, isReady }],
  status: Enum ['waiting', 'playing', 'finished'],
  currentRound: Number,
  totalRounds: Number (default: 10),
  gameState: {
    matchId: ObjectId (Match ref),
    scores: Map<userId, points>,
    roles: Map<userId, role>,
    currentShuffler: String,
    chorUserId: String
  }
}
```

### **Match Model**

```javascript
{
  roomId: String,
  mode: Enum ['chat', 'video'],
  players: Array [{ userId, username, finalScore, placement }],
  rounds: Array [{
    roundNumber: Number,
    roles: Map<userId, role>,
    sipahi: { userId, username },
    chor: { userId, username },
    guessedPlayer: { userId, username },
    correctGuess: Boolean,
    roundScores: Map<userId, points>
  }],
  winner: { userId, username, finalScore },
  status: Enum ['in-progress', 'completed', 'abandoned'],
  startTime: Date,
  endTime: Date,
  duration: Number (seconds)
}
```

---

## 🔄 Game Flow

1. **Lobby Phase**

   - Browse available rooms or create new one
   - Choose mode (Chat/Video)
   - Set room name and optional password

2. **Waiting Room**

   - 4 players required to start
   - All players must mark as "Ready"
   - Host clicks "Start Game"

3. **Game Start**

   - Match document created in database
   - Random shuffler selected
   - Round 1 begins

4. **Round Flow** (×10 rounds)

   - Shuffler clicks "Shuffle Roles"
   - Each player receives secret role
   - Raja and Mantri reveal themselves
   - Sipahi observes and makes guess
   - Points awarded based on correctness
   - 5-second delay before next round

5. **Game End**
   - After 10 rounds, winner declared
   - Final scores displayed
   - Match saved to history
   - User stats updated
   - Leaderboard refreshed

---

## 🌐 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

### Rooms

- `GET /api/rooms` - List all rooms
- `GET /api/rooms/:roomId` - Get specific room
- `POST /api/rooms` - Create new room
- `POST /api/rooms/:roomId/leave` - Leave room

### Matches

- `GET /api/matches/my-matches` - User's match history
- `GET /api/matches/:matchId` - Specific match details

### Leaderboard

- `GET /api/leaderboard` - Global rankings
- `GET /api/leaderboard/role/:role` - Role-specific rankings

### Users

- `GET /api/users/:userId/stats` - User statistics
- `PUT /api/users/profile` - Update profile

---

## 🚀 WebSocket Events

### Client → Server

- `join_room` - Join a game room
- `leave_room` - Leave current room
- `player_ready` - Toggle ready status
- `start_round` - Start the game (host only)
- `shuffle_roles` - Assign roles (shuffler only)
- `guess_chor` - Make guess (Sipahi only)
- `send_message` - Send chat message
- `webrtc_signal` - WebRTC signaling for video

### Server → Client

- `room_updated` - Room state changed
- `can_start_game` - All players ready
- `game_started` - Game begins
- `role_assigned` - Receive your role
- `roles_shuffled` - Roles assigned to all
- `guess_result` - Round result with points
- `next_round` - New round starts
- `game_finished` - Game completed
- `new_message` - Chat message received
- `webrtc_signal` - WebRTC signal from peer

---

## 🔒 Security Features

1. **Password Security**

   - bcrypt hashing with 10 salt rounds
   - No plain text password storage

2. **Authentication**

   - JWT tokens with expiration
   - HTTP-only cookies to prevent XSS
   - Token verification on protected routes

3. **API Security**

   - Rate limiting (100 requests per 15 minutes)
   - Input validation using express-validator
   - CORS configuration for allowed origins
   - MongoDB injection prevention via Mongoose

4. **Room Security**
   - Password-protected rooms
   - Host-only game start
   - Role assignment verification
   - Player authentication checks

---

## 💡 Technical Highlights

### **Performance Optimizations**

- Vite for faster development builds
- React lazy loading for code splitting
- Zustand for minimal re-renders
- Socket.IO connection pooling
- MongoDB indexing on frequently queried fields

### **User Experience**

- Toast notifications for feedback
- Loading states for async operations
- Smooth animations with Framer Motion
- Responsive design for all screen sizes
- Real-time updates without page refresh

### **Code Quality**

- Modular component architecture
- Separation of concerns (MVC pattern)
- Centralized error handling
- Comprehensive logging with Winston
- Environment-based configuration

---

## 📈 Scalability Considerations

1. **Database**

   - Indexed fields for fast queries
   - Proper schema design with references
   - Connection pooling

2. **WebSockets**

   - Room-based event broadcasting
   - Connection tracking with Map
   - Automatic cleanup on disconnect

3. **Video Streaming**
   - Peer-to-peer connections (no server relay)
   - Bandwidth efficient
   - Scales with number of rooms, not total users

---

## 🎓 Learning Outcomes

This project demonstrates proficiency in:

1. **Full-Stack Development** - MERN stack implementation
2. **Real-time Systems** - WebSocket communication patterns
3. **WebRTC** - Peer-to-peer video streaming
4. **State Management** - Complex game state handling
5. **Database Design** - Relational and document modeling
6. **Authentication** - Secure user management
7. **API Design** - RESTful endpoints
8. **DevOps** - Environment configuration, logging
9. **UI/UX** - Responsive, animated interfaces
10. **Problem Solving** - Game logic implementation

---

## 🎯 Project Statistics

- **Total Files**: ~30+ files
- **Lines of Code**: ~5,000+ lines
- **Components**: 15+ React components
- **API Endpoints**: 15+ REST endpoints
- **Socket Events**: 15+ real-time events
- **Database Models**: 3 main schemas
- **Features**: Authentication, Real-time gameplay, Video calls, History, Leaderboard, Profiles

---

## 🚀 Quick Start Commands

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

**Backend (.env)**

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chor-sipahi
JWT_SECRET=your_secret_key
NODE_ENV=development
```

**Frontend (.env)**

```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🎤 Presentation Key Points

### **What Problem Does It Solve?**

- Brings traditional Indian card game online
- Enables remote multiplayer gameplay
- Provides persistent statistics and rankings
- Adds video communication for social interaction

### **Why These Technologies?**

- **React**: Component-based, efficient re-rendering
- **Socket.IO**: Reliable real-time communication
- **MongoDB**: Flexible schema for game data
- **Zustand**: Lightweight, easy state management
- **WebRTC**: Standard for peer-to-peer video

### **Unique Features**

- Draggable video windows during gameplay
- Automatic match history tracking
- Role-based game mechanics
- Real-time scoring system
- Password-protected private rooms

### **Challenges Overcome**

- Synchronizing game state across 4 players
- Handling player disconnections gracefully
- WebRTC peer connection management
- Nested MongoDB object updates
- Real-time video with game UI

### **Future Enhancements**

- Mobile app (React Native)
- Tournament mode
- Replay system
- AI opponents
- Voice chat
- More game modes

---

## 📝 Conclusion

This project showcases a complete, production-ready multiplayer game platform with modern web technologies, demonstrating full-stack capabilities, real-time systems, and advanced features like WebRTC video streaming.

---

**Developed by**: Ayush Tripathi  
**Repository**: github.com/Ashu8840/chor-sipahi  
**Technology Stack**: MERN + Socket.IO + WebRTC  
**Duration**: Complete full-stack implementation  
**Status**: Fully functional with all features implemented
