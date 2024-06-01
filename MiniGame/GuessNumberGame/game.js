let target;
let guessHistory = [];

function initializeGame() {
    // Generate a random target number
    target = '';
    while (target.length < 4) {
        let num = Math.floor(Math.random() * 10).toString();
        if (!target.includes(num)) {
            target += num;
        }
    }
    console.log('Target:', target);    

    // Clear guess history and UI elements
    guessHistory = [];
    document.getElementById('guess-count').textContent = '';
    document.getElementById('table-container').style.display = 'none';
    document.getElementById('table-container').innerHTML = '';
    document.getElementById('new-game').style.display = 'none';
    document.getElementById('input').value = '';
    document.getElementById('input').focus();
}

function guess() {
    let input = document.getElementById('input').value.trim();
    console.log('Input:', input);
    if (!/^[0-9]{4}$/.test(input) || new Set(input).size !== 4) {
        alert('Please enter four non-repeating numbers!');
        return;
    }

    let a = 0;
    let b = 0;
    for (let i = 0; i < target.length; i++) {
        if (target[i] === input[i]) {
            a++;
        } else if (target.includes(input[i])) {
            b++;
        }
    }

    guessHistory.push({ guess: input, result: `${a}A${b}B` });
    displayGuessHistory();

    document.getElementById('input').value = '';
    document.getElementById('input').focus();

    if (a === 4) {
        alert('Congratulations! You win!');
        document.getElementById('new-game').style.display = 'block';
    }
}

function displayGuessHistory() {
    let tableContainer = document.getElementById('table-container');

    if (guessHistory.length === 1) {
        // Generate the table on the first guess
        let table = document.createElement('table');
        table.className = 'table table-bordered';
        table.innerHTML = `
            <thead class="thead-dark">
                <tr>
                    <th scope="col">Guess</th>
                    <th scope="col">Result</th>
                </tr>
            </thead>
            <tbody id="history">
                <!-- History will go here -->
            </tbody>
        `;
        tableContainer.appendChild(table);
        tableContainer.style.display = 'block';
    }

    // Add the new guess to the history table
    let historyBody = document.getElementById('history');
    let newRow = historyBody.insertRow();
    let guessCell = newRow.insertCell(0);
    guessCell.textContent = guessHistory[guessHistory.length - 1].guess;
    let resultCell = newRow.insertCell(1);
    resultCell.textContent = guessHistory[guessHistory.length - 1].result;

    // Update the guess count text
    document.getElementById('guess-count').textContent = `Guess count: ${guessHistory.length}`;
}

function newGame() {
    initializeGame();
}

document.addEventListener('DOMContentLoaded', (event) => {
    initializeGame();
    document.getElementById('guess-btn').addEventListener('click', guess);
    document.getElementById('new-game').addEventListener('click', newGame);

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            guess();
        }
    });
});