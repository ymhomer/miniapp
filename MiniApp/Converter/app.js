document.addEventListener('DOMContentLoaded', function() {
    let inputElement = document.getElementById('ta_text');
    let formulaInput = document.getElementById('simplifiedConcatFomular');
    let status = checkTextareaStatus();

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
    document.getElementById('ta_text').addEventListener('paste', function(event) {
        setTimeout(function() {
            
            status = checkTextareaStatus();
            document.getElementById('statusText').innerText = 'Status: '+ status;
            //console.log("Status after paste: " + status);
            //alert("Status after paste: " + status);
        }, 0);
    });

    document.getElementById('ta_text').addEventListener('keydown', function(event) {
        setTimeout(function() {
            status = checkTextareaStatus();
            document.getElementById('statusText').innerText = 'Status: '+ status;
        }, 1);
    });

    function convert() {
        // get textarea
        let textareaContent = document.getElementById("ta_text").value;

        if (!isNullStatus()) return;
        if (status == 'default'){
            // split content line by line
            let items = textareaContent.split("\n");

            // trim
            items = items.map(item => item.trim());

            // If Uppercase
            if (document.getElementById("uppercaseCheck").checked) {
                items = items.map(item => item.toUpperCase());
            }

            // convert
            let result = "('" + items.join("', '") + "')";

            // update the result to textarea
            document.getElementById("ta_text").value = result;
        }
        else{
            alert('Status: '+ status + '. Please confirm before convert.');
        }
        
        status = checkTextareaStatus();
        document.getElementById('statusText').innerText = 'Status: '+ status;

    }

    function revert() {
        // get textarea
        let textareaContent = document.getElementById("ta_text").value;

        if (!isNullStatus()) return;
        if (status == 'converted'){
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
        }
        else{
            alert('Status: '+ status + '. Please confirm before convert.');
        }

        status = checkTextareaStatus();
        document.getElementById('statusText').innerText = 'Status: '+ status;
    }

    function checkTextareaStatus() {
        let textareaContent = document.getElementById("ta_text").value.trim();
        let regexSelect = /^SELECT \* FROM\s+/i;

        // Check if textarea is empty or contains only whitespace
        if (!textareaContent) {
            return "N/A";
        }

        // Check select
        if (regexSelect.test(textareaContent)) {
            return "select_statement";
        }

        // Check quote
        else if (textareaContent.startsWith("('") && textareaContent.endsWith("')")) {
            return "converted";
        }
        // Else "Default"
        else {
            return "default";
        }
    }

    function isNullStatus() {
        if (status === 'N/A') {
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