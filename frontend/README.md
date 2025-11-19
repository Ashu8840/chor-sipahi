# Chor-Sipahi Frontend

Modern React frontend for the Chor-Sipahi multiplayer game with real-time gameplay and WebRTC support.

## 🚀 Features

- **React 18** with Vite for lightning-fast development
- **Tailwind CSS v4** for modern, responsive design
- **Framer Motion** for smooth animations
- **Socket.IO Client** for real-time game updates
- **Zustand** for lightweight state management
- **React Router** for seamless navigation
- **Axios** for API communication
- **React Hot Toast** for beautiful notifications

## 📋 Requirements

- Node.js 18+
- npm or yarn

## 🔧 Installation

1. **Navigate to frontend directory:**

   ```bash
   cd frontend
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
   VITE_API_URL=http://localhost:5000
   VITE_SOCKET_URL=http://localhost:5000
   ```

5. **Start development server:**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Navbar.jsx       # Main navigation bar
│   │   ├── Modal.jsx        # Modal dialog component
│   │   ├── Loading.jsx      # Loading spinner
│   │   └── RoleBadge.jsx    # Role display badge
│   │
│   ├── pages/            # Page components
│   │   ├── Landing.jsx      # Landing page
│   │   ├── Login.jsx        # Login page
│   │   ├── Signup.jsx       # Registration page
│   │   ├── Lobby.jsx        # Game lobby
│   │   ├── GameRoom.jsx     # Game room with live gameplay
│   │   ├── Profile.jsx      # User profile & stats
│   │   ├── Leaderboard.jsx  # Global & role leaderboards
│   │   ├── History.jsx      # Match history
│   │   └── Admin.jsx        # Admin panel
│   │
│   ├── services/         # API & Socket services
│   │   ├── api.js           # Axios API client
│   │   └── socket.js        # Socket.IO client
│   │
│   ├── context/          # State management
│   │   ├── authStore.js     # Authentication state
│   │   └── gameStore.js     # Game state
│   │
│   ├── utils/            # Utility functions
│   │   └── helpers.js       # Helper functions
│   │
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
│
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
├── package.json
└── README.md
```

## 🎨 Pages Overview

### Landing Page

- Game introduction and rules
- How to play guide
- Call-to-action buttons

### Authentication

- **Login**: Email + password authentication
- **Signup**: User registration with validation

### Lobby

- Browse available public rooms
- Create custom rooms (public/private with passkey)
- Quick match (random/video modes)
- Real-time matchmaking queue

### Game Room

- Live player list with ready status
- Role reveal and assignment
- Real-time chat system
- Round-by-round scoring
- Match results display
- WebRTC video integration (planned)

### Profile

- User statistics and achievements
- Win/loss record and win rate
- Role-specific performance stats
- Match history overview

### Leaderboard

- Global rankings (all-time, monthly, weekly)
- Role-specific leaderboards
- Personal rank display
- Top player highlights

### History

- Complete match history
- Detailed game results
- Performance metrics per match
- Pagination support

### Admin Panel (Admin Only)

- Platform statistics dashboard
- User management (ban/unban)
- Report moderation
- System monitoring

## 🔌 API Integration

All API calls are centralized in `src/services/api.js`:

```javascript
import {
  authAPI,
  roomAPI,
  matchAPI,
  leaderboardAPI,
  reportAPI,
  adminAPI,
} from "./services/api";

// Example usage
const response = await authAPI.login({ email, password });
const rooms = await roomAPI.getRooms();
```

## 🌐 Socket.IO Events

Socket client is in `src/services/socket.js`:

### Emit Events

```javascript
socketService.joinRoom(roomId, passkey);
socketService.playerReady(roomId, isReady);
socketService.guessChor(roomId, guessedUserId);
socketService.sendMessage(roomId, message);
socketService.joinMatchmaking(mode);
```

### Listen Events

```javascript
socketService.on("room_updated", handleRoomUpdated);
socketService.on("game_started", handleGameStarted);
socketService.on("role_revealed", handleRoleRevealed);
socketService.on("round_result", handleRoundResult);
socketService.on("match_found", handleMatchFound);
```

## 🎨 Styling

Using Tailwind CSS with custom utilities:

```jsx
// Pre-defined button styles
<button className="btn-primary">Primary Button</button>
<button className="btn-secondary">Secondary Button</button>
<button className="btn-outline">Outline Button</button>

// Card component
<div className="card">Content</div>

// Input field
<input className="input-field" />

// Badge
<span className="badge bg-primary-600">Badge</span>

// Role badge
<RoleBadge role="Raja" />
```

## 📦 State Management

Using Zustand for global state:

### Auth Store

```javascript
import { useAuthStore } from "./context/authStore";

const { user, isAuthenticated, login, logout } = useAuthStore();
```

### Game Store

```javascript
import { useGameStore } from "./context/gameStore";

const { currentRoom, myRole, messages, startGame, addMessage } = useGameStore();
```

## 🎯 Key Features Implementation

### Real-time Updates

- Socket.IO automatically syncs room state
- Players see live updates when others join/leave
- Chat messages broadcast in real-time
- Game state synchronized across all clients

### Responsive Design

- Mobile-first approach
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Touch-friendly UI elements
- Optimized for all screen sizes

### Animations

- Framer Motion for page transitions
- Smooth component entry/exit
- Loading states with spinners
- Interactive hover effects

### Error Handling

- Toast notifications for user feedback
- API error interceptors
- Socket error handlers
- Form validation

## 🚀 Build & Deploy

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

Output will be in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🔧 Configuration

### Vite Config (`vite.config.js`)

- Proxy API requests to backend
- WebSocket proxy for Socket.IO
- React plugin configuration

### Tailwind Config (`tailwind.config.js`)

- Custom color palette
- Extended animations
- Custom utility classes

## 🎮 Game Flow

1. **User Registration/Login**

   - Sign up with username, email, password
   - Login with stored credentials
   - JWT token stored in localStorage

2. **Lobby Navigation**

   - Browse public rooms
   - Create custom room
   - Join quick match queue

3. **Room Setup**

   - Wait for players (2-4)
   - All players mark ready
   - Host can start game (or auto-start when all ready)

4. **Gameplay**

   - Random role assignment
   - Role reveal to each player
   - Sipahi makes guess
   - Round results displayed
   - Process repeats for 10 rounds

5. **Match End**
   - Final standings shown
   - Stats updated on backend
   - Return to lobby option

## 🐛 Debugging

### Console Logs

Check browser console for:

- Socket connection status
- API request/response errors
- State updates

### React DevTools

Install React DevTools extension to inspect:

- Component tree
- Props and state
- Performance profiling

### Network Tab

Monitor:

- API calls
- WebSocket messages
- Failed requests

## 📝 Environment Variables

| Variable          | Default               | Description          |
| ----------------- | --------------------- | -------------------- |
| `VITE_API_URL`    | http://localhost:5000 | Backend API URL      |
| `VITE_SOCKET_URL` | http://localhost:5000 | Socket.IO server URL |

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

**Built with:** React, Vite, Tailwind CSS, Socket.IO, Framer Motion
