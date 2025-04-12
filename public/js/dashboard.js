// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('Dashboard script loaded');
  
  // Initialize any dashboard-specific functionality here
  const actionButtons = document.querySelectorAll('.action-btn');
  if (actionButtons) {
    actionButtons.forEach(button => {
      button.addEventListener('mouseenter', function() {
        this.classList.add('btn-hover');
      });
      button.addEventListener('mouseleave', function() {
        this.classList.remove('btn-hover');
      });
    });
  }
});