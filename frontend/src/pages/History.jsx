import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { History as HistoryIcon, Calendar, Trophy, Users } from "lucide-react";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import RoleBadge from "../components/RoleBadge";
import { matchAPI } from "../services/api";
import { formatDate } from "../utils/helpers";
import { useAuthStore } from "../context/authStore";

export default function History() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchMatches();
  }, [page]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const response = await matchAPI.getMyMatches({ page, limit: 10 });
      setMatches(response.data.matches);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error("Failed to fetch matches");
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
              Match History
            </h1>
            <p className="text-gray-400 text-lg">Review your past games</p>
          </div>

          {loading ? (
            <Loading />
          ) : matches.length === 0 ? (
            <div className="card text-center py-12">
              <HistoryIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No matches played yet</p>
              <p className="text-gray-500 text-sm">
                Start playing to see your match history!
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {matches.map((match) => {
                  const myPlayer = match.players.find(
                    (p) => p.userId._id === user._id
                  );
                  const isWinner = match.winner === user._id;

                  return (
                    <motion.div
                      key={match.matchId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`card ${
                        isWinner
                          ? "border-2 border-green-500/50 bg-green-900/10"
                          : "border-2 border-gray-800"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            {isWinner ? (
                              <Trophy className="w-6 h-6 text-green-500" />
                            ) : (
                              <HistoryIcon className="w-6 h-6 text-gray-500" />
                            )}
                            <span
                              className={`text-xl font-bold ${
                                isWinner ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {isWinner ? "Victory" : "Defeat"}
                            </span>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(match.startedAt)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{match.players.length} Players</span>
                            </div>
                            <span>•</span>
                            <span>{match.totalRounds} Rounds</span>
                          </div>

                          {myPlayer && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-400">
                                Your score:
                              </span>
                              <span className="text-2xl font-bold text-primary-400">
                                {myPlayer.finalScore} pts
                              </span>
                              <span className="text-sm text-gray-500">
                                (#{myPlayer.placement})
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm text-gray-400 mb-2">
                            Final Standings:
                          </div>
                          {match.players.slice(0, 3).map((player, index) => (
                            <div
                              key={player.userId._id}
                              className="flex items-center justify-between space-x-4 bg-gray-800 rounded-lg px-3 py-2"
                            >
                              <span className="text-sm">
                                #{index + 1} {player.userId.username}
                              </span>
                              <span className="font-semibold">
                                {player.finalScore} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary"
                  >
                    Previous
                  </button>
                  <span className="flex items-center px-4 text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
