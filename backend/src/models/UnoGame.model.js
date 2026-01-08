import mongoose from "mongoose";

const unoCardSchema = new mongoose.Schema({
  color: {
    type: String,
    enum: ["red", "blue", "green", "yellow", "black"], // black for Wild cards
    required: true,
  },
  type: {
    type: String,
    enum: [
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
      "skip", "reverse", "draw2", "wild", "wild_draw4"
    ],
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
});

const unoPlayerSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  hand: [unoCardSchema],
  hasCalledUno: {
    type: Boolean,
    default: false,
  },
  placement: {
    type: Number,
  },
  connected: {
    type: Boolean,
    default: true,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
});

const unoGameSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    players: [unoPlayerSchema],
    deck: [unoCardSchema],
    discardPile: [unoCardSchema],
    currentCardIndex: {
      type: Number,
      default: 0,
    },
    currentPlayerIndex: {
      type: Number,
      default: 0,
    },
    direction: {
      type: Number,
      default: 1, // 1 for clockwise, -1 for counterclockwise
    },
    currentColor: {
      type: String,
      enum: ["red", "blue", "green", "yellow", null],
      default: null,
    },
    lastColorBeforeWild: {
      type: String,
      enum: ["red", "blue", "green", "yellow", null],
      default: null,
    },
    status: {
      type: String,
      enum: ["waiting", "playing", "finished"],
      default: "waiting",
    },
    winner: {
      userId: String,
      username: String,
      placement: Number,
    },
    winners: [{
      userId: String,
      username: String,
      placement: Number,
    }],
    drawStack: {
      type: Number,
      default: 0, // For stacking +2 and +4 cards
    },
    maxPlayers: {
      type: Number,
      default: 4,
      min: 2,
      max: 10,
    },
  },
  {
    timestamps: true,
  }
);

// Method to create a full UNO deck
unoGameSchema.methods.createDeck = function () {
  const deck = [];
  const colors = ["red", "blue", "green", "yellow"];
  const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const actions = ["skip", "reverse", "draw2"];

  let cardId = 0;

  // Add number cards (0: one of each color, 1-9: two of each color)
  colors.forEach((color) => {
    // One 0 card per color
    deck.push({
      color,
      type: "0",
      id: `${color}-0-${cardId++}`,
    });

    // Two of each 1-9 per color
    numbers.slice(1).forEach((num) => {
      for (let i = 0; i < 2; i++) {
        deck.push({
          color,
          type: num,
          id: `${color}-${num}-${cardId++}`,
        });
      }
    });

    // Two of each action card per color
    actions.forEach((action) => {
      for (let i = 0; i < 2; i++) {
        deck.push({
          color,
          type: action,
          id: `${color}-${action}-${cardId++}`,
        });
      }
    });
  });

  // Add Wild cards (4 of each)
  for (let i = 0; i < 4; i++) {
    deck.push({
      color: "black",
      type: "wild",
      id: `wild-${cardId++}`,
    });
    deck.push({
      color: "black",
      type: "wild_draw4",
      id: `wild_draw4-${cardId++}`,
    });
  }

  return deck;
};

// Method to shuffle deck
unoGameSchema.methods.shuffleDeck = function () {
  for (let i = this.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
  }
};

// Method to deal cards to players
unoGameSchema.methods.dealCards = function () {
  const cardsPerPlayer = 7;
  this.discardPile = [];
  this.drawStack = 0;
  this.currentColor = null;
  this.lastColorBeforeWild = null;
  this.direction = 1;
  this.currentPlayerIndex = 0;
  
  this.players.forEach((player) => {
    player.hand = [];
    for (let i = 0; i < cardsPerPlayer; i++) {
      if (this.deck.length > 0) {
        player.hand.push(this.deck.pop());
      }
    }
  });

  // Put first card on discard pile (ensure it's not a Wild Draw 4)
  let firstCard;
  do {
    if (this.deck.length === 0) {
      this.reshuffleDiscardPile();
    }
    firstCard = this.deck.pop();
  } while (firstCard.type === "wild_draw4" || firstCard.type === "wild");

  this.discardPile.push(firstCard);
  this.currentColor = firstCard.color === "black" ? null : firstCard.color;
};

// Method to reshuffle discard pile into deck
unoGameSchema.methods.reshuffleDiscardPile = function () {
  if (this.discardPile.length <= 1) return;

  const topCard = this.discardPile.pop();
  this.deck = [...this.discardPile];
  this.discardPile = [topCard];
  this.shuffleDeck();
};

// Method to draw cards for a player
unoGameSchema.methods.drawCards = function (playerIndex, count) {
  const drawnCards = [];
  
  for (let i = 0; i < count; i++) {
    if (this.deck.length === 0) {
      this.reshuffleDiscardPile();
    }
    
    if (this.deck.length > 0) {
      const card = this.deck.pop();
      this.players[playerIndex].hand.push(card);
      drawnCards.push(card);
    }
  }
  
  return drawnCards;
};

// Method to check if a card can be played
unoGameSchema.methods.canPlayCard = function (card) {
  const topCard = this.discardPile[this.discardPile.length - 1];
  
  // Wild cards can always be played
  if (card.type === "wild" || card.type === "wild_draw4") {
    return true;
  }
  
  // Match color or type
  return (
    card.color === this.currentColor ||
    card.type === topCard.type
  );
};

// Method to advance to next player
unoGameSchema.methods.nextPlayer = function (skip = false) {
  const activePlayers = this.players.filter((p) => p.placement === undefined);
  if (activePlayers.length <= 1) return;

  let stepsToMove = 1 + (skip ? 1 : 0);

  while (stepsToMove > 0) {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + this.direction + this.players.length) %
      this.players.length;

    if (this.players[this.currentPlayerIndex].placement === undefined) {
      stepsToMove--;
    }
  }
};

// Method to reverse direction
unoGameSchema.methods.reverseDirection = function () {
  this.direction *= -1;
};

unoGameSchema.methods.getActivePlayerCount = function () {
  return this.players.filter((p) => p.placement === undefined).length;
};

unoGameSchema.methods.getPreviousActivePlayerIndex = function () {
  let attempts = 0;
  let index = this.currentPlayerIndex;

  while (attempts < this.players.length) {
    index = (index - this.direction + this.players.length) % this.players.length;
    if (this.players[index].placement === undefined) {
      return index;
    }
    attempts++;
  }

  return index;
};

const UnoGame = mongoose.model("UnoGame", unoGameSchema);

export default UnoGame;
