document.addEventListener("DOMContentLoaded", function() {
    var isLocal = (window.location.protocol === "file:");
    //var basePath = isLocal ? "../../" : "/miniapp/";
    var basePath = isLocal ? "../miniapp/" : "/miniapp/";

    function getResourcePath(filename) {
        return basePath + filename;
    }

    function loadScript(src) {
        var script = document.createElement('script');
        script.src = src;
        script.async = false; // 如果您希望脚本按顺序执行，请设置为false
        document.head.appendChild(script);
    }

    function loadStylesheet(href) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    // 定义要加载的JS和CSS文件
    var scripts = ["js/bootstrap.bundle.min.js", "js/app.js"];
    var stylesheets = ["css/bootstrap.min.css", "css/index.css"];

    // 加载JS文件
    scripts.forEach(function(script) {
        loadScript(getResourcePath(script));
    });

    // 加载CSS文件
    stylesheets.forEach(function(stylesheet) {
        loadStylesheet(getResourcePath(stylesheet));
    });
});