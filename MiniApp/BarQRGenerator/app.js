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
                width: 2,
                height: 40,
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

function generateQRCode() {
    var input = document.getElementById("inputText").value;
    var lines = input.split('\n');
    var container = document.getElementById("results");

    container.innerHTML = ''; // Clear previous results

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
            //textElement.style.textAlign = 'center'; // 文本居中显示
            container.appendChild(textElement);
        }
    });

    if (container.innerHTML != ''){
        document.getElementById("resultPanel").style.display = "block";
        document.getElementById("printBtn").style.display = "block";
    }
}

function addPrintStyles() {
    var style = document.createElement('style');
    style.type = 'text/css';
    style.media = 'print';
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
                left: 0;
                top: 0;
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
}

function printResult() {
    window.print();
}