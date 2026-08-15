// ============================================================
// ASSESSMENT WORKFLOW - 5-Step Reading Assessment
// ============================================================

async function initPage() {
    // Check for pre-filled search term from dashboard
    const prefillSearchTerm = sessionStorage.getItem('assessmentSearchTerm');
    if (prefillSearchTerm) {
        assessmentState.prefillSearchTerm = prefillSearchTerm;
        sessionStorage.removeItem('assessmentSearchTerm');
    }
    
    renderAssessment();
}

function renderAssessment() {
    const steps = {
        1: renderStep1SelectStudent,
        2: renderStep2SelectMaterial,
        3: renderStep3Record,
        4: renderStep4Results
    };

    const renderFn = steps[assessmentState.step] || renderStep1SelectStudent;
    renderFn();
}

// ============================================================
// STEP 1: Student Selection
// ============================================================

function renderStep1SelectStudent() {
    const viewContainer = document.getElementById('view-container');
    
    viewContainer.innerHTML = `
        <div class="assessment-container">
            <div class="assessment-header">
                <h2>Reading Assessment</h2>
                <div class="step-indicator">
                    <span class="step active">1. Student</span>
                    <span class="step">2. Material</span>
                    <span class="step">3. Record</span>
                    <span class="step">4. Results</span>
                </div>
            </div>

            <div class="assessment-step panel">
                <h3>Select Student</h3>
                <p>Search for a student by LRN or name</p>

                <div class="search-area">
                    <div class="u-inline-form-row">
                        <input type="text" id="student-search-input" placeholder="Enter LRN or name..." class="input-inline-fill">
                        <button id="search-student-btn" class="btn-primary">Search</button>
                    </div>
                </div>

                <div id="student-results" class="u-mt-16"></div>

                <div class="u-actions-row is-end u-mt-20">
                    <button id="next-step-1" class="btn-primary" disabled>Next</button>
                </div>
            </div>
        </div>
    `;

    if (assessmentState.prefillSearchTerm) {
        const input = document.getElementById('student-search-input');
        if (input) input.value = assessmentState.prefillSearchTerm;
        delete assessmentState.prefillSearchTerm;
    }

    document.getElementById('search-student-btn')?.addEventListener('click', searchAssessmentStudents);
    document.getElementById('student-search-input')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') searchAssessmentStudents();
    });

    document.getElementById('next-step-1')?.addEventListener('click', () => {
        if (assessmentState.student) {
            assessmentState.step = 2;
            renderAssessment();
        }
    });
}

async function searchAssessmentStudents() {
    const term = (document.getElementById('student-search-input')?.value || '').trim();
    if (!term) return;

    try {
        const data = await fetchJson(`/api/assessment?action=student&term=${encodeURIComponent(term)}`);
        const resultsDiv = document.getElementById('student-results');
        if (!resultsDiv) return;

        if (data.success && data.students && data.students.length > 0) {
            resultsDiv.innerHTML = `
                <div class="u-stack-sm">
                    ${data.students.map(student => `
                        <div class="student-result-item selector-item" data-id="${student.student_id}">
                            <strong>${escapeAssessmentHtml(student.first_name)} ${escapeAssessmentHtml(student.last_name)}</strong>
                            <span class="u-float-right">LRN: ${escapeAssessmentHtml(student.lrn || '')}</span>
                            <br><small class="u-text-muted">${escapeAssessmentHtml(student.grade_level || 'N/A')} - ${escapeAssessmentHtml(student.section || 'N/A')}</small>
                        </div>
                    `).join('')}
                </div>
            `;

            document.querySelectorAll('.student-result-item').forEach(el => {
                el.addEventListener('click', () => {
                    document.querySelectorAll('.student-result-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    el.classList.add('selected');

                    const student = data.students.find(s => String(s.student_id) === String(el.dataset.id));
                    assessmentState.student = student || null;
                    const nextBtn = document.getElementById('next-step-1');
                    if (nextBtn) nextBtn.disabled = !assessmentState.student;
                });
            });
        } else {
            resultsDiv.innerHTML = '<p class="u-text-muted">No students found. Try a different search term.</p>';
        }
    } catch (error) {
        alert('Error searching: ' + error.message);
    }
}

// ============================================================
// STEP 2: Material Selection
// ============================================================

function renderStep2SelectMaterial() {
    const student = assessmentState.student;
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="assessment-container">
            <div class="assessment-header">
                <h2>Reading Assessment</h2>
                <div class="step-indicator">
                    <span class="step done">1. Student</span>
                    <span class="step active">2. Material</span>
                    <span class="step">3. Record</span>
                    <span class="step">4. Results</span>
                </div>
            </div>

            <div class="assessment-step panel">
                <h3>Select Reading Material</h3>
                <p>Choose a passage for ${student ? escapeAssessmentHtml(student.first_name) : ''} to read</p>

                <div class="student-badge">
                    <strong>Selected:</strong> ${student ? `${escapeAssessmentHtml(student.first_name)} ${escapeAssessmentHtml(student.last_name)}` : ''}
                </div>

                <div class="filter-area u-row-wrap u-gap-12 u-my-16">
                    <select id="material-filter-grade" class="filter-select">
                        <option value="">All Grades</option>
                        <option value="Grade 2">Grade 2</option>
                        <option value="Grade 3">Grade 3</option>
                    </select>
                    <select id="material-filter-language" class="filter-select">
                        <option value="">All Languages</option>
                        <option value="English">English</option>
                        <option value="Filipino">Filipino</option>
                    </select>
                    <button id="load-materials-btn" class="btn-primary">Load Materials</button>
                </div>

                <div id="materials-list" class="u-stack-md u-max-h-320 u-scroll-y"></div>

                <div class="u-actions-row is-between u-mt-20">
                    <button id="back-step-2" class="btn-secondary">Back</button>
                    <button id="next-step-2" class="btn-primary" disabled>Next</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('load-materials-btn')?.addEventListener('click', loadAssessmentMaterials);
    document.getElementById('back-step-2')?.addEventListener('click', () => {
        assessmentState.step = 1;
        renderAssessment();
    });
    document.getElementById('next-step-2')?.addEventListener('click', () => {
        if (assessmentState.material) {
            assessmentState.step = 3;
            renderAssessment();
        }
    });

    loadAssessmentMaterials();
}

async function loadAssessmentMaterials() {
    const grade = document.getElementById('material-filter-grade')?.value || '';
    const language = document.getElementById('material-filter-language')?.value || '';

    let url = '/api/assessment?action=materials';
    if (grade) url += `&grade=${encodeURIComponent(grade)}`;
    if (language) url += `&language=${encodeURIComponent(language)}`;

    try {
        const data = await fetchJson(url);
        const listDiv = document.getElementById('materials-list');
        if (!listDiv) return;

        if (data.success && data.materials && data.materials.length > 0) {
            listDiv.innerHTML = data.materials.map(material => `
                <div class="material-item selector-item u-p-16" data-id="${material.material_id}">
                    <div class="u-row-between u-gap-8">
                        <strong>${escapeAssessmentHtml(material.title)}</strong>
                        <span class="u-text-muted-xs">${escapeAssessmentHtml(material.language)}</span>
                    </div>
                    <div class="u-row-wrap u-gap-16 u-text-muted-xs u-mt-4">
                        <span>${escapeAssessmentHtml(material.grade_level)}</span>
                        <span>${escapeAssessmentHtml(material.difficulty)}</span>
                        <span>${material.ocr_text ? 'Text available' : 'No text'}</span>
                    </div>
                </div>
            `).join('');

            document.querySelectorAll('.material-item').forEach(el => {
                el.addEventListener('click', () => {
                    document.querySelectorAll('.material-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    el.classList.add('selected');

                    const material = data.materials.find(m => String(m.material_id) === String(el.dataset.id));
                    assessmentState.material = material || null;
                    const nextBtn = document.getElementById('next-step-2');
                    if (nextBtn) nextBtn.disabled = !assessmentState.material;
                });
            });
        } else {
            listDiv.innerHTML = '<p class="u-text-muted">No materials found. Upload some materials first.</p>';
        }
    } catch (error) {
        alert('Error loading materials: ' + error.message);
    }
}

// ============================================================
// STEP 3: Recording & Audio Capture
// ============================================================

function renderStep3Record() {
    const material = assessmentState.material;
    const student = assessmentState.student;
    const isRecording = assessmentState.recording;
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="assessment-container">
            <div class="assessment-header">
                <h2>Reading Assessment - ORF Capture</h2>
                <div class="step-indicator">
                    <span class="step done">1. Student</span>
                    <span class="step done">2. Material</span>
                    <span class="step active">3. Record & Process</span>
                    <span class="step">4. Results</span>
                </div>
            </div>

            <div class="assessment-step panel">
                <div class="u-row-between u-gap-8">
                    <h3>Reading Activity</h3>
                    <span id="timer-display" class="timer-display">00:00</span>
                </div>

                <div class="student-badge">
                    <strong>Student:</strong> ${student ? `${escapeAssessmentHtml(student.first_name)} ${escapeAssessmentHtml(student.last_name)}` : ''}
                    <strong class="u-ml-20">Material:</strong> ${material ? escapeAssessmentHtml(material.title) : ''}
                </div>

                <div class="reading-passage reading-passage-shell">
                    <h4 class="u-mt-0">Read the passage below:</h4>
                    <p class="reading-passage-text">${material?.ocr_text ? escapeAssessmentHtml(material.ocr_text) : 'No text available'}</p>
                </div>

                <div class="recording-controls controls-wrap">
                    <button id="play-passage-btn" class="btn-info btn-record">🔊 Hear Passage</button>
                    <button id="start-record-btn" class="btn-primary btn-record ${isRecording ? 'hidden' : ''}">🎤 Start Recording</button>
                    <button id="stop-record-btn" class="btn-danger btn-record ${isRecording ? '' : 'hidden'}">⏹️ Stop Recording</button>
                    <button id="play-record-btn" class="btn-secondary" ${assessmentState.audioBlob ? '' : 'disabled'}>▶️ Playback</button>
                    <button id="clear-record-btn" class="btn-secondary" ${assessmentState.audioBlob ? '' : 'disabled'}>🗑️ Clear</button>
                </div>

                <div id="recording-status" class="recording-status-msg">
                    ${isRecording ? '🔴 Recording in progress...' : 'Recording complete. Ready to submit.'}
                </div>

                <div class="u-actions-row is-between u-mt-20">
                    <button id="back-step-3" class="btn-secondary">← Back</button>
                    <button id="submit-assessment-btn" class="btn-primary" ${assessmentState.audioBlob ? '' : 'disabled'}>Process Audio & View Results →</button>
                </div>
            </div>
        </div>
    `;

    updateAssessmentTimer();

    document.getElementById('play-passage-btn')?.addEventListener('click', playPassageAudio);
    document.getElementById('start-record-btn')?.addEventListener('click', startAssessmentRecording);
    document.getElementById('stop-record-btn')?.addEventListener('click', stopAssessmentRecording);
    document.getElementById('play-record-btn')?.addEventListener('click', playAssessmentRecording);
    document.getElementById('clear-record-btn')?.addEventListener('click', clearAssessmentRecording);
    
    document.getElementById('back-step-3')?.addEventListener('click', () => {
        stopAssessmentRecording(true);
        assessmentState.step = 2;
        renderAssessment();
    });
    document.getElementById('submit-assessment-btn')?.addEventListener('click', submitAssessment);
}

function playPassageAudio() {
    const text = assessmentState.material?.ocr_text || '';
    if (!text) { alert('No passage text available.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    const englishVoice = window.speechSynthesis.getVoices().find(v => v.lang.includes('en'));
    if (englishVoice) utterance.voice = englishVoice;
    utterance.onstart = () => { const btn = document.getElementById('play-passage-btn'); if (btn) btn.textContent = '⏸️ Stop'; };
    utterance.onend = () => { const btn = document.getElementById('play-passage-btn'); if (btn) btn.textContent = '🔊 Hear'; };
    const btn = document.getElementById('play-passage-btn');
    if (btn && window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); btn.textContent = '🔊 Hear'; return; }
    window.speechSynthesis.speak(utterance);
}

async function startAssessmentRecording() {
    try {
        const preferredMic = uiSettings.micDeviceId;
        const audioConstraint = preferredMic ? { deviceId: { exact: preferredMic } } : true;

        try {
            assessmentState.stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
        } catch (error) {
            if (preferredMic && (error.name === 'OverconstrainedError' || error.name === 'NotFoundError')) {
                assessmentState.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                showToast('Preferred mic unavailable, using system default.', 'info');
            } else {
                throw error;
            }
        }

        assessmentState.mediaRecorder = new MediaRecorder(assessmentState.stream);
        assessmentState.audioChunks = [];
        assessmentState.seconds = 0;

        assessmentState.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                assessmentState.audioChunks.push(event.data);
            }
        };

        assessmentState.mediaRecorder.onstop = () => {
            assessmentState.audioBlob = new Blob(assessmentState.audioChunks, { type: 'audio/webm' });
            const submitBtn = document.getElementById('submit-assessment-btn');
            const playBtn = document.getElementById('play-record-btn');
            const clearBtn = document.getElementById('clear-record-btn');
            const statusEl = document.getElementById('recording-status');

            if (submitBtn) submitBtn.disabled = false;
            if (playBtn) playBtn.disabled = false;
            if (clearBtn) clearBtn.disabled = false;
            if (statusEl) statusEl.textContent = 'Recording complete. Ready to submit.';
        };

        assessmentState.mediaRecorder.start();
        assessmentState.recording = true;

        if (assessmentState.timerInterval) {
            clearInterval(assessmentState.timerInterval);
        }

        assessmentState.timerInterval = setInterval(() => {
            assessmentState.seconds += 1;
            updateAssessmentTimer();
        }, 1000);

        const startBtn = document.getElementById('start-record-btn');
        const stopBtn = document.getElementById('stop-record-btn');
        const statusEl = document.getElementById('recording-status');
        if (startBtn) startBtn.classList.add('hidden');
        if (stopBtn) stopBtn.classList.remove('hidden');
        if (statusEl) statusEl.textContent = 'Recording in progress...';
    } catch (error) {
        alert('Error accessing microphone: ' + error.message);
    }
}

function stopAssessmentRecording(silent = false) {
    if (assessmentState.mediaRecorder && assessmentState.mediaRecorder.state === 'recording') {
        assessmentState.mediaRecorder.stop();
    }

    if (assessmentState.stream) {
        assessmentState.stream.getTracks().forEach(track => track.stop());
        assessmentState.stream = null;
    }

    assessmentState.recording = false;

    if (assessmentState.timerInterval) {
        clearInterval(assessmentState.timerInterval);
        assessmentState.timerInterval = null;
    }

    if (!silent) {
        const startBtn = document.getElementById('start-record-btn');
        const stopBtn = document.getElementById('stop-record-btn');
        if (startBtn) startBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
    }
}

function playAssessmentRecording() {
    if (!assessmentState.audioBlob) return;
    if (assessmentState.playbackUrl) {
        URL.revokeObjectURL(assessmentState.playbackUrl);
    }
    assessmentState.playbackUrl = URL.createObjectURL(assessmentState.audioBlob);
    const audio = new Audio(assessmentState.playbackUrl);
    applyAudioOutputPreference(audio);
    audio.play();
}

function clearAssessmentRecording() {
    assessmentState.audioBlob = null;
    assessmentState.audioChunks = [];
    assessmentState.seconds = 0;
    updateAssessmentTimer();

    const playBtn = document.getElementById('play-record-btn');
    const clearBtn = document.getElementById('clear-record-btn');
    const submitBtn = document.getElementById('submit-assessment-btn');
    const statusEl = document.getElementById('recording-status');

    if (playBtn) playBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'Recording cleared.';
}

function updateAssessmentTimer() {
    const mins = String(Math.floor(assessmentState.seconds / 60)).padStart(2, '0');
    const secs = String(assessmentState.seconds % 60).padStart(2, '0');
    const timerEl = document.getElementById('timer-display');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
}

// ============================================================
// STEP 4: Results Display
// ============================================================

function renderStep4Results() {
    const results = assessmentState.results;
    const profile = results?.reading_profile || {};
    const scoreSummary = results?.scores || {};
    const assessmentRecord = results?.assessment || {};
    const hasComprehensionScore = assessmentRecord.comprehension_score !== null && assessmentRecord.comprehension_score !== undefined;
    const orfReadingLevel = scoreSummary.reading_level || assessmentRecord.reading_level || 'Pending';
    const assessmentId = results?.assessment_id || assessmentRecord.assessment_id || null;
    const activityId = results?.activity_id || assessmentRecord.activity_id || null;
    const readingSeconds = profile.reading_time_seconds || scoreSummary.time_seconds || 0;
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="assessment-container">
            <div class="assessment-header">
                <h2>Reading Assessment Results</h2>
                <div class="step-indicator">
                    <span class="step done">1. Student</span>
                    <span class="step done">2. Material</span>
                    <span class="step done">3. Record</span>
                    <span class="step active">4. Results</span>
                </div>
            </div>

            <div class="assessment-step panel">
                <h3>ORF Assessment Results</h3>

                ${results ? `
                        <div class="crla-results-grid crla-grid">
                            <div class="stat-card crla-card-level">
                                <h4 class="u-mt-0">ORF Reading Level</h4>
                                <p class="stat-number stat-number-lg">${orfReadingLevel}</p>
                                <span class="stat-label u-text-md">Based on ASR + ORF comparison</span>
                            </div>

                            <div class="stat-card crla-card-comprehension">
                                <h4 class="u-mt-0">Comprehension Status</h4>
                                <p class="stat-number stat-number-lg">${hasComprehensionScore ? `Scored: ${assessmentRecord.comprehension_score}` : 'Pending'}</p>
                                <span class="stat-label u-text-md">Teacher enters score after the live reading</span>
                            </div>

                            <div class="stat-card crla-card-accuracy">
                                <h4 class="u-mt-0">Accuracy</h4>
                                <p class="stat-number">${safeNumber(profile.accuracy_percentage ?? scoreSummary.accuracy, 2)}%</p>
                                <span class="stat-label">Words correct</span>
                            </div>

                            <div class="stat-card crla-card-wcpm">
                                <h4 class="u-mt-0">WCPM</h4>
                                <p class="stat-number">${safeNumber(profile.wcpm ?? scoreSummary.wcpm, 2)}</p>
                                <span class="stat-label">Words per minute</span>
                            </div>

                            <div class="stat-card crla-card-time">
                                <h4 class="u-mt-0">Time</h4>
                                <p class="stat-number">${Math.floor(readingSeconds / 60)}:${String(readingSeconds % 60).padStart(2, '0')}</p>
                                <span class="stat-label">Reading time</span>
                            </div>
                        </div>

                        <div class="panel u-mt-16">
                            <h4 class="u-mt-0">Miscue Analysis</h4>
                            <div class="miscue-tiles">
                                <div class="miscue-tile miscue-substitution">
                                    <div class="miscue-count">${profile.miscues?.substitutions || scoreSummary.substitutions || 0}</div>
                                    <div class="u-text-muted-xs">Substitutions</div>
                                </div>
                                <div class="miscue-tile miscue-omission">
                                    <div class="miscue-count">${profile.miscues?.omissions || scoreSummary.omissions || 0}</div>
                                    <div class="u-text-muted-xs">Omissions</div>
                                </div>
                                <div class="miscue-tile miscue-insertion">
                                    <div class="miscue-count">${profile.miscues?.insertions || scoreSummary.insertions || 0}</div>
                                    <div class="u-text-muted-xs">Insertions</div>
                                </div>
                                <div class="miscue-tile miscue-repetition">
                                    <div class="miscue-count">${profile.miscues?.repetitions || scoreSummary.repetitions || 0}</div>
                                    <div class="u-text-muted-xs">Repetitions</div>
                                </div>
                            </div>
                        </div>

                        ${hasComprehensionScore && results.interpretation ? `
                            <div class="panel u-mt-16 crla-profile-panel">
                                <h4 class="u-mt-0">CRLA Reading Profile</h4>
                                <p class="u-my-8"><strong>Reading Level:</strong> ${profile.reading_level || assessmentRecord.final_reading_level || 'Pending'}</p>
                                <p class="u-my-8"><strong>Observation Level:</strong> ${profile.observation_level || assessmentRecord.observation_level || 'Pending'}</p>
                                <p class="u-my-8"><strong>Comprehension Score:</strong> ${assessmentRecord.comprehension_score} / 7</p>
                                <p class="u-my-8"><strong>Reading Level:</strong> ${results.interpretation.reading_level_interpretation}</p>
                                <p class="u-my-8"><strong>Fluency Observation:</strong> ${results.interpretation.observation_level_description}</p>
                                ${results.interpretation.intervention_needed ? `
                                    <div class="status-callout danger u-mt-12">
                                        <strong>Intervention Recommended</strong>
                                        <p class="u-mt-6 u-mb-0 u-text-md">This student may benefit from additional support and intervention strategies.</p>
                                    </div>
                                ` : `
                                    <div class="status-callout success u-mt-12">
                                        <strong>✓ On Track</strong>
                                        <p class="u-mt-6 u-mb-0 u-text-md">Continue with grade-level instruction and monitor progress.</p>
                                    </div>
                                `}
                            </div>
                        ` : `
                            <div class="panel u-mt-16 status-callout warning">
                                <h4 class="u-mt-0">Comprehension Score Needed</h4>
                                <p class="u-my-8">ORF scoring is complete. Enter the teacher-scored comprehension result to finalize the CRLA reading level.</p>
                            </div>
                        `}

                    <div class="panel u-mt-16">
                        <h4 class="u-mt-0">Transcribed Text</h4>
                        <div class="transcript-box">
                            ${escapeAssessmentHtml(results.transcript || 'No transcript available')}
                        </div>
                    </div>
                ` : `
                    <p>No results available. Please complete the assessment.</p>
                `}

                <div class="assessment-result-actions u-row-wrap u-gap-12 u-mt-20">
                    <button id="new-assessment-btn" class="btn-primary">New Assessment</button>
                    <button id="enter-comprehension-btn" class="btn-secondary">Enter Comprehension Score</button>
                    <button id="view-history-btn" class="btn-secondary">View History</button>
                    <button id="export-assessment-btn" class="btn-export">Export CSV</button>
                    <button id="print-results-btn" class="btn-secondary">Print Results</button>
                </div>

                <div id="assessment-history" class="u-mt-14"></div>
            </div>
        </div>
    `;

    document.getElementById('new-assessment-btn')?.addEventListener('click', () => {
        resetAssessmentState();
        renderAssessment();
    });

    document.getElementById('enter-comprehension-btn')?.addEventListener('click', () => {
        openComprehensionModal({
            activityId,
            assessmentId,
            studentName: assessmentState.student ? `${assessmentState.student.first_name} ${assessmentState.student.last_name}` : '',
            materialTitle: assessmentState.material?.title || assessmentRecord.material_title || 'Assessment',
            assessedAt: assessmentRecord.assessed_at || null,
            comprehensionScore: assessmentRecord.comprehension_score,
            accuracyPercentage: profile.accuracy_percentage ?? scoreSummary.accuracy,
            wcpm: profile.wcpm ?? scoreSummary.wcpm,
            readingLevel: orfReadingLevel,
            finalReadingLevel: profile.reading_level || assessmentRecord.final_reading_level || null
        });
    });

    document.getElementById('view-history-btn')?.addEventListener('click', loadAssessmentHistory);
    document.getElementById('export-assessment-btn')?.addEventListener('click', () => exportAssessmentResults(assessmentId));
    document.getElementById('print-results-btn')?.addEventListener('click', printAssessmentResults);
}

function printAssessmentResults() {
    const results = assessmentState.results;
    if (!results) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    const profile = results?.reading_profile || results?.scores;
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Assessment Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h2 { color: #0c4a6e; border-bottom: 2px solid #0284c7; padding-bottom: 10px; }
                h3 { color: #334155; margin-top: 20px; }
                .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .info-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
                .info-table td:first-child { font-weight: bold; width: 30%; }
                .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                .stat-box { padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; }
                .stat-label { font-size: 0.9rem; color: #64748b; }
                .stat-value { font-size: 2rem; font-weight: bold; color: #0c4a6e; }
                .miscue-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
                .miscue-item { text-align: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; }
                .miscue-count { font-size: 1.8rem; font-weight: bold; }
                .alert-warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 15px 0; }
                .alert-success { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; margin: 15px 0; }
                .transcript { background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 0.95rem; line-height: 1.6; max-height: 300px; overflow-y: auto; }
            </style>
        </head>
        <body>
            <h2>Reading Assessment Report - CRLA Grade 3</h2>
            
            <h3>Student Information</h3>
            <table class="info-table">
                <tr>
                    <td>Student Name:</td>
                    <td>${assessmentState.student?.first_name} ${assessmentState.student?.last_name}</td>
                </tr>
                <tr>
                    <td>LRN:</td>
                    <td>${assessmentState.student?.lrn || 'N/A'}</td>
                </tr>
                <tr>
                    <td>Grade Level:</td>
                    <td>${assessmentState.student?.grade_level || 'N/A'}</td>
                </tr>
                <tr>
                    <td>Assessment Date:</td>
                    <td>${new Date().toLocaleDateString()}</td>
                </tr>
            </table>

            <h3>Reading Profile</h3>
            <div class="stat-grid">
                <div class="stat-box">
                    <div class="stat-label">Reading Level</div>
                    <div class="stat-value">${profile?.reading_level || 'N/A'}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Observation Level</div>
                    <div class="stat-value">${profile?.observation_level || 'N/A'}</div>
                </div>
            </div>

            <h3>Performance Metrics</h3>
            <table class="info-table">
                <tr>
                    <td>Accuracy:</td>
                    <td>${profile?.accuracy_percentage || results.scores?.accuracy || 0}%</td>
                </tr>
                <tr>
                    <td>WCPM (Words Per Minute):</td>
                    <td>${profile?.wcpm || results.scores?.wcpm || 0}</td>
                </tr>
                <tr>
                    <td>Part 2 Score (Comprehension):</td>
                    <td>${profile?.part2_score || 0} / 25</td>
                </tr>
                <tr>
                    <td>Reading Time:</td>
                    <td>${Math.floor((profile?.reading_time_seconds || results.scores?.time_seconds || 0) / 60)}:${String((profile?.reading_time_seconds || results.scores?.time_seconds || 0) % 60).padStart(2, '0')}</td>
                </tr>
            </table>

            <h3>Miscue Analysis</h3>
            <div class="miscue-grid">
                <div class="miscue-item">
                    <div class="miscue-count">${profile?.miscues?.substitutions || results.scores?.substitutions || 0}</div>
                    <div class="stat-label">Substitutions</div>
                </div>
                <div class="miscue-item">
                    <div class="miscue-count">${profile?.miscues?.omissions || results.scores?.omissions || 0}</div>
                    <div class="stat-label">Omissions</div>
                </div>
                <div class="miscue-item">
                    <div class="miscue-count">${profile?.miscues?.insertions || results.scores?.insertions || 0}</div>
                    <div class="stat-label">Insertions</div>
                </div>
                <div class="miscue-item">
                    <div class="miscue-count">${profile?.miscues?.repetitions || results.scores?.repetitions || 0}</div>
                    <div class="stat-label">Repetitions</div>
                </div>
            </div>

            ${results.interpretation ? `
                <h3>Interpretation</h3>
                <p><strong>Reading Level:</strong> ${results.interpretation.reading_level_interpretation}</p>
                <p><strong>Fluency Observation:</strong> ${results.interpretation.observation_level_description}</p>
                ${results.interpretation.intervention_needed ? `
                    <div class="alert-warning">
                        <strong>Intervention Recommended</strong>
                        <p>This student may benefit from additional support and intervention strategies.</p>
                    </div>
                ` : `
                    <div class="alert-success">
                        <strong>✓ On Track</strong>
                        <p>Continue with grade-level instruction and monitor progress.</p>
                    </div>
                `}
            ` : ''}

            <h3>Transcribed Text</h3>
            <div class="transcript">${results.transcript || 'No transcript available'}</div>

            <div class="report-footer">
                <p>Report generated on ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

async function loadAssessmentHistory() {
    if (!assessmentState.student?.student_id) return;
    const target = document.getElementById('assessment-history');
    if (!target) return;

    target.innerHTML = '<p class="u-text-muted">Loading history...</p>';

    try {
        const data = await fetchJson(`/api/assessment?action=history&student_id=${encodeURIComponent(assessmentState.student.student_id)}`);
        if (!data.success || !Array.isArray(data.history) || data.history.length === 0) {
            target.innerHTML = '<p class="u-text-muted">No assessment history found for this student yet.</p>';
            return;
        }

        target.innerHTML = `
            <div class="panel">
                <h4 class="u-mt-0">Recent History</h4>
                <div class="u-stack-sm">
                    ${data.history.map(item => `
                        <div class="history-item">
                            <strong>${escapeAssessmentHtml(item.material_title || 'Material')}</strong>
                            <div class="u-text-muted-xs u-mt-4">
                                Accuracy: ${Number(item.accuracy_percentage || 0).toFixed(2)}% | WCPM: ${Number(item.wcpm || 0).toFixed(2)} | Level: ${escapeAssessmentHtml(item.reading_level || 'N/A')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        target.innerHTML = `<p class="u-text-danger">Failed to load history: ${escapeAssessmentHtml(error.message)}</p>`;
    }
}

// ============================================================
// SUBMISSION & STATE MANAGEMENT
// ============================================================

async function submitAssessment() {
    if (!assessmentState.audioBlob) {
        alert('Please record audio first.');
        return;
    }
    if (!assessmentState.student?.student_id || !assessmentState.material?.material_id) {
        alert('Student and material are required.');
        return;
    }

    const submitBtn = document.getElementById('submit-assessment-btn');
    const statusEl = document.getElementById('recording-status');
    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'Submitting audio and processing CRLA assessment...';

    try {
        const formData = new FormData();
        formData.append('audio', assessmentState.audioBlob, 'reading.webm');
        formData.append('student_id', String(assessmentState.student.student_id));
        formData.append('material_id', String(assessmentState.material.material_id));
        formData.append('duration_seconds', String(Math.max(1, assessmentState.seconds || 1)));
        formData.append('original_text', String(assessmentState.material.ocr_text || ''));

        const response = await fetch('/api/assessment?action=record', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Assessment processing failed.');
        }

        assessmentState.results = data;
        assessmentState.step = 4;

        renderAssessment();
    } catch (error) {
        if (statusEl) statusEl.textContent = 'Submission failed. Please try again.';
        alert('Assessment error: ' + error.message);
        if (submitBtn) submitBtn.disabled = false;
    }
}

function resetAssessmentState() {
    stopAssessmentRecording(true);
    if (assessmentState.playbackUrl) {
        URL.revokeObjectURL(assessmentState.playbackUrl);
        assessmentState.playbackUrl = null;
    }

    assessmentState.step = 1;
    assessmentState.student = null;
    assessmentState.material = null;
    assessmentState.audioBlob = null;
    assessmentState.recording = false;
    assessmentState.mediaRecorder = null;
    assessmentState.audioChunks = [];
    assessmentState.results = null;
    assessmentState.seconds = 0;
    delete assessmentState.crlaData;
}

function cleanupAssessmentOnLeave() {
    stopAssessmentRecording(true);
}

// ============================================================
// COMPREHENSION MODAL FUNCTIONS (Shared with students.js)
// ============================================================

function ensureComprehensionModal() {
    let modal = document.getElementById('comprehension-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'comprehension-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
        <div class="modal-content comprehension-modal-content">
            <div class="modal-header">
                <h3 id="comprehension-modal-title">Enter Comprehension Score</h3>
                <button type="button" class="close-modal" id="comprehension-modal-close"><span class="icon-error" aria-hidden="true"><svg>...</svg></span></button>
            </div>
            <div id="comprehension-modal-body"></div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#comprehension-modal-close')?.addEventListener('click', () => {
        requestCloseModal('comprehension-modal');
    });

    return modal;
}

function renderComprehensionRows(rows, studentName = '') {
    if (!rows.length) {
        return `
            <div class="comprehension-empty-state">
                <p>No assessments are available for comprehension scoring yet.</p>
            </div>
        `;
    }

    return `
        <div class="comprehension-modal-intro">
            <p>${studentName ? `Update comprehension scores for <strong>${escapeAssessmentHtml(studentName)}</strong>.` : 'Enter the teacher-scored comprehension result after the ORF session.'}</p>
        </div>
        <div class="comprehension-entry-list">
            ${rows.map((row) => `
                <div class="comprehension-entry-card" data-activity-id="${row.activity_id || ''}" data-assessment-id="${row.assessment_id || ''}">
                    <div class="comprehension-entry-head">
                        <div>
                            <h4>${escapeAssessmentHtml(row.material_title || 'Assessment')}</h4>
                            <p>${row.assessed_at ? new Date(row.assessed_at).toLocaleDateString() : (row.activity_date ? new Date(row.activity_date).toLocaleDateString() : 'Assessment date unavailable')}</p>
                        </div>
                        <button type="button" class="btn-export export-assessment-btn" data-assessment-id="${row.assessment_id || ''}">Export CSV</button>
                    </div>
                    <div class="comprehension-entry-metrics">
                        <span>Accuracy: ${safeNumber(row.accuracy_percentage, 1)}%</span>
                        <span>WCPM: ${safeNumber(row.wcpm, 1)}</span>
                        <span>Level: ${escapeAssessmentHtml(row.final_reading_level || row.reading_level || 'Pending')}</span>
                    </div>
                    <div class="comprehension-entry-actions">
                        <label>
                            <span>Comprehension Score</span>
                            <input type="number" min="0" max="7" step="1" class="comprehension-score-input" value="${row.comprehension_score ?? ''}" data-activity-id="${row.activity_id || ''}">
                        </label>
                        <button type="button" class="btn-primary save-comprehension-btn" data-activity-id="${row.activity_id || ''}" data-assessment-id="${row.assessment_id || ''}">Save Score</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function saveComprehensionScore(activityId, score, options = {}) {
    const normalizedScore = Number(score);
    if (!Number.isInteger(normalizedScore) || normalizedScore < 0 || normalizedScore > 7) {
        showToast('Comprehension score must be a whole number from 0 to 7.', 'error');
        return false;
    }

    const result = await fetchJson('/api/assessment?action=update_comprehension', {
        method: 'POST',
        body: JSON.stringify({
            activity_id: activityId,
            comprehension_score: normalizedScore
        })
    });

    if (!result.success) {
        throw new Error(result.message || 'Failed to save comprehension score');
    }

    showToast('Comprehension score saved.', 'success');
    return true;
}

function exportAssessmentResults(assessmentId = null, options = {}) {
    const params = new URLSearchParams({ action: 'export' });
    if (assessmentId) {
        params.set('assessment_id', String(assessmentId));
    }
    if (options.studentId) {
        params.set('student_id', String(options.studentId));
    }

    const link = document.createElement('a');
    link.href = `/api/assessment?${params.toString()}`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

async function openComprehensionModal(options = {}) {
    const modal = ensureComprehensionModal();
    const titleEl = document.getElementById('comprehension-modal-title');
    const bodyEl = document.getElementById('comprehension-modal-body');
    if (!bodyEl) return;

    if (titleEl) {
        titleEl.textContent = options.studentName
            ? `Enter Comprehension Score: ${options.studentName}`
            : 'Enter Comprehension Score';
    }

    bodyEl.innerHTML = '<p class="comprehension-loading">Loading assessment details...</p>';
    showModal('comprehension-modal');

    try {
        let rows = [];
        if (options.studentId) {
            const data = await fetchJson(`/api/assessment?action=history&student_id=${encodeURIComponent(options.studentId)}`);
            rows = Array.isArray(data.history) ? data.history : [];
        } else if (options.activityId) {
            rows = [{
                activity_id: options.activityId,
                assessment_id: options.assessmentId,
                material_title: options.materialTitle,
                assessed_at: options.assessedAt,
                comprehension_score: options.comprehensionScore,
                accuracy_percentage: options.accuracyPercentage,
                wcpm: options.wcpm,
                reading_level: options.readingLevel,
                final_reading_level: options.finalReadingLevel
            }];
        }

        bodyEl.innerHTML = renderComprehensionRows(rows, options.studentName || '');

        bodyEl.querySelectorAll('.save-comprehension-btn').forEach((button) => {
            button.addEventListener('click', async () => {
                const card = button.closest('.comprehension-entry-card');
                const input = card?.querySelector('.comprehension-score-input');
                const activityId = button.dataset.activityId;
                const assessmentId = button.dataset.assessmentId;
                if (!activityId || !(input instanceof HTMLInputElement)) {
                    return;
                }

                try {
                    button.disabled = true;
                    await saveComprehensionScore(activityId, input.value, {
                        assessmentId: assessmentId || options.assessmentId || null
                    });

                    if (options.studentId) {
                        await openComprehensionModal({
                            studentId: options.studentId,
                            studentName: options.studentName
                        });
                        return;
                    }

                    const currentAssessment = assessmentState.results?.assessment;
                    await openComprehensionModal({
                        activityId: assessmentState.results?.activity_id || activityId,
                        assessmentId: assessmentState.results?.assessment_id || assessmentId,
                        materialTitle: currentAssessment?.material_title || options.materialTitle,
                        assessedAt: currentAssessment?.assessed_at || options.assessedAt,
                        comprehensionScore: currentAssessment?.comprehension_score,
                        accuracyPercentage: assessmentState.results?.reading_profile?.accuracy_percentage || options.accuracyPercentage,
                        wcpm: assessmentState.results?.reading_profile?.wcpm || options.wcpm,
                        readingLevel: currentAssessment?.reading_level || assessmentState.results?.scores?.reading_level,
                        finalReadingLevel: currentAssessment?.final_reading_level || assessmentState.results?.reading_profile?.reading_level
                    });
                } catch (error) {
                    showToast(error.message, 'error');
                } finally {
                    button.disabled = false;
                }
            });
        });

        bodyEl.querySelectorAll('.export-assessment-btn').forEach((button) => {
            button.addEventListener('click', () => {
                if (button.dataset.assessmentId) {
                    exportAssessmentResults(button.dataset.assessmentId);
                }
            });
        });
    } catch (error) {
        bodyEl.innerHTML = `<p class="comprehension-error">${escapeAssessmentHtml(error.message)}</p>`;
    }
}