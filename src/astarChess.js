import { Chess } from "chess.js";

// 棋子价值
const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

// 位置评估表（简化版）
const POSITION_VALUES = {
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  b: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  r: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
  ],
  q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  k: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

// 启发式函数
function heuristic(game) {
  let score = 0;
  const board = game.board();

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const pieceValue = PIECE_VALUES[piece.type];
        const positionValue =
          POSITION_VALUES[piece.type][piece.color === "w" ? i : 7 - i][j];
        score +=
          (piece.color === "w" ? 1 : -1) * (pieceValue * 100 + positionValue);
      }
    }
  }

  return game.turn() === "w" ? score : -score;
}

// A* 节点
class Node {
  constructor(game, move, parent = null, g = 0) {
    this.game = new Chess(game.fen());
    this.move = move;
    this.parent = parent;
    this.g = g;
    this.h = heuristic(this.game);
    this.f = this.g + this.h;
  }
}

// A* 搜索算法
export function astar(game, depth) {
  const startNode = new Node(game, null);
  const openList = [startNode];
  const closedList = new Set();

  while (openList.length > 0 && depth > 0) {
    const currentNode = openList.reduce(
      (min, node) => (node.f < min.f ? node : min),
      openList[0]
    );
    openList.splice(openList.indexOf(currentNode), 1);

    if (currentNode.g === depth) {
      let node = currentNode;
      while (node.parent && node.parent.parent) {
        node = node.parent;
      }
      return node.move;
    }

    closedList.add(currentNode.game.fen());

    const moves = currentNode.game.moves({ verbose: true });
    for (const move of moves) {
      const newGame = new Chess(currentNode.game.fen());
      newGame.move(move);
      const newNode = new Node(newGame, move, currentNode, currentNode.g + 1);

      if (closedList.has(newGame.fen())) continue;

      const openNode = openList.find(
        (node) => node.game.fen() === newGame.fen()
      );
      if (!openNode) {
        openList.push(newNode);
      } else if (newNode.g < openNode.g) {
        openNode.g = newNode.g;
        openNode.f = newNode.f;
        openNode.parent = newNode.parent;
      }
    }

    depth--;
  }

  // 如果没有找到最优解，返回评分最高的移动
  const validMoves = game.moves({ verbose: true });
  if (validMoves.length === 0) {
    return null; // 没有有效的移动
  }

  return validMoves.reduce(
    (best, move) => {
      const newGame = new Chess(game.fen());
      newGame.move(move);
      const score = heuristic(newGame);
      return score > best.score ? { move, score } : best;
    },
    { move: null, score: game.turn() === "w" ? -Infinity : Infinity }
  ).move;
}
