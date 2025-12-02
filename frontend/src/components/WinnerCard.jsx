import { motion } from "framer-motion";
import { Trophy, Star, Award } from "lucide-react";

export default function WinnerCard({ winnerName, isWinner, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ rotateY: 90, scale: 0.8 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{
          type: "spring",
          duration: 0.8,
          delay: 0.2,
        }}
        className="relative"
        style={{ perspective: 1000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card */}
        <div className="relative w-96 h-96 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-3xl shadow-2xl overflow-hidden border-4 border-yellow-300">
          {/* Shine effect */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut",
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{ transform: "skewX(-20deg)" }}
          />

          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
            {/* Trophy Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                delay: 0.5,
                duration: 0.8,
              }}
              className="mb-6"
            >
              <div className="relative">
                <Trophy className="w-32 h-32 text-yellow-900 drop-shadow-2xl" />
                {/* Rotating stars around trophy */}
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      rotate: 360,
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, delay: i * 0.2 },
                    }}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      transform: `rotate(${i * 90}deg) translateY(-60px)`,
                      transformOrigin: "0 0",
                    }}
                  >
                    <Star className="w-6 h-6 text-yellow-200 fill-yellow-200" />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Winner Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-4"
            >
              <motion.h2
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                className="text-5xl font-black text-yellow-900 drop-shadow-lg"
              >
                {isWinner ? "YOU WIN!" : "WINNER!"}
              </motion.h2>

              <div className="flex items-center justify-center space-x-2">
                <Award className="w-6 h-6 text-yellow-900" />
                <p className="text-2xl font-bold text-yellow-900">
                  {winnerName}
                </p>
                <Award className="w-6 h-6 text-yellow-900" />
              </div>

              {isWinner && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="text-lg font-semibold text-yellow-800"
                >
                  🎉 Congratulations! 🎉
                </motion.p>
              )}
            </motion.div>

            {/* Decorative elements */}
            <div className="absolute top-4 left-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Star className="w-8 h-8 text-yellow-200 fill-yellow-200" />
              </motion.div>
            </div>
            <div className="absolute top-4 right-4">
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              >
                <Star className="w-6 h-6 text-yellow-200 fill-yellow-200" />
              </motion.div>
            </div>
            <div className="absolute bottom-4 left-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              >
                <Star className="w-6 h-6 text-yellow-200 fill-yellow-200" />
              </motion.div>
            </div>
            <div className="absolute bottom-4 right-4">
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
              >
                <Star className="w-8 h-8 text-yellow-200 fill-yellow-200" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Close hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-center mt-4 text-white text-sm"
        >
          Click anywhere to close
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
