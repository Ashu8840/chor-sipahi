import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./App.css";


const socket = io.connect("https://chor-sipahi.onrender.com");

function App() {
  const [name, setName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false); // Toggle for chat window

  const chatWindowRef = useRef(null); // Ref for chat window

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChat((prevChat) => [...prevChat, data]);
    });

    return () => socket.off("receive_message");
  }, []);

  useEffect(() => {
    // Scroll to the bottom of the chat window whenever a new message is added
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chat]); // Run whenever the chat array changes (new message)

  const sendMessage = () => {
    if (message.trim()) {
      const data = { name, message };
      socket.emit("send_message", data);
      setMessage("");
    }
  };

  const handleNameSubmit = () => {
    if (name.trim()) {
      setIsNameSet(true);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  const toggleChatWindow = () => {
    setIsChatOpen(!isChatOpen); // Toggle chat window open/close
  };

  return (
    <div className="chat-app">
      <div
        className={`chatbot-icon ${isChatOpen ? "active" : ""}`}
        onClick={toggleChatWindow}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="#fff"
          viewBox="0 0 24 24"
          width="28"
          height="28"
        >
          <path d="M12 2C6.5 2 2 6.2 2 11.5c0 2.6 1.2 4.9 3.1 6.5L4 22l4.6-1.5c1.1.3 2.3.5 3.4.5 5.5 0 10-4.2 10-9.5S17.5 2 12 2zm-1 13h-2v-2h2v2zm0-4h-2V7h2v4zm8 4h-2v-2h2v2zm0-4h-2V7h2v4z" />
        </svg>
      </div>
      {isChatOpen && (
        <div className="chat-box">
          {!isNameSet ? (
            <div className="name-input">
              <h2>Enter Your Name</h2>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
              />
              <button onClick={handleNameSubmit}>Enter</button>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <h2>Chat with Friends</h2>
                <button className="close-btn" onClick={toggleChatWindow}>
                  ✕
                </button>
              </div>
              <div className="chat-window" ref={chatWindowRef}>
                {chat.map((msg, index) => (
                  <div
                    key={index}
                    className={`chat-message ${
                      msg.name === name ? "message-sent" : "message-received"
                    }`}
                  >
                    <strong>{msg.name}:</strong> {msg.message}
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message"
                />
                <button onClick={sendMessage}>Send</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
