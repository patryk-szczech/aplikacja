document.addEventListener('DOMContentLoaded', function() {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    htmlElement.setAttribute('data-theme', 'dark');
    bodyElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.backgroundColor = '#1f2121';
    document.body.style.backgroundColor = '#1f2121';
    document.body.style.color = '#f5f5f5';
    localStorage.setItem('theme', 'dark');
    console.log('✅ DARK MODE');
});
