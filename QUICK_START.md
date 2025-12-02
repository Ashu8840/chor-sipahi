# 🚀 Quick Start Guide - Chor-Sipahi & Bingo Game

## Prerequisites

- Node.js v24+ installed
- MongoDB running (local or cloud)
- Modern browser (Chrome, Firefox, Edge)

---

## 🎯 First Time Setup

### 1. Install Dependencies

**Backend:**

```powershell
cd "c:\Users\Ayush Tripathi\Documents\GitHub\chor-sipahi\backend"
npm install
```

**Frontend:**

```powershell
cd "c:\Users\Ayush Tripathi\Documents\GitHub\chor-sipahi\frontend"
npm install
```

### 2. Configure Environment Variables

**Backend** - Create/verify `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=http://localhost:5173
```

**Frontend** - Already configured in `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🎮 Running the Application

### Start Backend (Terminal 1)

```powershell
cd "c:\Users\Ayush Tripathi\Documents\GitHub\chor-sipahi\backend"
nodemon server.js
```

**Expected Output:**

```
info: 🚀 Server running on port 5000
info: 📝 Environment: development
info: 🎮 Socket.IO initialized
info: ✅ MongoDB Connected: [your-mongodb-cluster]
```

### Start Frontend (Terminal 2)

```powershell
cd "c:\Users\Ayush Tripathi\Documents\GitHub\chor-sipahi\frontend"
npm run dev
```

**Expected Output:**

```
VITE v5.x.x ready in XXX ms
➜ Local: http://localhost:5173/
```

---

## 👥 Testing with Multiple Users

### Option 1: Multiple Browser Windows

1. Open http://localhost:5173 in your browser
2. Sign up as User 1
3. Open **Incognito/Private Window**
4. Open http://localhost:5173 in incognito
5. Sign up as User 2

### Option 2: Different Browsers

1. Chrome: User 1
2. Firefox: User 2
3. Edge: User 3

---

## 🎲 Playing Bingo - Step by Step

### Player 1 (Host):

1. Login at http://localhost:5173
2. Click **"Create Room"**
3. Set:
   - Room Name: "Bingo Game 1"
   - Mode: Chat Only (or Video)
   - **Game Type: Bingo** ⬅️ Important!
   - Public Room: Yes
4. Click **"Create Room"**
5. Click **"Auto Fill Board"**
6. Click **"Submit & Ready Up"**
7. Wait for Player 2...

### Player 2:

1. Login at http://localhost:5173 (incognito window)
2. Click on "Bingo Game 1" in Available Rooms
3. Click **"Join Room"**
4. Click **"Auto Fill Board"**
5. Click **"Submit & Ready Up"**

### Player 1 (Host):

1. Once both players are ready, click **"Start Game!"**

### Gameplay:

- **Player 1's Turn**: Click any number on your board
- **Player 2's Turn**: Click any number on your board
- Keep alternating turns
- Watch the **"BINGO"** letters fill up as you complete lines
- First to complete 5 lines: Click **"Call BINGO!"**
- Winner announced! 🎉

---

## 🕹️ Playing Chor-Sipahi

### Setup (Need 4 Players):

1. Create room with **Game Type: Chor-Sipahi**
2. 4 players join
3. All players click **"Ready"**
4. Host clicks **"Start Game"**

### Gameplay:

1. Designated shuffler clicks **"Shuffle Roles"**
2. Each player receives secret role (Raja/Mantri/Sipahi/Chor)
3. Sipahi guesses who the Chor is
4. Points awarded based on correct/incorrect guess
5. Multiple rounds until game end

---

## 🎥 Video Room Features

### Enable Video:

1. Create room with **Mode: Video Room**
2. Browser requests camera/microphone permission
3. Click **"Allow"**

### Controls:

- **Drag**: Move video windows around screen
- **Mic Button**: Mute/unmute your microphone
- **Camera Button**: Hide/show your camera
- **Remote Controls**: Mute/hide remote player's audio/video (client-side only)

---

## 🔐 Passkey Protected Rooms

### Create:

1. In Create Room modal, enter a passkey
2. Click "Create Room"

### Join:

1. Click on locked room (lock icon 🔒)
2. Enter passkey in modal
3. Click "Join Room"

---

## ❌ Common Issues & Solutions

### Issue: "Failed to load resource: 404"

**Solution**:

```powershell
# Check frontend/.env has:
VITE_API_URL=http://localhost:5000  # NO /api at end!
```

### Issue: "Socket authentication error: invalid signature"

**Solution**: Log out and log back in to refresh JWT token

### Issue: Camera/Mic not working

**Solution**:

1. Check browser URL bar for permission icon
2. Click and select "Allow"
3. Refresh page

### Issue: Backend won't start - "Module not found"

**Solution**:

```powershell
cd backend
rm -r node_modules
rm package-lock.json
npm install
```

### Issue: Frontend won't start

**Solution**:

```powershell
cd frontend
rm -r node_modules
rm package-lock.json
npm install
```

### Issue: MongoDB connection error

**Solution**: Verify `MONGODB_URI` in `backend/.env` is correct

---

## 🧪 Quick Test Checklist

Once both servers are running, test these features:

### Authentication

- [ ] Sign up new user
- [ ] Login with correct credentials
- [ ] Login fails with wrong password
- [ ] Logout

### Room Management

- [ ] Create public Chor-Sipahi room
- [ ] Create public Bingo room
- [ ] Create passkey-protected room
- [ ] Join public room
- [ ] Join passkey room with correct key
- [ ] Join passkey room fails with wrong key

### Bingo Game (2 players minimum)

- [ ] Both players fill and submit boards
- [ ] Host starts game
- [ ] Turn-based play works
- [ ] Numbers get marked correctly
- [ ] BINGO letters fill as lines complete
- [ ] Win detection works
- [ ] Winner announced correctly

### Video Room

- [ ] Create video room
- [ ] Camera/mic permissions requested
- [ ] Local video appears
- [ ] Second player joins - both videos visible
- [ ] Drag video windows works
- [ ] Mute/unmute works
- [ ] Hide/show camera works

### Chat

- [ ] Send message in room
- [ ] All players receive message
- [ ] Chat persists during game

---

## 📊 Performance Tips

### For Best Experience:

1. **Use Chrome or Edge** (best WebRTC support)
2. **Good internet connection** for video rooms
3. **Close unnecessary tabs** to free memory
4. **Use localhost** for development testing

### If Experiencing Lag:

1. **Disable Video**: Use Chat Only mode
2. **Close other applications**
3. **Check MongoDB connection latency**
4. **Ensure backend and frontend on same machine**

---

## 🎯 What's Next?

After confirming everything works:

1. Deploy to production (Vercel/Render/Railway)
2. Get proper MongoDB Atlas cluster
3. Set production environment variables
4. Enable HTTPS for WebRTC
5. Add more players and test scalability

---

## 💡 Pro Tips

### Development:

- Keep both terminal windows visible
- Watch backend logs for errors
- Use browser DevTools Console for frontend debugging
- MongoDB Compass to view database contents

### Testing:

- Use browser DevTools Network tab to see API calls
- Check Application > Local Storage for JWT token
- Console logs show WebRTC connection states

### Multiplayer:

- Private browsing = separate user session
- Different browsers = separate WebRTC streams
- Clear cookies to test fresh signup flow

---

## 🆘 Need Help?

1. **Check Logs**: Backend terminal and browser console
2. **Review Documentation**: See FIXES_AND_IMPROVEMENTS.md
3. **Database**: Use MongoDB Compass to inspect data
4. **WebRTC**: Check chrome://webrtc-internals for debugging

---

**Happy Gaming! 🎮🎲🎉**

Last Updated: December 2, 2025
