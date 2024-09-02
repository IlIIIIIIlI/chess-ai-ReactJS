/* eslint-disable no-restricted-globals */
import { Chess } from "chess.js";
import { minimaxRoot } from "./chessLogic";
import { astar } from "./astarChess";
import { getOpenAIMove } from "./openAIBot";

function sendLog(...args) {
  self.postMessage({ type: "log", message: args.join(" ") });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

self.onmessage = async (e) => {
  const {
    fen,
    aiModel,
    depth,
    heuristicWeight,
    moveHistory,
    openAIKey,
    capturedPieces,
  } = e.data;

  sendLog("Worker received message. AI Model:", aiModel);

  const game = new Chess(fen);
  sendLog("Current FEN:", game.fen());
  sendLog("Current turn:", game.turn());
  sendLog("Legal moves:", JSON.stringify(game.moves({ verbose: true })));

  let bestMove;

  try {
    sendLog(`Starting AI move calculation for ${aiModel}`);
    switch (aiModel) {
      case "minimax":
        bestMove = minimaxRoot(game, depth, true);
        break;
      case "astar":
        bestMove = astar(game, depth);
        break;
      case "openai":
        sendLog(
          "Calling getOpenAIMove with openAIKey:",
          openAIKey ? "Key provided" : "No key provided"
        );
        bestMove = await getOpenAIMove(
          game,
          openAIKey,
          moveHistory,
          capturedPieces,
          sendLog
        );
        sendLog("Received move from getOpenAIMove:", JSON.stringify(bestMove));
        if (bestMove) {
          sendLog(
            "OpenAI move generated. Waiting for 1 minute before next move."
          );
          await delay(20000); // Wait for 1 minute (60000 milliseconds)
          sendLog("1 minute wait completed after OpenAI move.");
        }
        break;
      default:
        sendLog("Unknown AI model, using random move");
        bestMove = getRandomMove(game);
    }

    if (
      bestMove &&
      typeof bestMove === "object" &&
      "from" in bestMove &&
      "to" in bestMove
    ) {
      if (game.move(bestMove)) {
        game.undo();
        sendLog("Valid move found:", JSON.stringify(bestMove));
        self.postMessage({ type: "move", move: bestMove });
      } else {
        sendLog("Invalid move generated:", JSON.stringify(bestMove));
        fallbackToRandomMove(game);
      }
    } else {
      sendLog(
        "Invalid move format or no move generated:",
        JSON.stringify(bestMove)
      );
      fallbackToRandomMove(game);
    }
  } catch (error) {
    sendLog("Error in worker:", error.message);
    fallbackToRandomMove(game);
  }
};

function getRandomMove(game) {
  const moves = game.moves({ verbose: true });
  return moves[Math.floor(Math.random() * moves.length)];
}

function fallbackToRandomMove(game) {
  sendLog("Falling back to random move");
  const randomMove = getRandomMove(game);
  if (randomMove) {
    sendLog("Random move selected:", JSON.stringify(randomMove));
    self.postMessage({ type: "move", move: randomMove });
  } else {
    sendLog("No valid moves available");
    self.postMessage({ type: "move", move: null });
  }
}
