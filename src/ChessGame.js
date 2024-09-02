import React, { useState, useEffect, useCallback, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import Toast from "./Toast";
import BurgerMenu from "./BurgerMenu";
import AIModelSelector from "./AIModelSelector";

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [boardSize, setBoardSize] = useState(400);
  const [toastMessage, setToastMessage] = useState(null);
  const [gameMode, setGameMode] = useState("playerFirst");
  const [currentPlayer, setCurrentPlayer] = useState("w");
  const [isThinking, setIsThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [aiModels, setAIModels] = useState({ w: "minimax", b: "minimax" });
  const [winner, setWinner] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [isComputerGameStarted, setIsComputerGameStarted] = useState(false);
  const [gameMoves, setGameMoves] = useState([]);
  const [openAIKey, setOpenAIKey] = useState("");
  const [promptLog, setPromptLog] = useState([]);
  const workerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./chessWorker.js", import.meta.url)
    );

    workerRef.current.addEventListener("message", (e) => {
      if (e.data.type === "log") {
        console.log("Worker log:", e.data.message);
        if (e.data.message.startsWith("Prompt for OpenAI:")) {
          setPromptLog((prevLog) => [...prevLog, e.data.message]);
        }
      } else if (e.data.type === "move") {
        const bestMove = e.data.move;
        if (bestMove && !gameOver) {
          setGame((currentGame) => {
            const newGame = new Chess(currentGame.fen());
            try {
              const move = newGame.move(bestMove);

              if (move) {
                // console.log(
                //   `${newGame.turn() === "w" ? "Black" : "White"} moved: ${
                //     move.san
                //   }`
                // );
                setGameMoves((prevMoves) => [
                  ...prevMoves,
                  `${newGame.turn() === "w" ? "Black" : "White"}: ${move.san}`,
                ]);

                setMoveHistory((prevHistory) => [
                  ...prevHistory,
                  newGame.fen(),
                ]);
                checkGameStatus(newGame);
                setCurrentPlayer(newGame.turn());
                return newGame;
              } else {
                console.error("Invalid move:", bestMove);
                return currentGame;
              }
            } catch (error) {
              console.error("Error making move:", error);
              return currentGame;
            }
          });
          setIsThinking(false);
        } else if (!bestMove) {
          console.log("No valid moves available");
          setIsThinking(false);
          checkGameStatus(game);
        }
      }
    });

    return () => {
      workerRef.current.terminate();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [gameOver, game]);

  useEffect(() => {
    const updateSize = () => {
      const smallerDimension = Math.min(window.innerWidth, window.innerHeight);
      setBoardSize(smallerDimension * 0.8);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const checkGameStatus = useCallback((gameToCheck) => {
    if (gameToCheck.isGameOver()) {
      setGameOver(true);
      setIsThinking(false);
      if (gameToCheck.isCheckmate()) {
        const winner = gameToCheck.turn() === "w" ? "Black" : "White";
        setWinner(winner);
        setToastMessage(`Checkmate! ${winner} wins!`);
      } else if (gameToCheck.isDraw()) {
        setWinner("Draw");
        if (gameToCheck.isStalemate()) {
          setToastMessage("Draw by stalemate!");
        } else if (gameToCheck.isThreefoldRepetition()) {
          setToastMessage("Draw by threefold repetition!");
        } else if (gameToCheck.isInsufficientMaterial()) {
          setToastMessage("Draw by insufficient material!");
        } else if (gameToCheck.halfMoves >= 100) {
          setToastMessage("Draw by fifty-move rule!");
        } else {
          setToastMessage("It's a draw!");
        }
      }
      generateGameLog();
    } else if (gameToCheck.isCheck()) {
      setToastMessage("Check!");
    } else {
      setToastMessage(null);
    }
  }, []);

  const calculateCapturedPieces = useCallback(() => {
    const pieces = {
      w: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
      b: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
    };

    game.board().forEach((row) => {
      row.forEach((piece) => {
        if (piece) {
          pieces[piece.color][piece.type]--;
        }
      });
    });

    return {
      w: Object.entries(pieces.b).flatMap(([type, count]) =>
        Array(count).fill(type)
      ),
      b: Object.entries(pieces.w).flatMap(([type, count]) =>
        Array(count).fill(type)
      ),
    };
  }, [game]);

  const makeAIMove = useCallback(() => {
    if (
      workerRef.current &&
      !gameOver &&
      (gameMode !== "computerVsComputer" || isComputerGameStarted)
    ) {
      setIsThinking(true);
      console.log("Computer is thinking...");
      setToastMessage("Computer is thinking...");

      const currentAIModel = aiModels[game.turn()];
      const messageData = {
        fen: game.fen(),
        aiModel: currentAIModel,
        moveHistory: moveHistory,
        openAIKey: openAIKey,
        capturedPieces: calculateCapturedPieces(),
      };

      switch (currentAIModel) {
        case "minimax":
          messageData.depth = 4;
          break;
        case "astar":
          messageData.depth = 4;
          messageData.heuristicWeight = 2.0;
          break;
        case "openai":
          console.log("OpenAI model selected", messageData);
          break;
      }

      workerRef.current.postMessage(messageData);
    }
  }, [
    game,
    gameOver,
    aiModels,
    moveHistory,
    gameMode,
    isComputerGameStarted,
    openAIKey,
    calculateCapturedPieces,
  ]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const shouldMakeAIMove =
      !gameOver &&
      ((game.turn() === "b" && gameMode === "playerFirst") ||
        (game.turn() === "w" && gameMode === "computerFirst") ||
        (gameMode === "computerVsComputer" && isComputerGameStarted));

    if (shouldMakeAIMove && !isThinking) {
      timeoutRef.current = setTimeout(() => {
        makeAIMove();
      }, 500);
    }
  }, [game, makeAIMove, gameMode, isThinking, gameOver, isComputerGameStarted]);

  const onDrop = (sourceSquare, targetSquare) => {
    if (gameMode === "computerVsComputer" || gameOver) return false;

    let move = null;
    setGame((currentGame) => {
      const newGame = new Chess(currentGame.fen());
      try {
        move = newGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });
      } catch (error) {
        console.log("Invalid move:", error);
        return currentGame;
      }

      if (move === null) {
        return currentGame;
      }

      // console.log(
      //   `${newGame.turn() === "w" ? "Black" : "White"} moved: ${move.san}`
      // );
      setGameMoves((prevMoves) => [
        ...prevMoves,
        `${newGame.turn() === "w" ? "Black" : "White"}: ${move.san}`,
      ]);

      setMoveHistory((prevHistory) => [...prevHistory, newGame.fen()]);
      checkGameStatus(newGame);
      setCurrentPlayer(newGame.turn());
      return newGame;
    });

    return move !== null;
  };

  const resetGame = () => {
    setGame(new Chess());
    setToastMessage(null);
    setCurrentPlayer("w");
    setIsThinking(false);
    setGameOver(false);
    setWinner(null);
    setMoveHistory([]);
    setIsComputerGameStarted(false);
    setGameMoves([]);
    setPromptLog([]);
  };

  const setNewGameMode = (mode) => {
    setGameMode(mode);
    resetGame();
  };

  const setAIModel = (color, model) => {
    console.log(`Updating AI model for ${color} to ${model}`);
    setAIModels((prev) => {
      const newModels = {
        ...prev,
        [color]: model,
      };
      console.log("New AI models state:", newModels);
      return newModels;
    });
  };

  const startComputerGame = () => {
    if (gameMode === "computerVsComputer" && !isComputerGameStarted) {
      setIsComputerGameStarted(true);
      makeAIMove();
    }
  };

  const generateGameLog = () => {
    if (gameMoves.length === 0) {
      console.log("No moves to log");
      return;
    }
    const log = gameMoves.join("\n");
    const blob = new Blob([log], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chess_game_log.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const CapturedPieces = ({ pieces }) => {
    const pieceSymbols = {
      p: "♙",
      n: "♘",
      b: "♗",
      r: "♖",
      q: "♕",
      k: "♔",
    };

    return (
      <div
        style={{ fontSize: "24px", marginBottom: "10px", textAlign: "center" }}
      >
        {pieces.map((piece, index) => (
          <span key={index}>{pieceSymbols[piece]}</span>
        ))}
      </div>
    );
  };

  const handleOpenAIKeyChange = (event) => {
    setOpenAIKey(event.target.value);
  };

  const capturedPieces = calculateCapturedPieces();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        position: "relative",
      }}
    >
      <BurgerMenu onReset={resetGame} onSetGameMode={setNewGameMode} />
      <AIModelSelector
        aiModels={aiModels}
        setAIModel={setAIModel}
        gameMode={gameMode}
      />
      {(aiModels.w === "openai" || aiModels.b === "openai") && (
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="openai-key">OpenAI API Key: </label>
          <input
            type="password"
            id="openai-key"
            value={openAIKey}
            onChange={handleOpenAIKeyChange}
            placeholder="Enter your OpenAI API key"
          />
        </div>
      )}
      <div style={{ marginBottom: "10px", textAlign: "center" }}>
        {gameOver ? (
          `Game Over - ${
            winner === "Draw" ? "It's a draw!" : `${winner} wins!`
          }`
        ) : (
          <>
            Current Player: {currentPlayer === "w" ? "White" : "Black"}(
            {gameMode === "playerFirst"
              ? currentPlayer === "w"
                ? "Player"
                : `AI (${aiModels.b})`
              : gameMode === "computerFirst"
              ? currentPlayer === "w"
                ? `AI (${aiModels.w})`
                : "Player"
              : `AI (${aiModels[currentPlayer]})`}
            ){isThinking && " - Computer is thinking..."}
          </>
        )}
      </div>
      {gameMode === "computerVsComputer" && !isComputerGameStarted && (
        <button onClick={startComputerGame} style={{ marginBottom: "10px" }}>
          Start Computer vs Computer Game
        </button>
      )}
      <div style={{ textAlign: "center" }}>Captured by White:</div>
      <CapturedPieces pieces={capturedPieces.w} />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardWidth={boardSize}
        />
      </div>
      <div style={{ textAlign: "center" }}>Captured by Black:</div>
      <CapturedPieces pieces={capturedPieces.b} />
      {toastMessage && <Toast message={toastMessage} />}
      <div style={{ marginTop: "20px", maxWidth: "80%", overflow: "auto" }}>
        <h3>Prompt Log:</h3>
        {promptLog.map((prompt, index) => (
          <pre
            key={index}
            style={{ whiteSpace: "pre-wrap", marginBottom: "10px" }}
          >
            {`Move ${index + 1}:\n${prompt}`}
          </pre>
        ))}
      </div>
    </div>
  );
};

export default ChessGame;
