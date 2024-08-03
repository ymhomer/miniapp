document.addEventListener('DOMContentLoaded', function () {
    const isGitHubPages = window.location.hostname.includes('github.io');

    const assets = {
        css: [
            isGitHubPages ? '/miniapp/css/bootstrap.min.css' : '../../css/bootstrap.min.css',
            isGitHubPages ? '/miniapp/MiniApp/HTMLEditorSuite/style.css' : '../../MiniApp/HTMLEditorSuite/style.css'
        ],
        js: [
            isGitHubPages ? '/miniapp/js/bootstrap.min.js' : '../../js/bootstrap.min.js',
            isGitHubPages ? '/miniapp/js/bootstrap.bundle.min.js' : '../../js/bootstrap.bundle.min.js',
            isGitHubPages ? '/miniapp/MiniApp/HTMLEditorSuite/app.js' : '../../MiniApp/HTMLEditorSuite/app.js'
        ]
    };

    assets.css.forEach(function (href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    });

    assets.js.forEach(function (src) {
        const script = document.createElement('script');
        script.src = src;
        document.body.appendChild(script);
    });
});
