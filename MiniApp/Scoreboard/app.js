document.addEventListener("DOMContentLoaded", function() {
    const teamRed = document.getElementById('teamRed');
    const teamBlue = document.getElementById('teamBlue');
    const redD = document.getElementById('red-1');
    const blueD = document.getElementById('blue-1');
    const newGameBtn = document.getElementById('newGameBtn');
    const useExtendedRuleChk = document.getElementById('useExtendedRuleChk');
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    const victoryModal = new bootstrap.Modal(document.getElementById('victoryModal'));
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
    let maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);

    //UI
    newGameBtn.addEventListener('click', resetScores);

    //Setting
    singleRoundScoreSlt.addEventListener('change', function() {
        singleRoundScore = singleRoundScoreSlt.value;
        if (singleRoundScore === '0') {
            document.getElementById('singleRoundScoreCustomForm').style.display = 'block';
        } else {
            document.getElementById('singleRoundScoreCustomForm').style.display = 'none';
        }
    });

    //Add point
    teamRed.addEventListener('click', function() {
        redScore += 1;
        redScoreElem.textContent = redScore;
        checkScore('red');
    });

    teamBlue.addEventListener('click', function() {
        blueScore += 1;
        blueScoreElem.textContent = blueScore;
        checkScore('blue');
    });

    //Deduct point
    redD.addEventListener('click', function() {
        redScore -= 1;
        redScore = checkNegative(redScore, redScoreElem);
        redScoreElem.textContent = redScore;
    });

    blueD.addEventListener('click', function() {
        blueScore -= 1;
        blueScore = checkNegative(blueScore, blueScoreElem);
        blueScoreElem.textContent = blueScore;
    });

    confirmEndGame.addEventListener('click', function() {
        if (redScore >= maxScore) {
            document.getElementById('winningTeamName').textContent = "Red Team";
        } else if (blueScore >= maxScore) {
            document.getElementById('winningTeamName').textContent = "Blue Team";
        }

        victoryModal.show();
        confirmModal.hide();
        //Will update score to history then resetScore
        resetScores();
    });

    cancelEndGame.addEventListener('click', function() {
        if (redScore >= maxScore) {
            redScore-=1;
            redScoreElem.textContent = redScore;
        } else if (blueScore >= maxScore) {
            blueScore-=1;
            blueScoreElem.textContent = blueScore;
        }

        confirmModal.hide();
    });

    function checkNegative(score, scoreElem) {
    if (score < 0) {
            score = 0;
            scoreElem.textContent = '0';
        }
        return score; // 返回修正后的分数
    }

    function checkScore(team) {
        maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);

        if (useExtendedRuleChk.checked) {
            if (redScore >= (maxScore-1) && blueScore>= (maxScore-1)) {
                if (Math.abs(redScore - blueScore) >= 2) {
                    confirmModal.show();
                }
            } else if (redScore >= maxScore || blueScore >= maxScore) {
                confirmModal.show();
            }
        } else {
            if (redScore >= maxScore || blueScore >= maxScore) {
                confirmModal.show();
            }
        }
    }

    function resetScores() {
        redScoreElem.textContent = '0';
        blueScoreElem.textContent = '0';
        redScore = parseInt(redScoreElem.textContent, 10);
        blueScore = parseInt(blueScoreElem.textContent, 10);
    }
});