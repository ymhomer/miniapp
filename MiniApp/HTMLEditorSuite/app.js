document.addEventListener('DOMContentLoaded', function() {
    let fileNames = {
        html: "index.html",
        css: "style.css",
        js: "script.js"
    };
    let hasCssFile = false;
    let hasJsFile = false;

    document.getElementById('import-files').addEventListener('change', handleFileSelect);
    document.querySelector('.btn.btn-primary').addEventListener('click', exportFiles);

    function handleFileSelect(event) {
        const files = event.target.files;
        hasCssFile = false;
        hasJsFile = false;
        const extractCss = document.getElementById('extract-css').checked;
        const extractJs = document.getElementById('extract-js').checked;

        for (let file of files) {
            const reader = new FileReader();
            reader.onload = (function(file) {
                return function(e) {
                    if (file.name.endsWith('.html')) {
                        const doc = new DOMParser().parseFromString(e.target.result, 'text/html');
                        if (extractJs && !hasJsFile) {
                            const jsContent = extractJsContent(doc);
                            document.getElementById('js-code').value = jsContent;
                        }
                        if (extractCss && !hasCssFile) {
                            const cssContent = extractCssContent(doc);
                            document.getElementById('css-code').value = cssContent;
                        }
                        const htmlContent = extractHtmlContent(doc);
                        document.getElementById('html-code').value = htmlContent;
                        fileNames.html = file.name;
                    } else if (file.name.endsWith('.css')) {
                        document.getElementById('css-code').value = e.target.result;
                        fileNames.css = file.name;
                        hasCssFile = true;
                    } else if (file.name.endsWith('.js')) {
                        document.getElementById('js-code').value = e.target.result;
                        fileNames.js = file.name;
                        hasJsFile = true;
                    }
                };
            })(file);
            reader.readAsText(file);
        }
    }

    function extractHtmlContent(doc) {
        const scripts = doc.querySelectorAll('script');
        if (!document.getElementById('extract-js').checked) {
            scripts.forEach(script => script.remove());
        }
        const htmlContent = doc.documentElement.outerHTML;
        return cleanContent(htmlContent);
    }

    function extractCssContent(doc) {
        if (hasCssFile || !document.getElementById('extract-css').checked) return '';
        const styles = [];
        for (const style of doc.querySelectorAll('style')) {
            styles.push(style.textContent);
            style.remove();
        }
        return cleanContent(styles.join('\n'));
    }

    function extractJsContent(doc) {
        if (hasJsFile || !document.getElementById('extract-js').checked) return '';
        const scripts = [];
        for (const script of doc.querySelectorAll('script')) {
            scripts.push(script.textContent);
            script.remove();
        }
        return cleanContent(scripts.join('\n'));
    }

    function extractHtml(doc) {
        const scripts = doc.querySelectorAll('script');
        if (!hasJsFile) {
            scripts.forEach(script => script.remove());
        }
        const htmlContent = doc.documentElement.outerHTML;
        return cleanContent(htmlContent);
    }

    function extractCss(doc) {
        if (hasCssFile) return '';
        const styles = [];
        for (const style of doc.querySelectorAll('style')) {
            styles.push(style.textContent);
            style.remove();
        }
        return cleanContent(styles.join('\n'));
    }

    function extractJs(doc) {
        if (hasJsFile) return '';
        const scripts = [];
        for (const script of doc.querySelectorAll('script')) {
            scripts.push(script.textContent);
            script.remove();
        }
        return cleanContent(scripts.join('\n'));
    }

    function cleanContent(content) {
        return content
            .split('\n')
            .map(line => line.trimEnd())
            .filter(line => line.trim().length > 0)
            .join('\n');
    }

    function updatePreview() {
        const htmlContent = document.getElementById('html-code').value;
        const cssContent = document.getElementById('css-code').value;
        const jsContent = document.getElementById('js-code').value;

        const fullHtml = combineHtml(htmlContent, cssContent, jsContent, false);
        const iframe = document.getElementById('preview');
        iframe.srcdoc = fullHtml;
    }

    function exportFiles() {
        const htmlContent = document.getElementById('html-code').value;
        const cssContent = document.getElementById('css-code').value;
        const jsContent = document.getElementById('js-code').value;

        const fullHtml = combineHtml(htmlContent, cssContent, jsContent, true);
        exportFile(fileNames.html, fullHtml);
        if (cssContent) exportFile(fileNames.css, cssContent);
        if (jsContent) exportFile(fileNames.js, jsContent);
    }

    function combineHtml(htmlContent, cssContent, jsContent, isExport) {
        let doc = new DOMParser().parseFromString(htmlContent, 'text/html');

        if (isExport) {
            if (cssContent) {
                let link = doc.createElement('link');
                link.rel = 'stylesheet';
                link.href = fileNames.css;
                doc.head.appendChild(link);
            }

            if (jsContent) {
                let script = doc.createElement('script');
                script.src = fileNames.js;
                doc.body.appendChild(script);
            }
        } else {
            if (cssContent) {
                let style = doc.createElement('style');
                style.textContent = cssContent;
                doc.head.appendChild(style);
            }

            if (jsContent) {
                let script = doc.createElement('script');
                script.textContent = jsContent;
                doc.body.appendChild(script);
            }
        }

        return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
    }

    function exportFile(fileName, content) {
        const a = document.createElement('a');
        const file = new Blob([content], { type: 'text/plain' });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    }

    document.getElementById('result-tab').addEventListener('shown.bs.tab', updatePreview);
});