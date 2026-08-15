async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'GET' });
        localStorage.removeItem('archivevox.user');
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('archivevox.user');
        window.location.href = '/';
    }
}