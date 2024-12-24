window.onload = function() {
    addPrintStyles();
    var inputText = document.getElementById("inputText");
    var modeSelector = document.getElementById("modeSelector");

    inputText.focus();
    document.getElementById("resultPanel").style.display = "none";
    document.getElementById("printBtn").style.display = "none";

    inputText.addEventListener('input', function() {
        generateCode();
    });

    modeSelector.addEventListener('change', function() {
        generateCode();
    });
/*
    document.getElementById("inputText").addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            generateCode();
        }
    });*/
};

function generateCode() {
    var input = document.getElementById("inputText").value;

    if (input.trim() === '') {
        document.getElementById("results").innerHTML = '';
        document.getElementById("resultPanel").style.display = "none";
        document.getElementById("printBtn").style.display = "none";
    } else {
        var mode = document.getElementById("modeSelector").value;
        if (mode === 'barcode') {
            generateBarcodes();
        } else if (mode === 'qrcode') {
            generateQRCode();
        }
    }
}

function generateBarcodes() {
    var input = document.getElementById("inputText").value;
    var lines = input.split('\n');
    var container = document.getElementById("results");

    container.innerHTML = '';

    lines.forEach(function(line) {
        if (line.trim() !== '') {
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            container.appendChild(svg);
            JsBarcode(svg, line, {
                format: "CODE128",
                lineColor: "#000",
                width: 1,
                height: 25,
                displayValue: true
            });

            var br = document.createElement('br');
            container.appendChild(br);
        }
    });
    
    if (container.innerHTML != '') {
        document.getElementById("resultPanel").style.display = "block";
        document.getElementById("printBtn").style.display = "block";
    }
}
/*
function generateQRCode() {
    var input = document.getElementById("inputText").value;
    var lines = input.split('\n');
    var container = document.getElementById("results");

    container.innerHTML = '';

    lines.forEach(function(line, index) {
        if (line.trim() !== '') {
            var div = document.createElement('div');
            div.id = 'qrcode' + index;
            div.style.margin = '10px';
            container.appendChild(div);

            new QRCode(div.id, {
                text: line,
                width: 64,
                height: 64,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            var textElement = document.createElement('p');
            textElement.textContent = line;
            //textElement.style.textAlign = 'center';
            container.appendChild(textElement);
        }
    });

    if (container.innerHTML != ''){
        document.getElementById("resultPanel").style.display = "block";
        document.getElementById("printBtn").style.display = "block";
    }
}*/
function generateQRCode() {
    var input = document.getElementById("inputText").value;
    var lines = input.split('\n');
    var container = document.getElementById("results");

    container.innerHTML = '';

    lines.forEach(function(line, index) {
        if (line.trim() !== '') {
            var itemContainer = document.createElement('div');
            itemContainer.style.display = 'inline-block';
            itemContainer.style.textAlign = 'center';
            itemContainer.style.margin = '10px';

            var qrDiv = document.createElement('div');

            new QRCode(qrDiv, {
                text: line,
                width: 64,
                height: 64,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            var textElement = document.createElement('p');
            textElement.textContent = line;
            textElement.style.marginTop = '5px';
            textElement.style.fontSize = '12px';

            itemContainer.appendChild(qrDiv);
            itemContainer.appendChild(textElement);

            container.appendChild(itemContainer);
        }
    });

    if (container.innerHTML !== '') {
        document.getElementById("resultPanel").style.display = "block";
        document.getElementById("printBtn").style.display = "block";
    }
}

function addPrintStyles() {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        @media print {
            body * {
                visibility: hidden;
            }
            #resultPanel, #resultPanel * {
                visibility: visible;
            }
            #resultPanel {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                margin: 0;
                padding: 0;
            }
            #results {
                max-height: unset !important;
                overflow: visible !important;
            }
            html, body {
                height: auto;
                overflow: visible;
            }
        }
    `;
    document.head.appendChild(style);
}

function printResult() {
    window.print();
}

function addResult(content) {
    const resultContainer = document.getElementById('results');
    const resultItem = document.createElement('div');
    resultItem.innerHTML = content;
    resultContainer.appendChild(resultItem);
}
