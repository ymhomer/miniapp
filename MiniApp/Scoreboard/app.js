document.addEventListener("DOMContentLoaded", function() {
    const teamRed = document.getElementById('teamRed');
    const teamBlue = document.getElementById('teamBlue');
    const scoreRed = document.getElementById('scoreRed');
    const scoreBlue = document.getElementById('scoreBlue');
    const singleRoundScoreSlt = document.getElementById('singleRoundScoreSlt');
    const singleRoundScoreCustom = document.getElementById('singleRoundScoreCustom');
    var singleRoundScore = singleRoundScoreSlt.value;

    document.getElementById('teamRed').addEventListener('click', function() {
        let currentScore = parseInt(scoreRed.textContent, 10);
        scoreRed.textContent = currentScore + 1;
    });

    document.getElementById('teamBlue').addEventListener('click', function() {
        let currentScore = parseInt(scoreBlue.textContent, 10);
        scoreBlue.textContent = currentScore + 1;
    });

    singleRoundScoreSlt.addEventListener('change', function() {
        singleRoundScore = singleRoundScoreSlt.value;
        if (singleRoundScore === '0') {
            customScoreInput.style.display = 'block';
        } else {
            customScoreInput.style.display = 'none';
        }
    });

});