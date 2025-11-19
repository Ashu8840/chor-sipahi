import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import { LogOut, User, Trophy, History, Shield } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/lobby" className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-primary-500" />
            <span className="text-2xl font-bold gradient-text">
              Chor-Sipahi
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link
              to="/leaderboard"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Trophy className="w-5 h-5" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Link>

            <Link
              to="/history"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <History className="w-5 h-5" />
              <span className="hidden sm:inline">History</span>
            </Link>

            <Link
              to="/profile"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">{user?.username}</span>
            </Link>

            {user?.isAdmin && (
              <Link
                to="/admin"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                <Shield className="w-5 h-5" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-red-600/20 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
