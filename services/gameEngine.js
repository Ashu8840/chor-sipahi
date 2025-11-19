import gameConfig from '../config/gameConfig.js';
import logger from '../config/logger.js';

class GameEngine {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.currentRound = 0;
    this.roles = {};
    this.scores = {};
    this.revealedRoles = [];
    this.roundHistory = [];
  }

  // Assign roles randomly to 4 players
  assignRoles() {
    const roleNames = [
      gameConfig.ROLES.RAJA,
      gameConfig.ROLES.MANTRI,
      gameConfig.ROLES.SIPAHI,
      gameConfig.ROLES.CHOR,
    ];

    // Shuffle roles
    const shuffled = roleNames.sort(() => Math.random() - 0.5);

    this.players.forEach((player, index) => {
      this.roles[player.userId] = shuffled[index];
      if (!this.scores[player.userId]) {
        this.scores[player.userId] = 0;
      }
    });

    logger.info(`Roles assigned for room ${this.roomId}:`, this.roles);
    return this.roles;
  }

  // Get role for a player
  getRole(userId) {
    return this.roles[userId];
  }

  // Reveal role (Raja or Mantri only)
  revealRole(userId) {
    const role = this.roles[userId];
    
    if (role !== gameConfig.ROLES.RAJA && role !== gameConfig.ROLES.MANTRI) {
      throw new Error('Only Raja and Mantri can reveal their roles');
    }

    const revelation = {
      playerId: userId,
      role,
      revealedAt: new Date(),
    };

    this.revealedRoles.push(revelation);
    return revelation;
  }

  // Process Sipahi's guess
  processGuess(guessedUserId) {
    const sipahiId = Object.keys(this.roles).find(
      (id) => this.roles[id] === gameConfig.ROLES.SIPAHI
    );
    const chorId = Object.keys(this.roles).find(
      (id) => this.roles[id] === gameConfig.ROLES.CHOR
    );

    if (!sipahiId || !chorId) {
      throw new Error('Invalid game state: Sipahi or Chor not found');
    }

    const correctGuess = guessedUserId === chorId;

    // Calculate round scores
    const roundScores = this.calculateRoundScores(correctGuess);

    // Update total scores
    Object.keys(roundScores).forEach((userId) => {
      this.scores[userId] = (this.scores[userId] || 0) + roundScores[userId];
    });

    // Save round history
    const roundData = {
      roundNumber: this.currentRound,
      roles: { ...this.roles },
      sipahi: sipahiId,
      chor: chorId,
      guessedPlayer: guessedUserId,
      correctGuess,
      roundScores,
      revealedRoles: [...this.revealedRoles],
      timestamp: new Date(),
    };

    this.roundHistory.push(roundData);

    logger.info(`Round ${this.currentRound} completed:`, {
      correctGuess,
      roundScores,
    });

    return {
      correctGuess,
      roundScores,
      sipahi: this.players.find((p) => p.userId === sipahiId),
      chor: this.players.find((p) => p.userId === chorId),
      guessedPlayer: this.players.find((p) => p.userId === guessedUserId),
      allRoles: this.getAllRolesWithPlayers(),
    };
  }

  // Calculate scores for the round
  calculateRoundScores(correctGuess) {
    const roundScores = {};

    Object.keys(this.roles).forEach((userId) => {
      const role = this.roles[userId];

      switch (role) {
        case gameConfig.ROLES.RAJA:
          roundScores[userId] = gameConfig.SCORING.RAJA;
          break;
        case gameConfig.ROLES.MANTRI:
          roundScores[userId] = gameConfig.SCORING.MANTRI;
          break;
        case gameConfig.ROLES.SIPAHI:
          roundScores[userId] = correctGuess
            ? gameConfig.SCORING.SIPAHI_SUCCESS
            : gameConfig.SCORING.SIPAHI_FAIL;
          break;
        case gameConfig.ROLES.CHOR:
          roundScores[userId] = correctGuess
            ? gameConfig.SCORING.CHOR_CAUGHT
            : gameConfig.SCORING.CHOR_ESCAPED;
          break;
        default:
          roundScores[userId] = 0;
      }
    });

    return roundScores;
  }

  // Prepare for next round
  nextRound() {
    this.currentRound++;
    this.revealedRoles = [];
    
    if (this.currentRound < gameConfig.MATCH_ROUNDS) {
      this.assignRoles();
      return { continue: true, round: this.currentRound };
    }

    return { continue: false, winner: this.getWinner() };
  }

  // Get winner
  getWinner() {
    const entries = Object.entries(this.scores);
    if (entries.length === 0) return null;

    entries.sort((a, b) => b[1] - a[1]);
    const winnerUserId = entries[0][0];
    const player = this.players.find((p) => p.userId === winnerUserId);

    return {
      userId: winnerUserId,
      username: player?.username,
      displayName: player?.displayName,
      score: entries[0][1],
    };
  }

  // Get all roles with player info
  getAllRolesWithPlayers() {
    return Object.keys(this.roles).map((userId) => {
      const player = this.players.find((p) => p.userId === userId);
      return {
        userId,
        username: player?.username,
        displayName: player?.displayName,
        role: this.roles[userId],
      };
    });
  }

  // Get match summary
  getMatchSummary() {
    return {
      roomId: this.roomId,
      rounds: this.roundHistory,
      finalScores: this.scores,
      winner: this.getWinner(),
      players: this.players.map((p) => ({
        ...p,
        finalScore: this.scores[p.userId] || 0,
      })),
    };
  }
}

export default GameEngine;
