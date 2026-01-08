import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./context/authStore";
import { useEffect } from "react";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import GameSpace from "./pages/GameSpace";
import Lobby from "./pages/Lobby";
import GameRoom from "./pages/GameRoom";
import GamePanel from "./pages/GamePanel";
import UnoLobby from "./pages/UnoLobby";
import UnoGame from "./pages/UnoGame";
import BingoGame from "./components/BingoGame";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import History from "./pages/History";
import Admin from "./pages/Admin";

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // Suppress React Router future flag warnings
    console.log("React Router initialized");
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <GameSpace /> : <Landing />}
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/lobby" /> : <Login />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/lobby" /> : <Signup />}
      />

      <Route
        path="/lobby"
        element={
          <PrivateRoute>
            <Lobby />
          </PrivateRoute>
        }
      />
      <Route
        path="/room/:roomId"
        element={
          <PrivateRoute>
            <GameRoom />
          </PrivateRoute>
        }
      />
      <Route
        path="/game/:roomId"
        element={
          <PrivateRoute>
            <GamePanel />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <PrivateRoute>
            <Leaderboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/history"
        element={
          <PrivateRoute>
            <History />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <Admin />
          </PrivateRoute>
        }
      />
      <Route
        path="/uno"
        element={
          <PrivateRoute>
            <UnoLobby />
          </PrivateRoute>
        }
      />
      <Route
        path="/uno/room/:roomId"
        element={
          <PrivateRoute>
            <UnoGame />
          </PrivateRoute>
        }
      />
      <Route
        path="/bingo"
        element={
          <PrivateRoute>
            <Lobby />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
