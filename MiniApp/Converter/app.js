let currentStatus = 'N/A';

document.addEventListener('DOMContentLoaded', function() {
    
    let inputElement = document.getElementById('ta_text');
    let formulaInput = document.getElementById('simplifiedConcatFomular');
    //let status = checkTextareaStatus();

    document.getElementById("addQuote").addEventListener('click', convert);
    document.getElementById("removeQuote").addEventListener('click', revert);

    document.getElementById('seqToolsButton').addEventListener('click', processSeqTools);

    document.getElementById("copyText").addEventListener('click', async () => {
        let textareaContent = document.getElementById("ta_text").value;
        let tableContent = document.getElementById("txtTable").value;
        let conditionContent = document.getElementById("txtCondition").value;
        let contentToCopy = "";

        if (!isNullStatus()) return;

        if (document.getElementById("selectCheck").checked) {
            //if default --> not convert
            if (status == 'default'){
                convert();
                textareaContent = document.getElementById("ta_text").value;
            }
            contentToCopy = "SELECT * FROM " + tableContent + ' WHERE ' + conditionContent + ' IN ' + textareaContent + ";";

            if (status == 'select_statement'){
                contentToCopy = textareaContent;
            }
        }
        else {
            contentToCopy = textareaContent;
        }

        try {
            await navigator.clipboard.writeText(contentToCopy);

            // Message
            document.getElementById("toast").querySelector('.toast-body').textContent = "Copied! " + contentToCopy;
            var toastEl = new bootstrap.Toast(document.getElementById('toast'));
            toastEl.show();
        } catch (err) {
            //console.error('Failed to copy text: ', err);
            alert('An error occurred while copying the text. Please try again. ' + err);
        }
    });

    document.getElementById('simplified-concat-tab').addEventListener('click', function() {
        if (status === 'converted') {
            revert();
        }
    });

    document.getElementById('ta_text').addEventListener('paste', function(event) {
        updateStatus();
        updateStatistics(document.getElementById("ta_text").value);
    });

    document.getElementById('ta_text').addEventListener('input', function(event) {
        updateStatus();
        updateStatistics(document.getElementById("ta_text").value);
    });

    //Change to Simplified Concatenation event
    document.getElementById('simplified-concat-tab').addEventListener('click', function() {
        if (currentStatus === 'converted') {
            revert();
        }

        if (currentStatus !== 'converted') {
            updateStatistics(document.getElementById("ta_text").value);
        }
    });

    document.getElementById('seq-tools-tab').addEventListener('click', function() {
        if (currentStatus === 'converted') {
            revert();
        }

        if (currentStatus !== 'converted') {
            updateStatistics(document.getElementById("ta_text").value);
        }
    });
    /*
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', function(event) {
            if (event.target.id === 'seq-tools-tab') {
                checkSeqToolsInput();
            }
        });
    });*/

    function processItems(items) {
        // remove duplicate --> IF
        if (document.getElementById("removeDuplicateCheck").checked) {
            items = [...new Set(items)];
        }

        // Sort --> IF
        if (document.getElementById("sortCheck").checked) {
            let sortType = document.getElementById("sortType").value;
            items.sort();
            if (sortType === "descending") {
                items.reverse();
            }
        }

        // Uppercase --> IF
        if (document.getElementById("uppercaseCheck").checked) {
            items = items.map(item => item.toUpperCase());
        }

        return items;
    }

    function convert() {
        let textareaContent = document.getElementById("ta_text").value;
        if (!isNullStatus()) return;
        if (currentStatus === 'default') {
            let items = textareaContent.split("\n").filter(item => item.trim() !== "");
            items = processItems(items);

            let result = "('" + items.join("', '") + "')";
            document.getElementById("ta_text").value = result;

            updateStatus();
            updateStatistics(textareaContent);
        } else {
            alert('Status: ' + currentStatus + '. Please confirm before converting.');
        }
    }

    function revert() {
        let textareaContent = document.getElementById("ta_text").value;
        if (!isNullStatus()) return;
        if (currentStatus === 'converted') {
            // split value
            let items = textareaContent.slice(2, -2).split(/',\s?'/);

            // update statis before process item
            updateStatistics(items.join("\n"));

            // to process (remove duplicate, sort, uppercase)
            items = processItems(items);

            // revert to item list (default)
            let result = items.join("\n");
            document.getElementById("ta_text").value = result;

            updateStatus();
        } else {
            alert('Status: ' + currentStatus + '. Please confirm before reverting.');
        }
    }

    function updateStatus() {
        let textareaContent = document.getElementById("ta_text").value.trim();
        let regexSelect = /^SELECT \* FROM\s+/i;

        if (!textareaContent) {
            currentStatus = "N/A";
        } else if (regexSelect.test(textareaContent)) {
            currentStatus = "select_statement";
        } else if (textareaContent.startsWith("('") && textareaContent.endsWith("')")) {
            currentStatus = "converted";
        } else {
            currentStatus = "default";
        }
        
        document.getElementById('statusText').innerText = 'Status: ' + currentStatus;

        // 根据当前状态更新按钮状态
        let convertButton = document.getElementById("addQuote");
        let revertButton = document.getElementById("removeQuote");

        switch (currentStatus) {
            case "N/A":
                convertButton.disabled = true;
                revertButton.disabled = true;
                break;
            case "default":
                convertButton.disabled = false;
                revertButton.disabled = true;
                break;
            case "converted":
                convertButton.disabled = true;
                revertButton.disabled = false;
                break;
            default:
                convertButton.disabled = false;
                revertButton.disabled = false;
        }
    }


    function updateStatistics(text) {
        // Calculate logic
        let lines = text.split("\n").filter(line => line.trim() !== "");
        let units = new Set();
        let unitFrequency = {};
        let repeatedUnits = 0;
        let totalRepeats = 0;

        lines.forEach(line => {
            let unit = line.trim();
            if (unit) {
                units.add(unit);

                if (unitFrequency[unit]) {
                    unitFrequency[unit]++;
                    totalRepeats++;
                    if (unitFrequency[unit] === 2) {
                        repeatedUnits++;
                    }
                } else {
                    unitFrequency[unit] = 1;
                }
            }
        });

        let unitCount = units.size;
        let lineCount = lines.length;

        document.getElementById('lineCount').textContent = `Line: ${lineCount}`;
        document.getElementById('repeatedUnit').textContent = `Repeated unit: ${repeatedUnits} / ${totalRepeats}`;
        document.getElementById('unitCount').textContent = `Unit Count: ${unitCount}`;
    }

    document.getElementById('ta_text').addEventListener('input', function() {
        updateStatus();
        if (currentStatus === 'converted') {
            let items = this.value.slice(2, -2).split(/',\s?'/);
            updateStatistics(items.join("\n"));
        } else {
            updateStatistics(this.value);
        }
    });

    function isNullStatus() {
        if (currentStatus === 'N/A') {
            alert('The text area is empty or contains only white spaces. Please enter some text.');
            return false;
        }
        return true;
    }

    document.getElementById('toSimplifiedConcat').addEventListener('click', simplifiedConcat);

    function simplifiedConcat() {
        let textLines = inputElement.value.split('\n');
        let formula = formulaInput.value;
        let result = textLines.map(line => formula.replace('%', line)).join('\n');

        if (!formula.includes('%')) {
            alert('The formula must contain a "%" character to indicate where to insert text.');
            return;
        }

        document.getElementById('simplifiedConcatResult').value = result;

        document.getElementById('simplifiedConcatResult').style.display = 'block';
        document.getElementById('copySimplifiedResult').style.display = 'block';
    }

    document.getElementById('copySimplifiedResult').addEventListener('click', async function() {
        let resultContent = document.getElementById('simplifiedConcatResult').value;
        if (!resultContent) {
            alert('The result area is empty. There is nothing to copy.');
            return;
        }
        try {
            await navigator.clipboard.writeText(resultContent);
            
            showToast('Content copied to clipboard!');
        } catch (err) {
            alert('An error occurred while copying the text. Please try again. ' + err);
        }
    });

    document.getElementById('includeNumbersCheck').checked = true;
    /*
    function checkSeqToolsInput() {
        let lines = inputElement.value.trim().split('\n').filter(line => line);
        if (lines.length !== 1 && lines.length > 0) {
            let userChoice = prompt("Input must contain exactly one line. Do you want to keep the first line, the last line, or re-enter the input?\nType 'first', 'last', or 're-enter'.");
            if (userChoice === 'first') {
                inputElement.value = lines[0];
            } else if (userChoice === 'last') {
                inputElement.value = lines[lines.length - 1];
            } else if (userChoice === 're-enter') {
                inputElement.value = '';
                inputElement.focus();
            } else {
                // Return to the previous tab
                document.querySelector('.nav-link.active').click();
            }
        }
    }*/
    
    document.getElementById('seqToolsMode').addEventListener('change', function() {
        let mode = this.value;
        document.getElementById('mode2Options').style.display = mode === 'mode2' ? 'block' : 'none';
    });

    document.getElementById('hexModeCheck').addEventListener('change', function() {
        let includeNumbersCheck = document.getElementById('includeNumbersCheck');
        if (this.checked) {
            includeNumbersCheck.checked = true;
            includeNumbersCheck.disabled = true;
        } else {
            includeNumbersCheck.disabled = false;
        }
    });

    function processSeqTools() {
        let input = inputElement.value.trim();
        
        let lines = input.split('\n').filter(line => line);
        if (lines.length > 1) {
            input = lines[0];
        }
        
        console.log('Input:', input);
        
        let isUpperCase = /^[A-Z0-9]*$/.test(input);
        let isLowerCase = /^[a-z0-9]*$/.test(input);
    
        console.log('isUpperCase:', isUpperCase);
        console.log('isLowerCase:', isLowerCase);
        
        let mode = document.getElementById('seqToolsMode').value;
        let generateCount = parseInt(document.getElementById('generateCount').value);
        let results = [];
        let totalGenerated = 0;
    
        console.log('Mode:', mode);
        console.log('Generate Count:', generateCount);
    
        if (mode === 'mode1') {
            let prefixMatch = input.match(/^[^\d]+/);
            let suffixMatch = input.match(/\d+$/);
    
            if (!suffixMatch) {
                alert('Error: Last part of the input must be a number for Mode 1.');
                return;
            }
    
            let prefix = prefixMatch ? prefixMatch[0] : '';
            let suffix = suffixMatch[0];
            console.log('Prefix:', prefix);
            console.log('Suffix:', suffix);
    
            for (let i = 0; i < generateCount; i++) {
                let newSuffix = (parseInt(suffix) + i).toString();
                if (newSuffix.length > suffix.length) {
                    alert(`Generated ${totalGenerated} items. Sequence limit reached.`);
                    break;
                }
                let newItem = prefix + newSuffix;
                results.push(newItem);
                totalGenerated++;
            }
        } else if (mode === 'mode2') {
            let hexMode = document.getElementById('hexModeCheck').checked;
            let includeNumbers = document.getElementById('includeNumbersCheck').checked;
            let alphaPosition = document.getElementById('alphaPosition').value;
    
            console.log('Hex Mode:', hexMode);
            console.log('Include Numbers:', includeNumbers);
            console.log('Alpha Position:', alphaPosition);
    
            for (let i = 0; i < generateCount; i++) {
                let newItem = incrementValue(input, i, hexMode, includeNumbers, alphaPosition, isUpperCase, isLowerCase);
                results.push(newItem);
            }
        }
    
        console.log('Results:', results);
        inputElement.value = results.join('\n');
    }     

    function incrementValue(value, increment, hexMode, includeNumbers, alphaPosition, isUpperCase, isLowerCase) {
        let characters = value.split('');
        let carry = increment;
        let base = hexMode ? 16 : (includeNumbers ? 36 : 26);
        let charSet = hexMode ? '0123456789abcdef' : (includeNumbers ? '0123456789abcdefghijklmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz');

        if (!hexMode){
            if (alphaPosition === 'prefix') {
                charSet = includeNumbers ? 'abcdefghijklmnopqrstuvwxyz0123456789' : 'abcdefghijklmnopqrstuvwxyz';
            } else {
                charSet = includeNumbers ? '0123456789abcdefghijklmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
            }
        }

        if (isUpperCase) {
            characters = characters.map(char => char.toUpperCase());
            charSet = charSet.toUpperCase();
        } else if (!isUpperCase && !isLowerCase) {
            characters = characters.map(char => char.toUpperCase());
            charSet = charSet.toUpperCase();
        }

        console.log('charSet:', charSet);
        for (let i = characters.length - 1; i >= 0; i--) {
            let char = characters[i];
            let index = charSet.indexOf(char);
            if (index !== -1) {
                let newIndex = (index + carry) % base;
                carry = Math.floor((index + carry) / base);
                characters[i] = charSet[newIndex];
            } else if (carry > 0) {
                carry = 0; // Stop carry if it's not a recognized character
            }
        }

        if (carry > 0) {
            let prefix = new Array(carry + 1).join(charSet[0]);
            if (alphaPosition === 'prefix') {
                characters.unshift(prefix);
            } else {
                characters.push(prefix);
            }
        }

        return characters.join('');
    }

    document.getElementById('copySeqToolsResult').addEventListener('click', async function() {
        let resultContent = inputElement.value;
        if (!resultContent) {
            alert('The result area is empty. There is nothing to copy.');
            return;
        }
        try {
            await navigator.clipboard.writeText(resultContent);
            showToast('Content copied to clipboard!');
        } catch (err) {
            alert('An error occurred while copying the text. Please try again. ' + err);
        }
    });

    function showToast(message) {
        let toastBody = document.querySelector('.toast .toast-body');
        if (toastBody) {
            toastBody.textContent = message;
            let toastEl = new bootstrap.Toast(document.querySelector('.toast'));
            toastEl.show();
        }
    }

    function showToast(message) {
        let toastBody = document.querySelector('.toast .toast-body');
        if (toastBody) {
            toastBody.textContent = message;
            let toastEl = new bootstrap.Toast(document.querySelector('.toast'));
            toastEl.show();
        }
    }
});