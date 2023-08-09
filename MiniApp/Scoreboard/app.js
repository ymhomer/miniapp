document.getElementById('scoreRed').addEventListener('click', function() {
    let currentScore = parseInt(this.textContent, 10);
    this.textContent = currentScore + 1;
});