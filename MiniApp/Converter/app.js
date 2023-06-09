document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("addQuote").addEventListener('click', convert);

    function convert() {
        // get textarea
        let textareaContent = document.getElementById("ta_text").value;

        // split content line by line
        let items = textareaContent.split("\n");

        // 去除每个元素的前后空格
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

    document.getElementById("removeQuote").addEventListener('click', revert);

    function revert() {
        // get textarea
        let textareaContent = document.getElementById("ta_text").value;

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

    document.getElementById("copyText").addEventListener('click', async () => {
        let textareaContent = document.getElementById("ta_text").value;
        let tableContent = document.getElementById("txtTable").value;
        let conditionContent = document.getElementById("txtCondition").value;

        let contentToCopy = "";

        if (document.getElementById("selectCheck").checked) {
            contentToCopy = "SELECT * FROM " + tableContent + ' WHERE ' + conditionContent + ' IN ' + textareaContent + ";";
        }
        else {
            contentToCopy = textareaContent;
        }

        try {
            await navigator.clipboard.writeText(contentToCopy);

            // Message
            document.getElementById("toast").value = "Copied! " + contentToCopy;
            var toastEl = new bootstrap.Toast(document.getElementById('toast'));
            toastEl.show();
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    });
});