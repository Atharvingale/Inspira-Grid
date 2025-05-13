// Update progress bar as user fills form
document.addEventListener('DOMContentLoaded', function() {
    const applyModal = document.getElementById('applyProjectModal');
    if (!applyModal) return;
    
    const progressBar = applyModal.querySelector('.progress-bar');
    const formInputs = applyModal.querySelectorAll('textarea, select');
    const totalInputs = formInputs.length;
    
    function updateProgress() {
        let filledInputs = 0;
        formInputs.forEach(input => {
            if (input.value && input.value.trim() !== '') {
                filledInputs++;
            }
        });
        
        const progressPercentage = Math.round((filledInputs / totalInputs) * 100);
        progressBar.style.width = progressPercentage + '%';
        progressBar.setAttribute('aria-valuenow', progressPercentage);
    }
    
    formInputs.forEach(input => {
        input.addEventListener('change', updateProgress);
        input.addEventListener('input', updateProgress);
    });
    
    // Reset progress when modal is opened
    applyModal.addEventListener('shown.bs.modal', function() {
        updateProgress();
    });
});

// Project Application Modal Functionality
$(document).ready(function() {
    // Initialize Select2
    $('.select2-skills').select2({
        theme: 'bootstrap4',
        placeholder: 'Select relevant skills',
        allowClear: true,
        tags: true
    });
    
    // When modal is shown, populate project info
    $('#applyProjectModal').on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        const projectId = button.data('project-id');
        const projectTitle = button.data('project-title');
        const projectDesc = button.data('project-description');
        
        // Set hidden input value
        $('#projectIdInput').val(projectId);
        
        // Set project info in the summary section
        $('#modalProjectTitle').text(projectTitle);
        $('#modalProjectDescription').text(projectDesc);
        
        // Reset form and progress
        resetApplicationForm();
    });
    
    // Multi-step form navigation
    $('#nextToStep2Btn').click(function() {
        if (validateStep1()) {
            $('#step1').addClass('d-none');
            $('#step2').removeClass('d-none');
            
            // Update progress indicators
            $('#step1Indicator').addClass('completed').removeClass('active');
            $('#step2Indicator').addClass('active');
            
            // Update progress bar
            $('.progress-bar').css('width', '66%').attr('aria-valuenow', 66);
        }
    });
    
    $('#backToStep1Btn').click(function() {
        $('#step2').addClass('d-none');
        $('#step1').removeClass('d-none');
        
        // Update progress indicators
        $('#step2Indicator').removeClass('active');
        $('#step1Indicator').removeClass('completed').addClass('active');
        
        // Update progress bar
        $('.progress-bar').css('width', '33%').attr('aria-valuenow', 33);
    });
    
    $('#nextToStep3Btn').click(function() {
        if (validateStep2()) {
            $('#step2').addClass('d-none');
            $('#step3').removeClass('d-none');
            
            // Update progress indicators
            $('#step2Indicator').addClass('completed').removeClass('active');
            $('#step3Indicator').addClass('active');
            
            // Update progress bar
            $('.progress-bar').css('width', '100%').attr('aria-valuenow', 100);
            
            // Populate review section
            populateReviewSection();
        }
    });
    
    $('#backToStep2Btn').click(function() {
        $('#step3').addClass('d-none');
        $('#step2').removeClass('d-none');
        
        // Update progress indicators
        $('#step3Indicator').removeClass('active');
        $('#step2Indicator').removeClass('completed').addClass('active');
        
        // Update progress bar
        $('.progress-bar').css('width', '66%').attr('aria-valuenow', 66);
    });
    
    // Form validation functions
    function validateStep1() {
        let isValid = true;
        const coverLetter = $('#coverLetter').val();
        const availability = $('#availability').val();
        
        if (!coverLetter) {
            $('#coverLetter').addClass('is-invalid');
            isValid = false;
        } else {
            $('#coverLetter').removeClass('is-invalid');
        }
        
        if (!availability) {
            $('#availability').addClass('is-invalid');
            isValid = false;
        } else {
            $('#availability').removeClass('is-invalid');
        }
        
        return isValid;
    }
    
    function validateStep2() {
        // Skills are optional but we could add validation if needed
        return true;
    }
    
    function populateReviewSection() {
        // Populate review section with form values
        $('#reviewCoverLetter').text($('#coverLetter').val());
        $('#reviewAvailability').text($('#availability').val());
        $('#reviewExperience').text($('#experience').val() || 'No experience provided');
        
        // Populate skills badges
        const selectedSkills = $('#relevantSkills').val();
        const skillsContainer = $('#reviewSkills');
        skillsContainer.empty();
        
        if (selectedSkills && selectedSkills.length > 0) {
            selectedSkills.forEach(function(skill) {
                skillsContainer.append(`<span class="badge">${skill}</span>`);
            });
        } else {
            skillsContainer.append('<span class="text-muted">No skills selected</span>');
        }
    }
    
    function resetApplicationForm() {
        // Reset form fields
        $('#projectApplicationForm')[0].reset();
        $('.select2-skills').val(null).trigger('change');
        
        // Reset validation
        $('.is-invalid').removeClass('is-invalid');
        
        // Show step 1, hide others
        $('#step1').removeClass('d-none');
        $('#step2, #step3').addClass('d-none');
        
        // Reset progress indicators
        $('.step-indicator').removeClass('active completed');
        $('#step1Indicator').addClass('active');
        
        // Reset progress bar
        $('.progress-bar').css('width', '33%').attr('aria-valuenow', 33);
    }
    
    // Submit application
    $('#submitApplicationBtn').click(function() {
        const btn = $(this);
        const spinner = btn.find('.spinner-border');
        
        // Show loading spinner
        btn.attr('disabled', true);
        spinner.removeClass('d-none');
        
        // Collect all form data
        const formData = {
            project_id: $('#projectIdInput').val(),
            cover_letter: $('#coverLetter').val(),
            relevant_skills: $('#relevantSkills').val(),
            availability: $('#availability').val(),
            experience: $('#experience').val()
        };
        
        // Simulate AJAX request (replace with actual AJAX)
        setTimeout(function() {
            // Hide loading spinner
            btn.attr('disabled', false);
            spinner.addClass('d-none');
            
            // Show success message and close modal
            $('#applyProjectModal').modal('hide');
            
            // Show success toast
            showToast('Application Submitted', 'Your application has been successfully submitted!', 'success');
        }, 1500);
    });
    
    // Toast notification function
    function showToast(title, message, type) {
        const toastHTML = `
            <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <strong>${title}</strong><br>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        const toastContainer = $('.toast-container');
        if (toastContainer.length === 0) {
            $('body').append('<div class="toast-container position-fixed bottom-0 end-0 p-3"></div>');
        }
        
        $('.toast-container').append(toastHTML);
        const toast = new bootstrap.Toast($('.toast').last(), {
            autohide: true,
            delay: 5000
        });
        toast.show();
    }
});

$(document).ready(function() {
    // Initialize Select2 for skills
    if ($.fn.select2) {
        $('.select2-skills').select2({
            tags: true,
            placeholder: "Select skills",
            allowClear: true
        });
        
        // Initialize Select2 for skills filter
        $('.select2-skills-filter').select2({
            tags: true,
            tokenSeparators: [',', ' '],
            placeholder: 'Select or type skills...',
            theme: 'classic',
            closeOnSelect: false
        });
    }
    
    // Handle Apply button click
    $('.apply-btn').on('click', function() {
        const projectId = $(this).data('project-id');
        $('#projectIdInput').val(projectId);
        $('#applyProjectModal').modal('show');
    });
    
    // Handle application submission
    $('#submitApplicationBtn').on('click', function() {
        const projectId = $('#projectIdInput').val();
        const coverLetter = $('#coverLetter').val();
        const relevantSkills = $('#relevantSkills').val();
        const availability = $('#availability').val();
        
        if (!projectId || !coverLetter || !availability) {
            alert('Please fill in all required fields');
            return;
        }
        
        $.ajax({
            url: `/projects/${projectId}/apply`,
            method: 'POST',
            data: {
                cover_letter: coverLetter,
                relevant_skills: JSON.stringify(relevantSkills),
                availability: availability
            },
            success: function(response) {
                $('#applyProjectModal').modal('hide');
                
                // Show success message
                showAlert('success', response.message);
                
                // Refresh the page after a short delay
                setTimeout(function() {
                    window.location.reload();
                }, 1500);
            },
            error: function(xhr) {
                let errorMessage = 'Failed to submit application';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                showAlert('danger', errorMessage);
            }
        });
    });
    
    // Handle withdraw application
    $('.withdraw-application').on('click', function() {
        const applicationId = $(this).data('application-id');
        $('#withdrawApplicationModal').modal('show');
        
        $('#confirmWithdrawBtn').data('application-id', applicationId);
    });
    
    $('#confirmWithdrawBtn').on('click', function() {
        const applicationId = $(this).data('application-id');
        
        $.ajax({
            url: `/applications/${applicationId}/withdraw`,
            method: 'POST',
            success: function(response) {
                $('#withdrawApplicationModal').modal('hide');
                
                // Show success message
                showAlert('success', response.message);
                
                // Refresh the page after a short delay
                setTimeout(function() {
                    window.location.reload();
                }, 1500);
            },
            error: function(xhr) {
                let errorMessage = 'Failed to withdraw application';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                showAlert('danger', errorMessage);
            }
        });
    });
    
    // Project filtering functionality
    let activeFilters = {
        search: '',
        category: 'all',
        status: 'all',
        skills: []
    };
    
    // Search filter
    $('#projectSearch').on('input', function() {
        activeFilters.search = $(this).val().toLowerCase();
        applyFilters();
    });
    
    // Category filter
    $('.dropdown-item[data-category]').on('click', function(e) {
        e.preventDefault();
        const category = $(this).data('category');
        
        // Update active state in dropdown
        $('.dropdown-item[data-category]').removeClass('active');
        $(this).addClass('active');
        
        // Update button text
        $('#categoryFilterBtn').html(`<i class="fas fa-folder me-1"></i> ${category === 'all' ? 'All Categories' : category}`);
        
        activeFilters.category = category;
        applyFilters();
        updateFilterBadges();
    });
    
    // Status filter
    $('.dropdown-item[data-status]').on('click', function(e) {
        e.preventDefault();
        const status = $(this).data('status');
        
        // Update active state in dropdown
        $('.dropdown-item[data-status]').removeClass('active');
        $(this).addClass('active');
        
        // Update button text
        $('#statusFilterBtn').html(`<i class="fas fa-tasks me-1"></i> ${status === 'all' ? 'All Statuses' : status}`);
        
        activeFilters.status = status;
        applyFilters();
        updateFilterBadges();
    });
    
    // Skills filter
    $('#skillsFilter').on('change', function() {
        activeFilters.skills = $(this).val() || [];
        applyFilters();
        updateFilterBadges();
    });
    
    // Clear all filters
    $('#clearAllFilters').on('click', function() {
        // Reset all filters
        activeFilters = {
            search: '',
            category: 'all',
            status: 'all',
            skills: []
        };
        
        // Reset UI
        $('#projectSearch').val('');
        $('.dropdown-item[data-category]').removeClass('active');
        $('.dropdown-item[data-category="all"]').addClass('active');
        $('#categoryFilterBtn').html('<i class="fas fa-folder me-1"></i> All Categories');
        
        $('.dropdown-item[data-status]').removeClass('active');
        $('.dropdown-item[data-status="all"]').addClass('active');
        $('#statusFilterBtn').html('<i class="fas fa-tasks me-1"></i> All Statuses');
        
        $('#skillsFilter').val(null).trigger('change');
        
        // Hide active filters section
        $('#activeFilters').addClass('d-none');
        $('#filterBadges').empty();
        
        applyFilters();
    });
    
    // Apply filters to project cards
    function applyFilters() {
        $('.project-card-wrapper').each(function() {
            const $card = $(this);
            const title = $card.data('title') || '';
            const category = $card.data('category') || '';
            const status = $card.data('status') || '';
            const skills = ($card.data('skills') || '').toString().toLowerCase();
            
            let visible = true;
            
            // Search filter
            if (activeFilters.search && !title.includes(activeFilters.search)) {
                visible = false;
            }
            
            // Category filter
            if (activeFilters.category !== 'all' && category !== activeFilters.category) {
                visible = false;
            }
            
            // Status filter
            if (activeFilters.status !== 'all' && status !== activeFilters.status) {
                visible = false;
            }
            
            // Skills filter
            if (activeFilters.skills.length > 0) {
                let hasSkill = false;
                for (const skill of activeFilters.skills) {
                    if (skills.includes(skill.toLowerCase())) {
                        hasSkill = true;
                        break;
                    }
                }
                if (!hasSkill) {
                    visible = false;
                }
            }
            
            $card.toggle(visible);
        });
        
        // Check if any filters are active
        const hasActiveFilters = activeFilters.search || 
                                activeFilters.category !== 'all' || 
                                activeFilters.status !== 'all' || 
                                activeFilters.skills.length > 0;
        
        $('#activeFilters').toggleClass('d-none', !hasActiveFilters);
    }
    
    // Update filter badges
    function updateFilterBadges() {
        const $badgesContainer = $('#filterBadges');
        $badgesContainer.empty();
        
        if (activeFilters.category !== 'all') {
            addFilterBadge('Category: ' + activeFilters.category, function() {
                activeFilters.category = 'all';
                $('.dropdown-item[data-category]').removeClass('active');
                $('.dropdown-item[data-category="all"]').addClass('active');
                $('#categoryFilterBtn').html('<i class="fas fa-folder me-1"></i> All Categories');
                applyFilters();
                updateFilterBadges();
            });
        }
        
        if (activeFilters.status !== 'all') {
            addFilterBadge('Status: ' + activeFilters.status, function() {
                activeFilters.status = 'all';
                $('.dropdown-item[data-status]').removeClass('active');
                $('.dropdown-item[data-status="all"]').addClass('active');
                $('#statusFilterBtn').html('<i class="fas fa-tasks me-1"></i> All Statuses');
                applyFilters();
                updateFilterBadges();
            });
        }
        
        if (activeFilters.skills.length > 0) {
            activeFilters.skills.forEach(function(skill) {
                addFilterBadge('Skill: ' + skill, function() {
                    activeFilters.skills = activeFilters.skills.filter(s => s !== skill);
                    $('#skillsFilter').val(activeFilters.skills).trigger('change');
                    applyFilters();
                    updateFilterBadges();
                });
            });
        }
    }
    
    function addFilterBadge(text, removeCallback) {
        const $badge = $(`
            <div class="badge bg-light text-dark d-flex align-items-center me-2 mb-2">
                <span>${text}</span>
                <button type="button" class="btn-close btn-close-sm ms-2" aria-label="Remove filter"></button>
            </div>
        `);
        
        $badge.find('.btn-close').on('click', removeCallback);
        $('#filterBadges').append($badge);
    }
    
    // Helper function to show alerts
    function showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        // Add alert to the top of the page
        $('.container').prepend(alertHtml);
        
        // Auto-dismiss after 5 seconds
        setTimeout(function() {
            $('.alert').alert('close');
        }, 5000);
    }
    
    // Handle delete project
    window.deleteProject = function(projectId) {
        if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            $.ajax({
                url: `/projects/${projectId}/delete`,
                method: 'POST',
                success: function(response) {
                    showAlert('success', 'Project deleted successfully');
                    setTimeout(function() {
                        window.location.reload();
                    }, 1500);
                },
                error: function() {
                    showAlert('danger', 'Failed to delete project');
                }
            });
        }
    };
});
// Add this to your projects.js file
$(document).ready(function() {
    // Character count for experience textarea
    $('#experience').on('input', function() {
        const maxLength = 500;
        const currentLength = $(this).val().length;
        $('.character-count').text(currentLength + '/' + maxLength);
        
        // Optional: Add visual feedback when approaching limit
        if (currentLength > maxLength * 0.8) {
            $('.character-count').addClass('text-warning');
        } else {
            $('.character-count').removeClass('text-warning');
        }
        
        if (currentLength >= maxLength) {
            $('.character-count').removeClass('text-warning').addClass('text-danger');
        } else {
            $('.character-count').removeClass('text-danger');
        }
    });
});
// Add this to your existing JavaScript file or in a script tag
document.addEventListener('DOMContentLoaded', function() {
    const experienceTextarea = document.getElementById('experience');
    const charCountElement = document.getElementById('charCount');
    
    if (experienceTextarea && charCountElement) {
        experienceTextarea.addEventListener('input', function() {
            const currentLength = this.value.length;
            charCountElement.textContent = currentLength;
            
            // Add visual feedback as user approaches limit
            if (currentLength > 400) {
                charCountElement.classList.add('text-warning');
                charCountElement.classList.remove('text-primary', 'text-danger');
            } else if (currentLength >= 500) {
                charCountElement.classList.add('text-danger');
                charCountElement.classList.remove('text-primary', 'text-warning');
            } else {
                charCountElement.classList.add('text-primary');
                charCountElement.classList.remove('text-warning', 'text-danger');
            }
        });
    }
});

// Custom Skills Functionality
document.addEventListener('DOMContentLoaded', function() {
    const skillsSearchInput = document.getElementById('skillsSearchInput');
    const addCustomSkillBtn = document.getElementById('addCustomSkillBtn');
    const customSkillsContainer = document.getElementById('customSkillsContainer');
    const selectedSkillsBadges = document.getElementById('selectedSkillsBadges');
    
    // Add custom skill when button is clicked
    addCustomSkillBtn.addEventListener('click', function() {
        addCustomSkill();
    });
    
    // Add custom skill when Enter key is pressed
    skillsSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCustomSkill();
        }
    });
    
    function addCustomSkill() {
        const skillName = skillsSearchInput.value.trim();
        
        if (skillName === '') return;
        
        // Check if skill already exists
        const existingSkills = document.querySelectorAll('input[name="relevant_skills[]"]');
        for (let skill of existingSkills) {
            if (skill.value.toLowerCase() === skillName.toLowerCase()) {
                // Highlight existing skill
                skill.checked = true;
                updateSelectedSkills();
                skillsSearchInput.value = '';
                return;
            }
        }
        
        // Remove empty state message if it exists
        const emptyState = customSkillsContainer.querySelector('.empty-custom-skills');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Create new skill checkbox
        const skillId = 'skill-custom-' + skillName.toLowerCase().replace(/\s+/g, '-');
        const skillDiv = document.createElement('div');
        skillDiv.className = 'form-check skill-item custom-skill';
        skillDiv.innerHTML = `
            <input class="form-check-input" type="checkbox" name="relevant_skills[]" value="${skillName}" id="${skillId}" checked>
            <label class="form-check-label" for="${skillId}">${skillName}</label>
            <button type="button" class="btn btn-sm text-danger remove-skill" title="Remove skill">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to custom skills container
        customSkillsContainer.appendChild(skillDiv);
        
        // Add event listener to remove button
        const removeBtn = skillDiv.querySelector('.remove-skill');
        removeBtn.addEventListener('click', function() {
            skillDiv.remove();
            updateSelectedSkills();
            
            // Show empty state if no custom skills left
            if (customSkillsContainer.querySelectorAll('.custom-skill').length === 0) {
                customSkillsContainer.innerHTML = `
                    <div class="empty-custom-skills text-center text-muted py-3">
                        <i class="fas fa-plus-circle fs-4 mb-2"></i>
                        <p>Add custom skills using the input field above</p>
                    </div>
                `;
            }
        });
        
        // Clear input
        skillsSearchInput.value = '';
        
        // Update selected skills display
        updateSelectedSkills();
    }
    
    // Update selected skills badges
    function updateSelectedSkills() {
        selectedSkillsBadges.innerHTML = '';
        const selectedSkills = document.querySelectorAll('input[name="relevant_skills[]"]:checked');
        
        if (selectedSkills.length > 0) {
            document.getElementById('selectedSkillsContainer').classList.remove('d-none');
            
            selectedSkills.forEach(skill => {
                const badge = document.createElement('span');
                badge.className = 'badge bg-primary me-1 mb-1';
                badge.innerHTML = `${skill.value} <i class="fas fa-times ms-1" data-skill-id="${skill.id}"></i>`;
                
                badge.querySelector('i').addEventListener('click', function() {
                    document.getElementById(this.dataset.skillId).checked = false;
                    updateSelectedSkills();
                });
                
                selectedSkillsBadges.appendChild(badge);
            });
        } else {
            document.getElementById('selectedSkillsContainer').classList.add('d-none');
        }
    }
    
    // Add event listeners to all skill checkboxes
    document.querySelectorAll('input[name="relevant_skills[]"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedSkills);
    });
    
    // Filter skills based on search input
    skillsSearchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const skillItems = document.querySelectorAll('.skill-item');
        
        skillItems.forEach(item => {
            const skillName = item.querySelector('label').textContent.toLowerCase();
            if (skillName.includes(searchTerm) || searchTerm === '') {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

// Application modal functionality
$(document).ready(function() {
    // Handle application modal
    $('#viewApplicationModal').on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        const modal = $(this);
        
        // Get application data from button attributes
        const applicationId = button.data('application-id');
        const userId = button.data('user-id');
        const userName = button.data('user-name');
        const coverLetter = button.data('cover-letter');
        const skills = JSON.parse(button.data('skills'));
        const availability = button.data('availability');
        const experience = button.data('experience');
        const profilePic = button.data('profile-pic');
        const status = button.data('status');
        
        // Set modal content
        modal.find('#modalApplicantName').text(userName);
        modal.find('#modalApplicantPic').attr('src', profilePic);
        modal.find('#modalCoverLetter').text(coverLetter);
        modal.find('#modalAvailability').text(availability);
        modal.find('#modalExperience').text(experience || 'No experience provided');
        modal.find('#viewProfileLink').attr('href', `/profile/${userId}`);
        
        // Set application status
        const statusBadge = modal.find('#modalApplicationStatus');
        statusBadge.text(status);
        
        // Update badge color based on status
        statusBadge.removeClass('bg-warning bg-success bg-danger');
        if (status === 'Approved') {
            statusBadge.addClass('bg-success');
        } else if (status === 'Rejected') {
            statusBadge.addClass('bg-danger');
        } else {
            statusBadge.addClass('bg-warning');
        }
        
        // Populate skills
        const skillsContainer = modal.find('#modalSkills');
        skillsContainer.empty();
        
        if (skills && skills.length > 0) {
            skills.forEach(function(skill) {
                skillsContainer.append(`<span class="badge bg-light text-dark me-2 mb-2">${skill}</span>`);
            });
        } else {
            skillsContainer.append('<span class="text-muted">No skills provided</span>');
        }
        
        // Set application ID for action buttons
        modal.find('#approveApplicationBtn').data('application-id', applicationId);
        modal.find('#rejectApplicationBtn').data('application-id', applicationId);
    });
    
    // Handle approve application
    $('#approveApplicationBtn').click(function() {
        const applicationId = $(this).data('application-id');
        updateApplicationStatus(applicationId, 'Approved');
    });
    
    // Handle reject application
    $('#rejectApplicationBtn').click(function() {
        const applicationId = $(this).data('application-id');
        updateApplicationStatus(applicationId, 'Rejected');
    });
    
    // Function to update application status
    function updateApplicationStatus(applicationId, status) {
        $.ajax({
            url: '/applications/update',
            method: 'POST',
            data: {
                applicationId: applicationId,
                status: status
            },
            success: function(response) {
                $('#viewApplicationModal').modal('hide');
                
                // Show success message
                showAlert('success', `Application ${status.toLowerCase()} successfully`);
                
                // Refresh the page after a short delay
                setTimeout(function() {
                    window.location.reload();
                }, 1500);
            },
            error: function(xhr) {
                let errorMessage = `Failed to ${status.toLowerCase()} application`;
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                showAlert('danger', errorMessage);
            }
        });
    }
});