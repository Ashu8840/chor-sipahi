import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./GameSpace.css";

const GameSpace = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        when: "beforeChildren",
        staggerChildren: 0.3,
      },
    },
  };

  const titleVariants = {
    hidden: { y: -50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", damping: 12, stiffness: 100 },
    },
  };

  const cardVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring", damping: 10, stiffness: 100 },
    },
    hover: {
      scale: 1.05,
      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      transition: { duration: 0.3 },
    },
    tap: { scale: 0.95 },
  };

  return (
    <motion.div
      className="gamespace-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h1 className="gamespace-title" variants={titleVariants}>
        🎮 GameSpace
      </motion.h1>
      
      <motion.p className="gamespace-subtitle" variants={titleVariants}>
        Choose Your Adventure
      </motion.p>

      <div className="game-cards-container">
        <motion.div
          className="game-card chor-sipahi-card"
          variants={cardVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={() => navigate("/lobby")}
        >
          <div className="card-icon">🕵️</div>
          <h2 className="card-title">Chor-Sipahi</h2>
          <p className="card-description">
            Classic detective game of strategy and deception
          </p>
          <div className="card-players">👥 2-4 Players</div>
        </motion.div>

        <motion.div
          className="game-card uno-card"
          variants={cardVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={() => navigate("/uno")}
        >
          <div className="card-icon">🎴</div>
          <h2 className="card-title">UNO</h2>
          <p className="card-description">
            Match colors and numbers, use action cards wisely!
          </p>
          <div className="card-players">👥 2-10 Players</div>
        </motion.div>

        <motion.div
          className="game-card bingo-card"
          variants={cardVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={() => navigate("/bingo")}
        >
          <div className="card-icon">🎯</div>
          <h2 className="card-title">Bingo</h2>
          <p className="card-description">
            Complete lines on your board to win!
          </p>
          <div className="card-players">👥 2-6 Players</div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default GameSpace;
