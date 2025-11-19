import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Minimize2 } from "lucide-react";
import socketService from "../services/socket";
import { useAuthStore } from "../context/authStore";

export default function FloatingChat({ roomId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socketService.on("new_message", handleNewMessage);

    return () => {
      socketService.off("new_message", handleNewMessage);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    socketService.sendMessage(roomId, message.trim());
    setMessage("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-96 bg-gray-900 border-2 border-purple-500 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-linear-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-bold">Chat</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded p-1 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-950">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No messages yet
                </p>
              ) : (
                messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{
                      opacity: 0,
                      x: msg.userId === user._id ? 20 : -20,
                    }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-lg ${
                      msg.userId === user._id
                        ? "bg-purple-600/30 ml-8 border border-purple-500/30"
                        : "bg-gray-800/80 mr-8 border border-gray-700/50"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-sm text-purple-400">
                        {msg.username}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 bg-gray-900 border-t border-gray-800"
            >
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-2 transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition"
      >
        {isOpen ? (
          <Minimize2 className="w-6 h-6" />
        ) : (
          <MessageSquare className="w-6 h-6" />
        )}
      </motion.button>
    </div>
  );
}
