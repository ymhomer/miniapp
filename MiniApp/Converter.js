document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("addQuote").addEventListener('click', convert);

    function convert() {
        // 获取 textarea 的内容
        let textareaContent = document.getElementById("ta_text").value;

        // 用换行符将内容分割成数组
        let items = textareaContent.split("\n");

        // 去除每个元素的前后空格
        items = items.map(item => item.trim());

        // 将数组转换为字符串，并在每个元素之间添加逗号和空格
        let result = "('" + items.join("', '") + "')";

        // 将结果显示在原本的textarea
        document.getElementById("ta_text").value = result;
    }

    document.getElementById("removeQuote").addEventListener('click', revert);

    function revert() {
        // 获取 textarea 的内容
        let textareaContent = document.getElementById("ta_text").value;

        // 移除前后的括号和引号
        let removedBrackets = textareaContent.slice(2, -2);

        // 用逗号和空格将内容分割成数组
        let items = removedBrackets.split("', '");

        // 将数组转换为字符串，并在每个元素之间添加换行符
        let result = items.join("\n");

        // 将结果显示在原本的textarea
        document.getElementById("ta_text").value = result;
    }

    document.getElementById("copyText").addEventListener('click', copyContent);

    function copyContent() {
        // 获取 textarea
        let textarea = document.getElementById("ta_text");

        // 选择 textarea 的内容
        textarea.select();

        // 复制选中的内容
        document.execCommand("copy");

        // (可选) 提示用户复制成功
        //alert("Content copied to clipboard!");
        var toastEl = new bootstrap.Toast(document.getElementById('toast'));
        toastEl.show();
    }
});