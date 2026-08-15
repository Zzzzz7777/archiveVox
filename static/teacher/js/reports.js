// ============================================================
// REPORTING & ANALYTICS
// ============================================================

async function initPage() {
    renderReports();
}

function renderReports() {
    const role = String(state.user?.role || '').toLowerCase();

    if (role === 'principal' || role === 'admin') {
        renderPrincipalReports();
    } else if (role === 'teacher') {
        renderTeacherReports();
    } else {
        renderDefaultReports();
    }
}

function renderDefaultReports() {
    const viewContainer = document.getElementById('view-container');
    viewContainer.innerHTML = `
        <div class="panel">
            <h3>📃 Reports</h3>
            <p>Reports not available for your role</p>
        </div>
    `;
}

function renderPrincipalReports() {
    const viewContainer = document.getElementById('view-container');
    viewContainer.innerHTML = `
        <div class="reports-shell">
            <div class="reports-headline">
                <h2>School Reports</h2>
                <p class="subtitle">School-wide reading progress analytics</p>
            </div>

            <div class="reports-toolbar">
                <div class="u-row-wrap u-gap-8">
                    <button id="report-school-wide" class="btn-primary">📚 School Overview</button>
                    <button id="report-by-grade" class="btn-secondary">📋 By Grade Level</button>
                    <button id="report-materials" class="btn-secondary">📚 Material Usage</button>
                    <button id="export-assessments-btn" class="btn-export">Export CSV</button>
                    <button id="refresh-reports-btn" class="btn-secondary">Refresh</button>
                </div>
            </div>

            <div id="report-content" class="u-mt-16">
                <div class="panel">
                    <p class="u-text-muted">Select a report type to view</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('report-school-wide')?.addEventListener('click', () => loadAndDisplayReport('school-wide'));
    document.getElementById('report-by-grade')?.addEventListener('click', () => loadAndDisplayReport('class-performance'));
    document.getElementById('report-materials')?.addEventListener('click', () => loadAndDisplayReport('material-usage'));
    document.getElementById('export-assessments-btn')?.addEventListener('click', () => exportAssessmentResults());
    document.getElementById('refresh-reports-btn')?.addEventListener('click', () => renderPrincipalReports());
}

function renderTeacherReports() {
    const viewContainer = document.getElementById('view-container');
    viewContainer.innerHTML = `
        <div class="reports-shell">
            <div class="reports-headline">
                <h2>Class Reports</h2>
                <p class="subtitle">Your class performance analytics</p>
            </div>

            <div class="reports-toolbar">
                <div class="u-row-wrap u-gap-8">
                    <button id="report-class-performance" class="btn-primary">📚 Class Performance</button>
                    <button id="refresh-reports-btn" class="btn-secondary">Refresh</button>
                </div>
            </div>

            <div id="report-content" class="u-mt-16">
                <div class="panel">
                    <p class="u-text-muted">Click above to view your class performance report</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('report-class-performance')?.addEventListener('click', () => loadAndDisplayReport('class-performance'));
    document.getElementById('refresh-reports-btn')?.addEventListener('click', () => renderTeacherReports());
}

async function loadAndDisplayReport(reportType) {
    const contentDiv = document.getElementById('report-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = '<div class="panel"><p class="u-text-muted u-text-center">⏳ Loading report...</p></div>';

    try {
        const data = await fetchJson(`/api/reports?action=${encodeURIComponent(reportType)}`);
        
        if (data.success) {
            state.reportData = data;
            displayReport(reportType, data);
        } else {
            contentDiv.innerHTML = `<div class="panel"><p class="u-text-danger">${data.message}</p></div>`;
        }
    } catch (error) {
        contentDiv.innerHTML = `<div class="panel"><p class="u-text-danger">Error loading report: ${error.message}</p></div>`;
    }
}

function displayReport(reportType, data) {
    const contentDiv = document.getElementById('report-content');
    if (!contentDiv) return;

    if (reportType === 'school-wide') {
        const gradeStats = data.grade_statistics || [];
        const topPerformers = data.top_performers || [];
        const intervention = data.intervention_needed || [];

        contentDiv.innerHTML = `
            <div class="report-grid-3">
                <!-- Grade Statistics -->
                <div class="panel">
                    <h3>By Grade Level</h3>
                    <div class="u-max-h-400 u-scroll-y">
                        ${gradeStats.length ? gradeStats.map(stat => `
                            <div class="list-row-sm">
                                <p class="u-m-0 u-fw-600">${stat.grade_level}</p>
                                <div class="u-text-muted-xs u-mt-4">
                                    Students: ${stat.student_count} | Avg WCPM: ${Number(stat.avg_wcpm || 0).toFixed(1)}
                                </div>
                            </div>
                        `).join('') : '<p class="u-text-muted">No data</p>'}
                    </div>
                </div>

                <!-- Top Performers -->
                <div class="panel">
                    <h3>Top Performers</h3>
                    <div class="u-max-h-400 u-scroll-y">
                        ${topPerformers.length ? topPerformers.map(student => `
                            <div class="list-row-sm">
                                <p class="u-m-0 u-fw-600">${student.first_name} ${student.last_name}</p>
                                <div class="u-text-muted-xs u-mt-4">
                                    Grade: ${student.grade_level} | Avg WCPM: ${Number(student.avg_wcpm || 0).toFixed(1)}
                                </div>
                            </div>
                        `).join('') : '<p class="u-text-muted">No data</p>'}
                    </div>
                </div>

                <!-- Intervention Needed -->
                <div class="panel status-callout warning report-warning-panel">
                    <h3>Needs Intervention</h3>
                    <div class="u-max-h-400 u-scroll-y">
                        ${intervention.length ? intervention.map(student => `
                            <div class="list-row-soft">
                                <p class="u-m-0 u-fw-600">${student.first_name} ${student.last_name}</p>
                                <div class="u-text-danger-xs u-mt-4">
                                    Grade: ${student.grade_level} | Avg WCPM: ${Number(student.avg_wcpm || 0).toFixed(1)}
                                </div>
                            </div>
                        `).join('') : '<p class="u-text-muted">No data</p>'}
                    </div>
                </div>
            </div>
        `;
    } else if (reportType === 'material-usage') {
        const materials = data.materials || [];
        contentDiv.innerHTML = `
            <div class="panel">
                <h3>Material Usage Report</h3>
                <table class="table-clean">
                    <thead>
                        <tr class="table-head-accent">
                            <th class="u-cell-12 u-ta-left">Title</th>
                            <th class="u-cell-12 u-ta-center">Grade</th>
                            <th class="u-cell-12 u-ta-center">Usage</th>
                            <th class="u-cell-12 u-ta-center">Avg WCPM</th>
                            <th class="u-cell-12 u-ta-center">Avg Accuracy</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materials.length ? materials.map(mat => `
                            <tr class="table-row">
                                <td class="u-cell-12"><strong>${mat.title || 'Untitled'}</strong></td>
                                <td class="u-cell-12 u-ta-center">${mat.grade_level}</td>
                                <td class="u-cell-12 u-ta-center">${mat.usage_count || 0}</td>
                                <td class="u-cell-12 u-ta-center">${Number(mat.avg_wcpm || 0).toFixed(1)}</td>
                                <td class="u-cell-12 u-ta-center">${Number(mat.avg_accuracy || 0).toFixed(1)}%</td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" class="u-cell-20 u-ta-center u-text-muted">No data</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    } else if (reportType === 'class-performance') {
        const students = data.students || [];
        contentDiv.innerHTML = `
            <div class="panel">
                <h3>Class Performance Report</h3>
                <table class="table-clean">
                    <thead>
                        <tr class="table-head-accent">
                            <th class="u-cell-12 u-ta-left">Student Name</th>
                            <th class="u-cell-12 u-ta-center">Grade</th>
                            <th class="u-cell-12 u-ta-center">Assessments</th>
                            <th class="u-cell-12 u-ta-center">Avg WCPM</th>
                            <th class="u-cell-12 u-ta-center">Avg Accuracy</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.length ? students.map(student => `
                            <tr class="table-row">
                                <td class="u-cell-12"><strong>${student.first_name} ${student.last_name}</strong></td>
                                <td class="u-cell-12 u-ta-center">${student.grade_level}</td>
                                <td class="u-cell-12 u-ta-center">${student.assessment_count || 0}</td>
                                <td class="u-cell-12 u-ta-center">${Number(student.avg_wcpm || 0).toFixed(1)}</td>
                                <td class="u-cell-12 u-ta-center">${Number(student.avg_accuracy || 0).toFixed(1)}%</td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" class="u-cell-20 u-ta-center u-text-muted">No data</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }
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
    link.href = `..//api/assessment?${params.toString()}`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
}