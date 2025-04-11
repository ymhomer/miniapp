document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const editorArea = document.getElementById('editor-area');
    const measureContainer = document.getElementById('measure-container');
    const addMeasureBtn = document.getElementById('add-measure-btn');
    const addMeasureBtnBottom = document.getElementById('add-measure-btn-bottom');
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const saveBtn = document.getElementById('save-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const fileImportInput = document.getElementById('file-import');
    const editModeBtn = document.getElementById('edit-mode-btn');
    const timeSignatureSelect = document.getElementById('time-signature');
    const bpmInput = document.getElementById('bpm');
    const noteButtons = document.querySelectorAll('.note-btn');
    const sharpBtn = document.getElementById('sharp-btn');
    const flatBtn = document.getElementById('flat-btn');
    const naturalBtn = document.getElementById('natural-btn');
    const durationButtons = document.querySelectorAll('.duration-btn');
    const octaveUpBtn = document.getElementById('octave-up-btn');
    const octaveDownBtn = document.getElementById('octave-down-btn');
    const addNoteBtn = document.getElementById('add-note-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const saveModal = document.getElementById('save-modal');
    const exportModal = document.getElementById('export-modal');
    const playbackIndicator = document.getElementById('playback-indicator');
    const statusMessage = document.getElementById('status-message');
    const selectionInfo = document.getElementById('selection-info');

    // Audio Context
    let audioContext;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.error('Web Audio API is not supported in this browser');
        statusMessage.textContent = 'Audio not supported in this browser';
    }

    // App State
    let state = {
        measures: [],
        currentMeasure: null,
        selectedNote: null,
        lastAddedNote: null,
        currentDuration: 1, // 1 = quarter note
        currentAccidental: null, // null, '#', or 'b'
        currentOctave: 0, // -1, 0, or 1
        isPlaying: false,
        playPosition: { measure: 0, note: 0 },
        playTimeout: null,
        editMode: false // false = add mode, true = edit mode
    };

    // Initialize the editor with one measure
    addMeasure();
    updateButtonStates();

    // Event Listeners
    addMeasureBtn.addEventListener('click', addMeasure);
    addMeasureBtnBottom.addEventListener('click', addMeasure);
    playBtn.addEventListener('click', playComposition);
    stopBtn.addEventListener('click', stopPlayback);
    saveBtn.addEventListener('click', showSaveModal);
    exportBtn.addEventListener('click', showExportModal);
    importBtn.addEventListener('click', () => fileImportInput.click());
    fileImportInput.addEventListener('change', handleFileImport);
    editModeBtn.addEventListener('click', toggleEditMode);
    
    // Note input buttons
    noteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const noteValue = this.dataset.note;
            
            if (state.editMode && state.selectedNote) {
                // In edit mode with a selected note - change the pitch
                updateSelectedNote('pitch', noteValue);
                updateStatus(`Changed note to ${noteValue}`);
            } else if (!state.editMode) {
                // In add mode - add a new note
                addNoteToCurrentMeasure({
                    pitch: noteValue,
                    duration: state.currentDuration,
                    accidental: state.currentAccidental,
                    octave: state.currentOctave
                });
            }
        });
    });

    // Accidental buttons
    sharpBtn.addEventListener('click', function() {
        state.currentAccidental = '#';
        updateButtonStates();
        
        if (state.editMode && state.selectedNote) {
            updateSelectedNote('accidental', '#');
            updateStatus("Added sharp to selected note");
        } else if (!state.editMode && state.lastAddedNote) {
            updateNote(state.lastAddedNote, 'accidental', '#');
            updateStatus("Added sharp to last note");
        }
    });

    flatBtn.addEventListener('click', function() {
        state.currentAccidental = 'b';
        updateButtonStates();
        
        if (state.editMode && state.selectedNote) {
            updateSelectedNote('accidental', 'b');
            updateStatus("Added flat to selected note");
        } else if (!state.editMode && state.lastAddedNote) {
            updateNote(state.lastAddedNote, 'accidental', 'b');
            updateStatus("Added flat to last note");
        }
    });

    naturalBtn.addEventListener('click', function() {
        state.currentAccidental = null;
        updateButtonStates();
        
        if (state.editMode && state.selectedNote) {
            updateSelectedNote('accidental', null);
            updateStatus("Removed accidental from selected note");
        } else if (!state.editMode && state.lastAddedNote) {
            updateNote(state.lastAddedNote, 'accidental', null);
            updateStatus("Removed accidental from last note");
        }
    });

    // Duration buttons
    durationButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            state.currentDuration = parseFloat(this.dataset.duration);
            updateButtonStates();
            
            if (state.editMode && state.selectedNote) {
                updateSelectedNote('duration', state.currentDuration);
                updateStatus(`Changed duration to ${state.currentDuration}`);
            } else if (!state.editMode && state.lastAddedNote) {
                updateNote(state.lastAddedNote, 'duration', state.currentDuration);
                updateStatus(`Changed last note duration to ${state.currentDuration}`);
            }
        });
    });

    // Octave buttons
    octaveUpBtn.addEventListener('click', function() {
        if (state.currentOctave < 1) {
            state.currentOctave++;
            updateButtonStates();
            
            if (state.editMode && state.selectedNote) {
                updateSelectedNote('octave', state.currentOctave);
                updateStatus(`Increased octave to ${state.currentOctave}`);
            } else if (!state.editMode && state.lastAddedNote) {
                updateNote(state.lastAddedNote, 'octave', state.currentOctave);
                updateStatus(`Increased last note octave to ${state.currentOctave}`);
            }
        }
    });

    octaveDownBtn.addEventListener('click', function() {
        if (state.currentOctave > -1) {
            state.currentOctave--;
            updateButtonStates();
            
            if (state.editMode && state.selectedNote) {
                updateSelectedNote('octave', state.currentOctave);
                updateStatus(`Decreased octave to ${state.currentOctave}`);
            } else if (!state.editMode && state.lastAddedNote) {
                updateNote(state.lastAddedNote, 'octave', state.currentOctave);
                updateStatus(`Decreased last note octave to ${state.currentOctave}`);
            }
        }
    });

    // Add note button
    addNoteBtn.addEventListener('click', function() {
        if (!state.editMode) {
            addNoteToCurrentMeasure({
                pitch: '1',
                duration: state.currentDuration,
                accidental: state.currentAccidental,
                octave: state.currentOctave
            });
        } else {
            updateStatus("Cannot add note in edit mode - switch to add mode first");
        }
    });

    // Delete button
    deleteBtn.addEventListener('click', function() {
        if (state.editMode && state.selectedNote) {
            deleteSelectedNote();
        } else if (!state.editMode && state.lastAddedNote) {
            deleteNote(state.lastAddedNote);
        }
    });

    // Editor area click (to deselect notes)
    editorArea.addEventListener('click', function(e) {
        if (e.target === editorArea || e.target === measureContainer) {
            if (state.editMode) {
                deselectNote();
            }
        }
    });

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Save modal buttons
    document.getElementById('cancel-save').addEventListener('click', function() {
        saveModal.style.display = 'none';
    });

    document.getElementById('confirm-save').addEventListener('click', function() {
        const title = document.getElementById('song-title').value || 'Untitled';
        const composer = document.getElementById('song-composer').value || 'Unknown';
        let filename = document.getElementById('save-filename').value || 'composition';
        
        // Ensure filename doesn't contain extension
        filename = filename.replace(/\.(json|txt)$/i, '');
        
        const data = exportNotation('json');
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        saveModal.style.display = 'none';
        updateStatus(`"${title}" saved as ${filename}.json`);
    });

    // Export modal buttons
    document.getElementById('cancel-export').addEventListener('click', function() {
        exportModal.style.display = 'none';
    });

    document.getElementById('confirm-export').addEventListener('click', function() {
        const format = document.getElementById('export-format').value;
        let filename = document.getElementById('export-filename').value || 'composition';
        
        // Ensure filename doesn't contain extension
        filename = filename.replace(/\.(json|txt)$/i, '');
        
        const data = exportNotation(format);
        const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        exportModal.style.display = 'none';
        updateStatus(`Exported as ${filename}.${format}`);
    });

    // Time signature change
    timeSignatureSelect.addEventListener('change', function() {
        if (state.currentMeasure) {
            const timeSignature = this.value.split('/');
            state.currentMeasure.timeSignature = {
                beats: parseInt(timeSignature[0]),
                beatValue: parseInt(timeSignature[1])
            };
            
            // Update the display
            const header = state.currentMeasure.element.querySelector('.measure-time-signature');
            if (header) {
                header.textContent = `${state.currentMeasure.timeSignature.beats}/${state.currentMeasure.timeSignature.beatValue}`;
            }
            
            updateStatus(`Time signature changed to ${this.value}`);
        }
    });

    // Functions
    function toggleEditMode() {
        state.editMode = !state.editMode;
        editModeBtn.textContent = state.editMode ? "Add Mode" : "Edit Mode";
        editModeBtn.classList.toggle('btn-edit-mode', state.editMode);
        editModeBtn.classList.toggle('btn-primary', !state.editMode);
        updateButtonStates();
        
        if (state.editMode) {
            updateStatus("Edit mode - click on notes to edit them");
        } else {
            deselectNote();
            updateStatus("Add mode - click note buttons to add new notes");
        }
    }

    function addMeasure() {
        const timeSignature = timeSignatureSelect.value.split('/');
        const beats = parseInt(timeSignature[0]);
        const beatValue = parseInt(timeSignature[1]);
        
        const measure = {
            id: Date.now(),
            timeSignature: { beats, beatValue },
            notes: [],
            element: null
        };
        
        state.measures.push(measure);
        renderMeasure(measure);
        state.currentMeasure = measure;
        
        // Scroll to the new measure
        setTimeout(() => {
            measure.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        
        updateStatus("Added new measure");
        updateSelectionInfo();
    }

    function renderMeasure(measure) {
        const measureEl = document.createElement('div');
        measureEl.className = 'measure';
        measureEl.dataset.measureId = measure.id;
        
        measureEl.innerHTML = `
            <div class="measure-header">
                <span class="measure-time-signature">${measure.timeSignature.beats}/${measure.timeSignature.beatValue}</span>
            </div>
            <div class="measure-notes"></div>
        `;
        
        const notesContainer = measureEl.querySelector('.measure-notes');
        
        // Add notes if they exist
        measure.notes.forEach(note => {
            const noteEl = createNoteElement(note);
            notesContainer.appendChild(noteEl);
        });
        
        // Add click handler for the measure
        measureEl.addEventListener('click', function(e) {
            if (e.target === this || e.target.classList.contains('measure-notes')) {
                state.currentMeasure = measure;
                if (state.editMode) {
                    deselectNote();
                }
                updateStatus(`Selected measure ${state.measures.indexOf(measure) + 1}`);
                updateSelectionInfo();
            }
        });
        
        // Add drag and drop handlers
        measureEl.draggable = true;
        measureEl.addEventListener('dragstart', handleDragStart);
        measureEl.addEventListener('dragover', handleDragOver);
        measureEl.addEventListener('drop', handleDrop);
        measureEl.addEventListener('dragend', handleDragEnd);
        
        measureContainer.appendChild(measureEl);
        measure.element = measureEl;
    }

    function createNoteElement(note) {
        const noteEl = document.createElement('div');
        noteEl.className = 'note';
        if (note.pitch === '0') noteEl.classList.add('rest');
        
        noteEl.dataset.noteId = note.id;
        noteEl.innerHTML = `
            ${note.pitch !== '0' ? note.pitch : ''}
            ${note.accidental ? `<span class="note-accidental">${note.accidental}</span>` : ''}
            <span class="note-duration">${getDurationSymbol(note.duration)}</span>
            ${note.octave > 0 ? `<span class="note-octave-up">${'.'.repeat(note.octave)}</span>` : ''}
            ${note.octave < 0 ? `<span class="note-octave-down">${'.'.repeat(-note.octave)}</span>` : ''}
        `;
        
        noteEl.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (state.editMode) {
                selectNote(note, noteEl);
            } else {
                // In add mode, clicking a note selects it temporarily for playback
                playNote(note);
            }
        });
        
        return noteEl;
    }

    function getDurationSymbol(duration) {
        if (duration === 1) return '𝅘𝅥';
        if (duration === 0.5) return '𝅘𝅥𝅮';
        if (duration === 0.25) return '𝅘𝅥𝅯';
        if (duration === 2) return '𝅗𝅥';
        if (duration === 1.5) return '𝅗𝅥.';
        return '';
    }

    function addNoteToCurrentMeasure(noteData) {
        if (!state.currentMeasure) {
            // If no measure exists, create one first
            addMeasure();
        }
        
        // Check if we have space in the current measure
        const totalBeats = state.currentMeasure.timeSignature.beats;
        const currentBeats = state.currentMeasure.notes.reduce((sum, n) => sum + n.duration, 0);
        const remainingBeats = totalBeats - currentBeats;
        
        if (noteData.duration > remainingBeats) {
            // Not enough space, create a new measure and add the note there
            addMeasure();
            updateStatus("Automatically created new measure for the note");
        }
        
        const note = {
            id: Date.now(),
            pitch: noteData.pitch,
            duration: noteData.duration,
            accidental: noteData.accidental,
            octave: noteData.octave || 0
        };
        
        state.currentMeasure.notes.push(note);
        state.lastAddedNote = note;
        
        // Re-render the measure
        const notesContainer = state.currentMeasure.element.querySelector('.measure-notes');
        const noteEl = createNoteElement(note);
        notesContainer.appendChild(noteEl);
        
        // Play the note
        playNote(note);
        
        updateStatus(`Added new note ${note.pitch}`);
        updateSelectionInfo();
    }

    function selectNote(note, noteEl) {
        if (!state.editMode) return;
        
        deselectNote();
        
        state.selectedNote = note;
        noteEl.classList.add('selected');
        
        // Update UI to reflect selected note's properties
        state.currentDuration = note.duration;
        state.currentAccidental = note.accidental;
        state.currentOctave = note.octave;
        
        // Highlight the appropriate buttons
        updateButtonStates();
        updateSelectionInfo();
    }

    function deselectNote() {
        if (state.selectedNote) {
            document.querySelectorAll('.note.selected').forEach(el => {
                el.classList.remove('selected');
            });
            state.selectedNote = null;
            updateButtonStates();
            updateSelectionInfo();
        }
    }

    function updateSelectedNote(property, value) {
        updateNote(state.selectedNote, property, value);
    }

    function updateNote(note, property, value) {
        if (!note) return;
        
        note[property] = value;
        
        // Find the note element and update it
        const noteEl = document.querySelector(`.note[data-note-id="${note.id}"]`);
        if (noteEl) {
            const newNoteEl = createNoteElement(note);
            noteEl.parentNode.replaceChild(newNoteEl, noteEl);
            
            // If this was the selected note, re-select it
            if (state.selectedNote && state.selectedNote.id === note.id) {
                selectNote(note, newNoteEl);
            }
            
            // Play the updated note
            playNote(note);
        }
    }

    function deleteSelectedNote() {
        if (!state.selectedNote) return;
        deleteNote(state.selectedNote);
    }

    function deleteNote(note) {
        // Find the measure containing this note
        const measure = state.measures.find(m => 
            m.notes.some(n => n.id === note.id)
        );
        
        if (measure) {
            // Remove the note from the measure
            measure.notes = measure.notes.filter(n => n.id !== note.id);
            
            // Re-render the measure
            const notesContainer = measure.element.querySelector('.measure-notes');
            notesContainer.innerHTML = '';
            measure.notes.forEach(n => {
                const noteEl = createNoteElement(n);
                notesContainer.appendChild(noteEl);
            });
            
            // Update last added note if it was deleted
            if (state.lastAddedNote && state.lastAddedNote.id === note.id) {
                state.lastAddedNote = measure.notes.length > 0 
                    ? measure.notes[measure.notes.length - 1] 
                    : null;
            }
            
            // Deselect if the selected note was deleted
            if (state.selectedNote && state.selectedNote.id === note.id) {
                deselectNote();
            }
            
            updateStatus("Note deleted");
            updateSelectionInfo();
        }
    }

    function updateButtonStates() {
        // Update note buttons based on current mode
        noteButtons.forEach(btn => {
            const noteValue = btn.dataset.note;
            
            if (state.editMode && state.selectedNote) {
                // In edit mode with a selected note - highlight the current note's pitch
                btn.classList.toggle('selected', noteValue === state.selectedNote.pitch);
            } else if (!state.editMode && state.lastAddedNote) {
                // In add mode - highlight the last added note's pitch
                btn.classList.toggle('selected', noteValue === state.lastAddedNote.pitch);
            } else {
                btn.classList.remove('selected');
            }
        });
        
        // Update duration buttons
        durationButtons.forEach(btn => {
            const isSelected = parseFloat(btn.dataset.duration) === state.currentDuration;
            btn.classList.toggle('selected', isSelected);
        });
        
        // Update accidental buttons
        sharpBtn.classList.toggle('selected', state.currentAccidental === '#');
        flatBtn.classList.toggle('selected', state.currentAccidental === 'b');
        naturalBtn.classList.toggle('selected', state.currentAccidental === null);
        
        // Update octave buttons
        octaveUpBtn.disabled = state.currentOctave >= 1;
        octaveDownBtn.disabled = state.currentOctave <= -1;
        
        // Update mode-specific buttons
        addNoteBtn.disabled = state.editMode;
        deleteBtn.disabled = !state.editMode && !state.lastAddedNote;
    }

    function playNote(note) {
        if (!audioContext || note.pitch === '0') return; // Don't play rests
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = getFrequencyForNote(note);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
        
        const duration = 0.5 * (60 / parseInt(bpmInput.value));
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    }

    function getFrequencyForNote(note) {
        // Base frequencies for octave 0
        const noteFrequencies = {
            '1': 261.63, // C
            '2': 293.66, // D
            '3': 329.63, // E
            '4': 349.23, // F
            '5': 392.00, // G
            '6': 440.00, // A
            '7': 493.88  // B
        };
        
        // Adjust for accidentals
        let frequency = noteFrequencies[note.pitch];
        if (note.accidental === '#') frequency *= Math.pow(2, 1/12);
        if (note.accidental === 'b') frequency /= Math.pow(2, 1/12);
        
        // Adjust for octave
        frequency *= Math.pow(2, note.octave);
        
        return frequency;
    }

    function playComposition() {
        if (state.isPlaying) return;
        
        if (state.measures.length === 0 || state.measures.every(m => m.notes.length === 0)) {
            updateStatus("Nothing to play - add some notes first");
            return;
        }
        
        state.isPlaying = true;
        state.playPosition = { measure: 0, note: 0 };
        playBtn.disabled = true;
        stopBtn.disabled = false;
        
        updateStatus("Playing composition...");
        playNextNote();
    }

    function playNextNote() {
        if (!state.isPlaying || state.playPosition.measure >= state.measures.length) {
            stopPlayback();
            return;
        }
        
        const currentMeasure = state.measures[state.playPosition.measure];
        
        if (state.playPosition.note >= currentMeasure.notes.length) {
            // Move to next measure
            state.playPosition.measure++;
            state.playPosition.note = 0;
            
            if (state.playPosition.measure >= state.measures.length) {
                stopPlayback();
                return;
            }
            
            // Small delay between measures
            state.playTimeout = setTimeout(playNextNote, 100);
            return;
        }
        
        const currentNote = currentMeasure.notes[state.playPosition.note];
        
        // Highlight the current note
        highlightPlayingNote(currentMeasure.id, currentNote.id);
        
        // Play the note
        playNote(currentNote);
        
        // Move to next note
        state.playPosition.note++;
        
        // Calculate delay based on note duration and BPM
        const delay = (currentNote.duration * (60 / parseInt(bpmInput.value))) * 1000;
        state.playTimeout = setTimeout(playNextNote, delay);
    }

    function highlightPlayingNote(measureId, noteId) {
        // Remove highlight from all notes
        document.querySelectorAll('.note.playing').forEach(el => {
            el.classList.remove('playing');
        });
        
        // Highlight current note if it exists
        if (noteId) {
            const noteEl = document.querySelector(`.measure[data-measure-id="${measureId}"] .note[data-note-id="${noteId}"]`);
            if (noteEl) {
                noteEl.classList.add('playing');
                
                // Scroll to the note
                noteEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
        
        // Update playback indicator
        if (measureId) {
            const measureEl = document.querySelector(`.measure[data-measure-id="${measureId}"]`);
            if (measureEl) {
                const rect = measureEl.getBoundingClientRect();
                const editorRect = editorArea.getBoundingClientRect();
                const left = rect.left - editorRect.left;
                
                playbackIndicator.style.left = `${left}px`;
                playbackIndicator.style.display = 'block';
            }
        }
    }

    function stopPlayback() {
        state.isPlaying = false;
        if (state.playTimeout) {
            clearTimeout(state.playTimeout);
            state.playTimeout = null;
        }
        
        playBtn.disabled = false;
        stopBtn.disabled = true;
        
        // Remove highlight from all notes
        document.querySelectorAll('.note.playing').forEach(el => {
            el.classList.remove('playing');
        });
        
        playbackIndicator.style.display = 'none';
        updateStatus("Playback stopped");
    }

    function showSaveModal() {
        document.getElementById('song-title').value = '';
        document.getElementById('song-composer').value = '';
        document.getElementById('save-filename').value = 'composition';
        saveModal.style.display = 'flex';
    }

    function showExportModal() {
        document.getElementById('export-filename').value = 'composition';
        document.getElementById('export-format').value = 'json';
        exportModal.style.display = 'flex';
    }

    function handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const format = file.name.endsWith('.json') ? 'json' : 'text';
                importNotation(content, format);
                updateStatus(`Imported ${file.name}`);
            } catch (err) {
                console.error('Error importing file:', err);
                updateStatus("Error importing file - check the format");
            }
        };
        reader.readAsText(file);
        
        // Reset the input to allow importing the same file again
        e.target.value = '';
    }

    function exportNotation(format) {
        const exportData = {
            version: '1.0',
            title: 'My Composition',
            composer: 'Unknown',
            bpm: parseInt(bpmInput.value),
            timeSignature: timeSignatureSelect.value,
            measures: state.measures.map(measure => ({
                timeSignature: `${measure.timeSignature.beats}/${measure.timeSignature.beatValue}`,
                notes: measure.notes.map(note => ({
                    pitch: note.pitch,
                    duration: note.duration,
                    accidental: note.accidental,
                    octave: note.octave
                }))
            }))
        };
        
        return format === 'json' 
            ? JSON.stringify(exportData, null, 2)
            : convertToTextNotation(exportData);
    }

    function convertToTextNotation(data) {
        let text = `Title: ${data.title}\n`;
        text += `Composer: ${data.composer}\n`;
        text += `Time Signature: ${data.timeSignature}\n`;
        text += `BPM: ${data.bpm}\n\n`;
        
        data.measures.forEach((measure, i) => {
            text += `Measure ${i + 1} (${measure.timeSignature}):\n`;
            
            measure.notes.forEach(note => {
                text += `${note.pitch}`;
                if (note.accidental) text += note.accidental;
                if (note.octave > 0) text += '.'.repeat(note.octave);
                if (note.octave < 0) text += '_'.repeat(-note.octave);
                text += `[${note.duration}] `;
            });
            
            text += '\n\n';
        });
        
        return text;
    }

    function importNotation(data, format) {
        try {
            let parsedData;
            
            if (format === 'json') {
                parsedData = JSON.parse(data);
            } else {
                // Simple text format parser (very basic)
                parsedData = parseTextNotation(data);
            }
            
            // Clear current state
            state.measures = [];
            measureContainer.innerHTML = '';
            
            // Set BPM if available
            if (parsedData.bpm) {
                bpmInput.value = parsedData.bpm;
            }
            
            // Set time signature if available
            if (parsedData.timeSignature) {
                timeSignatureSelect.value = parsedData.timeSignature;
            }
            
            // Create measures and notes
            if (parsedData.measures && parsedData.measures.length > 0) {
                parsedData.measures.forEach(measureData => {
                    const timeSignature = measureData.timeSignature.split('/');
                    const beats = parseInt(timeSignature[0]);
                    const beatValue = parseInt(timeSignature[1]);
                    
                    const measure = {
                        id: Date.now(),
                        timeSignature: { beats, beatValue },
                        notes: [],
                        element: null
                    };
                    
                    if (measureData.notes) {
                        measureData.notes.forEach(noteData => {
                            measure.notes.push({
                                id: Date.now(),
                                pitch: noteData.pitch || '1',
                                duration: noteData.duration || 1,
                                accidental: noteData.accidental || null,
                                octave: noteData.octave || 0
                            });
                        });
                    }
                    
                    state.measures.push(measure);
                    renderMeasure(measure);
                });
                
                state.currentMeasure = state.measures[0];
                state.lastAddedNote = state.currentMeasure.notes.length > 0 
                    ? state.currentMeasure.notes[state.currentMeasure.notes.length - 1]
                    : null;
            }
            
            updateSelectionInfo();
        } catch (e) {
            console.error('Import error:', e);
            updateStatus("Error importing notation - check the format");
        }
    }

    function parseTextNotation(text) {
        // This is a very basic parser for demonstration
        // A real implementation would need to be more robust
        const lines = text.split('\n');
        const result = {
            title: 'Imported Composition',
            composer: 'Unknown',
            bpm: 120,
            timeSignature: '4/4',
            measures: []
        };
        
        let currentMeasure = {
            timeSignature: '4/4',
            notes: []
        };
        
        lines.forEach(line => {
            // Simple pattern matching for notes like "1", "2#", "5b", "7.", "3_", etc.
            const noteMatches = line.matchAll(/([0-7])([#b]?)([._]*)(\[([0-9.]+)\])?/g);
            
            for (const match of noteMatches) {
                const pitch = match[1];
                const accidental = match[2] || null;
                const octaveDots = match[3];
                const duration = match[5] ? parseFloat(match[5]) : 1;
                
                let octave = 0;
                if (octaveDots.includes('.')) octave = octaveDots.split('.').length - 1;
                if (octaveDots.includes('_')) octave = -(octaveDots.split('_').length - 1);
                
                currentMeasure.notes.push({
                    pitch,
                    duration,
                    accidental,
                    octave
                });
            }
            
            // Check for measure indicators
            if (line.includes('Measure')) {
                if (currentMeasure.notes.length > 0) {
                    result.measures.push(currentMeasure);
                    currentMeasure = {
                        timeSignature: '4/4',
                        notes: []
                    };
                }
                
                const timeSigMatch = line.match(/\(([0-9]+\/[0-9]+)\)/);
                if (timeSigMatch) {
                    currentMeasure.timeSignature = timeSigMatch[1];
                }
            }
        });
        
        if (currentMeasure.notes.length > 0) {
            result.measures.push(currentMeasure);
        }
        
        return result;
    }

    // Drag and Drop functions for measures
    function handleDragStart(e) {
        this.classList.add('dragging');
        e.dataTransfer.setData('text/plain', this.dataset.measureId);
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const draggingMeasure = document.querySelector('.measure.dragging');
        if (draggingMeasure && draggingMeasure !== this) {
            this.classList.add('drop-target');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('drop-target');
        
        const sourceId = e.dataTransfer.getData('text/plain');
        const sourceMeasure = state.measures.find(m => m.id.toString() === sourceId);
        const targetMeasure = state.measures.find(m => m.id.toString() === this.dataset.measureId);
        
        if (sourceMeasure && targetMeasure && sourceMeasure !== targetMeasure) {
            const sourceIndex = state.measures.indexOf(sourceMeasure);
            const targetIndex = state.measures.indexOf(targetMeasure);
            
            // Remove from old position
            state.measures.splice(sourceIndex, 1);
            // Insert at new position
            state.measures.splice(targetIndex, 0, sourceMeasure);
            
            // Re-render all measures
            measureContainer.innerHTML = '';
            state.measures.forEach(measure => {
                renderMeasure(measure);
            });
            
            updateStatus(`Moved measure to position ${targetIndex + 1}`);
        }
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        document.querySelectorAll('.measure.drop-target').forEach(el => {
            el.classList.remove('drop-target');
        });
    }

    function updateStatus(message) {
        statusMessage.textContent = message;
    }

    function updateSelectionInfo() {
        if (state.editMode && state.selectedNote) {
            selectionInfo.textContent = `Editing: ${getNoteDescription(state.selectedNote)}`;
        } else if (!state.editMode && state.lastAddedNote) {
            selectionInfo.textContent = `Last added: ${getNoteDescription(state.lastAddedNote)}`;
        } else if (state.editMode) {
            selectionInfo.textContent = "Edit mode - select a note to edit";
        } else {
            selectionInfo.textContent = "Add mode - click note buttons to add";
        }
    }

    function getNoteDescription(note) {
        if (!note) return "No note";
        
        let desc = `Note ${note.pitch}`;
        if (note.accidental) desc += note.accidental;
        if (note.octave > 0) desc += ' high';
        if (note.octave < 0) desc += ' low';
        desc += ` (${note.duration} beat${note.duration !== 1 ? 's' : ''})`;
        return desc;
    }
});