// ============================================================
// STUDENT DASHBOARD
// ============================================================

async function initPage() {
    renderStudentDashboard();
}

function renderStudentDashboard() {
    const viewContainer = document.getElementById('view-container');
    viewContainer.innerHTML = `
        <div class="panel">
            <h3><span class="icon-people" aria-hidden="true"><svg>...</svg></span> Student Dashboard</h3>
            <p>Welcome, ${state.user ? state.user.username : ''}!</p>
            <p>This dashboard will show:</p>
            <ul>
                <li>Books Read</li>
                <li>Avg Score</li>
                <li>Reading Progress</li>
                <li>My Library</li>
            </ul>
            <p class="u-text-muted">Coming soon!</p>
        </div>
    `;
}