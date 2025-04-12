// Add loading indicator functionality
document.addEventListener('DOMContentLoaded', function() {
  const authForms = document.querySelectorAll('.auth-form');
  
  authForms.forEach(form => {
    form.addEventListener('submit', function() {
      // Create and show loading indicator
      const button = this.querySelector('button[type="submit"]');
      const originalText = button.textContent;
      button.disabled = true;
      button.innerHTML = '<span class="loading-spinner"></span> Processing...';
      
      // Add the form to localStorage to restore data if there's an error
      const formData = new FormData(this);
      const formDataObj = {};
      formData.forEach((value, key) => {
        if (key !== 'password' && key !== 'confirmPassword') {
          formDataObj[key] = value;
        }
      });
      localStorage.setItem('formData', JSON.stringify(formDataObj));
      
      // Allow form submission to continue
      return true;
    });
  });
  
  // Restore form data if available
  const savedFormData = localStorage.getItem('formData');
  if (savedFormData) {
    const formDataObj = JSON.parse(savedFormData);
    Object.keys(formDataObj).forEach(key => {
      const input = document.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = formDataObj[key];
      }
    });
    localStorage.removeItem('formData');
  }
});

// auth.js - Client-side authentication utilities

// Add this function for form validation
function validateForm(formData) {
  const errors = [];
  
  // Name validation
  const name = formData.get('name');
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  // Email validation
  const email = formData.get('email');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  // Password validation
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }
  
  return errors;
}

// Update form submission handling
document.addEventListener('DOMContentLoaded', function() {
  const authForms = document.querySelectorAll('.auth-form');
  
  authForms.forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Validate form
      const formData = new FormData(this);
      const errors = validateForm(formData);
      const errorDiv = document.getElementById('formErrors');
      
      if (errors.length > 0) {
        errorDiv.textContent = errors.join('. ');
        errorDiv.style.display = 'block';
        return;
      }

      // Show loading state
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';

      try {
        // Submit form using fetch
        const response = await fetch(this.action, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (response.ok) {
          // Store non-sensitive data in localStorage
          const formDataObj = {};
          formData.forEach((value, key) => {
            if (key !== 'password' && key !== 'confirmPassword') {
              formDataObj[key] = value;
            }
          });
          localStorage.setItem('formData', JSON.stringify(formDataObj));

          // Redirect based on response
          window.location.href = data.redirectUrl || '/dashboard';
        } else {
          errorDiv.textContent = data.error || 'An error occurred';
          errorDiv.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      } catch (error) {
        console.error('Form submission error:', error);
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  });
});

// Add password visibility toggle
const passwordFields = document.querySelectorAll('input[type="password"]');

passwordFields.forEach(field => {
  // Create toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'password-toggle';
  toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
  toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
  
  // Insert after the password field
  field.parentNode.insertBefore(toggleBtn, field.nextSibling);
  
  // Add toggle functionality
  toggleBtn.addEventListener('click', function() {
    const type = field.getAttribute('type') === 'password' ? 'text' : 'password';
    field.setAttribute('type', type);
    this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
  });
});