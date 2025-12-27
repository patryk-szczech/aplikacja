// ============ THEME SYSTEM ============

document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    
    // Obsługa błędu jeśli przycisk nie istnieje
    if (!themeToggle) {
        console.warn('Element #themeToggle nie znaleziony');
        return;
    }
    
    const htmlElement = document.documentElement;
    
    // Pobranie zapisanego motywu z localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Nasłuchiwanie klikania przycisku
    themeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleTheme();
    });
    
    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateThemeIcon(theme);
        console.log('Motyw zmieniony na:', theme);
    }
    
    function toggleTheme() {
        const currentTheme = htmlElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    }
    
    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        if (!icon) return;
        
        if (theme === 'dark') {
            icon.classList.remove('bi-sun-fill');
            icon.classList.add('bi-moon-fill');
            themeToggle.title = 'Przełącz na tryb jasny';
            themeToggle.setAttribute('aria-label', 'Przełącz na tryb jasny');
        } else {
            icon.classList.remove('bi-moon-fill');
            icon.classList.add('bi-sun-fill');
            themeToggle.title = 'Przełącz na tryb ciemny';
            themeToggle.setAttribute('aria-label', 'Przełącz na tryb ciemny');
        }
    }
});
