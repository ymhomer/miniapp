//Element
const teamRed = document.getElementById('teamRed');
const teamBlue = document.getElementById('teamBlue');
const redD = document.getElementById('red-1');
const blueD = document.getElementById('blue-1');
const newGameBtn = document.getElementById('newGameBtn');
const useExtendedRuleChk = document.getElementById('useExtendedRuleChk');
const confirmModalClose = document.getElementById('confirmModalClose');
const confirmEndGame = document.getElementById('confirmEndGame');
const cancelEndGame = document.getElementById('cancelEndGame');
const redScoreElem = document.getElementById('redScoreElem');
const blueScoreElem = document.getElementById('blueScoreElem');
const singleRoundScoreSlt = document.getElementById('singleRoundScoreSlt');
const singleRoundScoreCustom = document.getElementById('singleRoundScoreCustom');
let singleRoundScore = singleRoundScoreSlt.value;
//Score
let redScore = parseInt(redScoreElem.textContent, 10);
let blueScore = parseInt(blueScoreElem.textContent, 10);
//let scoreAtEndGame = { redScore: 0, blueScore: 0 };
let maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);
let winningTeam = null;

let gameHistory = [];

let modalClosedByButton = false;

// Function
function checkScore() {
    maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);

    if (redScore >= maxScore || blueScore >= maxScore) {
            //scoreAtEndGame.redScore = redScore;
            //scoreAtEndGame.blueScore = blueScore;

        if (useExtendedRuleChk.checked && Math.abs(redScore - blueScore) < 2) {
            return;
        }

        if (redScore > blueScore) {
            winningTeam = 'red';
        } else {
            winningTeam = 'blue';
        }

        confirmModal.show();
    }
}

function updateHistoryButton() {
    const historyBtn = document.getElementById('historyBtn');
    if (gameHistory.length > 0) {
        historyBtn.removeAttribute('disabled');
    } else {
        historyBtn.setAttribute('disabled', 'true');
    }
}

function addGameToHistory(winningTeam, score) {
    gameHistory.push({ team: winningTeam, score: score });
    updateHistoryButton();
}

function showHistory() {
    const historyTableBody = document.getElementById('historyTableBody');
    historyTableBody.innerHTML = ''; // Clear previous entries

    gameHistory.forEach(record => {
        const row = document.createElement('tr');
        if (record.team === 'Red Team') {
            row.classList.add('table-danger');
        } else {
            row.classList.add('table-primary');
        }

        const teamCell = document.createElement('td');
        teamCell.textContent = record.team;
        row.appendChild(teamCell);

        const scoreCell = document.createElement('td');
        scoreCell.textContent = record.score;
        row.appendChild(scoreCell);

        historyTableBody.appendChild(row);
    });
}    

function decrementScoreIfExceedsMax(score, scoreElem, maxScoreValue) {
    if (score >= maxScoreValue) {
        score -= 1;
        scoreElem.textContent = score;
    }
    return score;
}

function updateScore(scoreElem, amount, maxScoreValue) {
    let score = parseInt(scoreElem.textContent, 10);
    score += amount;
    score = Math.max(0, score);
    //score = Math.min(score, maxScoreValue);
    checkScore();
    scoreElem.textContent = score;
    return score;
}

function resetScores() {
    redScoreElem.textContent = '0';
    blueScoreElem.textContent = '0';
    redScore = parseInt(redScoreElem.textContent, 10);
    blueScore = parseInt(blueScoreElem.textContent, 10);
}

// Event Handler
function setUpEventHandlers() {
newGameBtn.addEventListener('click', resetScores);

    document.getElementById('historyBtn').addEventListener('click', showHistory);
    document.getElementById('ConfirmModalOKBtn').addEventListener('click', showHistory);

    //Setting
    singleRoundScoreSlt.addEventListener('change', function() {
        singleRoundScore = singleRoundScoreSlt.value;
        if (singleRoundScore === '0') {
            document.getElementById('singleRoundScoreCustomForm').style.display = 'block';
        } else {
            document.getElementById('singleRoundScoreCustomForm').style.display = 'none';
        }
    });

    //Update score
    teamRed.addEventListener('click', function() {
        redScore = updateScore(redScoreElem, 1, maxScore);
        checkScore();
    });

    redD.addEventListener('click', function() {
        redScore = updateScore(redScoreElem, -1, maxScore);
    });

    teamBlue.addEventListener('click', function() {
        blueScore = updateScore(blueScoreElem, 1, maxScore);
        checkScore();
    });

    blueD.addEventListener('click', function() {
        blueScore = updateScore(blueScoreElem, -1, maxScore);
    });

    confirmEndGame.addEventListener('click', function() {
        let winningTeam = "";
        let score = "";
        modalClosedByButton = true;

        if (redScore >= blueScore) {
            document.getElementById('winningTeamName').textContent = "Red Team";
        } else if (blueScore >= redScore) {
            document.getElementById('winningTeamName').textContent = "Blue Team";
        }
        winningTeam = document.getElementById('winningTeamName').textContent;
        score = redScore + "/" + blueScore;

        addGameToHistory(winningTeam, score);
        victoryModal.show();
        confirmModal.hide();
        //Will update score to history then resetScore
        resetScores();
    });

    cancelEndGame.addEventListener('click', function() {
        modalClosedByButton = true;
        maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);
        
        if(redScore>blueScore){
            redScore = decrementScoreIfExceedsMax(redScore, redScoreElem, maxScore);
        }
        else {
            blueScore = decrementScoreIfExceedsMax(blueScore, blueScoreElem, maxScore);
        }
        //redScore = scoreAtEndGame.redScore;
        //blueScore = scoreAtEndGame.blueScore;
        //redScoreElem.textContent = redScore;
        //blueScoreElem.textContent = blueScore;
        //maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);
        //redScore = decrementScoreIfExceedsMax(redScore, redScoreElem, maxScore);
        //blueScore = decrementScoreIfExceedsMax(blueScore, blueScoreElem, maxScore);
        confirmModal.hide();
    });

    confirmModal.addEventListener('hide.bs.modal', function (event) {
        if (!modalClosedByButton) {
            maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);
            redScore = decrementScoreIfExceedsMax(redScore, redScoreElem, maxScore);
            blueScore = decrementScoreIfExceedsMax(blueScore, blueScoreElem, maxScore);
            // event.preventDefault();
        }
        modalClosedByButton = false;
    });

    confirmModalClose.addEventListener('click', function() {
        maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);
        redScore = decrementScoreIfExceedsMax(redScore, redScoreElem, maxScore);
        blueScore = decrementScoreIfExceedsMax(blueScore, blueScoreElem, maxScore);
        confirmModal.hide();
    });
}

// Main
document.addEventListener("DOMContentLoaded", function() {
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    const victoryModal = new bootstrap.Modal(document.getElementById('victoryModal'));
    setUpEventHandlers();
});
