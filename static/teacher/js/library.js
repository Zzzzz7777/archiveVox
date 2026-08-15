// ============================================================
// READING MATERIALS MANAGEMENT
// ============================================================

async function initPage() {
    await loadMaterials();
    renderMaterials();
}

async function loadMaterials() {
    try {
        const data = await fetchJson('/api/materials');
        state.materials = data.materials || [];
    } catch (error) {
        console.error('Error loading materials:', error);
    }
}

function renderMaterials() {
    const materials = state.materials || [];
    const today = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    const getOcrState = (material) => {
        if ((material.ocr_text || '').trim()) return 'OCR Done';

        const rawStatus = (material.status || '').toLowerCase();
        if (rawStatus.includes('process')) return 'Processing';
        if (rawStatus.includes('archive')) return 'Archived';

        return 'Pending';
    };

    const getToken = (value) => String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    
    const viewContainer = document.getElementById('view-container');
    
    viewContainer.innerHTML = `
        <div class="materials-shell">
            <div class="materials-headline">
                <h2>Library</h2>
                <p class="subtitle">${today}</p>
            </div>

            <div class="materials-toolbar">
                <div class="materials-search-wrap">
                    <input type="text" id="search-material" placeholder="Search by title or description" class="filter-search material-search-input">
                </div>
                <div class="materials-toolbar-actions">
                    <button id="upload-material-btn" class="btn-primary material-upload-btn">Upload</button>
                    <button id="refresh-materials-btn" class="btn-secondary">Refresh</button>
                </div>
            </div>

            <div class="filter-bar">
                <select id="filter-grade" class="filter-select">
                    <option value="">All Grades</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                </select>
                <select id="filter-language" class="filter-select">
                    <option value="">All Languages</option>
                    <option value="English">English</option>
                    <option value="Filipino">Filipino</option>
                </select>
                <select id="filter-type" class="filter-select">
                    <option value="">All Types</option>
                    <option value="Phil-IRI">Phil-IRI</option>
                    <option value="CRLA">CRLA</option>
                    <option value="Practice">Practice</option>
                    <option value="Custom">Custom</option>
                </select>
            </div>

            <div class="materials-grid">
                ${materials && materials.length ? 
                    materials.map(material => {
                        const ocrState = getOcrState(material);
                        const ocrToken = getToken(ocrState);
                        const typeToken = getToken(material.material_type || 'Custom');

                        return `
                    <article class="material-card">
                        <div class="material-card-top">
                            <div class="material-title-row">
                                <span class="book-icon" aria-hidden="true">Book</span>
                                <h4>${escapeAssessmentHtml(material.title || 'Untitled Material')}</h4>
                            </div>
                            <span class="material-type" data-type="${typeToken}">${escapeAssessmentHtml(material.material_type || 'Custom')}</span>
                        </div>

                        <div class="material-card-middle">
                            <p class="material-language">${escapeAssessmentHtml(material.language || 'English')}</p>
                            <span class="ocr-state" data-status="${ocrToken}">${escapeAssessmentHtml(ocrState)}</span>
                        </div>

                        <div class="material-meta">
                            <span>${escapeAssessmentHtml(material.grade_level || 'N/A')}</span>
                            <span>${escapeAssessmentHtml(String(material.total_words || 0))} words</span>
                        </div>

                        ${material.description ? `<p class="material-description">${escapeAssessmentHtml(material.description)}</p>` : ''}

                        ${material.ocr_text ? `
                            <div class="material-preview">
                                <details>
                                    <summary>Text Preview</summary>
                                    <p>${escapeAssessmentHtml(material.ocr_text.substring(0, 200))}${material.ocr_text.length > 200 ? '...' : ''}</p>
                                </details>
                            </div>
                        ` : ''}

                        <div class="material-actions">
                            <button type="button" class="action-btn action-btn-primary view-material" data-id="${material.material_id}">Preview</button>
                            <button type="button" class="action-btn action-btn-danger delete-material" data-id="${material.material_id}" title="Delete material">Delete</button>
                        </div>
                    </article>
                `;
                    }).join('')
                : `
                    <div class="empty-state u-col-span-full">
                        <p>No reading materials uploaded yet</p>
                        <p class="u-text-muted">Upload reading materials using the Upload button.</p>
                    </div>
                `}
            </div>
        </div>

        <!-- Upload Material Modal -->
        <div id="upload-modal" class="modal hidden">
            <div class="modal-content modal-wide">
                <div class="modal-header">
                    <h3>Upload Reading Material</h3>
                    <button class="close-modal">x</button>
                </div>
                <form id="upload-material-form" enctype="multipart/form-data">
                    <div class="form-grid">
                        <div class="form-group form-group-full">
                            <label>Title *</label>
                            <input type="text" name="title" placeholder="Enter material title" required>
                        </div>
                        <div class="form-group form-group-full">
                            <label>Description</label>
                            <textarea name="description" placeholder="Brief description of the material" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Grade Level *</label>
                            <select name="grade_level" required>
                                <option value="Grade 2">Grade 2</option>
                                <option value="Grade 3">Grade 3</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Language *</label>
                            <select name="language" required>
                                <option value="English">English</option>
                                <option value="Filipino">Filipino</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Material Type</label>
                            <select name="material_type">
                                <option value="Custom">Custom</option>
                                <option value="Phil-IRI">Phil-IRI</option>
                                <option value="CRLA">CRLA</option>
                                <option value="Practice">Practice</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Difficulty</label>
                            <select name="difficulty">
                                <option value="Easy">Easy</option>
                                <option value="Average" selected>Average</option>
                                <option value="Hard">Hard</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="upload-area" id="upload-drop-zone">
                        <p>Drag & drop an image here, or click to browse</p>
                        <p class="u-text-muted-xs">Upload an image of the reading passage (JPG, PNG, PDF)</p>
                        <input type="file" name="image" accept="image/*,application/pdf" class="hidden" id="file-input">
                    </div>
                    
                    <div id="ocr-result" class="hidden ocr-result-box">
                        <h4 class="u-m-0">OCR Result</h4>
                        <p id="ocr-message" class="u-my-4"></p>
                        <div class="ocr-result-preview">
                            <p id="ocr-text-preview" class="u-m-0 u-pre-wrap"></p>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="btn-primary">Save Material</button>
                        <button type="button" class="btn-secondary close-modal">Cancel</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- View Material Modal -->
        <div id="view-material-modal" class="modal hidden">
            <div class="modal-content modal-wide modal-scroll-80">
                <div class="modal-header">
                    <h3 id="view-material-title">Reading Material</h3>
                    <button class="close-modal">x</button>
                </div>
                <div id="view-material-content"></div>
            </div>
        </div>

    `;

    // Attach event listeners
    document.getElementById('upload-material-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showModal('upload-modal');
    });
    document.getElementById('refresh-materials-btn')?.addEventListener('click', async () => {
        await loadMaterials();
        renderMaterials();
    });
    
    // Filter events
    document.getElementById('filter-grade')?.addEventListener('change', applyMaterialFilters);
    document.getElementById('filter-language')?.addEventListener('change', applyMaterialFilters);
    document.getElementById('filter-type')?.addEventListener('change', applyMaterialFilters);
    document.getElementById('search-material')?.addEventListener('input', applyMaterialFilters);
    
    // Upload form
    document.getElementById('upload-material-form')?.addEventListener('submit', handleMaterialUpload);
    
    // Material actions are delegated so they continue working after re-renders/filtering.
    document.querySelector('.materials-grid')?.addEventListener('click', (event) => {
        let target = event.target;
        if (target && target.nodeType === Node.TEXT_NODE) {
            target = target.parentElement;
        }
        if (!(target instanceof Element)) return;

        const previewBtn = target.closest('.view-material');
        if (previewBtn instanceof HTMLElement) {
            event.preventDefault();
            viewMaterial(previewBtn.dataset.id);
            return;
        }

        const deleteBtn = target.closest('.delete-material');
        if (deleteBtn instanceof HTMLElement) {
            event.preventDefault();
            deleteMaterial(deleteBtn.dataset.id);
        }
    });

    // Direct JS-bound handlers (reliable even when inline handlers are blocked by CSP).
    document.querySelectorAll('.view-material').forEach((btn) => {
        btn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            viewMaterial(btn.dataset.id);
        };
    });

    document.querySelectorAll('.delete-material').forEach((btn) => {
        btn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            deleteMaterial(btn.dataset.id);
        };
    });
    
    // Upload drop zone
    setupUploadDropZone();

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', async () => {
            const modal = btn.closest('.modal');
            if (modal?.id) {
                await requestCloseModal(modal.id);
                return;
            }
            document.querySelectorAll('.modal').forEach(m => {
                if (m.id) requestCloseModal(m.id);
            });
        });
    });
}

function applyMaterialFilters() {
    const grade = document.getElementById('filter-grade')?.value || '';
    const language = document.getElementById('filter-language')?.value || '';
    const type = document.getElementById('filter-type')?.value || '';
    const search = document.getElementById('search-material')?.value?.toLowerCase() || '';

    const cards = document.querySelectorAll('.material-card');
    cards.forEach(card => {
        let show = true;

        if (grade) {
            const cardGrade = card.querySelector('.material-meta span:first-child')?.textContent || '';
            if (!cardGrade.includes(grade)) show = false;
        }

        if (language) {
            const cardLang = card.querySelector('.material-language')?.textContent || '';
            if (cardLang !== language) show = false;
        }

        if (type) {
            const cardType = card.querySelector('.material-type')?.textContent || '';
            if (cardType !== type) show = false;
        }

        if (search) {
            const title = card.querySelector('h4')?.textContent?.toLowerCase() || '';
            const desc = card.querySelector('.material-description')?.textContent?.toLowerCase() || '';
            if (!title.includes(search) && !desc.includes(search)) show = false;
        }

        card.style.display = show ? '' : 'none';
    });
}

function setupUploadDropZone() {
    const dropZone = document.getElementById('upload-drop-zone');
    const fileInput = document.getElementById('file-input');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--accent)';
        dropZone.style.background = 'var(--accent-soft)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--border)';
        dropZone.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border)';
        dropZone.style.background = 'transparent';
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        }
    });

    fileInput.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            const formData = new FormData();
            formData.append('image', this.files[0]);
            formData.append('language', document.querySelector('select[name="language"]')?.value || 'English');

            const resultDiv = document.getElementById('ocr-result');
            const messageEl = document.getElementById('ocr-message');
            const previewEl = document.getElementById('ocr-text-preview');

            resultDiv.classList.remove('hidden');
            messageEl.textContent = '⏳ Processing OCR...';
            previewEl.textContent = 'Please wait...';

            try {
                const response = await fetch('/api/shared/reading-materials.php?action=preview-ocr', {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                });
                const data = await response.json();

                if (data.success && data.ocr_text) {
                    messageEl.textContent = '' + data.ocr_message;
                    previewEl.textContent = data.ocr_text;

                    const titleInput = document.querySelector('input[name="title"]');
                    if (titleInput && !titleInput.value) {
                        const firstLine = data.ocr_text.split('\n')[0].trim();
                        if (firstLine && firstLine.length > 3) {
                            titleInput.value = firstLine.substring(0, 100);
                        }
                    }
                } else {
                    messageEl.innerHTML = '<span class="icon-error" aria-hidden="true"><svg>...</svg></span>' + (data.ocr_message || 'OCR could not extract text from this image.');
                    previewEl.textContent = 'No text extracted. Please enter the text manually.';
                }
            } catch (error) {
                messageEl.textContent = 'Error: ' + error.message;
                previewEl.textContent = 'OCR service error. Please enter the text manually.';
            }
        }
    });
}

async function handleMaterialUpload(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/shared/reading-materials.php', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Material uploaded successfully!');
            closeModal('upload-modal');
            await loadMaterials();
            renderMaterials();
            form.reset();
            document.getElementById('ocr-result').classList.add('hidden');
        } else {
            alert('' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function viewMaterial(materialId) {
    if (!materialId) {
        alert('No material selected.');
        return;
    }

    try {
        const data = await fetchJson(`/api/shared/reading-materials.php?id=${encodeURIComponent(materialId)}`);
        
        if (!data.success || !data.material) {
            alert('Material not found.');
            return;
        }

        const material = data.material;
        const esc = escapeAssessmentHtml;

        const titleEl = document.getElementById('view-material-title');
        if (titleEl) titleEl.textContent = material.title || 'Reading Material';

        const contentEl = document.getElementById('view-material-content');
        if (contentEl) {
            contentEl.innerHTML = `
                <form id="view-material-form">
                    <div class="editor-state-row">
                        <span id="material-editor-badge" class="editor-badge">Preview Mode</span>
                    </div>
                    <div class="u-grid-2 u-gap-8 u-text-md u-mb-12">
                        <p><strong>Words:</strong> ${Number(material.total_words || 0)}</p>
                        <p><strong>Uploaded:</strong> ${material.upload_date ? new Date(material.upload_date).toLocaleDateString() : 'N/A'}</p>
                    </div>

                    <div class="form-grid">
                        <div class="form-group form-group-full">
                            <label>Title</label>
                            <input id="material-edit-title" name="title" type="text" value="${esc(material.title || '')}" disabled>
                        </div>
                        <div class="form-group">
                            <label>Grade Level</label>
                            <select id="material-edit-grade" name="grade_level" disabled>
                                <option value="Grade 2" ${material.grade_level === 'Grade 2' ? 'selected' : ''}>Grade 2</option>
                                <option value="Grade 3" ${material.grade_level === 'Grade 3' ? 'selected' : ''}>Grade 3</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Language</label>
                            <select id="material-edit-language" name="language" disabled>
                                <option value="English" ${material.language === 'English' ? 'selected' : ''}>English</option>
                                <option value="Filipino" ${material.language === 'Filipino' ? 'selected' : ''}>Filipino</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Type</label>
                            <select id="material-edit-type" name="material_type" disabled>
                                <option value="Custom" ${material.material_type === 'Custom' ? 'selected' : ''}>Custom</option>
                                <option value="Phil-IRI" ${material.material_type === 'Phil-IRI' ? 'selected' : ''}>Phil-IRI</option>
                                <option value="CRLA" ${material.material_type === 'CRLA' ? 'selected' : ''}>CRLA</option>
                                <option value="Practice" ${material.material_type === 'Practice' ? 'selected' : ''}>Practice</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Difficulty</label>
                            <select id="material-edit-difficulty" name="difficulty" disabled>
                                <option value="Easy" ${material.difficulty === 'Easy' ? 'selected' : ''}>Easy</option>
                                <option value="Average" ${material.difficulty === 'Average' ? 'selected' : ''}>Average</option>
                                <option value="Hard" ${material.difficulty === 'Hard' ? 'selected' : ''}>Hard</option>
                            </select>
                        </div>
                        <div class="form-group form-group-full">
                            <label>Status</label>
                            <select id="material-edit-status" name="status" disabled>
                                <option value="Active" ${material.status === 'Active' ? 'selected' : ''}>Active</option>
                                <option value="Archived" ${material.status === 'Archived' ? 'selected' : ''}>Archived</option>
                                <option value="Processing" ${material.status === 'Processing' ? 'selected' : ''}>Processing</option>
                            </select>
                        </div>
                        <div class="form-group form-group-full">
                            <label>Description</label>
                            <textarea id="material-edit-description" name="description" rows="3" disabled>${esc(material.description || '')}</textarea>
                        </div>
                        <div class="form-group form-group-full">
                            <label>Full Text</label>
                            <textarea id="material-edit-ocr" name="ocr_text" rows="10" disabled>${esc(material.ocr_text || '')}</textarea>
                        </div>
                    </div>

                    <div class="modal-actions u-mt-12">
                        <button id="view-material-edit-btn" type="button" class="btn-primary">Edit Material</button>
                        <button id="view-material-save-btn" type="submit" class="btn-primary hidden">Save Changes</button>
                        <button id="view-material-cancel-btn" type="button" class="btn-secondary hidden">Cancel</button>
                        <button id="view-material-close-btn" type="button" class="btn-secondary">Close</button>
                    </div>
                </form>
            `;

            const form = document.getElementById('view-material-form');
            const modal = document.getElementById('view-material-modal');
            const fields = form?.querySelectorAll('input, select, textarea');
            const editBtn = document.getElementById('view-material-edit-btn');
            const saveBtn = document.getElementById('view-material-save-btn');
            const cancelBtn = document.getElementById('view-material-cancel-btn');
            const closeBtn = document.getElementById('view-material-close-btn');
            const badge = document.getElementById('material-editor-badge');

            if (modal) {
                modal.dataset.dirty = 'false';
                modal.dataset.dirtyMessage = 'Discard your material changes?';
            }

            const setEditing = (editing) => {
                fields?.forEach((field) => {
                    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
                        field.disabled = !editing;
                    }
                });
                editBtn?.classList.toggle('hidden', editing);
                saveBtn?.classList.toggle('hidden', !editing);
                cancelBtn?.classList.toggle('hidden', !editing);
                if (badge) {
                    badge.textContent = editing ? 'Editing' : 'Preview Mode';
                    badge.classList.toggle('editing', editing);
                }
                if (!editing && modal) {
                    modal.dataset.dirty = 'false';
                }
            };

            editBtn?.addEventListener('click', () => setEditing(true));
            cancelBtn?.addEventListener('click', async () => {
                if (modal?.dataset.dirty === 'true') {
                    const shouldDiscard = await showConfirm('Discard your material changes?', {
                        title: 'Unsaved Changes',
                        confirmLabel: 'Discard Changes',
                        confirmTone: 'danger'
                    });
                    if (!shouldDiscard) return;
                }
                await viewMaterial(material.material_id);
            });
            closeBtn?.addEventListener('click', () => requestCloseModal('view-material-modal'));

            form?.addEventListener('input', () => {
                if (!saveBtn?.classList.contains('hidden') && modal) {
                    modal.dataset.dirty = 'true';
                }
            });

            form?.addEventListener('submit', async (event) => {
                event.preventDefault();

                clearFormErrors(form);

                const titleField = document.getElementById('material-edit-title');
                const ocrField = document.getElementById('material-edit-ocr');

                const payload = {
                    title: String(titleField?.value || '').trim(),
                    description: String(document.getElementById('material-edit-description')?.value || '').trim(),
                    grade_level: String(document.getElementById('material-edit-grade')?.value || '').trim(),
                    language: String(document.getElementById('material-edit-language')?.value || '').trim(),
                    material_type: String(document.getElementById('material-edit-type')?.value || '').trim(),
                    difficulty: String(document.getElementById('material-edit-difficulty')?.value || '').trim(),
                    status: String(document.getElementById('material-edit-status')?.value || '').trim(),
                    ocr_text: String(ocrField?.value || '').trim(),
                    total_words: String(ocrField?.value || '').trim().split(/\s+/).filter(word => word.length > 0).length
                };

                let hasErrors = false;
                if (!payload.title) {
                    setFieldError(titleField, 'Material title is required.');
                    hasErrors = true;
                }

                if (!payload.ocr_text) {
                    setFieldError(ocrField, 'Full text is required for assessment use.');
                    hasErrors = true;
                }

                if (hasErrors) {
                    showToast('Please correct the highlighted material fields.', 'error');
                    return;
                }

                try {
                    const update = await fetchJson(`/api/shared/reading-materials.php?id=${encodeURIComponent(material.material_id)}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });

                    if (!update.success) {
                        throw new Error(update.message || 'Failed to update material');
                    }

                    showToast('Material updated successfully!', 'success');
                    await loadMaterials();
                    renderMaterials();
                    await viewMaterial(material.material_id);
                } catch (error) {
                    showToast('Error updating material: ' + error.message, 'error');
                }
            });
        }

        showModal('view-material-modal');

    } catch (error) {
        alert('Error loading material: ' + error.message);
    }
}

async function editMaterial(materialId) {
    await viewMaterial(materialId);
}

async function deleteMaterial(materialId) {
    const shouldDelete = await showConfirm('Are you sure you want to delete this material?', {
        title: 'Delete Material',
        confirmLabel: 'Delete',
        confirmTone: 'danger'
    });
    if (!shouldDelete) return;
    
    try {
        const result = await fetchJson(`/api/shared/reading-materials.php?id=${encodeURIComponent(materialId)}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            alert('✅ Material deleted successfully');
            await loadMaterials();
            renderMaterials();
        } else {
            alert('' + result.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}