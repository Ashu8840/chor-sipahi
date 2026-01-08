import Room from "../models/Room.model.js";
import logger from "../config/logger.js";
import { v4 as uuidv4 } from "uuid";

export const createRoom = async (req, res) => {
  try {
    const {
      name,
      mode,
      isPublic,
      passkey,
      gameType,
      bingoSettings,
      unoSettings,
    } = req.body;

    const roomId = uuidv4();

    const roomData = {
      roomId,
      name,
      mode,
      gameType: gameType || "chor-sipahi",
      isPublic: isPublic !== false,
      host: req.userId,
      maxPlayers: 4,
      players: [
        {
          userId: req.userId,
          username: req.user.username,
          displayName: req.user.displayName,
          avatar: req.user.avatar,
          isReady: false,
        },
      ],
    };

    // Add bingo settings if game type is bingo
    if (roomData.gameType === "bingo" && bingoSettings) {
      roomData.bingoSettings = {
        gridSize: bingoSettings.gridSize || 5,
        maxPlayers: bingoSettings.maxPlayers || 2,
      };
      roomData.maxPlayers = bingoSettings.maxPlayers || 2;
    }

    if (roomData.gameType === "uno") {
      const unoMaxPlayers = Math.min(
        Math.max(unoSettings?.maxPlayers || roomData.maxPlayers, 2),
        10
      );
      roomData.unoSettings = {
        maxPlayers: unoMaxPlayers,
      };
      roomData.maxPlayers = unoMaxPlayers;
    }

    if (passkey) {
      roomData.passkey = passkey;
    }

    const room = new Room(roomData);
    await room.save();

    logger.info(`Room created: ${roomId} by ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: {
        roomId: room.roomId,
        name: room.name,
        mode: room.mode,
        gameType: room.gameType,
        isPublic: room.isPublic,
        hasPasskey: !!room.passkey,
        maxPlayers: room.maxPlayers,
        bingoSettings: room.bingoSettings,
        unoSettings: room.unoSettings,
        players: room.players,
        status: room.status,
        host: {
          _id: req.userId,
          username: req.user.username,
          displayName: req.user.displayName,
          avatar: req.user.avatar,
        },
      },
    });
  } catch (error) {
    logger.error("Create room error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating room",
      error: error.message,
    });
  }
};

export const getRooms = async (req, res) => {
  try {
    const { mode, status, gameType } = req.query;

    const query = { isPublic: true };
    if (mode) query.mode = mode;
    if (status) query.status = status;
    if (gameType) query.gameType = gameType;

    const rooms = await Room.find(query)
      .populate("host", "username displayName avatar")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(); // Use lean() for better performance

    const roomsList = rooms.map((room) => ({
      roomId: room.roomId,
      name: room.name,
      mode: room.mode,
      gameType: room.gameType,
      host: room.host,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      bingoSettings: room.bingoSettings,
      unoSettings: room.unoSettings,
      status: room.status,
      hasPasskey: !!room.passkey,
      createdAt: room.createdAt,
    }));

    // Add cache headers to reduce requests
    res.set('Cache-Control', 'public, max-age=2'); // Cache for 2 seconds
    res.json({
      success: true,
      rooms: roomsList,
    });
  } catch (error) {
    logger.error("Get rooms error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching rooms",
      error: error.message,
    });
  }
};

export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId })
      .select("-passkey")
      .populate("host", "username displayName avatar");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.json({
      success: true,
      room: {
        roomId: room.roomId,
        name: room.name,
        mode: room.mode,
        gameType: room.gameType,
        isPublic: room.isPublic,
        host: room.host,
        players: room.players,
        maxPlayers: room.maxPlayers,
        unoSettings: room.unoSettings,
        status: room.status,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        hasPasskey: !!room.passkey,
      },
    });
  } catch (error) {
    logger.error("Get room error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching room",
      error: error.message,
    });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { passkey } = req.body;

    const room = await Room.findOne({ roomId }).select("+passkey");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (room.status !== "waiting") {
      return res.status(400).json({
        success: false,
        message: "Room is not accepting players",
      });
    }

    if (room.isFull()) {
      return res.status(400).json({
        success: false,
        message: "Room is full",
      });
    }

    const playerExists = room.players.some(
      (p) => p.userId.toString() === req.userId.toString()
    );

    if (playerExists) {
      // Player already in room, return success with room data
      const populatedRoom = await Room.findOne({ roomId }).populate("host", "username displayName avatar");
      return res.json({
        success: true,
        message: "Already in room",
        room: {
          roomId: populatedRoom.roomId,
          name: populatedRoom.name,
          mode: populatedRoom.mode,
          gameType: populatedRoom.gameType,
          bingoSettings: populatedRoom.bingoSettings,
          unoSettings: populatedRoom.unoSettings,
          host: populatedRoom.host,
          players: populatedRoom.players,
          maxPlayers: populatedRoom.maxPlayers,
          status: populatedRoom.status,
          hasPasskey: !!populatedRoom.passkey,
        },
      });
    }

    if (room.passkey) {
      if (!passkey) {
        return res.status(400).json({
          success: false,
          message: "Passkey required",
        });
      }

      const isValid = await room.comparePasskey(passkey);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid passkey",
        });
      }
    }

    await room.addPlayer({
      userId: req.userId,
      username: req.user.username,
      displayName: req.user.displayName,
      avatar: req.user.avatar,
      isReady: false,
    });

    logger.info(`User ${req.user.username} joined room ${roomId}`);
    const populatedRoom = await Room.findOne({ roomId }).populate("host", "username displayName avatar");

    res.json({
      success: true,
      message: "Joined room successfully",
      room: {
        roomId: populatedRoom.roomId,
        name: populatedRoom.name,
        mode: populatedRoom.mode,
        gameType: populatedRoom.gameType,
        bingoSettings: populatedRoom.bingoSettings,
        unoSettings: populatedRoom.unoSettings,
        host: populatedRoom.host,
        players: populatedRoom.players,
        maxPlayers: populatedRoom.maxPlayers,
        status: populatedRoom.status,
        hasPasskey: !!populatedRoom.passkey,
      },
    });
  } catch (error) {
    logger.error("Join room error:", error);
    res.status(500).json({
      success: false,
      message: "Error joining room",
      error: error.message,
    });
  }
};

export const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    await room.removePlayer(req.userId);

    if (room.players.length === 0) {
      await Room.deleteOne({ roomId });
      logger.info(`Room ${roomId} deleted (empty)`);
    }

    logger.info(`User ${req.user.username} left room ${roomId}`);

    res.json({
      success: true,
      message: "Left room successfully",
    });
  } catch (error) {
    logger.error("Leave room error:", error);
    res.status(500).json({
      success: false,
      message: "Error leaving room",
      error: error.message,
    });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (room.host.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only host can delete room",
      });
    }

    await Room.deleteOne({ roomId });

    logger.info(`Room ${roomId} deleted by host ${req.user.username}`);

    res.json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    logger.error("Delete room error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting room",
      error: error.message,
    });
  }
};
