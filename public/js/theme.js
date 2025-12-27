// Force dark theme - simple version without localStorage
document.addEventListener('DOMContentLoaded', function() {
  const htmlElement = document.documentElement;
  const bodyElement = document.body;
  
  // Set dark mode attributes
  htmlElement.setAttribute('data-theme', 'dark');
  htmlElement.setAttribute('data-color-scheme', 'dark');
  bodyElement.setAttribute('data-theme', 'dark');
  bodyElement.setAttribute('data-color-scheme', 'dark');
  
  // Force dark background colors
  htmlElement.style.backgroundColor = '#1f2121';
  htmlElement.style.color = '#f5f5f5';
  bodyElement.style.backgroundColor = '#1f2121';
  bodyElement.style.color = '#f5f5f5';
  
  // Remove any light mode attributes if they exist
  document.documentElement.style.removeProperty('--color-background');
  
  console.log('✓ Dark theme applied');
});
