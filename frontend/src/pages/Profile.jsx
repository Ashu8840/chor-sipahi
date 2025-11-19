import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, Award, TrendingUp } from "lucide-react";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import { useAuthStore } from "../context/authStore";
import { matchAPI } from "../services/api";
import { getAvatarUrl, calculateWinRate } from "../utils/helpers";
import RoleBadge from "../components/RoleBadge";

export default function Profile() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await matchAPI.getPlayerStats(user._id);
      setStats(response.data.player || {});
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const totalMatches = stats?.stats?.matchesPlayed || 0;
  const wins = stats?.stats?.wins || 0;
  const losses = stats?.stats?.losses || 0;
  const winRate = calculateWinRate(wins, totalMatches);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="card">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center text-5xl font-bold">
                {user?.username ? user.username.charAt(0).toUpperCase() : "?"}
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold gradient-text">
                  {user?.displayName || user?.username || "User"}
                </h1>
                <p className="text-gray-400 text-lg">
                  @{user?.username || "unknown"}
                </p>
                <p className="text-gray-500 mt-2">
                  Member since{" "}
                  {stats?.createdAt
                    ? new Date(stats.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>

              <div className="flex flex-col space-y-2">
                <div className="badge bg-primary-600 text-white">
                  <Trophy className="w-4 h-4 mr-1" />
                  {stats?.stats?.totalPoints || 0} Points
                </div>
                {user?.isAdmin && (
                  <div className="badge bg-yellow-600 text-white">Admin</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <StatCard
              icon={<Target className="w-8 h-8 text-primary-500" />}
              label="Total Matches"
              value={totalMatches}
            />
            <StatCard
              icon={<Trophy className="w-8 h-8 text-green-500" />}
              label="Wins"
              value={wins}
            />
            <StatCard
              icon={<Award className="w-8 h-8 text-red-500" />}
              label="Losses"
              value={losses}
            />
            <StatCard
              icon={<TrendingUp className="w-8 h-8 text-blue-500" />}
              label="Win Rate"
              value={`${winRate}%`}
            />
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold mb-6">Role Statistics</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  role: "Raja",
                  wins: stats?.stats?.rajaWins || 0,
                  played: stats?.stats?.rajaWins || 0,
                },
                {
                  role: "Mantri",
                  wins: stats?.stats?.mantriWins || 0,
                  played: stats?.stats?.mantriWins || 0,
                },
                {
                  role: "Sipahi",
                  wins: stats?.stats?.sipahiCorrect || 0,
                  played:
                    (stats?.stats?.sipahiCorrect || 0) +
                    (stats?.stats?.sipahiWrong || 0),
                },
                {
                  role: "Chor",
                  wins: stats?.stats?.chorEscaped || 0,
                  played:
                    (stats?.stats?.chorEscaped || 0) +
                    (stats?.stats?.chorCaught || 0),
                },
              ].map(({ role, wins, played }) => {
                const roleWinRate = calculateWinRate(wins, played);

                return (
                  <div
                    key={role}
                    className="bg-gray-800 rounded-lg p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <RoleBadge role={role} className="text-xl" />
                      <span className="text-2xl font-bold">
                        {played} played
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Times Played:</span>
                        <span className="font-semibold">{played}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Wins:</span>
                        <span className="font-semibold">{wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Win Rate:</span>
                        <span className="font-semibold">{roleWinRate}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card text-center space-y-3"
    >
      <div className="flex justify-center">{icon}</div>
      <div>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-gray-400 text-sm">{label}</div>
      </div>
    </motion.div>
  );
}
