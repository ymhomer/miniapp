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

    //Pendding feature - get textarea status
    /*
    document.getElementById('ta_text').addEventListener('paste', function(event) {
        setTimeout(function() {
            
            //status = checkTextareaStatus();
            document.getElementById('statusText').innerText = 'Status: '+ currentStatus;
            //console.log("Status after paste: " + status);
            //alert("Status after paste: " + status);
        }, 0);
    });

    document.getElementById('ta_text').addEventListener('keydown', function(event) {
        setTimeout(function() {
            //status = checkTextareaStatus();
            //document.getElementById("ta_text").value = result;
            document.getElementById('statusText').innerText = 'Status: '+ currentStatus;
            //updateStatistics(result);
        }, 1);
    });*/

    document.getElementById('ta_text').addEventListener('paste', function(event) {
        updateStatus();
        updateStatistics(document.getElementById("ta_text").value);
    });

    document.getElementById('ta_text').addEventListener('input', function(event) {
        updateStatus();
        updateStatistics(document.getElementById("ta_text").value);
    });

/*
    function convert() {
        let textareaContent = document.getElementById("ta_text").value;

        if (!isNullStatus()) return;
        if (currentStatus === 'default'){
            // Split content line by line and filter out empty lines
            let lines = textareaContent.split("\n").filter(item => item.trim() !== "");
            let processedLines = [];

            // Process each line and build the array of processed lines
            lines.forEach(line => {
                // Trim and, if checked, convert to uppercase
                let processedLine = document.getElementById("uppercaseCheck").checked ? line.trim().toUpperCase() : line.trim();
                processedLines.push(processedLine);
            });

            // Now we have an array of processed lines, we can join them
            let result = "('" + processedLines.join("', '") + "')";

            // Update the textarea and status
            document.getElementById("ta_text").value = result;
            updateStatus();
            
            // Pass the processedLines array to updateStatistics for accurate count
            updateStatistics(processedLines.join('\n')); // Use '\n' to simulate the actual text in textarea
        }
        else {
            alert('Status: ' + currentStatus + '. Please confirm before converting.');
        }
    }*/

    function convert() {
        let textareaContent = document.getElementById("ta_text").value;
        if (!isNullStatus()) return;
        if (currentStatus === 'default') {
            let items = textareaContent.split("\n").filter(item => item.trim() !== "");
            if (document.getElementById("removeDuplicateCheck").checked) {
                items = [...new Set(items)];
            }

            // 应用 Uppercase 选项
            if (document.getElementById("uppercaseCheck").checked) {
                items = items.map(item => item.toUpperCase());
            }

            let result = "('" + items.join("', '") + "')";
            document.getElementById("ta_text").value = result;

            updateStatus();
            updateStatistics(textareaContent);
        } else {
            alert('Status: ' + currentStatus + '. Please confirm before converting.');
        }
    }

    function revert() {
        // get textarea
        let textareaContent = document.getElementById("ta_text").value;

        if (!isNullStatus()) return;
        if (currentStatus == 'converted'){
            // remove Brackets
            let removedBrackets = textareaContent.slice(2, -2);

            // split value
            let items = removedBrackets.split("', '");

            // If Uppercase
            if (document.getElementById("uppercaseCheck").checked) {
                items = items.map(item => item.toUpperCase());
            }

            // convert
            let result = items.join("\n");

            // update the result to textarea
            document.getElementById("ta_text").value = result;
            updateStatus();
            updateStatistics(result);
        }
        else{
            alert('Status: '+ currentStatus + '. Please confirm before convert.');
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
        
        document.getElementById('statusText').innerText = 'Status: '+ currentStatus;
    }

    function updateStatistics(text) {
        let units = new Set();
        let unitFrequency = {};
        let lines = text.split("\n");
        let lineCount = lines.length;
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

        document.getElementById('lineCount').textContent = `Line: ${lineCount}`;
        document.getElementById('repeatedUnit').textContent = `Repeated unit: ${repeatedUnits} / ${totalRepeats}`;
        document.getElementById('unitCount').textContent = `Unit Count: ${unitCount}`;
    }

    document.getElementById('ta_text').addEventListener('input', updateStatus);

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