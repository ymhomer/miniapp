document.addEventListener('DOMContentLoaded', function() {
    let fileNames = {
        html: "index.html",
        css: "style.css",
        js: "script.js"
    };
    let hasCssFile = false;
    let hasJsFile = false;
    let extractCssJs = document.getElementById('extract-css-js').checked;

    document.getElementById('import-files').addEventListener('change', handleFileSelect);
    document.querySelector('.btn.btn-primary').addEventListener('click', exportFiles);
    document.getElementById('extract-css-js').addEventListener('change', toggleExtractCssJs);

    document.getElementById('process-text').addEventListener('click', function() {
        const htmlContent = document.getElementById('html-code').value;
        const cssContent = document.getElementById('css-code').value;
        const jsContent = document.getElementById('js-code').value;

        const processedText = `
${fileNames.html}
------------
${htmlContent}

${fileNames.css}
------------
${cssContent}

${fileNames.js}
------------
${jsContent}
        `;
        document.getElementById('card-textarea').value = processedText;
    });

    window.clearText = function(textareaId) {
        document.getElementById(textareaId).value = '';
    };
    
    window.pasteText = function(textareaId) {
        navigator.clipboard.readText().then(text => {
            document.getElementById(textareaId).value = text;
        }).catch(err => {
            alert('Failed to paste text: ' + err);
        });
    };
    
    window.copyText = function(textareaId) {
        const textarea = document.getElementById(textareaId);
        textarea.select();
        document.execCommand('copy');
        alert('Text copied to clipboard!');
    };
    
    window.moveToTop = function(textareaId) {
        const textarea = document.getElementById(textareaId);
        textarea.scrollTop = 0;
    };    

    function toggleExtractCssJs(event) {
        extractCssJs = event.target.checked;
    }
    
    function handleFileSelect(event) {
        const files = event.target.files;
        hasCssFile = false;
        hasJsFile = false;

        for (let file of files) {
            const reader = new FileReader();
            reader.onload = (function(file) {
                return function(e) {
                    if (file.name.endsWith('.html')) {
                        const doc = new DOMParser().parseFromString(e.target.result, 'text/html');
                        if (extractCssJs) {
                            if (!hasJsFile) {
                                const jsContent = extractJs(doc);
                                document.getElementById('js-code').value = jsContent;
                            }
                            if (!hasCssFile) {
                                const cssContent = extractCss(doc);
                                document.getElementById('css-code').value = cssContent;
                            }
                        }
                        const htmlContent = extractHtml(doc, extractCssJs);
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

    function extractHtml(doc, removeJs) {
        if (removeJs) {
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => script.remove());
        }
        const htmlContent = doc.documentElement.outerHTML;
        return cleanContent(htmlContent);
    }

    function extractCss(doc) {
        if (hasCssFile || !extractCssJs) return '';
        const styles = [];
        for (const style of doc.querySelectorAll('style')) {
            styles.push(style.textContent);
            style.remove();
        }
        return cleanContent(styles.join('\n'));
    }
    
    function extractJs(doc) {
        if (hasJsFile || !extractCssJs) return '';
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