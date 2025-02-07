let currentStatus = 'N/A';
let history = [];

// Prefix/Postfix settings
let prefixPostfixEnabled = false;
let prefixValue = '';
let postfixValue = '';
// This remove duplicate is for the "Input Box Option" logic
let inputBoxOptionRemoveDuplicate = false;

// beep function for error notifications
function beepError() {
    if (typeof AudioContext !== 'undefined') {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = 440;
        oscillator.connect(ctx.destination);
        oscillator.start();
        setTimeout(function() {
            oscillator.stop();
            ctx.close();
        }, 200);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    let inputElement = document.getElementById('ta_text');
    let formulaInput = document.getElementById('simplifiedConcatFomular');

    updateStatus();

    document.getElementById('addQuote').addEventListener('click', () => {
        handleWithHistory('Add Quote', convert, 'quote');
    });

    document.getElementById('removeQuote').addEventListener('click', () => {
        handleWithHistory('Remove Quote', revert, 'quote');
    });

    document.getElementById('seqToolsButton').addEventListener('click', () => {
        processSeqTools('seqTools');
    });

    document.getElementById('copyButton').addEventListener('click', async () => {
        const textArea = document.getElementById('ta_text');
        const contentToCopy = textArea.value.trim();

        if (!contentToCopy) {
            showToast('The textarea is empty. Nothing to copy.');
            return;
        }

        try {
            await navigator.clipboard.writeText(contentToCopy);
            showToast('Content copied to clipboard!');
        } catch (err) {
            showToast('An error occurred while copying the text.');
        }
    });

    // Hide "Input box Option" button if status is converted
    function toggleInputBoxButton() {
      let inputBoxOptionButton = document.getElementById('inputBoxOptionButton');
      if (currentStatus === 'converted') {
        inputBoxOptionButton.style.display = 'none';
      } else {
        inputBoxOptionButton.style.display = '';
      }
    }

    // Setup the InputBoxOption Modal save logic
    const enableCheck = document.getElementById('enablePrefixPostfixCheck');
    const prefixInput = document.getElementById('prefixInput');
    const postfixInput = document.getElementById('postfixInput');
    const removeDupCheckInputBox = document.getElementById('inputBoxOptionRemoveDuplicateCheck');
    const inputBoxOptionSaveBtn = document.getElementById('inputBoxOptionSave');

    const inputBoxOptionModal = document.getElementById('inputBoxOptionModal');
    inputBoxOptionModal.addEventListener('show.bs.modal', () => {
      // load current settings
      enableCheck.checked = prefixPostfixEnabled;
      prefixInput.value = prefixValue;
      postfixInput.value = postfixValue;
      removeDupCheckInputBox.checked = inputBoxOptionRemoveDuplicate;
    });

    inputBoxOptionSaveBtn.addEventListener('click', () => {
      prefixPostfixEnabled = enableCheck.checked;
      prefixValue = prefixInput.value || '';
      postfixValue = postfixInput.value || '';
      inputBoxOptionRemoveDuplicate = removeDupCheckInputBox.checked;

      // Just show a toast describing the new setting
      let msg = `Prefix/Postfix: ${prefixPostfixEnabled ? 'Enabled' : 'Disabled'}, RemoveDup: ${inputBoxOptionRemoveDuplicate ? 'Yes' : 'No'}`;
      showToast(msg);

      // close modal
      let modalInstance = bootstrap.Modal.getInstance(inputBoxOptionModal);
      if (modalInstance) {
        modalInstance.hide();
      }
    });

    // Monitor text area: each time user enters a new line + ENTER, handle input box logic
    inputElement.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            setTimeout(() => {
                validateInputBoxOptions();
            }, 0);
        }
    });

    // This function always runs on enter
    function validateInputBoxOptions() {
        let original = inputElement.value;
        let lines = original.split('\n');
        let changed = false;
        let newLines = [];
        let seen = new Set();

        lines.forEach(line => {
            let trimmed = line.trim();
            if (!trimmed) {
                // pass empty line
                newLines.push(line);
                return;
            }

            // remove-duplicate always applies if user checked
            if (inputBoxOptionRemoveDuplicate) {
              if (seen.has(line)) {
                beepError();
                showToast(`Removed duplicate line: ${line}`);
                addHistory(line, '', 'Remove line (Duplicate)', 'prefixPostfix');
                changed = true;
                return; // skip pushing this line
              } else {
                seen.add(line);
              }
            }

            // if prefix/postfix is enabled, then check prefix/postfix
            if (prefixPostfixEnabled) {
                let hasPrefix = true;
                let hasPostfix = true;
                if (prefixValue && !trimmed.startsWith(prefixValue)) {
                    hasPrefix = false;
                }
                if (postfixValue && !trimmed.endsWith(postfixValue)) {
                    hasPostfix = false;
                }

                if (!hasPrefix || !hasPostfix) {
                    // remove line
                    beepError();
                    showToast(`Removed line for not matching Prefix/Postfix: ${line}`);
                    addHistory(line, '', 'Remove line (Prefix/Postfix)', 'prefixPostfix');
                    changed = true;
                    return;
                }
            }

            newLines.push(line);
        });

        if (changed) {
            inputElement.value = newLines.join('\n');
        }
        // re-check status & line count after changes
        updateStatus();
        updateStatistics(inputElement.value);
    }

    // Filter changes in the history modal
    const filterQuote = document.getElementById('filterQuote');
    const filterPrefixPostfix = document.getElementById('filterPrefixPostfix');
    const filterSimplifiedConcat = document.getElementById('filterSimplifiedConcat');
    const filterSeqTools = document.getElementById('filterSeqTools');

    filterQuote.addEventListener('change', updateHistoryVisibility);
    filterPrefixPostfix.addEventListener('change', updateHistoryVisibility);
    filterSimplifiedConcat.addEventListener('change', updateHistoryVisibility);
    filterSeqTools.addEventListener('change', updateHistoryVisibility);

    function updateHistoryVisibility() {
        const rows = document.querySelectorAll('#historyTable tr');
        rows.forEach(row => {
            let cat = row.getAttribute('data-category');
            if (!cat) {
                row.style.display = '';
                return;
            }
            let show = true;
            if (cat === 'quote' && !filterQuote.checked) {
                show = false;
            } else if (cat === 'prefixPostfix' && !filterPrefixPostfix.checked) {
                show = false;
            } else if (cat === 'simplifiedConcat' && !filterSimplifiedConcat.checked) {
                show = false;
            } else if (cat === 'seqTools' && !filterSeqTools.checked) {
                show = false;
            }
            row.style.display = show ? '' : 'none';
        });
    }

    document.getElementById('simplified-concat-tab').addEventListener('click', function() {
        if (currentStatus === 'converted') {
            revert();
        }
        if (currentStatus !== 'converted') {
            updateStatistics(document.getElementById("ta_text").value);
        }
        toggleTabVisibility('simplified-concat');
    });

    document.getElementById('seq-tools-tab').addEventListener('click', function() {
        if (currentStatus === 'converted') {
            revert();
        }
        if (currentStatus !== 'converted') {
            updateStatistics(document.getElementById("ta_text").value);
        }
        toggleTabVisibility('seq-tools');
    });

    document.getElementById('ta_text').addEventListener('paste', function(event) {
        updateStatus();
        updateStatistics(document.getElementById("ta_text").value);
    });

    document.getElementById('ta_text').addEventListener('input', function(event) {
        updateStatus();
        updateStatistics(document.getElementById("ta_text").value);
    });

    function toggleTabVisibility(tabName) {
        const elements = document.querySelectorAll('.toggle-element');
        elements.forEach(element => {
          const tabs = element.getAttribute('data-tabs').split(',');
          if (tabs.includes(tabName)) {
            element.style.display = 'block';
          } else {
            element.style.display = 'none';
          }
        });
    }

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
            let items = textareaContent.slice(2, -2).split(/',\s?'/);
            updateStatistics(items.join("\n"));
            items = processItems(items);
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
        // After status is determined, toggle the InputBox button accordingly
        toggleInputBoxButton();
    }

    function updateStatistics(text) {
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

    document.getElementById('toSimplifiedConcat').addEventListener('click', function(){
        simplifiedConcat('simplifiedConcat');
    });

    function simplifiedConcat(category) {
        const before = inputElement.value;
        let textLines = before.split('\n');
        let formula = formulaInput.value;

        if (!formula.includes('%')) {
            alert('The formula must contain a "%" character to indicate where to insert text.');
            return;
        }

        let result = textLines.map(line => formula.replace('%', line)).join('\n');
        document.getElementById('simplifiedConcatResult').value = result;
        document.getElementById('simplifiedConcatResult').style.display = 'block';

        addHistory(before, result, 'Simplified Concatenation', category);
    }

    document.getElementById('includeNumbersCheck').checked = true;

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

    function processSeqTools(category) {
        const before = document.getElementById('ta_text').value.trim();
        let input = before;
        let lines = input.split('\n').filter(line => line);
        if (lines.length > 1) {
            input = lines[0];
        }
        let mode = document.getElementById('seqToolsMode').value;
        let generateCount = parseInt(document.getElementById('generateCount').value);
        let results = [];
        let totalGenerated = 0;

        if (mode === 'mode1') {
            let prefixMatch = input.match(/^(.*?)(\d+)$/);
            if (!prefixMatch) {
                alert('Error: Input must end with a number for Mode 1.');
                return;
            }
            let prefix = prefixMatch[1];
            let suffix = prefixMatch[2];
            for (let i = 0; i < generateCount; i++) {
                let newSuffix = (parseInt(suffix) + i).toString();
                if (newSuffix.length > suffix.length) {
                    alert(`Generated ${totalGenerated} items. Sequence limit reached.`);
                    break;
                }
                let newItem = prefix + newSuffix.padStart(suffix.length, '0');
                results.push(newItem);
                totalGenerated++;
            }
        } else if (mode === 'mode2') {
            let hexMode = document.getElementById('hexModeCheck').checked;
            let includeNumbers = document.getElementById('includeNumbersCheck').checked;
            let alphaPosition = document.getElementById('alphaPosition').value;
            for (let i = 0; i < generateCount; i++) {
                let newItem = incrementValue(input, i, hexMode, includeNumbers, alphaPosition);
                results.push(newItem);
            }
        }
        const after = results.join('\n');
        document.getElementById('ta_text').value = after;
        addHistory(before, after, 'Seq Tools', category);
    }

    function incrementValue(value, increment, hexMode, includeNumbers, alphaPosition) {
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
        let isUpperCase = /^[A-Z0-9]*$/.test(value);
        let isLowerCase = /^[a-z0-9]*$/.test(value);
        if (isUpperCase) {
          characters = characters.map(char => char.toUpperCase());
          charSet = charSet.toUpperCase();
        } else if (!isUpperCase && !isLowerCase) {
          characters = characters.map(char => char.toUpperCase());
          charSet = charSet.toUpperCase();
        }
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

    function showToast(message) {
        const headerToast = document.getElementById('headerToast');
        headerToast.textContent = message;
        headerToast.style.display = 'block';
        setTimeout(() => {
            headerToast.style.display = 'none';
        }, 3000);
    }

    function addHistory(before, after, action, category) {
        history.unshift({ before, after, action, category });
        updateHistoryTable();
    }

    function processConversion(actionName, transformFunction) {
        const textArea = document.getElementById('ta_text');
        const before = textArea.value;
        const after = transformFunction(before);
        textArea.value = after;
        addHistory(before, after, actionName);
    }

    function updateHistoryTable() {
        const historyTable = document.getElementById('historyTable');
        historyTable.innerHTML = '';
        history.forEach((record, index) => {
            const row = document.createElement('tr');
            row.setAttribute('data-category', record.category || '');
            row.innerHTML = `
                <td>
                    <textarea class="form-control" rows="2" readonly>${record.before}</textarea>
                    <button class="btn btn-outline-secondary mt-1 btn-sm copy-btn">Copy</button>
                </td>
                <td>
                    <textarea class="form-control" rows="2" readonly>${record.after}</textarea>
                    <button class="btn btn-outline-secondary mt-1 btn-sm copy-btn">Copy</button>
                </td>
                <td>${record.action}</td>
            `;
            historyTable.appendChild(row);
            const buttons = row.querySelectorAll('.copy-btn');
            buttons[0].addEventListener('click', () => copyText(record.before));
            buttons[1].addEventListener('click', () => copyText(record.after));
        });
        updateHistoryVisibility();
    }

    function handleWithHistory(actionName, processFunction, category) {
        const textArea = document.getElementById('ta_text');
        const before = textArea.value;
        processFunction();
        const after = textArea.value;
        addHistory(before, after, actionName, category);
    }

    function copyText(text) {
        navigator.clipboard.writeText(text).then(() => {
            // optionally show toast
        }, () => {
            // error
        });
    }

});