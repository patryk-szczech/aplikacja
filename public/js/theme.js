
theme-dark-only.js
// ============ DARK THEME ONLY ============

document.addEventListener('DOMContentLoaded', function() {
    const htmlElement = document.documentElement;
    
    // Ustaw ZAWSZE ciemny motyw
    htmlElement.setAttribute('data-theme', 'dark');
    document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    
    console.log('Motyw ustawiony: CIEMNY (dark mode only)');
});
