// Handle logout functionality - Simple direct function
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/';
            } else {
                alert('Logout failed: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
            window.location.href = '/';
        });
    }
}
