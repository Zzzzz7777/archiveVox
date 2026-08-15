// ============================================================
// TEACHER DASHBOARD
// ============================================================

async function initPage() {
    await loadDashboardData();
    renderTeacherDashboard();
}

async function loadDashboardData() {
    const user = state.user;
    if (!user) return;
    const role = String(user.role || '').toLowerCase();
    
    if (role !== 'teacher') return;
    
    try {
        const data = await fetchJson('/api/reports?action=teacher');
        
        if (data.success && data.dashboard) {
            state.dashboard = {
                ...state.dashboard,
                ...data.dashboard
            };
            
            state.dashboard.my_students = Number(state.dashboard.my_students || 0);
            state.dashboard.class_avg_wcpm = Number(state.dashboard.class_avg_wcpm || 0);
            state.dashboard.my_assessments = Number(state.dashboard.my_assessments || 0);
            state.dashboard.students_below = Number(state.dashboard.students_below || 0);
            
            state.dashboard.recent_assessments = Array.isArray(state.dashboard.recent_assessments) ? state.dashboard.recent_assessments : [];
            state.dashboard.class_performance = Array.isArray(state.dashboard.class_performance) ? state.dashboard.class_performance : [];
            state.dashboard.recent_students = Array.isArray(state.dashboard.recent_students) ? state.dashboard.recent_students : [];
            
            renderTeacherDashboard();
        } else {
            console.warn('No dashboard data received from API');
            state.dashboard = {
                ...state.dashboard,
                my_students: 0,
                class_avg_wcpm: 0,
                my_assessments: 0,
                students_below: 0,
                recent_assessments: [],
                class_performance: [],
                recent_students: []
            };
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        state.dashboard = {
            ...state.dashboard,
            my_students: 0,
            class_avg_wcpm: 0,
            my_assessments: 0,
            students_below: 0,
            recent_assessments: [],
            class_performance: [],
            recent_students: []
        };
    }
}

function renderTeacherDashboard() {
    const dashboard = state.dashboard || {};
    const recent = Array.isArray(dashboard.recent_assessments) ? dashboard.recent_assessments : [];
    const classPerf = Array.isArray(dashboard.class_performance) ? dashboard.class_performance : [];
    const recentStudents = Array.isArray(dashboard.recent_students) ? dashboard.recent_students : [];
    
    const myStudents = Number(dashboard.my_students || 0);
    const classAvgWcpm = Number(dashboard.class_avg_wcpm || 0);
    const myAssessments = Number(dashboard.my_assessments || 0);
    const studentsBelow = Number(dashboard.students_below || 0);
    
    const hasPerformanceData = classPerf.length > 0;
    const viewContainer = document.getElementById('view-container');
    
    viewContainer.innerHTML = `
        <div class="dashboard-teacher">
            <!-- Stats Cards -->
            <div class="grid four u-mb-16">
                <div class="stat-card stat-card-students">
                    <div class="stat-card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div class="stat-card-content">
                        <h4>My Students</h4>
                        <div class="stat-number">${myStudents}</div>
                        <div class="stat-label">Active learners</div>
                    </div>
                </div>
                
                <div class="stat-card stat-card-wcpm">
                    <div class="stat-card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                    </div>
                    <div class="stat-card-content">
                        <h4>Avg WCPM</h4>
                        <div class="stat-number">${classAvgWcpm.toFixed(1)}</div>
                        <div class="stat-label">Class fluency pace</div>
                    </div>
                </div>
                
                <div class="stat-card stat-card-assessments">
                    <div class="stat-card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                    </div>
                    <div class="stat-card-content">
                        <h4>Assessments</h4>
                        <div class="stat-number">${myAssessments}</div>
                        <div class="stat-label">Completed sessions</div>
                    </div>
                </div>
                
                <div class="stat-card stat-card-attention ${studentsBelow > 0 ? 'stat-card-warning' : 'stat-card-success'}">
                    <div class="stat-card-icon">
                        ${studentsBelow > 0 ? `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        ` : `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        `}
                    </div>
                    <div class="stat-card-content">
                        <h4>Need Attention</h4>
                        <div class="stat-number ${studentsBelow > 0 ? 'text-danger' : 'text-success'}">${studentsBelow}</div>
                        <div class="stat-label">${studentsBelow > 0 ? 'Below target level' : 'All on track'}</div>
                    </div>
                </div>
            </div>

            <!-- Two Column Layout: Search + Recent -->
            <div class="grid two">
                <!-- Left Panel: Start Assessment -->
                <div class="panel">
                    <h3>Start Reading Assessment</h3>
                    <p class="u-text-muted u-mt-0">Search by LRN or student name</p>
                    <div class="u-inline-form-row">
                        <input type="text" id="student-id-input" placeholder="Enter LRN or name" class="input-inline-fill">
                        <button id="search-student-btn" class="btn-primary btn-inline">
                            <span class="icon-search" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"/>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>
                            </span>
                            Search
                        </button>
                    </div>
                    <div id="student-search-result" class="panel search-result-panel hidden">
                        <div><strong id="found-student-name"></strong></div>
                        <div class="u-text-muted-sm u-mt-4">
                            Grade: <span id="found-student-grade">-</span> | Section: <span id="found-student-section">-</span>
                        </div>
                        <div class="actions u-mt-10">
                            <button id="start-assessment-btn" class="btn-primary btn-inline">Start Assessment</button>
                        </div>
                    </div>
                </div>

                <!-- Right Panel: Recent Assessments -->
                <div class="panel">
                    <div class="panel-header">
                        <h3>Recent Assessments</h3>
                        ${recent.length > 0 ? `<button class="btn-secondary btn-sm view-all-btn">View All</button>` : ''}
                    </div>
                    ${recent.length ? `
                        <ul class="list">
                            ${recent.slice(0, 6).map(item => `
                                <li class="assessment-list-item">
                                    <div class="assessment-list-main">
                                        <strong>${escapeAssessmentHtml(item.student_name || 'Student')}</strong>
                                        <span class="assessment-date">${item.assessed_at ? new Date(item.assessed_at).toLocaleDateString() : ''}</span>
                                    </div>
                                    <div class="u-text-muted-xs u-mt-4 assessment-metrics">
                                        <span class="metric-badge">${escapeAssessmentHtml(item.material_title || 'Material')}</span>
                                        <span class="metric-badge metric-accuracy">Accuracy: ${Number(item.accuracy_percentage || 0).toFixed(1)}%</span>
                                        <span class="metric-badge metric-wcpm">WCPM: ${Number(item.wcpm || 0).toFixed(1)}</span>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    ` : `
                        <div class="empty-state u-text-center u-py-20">
                            <p class="u-text-muted">No assessments yet.</p>
                            <p class="u-text-muted-xs">Start assessing your students using the search panel.</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- Class Performance Chart Section -->
            <div class="panel u-mt-16">
                <div class="panel-header">
                    <h3>Class Performance</h3>
                    <span class="chart-subtitle">Student reading fluency progress</span>
                </div>
                <div class="chart-container chart-h-300">
                    ${hasPerformanceData ? `
                        <canvas id="classPerformanceChart"></canvas>
                    ` : `
                        <div class="empty-state u-text-center u-py-20">
                            <p class="u-text-muted">No performance data available yet.</p>
                            <p class="u-text-muted-xs">Complete assessments to see class performance trends.</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- Student Overview Table -->
            <div class="panel u-mt-16">
                <div class="panel-header">
                    <h3>Student Overview</h3>
                    <button id="view-all-students-btn" class="btn-secondary btn-sm">View All →</button>
                </div>
                ${recentStudents.length ? `
                    <div class="u-scroll-x">
                        <table class="table-clean">
                            <thead>
                                <tr class="table-head-accent">
                                    <th class="u-ta-left">Student</th>
                                    <th class="u-ta-left">LRN</th>
                                    <th class="u-ta-center">Grade</th>
                                    <th class="u-ta-center">Assessments</th>
                                    <th class="u-ta-center">Avg WCPM</th>
                                    <th class="u-ta-center">Latest Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recentStudents.slice(0, 10).map(student => `
                                    <tr class="table-row">
                                        <td class="u-ta-left"><strong>${escapeAssessmentHtml((student.first_name || '') + ' ' + (student.last_name || ''))}</strong></td>
                                        <td class="u-ta-left">${escapeAssessmentHtml(student.lrn || 'N/A')}</td>
                                        <td class="u-ta-center">${escapeAssessmentHtml(student.grade_level || 'N/A')}</td>
                                        <td class="u-ta-center">${student.assessment_count || 0}</td>
                                        <td class="u-ta-center">${Number(student.avg_wcpm || 0).toFixed(1)}</td>
                                        <td class="u-ta-center">
                                            <span class="status-badge ${(student.reading_level || '').toLowerCase() === 'frustration' ? 'status-danger' : (student.reading_level || '').toLowerCase() === 'instructional' ? 'status-warning' : 'status-success'}">
                                                ${escapeAssessmentHtml(student.reading_level || 'N/A')}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state u-text-center u-py-20">
                        <p class="u-text-muted">No students added yet.</p>
                        <p class="u-text-muted-xs">Add students to track their reading progress.</p>
                    </div>
                `}
            </div>
        </div>
    `;

    // Attach event listeners
    document.getElementById('search-student-btn')?.addEventListener('click', searchStudent);
    document.getElementById('start-assessment-btn')?.addEventListener('click', startAssessment);
    document.getElementById('view-all-students-btn')?.addEventListener('click', () => {
        window.location.href = '/teacher/students.html';
    });
    
    document.querySelector('.view-all-btn')?.addEventListener('click', () => {
        window.location.href = '/teacher/reports.html';
    });

    // Initialize class performance chart
    if (hasPerformanceData && typeof Chart !== 'undefined') {
        setTimeout(() => {
            initClassPerformanceChart(classPerf);
        }, 200);
    }
}

function initClassPerformanceChart(data) {
    const ctx = document.getElementById('classPerformanceChart');
    if (!ctx) return;

    if (state.chartInstances.classPerformance) {
        state.chartInstances.classPerformance.destroy();
        delete state.chartInstances.classPerformance;
    }

    const chartData = data.slice(0, 15);
    const labels = chartData.map(item => item.student_name || `Student ${item.student_id}`);
    const wcpmData = chartData.map(item => Number(item.wcpm || 0));
    const accuracyData = chartData.map(item => Number(item.accuracy_percentage || 0));

    state.chartInstances.classPerformance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'WCPM',
                    data: wcpmData,
                    backgroundColor: 'rgba(74, 144, 217, 0.7)',
                    borderColor: '#4A90D9',
                    borderWidth: 1,
                    order: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Accuracy (%)',
                    data: accuracyData,
                    backgroundColor: 'rgba(52, 199, 89, 0.7)',
                    borderColor: '#34C759',
                    borderWidth: 1,
                    order: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'WCPM'
                    },
                    grid: { color: 'rgba(148, 163, 184, 0.18)' }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    max: 100,
                    title: {
                        display: true,
                        text: 'Accuracy %'
                    },
                    grid: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            }
        }
    });
}

async function searchStudent() {
    const input = document.getElementById('student-id-input');
    const resultDiv = document.getElementById('student-search-result');
    const nameSpan = document.getElementById('found-student-name');
    const gradeSpan = document.getElementById('found-student-grade');
    const sectionSpan = document.getElementById('found-student-section');
    
    const studentId = input.value.trim();
    if (!studentId) {
        alert('Please enter a Student ID');
        return;
    }
    
    try {
        const data = await fetchJson(`/api/students?action=search&term=${encodeURIComponent(studentId)}`);
        if (data.students && data.students.length > 0) {
            const student = data.students[0];
            nameSpan.textContent = `${student.first_name} ${student.last_name}`;
            gradeSpan.textContent = student.grade_level || 'N/A';
            sectionSpan.textContent = student.section || 'N/A';
            resultDiv.style.display = 'block';
            resultDiv.style.borderLeft = '4px solid #22c55e';
        } else {
            nameSpan.textContent = 'Student not found';
            gradeSpan.textContent = '-';
            sectionSpan.textContent = '-';
            resultDiv.style.display = 'block';
            resultDiv.style.borderLeft = '4px solid #dc2626';
        }
    } catch (error) {
        alert('Error searching for student: ' + error.message);
    }
}

function startAssessment() {
    const input = document.getElementById('student-id-input');
    const studentTerm = (input?.value || '').trim();
    
    // Store search term in session storage for assessment page
    sessionStorage.setItem('assessmentSearchTerm', studentTerm);
    
    window.location.href = '/teacher/assessments.html';
}