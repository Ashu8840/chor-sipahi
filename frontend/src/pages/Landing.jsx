import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Users, Trophy, Swords } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8"
        >
          <div className="flex justify-center items-center space-x-4">
            <Shield className="w-16 h-16 text-primary-500" />
            <h1 className="text-6xl md:text-7xl font-bold gradient-text">
              Chor-Sipahi
            </h1>
          </div>

          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
            A thrilling multiplayer game of deception and deduction. Play with
            friends in real-time!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link to="/signup" className="btn-primary text-lg px-8 py-4">
              Get Started
            </Link>
            <Link to="/login" className="btn-outline text-lg px-8 py-4">
              Sign In
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card space-y-4"
            >
              <Users className="w-12 h-12 text-primary-500 mx-auto" />
              <h3 className="text-2xl font-bold">4 Player Mayhem</h3>
              <p className="text-gray-400">
                Join rooms with up to 4 players. Play in random matchmaking or
                create private rooms with friends.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card space-y-4"
            >
              <Swords className="w-12 h-12 text-primary-500 mx-auto" />
              <h3 className="text-2xl font-bold">4 Unique Roles</h3>
              <p className="text-gray-400">
                Raja, Mantri, Sipahi, and Chor. Each role has unique objectives
                and scoring rules.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="card space-y-4"
            >
              <Trophy className="w-12 h-12 text-primary-500 mx-auto" />
              <h3 className="text-2xl font-bold">Compete & Win</h3>
              <p className="text-gray-400">
                Climb the leaderboards, track your stats, and become the
                ultimate champion!
              </p>
            </motion.div>
          </div>

          <div className="pt-16 space-y-4">
            <h2 className="text-3xl font-bold">How to Play</h2>
            <div className="max-w-3xl mx-auto space-y-4 text-left">
              <div className="card">
                <h4 className="text-xl font-bold text-primary-400 mb-2">
                  1. Get Your Role
                </h4>
                <p className="text-gray-400">
                  At the start of each round, you'll be assigned one of four
                  roles randomly: Raja (King), Mantri (Minister), Sipahi
                  (Guard), or Chor (Thief).
                </p>
              </div>

              <div className="card">
                <h4 className="text-xl font-bold text-primary-400 mb-2">
                  2. Sipahi Makes the Call
                </h4>
                <p className="text-gray-400">
                  The Sipahi must identify who the Chor is among all players.
                  Choose wisely - your decision affects everyone's score!
                </p>
              </div>

              <div className="card">
                <h4 className="text-xl font-bold text-primary-400 mb-2">
                  3. Score Points
                </h4>
                <p className="text-gray-400">
                  If Sipahi guesses correctly: Raja gets 1000, Mantri gets 800,
                  Sipahi gets 500, Chor gets 0. If wrong: Chor gets 1000,
                  everyone else gets 0!
                </p>
              </div>

              <div className="card">
                <h4 className="text-xl font-bold text-primary-400 mb-2">
                  4. Win the Match
                </h4>
                <p className="text-gray-400">
                  Play 10 rounds and accumulate the highest score to win the
                  match and climb the leaderboard!
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
