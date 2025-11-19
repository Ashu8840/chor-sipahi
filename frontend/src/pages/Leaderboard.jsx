import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown, Filter } from "lucide-react";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import RoleBadge from "../components/RoleBadge";
import { leaderboardAPI } from "../services/api";
import { useAuthStore } from "../context/authStore";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState("all-time");
  const [view, setView] = useState("global");
  const [selectedRole, setSelectedRole] = useState("Raja");
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchLeaderboard();
  }, [period, view, selectedRole]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      if (view === "global") {
        const response = await leaderboardAPI.getLeaderboard({ period });
        setLeaderboard(response.data.leaderboard || []);
        setMyRank(response.data.myRank);
      } else {
        const response = await leaderboardAPI.getRoleLeaderboard(selectedRole);
        setLeaderboard(response.data.leaderboard || []);
        setMyRank(null);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center">
            <h1 className="text-5xl font-bold gradient-text mb-2">
              Leaderboard
            </h1>
            <p className="text-gray-400 text-lg">
              Compete with the best players
            </p>
          </div>

          <div className="card">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={view}
                  onChange={(e) => setView(e.target.value)}
                  className="input-field"
                >
                  <option value="global">Global Rankings</option>
                  <option value="role">Role Rankings</option>
                </select>
              </div>

              {view === "global" ? (
                <div className="flex space-x-2">
                  {["all-time", "monthly", "weekly"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        period === p
                          ? "bg-primary-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {p
                        .split("-")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {["Raja", "Mantri", "Sipahi", "Chor"].map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedRole === role
                          ? "bg-primary-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {myRank && view === "global" && (
              <div className="mt-4 p-4 bg-primary-600/20 border border-primary-500/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Your Rank:</span>
                  <span className="text-2xl font-bold text-primary-400">
                    #{myRank}
                  </span>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <Loading />
          ) : leaderboard.length === 0 ? (
            <div className="card text-center py-12">
              <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No leaderboard data yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Start playing matches to appear on the leaderboard!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((player, index) => (
                <motion.div
                  key={player.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`card ${
                    player.userId === user?._id
                      ? "border-2 border-primary-500"
                      : ""
                  } ${
                    player.rank <= 3
                      ? "bg-gradient-to-r from-gray-900 to-gray-800"
                      : ""
                  }`}
                >
                  <div className="flex items-center space-x-6">
                    <div className="flex-shrink-0 w-12 text-center">
                      {player.rank === 1 && (
                        <Crown className="w-10 h-10 text-yellow-500 mx-auto" />
                      )}
                      {player.rank === 2 && (
                        <Medal className="w-10 h-10 text-gray-400 mx-auto" />
                      )}
                      {player.rank === 3 && (
                        <Medal className="w-10 h-10 text-orange-600 mx-auto" />
                      )}
                      {player.rank > 3 && (
                        <span className="text-2xl font-bold text-gray-500">
                          #{player.rank}
                        </span>
                      )}
                    </div>

                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
                      {player.username
                        ? player.username.charAt(0).toUpperCase()
                        : "?"}
                    </div>

                    <div className="flex-1">
                      <div className="font-bold text-lg">
                        {player.displayName || player.username || "Unknown"}
                      </div>
                      <div className="text-sm text-gray-400">
                        @{player.username || "unknown"}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-2xl font-bold text-primary-400">
                        {view === "global" ? player.points : player.points} pts
                      </div>
                      <div className="text-sm text-gray-400">
                        {view === "global"
                          ? `${player.wins}W / ${player.losses}L`
                          : `${player.timesPlayed} games • ${player.winRate}% WR`}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {leaderboard.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">
                    No rankings available yet
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
