# Chor-Sipahi Backend

Complete backend API and WebSocket server for the Chor-Sipahi multiplayer game.

## 🚀 Features

- **JWT Authentication** - Secure user authentication with token-based auth
- **Case-Insensitive Usernames** - Server-side validation with MongoDB collation
- **Real-time Gaming** - Socket.IO for instant gameplay and chat
- **WebRTC Support** - Video call signaling for 4-player video rooms
- **Matchmaking System** - Automated queue-based player matching
- **Room Management** - Public/private rooms with passkey protection
- **Match History** - Complete round-by-round game persistence
- **Leaderboards** - Global rankings (weekly/monthly/all-time) + role-specific boards
- **Admin Panel** - User moderation, ban system, report management
- **Rate Limiting** - DDoS protection on all critical endpoints
- **Avatar Upload** - Image optimization with Sharp (200x200 WebP)

## 📋 Requirements

- Node.js 18+
- MongoDB 6.0+
- npm or yarn

## 🔧 Installation

1. **Navigate to backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables in `.env`:**

   ```env
   # Server
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173

   # Database
   MONGODB_URI=mongodb://localhost:27017/chor-sipahi

   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-this
   JWT_EXPIRE=30d

   # Game Configuration
   MATCH_ROUNDS=10
   MAX_PLAYERS=4

   # Scoring (points)
   RAJA_WIN_POINTS=1000
   MANTRI_WIN_POINTS=800
   SIPAHI_WIN_POINTS=500
   SIPAHI_LOSE_POINTS=0
   CHOR_WIN_POINTS=1000
   CHOR_LOSE_POINTS=0
   ```

5. **Ensure MongoDB is running:**

   ```bash
   # If using local MongoDB
   mongod

   # Or using MongoDB Atlas, update MONGODB_URI in .env
   ```

6. **Start the server:**

   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # MongoDB connection
│   │   ├── logger.js     # Winston logger setup
│   │   └── game.config.js # Game rules & scoring
│   │
│   ├── models/           # Mongoose schemas
│   │   ├── User.model.js    # User authentication & stats
│   │   ├── Room.model.js    # Game rooms
│   │   ├── Match.model.js   # Match history
│   │   └── Report.model.js  # User reports
│   │
│   ├── middleware/       # Express middleware
│   │   ├── auth.middleware.js       # JWT authentication
│   │   ├── validation.middleware.js # Input validation
│   │   ├── rateLimiter.middleware.js # Rate limiting
│   │   └── upload.middleware.js     # Avatar upload
│   │
│   ├── controllers/      # Request handlers
│   │   ├── auth.controller.js
│   │   ├── room.controller.js
│   │   ├── match.controller.js
│   │   ├── leaderboard.controller.js
│   │   ├── admin.controller.js
│   │   └── report.controller.js
│   │
│   ├── routes/           # API routes
│   │   ├── auth.routes.js
│   │   ├── room.routes.js
│   │   ├── match.routes.js
│   │   ├── leaderboard.routes.js
│   │   ├── admin.routes.js
│   │   └── report.routes.js
│   │
│   ├── services/         # Business logic
│   │   ├── gameEngine.service.js    # Role assignment & scoring
│   │   └── matchmaking.service.js   # Queue-based matchmaking
│   │
│   ├── socket/           # WebSocket handlers
│   │   └── socketHandler.js # Socket.IO events
│   │
│   └── server.js         # Express app entry point
│
├── uploads/              # Uploaded files
│   └── avatars/          # User avatars
│
├── logs/                 # Application logs
│   ├── error.log
│   └── combined.log
│
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🔌 API Endpoints

### Authentication (`/api/auth`)

- `POST /signup` - Create new account
- `POST /login` - Login with credentials
- `GET /me` - Get current user profile
- `PUT /profile` - Update profile (with avatar upload)
- `POST /logout` - Logout user

### Rooms (`/api/rooms`)

- `POST /` - Create new room
- `GET /` - Get all public rooms
- `GET /:roomId` - Get room details
- `POST /:roomId/join` - Join room (with optional passkey)
- `POST /:roomId/leave` - Leave room
- `DELETE /:roomId` - Delete room (host only)

### Matches (`/api/matches`)

- `GET /my-matches` - Get user's match history
- `GET /defeated` - Get defeated players
- `GET /defeated-by` - Get players defeated by
- `GET /player/:userId` - Get player stats
- `GET /:matchId` - Get match details

### Leaderboard (`/api/leaderboard`)

- `GET /` - Get global leaderboard (weekly/monthly/all-time)
- `GET /role/:role` - Get role-specific leaderboard
- `GET /top` - Get top 10 players

### Admin (`/api/admin`) - Admin only

- `GET /stats` - Get platform statistics
- `GET /users` - Get all users
- `POST /users/:userId/ban` - Ban user
- `POST /users/:userId/unban` - Unban user
- `DELETE /users/:userId` - Delete user
- `GET /rooms` - Get all rooms
- `DELETE /rooms/:roomId` - Delete room
- `GET /reports` - Get all reports
- `PUT /reports/:reportId` - Update report status

### Reports (`/api/reports`)

- `POST /` - Submit new report
- `GET /my-reports` - Get user's submitted reports

## 🎮 Socket.IO Events

### Client → Server Events

| Event               | Data                               | Description            |
| ------------------- | ---------------------------------- | ---------------------- |
| `join_room`         | `{ roomId, passkey? }`             | Join a game room       |
| `leave_room`        | `{ roomId }`                       | Leave current room     |
| `player_ready`      | `{ roomId, isReady }`              | Toggle ready status    |
| `start_round`       | `{ roomId }`                       | Start game (host only) |
| `reveal_role`       | `{ roomId }`                       | Request role reveal    |
| `guess_chor`        | `{ roomId, guessedUserId }`        | Sipahi guesses Chor    |
| `send_message`      | `{ roomId, message }`              | Send chat message      |
| `join_matchmaking`  | `{ mode }`                         | Join matchmaking queue |
| `leave_matchmaking` | -                                  | Leave matchmaking      |
| `webrtc_signal`     | `{ roomId, targetUserId, signal }` | WebRTC signaling       |

### Server → Client Events

| Event                  | Data                                          | Description              |
| ---------------------- | --------------------------------------------- | ------------------------ |
| `room_updated`         | `{ room }`                                    | Room state changed       |
| `joined_room`          | `{ room }`                                    | Successfully joined room |
| `left_room`            | `{ roomId }`                                  | Successfully left room   |
| `game_start_countdown` | `{ seconds }`                                 | Countdown before game    |
| `game_started`         | `{ roundNumber, totalRounds }`                | Game has started         |
| `role_revealed`        | `{ role }`                                    | Player's role            |
| `round_result`         | `{ correctGuess, actualChor, scores, roles }` | Round ended              |
| `next_round`           | `{ roundNumber, totalRounds }`                | New round started        |
| `game_ended`           | `{ matchId, results, winner }`                | Match completed          |
| `new_message`          | `{ userId, username, message, timestamp }`    | Chat message             |
| `match_found`          | `{ roomId, room }`                            | Matchmaking success      |
| `matchmaking_joined`   | `{ mode, position }`                          | Joined queue             |
| `matchmaking_left`     | `{ success }`                                 | Left queue               |
| `webrtc_signal`        | `{ fromUserId, signal }`                      | WebRTC signaling         |
| `error`                | `{ message }`                                 | Error occurred           |

## 🎯 Game Logic

### Roles & Scoring

| Role       | Win Condition            | Win Points | Lose Points |
| ---------- | ------------------------ | ---------- | ----------- |
| **Raja**   | Sipahi guesses correctly | 1000       | 0           |
| **Mantri** | Sipahi guesses correctly | 800        | 0           |
| **Sipahi** | Guesses Chor correctly   | 500        | 0           |
| **Chor**   | Sipahi guesses wrong     | 1000       | 0           |

### Match Flow

1. **Room Creation** - Host creates room (public/private)
2. **Player Join** - Up to 4 players join
3. **Ready Check** - All players mark ready
4. **Role Assignment** - Random roles distributed
5. **Round Play** - Sipahi guesses Chor identity
6. **Score Calculation** - Points awarded based on rules
7. **Repeat** - Process repeats for 10 rounds (configurable)
8. **Match End** - Winner determined by total points

### Matchmaking

- Two modes: `random` (chat only) and `video` (4-way video call)
- Queue system matches 4 players automatically
- Stale entries auto-removed after 10 minutes
- Real-time position updates

## 🔐 Security Features

- **Helmet** - Security headers
- **Rate Limiting** - API (100/15min), Auth (5/15min), Room (3/min), Report (10/hr)
- **Input Validation** - Express-validator + XSS sanitization
- **Password Hashing** - bcrypt with 10 rounds
- **Passkey Protection** - Hashed room passkeys
- **JWT Authentication** - Token-based auth with expiration
- **Ban System** - Admin can ban abusive users

## 🧪 Testing

```bash
# Run tests with coverage
npm test
```

## 📊 Logging

Winston logger with two transports:

- **error.log** - Error level and above
- **combined.log** - All logs (info, warn, error)

Logs include:

- User authentication
- Room creation/deletion
- Game events
- Matchmaking activity
- Admin actions

## 🐛 Debugging

Check logs directory:

```bash
tail -f logs/combined.log
tail -f logs/error.log
```

Health check endpoint:

```bash
curl http://localhost:5000/health
```

## 🚀 Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use MongoDB Atlas for cloud database
3. Generate strong `JWT_SECRET`
4. Configure `FRONTEND_URL` to production domain
5. Use process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name chor-sipahi-backend
   pm2 save
   pm2 startup
   ```

## 📝 Environment Variables

| Variable       | Default                               | Description                |
| -------------- | ------------------------------------- | -------------------------- |
| `PORT`         | 5000                                  | Server port                |
| `NODE_ENV`     | development                           | Environment mode           |
| `MONGODB_URI`  | mongodb://localhost:27017/chor-sipahi | Database URI               |
| `JWT_SECRET`   | -                                     | JWT signing key (required) |
| `JWT_EXPIRE`   | 30d                                   | Token expiration           |
| `FRONTEND_URL` | http://localhost:5173                 | CORS origin                |
| `MATCH_ROUNDS` | 10                                    | Rounds per match           |
| `MAX_PLAYERS`  | 4                                     | Max players per room       |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

## 📄 License

MIT

## 🆘 Support

For issues and questions, please open an issue on GitHub.

---

**Built with:** Node.js, Express, MongoDB, Socket.IO, JWT
