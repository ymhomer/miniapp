window.addEventListener("DOMContentLoaded", (event) => {
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
        okButton.addEventListener('click', checkNumberInputs);

        function swapInputValues(dragIndex, dropIndex) {
            if (dragIndex !== null && dragIndex !== dropIndex) {
                const dragValue = numberInputs[dragIndex].value;
                const dropValue = numberInputs[dropIndex].value;

                numberInputs[dragIndex].value = dropValue;
                numberInputs[dropIndex].value = dragValue;
            }
        }

        function resetKeypad() {
            numberInputs.forEach((input) => {
                input.value = '';
            });
            keypadButtons.forEach((button) => {
                button.disabled = false;
            });
        }

        function checkNumberInputs() {
            if (Array.from(numberInputs).every((input) => input.value !== '')) {
                const numbers = Array.from(numberInputs).map((input) => input.value).join('');
                alert(`Input : ${numbers}`);
            } else {
                alert('4 digits only');
            }
            resetKeypad();
        }
    });