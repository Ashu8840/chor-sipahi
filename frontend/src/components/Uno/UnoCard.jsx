import React from "react";
import { motion } from "framer-motion";
import "./UnoCard.css";

const UnoCard = ({ card, onClick, disabled, isPlayable, style, animate = true }) => {
  if (!card) return null;

  const getCardColor = () => {
    switch (card.color) {
      case "red":
        return "#e53e3e";
      case "blue":
        return "#3182ce";
      case "green":
        return "#38a169";
      case "yellow":
        return "#ecc94b";
      case "black":
        return "#2d3748";
      default:
        return "#718096";
    }
  };

  const getCardSymbol = () => {
    switch (card.type) {
      case "skip":
        return "🚫";
      case "reverse":
        return "🔄";
      case "draw2":
        return "+2";
      case "wild":
        return "W";
      case "wild_draw4":
        return "+4";
      default:
        return card.type;
    }
  };

  const isActionCard = ["skip", "reverse", "draw2"].includes(card.type);
  const isWildCard = card.type === "wild" || card.type === "wild_draw4";

  const cardVariants = {
    initial: { scale: 0, rotate: -180, opacity: 0 },
    animate: { 
      scale: 1, 
      rotate: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    },
    hover: { 
      y: -10, 
      scale: 1.05,
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.95 },
  };

  const CardComponent = animate ? motion.div : "div";
  const cardProps = animate ? {
    variants: cardVariants,
    initial: "initial",
    animate: "animate",
    whileHover: !disabled && isPlayable ? "hover" : {},
    whileTap: !disabled && isPlayable ? "tap" : {},
  } : {};

  return (
    <CardComponent
      className={`uno-card ${isPlayable ? "playable" : ""} ${disabled ? "disabled" : ""}`}
      onClick={!disabled && isPlayable ? onClick : undefined}
      style={{ 
        backgroundColor: getCardColor(),
        cursor: !disabled && isPlayable ? "pointer" : "default",
        ...style
      }}
      {...cardProps}
    >
      {isWildCard ? (
        <div className="wild-card-content">
          <div className="wild-quadrants">
            <div className="wild-quad" style={{ backgroundColor: "#e53e3e" }}></div>
            <div className="wild-quad" style={{ backgroundColor: "#3182ce" }}></div>
            <div className="wild-quad" style={{ backgroundColor: "#ecc94b" }}></div>
            <div className="wild-quad" style={{ backgroundColor: "#38a169" }}></div>
          </div>
          <div className="card-symbol wild-symbol">{getCardSymbol()}</div>
        </div>
      ) : (
        <>
          <div className="card-corner top-left">
            <span className="corner-symbol">{getCardSymbol()}</span>
          </div>
          
          <div className="card-center">
            <div className="center-oval">
              <span className="center-symbol">{getCardSymbol()}</span>
            </div>
          </div>
          
          <div className="card-corner bottom-right">
            <span className="corner-symbol rotated">{getCardSymbol()}</span>
          </div>
        </>
      )}
    </CardComponent>
  );
};

export default UnoCard;
