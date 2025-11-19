import gameConfig from "../config/game.config.js";
import logger from "../config/logger.js";

export class GameEngine {
  static assignRoles(playerCount = 4) {
    const roles = ["Raja", "Mantri", "Sipahi", "Chor"];

    const shuffled = roles.sort(() => Math.random() - 0.5);

    return shuffled.slice(0, playerCount);
  }

  static calculateRoundScore(
    playerRole,
    sipahiGuess,
    actualChorUserId,
    guessedUserId,
    userRoleMap
  ) {
    const correctGuess = actualChorUserId === guessedUserId;

    switch (playerRole) {
      case "Raja":
        return correctGuess ? gameConfig.RAJA_WIN_POINTS : 0;

      case "Mantri":
        return correctGuess ? gameConfig.MANTRI_WIN_POINTS : 0;

      case "Sipahi":
        return correctGuess
          ? gameConfig.SIPAHI_WIN_POINTS
          : gameConfig.SIPAHI_LOSE_POINTS;

      case "Chor":
        return correctGuess
          ? gameConfig.CHOR_LOSE_POINTS
          : gameConfig.CHOR_WIN_POINTS;

      default:
        return 0;
    }
  }

  static processRound(players, roleAssignments, sipahiGuessedUserId) {
    const roundScores = new Map();
    const playerRoles = new Map();

    players.forEach((player, index) => {
      const role = roleAssignments[index];
      playerRoles.set(player.userId.toString(), role);
    });

    const chorPlayer = players.find((p, i) => roleAssignments[i] === "Chor");
    const actualChorUserId = chorPlayer.userId.toString();

    const correctGuess = actualChorUserId === sipahiGuessedUserId;

    players.forEach((player, index) => {
      const userId = player.userId.toString();
      const role = roleAssignments[index];

      const score = this.calculateRoundScore(
        role,
        sipahiGuessedUserId,
        actualChorUserId,
        sipahiGuessedUserId,
        playerRoles
      );

      roundScores.set(userId, score);
    });

    return {
      roles: playerRoles,
      scores: roundScores,
      correctGuess,
      chorUserId: actualChorUserId,
      guessedUserId: sipahiGuessedUserId,
    };
  }

  static calculateFinalResults(roundsData, players) {
    const playerScores = new Map();
    const roleStats = new Map();

    players.forEach((player) => {
      const userId = player.userId.toString();
      playerScores.set(userId, {
        userId,
        username: player.username,
        displayName: player.displayName,
        totalScore: 0,
        roleStats: {
          Raja: { played: 0, points: 0 },
          Mantri: { played: 0, points: 0 },
          Sipahi: { played: 0, points: 0 },
          Chor: { played: 0, points: 0 },
        },
      });
    });

    roundsData.forEach((round) => {
      round.scores.forEach((score, userId) => {
        const playerData = playerScores.get(userId);
        const role = round.roles.get(userId);

        playerData.totalScore += score;
        playerData.roleStats[role].played += 1;
        playerData.roleStats[role].points += score;
      });
    });

    const results = Array.from(playerScores.values()).sort(
      (a, b) => b.totalScore - a.totalScore
    );

    const winner = results[0];

    logger.info(
      `Match results calculated: Winner ${winner.username} with ${winner.totalScore} points`
    );

    return {
      results,
      winner: winner.userId,
    };
  }

  static getMatchSummary(matchData) {
    return {
      matchId: matchData.matchId,
      winner: matchData.winner,
      totalRounds: matchData.rounds.length,
      players: matchData.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        finalScore: p.finalScore,
        placement: p.placement,
      })),
    };
  }

  static validateGameState(room) {
    if (!room || !room.players || room.players.length < 2) {
      return { valid: false, error: "Not enough players" };
    }

    if (room.players.length > gameConfig.MAX_PLAYERS) {
      return { valid: false, error: "Too many players" };
    }

    const allReady = room.players.every((p) => p.isReady);
    if (!allReady) {
      return { valid: false, error: "Not all players are ready" };
    }

    return { valid: true };
  }
}

export default GameEngine;
