// Generate a random target number
let target = '';
while (target.length < 4) {
	let num = Math.floor(Math.random() * 10);
	if (!target.includes(num.toString())) {
		target += num.toString();
	}
}

// Save all the guess records
let guessHistory = [];
    function guess() {
	document.getElementById('new-game').style.display = 'block';
        let input = document.getElementById('input').value.trim();
        if (!/^[0-9]{4}$/.test(input)) {
            alert('Please enter four numbers!');
            return;
        }
	   
	if (new Set(input).size !== 4) {
        alert('Please enter four non-repeating numbers!');
        return;
    }
	
        let a = 0;
        let b = 0;
        for (let i = 0; i < 4; i++) {
            let digit = input[i];
            if (target[i] === digit) {
                a++;
            } else if (target.includes(digit)) {
                b++;
            }
        }
        let result = '';
        if (a === 4) {
            result = 'Congratulations! You win!';
            document.getElementById('new-game').style.display = 'inline-block';
        } else {
            result = `${a}A${b}B`;
        }
        // Add the guess and the result to the guessHistory array
        guessHistory.push([input, result]);
        // Update the guess history table on the page
        let tbody = document.getElementById('history');
        let tr = document.createElement('tr');
        let td1 = document.createElement('td');
        td1.textContent = input;
        td1.className = 'guess';
        tr.appendChild(td1);
        let td2 = document.createElement('td');
        td2.textContent = result;
        td2.className = 'result';
        tr.appendChild(td2);
        tbody.appendChild(tr);
	
        // Display the guess history table
        if (guessHistory.length === 1) {
            document.getElementById('history').style.display = 'table';
        }
	
        // Display guess count
        let guessCount = guessHistory.length;
        let guessCountMsg = `Guess count: ${guessCount}`;
        if (guessCount > 1) {
            guessCountMsg += ', your guesses:';
            for (let i = 0; i < guessCount; i++) {
                guessCountMsg += ` ${guessHistory[i][0]}(${guessHistory[i][1]})`;
                if (i < guessCount - 1) {
                    guessCountMsg += ',';
                }
            }
        }
        document.getElementById('guess-count').textContent = guessCountMsg;
        
	// Clear the input box
        document.getElementById('input').value = '';
        document.getElementById('input').focus();
    }

    function newGame() {
        // Reset the target number
        target = '';
        while (target.length < 4) {
            let num = Math.floor(Math.random() * 10);
            if (!target.includes(num.toString())) {
                target += num.toString();
            }
        }
        
	// Clear the guess history records
        guessHistory = [];
        let tbody = document.getElementById('history');
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
	
    // Hide the "New Game" button
    document.getElementById('new-game').style.display = 'none';
        
	// Clear the guess count message
        document.getElementById('guess-count').textContent = '';
        
	// Display the input box and the "Guess" button
        document.getElementById('input').style.display = 'inline-block';
        document.getElementById('guess-btn').style.display = 'inline-block';
        
	// Hide the guess history table
        document.getElementById('history').style.display = 'none';
        
	// Set focus to the input box
        document.getElementById('input').focus();
    }

    // Listen to the Enter key and call the guess function when pressed
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            guess();
        }
    });