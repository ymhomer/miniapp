document.addEventListener("DOMContentLoaded", function() {
    const teamRed = document.getElementById('teamRed');
    const teamBlue = document.getElementById('teamBlue');
    const redD = document.getElementById('red-1');
    const blueD = document.getElementById('blue-1');
    const newGameBtn = document.getElementById('newGameBtn');
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    const confirmEndGame = document.getElementById('confirmEndGame');
    const cancelEndGame = document.getElementById('cancelEndGame');
    const scoreRed = document.getElementById('scoreRed');
    const scoreBlue = document.getElementById('scoreBlue');
    const singleRoundScoreSlt = document.getElementById('singleRoundScoreSlt');
    const singleRoundScoreCustom = document.getElementById('singleRoundScoreCustom');
    var singleRoundScore = singleRoundScoreSlt.value;
    var maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);

    teamRed.addEventListener('click', function() {
        let currentScore = parseInt(scoreRed.textContent, 10);
        scoreRed.textContent = currentScore + 1;
        checkScore('red');
    });

    teamBlue.addEventListener('click', function() {
        let currentScore = parseInt(scoreBlue.textContent, 10);
        scoreBlue.textContent = currentScore + 1;
        checkScore('blue');
    });

    redD.addEventListener('click', function() {
        let currentScore = parseInt(scoreRed.textContent, 10);
        scoreRed.textContent = currentScore - 1;
    });

    blueD.addEventListener('click', function() {
        let currentScore = parseInt(scoreBlue.textContent, 10);
        scoreBlue.textContent = currentScore - 1;
    });

    singleRoundScoreSlt.addEventListener('change', function() {
        singleRoundScore = singleRoundScoreSlt.value;
        if (singleRoundScore === '0') {
            document.getElementById('singleRoundScoreCustomForm').style.display = 'block';
        } else {
            document.getElementById('singleRoundScoreCustomForm').style.display = 'none';
        }
    });

    newGameBtn.addEventListener('click', function() {
        scoreRed.textContent = '0';
        scoreBlue.textContent = '0';
    });

    function checkScore(team) {
        if (parseInt(scoreRed.textContent, 10) >= maxScore || parseInt(scoreBlue.textContent, 10) >= maxScore) {
            confirmModal.show();
        }
    }

    confirmEndGame.addEventListener('click', function() {
        // 根据之前的逻辑确定哪个队伍胜利
        if (parseInt(scoreRed.textContent, 10) >= maxScore) {
            document.getElementById('winningTeamName').textContent = "Red Team";
        } else if (parseInt(scoreBlue.textContent, 10) >= maxScore) {
            document.getElementById('winningTeamName').textContent = "Blue Team";
        }

        var victoryModal = new bootstrap.Modal(document.getElementById('victoryModal'));
        victoryModal.show();

        confirmModal.hide();
    });

    cancelEndGame.addEventListener('click', function() {
        if (parseInt(scoreRed.textContent, 10) >= maxScore) {
            scoreRed.textContent = parseInt(scoreRed.textContent,10)-1;
        } else if (parseInt(scoreBlue.textContent, 10) >= maxScore) {
            scoreBlue.textContent = parseInt(scoreBlue.textContent,10)-1;
        }

        confirmModall.hide();
    });
});