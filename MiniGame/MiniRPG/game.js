document.addEventListener('DOMContentLoaded', function() {
    const MAX_POINTS = 30;
    let pointsLeft = MAX_POINTS;
	let roundPoints = 30;
    let player = { health: 0, mana: 0, attack: 0 };
    let monsters = [];
    let currentLevel = 1;
    let totalAttacks = 0;
    let totalDamageDealt = 0;
    let totalDamageTaken = 0;
    let totalMonstersKilled = 0;
    let attackMode = false;

    const pointsLeftLabel = document.getElementById("pointsLeft");
    const attributeInputs = document.querySelectorAll(".card-body input");
    const assignAttributesBtn = document.getElementById('assignAttributesBtn');
    const rewardHealthBtn = document.getElementById('rewardHealthBtn');
    const rewardAttackBtn = document.getElementById('rewardAttackBtn');
    const restartGameBtn = document.getElementById('restartGameBtn');

    attributeInputs.forEach(input => {
        input.addEventListener('input', updatePoints);
    });

    assignAttributesBtn.addEventListener('click', assignAttributes);
    rewardHealthBtn.addEventListener('click', () => chooseReward('health'));
    rewardAttackBtn.addEventListener('click', () => chooseReward('attack'));
    restartGameBtn.addEventListener('click', restartGame);

    function updatePoints() {
        let totalUsed = Array.from(attributeInputs).reduce((acc, input) => {
            let value = parseInt(input.value) || 0;
            return acc + (value < 0 ? 0 : value);
        }, 0);
        pointsLeft = MAX_POINTS - totalUsed;
        pointsLeftLabel.textContent = `點數剩餘: ${pointsLeft}`;

        if (pointsLeft < 0) {
            alert("點數分配超過了總點數，請重新分配！");
            attributeInputs.forEach(input => input.value = 0);
            updatePoints();
        }
    }

    function assignAttributes() {
        if (pointsLeft !== 0) {
            alert("點數必須剛好分配完，共30點。");
            return;
        }

        ['health', 'mana', 'attack'].forEach(attr => {
            player[attr] = Math.max(0, parseInt(document.getElementById(attr).value) || 0);
        });

        togglePanels('attributePanel', 'battlePanel');
        prepareBattle();
    }

    function prepareBattle() {
		const numMonsters = Math.floor(Math.random() * 3) + 1;
		monsters = [];
		let pointsPerMonster = Math.floor(roundPoints / numMonsters);

		for (let i = 0; i < numMonsters; i++) {
			let health = Math.floor(Math.random() * (pointsPerMonster + 1));
			let mana = Math.floor(Math.random() * (pointsPerMonster - health + 1));
			let attack = pointsPerMonster - health - mana;
			monsters.push({ health, mana, attack });
		}

		pointsLeft = roundPoints;
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
			player.health += 2;
		} else if (type === 'attack') {
			player.attack += 2;
		} else if (type === 'mana') {
			player.mana += 2;
		}
		document.getElementById('rewardPanel').classList.add('hidden');
		//roundPoints += 5;
		currentLevel++;
		prepareBattle();
	}

    function restartGame() {
		Object.assign(player, { health: 10, mana: 10, attack: 10 });
		roundPoints = MAX_POINTS;
		pointsLeft = roundPoints;
		currentLevel = 1;
		totalAttacks = 0;
		totalDamageDealt = 0;
		totalDamageTaken = 0;
		totalMonstersKilled = 0;
		attributeInputs.forEach(input => input.value = '0');
		updatePoints();
		togglePanels('summaryPanel', 'attributePanel');
		updateBattleDisplay();
	}

    function updateLevelAndMonsterInfo() {
        document.getElementById('currentLevelInfo').textContent = currentLevel;
        document.getElementById('totalMonsterAttributes').textContent = monsters.reduce((sum, m) => sum + m.health + m.mana + m.attack, 0);
    }

    function updateBattleDisplay() {
        updatePlayerDisplay();
        updateMonsterDisplay();
    }

    function updatePlayerDisplay() {
        let playerStats = document.getElementById('playerStats');
        if (playerStats) {
            playerStats.innerHTML = `<h3>玩家状态</h3>
                                     <p>血量: ${player.health}</p>
                                     <p>魔力: ${player.mana}</p>
                                     <p>攻击: ${player.attack}</p>`;
            const attackBtn = document.createElement('button');
            attackBtn.classList.add('btn', 'btn-danger', 'mt-3');
            attackBtn.textContent = '攻击';
            attackBtn.addEventListener('click', enableAttackMode);
            playerStats.appendChild(attackBtn);
        }
    }

    function enableAttackMode() {
        if (monsters.length === 0) {
            document.getElementById('battleLog').innerHTML = '<p>没有怪物可以攻击！</p>';
            return;
        }
        attackMode = true;
        document.getElementById('battleLog').innerHTML = '<p>请选择一个怪物来攻击。</p>';
        monsters.forEach((_, index) => {
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
            monsters.forEach((monster, index) => {
                let card = document.createElement('div');
                card.className = 'monster-card';
                card.innerHTML = `<div class="monster-header h3">怪物 ${index + 1}</div>
                                  <div class="monster-stats">
                                      <p>血量: ${monster.health}</p>
                                      <p>魔力: ${monster.mana}</p>
                                      <p>攻击: ${monster.attack}</p>
                                  </div>`;
                card.addEventListener('click', () => attackMonster(index));
                monsterArea.appendChild(card);
            });
        }
    }

    function attackMonster(index) {
        if (!attackMode || monsters.length === 0) return;

        const target = monsters[index];
        const damage = Math.min(target.health, player.attack);
        target.health -= damage;
        totalDamageDealt += damage;
        totalAttacks++;

        let attackLog = document.getElementById('battleLog');
        attackLog.innerHTML = `<p>你攻擊了怪物 ${index + 1} 造成了 ${damage} 點傷害。</p>`;
        if (target.health <= 0) {
            attackLog.innerHTML += `<p>怪物 ${index + 1} 已被擊敗！</p>`;
            monsters.splice(index, 1);
            totalMonstersKilled++;
        }

        updateMonsterDisplay();
        if (monsters.length === 0) {
            gameOver(true);
        } else {
            monstersAttack();
        }
        attackMode = false;
    }

    function monstersAttack() {
        let attackLog = document.getElementById('battleLog');
        attackLog.innerHTML = "";

        monsters.forEach(monster => {
            const damage = Math.min(player.health, monster.attack);
            player.health -= damage;
            totalDamageTaken += damage;
            attackLog.innerHTML += `<p>怪物攻击你，造成了 ${damage} 点伤害。</p>`;
        });

        updatePlayerDisplay();
        if (player.health <= 0) {
            gameOver(false);
        }
    }

	function gameOver(victory) {
		if (victory) {
			roundPoints += 5;
			currentLevel++;
			prepareBattle();
		}
		togglePanels('battlePanel', victory ? 'rewardPanel' : 'summaryPanel');
		displaySummary(victory);
	}

    function displaySummary() {
		document.getElementById('totalLevels').textContent = currentLevel;
		document.getElementById('totalMonstersKilled').textContent = totalMonstersKilled;
		document.getElementById('totalAttacks').textContent = totalAttacks;
		document.getElementById('totalDamageDealt').textContent = totalDamageDealt;
		document.getElementById('totalDamageTaken').textContent = totalDamageTaken;
	}
});