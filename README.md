# 🎭 Chor-Sipahi - Multiplayer Game Platform

A full-featured online multiplayer platform for the classic Indian game of bluff, detection, and strategy! Complete with authentication, matchmaking, leaderboards, match history, and real-time gameplay.

## 🎮 About the Game

Chor-Sipahi (Thief-Police) is a beloved Indian game that combines mystery, excitement, luck, and psychological play. Four players are secretly assigned roles, and the Sipahi (Police) must identify who the Chor (Thief) is while the Chor tries to hide their identity through clever bluffing.

### 👥 Game Roles

- **👑 Raja (King)**: The highest authority - Always earns 1000 points
- **📜 Mantri (Minister)**: Helper of the Raja - Always earns 800 points
- **👮 Sipahi (Police)**: Must identify the Chor - Earns 500 points if correct, 0 if wrong
- **🦹 Chor (Thief)**: Must hide their identity - Earns 0 points if caught, 1000 if they escape

### 🎯 How to Play

1. **Join a Room**: Create a new room or join an existing one (4 players required)
2. **Role Assignment**: Roles are randomly and secretly assigned to each player
3. **Reveal Phase**: Raja and Mantri reveal their roles to everyone
4. **Detection Phase**: Sipahi observes players and tries to identify the Chor
5. **Bluffing Phase**: Chor tries to act innocent and mislead the Sipahi
6. **Guess**: Sipahi selects who they think is the Chor
7. **Round Result**: All roles are revealed and points are awarded
8. **Multiple Rounds**: Play 10 rounds - highest total score wins!

## ✨ Platform Features

### 🔐 Authentication System

- User registration with email verification
- Secure JWT-based authentication
- Profile management with avatar uploads
- Password reset functionality

### 🎲 Game Modes

- **Quick Match**: Instant matchmaking with random players
- **Private Rooms**: Create password-protected rooms for friends
- **Public Rooms**: Join open rooms with available slots
- **Video Rooms**: Game rooms with optional video chat (WebRTC)

### 📊 Statistics & Rankings

- **Personal Profile**: View your stats, win rates, and role-specific performance
- **Global Leaderboard**: Rankings with all-time, monthly, and weekly filters
- **Role-specific Rankings**: See who's the best Raja, Mantri, Sipahi, or Chor
- **Match History**: Detailed logs of all your past games

### 💬 Social Features

- Real-time in-game chat
- Player reporting system
- Admin moderation panel
- Friend system (coming soon)

### 🎨 User Experience

- Beautiful, responsive design with Tailwind CSS
- Smooth animations with Framer Motion
- Toast notifications for all actions
- Loading states and error handling

## 🏗️ Project Structure

```
chor-sipahi/
├── backend/                 # Backend server
│   ├── config/             # Configuration files
│   │   ├── db.js          # MongoDB connection
│   │   └── cloudinary.js  # Cloudinary config
│   ├── middleware/         # Express middleware
│   │   ├── auth.js        # JWT authentication
│   │   ├── admin.js       # Admin authorization
│   │   ├── rateLimiter.js # Rate limiting
│   │   └── errorHandler.js # Error handling
│   ├── models/             # MongoDB schemas
│   │   ├── User.js        # User model
│   │   ├── Room.js        # Game room model
│   │   ├── Match.js       # Match history model
│   │   └── Report.js      # User report model
│   ├── controllers/        # Route handlers
│   │   ├── authController.js      # Auth logic
│   │   ├── roomController.js      # Room management
│   │   ├── matchController.js     # Match history
│   │   ├── leaderboardController.js # Rankings
│   │   ├── reportController.js    # Reports
│   │   └── adminController.js     # Admin actions
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   │   ├── gameService.js        # Game mechanics
│   │   ├── matchmakingService.js # Matchmaking queue
│   │   └── webrtcSignaling.js    # Video signaling
│   ├── sockets/            # Socket.IO handlers
│   │   └── gameHandler.js # Real-time game events
│   └── server.js           # Entry point
│
└── frontend/               # React frontend
    └── vite-project/
        ├── src/
        │   ├── components/     # Reusable components
        │   │   ├── Navbar.jsx
        │   │   ├── Modal.jsx
        │   │   ├── Loading.jsx
        │   │   └── RoleBadge.jsx
        │   ├── pages/          # Route pages
        │   │   ├── Landing.jsx     # Marketing page
        │   │   ├── Login.jsx       # Login form
        │   │   ├── Signup.jsx      # Registration
        │   │   ├── Lobby.jsx       # Game lobby
        │   │   ├── GameRoom.jsx    # Live gameplay
        │   │   ├── Profile.jsx     # User profile
        │   │   ├── Leaderboard.jsx # Rankings
        │   │   ├── History.jsx     # Match history
        │   │   └── Admin.jsx       # Admin panel
        │   ├── services/       # External services
        │   │   ├── api.js         # Axios API client
        │   │   └── socket.js      # Socket.IO client
        │   ├── context/        # State management
        │   │   ├── authStore.js   # Auth state (Zustand)
        │   │   └── gameStore.js   # Game state (Zustand)
        │   ├── utils/          # Helper functions
        │   │   └── helpers.js
        │   ├── App.jsx         # Main app & routing
        │   └── main.jsx        # React entry point
        └── vite.config.js      # Vite configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**

```bash
cd backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Create environment file**

Create `.env` in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/chor-sipahi
# or use MongoDB Atlas: mongodb+srv://<username>:<password>@cluster.mongodb.net/chor-sipahi

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Client Configuration
CLIENT_URL=http://localhost:5173

# Cloudinary (for avatar uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (optional - for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

4. **Start the backend server**

```bash
npm run dev
```

Server will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**

```bash
cd frontend/vite-project
```

2. **Install dependencies**

```bash
npm install
```

3. **Create environment file**

Create `.env` in the `frontend/vite-project` directory:

```env
VITE_API_URL=http://localhost:5000
```

4. **Start the development server**

```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

### Quick Start (Both Servers)

From the root directory, you can run both servers with:

```bash
npm run dev
```

## 🛠️ Technology Stack

### Backend

- **Runtime**: Node.js v16+
- **Framework**: Express.js 4.18
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **Real-time**: Socket.IO 4.6
- **File Upload**: Multer + Cloudinary
- **Validation**: express-validator
- **Security**: helmet, cors, express-rate-limit
- **WebRTC**: simple-peer (for video signaling)

### Frontend

- **Framework**: React 18.3
- **Build Tool**: Vite 5.0
- **Styling**: Tailwind CSS 4.0
- **State Management**: Zustand 4.4
- **Routing**: React Router 6.20
- **HTTP Client**: Axios 1.6
- **Real-time**: Socket.IO Client 4.6
- **Animations**: Framer Motion 10.16
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **WebRTC**: simple-peer 9.11

## 📡 API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password

### Rooms

- `GET /api/rooms` - List all public rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms/:id/join` - Join room
- `POST /api/rooms/:id/leave` - Leave room
- `DELETE /api/rooms/:id` - Delete room (creator only)

### Matches

- `GET /api/matches` - Get user's match history
- `GET /api/matches/:id` - Get match details

### Leaderboard

- `GET /api/leaderboard/global` - Global rankings
- `GET /api/leaderboard/role/:role` - Role-specific rankings
- `GET /api/leaderboard/stats` - Overall stats

### Reports

- `POST /api/reports` - Submit report
- `GET /api/reports` - Get reports (admin only)
- `PUT /api/reports/:id` - Update report status (admin only)

### Admin

- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/ban` - Ban user
- `PUT /api/admin/users/:id/unban` - Unban user
- `GET /api/admin/stats` - Platform statistics

## 🔌 Socket.IO Events

### Client → Server

- `join_room` - Join a game room
- `leave_room` - Leave current room
- `player_ready` - Mark player as ready
- `reveal_role` - Reveal role (Raja/Mantri only)
- `guess_chor` - Make guess (Sipahi only)
- `send_message` - Send chat message
- `join_matchmaking` - Join matchmaking queue
- `leave_matchmaking` - Leave queue

### Server → Client

- `room_updated` - Room state changed
- `game_started` - Game has begun
- `role_revealed` - A player revealed their role
- `round_result` - Round ended with results
- `next_round` - New round started
- `game_ended` - Match finished
- `new_message` - New chat message
- `matchmaking_update` - Queue status update
- `error` - Error occurred

## 🎮 Game Flow

1. **Lobby Phase**: Players create/join rooms, wait for 4 players
2. **Ready Phase**: All players mark ready, game starts
3. **Role Assignment**: Roles randomly distributed to all players
4. **Reveal Phase**: Raja and Mantri reveal themselves
5. **Discussion**: Players chat and observe (Chor tries to blend in)
6. **Guessing**: Sipahi makes their guess
7. **Round End**: Roles revealed, points awarded
8. **Next Round**: After 5 seconds, next round begins (repeat steps 3-7)
9. **Match End**: After 10 rounds, final scores shown, winner announced
10. **Lobby Return**: Players return to lobby for another match

### Scoring System

| Role   | Condition     | Points |
| ------ | ------------- | ------ |
| Raja   | Always        | 1000   |
| Mantri | Always        | 800    |
| Sipahi | Correct Guess | 500    |
| Sipahi | Wrong Guess   | 0      |
| Chor   | Caught        | 0      |
| Chor   | Escaped       | 1000   |

## 🚢 Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Set environment variables in your hosting platform
2. Ensure MongoDB is accessible (use MongoDB Atlas for cloud)
3. Update `CLIENT_URL` to your frontend domain
4. Deploy from `backend` directory

### Frontend Deployment (Vercel/Netlify)

1. Build the production bundle:

```bash
cd frontend/vite-project
npm run build
```

2. Update `VITE_API_URL` to your backend URL
3. Deploy the `dist` folder

### Docker Deployment (Optional)

Create `Dockerfile` in backend:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

## 🐛 Troubleshooting

**Backend won't start?**

- Check MongoDB connection string
- Ensure port 5000 is available
- Verify all environment variables are set

**Frontend can't connect to backend?**

- Check `VITE_API_URL` in frontend `.env`
- Verify backend is running on correct port
- Check CORS settings in `server.js`

**Socket.IO connection failing?**

- Ensure both servers are running
- Check WebSocket is not blocked by firewall
- Verify proxy configuration in `vite.config.js`

**Game not starting?**

- Ensure exactly 4 players have joined
- All players must click "Ready"
- Check browser console for errors

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

ISC License

## 👨‍💻 Developer

Made with ❤️ by Ashu8840

## 🎉 Enjoy!

Have fun playing Chor-Sipahi with your friends! May the best bluffer (or detective) win! 🕵️‍♂️🦹‍♂️
