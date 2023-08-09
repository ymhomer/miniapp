document.getElementById("scoreRed").addEventListener('click', function() {
    let currentScore = parseInt(this.textContent, 10);
    this.textContent = currentScore + 1;
});

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', function() {
    if (!this.classList.contains('disabled')) {
      document.getElementById('dropdownMenuButton').textContent = this.textContent;
    }
  });
});