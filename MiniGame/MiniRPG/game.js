let points = 30;
let player = { health: 0, mana: 0, attack: 0 };
let monsters = [];
const pointsLeftLabel = document.getElementById("pointsLeft");
const attributeInputs = document.querySelectorAll("#attributePanel input");

attributeInputs.forEach(input => {
    input.addEventListener('input', function() {
        updatePoints();
    });
});

function updatePoints() {
    let totalUsed = 0;
    attributeInputs.forEach(input => {
        let value = parseInt(input.value);
        if (value < 0) {
            input.value = 0;
            value = 0;
        }
        totalUsed += value;
    });
    pointsLeftLabel.textContent = `點數剩餘: ${30 - totalUsed}`;

    // 如果点数使用超过了总点数，警告用户并调整数值
    if (totalUsed > 30) {
        alert("點數分配超過了總點數，請重新分配！");
        attributeInputs.forEach(input => {
            input.value = 0;
        });
        pointsLeftLabel.textContent = "點數剩餘: 30";
    }
}

function assignAttributes() {
    const totalAssigned = Array.from(attributeInputs).reduce((sum, input) => {
        let value = parseInt(input.value || 0);
        return value < 0 ? sum : sum + value;
    }, 0);

    // 检查点数是否正确分配
    if (totalAssigned !== 30) {
        alert("點數必須剛好分配完，共30點。");
        return;
    }

    // 更新玩家属性
    player.health = Math.max(0, parseInt(document.getElementById('health').value));
    player.mana = Math.max(0, parseInt(document.getElementById('mana').value));
    player.attack = Math.max(0, parseInt(document.getElementById('attack').value));

    // 隐藏属性分配面板，显示战斗面板
    document.getElementById('attributePanel').classList.add('hidden');
    document.getElementById('battlePanel').classList.remove('hidden');

    // 准备战斗数据
    prepareBattle();
}

function prepareBattle() {
    const numMonsters = Math.floor(Math.random() * 3) + 1;  // 怪物数量，1到3
    monsters = [];  // 清空怪物数组
    const totalPoints = 30;
    let pointsPerMonster = Math.floor(totalPoints / numMonsters);

    for (let i = 0; i < numMonsters; i++) {
        let health = Math.floor(Math.random() * (pointsPerMonster + 1));  // 为生命值随机分配点数
        let mana = Math.floor(Math.random() * (pointsPerMonster - health + 1));  // 为魔力随机分配剩余点数
        let attack = pointsPerMonster - health - mana;  // 剩余的点数分配给攻击力

        monsters.push({ health, mana, attack });
    }
    document.getElementById('battlePanel').classList.remove('hidden');
    updateBattleDisplay();
}

let attackMode = false;  // 初始狀態下不在攻擊模式

function enableAttackMode() {
    if (monsters.length === 0) {
        document.getElementById('battleLog').innerHTML = '<p>沒有怪物可以攻擊！</p>';
        return;
    }
    attackMode = true;  // 啟用攻擊模式
    document.getElementById('battleLog').innerHTML = '<p>請選擇一個怪物來攻擊。</p>';
}

function updateBattleDisplay() {
    let playerStats = document.getElementById('playerStats');
    playerStats.innerHTML = `<h3>玩家狀態</h3>
                             <p>血量: ${player.health}</p>
                             <p>魔力: ${player.mana}</p>
                             <p>攻擊: ${player.attack}</p>`;

    let monsterStats = document.getElementById('monsterStats');
    monsterStats.innerHTML = '<h3>怪物狀態</h3>';
    monsters.forEach((monster, index) => {
        monsterStats.innerHTML += `<div id="monster${index}" style="margin-top: 10px; cursor: pointer;" onclick="attackMonster(${index})">
                                   <strong>怪物 ${index + 1}</strong>
                                   <p>血量: ${monster.health}</p>
                                   <p>魔力: ${monster.mana}</p>
                                   <p>攻擊: ${monster.attack}</p>
                                   </div>`;
    });
}

function playerAttack() {
    if (monsters.length === 0) {
        document.getElementById('battleLog').innerHTML = '<p>所有怪物已被擊敗！</p>';
        return;
    }

    let targetIndex = Math.floor(Math.random() * monsters.length);
    let target = monsters[targetIndex];
    target.health -= player.attack;

    let attackLog = document.getElementById('battleLog');
    attackLog.innerHTML = `<p>你攻擊了怪物 ${targetIndex + 1} 造成了 ${player.attack} 點傷害。</p>`;
    if (target.health <= 0) {
        attackLog.innerHTML += `<p>怪物 ${targetIndex + 1} 已被擊敗！</p>`;
        monsters.splice(targetIndex, 1);
    }

    if (monsters.length > 0) {
        monstersAttack();
    } else {
        attackLog.innerHTML += '<p>所有怪物已被擊敗！遊戲勝利！</p>';
    }

    updateBattleDisplay();  // 更新界面以顯示最新的玩家和怪物狀態
}

function monstersAttack() {
    let attackLog = document.getElementById('battleLog');
    monsters.forEach((monster, index) => {
        player.health -= monster.attack;
        attackLog.innerHTML += `<p>怪物 ${index + 1} 攻擊你，造成了 ${monster.attack} 點傷害。</p>`;
    });

    if (player.health <= 0) {
        attackLog.innerHTML += '<p>你已被擊敗！遊戲結束！</p>';
    } else {
        updateBattleDisplay();  // 更新玩家狀態
    }
}

function attackMonster(index) {
    if (!attackMode) return;  // 如果不在攻擊模式，不進行任何操作

    let target = monsters[index];
    target.health -= player.attack;
    let attackLog = document.getElementById('battleLog');
    attackLog.innerHTML = `<p>你攻擊了怪物 ${index + 1} 造成了 ${player.attack} 點傷害。</p>`;
    if (target.health <= 0) {
        attackLog.innerHTML += `<p>怪物 ${index + 1} 已被擊敗！</p>`;
        monsters.splice(index, 1);
    }

    attackMode = false;  // 攻擊後退出攻擊模式
    updateBattleDisplay();

    if (monsters.length > 0) {
        monstersAttack();
    } else {
        attackLog.innerHTML += '<p>所有怪物已被擊敗！遊戲勝利！</p>';
    }
}