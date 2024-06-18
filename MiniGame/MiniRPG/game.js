(function() {
    const MAX_POINTS = 50;
    const MAX_POINTS_MONSTER = 30;
    let gameState = {
        pointsLeft: MAX_POINTS,
		roundPoints: MAX_POINTS_MONSTER,
        player: { health: 0, mana: 0, attack: 0 },
        monsters: [],
        currentLevel: 1,
        totalAttacks: 0,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        totalMonstersKilled: 0,
        attackMode: false
    };

    function initGame() {
        bindUIActions();
    }

    function bindUIActions() {
        document.querySelectorAll(".card-body input").forEach(input => {
            input.addEventListener('input', () => updatePoints(input));
        });
        document.getElementById('assignAttributesBtn').addEventListener('click', assignAttributes);
        document.getElementById('rewardHealthBtn').addEventListener('click', () => chooseReward('health'));
        document.getElementById('rewardAttackBtn').addEventListener('click', () => chooseReward('attack'));
        document.getElementById('restartGameBtn').addEventListener('click', restartGame);
    }

    function updatePoints(input) {
        const totalUsed = Array.from(document.querySelectorAll(".card-body input")).reduce((acc, input) => acc + (parseInt(input.value) || 0), 0);
        gameState.pointsLeft = MAX_POINTS - totalUsed;
        document.getElementById("pointsLeft").textContent = `Point remain: ${gameState.pointsLeft}`;

        if (gameState.pointsLeft < 0) {
            alert("The points allocated exceed the total points, please reallocate!");
            resetInputValues();
            updatePointsDisplay();
        }
    }
	
	function updatePointsDisplay() {
		document.getElementById("pointsLeft").textContent = `Point remain: ${gameState.pointsLeft}`;
	}

    function resetInputValues() {
        document.querySelectorAll(".card-body input").forEach(input => input.value = 0);
    }

    function assignAttributes() {
        if (gameState.pointsLeft !== 0) {
            alert("The points must be distributed exactly, 30 points in total.");
            return;
        }

        Object.keys(gameState.player).forEach(attr => {
            gameState.player[attr] = Math.max(0, parseInt(document.getElementById(attr).value) || 0);
        });

        togglePanels('attributePanel', 'battlePanel');
        prepareBattle();
    }

    function prepareBattle() {
		const numMonsters = Math.floor(Math.random() * 3) + 1;
		gameState.monsters = [];
		let pointsPerMonster = Math.floor(gameState.roundPoints / numMonsters);

		for (let i = 0; i < numMonsters; i++) {
			let health = Math.floor(Math.random() * (pointsPerMonster + 1));
			let mana = Math.floor(Math.random() * (pointsPerMonster - health + 1));
			let attack = pointsPerMonster - health - mana;
			gameState.monsters.push({ health, mana, attack });
		}

		updateLevelAndMonsterInfo();
		togglePanels(null, 'battlePanel');
		updateBattleDisplay();
	}
	
	function togglePanels(hidePanel, showPanel) {
        if (hidePanel) {
            const panelToHide = document.getElementById(hidePanel);
            if (panelToHide) {
                panelToHide.classList.add('hidden');
            }
        }
        if (showPanel) {
            const panelToShow = document.getElementById(showPanel);
            if (panelToShow) {
                panelToShow.classList.remove('hidden');
            }
        }
    }
	
	function chooseReward(type) {
		if (type === 'health') {
			gameState.player.health += 2;
		} else if (type === 'attack') {
			gameState.player.attack += 2;
		} else if (type === 'mana') {
			gameState.player.mana += 2;
		}
		//gameState.roundPoints += 5;
		//gameState.currentLevel++;
		prepareBattle();
		togglePanels('rewardPanel', 'battlePanel');
	}
	
	function restartGame() {
		Object.assign(gameState, {
			pointsLeft: MAX_POINTS,
			roundPoints: MAX_POINTS,
			player: { health: 10, mana: 10, attack: 10 },
			monsters: [],
			currentLevel: 1,
			totalAttacks: 0,
			totalDamageDealt: 0,
			totalDamageTaken: 0,
			totalMonstersKilled: 0,
			attackMode: false
		});
		updatePointsDisplay();
		togglePanels('summaryPanel', 'attributePanel');
		updateBattleDisplay();
	}

	
	function updateLevelAndMonsterInfo() {
        document.getElementById('currentLevelInfo').textContent = gameState.currentLevel;
        document.getElementById('totalMonsterAttributes').textContent = gameState.monsters.reduce((sum, m) => sum + m.health + m.mana + m.attack, 0);
    }

	function updateBattleDisplay() {
        updatePlayerDisplay();
        updateMonsterDisplay();
    }
	function updatePlayerDisplay() {
        let playerStats = document.getElementById('playerStats');
        if (playerStats) {
            playerStats.innerHTML = `<h3>Player status</h3>
                                     <p>HP: ${gameState.player.health}</p>
                                     <p>MP: ${gameState.player.mana}</p>
                                     <p>ATT: ${gameState.player.attack}</p>`;
            const attackBtn = document.createElement('button');
            attackBtn.classList.add('btn', 'btn-danger', 'mt-3');
            attackBtn.textContent = 'Attack';
            attackBtn.addEventListener('click', enableAttackMode);
            playerStats.appendChild(attackBtn);
        }
    }

    function enableAttackMode() {
        if (gameState.monsters.length === 0) {
            document.getElementById('battleLog').innerHTML = '<p>No monsters can attack!</p>';
            return;
        }
        attackMode = true;
        document.getElementById('battleLog').innerHTML = '<p>Please select a monster to attack.</p>';
        gameState.monsters.forEach((_, index) => {
            let monsterCard = document.getElementById(`monster-card-${index}`);
            if (monsterCard) {
                monsterCard.classList.add('pulse');
            }
        });
    }

    function updateMonsterDisplay() {
        let monsterArea = document.getElementById('monsterStats');
        if (monsterArea) {
            monsterArea.innerHTML = '';
            gameState.monsters.forEach((monster, index) => {
                let card = document.createElement('div');
                card.className = 'monster-card';
                card.innerHTML = `<div class="monster-header h3">Monster ${index + 1}</div>
                                  <div class="monster-stats">
                                      <p>HP: ${monster.health}</p>
                                      <p>MP: ${monster.mana}</p>
                                      <p>ATT: ${monster.attack}</p>
                                  </div>`;
                card.addEventListener('click', () => attackMonster(index));
                monsterArea.appendChild(card);
            });
        }
    }

    function attackMonster(index) {
        if (!attackMode || gameState.monsters.length === 0) return;

        const target = gameState.monsters[index];
        const damage = Math.min(target.health, gameState.player.attack);
        target.health -= damage;
        gameState.totalDamageDealt += damage;
        gameState.totalAttacks++;

        let attackLog = document.getElementById('battleLog');
        attackLog.innerHTML = `<p>You attacked monster ${index + 1} and caused ${damage} points of damage.</p>`;
        if (target.health <= 0) {
            attackLog.innerHTML += `<p>Monster ${index + 1} has been defeated!</p>`;
            gameState.monsters.splice(index, 1);
            gameState.totalMonstersKilled++;
        }

        updateMonsterDisplay();
        if (gameState.monsters.length === 0) {
            gameOver(true);
        } else {
            monstersAttack();
        }
        attackMode = false;
    }

    function monstersAttack() {
        let attackLog = document.getElementById('battleLog');
        attackLog.innerHTML = "";

        gameState.monsters.forEach(monster => {
            const damage = Math.min(gameState.player.health, monster.attack);
            gameState.player.health -= damage;
            gameState.totalDamageTaken += damage;
            attackLog.innerHTML += `<p>The monster attacked you, causing ${damage} damage.</p>`;
        });

        updatePlayerDisplay();
        if (gameState.player.health <= 0) {
            gameOver(false);
        }
    }
	
	function gameOver(victory) {
		if (victory) {
			gameState.roundPoints += 5;
			gameState.currentLevel++;
			prepareBattle();
			togglePanels('battlePanel', 'rewardPanel');
		} else {
			togglePanels('battlePanel', 'summaryPanel');
			displaySummary();
		}
	}

    function displaySummary() {
		console.log('Displaying summary:', gameState);
		document.getElementById('totalLevels').textContent = gameState.currentLevel;
		document.getElementById('totalMonstersKilled').textContent = gameState.totalMonstersKilled;
		document.getElementById('totalAttacks').textContent = gameState.totalAttacks;
		document.getElementById('totalDamageDealt').textContent = gameState.totalDamageDealt;
		document.getElementById('totalDamageTaken').textContent = gameState.totalDamageTaken;
	}
    initGame();
})();