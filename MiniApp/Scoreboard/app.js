document.addEventListener("DOMContentLoaded", function() {
    const teamRed = document.getElementById('teamRed');
    const teamBlue = document.getElementById('teamBlue');
    const redD = document.getElementById('red-1');
    const blueD = document.getElementById('blue-1');
    const scoreRed = document.getElementById('scoreRed');
    const scoreBlue = document.getElementById('scoreBlue');
    const singleRoundScoreSlt = document.getElementById('singleRoundScoreSlt');
    const singleRoundScoreCustom = document.getElementById('singleRoundScoreCustom');
    var singleRoundScore = singleRoundScoreSlt.value;

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

    document.getElementById('newGameBtn').addEventListener('click', function() {
        scoreRed.textContent = '0';
        scoreBlue.textContent = '0';
    });

    function checkScore(team) {
        let maxScore = singleRoundScore !== '0' ? parseInt(singleRoundScore, 10) : parseInt(singleRoundScoreCustom.value, 10);
        let currentScore = team === 'red' ? parseInt(scoreRed.textContent, 10) : parseInt(scoreBlue.textContent, 10);
        
        if (currentScore >= maxScore) {
            let isConfirmed = confirm('Are you sure about this score?');
            if (isConfirmed) {
                alert(`${team === 'red' ? 'Red' : 'Blue'} team wins!`);
                // TODO: Add the result to the history.
            } else {
                // Subtract the last added score.
                if (team === 'red') {
                    scoreRed.textContent = currentScore - 1;
                } else {
                    scoreBlue.textContent = currentScore - 1;
                }
            }
        }
    }
});