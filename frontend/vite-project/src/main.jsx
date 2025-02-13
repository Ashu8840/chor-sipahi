import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import SplashScreen from "./SplashScreen"; // Import the SplashScreen component
import App from "./App"; // Import your main App component
import "./index.css"; // Import your global styles if any

function Main() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Automatically hide splash screen after 3 seconds
    const timer = setTimeout(() => setShowSplash(false), 3000);

    return () => clearTimeout(timer); // Clean up the timer
  }, []);

  return (
    <React.StrictMode>
      {showSplash ? <SplashScreen /> : <App />} {/* Conditional rendering */}
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Main />);
