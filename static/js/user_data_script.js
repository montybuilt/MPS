// Declare the editors globally so they are accessible in other functions
let contentScoresEditor;
let curriculumScoresEditor;
let xpEditor;
var updatedContentScores = {};
var updatedCurriculumScores = {};
var updatedXp = {};


function toggleAccordion(accordionId) {
    var body = document.getElementById(accordionId);
    if (body.style.display === "flex") {
        body.style.display = "none";
    } else {
        body.style.display = "flex";
    }
}

function clearEditors() {
    // Only clear the editor content if the editor is initialized
    if (contentScoresEditor) contentScoresEditor.set(null);
    if (curriculumScoresEditor) curriculumScoresEditor.set(null);
    if (xpEditor) xpEditor.set(null);
}

function initializeEditors() {
    // Initialize the editors only if they are not initialized
    if (!contentScoresEditor) {
        contentScoresEditor = new JSONEditor(document.getElementById('content_scores'), {
            mode: 'tree',
            onChange: function() {
                updatedContentScores = contentScoresEditor.get(); // Store updated data
                console.log("Updated Content Scores:", updatedContentScores);
            }
        });
    }

    if (!curriculumScoresEditor) {
        curriculumScoresEditor = new JSONEditor(document.getElementById('curriculum_scores'), {
            mode: 'tree',
            onChange: function() {
                updatedCurriculumScores = curriculumScoresEditor.get(); // Store updated data
                console.log("Updated Curriculum Scores:", updatedCurriculumScores);
            }
        });
    }

    if (!xpEditor) {
        xpEditor = new JSONEditor(document.getElementById('xp'), {
            mode: 'tree',
            onChange: function() {
                updatedXp = xpEditor.get(); // Store updated data
                console.log("Updated xp Scores:", updatedXp);
            }
        });
    }
}


async function fetchAndPopulateUsers() {
    try {
        const response = await fetch('/get_users');
        if (!response.ok) {
            const errorData = await response.json();  // Extract the error message from the response
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();  // Assume response is { "users": [...] }

        // Populate the dropdown
        const dropdown = document.getElementById('username');
        data.users.forEach(username => {  // Access the usernames via 'data.users'
            const option = document.createElement('option');
            option.value = username;
            option.text = username;
            dropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching usernames:', error);

        // Display the error message in an alert
        alert(`Error: ${error.message}`);
    }
}


async function fetchCourseData() {
    try {
        const response = await fetch('/course_data');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Save the data in session storage
        sessionStorage.setItem('allCurriculums', JSON.stringify(data.all_curriculums));
        
        // Call the populateSelectionElements after data is successfully loaded
        populateAvailableSelectionElements();

    } catch (error) {
        console.error('Error fetching course data:', error);
    }
}

function populateAvailableSelectionElements() {
    // Retrieve available content and curriculums from sessionStorage
    const availableCurriculums = JSON.parse(sessionStorage.getItem('allCurriculums')) || [];
    

    // Get references to the selection elements
    const curriculumSelect = document.getElementById('available-curriculums');
    const assignedCurriculumSelect = document.getElementById('assigned-curriculums');

    // Clear existing options
    curriculumSelect.innerHTML = '';
    assignedCurriculumSelect.innerHTML = '';

    // Populate curriculum selection element
    availableCurriculums.forEach(curriculum => {
        const option = new Option(curriculum, curriculum);
        curriculumSelect.appendChild(option);
    });
}

function populateAssignedSelectionElements(studentAssignedCurriculums) {        
    // Get references to the selection elements
    const assignedCurriculumSelect = document.getElementById('assigned-curriculums');
    const assignedCurriculumSelect2 = document.getElementById('assigned-curriculums-2');
    const removedCurriculums = document.getElementById('removed-curriculums');
    
    // Clear existing options
    assignedCurriculumSelect.innerHTML = '';
    assignedCurriculumSelect2.innerHTML = '';
    removedCurriculums.innerHTML = '';
    
    // Populate curriculum assigned element for add curriculums
    if (studentAssignedCurriculums && studentAssignedCurriculums.length > 0) {
        studentAssignedCurriculums.forEach(curriculum => {
            const option = new Option(curriculum, curriculum);
            assignedCurriculumSelect.appendChild(option);
        });
    }
    
    // Populate curriculum assigned element for remove curriculums
    if (studentAssignedCurriculums && studentAssignedCurriculums.length > 0) {
        studentAssignedCurriculums.forEach(curriculum => {
            const option = new Option(curriculum, curriculum);
            assignedCurriculumSelect2.appendChild(option);
        });
    }
}

function fetchUserData() {
    // Clear the previous editors first (this doesn't remove the DOM elements)
    clearEditors();

    var username = document.getElementById('username').value;
    if (username) {
    console.log("Fetch Data for :", username)
        fetch('/get_user_data?username=' + username)
        .then(response => response.json())
        .then(data => {
            // Populate fields with data as before
            document.getElementById('email').value = data.email || '';
            document.getElementById('completed_curriculums').value = data.completed_curriculums ? data.completed_curriculums.join(', ') : '';
            document.getElementById('correct_answers').value = data.correct_answers || '';
            document.getElementById('current_curriculum').value = data.current_curriculum || '';
            document.getElementById('current_question').value = data.current_question || '';
            document.getElementById('incorrect_answers').value = data.incorrect_answers || '';
            
            // Update hidden fields with initial values
            document.getElementById('initial_password').value = data.password || '';  // Assuming password is fetched
            document.getElementById('initial_email').value = data.email || '';
            document.getElementById('initial_assigned_curriculums').value = data.assigned_curriculums ? data.assigned_curriculums.join(', ') : '';
            document.getElementById('initial_completed_curriculums').value = data.completed_curriculums ? data.completed_curriculums.join(', ') : '';
            document.getElementById('initial_current_curriculum').value = data.current_curriculum || '';
            document.getElementById('initial_current_question').value = data.current_question || '';
            document.getElementById('initial_content_scores').value = JSON.stringify(data.content_scores) || '{}';
            document.getElementById('initial_curriculum_scores').value = JSON.stringify(data.curriculum_scores) || '{}';
            document.getElementById('initial_xp').value = JSON.stringify(data.xp) || '{}';
            document.getElementById('initial_correct_answers').value = data.correct_answers || '';
            document.getElementById('initial_incorrect_answers').value = data.incorrect_answers || '';

            // Call the function to populate the assigned content and curriculums selection boxes
            populateAssignedSelectionElements(data.custom_curriculums);

            // Reinitialize the editors and populate them with the data
            initializeEditors();  // Ensure the editors are initialized before setting data

            if (data.content_scores) contentScoresEditor.set(data.content_scores);
            if (data.curriculum_scores) curriculumScoresEditor.set(data.curriculum_scores);
            if (data.xp) xpEditor.set(data.xp);
        })
        .catch(error => console.error('Error fetching user data:', error));
    }
}

function submitForm() {
    try {
        var username = document.getElementById('username').value;
        var form = document.getElementById('user-data-form');
        var formData = new FormData(form);
        var changes = { username: username };

        // Assign collections of fields by type
        var listFields = ['assigned_curriculums', 'removed_curriculums', 'completed_curriculums', 'correct_answers', 'incorrect_answers'];
        var dictFields = ['content_scores', 'curriculum_scores', 'xp'];

        // Get assigned content and curriculums
        var assignedCurriculums = Array.from(document.getElementById('assigned-curriculums').options).map(option => option.value);
        
        // Get removed content and curriculums
        var removedCurriculums = Array.from(document.getElementById('removed-curriculums').options).map(option => option.value);

        // Add the content and curriculums changes to changes dictionary
        changes['assigned_curriculums'] = assignedCurriculums;
        changes['removed_curriculums'] = removedCurriculums;        

        // Include updated content, curriculum, and xp scores if they exist
        if (updatedContentScores) {
            changes['content_scores'] = updatedContentScores;
        }

        if (updatedCurriculumScores) {
            changes['curriculum_scores'] = updatedCurriculumScores;
        }

        if (updatedXp) {
            changes['xp'] = updatedXp;
        }

        // Fetch only changed fields
        formData.forEach((value, key) => {
            var initialKey = 'initial_' + key;
            // Check if form[initialKey] exists and compare values
            if (form[initialKey] && form[initialKey].value !== value) {
                if (listFields.includes(key)) {
                    changes[key] = value ? value.split(',').map(item => item.trim()) : [];
                } else if (dictFields.includes(key)) {
                    try {
                        changes[key] = value ? JSON.parse(value) : {};
                    } catch (e) {
                        console.error('Error parsing JSON for key:', key, 'Value:', value, 'Error:', e);
                    }
                } else {
                    changes[key] = value;
                }
            }
        });
        
        const mappingDict = {"assigned_curriculums": "assignedCurriculums",
                             "completed_curriculums": "completedCurriculums"}

        console.log('Changes to be sent:', changes);

        fetch('/update_user', {
            method: 'POST',
            body: JSON.stringify(changes),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.message === "User data updated successfully") {
                location.reload(); // Refresh the page
            }
        })
        .catch(error => console.error('Error updating user data:', error));
    } catch (err) {
        console.error('Error during form submission:', err);
    }
}

function setupCurriculumButtons() {
    // Add Curriculum Button
    var avC = document.getElementById('available-curriculums');
    var asC = document.getElementById('assigned-curriculums');
    var asC2 = document.getElementById('assigned-curriculums-2');
    var rmC = document.getElementById('removed-curriculums');
    
    document.getElementById('add-curriculum').addEventListener('click', function() {moveSelected(avC, asC)});
    document.getElementById('remove-curriculum').addEventListener('click', function() {moveSelected(asC, avC)});
    document.getElementById('add-curriculum-2').addEventListener('click', function() {moveSelected(asC2, rmC)});
    document.getElementById('remove-curriculum-2').addEventListener('click', function() {moveSelected(rmC, asC2)});
}

function moveSelected(sourceSelect, destSelect) {
  // Convert selected options (a live collection) to an array.
  const selectedOptions = Array.from(sourceSelect.selectedOptions);
  selectedOptions.forEach(option => {
    // Move each option from source to destination.
    destSelect.add(option);
  });
  // Sort the destination element
  const optionsArray = Array.from(destSelect.options);
  optionsArray.sort((a,b) => a.text.localeCompare(b.text));
  destSelect.innerHTML = "";
  optionsArray.forEach(option => destSelect.add(option));
  
}


document.addEventListener('DOMContentLoaded', function () {
    initializeEditors();
    fetchAndPopulateUsers();
    fetchCourseData();
    setupCurriculumButtons();
});