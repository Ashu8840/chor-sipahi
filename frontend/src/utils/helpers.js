export const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getRoleColor = (role) => {
  const colors = {
    Raja: "text-yellow-400 bg-yellow-500/20",
    Mantri: "text-blue-400 bg-blue-500/20",
    Sipahi: "text-green-400 bg-green-500/20",
    Chor: "text-red-400 bg-red-500/20",
  };
  return colors[role] || "text-gray-400 bg-gray-500/20";
};

export const getRoleDescription = (role) => {
  const descriptions = {
    Raja: "The King - Earns points if Sipahi guesses correctly",
    Mantri: "The Minister - Earns points if Sipahi guesses correctly",
    Sipahi: "The Guard - Must identify the Chor",
    Chor: "The Thief - Must avoid being caught by Sipahi",
  };
  return descriptions[role] || "";
};

export const calculateWinRate = (wins, total) => {
  if (total === 0) return 0;
  return ((wins / total) * 100).toFixed(1);
};

export const truncateText = (text, maxLength = 20) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export const getAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (avatar.startsWith("http")) return avatar;
  return `${import.meta.env.VITE_API_URL}${avatar}`;
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy:", error);
    return false;
  }
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
