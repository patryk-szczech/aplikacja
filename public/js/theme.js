// Force dark theme - only dark mode, no light mode
document.addEventListener('DOMContentLoaded', function() {
  const htmlElement = document.documentElement;
  const bodyElement = document.body;
  
  // Force dark mode attributes
  htmlElement.setAttribute('data-theme', 'dark');
  htmlElement.setAttribute('data-color-scheme', 'dark');
  bodyElement.setAttribute('data-theme', 'dark');
  bodyElement.setAttribute('data-color-scheme', 'dark');
  
  // Force dark background
  htmlElement.style.backgroundColor = '#1f2121';
  htmlElement.style.color = '#f5f5f5';
  bodyElement.style.backgroundColor = '#1f2121';
  bodyElement.style.color = '#f5f5f5';
  
  console.log('✓ Dark theme applied');
});
