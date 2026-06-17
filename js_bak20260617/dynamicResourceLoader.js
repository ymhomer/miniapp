var isLocal = (window.location.protocol === "file:");
    var basePath = isLocal ? "../miniapp/" : "/miniapp/";

    function getResourcePath(filename) {
        return basePath + filename;
    }

    function loadScript(src) {
        var script = document.createElement('script');
        script.src = src;
        script.defer = true; // Ensure the script is executed after the DOM is parsed
        document.head.appendChild(script);
    }

    function loadStylesheet(href) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    // Define the JS and CSS files to load
    var scripts = ["js/bootstrap.bundle.min.js", "js/app.js"];
    var stylesheets = ["css/bootstrap.min.css", "css/index.css"];

    // Load JS files
    scripts.forEach(function(script) {
        loadScript(getResourcePath(script));
    });

    // Load CSS files
    stylesheets.forEach(function(stylesheet) {
        loadStylesheet(getResourcePath(stylesheet));
    });