document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('units-list').addEventListener('input', updateUnitsTable);
    document.getElementById('search-button').addEventListener('click', searchUnit);
    document.getElementById('search-unit').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            searchUnit();
        }
    });
    document.getElementById('export-button').addEventListener('click', exportResults);
    document.getElementById('file-input').addEventListener('change', handleFileUpload);

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result.trim();
                document.getElementById('units-list').value = content;
                updateUnitsTable();
            };
            reader.readAsText(file);
        }
    }

    function updateUnitsTable() {
        const unitsList = document.getElementById('units-list').value.trim().split('\n');
        const unitsTable = document.getElementById('units-table');
        unitsTable.innerHTML = '';
        unitsList.forEach(unit => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${unit}</td><td>0</td><td></td>`;
            unitsTable.appendChild(row);
        });
        document.getElementById('total-units').textContent = unitsList.length;
        updateFoundUnitsCount();
    }

    function searchUnit() {
        const searchUnit = document.getElementById('search-unit').value.trim();
        const rows = document.querySelectorAll('#units-table tr');
        let foundUnitsCount = 0;
        let unitFound = false;
        let unitDuplicated = false;
        let unitFoundRow = null;

        rows.forEach(row => {
            const unitID = row.cells[0].textContent.trim();
            if (unitID === searchUnit) {
                if (row.cells[1].textContent === '1') {
                    unitDuplicated = true;
                } else {
                    row.classList.add('found');
                    row.cells[1].textContent = '1';
                    row.cells[2].textContent = new Date().toLocaleString();
                    unitFound = true;
                    unitFoundRow = row;
                    foundUnitsCount++;
                }
            }
        });

        if (unitDuplicated) {
            updateSearchStatus('Duplicate unit found.', 'status-duplicate', 'duplicate');
        } else if (unitFound) {
            updateSearchStatus('Unit found successfully.', 'status-success', 'success');
            moveFoundUnitsToTop(unitFoundRow);
        } else {
            updateSearchStatus('Unit not in the list.', 'status-not-found', 'not-found');
        }

        updateFoundUnitsCount();
        checkAllUnitsFound();
        document.getElementById('search-unit').value = '';
        document.getElementById('search-unit').focus();
    }

    function updateFoundUnitsCount() {
        const rows = document.querySelectorAll('#units-table tr');
        let foundUnitsCount = 0;
        rows.forEach(row => {
            if (row.cells[1].textContent === '1') {
                foundUnitsCount++;
            }
        });
        document.getElementById('found-units').textContent = foundUnitsCount;
    }

    function moveFoundUnitsToTop(foundRow) {
        const table = document.getElementById('units-table');
        const rows = Array.from(table.rows);
        const foundRows = rows.filter(row => row.cells[1].textContent === '1' && row !== foundRow);
        const notFoundRows = rows.filter(row => row.cells[1].textContent !== '1');
        const sortedRows = [...foundRows, foundRow, ...notFoundRows];
        table.innerHTML = '';
        sortedRows.forEach(row => table.appendChild(row));
    }

    function updateSearchStatus(message, statusClass, soundType) {
        const statusDiv = document.getElementById('search-status');
        statusDiv.textContent = message;
        statusDiv.className = statusClass;
        playSound(soundType);
    }

    function playSound(type) {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        oscillator.type = 'square';  // sound wave type, change as needed
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        if (type === 'success') {
            oscillator.frequency.value = 440;  // A4 note
            gainNode.gain.setValueAtTime(0.2, context.currentTime);  // Set volume
        } else if (type === 'duplicate') {
            oscillator.frequency.value = 220;  // A3 note
            gainNode.gain.setValueAtTime(0.2, context.currentTime);
        } else if (type === 'not-found') {
            oscillator.frequency.value = 110;  // A2 note
            gainNode.gain.setValueAtTime(0.2, context.currentTime);
        }

        oscillator.start();
        oscillator.stop(context.currentTime + 0.5);  // Play for 0.5 seconds
    }

    function checkAllUnitsFound() {
        const totalUnits = parseInt(document.getElementById('total-units').textContent);
        const foundUnits = parseInt(document.getElementById('found-units').textContent);
        if (totalUnits > 0 && totalUnits === foundUnits) {
            const completionModal = new bootstrap.Modal(document.getElementById('completionModal'));
            completionModal.show();
        }
    }

    function exportResults() {
    const rows = Array.from(document.querySelectorAll('#units-table tr'));
    const csvContent = rows.map(row => {
    const cells = Array.from(row.cells).map(cell => `"${cell.textContent}"`);
    return cells.join(',');
    }).join('\n');

    const header = 'Unit ID,Status,Search Time\n';
    const fullCsvContent = header + csvContent;
    const blob = new Blob([fullCsvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'search_results.csv');

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);  // 释放内存
    }

    document.getElementById('export-button').addEventListener('click', exportResults);
});