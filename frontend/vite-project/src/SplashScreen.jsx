import React, { useState, useEffect } from "react";
 // Import the CSS file for styling

const SplashScreen = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (onFinish) onFinish(); // Callback to notify the parent component
          return 100;
        }
        return prev + 2; // Increase the progress
      });
    }, 50); // Adjust the speed of loading

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="splash-container">
      <div className="logo-container">
        <h1 className="app-title">Welcome to Chor Police Game</h1>
      </div>
      <div className="loading-bar-container">
        <div className="loading-bar" style={{ width: `${progress}%` }}></div>
      </div>
      <p className="loading-text">Loading... {progress}%</p>
    </div>
  );
};

export default SplashScreen;
