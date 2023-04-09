var gameBoard = document.querySelector('.game-board');
var gameMessage = document.querySelector('.game-message');

var GameManager = {
  score: 0,
  board: null,
  size: 4,
  startTiles: 2,

  // 初始化游戏
  setup: function() {
    this.board = new Array(this.size);
    for (var i = 0; i < this.size; i++) {
      this.board[i] = new Array(this.size);
      for (var j = 0; j < this.size; j++) {
        this.board[i][j] = 0;
      }
    }
    this.addStartTiles();
    this.updateBoard();
  },

  // 在随机位置添加方块
  addRandomTile: function() {
    var emptyTiles = [];
    for (var i = 0; i < this.size; i++) {
      for (var j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) {
          emptyTiles.push({x: i, y: j});
        }
      }
    }
    var randomTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
    this.board[randomTile.x][randomTile.y] = Math.random() < 0.9 ? 2 : 4;
  },

  // 添加起始方块
  addStartTiles: function() {
    for (var i = 0; i < this.startTiles; i++) {
      this.addRandomTile();
    }
  },

  // 更新游戏面板
  updateBoard: function() {
    gameBoard.innerHTML = '';
    for (var i = 0; i < this.size; i++) {
      for (var j = 0; j < this.size; j++) {
        var tileValue = this.board[i][j];
        var tile = document.createElement('div');
        tile.classList.add('tile');
        tile.classList.add('tile-' + tileValue);
        tile.innerText = tileValue === 0 ? '' : tileValue;
        gameBoard.appendChild(tile);
      }
    }
  },

  // 检查游戏是否结束
  checkGameOver: function() {
    for (var i = 0; i < this.size; i++) {
      for (var j = 0; j < this.size; j++) {
        if (this.board[i][j] === 0) {
          return false;
        }
        if (i < this.size - 1 && this.board[i][j] === this.board[i + 1][j]) {
          return false;
        }
        if (j < this.size - 1 && this.board[i][j] === this.board[i][j + 1]) {
          return false;
        }
      }
    }
    return true;
  },

  // 处理游戏结束
  handleGameOver: function() {
    gameMessage.innerText = 'Game Over!';
    gameMessage.style.display = 'block';
  },

  // 处理游戏胜利
  handleGameWin: function() {
    gameMessage.innerText = 'You Win!';
    gameMessage.style.display = 'block';
  },

  // 移动方块
  move: function(direction) {
  var moved = false;
  var self = this;
  var nextX, nextY, currentTileValue;
  var startX, startY, deltaX, deltaY;
  var canMerge;

  // 创建临时游戏板来保存原始状态
  var oldBoard = JSON.parse(JSON.stringify(this.board));

  switch (direction) {
    case "left":
      alert("left");
      for (var i = 0; i < this.size; i++) {
        for (var j = 1; j < this.size; j++) {
          if (this.board[i][j] !== 0) {
            currentTileValue = this.board[i][j];
            nextX = i;
            nextY = j - 1;
            canMerge = false;
            while (nextY >= 0 && this.board[nextX][nextY] === 0) {
              nextY--;
            }
            if (nextY >= 0 && this.board[nextX][nextY] === currentTileValue) {
              canMerge = true;
            }
            if (j !== nextY + 1) {
              moved = true;
            }
            this.board[i][j] = 0;
            this.board[nextX][nextY + (canMerge ? 0 : 1)] = canMerge ? currentTileValue * 2 : currentTileValue;
          }
        }
      }
      break;

    case "right":
    for (var i = 0; i < this.size; i++) {
      for (var j = this.size - 2; j >= 0; j--) {
        if (this.board[i][j] !== 0) {
          currentTileValue = this.board[i][j];
          nextX = i;
          nextY = j + 1;
          canMerge = false;
          while (nextY < this.size && this.board[nextX][nextY] === 0) {
            nextY++;
          }
          if (nextY < this.size && this.board[nextX][nextY] === currentTileValue) {
            canMerge = true;
          }
          if (j !== nextY - 1) {
            moved = true;
          }
          this.board[i][j] = 0;
          this.board[nextX][nextY - (canMerge ? 0 : 1)] = canMerge ? currentTileValue * 2 : currentTileValue;
        }
      }
    }
    break;

    case 'up':
    for (var j = 0; j < this.size; j++) {
      for (var i = 1; i < this.size; i++) {
        if (this.board[i][j] !== 0) {
          currentTileValue = this.board[i][j];
          nextX = i - 1;
          nextY = j;
          canMerge = false;
          while (nextX >= 0 && this.board[nextX][nextY] === 0) {
            nextX--;
          }
          if (nextX >= 0 && this.board[nextX][nextY] === currentTileValue) {
            canMerge = true;
          }
          if (i !== nextX + 1) {
            moved = true;
          }
          this.board[i][j] = 0;
          this.board[nextX + (canMerge ? 0 : 1)][nextY] = canMerge ? currentTileValue * 2 : currentTileValue;
        }
      }
    }
    break;

  case 'down':
    for (var j = 0; j < this.size; j++) {
      for (var i = this.size - 2; i >= 0; i--) {
        if (this.board[i][j] !== 0) {
          currentTileValue = this.board[i][j];
          nextX = i + 1;
          nextY = j;
          canMerge = false;
          while (nextX < this.size && this.board[nextX][nextY] === 0) {
            nextX++;
          }
          if (nextX < this.size && this.board[nextX][nextY] === currentTileValue) {
            canMerge = true;
          }
          if (i !== nextX - 1) {
            moved = true;
          }
          this.board[i][j] = 0;
          this.board[nextX - (canMerge ? 0 : 1)][nextY] = canMerge ? currentTileValue * 2 : currentTileValue;
        }
      }
    }
    break;
    }
    this.updateBoard();
  },
  
  bindEventListeners: function() {
    var self = this;
    document.addEventListener('keydown', function(event) {
    if (event.keyCode === 37 || event.keyCode === 65) { // left arrow key or 'a' key
      self.move('left');
    }
    if (event.keyCode === 38 || event.keyCode === 87) { // up arrow key or 'w' key
      self.move('up');
    }
    if (event.keyCode === 39 || event.keyCode === 68) { // right arrow key or 'd' key
      self.move('right');
    }
    if (event.keyCode === 40 || event.keyCode === 83) { // down arrow key or 's' key
      self.move('down');
    }
    });
  }
}
GameManager.setup();