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
    const landscapeChk = document.getElementById('landscapeChk');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
    const fullscreenChk = document.getElementById('fullscreenChk');
    const enterFullscreenBtn = document.getElementById('enterFullscreenBtn');
    const settingsToast = new bootstrap.Toast(document.getElementById('settingsToast'));
    const settingsToastBody = document.getElementById('settingsToastBody');
    let singleRoundScore = singleRoundScoreSlt.value;
    let wakeLock = null;
    //Score
    let redScore = parseInt(redScoreElem.textContent, 10);
    let blueScore = parseInt(blueScoreElem.textContent, 10);
    //let scoreAtEndGame = { redScore: 0, blueScore: 0 };
    let maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);
    let winningTeam = null;

    let gameHistory = [];

    let modalClosedByButton = false;

    /*Modal setting
    var modals = document.querySelectorAll('.modal');
    
    modals.forEach(function(modalElement) {
        var modalInstance = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: false
        });
    });*/

    //UI
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

    fullscreenChk.addEventListener('change', function() {
        if (fullscreenChk.checked) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) { // Firefox
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari and Opera
                document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
                document.documentElement.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { // Firefox
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { // IE/Edge
                document.msExitFullscreen();
            }
        }
    });

    landscapeChk.addEventListener('change', function() {
        if (landscapeChk.checked) {
            if (window.screen.orientation && window.screen.orientation.lock) {
                document.documentElement.requestFullscreen().then(() => {
                    screen.orientation.lock('landscape-primary').catch(function(error) {
                        console.error('Orientation lock failed:', error);
                        landscapeChk.checked = false;
                        showToast(`Failed to enable landscape mode.<br>Error: ${error.message}`);
                    });
                }).catch(function(error) {
                    console.error('Fullscreen request failed:', error);
                    showToast(`Failed to enter fullscreen mode.<br>Error: ${error.message}`);
                });
            } else {
                showToast("Screen orientation lock is not supported in this browser.<br>Please try a different browser.");
                landscapeChk.checked = false;
            }
        } else {
            if (window.screen.orientation && window.screen.orientation.unlock) {
                window.screen.orientation.unlock();
            }
        }
    });

    keepScreenOnChk.addEventListener('change', function() {
        if (keepScreenOnChk.checked) {
            if ('wakeLock' in navigator) {
                try {
                    wakeLock = await navigator.wakeLock.request('screen');
                    wakeLock.addEventListener('release', () => {
                        console.log('Screen Wake Lock was released');
                    });
                    console.log('Screen Wake Lock is active');
                } catch (error) {
                    console.error('Screen Wake Lock failed:', error);
                    keepScreenOnChk.checked = false;
                    showToast(`Failed to keep screen on.<br>Error: ${error.message}`);
                }
            } else {
                showToast("Screen Wake Lock API is not supported in this browser.<br>Please try a different browser.");
                keepScreenOnChk.checked = false;
            }
        } else {
            if (wakeLock !== null) {
                wakeLock.release().then(() => {
                    wakeLock = null;
                    console.log('Screen Wake Lock was released');
                });
            }
        }
    });

    document.addEventListener('fullscreenchange', function() {
        if (document.fullscreenElement) {
            exitFullscreenBtn.style.display = 'block';
        } else {
            exitFullscreenBtn.style.display = 'none';
            fullscreenChk.checked = false;
            enterFullscreenBtn.style.display = 'block'; // Show the button to re-enter fullscreen
        }
    });


    document.addEventListener('fullscreenchange', function() {
        if (document.fullscreenElement) {
            exitFullscreenBtn.style.display = 'block';
        } else {
            exitFullscreenBtn.style.display = 'none';
            fullscreenChk.checked = false;
            enterFullscreenBtn.style.display = 'block'; // Show the button to re-enter fullscreen
        }
    });

    exitFullscreenBtn.addEventListener('click', function() {
        if (document.fullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { // Firefox
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { // IE/Edge
                document.msExitFullscreen();
            }
        }
    });

    if (!document.fullscreenElement) {
        showToast("You can enable fullscreen mode in settings for a better experience.");
    }

    if (window.screen.orientation.type !== 'landscape-primary') {
        window.screen.orientation.lock('landscape-primary');
        landscapeChk.checked = true;
    }

    document.documentElement.requestFullscreen().then(() => {
        screen.orientation.lock('landscape-primary').catch(error => {
            console.error('Orientation lock failed:', error);
            showToast(`Failed to enable landscape mode.<br>Error: ${error.message}`);
        });
    }).catch(error => {
        console.error('Fullscreen request failed:', error);
        showToast(`Failed to enter fullscreen mode.<br>Error: ${error.message}`);
    });

    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Screen Wake Lock was released');
            });
            console.log('Screen Wake Lock is active');
        } catch (error) {
            console.error('Screen Wake Lock failed:', error);
            keepScreenOnChk.checked = false;
            showToast(`Failed to keep screen on.<br>Error: ${error.message}`);
        }
    } else {
        showToast("Screen Wake Lock API is not supported in this browser.<br>Please try a different browser.");
        keepScreenOnChk.checked = false;
    }

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

    /*
    //Add point
    teamRed.addEventListener('click', function() {
        redScore += 1;
        redScoreElem.textContent = redScore;
        //checkScore('red');
        checkScore();
    });

    teamBlue.addEventListener('click', function() {
        blueScore += 1;
        blueScoreElem.textContent = blueScore;
        //checkScore('blue');
        checkScore();
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
    */
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

    document.getElementById('confirmModal').addEventListener('hide.bs.modal', function (event) {
        if (!modalClosedByButton) {
            maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);
            redScore = decrementScoreIfExceedsMax(redScore, redScoreElem, maxScore);
            blueScore = decrementScoreIfExceedsMax(blueScore, blueScoreElem, maxScore);
            // event.preventDefault();
        }
        modalClosedByButton = false;
    });

    document.getElementById('confirmModalClose').addEventListener('click', function() {
        maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);
        redScore = decrementScoreIfExceedsMax(redScore, redScoreElem, maxScore);
        blueScore = decrementScoreIfExceedsMax(blueScore, blueScoreElem, maxScore);
        confirmModal.hide();
    });
    
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

    function showToast(message) {
        //settingsToastBody.textContent = message;
        settingsToastBody.innerHTML = message;
        settingsToast.show();
    }
});