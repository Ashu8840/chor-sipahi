import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Move } from "lucide-react";
import socketService from "../services/socket";

export default function VideoGrid({ roomId, players, currentUserId }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  // Track mute/hide state for each remote user (clientside only)
  const [remoteAudioMuted, setRemoteAudioMuted] = useState({});
  const [remoteVideoHidden, setRemoteVideoHidden] = useState({});
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const localStreamRef = useRef(null); // Keep a ref to access latest localStream

  console.log("VideoGrid rendered with players:", players);
  console.log("Current user ID:", currentUserId);
  console.log("Remote streams:", Object.keys(remoteStreams));

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      console.log("Local media initialized successfully", stream.getTracks());
    } catch (error) {
      console.error("Error accessing media devices:", error);
      if (error.name === "NotAllowedError") {
        alert(
          "Camera and microphone access denied. Please enable them in your browser settings to use video mode."
        );
      } else if (error.name === "NotFoundError") {
        alert(
          "No camera or microphone found. Video mode requires these devices."
        );
      } else {
        alert("Failed to access camera/microphone: " + error.message);
      }
    }
  };

  const sendWebRTCSignal = (targetUserId, signal) => {
    console.log(`Sending ${signal.type} signal to ${targetUserId}`);
    socketService.sendWebRTCSignal(roomId, targetUserId, signal);
  };

  const createPeerConnection = async (targetUserId, stream) => {
    // Don't recreate if already exists
    if (peerConnections.current[targetUserId]) {
      console.log(`Peer connection for ${targetUserId} already exists`);
      return;
    }

    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections.current[targetUserId] = peerConnection;

    console.log(`Creating peer connection for ${targetUserId}`);

    // Add local stream tracks to peer connection
    stream.getTracks().forEach((track) => {
      const sender = peerConnection.addTrack(track, stream);
      console.log(
        `Added ${track.kind} track to peer connection for ${targetUserId}`,
        sender
      );
    });

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log(
        `Received ${event.track.kind} track from ${targetUserId}`,
        event.streams[0]
      );
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prev) => ({
          ...prev,
          [targetUserId]: event.streams[0],
        }));
      }
    };

    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      console.log(
        `Peer connection state with ${targetUserId}:`,
        peerConnection.connectionState
      );
      if (peerConnection.connectionState === "failed") {
        console.log(`Connection failed with ${targetUserId}, will retry...`);
        // Optionally retry connection
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        `ICE connection state with ${targetUserId}:`,
        peerConnection.iceConnectionState
      );
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${targetUserId}`);
        sendWebRTCSignal(targetUserId, {
          type: "candidate",
          candidate: event.candidate,
        });
      }
    };

    // Create and send offer
    try {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peerConnection.setLocalDescription(offer);

      console.log(`Sending offer to ${targetUserId}`);
      sendWebRTCSignal(targetUserId, {
        type: "offer",
        offer: offer,
      });
    } catch (error) {
      console.error(`Error creating offer for ${targetUserId}:`, error);
    }
  };

  const handleSignal = async ({ fromUserId, signal }) => {
    console.log(`Received signal from ${fromUserId}:`, signal.type);

    if (signal.type === "offer") {
      await handleOffer(fromUserId, signal.offer);
    } else if (signal.type === "answer") {
      await handleAnswer(fromUserId, signal.answer);
    } else if (signal.type === "candidate") {
      await handleCandidate(fromUserId, signal.candidate);
    }
  };

  const handleOffer = async (fromUserId, offer) => {
    const stream = localStreamRef.current;
    if (!stream) {
      console.log(
        `Cannot handle offer from ${fromUserId} - no local stream yet`
      );
      return;
    }

    console.log(`Handling offer from ${fromUserId}`);

    // Close existing connection if any
    if (peerConnections.current[fromUserId]) {
      peerConnections.current[fromUserId].close();
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    peerConnections.current[fromUserId] = peerConnection;

    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
      console.log(
        `Added ${track.kind} track to peer connection for ${fromUserId}`
      );
    });

    peerConnection.ontrack = (event) => {
      console.log(
        `Received ${event.track.kind} track from ${fromUserId}`,
        event.streams[0]
      );
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prev) => ({
          ...prev,
          [fromUserId]: event.streams[0],
        }));
      }
    };

    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      console.log(
        `Peer connection state with ${fromUserId}:`,
        peerConnection.connectionState
      );
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        `ICE connection state with ${fromUserId}:`,
        peerConnection.iceConnectionState
      );
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${fromUserId}`);
        sendWebRTCSignal(fromUserId, {
          type: "candidate",
          candidate: event.candidate,
        });
      }
    };

    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log(`Sending answer to ${fromUserId}`);
      sendWebRTCSignal(fromUserId, {
        type: "answer",
        answer: answer,
      });
    } catch (error) {
      console.error(`Error handling offer from ${fromUserId}:`, error);
    }
  };

  useEffect(() => {
    initializeMedia();

    socketService.on("webrtc_signal", handleSignal);

    // Cleanup when browser tab closes or refreshes
    const handleBeforeUnload = () => {
      cleanup();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Cleanup when component unmounts or roomId changes
      cleanup();
      socketService.off("webrtc_signal", handleSignal);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [roomId]);

  // Initialize peer connections when players change
  useEffect(() => {
    const stream = localStreamRef.current;
    if (stream && players.length > 0) {
      console.log(
        "Players changed, updating peer connections...",
        players.map((p) => p.userId)
      );

      // Get current player IDs
      const currentPlayerIds = new Set(players.map((p) => p.userId));

      // Remove connections for players who left
      Object.keys(peerConnections.current).forEach((userId) => {
        if (!currentPlayerIds.has(userId)) {
          console.log(`Removing peer connection for ${userId}`);
          if (peerConnections.current[userId]) {
            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
          }
          // Remove remote stream
          setRemoteStreams((prev) => {
            const newStreams = { ...prev };
            if (newStreams[userId]) {
              newStreams[userId].getTracks().forEach((track) => track.stop());
              delete newStreams[userId];
            }
            return newStreams;
          });
        }
      });

      // Create connections for new players
      players.forEach((player) => {
        if (
          player.userId !== currentUserId &&
          !peerConnections.current[player.userId]
        ) {
          // Prevent glare: Only the user with the "larger" ID initiates the connection
          if (currentUserId > player.userId) {
            console.log(
              `Creating peer connection for new player ${player.userId} (Initiator)`
            );
            createPeerConnection(player.userId, stream);
          } else {
            console.log(
              `Waiting for offer from ${player.userId} (Non-initiator)`
            );
          }
        }
      });
    }
  }, [players, localStream, currentUserId]);

  const handleAnswer = async (fromUserId, answer) => {
    const peerConnection = peerConnections.current[fromUserId];
    if (peerConnection) {
      console.log(`Handling answer from ${fromUserId}`);
      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (error) {
        console.error(
          `Error setting remote description from ${fromUserId}:`,
          error
        );
      }
    } else {
      console.log(
        `No peer connection found for ${fromUserId} when handling answer`
      );
    }
  };

  const handleCandidate = async (fromUserId, candidate) => {
    const peerConnection = peerConnections.current[fromUserId];
    if (peerConnection) {
      console.log(`Adding ICE candidate from ${fromUserId}`);
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error(`Error adding ICE candidate from ${fromUserId}:`, error);
      }
    } else {
      console.log(
        `No peer connection found for ${fromUserId} when handling candidate`
      );
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle remote user's audio on YOUR end (clientside mute)
  const toggleRemoteAudio = (userId) => {
    setRemoteAudioMuted((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Toggle remote user's video visibility on YOUR end (clientside hide)
  const toggleRemoteVideo = (userId) => {
    setRemoteVideoHidden((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const cleanup = () => {
    console.log("Cleaning up video streams...");

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped local ${track.kind} track`);
      });
      setLocalStream(null);
    }

    // Stop all remote streams
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log(`Stopped remote ${track.kind} track for user ${userId}`);
        });
      }
    });

    // Close all peer connections
    Object.values(peerConnections.current).forEach((pc) => {
      pc.close();
    });

    peerConnections.current = {};
    setRemoteStreams({});
    console.log("Video cleanup complete");
  };

  const getPlayerName = (userId) => {
    const player = players.find((p) => p.userId === userId);
    return player?.displayName || player?.username || "Player";
  };

  // Position windows: top-left, top-right, bottom-left, bottom-right
  const positions = [
    { top: 16, left: 16 },
    { top: 16, right: 16 },
    { bottom: 16, left: 16 },
    { bottom: 16, right: 16 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-auto md:overflow-hidden">
      <div className="min-h-full md:h-full relative">
        {players.map((player, index) => {
          const isCurrentUser = player.userId === currentUserId;
          const stream = isCurrentUser
            ? localStream
            : remoteStreams[player.userId];
          const name = isCurrentUser ? "You" : getPlayerName(player.userId);

          console.log(`Player ${name} (${player.userId}):`, {
            isCurrentUser,
            hasStream: !!stream,
            streamActive: stream?.active,
            tracks: stream?.getTracks().map((t) => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
            })),
          });

          return (
            <DraggableVideoPlayer
              key={player.userId}
              stream={stream}
              name={name}
              isMuted={isCurrentUser} // Mute own audio to prevent feedback
              isLocal={isCurrentUser}
              audioEnabled={
                isCurrentUser ? audioEnabled : !remoteAudioMuted[player.userId]
              }
              videoEnabled={
                isCurrentUser ? videoEnabled : !remoteVideoHidden[player.userId]
              }
              // Pass appropriate toggle functions based on local vs remote
              onToggleAudio={
                isCurrentUser
                  ? toggleAudio
                  : () => toggleRemoteAudio(player.userId)
              }
              onToggleVideo={
                isCurrentUser
                  ? toggleVideo
                  : () => toggleRemoteVideo(player.userId)
              }
              initialPosition={positions[index] || positions[0]}
              userId={player.userId}
              currentUserId={currentUserId}
            />
          );
        })}
      </div>
    </div>
  );
}

function DraggableVideoPlayer({
  stream,
  name,
  isMuted,
  isLocal,
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  initialPosition,
  userId,
  currentUserId,
}) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    // Don't drag when clicking controls or video element
    if (e.target.closest(".video-controls") || e.target.tagName === "BUTTON") {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    const rect = dragRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleTouchStart = (e) => {
    // Don't drag when clicking controls or video element
    if (e.target.closest(".video-controls") || e.target.tagName === "BUTTON") {
      return;
    }

    setIsDragging(true);
    const touch = e.touches[0];
    const rect = dragRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newPosition = {};

    // Calculate new position
    const newX = e.clientX - offsetRef.current.x;
    const newY = e.clientY - offsetRef.current.y;

    // Boundary checks
    const maxX = window.innerWidth - 200; // 200 is video width
    const maxY = window.innerHeight - 150; // 150 is video height

    if (newX >= 0 && newX <= maxX) {
      newPosition.left = newX;
      delete newPosition.right;
    }

    if (newY >= 0 && newY <= maxY) {
      newPosition.top = newY;
      delete newPosition.bottom;
    }

    setPosition((prev) => ({ ...prev, ...newPosition }));
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const newPosition = {};

    // Calculate new position
    const newX = touch.clientX - offsetRef.current.x;
    const newY = touch.clientY - offsetRef.current.y;

    // Boundary checks
    const maxX = window.innerWidth - 200; // 200 is video width
    const maxY = window.innerHeight - 150; // 150 is video height

    if (newX >= 0 && newX <= maxX) {
      newPosition.left = newX;
      delete newPosition.right;
    }

    if (newY >= 0 && newY <= maxY) {
      newPosition.top = newY;
      delete newPosition.bottom;
    }

    setPosition((prev) => ({ ...prev, ...newPosition }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging]);

  const positionStyle = {
    position: "absolute",
    ...(position.top !== undefined && { top: `${position.top}px` }),
    ...(position.bottom !== undefined && { bottom: `${position.bottom}px` }),
    ...(position.left !== undefined && { left: `${position.left}px` }),
    ...(position.right !== undefined && { right: `${position.right}px` }),
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none", // Prevent default touch actions
  };

  return (
    <motion.div
      ref={dragRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={positionStyle}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="pointer-events-auto"
    >
      <VideoPlayer
        stream={stream}
        name={name}
        isMuted={isMuted}
        isLocal={isLocal}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
        userId={userId}
        currentUserId={currentUserId}
      />
    </motion.div>
  );
}

function VideoPlayer({
  stream,
  name,
  isMuted,
  isLocal,
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  userId,
  currentUserId,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    // Set up audio element for remote streams
    if (!isLocal && audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.volume = audioEnabled ? 1 : 0;
    }
  }, [stream, isLocal]);

  // Control audio element volume for remote users (clientside mute)
  useEffect(() => {
    if (!isLocal && audioRef.current) {
      audioRef.current.volume = audioEnabled ? 1 : 0;
    }
  }, [audioEnabled, isLocal]);

  return (
    <div className="relative w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 shadow-xl">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted || isLocal} // Always mute local video to prevent feedback
        className={`w-full h-full object-cover transition-opacity ${
          videoEnabled ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Hidden audio element for remote streams (to control volume) */}
      {!isLocal && stream && <audio ref={audioRef} autoPlay playsInline />}

      {/* Show placeholder when video is hidden */}
      {(!stream || !videoEnabled) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <VideoOff className="w-8 h-8 mx-auto text-gray-500 mb-2" />
            <p className="text-xs text-gray-500">
              {!stream ? "No video" : "Video hidden"}
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-white truncate flex-1">
            {name}
          </p>
          <Move
            className="w-3 h-3 text-gray-400 ml-1 shrink-0"
            title="Drag to move"
          />
        </div>
      </div>

      {/* Show clickable controls on ALL windows */}
      <div className="absolute top-2 right-2 flex space-x-1 video-controls pointer-events-auto z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleAudio && onToggleAudio();
          }}
          className={`p-1.5 rounded-full transition-colors ${
            audioEnabled
              ? "bg-gray-700 hover:bg-gray-600"
              : "bg-red-600 hover:bg-red-500"
          }`}
          title={
            isLocal
              ? audioEnabled
                ? "Mute your microphone"
                : "Unmute your microphone"
              : audioEnabled
              ? `Mute ${name}'s audio (on your end only)`
              : `Unmute ${name}'s audio`
          }
        >
          {audioEnabled ? (
            <Mic className="w-3 h-3 text-white" />
          ) : (
            <MicOff className="w-3 h-3 text-white" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVideo && onToggleVideo();
          }}
          className={`p-1.5 rounded-full transition-colors ${
            videoEnabled
              ? "bg-gray-700 hover:bg-gray-600"
              : "bg-red-600 hover:bg-red-500"
          }`}
          title={
            isLocal
              ? videoEnabled
                ? "Turn off your camera"
                : "Turn on your camera"
              : videoEnabled
              ? `Hide ${name}'s video (on your screen only)`
              : `Show ${name}'s video`
          }
        >
          {videoEnabled ? (
            <Video className="w-3 h-3 text-white" />
          ) : (
            <VideoOff className="w-3 h-3 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
