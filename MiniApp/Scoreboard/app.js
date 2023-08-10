document.addEventListener("DOMContentLoaded", function() {
    const teamRed = document.getElementById('teamRed');
    const teamBlue = document.getElementById('teamBlue');
    const redD = document.getElementById('red-1');
    const blueD = document.getElementById('blue-1');
    const newGameBtn = document.getElementById('newGameBtn');
    const useExtendedRuleChk = document.getElementById('useExtendedRuleChk');
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

    confirmEndGame.addEventListener('click', function() {
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

        confirmModal.hide();
    });

    function checkScore(team) {
        /*
        if (parseInt(scoreRed.textContent, 10) >= maxScore || parseInt(scoreBlue.textContent, 10) >= maxScore) {
            confirmModal.show();//end game
        }*/

        if (useExtendedRuleChk.checked) {
            if (parseInt(scoreRed.textContent, 10) >= (maxScore-1) && parseInt(scoreBlue.textContent, 10) >= (maxScore-1)) {
                if (Math.abs(parseInt(scoreRed.textContent, 10) - parseInt(scoreBlue.textContent, 10)) >= 2) {
                    // 一方领先2分，可以结束比赛
                    //endGame(redScore > blueScore ? 'Red' : 'Blue');
                    confirmModal.show();
                }
            } else if (parseInt(scoreRed.textContent, 10) >= maxScore || parseInt(scoreBlue.textContent, 10) >= maxScore) {
                // 没有达到20:20，但一方达到了最大分数
                //endGame(redScore > blueScore ? 'Red' : 'Blue');
                confirmModal.show();
            }
        } else {
            // 不使用延长赛规则
            if (parseInt(scoreRed.textContent, 10) >= maxScore || parseInt(scoreBlue.textContent, 10) >= maxScore) {
                //endGame(redScore > blueScore ? 'Red' : 'Blue');
                confirmModal.show();
            }
        }
    }
});