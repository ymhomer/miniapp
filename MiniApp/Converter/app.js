let currentStatus = 'N/A';

document.addEventListener('DOMContentLoaded', function() {
    
    let inputElement = document.getElementById('ta_text');
    let formulaInput = document.getElementById('simplifiedConcatFomular');
    //let status = checkTextareaStatus();

    document.getElementById("addQuote").addEventListener('click', convert);
    document.getElementById("removeQuote").addEventListener('click', revert);

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

    function showToast(message) {
        let toastBody = document.querySelector('.toast .toast-body');
        if (toastBody) {
            toastBody.textContent = message;
            let toastEl = new bootstrap.Toast(document.querySelector('.toast'));
            toastEl.show();
        }
    }
});