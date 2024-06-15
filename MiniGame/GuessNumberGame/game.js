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
    resetKeypad();
    
    // Delay focus to trigger keypad correctly
    setTimeout(() => {
        document.querySelector('.number-input').focus();
    }, 100);
}

function guess() {
    let input = Array.from(document.querySelectorAll('.number-input')).map(input => input.value).join('');
    console.log('Input:', input);
    /*
	if (!/^[0-9]{4}$/.test(input) || new Set(input).size !== 4) {
        alert('Please enter four non-repeating numbers!');
        return;
    }*/

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

    resetKeypad();

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

function resetKeypad() {
    const numberInputs = document.querySelectorAll('.number-input');
    const keypadButtons = document.querySelectorAll('.keypad-btn');
    
    numberInputs.forEach((input) => {
        input.value = '';
    });
    keypadButtons.forEach((button) => {
        button.disabled = false;
    });
}

document.addEventListener('DOMContentLoaded', (event) => {
    initializeGame();
    document.getElementById('new-game').addEventListener('click', newGame);

    const numberInputs = document.querySelectorAll('.number-input');
    const keypadContainer = document.getElementById('keypadContainer');
    const keypadButtons = document.querySelectorAll('.keypad-btn');
    const cancelButton = document.getElementById('cancelBtn');
    const okButton = document.getElementById('okBtn');

    let dragIndex = null;

    numberInputs.forEach((input, index) => {
        input.addEventListener('focus', () => {
            keypadContainer.style.display = 'block';
        });

        input.addEventListener('dragstart', (event) => {
            dragIndex = index;
        });

        input.addEventListener('touchstart', (event) => {
            dragIndex = index;
        });

        input.addEventListener('dragover', (event) => {
            event.preventDefault();
        });

        input.addEventListener('touchmove', (event) => {
            event.preventDefault();
        });

        input.addEventListener('drop', (event) => {
            event.preventDefault();
            const dropIndex = index;
            swapInputValues(dragIndex, dropIndex);
        });

        input.addEventListener('touchend', (event) => {
            const dropIndex = index;
            swapInputValues(dragIndex, dropIndex);
        });
    });

    keypadButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const number = button.getAttribute('data-number');
            const emptyInput = Array.from(numberInputs).find((input) => input.value === '');

            if (emptyInput && !Array.from(numberInputs).some((input) => input.value === number)) {
                emptyInput.value = number;
                button.disabled = true;
            }

            if (Array.from(numberInputs).every((input) => input.value !== '')) {
                keypadButtons.forEach((btn) => {
                    if (btn !== cancelButton && btn !== okButton) {
                        btn.disabled = true;
                    }
                });
            }
        });
    });

    cancelButton.addEventListener('click', resetKeypad);
    okButton.addEventListener('click', guess);

    function swapInputValues(dragIndex, dropIndex) {
        if (dragIndex !== null && dragIndex !== dropIndex) {
            const dragValue = numberInputs[dragIndex].value;
            const dropValue = numberInputs[dropIndex].value;

            numberInputs[dragIndex].value = dropValue;
            numberInputs[dropIndex].value = dragValue;
        }
    }
});