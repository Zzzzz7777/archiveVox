// ============================================================
// STUDENT MANAGEMENT
// ============================================================

async function initPage() {
    await loadStudents();
}

async function loadStudents() {
    try {
        const data = await fetchJson('/api/students');
        console.log('Students API response:', data);
        if (data.success) {
            state.students = data.students || [];
            console.log('Students loaded:', state.students.length);
            renderStudents();
        } else {
            console.error('API returned success=false:', data);
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function renderStudents() {
    const students = state.students || [];
    const viewContainer = document.getElementById('view-container');
    
    viewContainer.innerHTML = `
        <div class="page-header">
            <div class="page-header-left">
                <h2>Student Management</h2>
                <p class="subtitle">Manage your students and track their reading progress</p>
            </div>
            <div class="page-header-right">
                <button id="add-student-btn" class="btn-primary">Add Student</button>
                <button id="import-students-btn" class="btn-secondary">Import</button>
                <button id="refresh-students-btn" class="btn-secondary">Refresh</button>
            </div>
        </div>
        
        <div class="search-bar">
            <input type="text" id="student-search-input" placeholder="Search by LRN, name, or section..." class="input-inline-fill">
            <button id="search-students-btn" class="btn-primary">Search</button>
        </div>
        
        <div class="panel u-mt-20 u-scroll-x">
            ${students.length ? `
                <table>
                    <thead>
                        <tr>
                            <th>LRN</th>
                            <th>Name</th>
                            <th>Grade</th>
                            <th>Section</th>
                            <th>Activities</th>
                            <th>Last Assessed</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(student => `
                            <tr>
                                <td><strong>${escapeAssessmentHtml(student.lrn || '-')}</strong></td>
                                <td>${escapeAssessmentHtml(`${student.last_name || ''}, ${student.first_name || ''} ${student.middle_name || ''}`.trim())}</td>
                                <td>${escapeAssessmentHtml(student.grade_level || '-')}</td>
                                <td>${escapeAssessmentHtml(student.section || '-')}</td>
                                <td>${escapeAssessmentHtml(String(student.activity_count || 0))}</td>
                                <td>${escapeAssessmentHtml(student.last_assessed ? new Date(student.last_assessed).toLocaleDateString() : '-')}</td>
                                <td><span class="status-badge ${student.is_active ? 'active' : 'archived'}">${student.is_active ? 'Active' : 'Archived'}</span></td>
                                <td>
                                    <button class="action-btn open-comprehension" data-id="${student.student_id}" data-name="${escapeAssessmentHtml(`${student.first_name || ''} ${student.last_name || ''}`.trim())}">Scores</button>
                                    <button class="action-btn edit-student" data-id="${student.student_id}">Edit</button>
                                    <button class="action-btn archive-student" data-id="${student.student_id}">Archive</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <div class="empty-state">
                    <p>No students added yet</p>
                    <p class="u-text-muted">Click "Add Student" to add your first student, or "Import" to bulk upload</p>
                </div>
            `}
        </div>
        
        <!-- Add Student Modal -->
        <div id="add-student-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Student</h3>
                    <button class="close-modal">x</button>
                </div>
                <form id="add-student-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>LRN (6 digits) *</label>
                            <input type="text" name="lrn" placeholder="e.g. 123456" maxlength="6" required>
                            <small class="u-text-muted">Unique 6-digit Learner Reference Number</small>
                        </div>
                        <div class="form-group">
                            <label>First Name *</label>
                            <input type="text" name="first_name" required>
                        </div>
                        <div class="form-group">
                            <label>Middle Name</label>
                            <input type="text" name="middle_name">
                        </div>
                        <div class="form-group">
                            <label>Last Name *</label>
                            <input type="text" name="last_name" required>
                        </div>
                        <div class="form-group">
                            <label>Grade Level</label>
                            <select name="grade_level">
                                <option value="Grade 2">Grade 2</option>
                                <option value="Grade 3">Grade 3</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Section</label>
                            <input type="text" name="section" placeholder="e.g. Section A">
                        </div>
                        <div class="form-group">
                            <label>Gender</label>
                            <select name="gender">
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Birthdate</label>
                            <input type="date" name="birthdate">
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn-primary">Save Student</button>
                        <button type="button" class="btn-secondary close-modal">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Import Modal -->
        <div id="import-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Import Students</h3>
                    <button class="close-modal">x</button>
                </div>
                <div class="import-instructions">
                    <p>Upload a CSV or Excel file with student data.</p>
                    <p><strong>Required columns:</strong> lrn, first_name, last_name</p>
                    <p><strong>Optional:</strong> middle_name, grade_level, section, gender, birthdate</p>
                    <div class="import-tip-box u-mt-8">
                        <p class="u-m-0 u-text-muted-xs">
                            <strong>Tip:</strong> LRN should be a 6-digit number (e.g., 123456)
                        </p>
                    </div>
                </div>
                <form id="import-form" enctype="multipart/form-data">
                    <div class="form-group">
                        <label>Select File (CSV or Excel)</label>
                        <input type="file" name="file" accept=".csv,.xlsx" required>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn-primary">Import</button>
                        <button type="button" class="btn-secondary close-modal">Cancel</button>
                    </div>
                </form>
                <div id="import-result"></div>
            </div>
        </div>

        <!-- Edit Student Modal -->
        <div id="edit-student-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Student</h3>
                    <button class="close-modal">x</button>
                </div>
                <form id="edit-student-form">
                    <input type="hidden" name="student_id" id="edit-student-id">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>LRN (6 digits) *</label>
                            <input type="text" name="lrn" id="edit-lrn" maxlength="6" required>
                        </div>
                        <div class="form-group">
                            <label>First Name *</label>
                            <input type="text" name="first_name" id="edit-first-name" required>
                        </div>
                        <div class="form-group">
                            <label>Middle Name</label>
                            <input type="text" name="middle_name" id="edit-middle-name">
                        </div>
                        <div class="form-group">
                            <label>Last Name *</label>
                            <input type="text" name="last_name" id="edit-last-name" required>
                        </div>
                        <div class="form-group">
                            <label>Gender</label>
                            <select name="gender" id="edit-gender">
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Birthdate</label>
                            <input type="date" name="birthdate" id="edit-birthdate">
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn-primary">Save Changes</button>
                        <button type="button" class="btn-secondary close-modal">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Attach event listeners
    document.getElementById('add-student-btn')?.addEventListener('click', () => showModal('add-student-modal'));
    document.getElementById('import-students-btn')?.addEventListener('click', () => showModal('import-modal'));
    document.getElementById('refresh-students-btn')?.addEventListener('click', loadStudents);
    document.getElementById('search-students-btn')?.addEventListener('click', searchStudents);
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal?.id) {
                closeModal(modal.id);
            }
        });
    });
    
    document.querySelectorAll('.edit-student').forEach(btn => {
        btn.addEventListener('click', () => editStudent(btn.dataset.id));
    });

    document.querySelectorAll('.open-comprehension').forEach(btn => {
        btn.addEventListener('click', () => {
            openComprehensionModal({
                studentId: btn.dataset.id,
                studentName: btn.dataset.name || ''
            });
        });
    });
    
    document.querySelectorAll('.archive-student').forEach(btn => {
        btn.addEventListener('click', () => archiveStudent(btn.dataset.id));
    });
    
    // Add Student Form
    document.getElementById('add-student-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const result = await fetchJson('/api/students', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            if (result.success) {
                alert('Student added successfully!');
                document.getElementById('add-student-modal').classList.add('hidden');
                await loadStudents();
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert(error.message);
        }
    });
    
    // Import Form
    document.getElementById('import-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const resultDiv = document.getElementById('import-result');
        resultDiv.innerHTML = '<p class="u-text-muted">Processing file...</p>';
        
        try {
            const response = await fetch('/api/student-import?action=preview', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });
            const data = await response.json();
            
            if (data.success && data.preview) {
                const preview = data.preview;
                
                let html = `
                    <div class="import-preview">
                        <h4>Preview</h4>
                        <div class="u-grid-3 u-gap-8 u-mb-12">
                            <div class="metric-chip">
                                <p class="u-m-0 u-text-muted-xs">Total rows</p>
                                <p class="u-m-0 metric-number">${preview.summary.total}</p>
                            </div>
                            <div class="metric-chip" style="border-left: 3px solid #22c55e;">
                                <p class="u-m-0 u-text-muted-xs">Valid rows</p>
                                <p class="u-m-0 metric-number" style="color: #22c55e;">${preview.summary.valid}</p>
                            </div>
                            <div class="metric-chip" style="border-left: 3px solid #ef4444;">
                                <p class="u-m-0 u-text-muted-xs">Errors</p>
                                <p class="u-m-0 metric-number" style="color: #ef4444;">${preview.summary.errors}</p>
                            </div>
                        </div>
                `;
                
                if (preview.rows && preview.rows.length > 0) {
                    html += `
                        <div class="preview-table-wrap">
                            <table class="table-sm">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>LRN</th>
                                        <th>First Name</th>
                                        <th>Last Name</th>
                                        <th>Grade</th>
                                        <th>Section</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${preview.rows.slice(0, 10).map(row => `
                                        <tr>
                                            <td>${escapeAssessmentHtml(String(row.row_number || ''))}</td>
                                            <td><strong>${escapeAssessmentHtml(row.lrn || '-')}</strong></td>
                                            <td>${escapeAssessmentHtml(row.first_name || '')}</td>
                                            <td>${escapeAssessmentHtml(row.last_name || '')}</td>
                                            <td>${escapeAssessmentHtml(row.grade_level || '-')}</td>
                                            <td>${escapeAssessmentHtml(row.section || '-')}</td>
                                        </tr>
                                    `).join('')}
                                    ${preview.rows.length > 10 ? `<tr><td colspan="6" class="u-text-muted">... and ${preview.rows.length - 10} more</td></tr>` : ''}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
                
                if (preview.errors && preview.errors.length > 0) {
                    html += `
                        <div class="import-error-box u-my-8">
                            <p class="u-text-danger u-m-0"><strong>${preview.errors.length} error(s):</strong></p>
                            <ul class="u-text-muted-xs u-my-4">
                                ${preview.errors.slice(0, 5).map(err => `
                                    <li>Row ${escapeAssessmentHtml(String(err.row_number || ''))}: ${escapeAssessmentHtml(err.message || '')}</li>
                                `).join('')}
                                ${preview.errors.length > 5 ? `<li>... and ${preview.errors.length - 5} more</li>` : ''}
                            </ul>
                        </div>
                    `;
                }
                
                if (preview.summary.valid > 0) {
                    html += `
                        <button id="confirm-import-btn" class="btn-primary u-mt-12">
                            Confirm Import (${preview.summary.valid} students)
                        </button>
                    `;
                }
                
                html += `</div>`;
                resultDiv.innerHTML = html;
                
                document.getElementById('confirm-import-btn')?.addEventListener('click', async () => {
                    const confirmBtn = document.getElementById('confirm-import-btn');
                    confirmBtn.textContent = 'Importing...';
                    confirmBtn.disabled = true;
                    
                    try {
                        const response2 = await fetch('/api/student-import?action=import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ rows: preview.rows }),
                            credentials: 'same-origin'
                        });
                        
                        const result2 = await response2.json();
                        
                        if (result2.success) {
                            alert(`Import complete!\n\nImported: ${result2.summary.imported}\nSkipped: ${result2.summary.skipped}\nErrors: ${result2.summary.errors}`);
                            document.getElementById('import-modal').classList.add('hidden');
                            await loadStudents();
                        } else {
                            alert('Import failed: ' + (result2.message || 'Unknown error'));
                        }
                    } catch (error) {
                        alert('Error during import: ' + error.message);
                    }
                });
                
            } else {
                resultDiv.innerHTML = `<p class="u-text-danger">${escapeAssessmentHtml(data.message || 'Failed to preview file')}</p>`;
            }
        } catch (error) {
            console.error('Import error:', error);
            resultDiv.innerHTML = `<p class="u-text-danger">Error: ${escapeAssessmentHtml(error.message)}</p>`;
        }
    });
    
    // Edit Student Form
    document.getElementById('edit-student-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const studentId = String(formData.get('student_id') || '').trim();

        if (!studentId) {
            alert('Missing student id.');
            return;
        }

        const payload = {
            lrn: String(formData.get('lrn') || '').trim(),
            first_name: String(formData.get('first_name') || '').trim(),
            middle_name: String(formData.get('middle_name') || '').trim(),
            last_name: String(formData.get('last_name') || '').trim(),
            gender: String(formData.get('gender') || '').trim(),
            birthdate: String(formData.get('birthdate') || '').trim()
        };

        clearFormErrors(e.target);

        const lrnField = document.getElementById('edit-lrn');
        const firstNameField = document.getElementById('edit-first-name');
        const lastNameField = document.getElementById('edit-last-name');

        let hasErrors = false;

        if (!/^\d{6}$/.test(payload.lrn)) {
            setFieldError(lrnField, 'LRN must be exactly 6 digits.');
            hasErrors = true;
        }

        if (!payload.first_name) {
            setFieldError(firstNameField, 'First name is required.');
            hasErrors = true;
        }

        if (!payload.last_name) {
            setFieldError(lastNameField, 'Last name is required.');
            hasErrors = true;
        }

        if (hasErrors) {
            showToast('Please correct the highlighted student fields.', 'error');
            return;
        }

        try {
            const result = await fetchJson(`/api/students?id=${encodeURIComponent(studentId)}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (result.success) {
                alert('Student updated successfully!');
                document.getElementById('edit-student-modal')?.classList.add('hidden');
                await loadStudents();
            } else {
                alert(result.message || 'Failed to update student');
            }
        } catch (error) {
            alert(error.message);
        }
    });
}

async function searchStudents() {
    const term = document.getElementById('student-search-input')?.value || '';
    if (term.length < 2) {
        await loadStudents();
        return;
    }
    
    try {
        const data = await fetchJson(`/api/students?action=search&term=${encodeURIComponent(term)}`);
        state.students = data.students || [];
        renderStudents();
    } catch (error) {
        console.error('Search error:', error);
    }
}

async function editStudent(studentId) {
    try {
        const data = await fetchJson(`/api/students?action=get&id=${encodeURIComponent(studentId)}`);
        if (!data.success || !data.student) {
            alert('Student not found.');
            return;
        }

        const student = data.student;
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };

        setValue('edit-student-id', student.student_id);
        setValue('edit-lrn', student.lrn);
        setValue('edit-first-name', student.first_name);
        setValue('edit-middle-name', student.middle_name);
        setValue('edit-last-name', student.last_name);
        setValue('edit-gender', student.gender);
        setValue('edit-birthdate', student.birthdate);

        showModal('edit-student-modal');
    } catch (error) {
        alert('Error loading student: ' + error.message);
    }
}

async function archiveStudent(studentId) {
    const shouldArchive = await showConfirm('Are you sure you want to archive this student?', {
        title: 'Archive Student',
        confirmLabel: 'Archive',
        confirmTone: 'danger'
    });
    if (!shouldArchive) return;
    
    try {
        const result = await fetchJson(`/api/students?id=${studentId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            alert('Student archived successfully');
            await loadStudents();
        } else {
            alert('' + result.message);
        }
    } catch (error) {
        alert('' + error.message);
    }
}

// Comprehension modal functions (shared with assessment.js)
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