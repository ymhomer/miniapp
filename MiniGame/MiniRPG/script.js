// Create Character
class Character {
	constructor(name, hp, mp, atk, def) {
	  this.name = name;
	  this.hp = hp;
	  this.mp = mp;
	  this.atk = atk;
	  this.def = def;
	}

	attack(target) {
		const damage = this.atk - target.def;
		target.hp -= damage;
		log(`${this.name} 对 ${target.name} 造成了 ${damage} 点伤害！`);
	}

	defend() {
		log(`${this.name} 准备防御！`);
	}
}

// Create Map
class Map {
	constructor() {
		this.width = 10;
		this.height = 10;
		this.playerX = 0;
		this.playerY = 0;
		this.grid = []; // 存储地图上的信息的数组

		// 初始化地图信息
		for (let y = 0; y < this.height; y++) {
			this.grid[y] = [];
			for (let x = 0; x < this.width; x++) {
				this.grid[y][x] = {
					type: 'empty', // 格子类型，可以是 empty（空）、item（物品）或 enemy（怪物）
					item: null, // 格子上的物品
					enemy: null // 格子上的怪物
				};
			}
		}
		
		// 添加玩家和怪物
		this.grid[0][0].type = 'player';
		this.grid[0][0].player = player;
		this.grid[9][9].type = 'enemy';
		this.grid[9][9].enemy = enemy;
		this.enemyX = 9;
		this.enemyY = 9;
	}

	draw() {
		let html = '';
		/*
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				let className = 'tile';
				switch (this.grid[y][x].type) {
					case 'item':
						className += ' item-tile';
						break;
					case 'enemy':
						className += ' enemy-tile';
						break;
					case 'player':
						className += ' player-tile';
						break;
					default:
						break;
				}
				html += '<div class="' + className + '"></div>';
			}
		}*/
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				let className = 'tile';
				if (this.grid[y][x].image) {
					html += `<div class="tile" style="background-image: url(${this.grid[y][x].image})"></div>`;
				} else {
					html += `<div class="tile">${this.grid[y][x].symbol || ''}</div>`;
				}
			}
		}
		$('#map').html(html);
	}

	movePlayer(dx, dy) {
		const newX = this.playerX + dx;
		const newY = this.playerY + dy;
		if (newX < 0 || newX >= this.width || newY < 0 || newY >= this.height) {
			log('你撞墙了！');
			return;
		}
		this.playerX = newX;
		this.playerY = newY;
		this.draw();
	}
	
	addPlayer(x, y, player) {
		this.grid[y][x].type = 'player';
		this.grid[y][x].player = player;
		this.playerX = x;
		this.playerY = y;
		if (player.image) {
			this.grid[y][x].image = player.image;
		} else {
			this.grid[y][x].symbol = '@';
		}
	  }

	addItem(x, y, item) {
		this.grid[y][x].type = 'item';
		this.grid[y][x].item = item;
		if (item.image) {
			this.grid[y][x].image = item.image;
		} else {
			this.grid[y][x].symbol = '?';
		}
	}

	addEnemy(x, y, enemy) {
		this.grid[y][x].type = 'enemy';
		this.grid[y][x].enemy = enemy;
		if (enemy.image) {
			this.grid[y][x].image = enemy.image;
		} else {
			this.grid[y][x].symbol = '!';
		}
	}
}

class Item {
  constructor(name, description, image, hp) {
    this.name = name;
    this.description = description;
    this.image = image;
    this.hp = hp;
  }

  use(target, map) {
	  target.hp += this.hp;
	  log(`${target.name} 使用了 ${this.name}，恢复了 ${this.hp} 点生命值！`);
	  if (target.hp > 100) {
		target.hp = 100;
	  }
	  map.grid[map.playerY][map.playerX].type = 'empty';
	  map.grid[map.playerY][map.playerX].item = null;
	  map.draw();
	}

}

const healthPotion = new Item('Health Potion', '恢复20点生命值', 'health-potion.png', 20);

//const healthPotion = new Item('Health Potion', '恢复20点生命值');


// Create log
function log(text) {
	$('#log').prepend(`<p>${text}</p>`);
}

// Create items
const player = new Character('You', 100, 20, 10, 5);
const enemy = new Character('Monster', 50, 10, 5, 2);

$('#playerName').text(`名称：${player.name}`);
$('#playerHp').text(`生命值：${player.hp}`);
$('#playerMp').text(`魔法值：${player.mp}`);

$('#enemyName').text(`名称：${enemy.name}`);
$('#enemyHp').text(`生命值：${enemy.hp}`);
$('#enemyMp').text(`魔法值：${enemy.mp}`);

const map = new Map();

// 添加物品和怪物
map.addItem(2, 3, 'healthPotion');
map.addEnemy(6, 7, new Character('Goblin', 30, 5, 8, 3));

// Draw Map
map.draw();

// Movement action
$(document).on('keydown', function(event) {
	switch (event.keyCode) {
		case 37: // left
			map.movePlayer(-1, 0);
			break;
		case 38: // up
			map.movePlayer(0, -1);
			break;
		case 39: // right
			map.movePlayer(1, 0);
			break;
		case 40: // down
			map.movePlayer(0, 1);
			break;
	}
});

// attachEvent
$('#enemy').on('click', function() {
	player.attack(enemy);
	if (enemy.hp <= 0) {
		log(`${enemy.name} 被击败了！`);
		$(this).hide();
	}
});

// defenceEvent
$('#player').on('click', function() {
	player.defend();
});

// Listen for "U" key press to use item
$(document).on('keydown', function(event) {
  if (event.key === 'u' || event.key === 'U') {
    const item = map.grid[map.playerY][map.playerX].item;
    if (item) {
      item.use(player, map);
    } else {
      log('没有可用的物品！');
    }
  }
});
