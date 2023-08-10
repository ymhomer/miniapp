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
    newGameBtn.addEventListener('click', function() {
        redScoreElem.textContent = '0';
        blueScoreElem.textContent = '0';
    });

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
        //let currentScore = parseInt(scoreRed.textContent, 10);
        redScoreElem.textContent = redscore + 1;
        checkScore('red');
    });

    teamBlue.addEventListener('click', function() {
        //let currentScore = parseInt(scoreBlue.textContent, 10);
        blueScoreElem.textContent = bluescore + 1;
        checkScore('blue');
    });

    //Deduct point
    redD.addEventListener('click', function() {
        //let currentScore = parseInt(scoreRed.textContent, 10);
        redScoreElem.textContent = redscore - 1;
    });

    blueD.addEventListener('click', function() {
        //let currentScore = parseInt(scoreBlue.textContent, 10);
        blueScoreElem.textContent = bluescore - 1;
    });

    confirmEndGame.addEventListener('click', function() {
        if (redScore >= maxScore) {
            document.getElementById('winningTeamName').textContent = "Red Team";
        } else if (blueScore >= maxScore) {
            document.getElementById('winningTeamName').textContent = "Blue Team";
        }

        //var victoryModal = new bootstrap.Modal(document.getElementById('victoryModal'));
        victoryModal.show();

        confirmModal.hide();
    });

    cancelEndGame.addEventListener('click', function() {
        if (redscore >= maxScore) {
            redScoreElem.textContent = redscore-1;
        } else if (bluescore >= maxScore) {
            blueScoreElem.textContent = bluescore-1;
        }

        confirmModal.hide();
    });

    function checkScore(team) {
        /*
        if (parseInt(scoreRed.textContent, 10) >= maxScore || parseInt(scoreBlue.textContent, 10) >= maxScore) {
            confirmModal.show();//end game
        }*/

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
});