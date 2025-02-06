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
        sessionStorage.setItem('contentDict', JSON.stringify(data.content_dict));
        sessionStorage.setItem('allCurriculums', JSON.stringify(data.all_curriculums));
        
        // Call the populateSelectionElements after data is successfully loaded
        populateAvailableSelectionElements();

    } catch (error) {
        console.error('Error fetching course data:', error);
    }
}

function populateAvailableSelectionElements() {
    // Retrieve available content and curriculums from sessionStorage
    const availableContent = Object.keys(JSON.parse(sessionStorage.getItem('contentDict'))) || [];
    const availableCurriculums = JSON.parse(sessionStorage.getItem('allCurriculums')) || [];
    

    // Get references to the selection elements
    const contentSelect = document.getElementById('available-content');
    const curriculumSelect = document.getElementById('available-curriculums');
    const assignedContentSelect = document.getElementById('assigned-content');
    const assignedCurriculumSelect = document.getElementById('assigned-curriculums');

    // Clear existing options
    contentSelect.innerHTML = '';
    curriculumSelect.innerHTML = '';
    assignedContentSelect.innerHTML = '';
    assignedCurriculumSelect.innerHTML = '';

    // Populate content selection element
    availableContent.forEach(content => {
        const option = new Option(content, content);
        contentSelect.appendChild(option);
    });

    // Populate curriculum selection element
    availableCurriculums.forEach(curriculum => {
        const option = new Option(curriculum, curriculum);
        curriculumSelect.appendChild(option);
    });
}

function populateAssignedSelectionElements(studentAssignedContent, studentAssignedCurriculums) {        
    // Get references to the selection elements
    const assignedContentSelect = document.getElementById('assigned-content');
    const assignedCurriculumSelect = document.getElementById('assigned-curriculums');
    
    // Clear existing options
    assignedContentSelect.innerHTML = '';
    assignedCurriculumSelect.innerHTML = '';
    
    // Populate content assigned element
    if (studentAssignedContent && studentAssignedContent.length > 0) {
        studentAssignedContent.forEach(content => {
            const option = new Option(content, content);
            assignedContentSelect.appendChild(option);
        });
    }
    
    // Populate curriculum assigned element
    if (studentAssignedCurriculums && studentAssignedCurriculums.length > 0) {
        studentAssignedCurriculums.forEach(curriculum => {
            const option = new Option(curriculum, curriculum);
            assignedCurriculumSelect.appendChild(option);
        });
    }
}

async function fetchCourseData() {
    try {
        const response = await fetch('/course_data');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        const content_dict = data.content_dict;

        // Sort the dictionary by its keys case-insensitively
        const sortedContentDict = Object.keys(content_dict)
            .sort((keyA, keyB) => keyA.toLowerCase().localeCompare(keyB.toLowerCase()))
            .reduce((obj, key) => {
                obj[key] = content_dict[key];
                return obj;
            }, {});

        console.log(sortedContentDict); // Check the sorted dictionary

        // Save the sorted dictionary in session storage
        sessionStorage.setItem('contentDict', JSON.stringify(sortedContentDict));
        sessionStorage.setItem('allCurriculums', JSON.stringify(data.all_curriculums));
        
        // Call the populateSelectionElements after data is successfully loaded
        populateAvailableSelectionElements();

    } catch (error) {
        console.error('Error fetching course data:', error);
    }
}




function fetchUserData() {
    // Clear the previous editor content first (this doesn't remove the DOM elements)
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
            document.getElementById('initial_assigned_content').value = data.assigned_content ? data.assigned_content.join(', ') : '';
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
            populateAssignedSelectionElements(data.assigned_content, data.assigned_curriculums);

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
        var listFields = ['assigned_content', 'assigned_curriculums', 'completed_curriculums', 'correct_answers', 'incorrect_answers'];
        var dictFields = ['content_scores', 'curriculum_scores', 'xp'];

        // Get assigned content and curriculums
        var assignedContent = Array.from(document.getElementById('assigned-content').options).map(option => option.value);
        var assignedCurriculums = Array.from(document.getElementById('assigned-curriculums').options).map(option => option.value);
        
        console.log("Assigned Curriculum:", assignedCurriculums);
        console.log("Assigned Content", assignedContent);

        // Add the new assigned content and curriculums to changes object
        changes['assigned_content'] = assignedContent;
        changes['assigned_curriculums'] = assignedCurriculums;

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
        
        const mappingDict = {"assigned_content": "assignedContent",
                             "assigned_curriculums": "assignedCurriculums",
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


function setupContentButtons() {
    // Add Content Button
    document.getElementById('add-content').addEventListener('click', handleAddContent);
    document.getElementById('remove-content').addEventListener('click', handleRemoveContent);
}

function setupCurriculumButtons() {
    // Add Curriculum Button
    document.getElementById('add-curriculum').addEventListener('click', handleAddCurriculum);
    document.getElementById('remove-curriculum').addEventListener('click', handleRemoveCurriculum);
}

function handleAddContent() {
    var availableContent = document.getElementById('available-content');
    var assignedContent = document.getElementById('assigned-content');
    var selectedContentElement = availableContent.options[availableContent.selectedIndex];

    if (!selectedContentElement) {
        alert("Please select a content item to add");
        return;
    }

    if (isContentAlreadyAssigned(selectedContentElement, assignedContent)) {
        return;
    }

    addContentToAssigned(selectedContentElement, assignedContent);
    addCurriculumsToAssigned(selectedContentElement.value);
}

function handleRemoveContent() {
    var assignedContent = document.getElementById('assigned-content');
    var selectedContentElement = assignedContent.options[assignedContent.selectedIndex];

    if (!selectedContentElement) {
        alert("Please select a content item to remove");
        return;
    }

    removeContentFromAssigned(selectedContentElement, assignedContent);
    removeCurriculumsFromAssigned(selectedContentElement.value);
}

function handleAddCurriculum() {
    var availableCurriculums = document.getElementById('available-curriculums');
    var assignedCurriculums = document.getElementById('assigned-curriculums');
    var selectedCurriculumElement = availableCurriculums.options[availableCurriculums.selectedIndex];

    if (!selectedCurriculumElement) {
        alert("Please select a curriculum to add");
        return;
    }

    addCurriculumToAssigned(selectedCurriculumElement, assignedCurriculums);
}

function handleRemoveCurriculum() {
    var assignedCurriculums = document.getElementById('assigned-curriculums');
    var selectedCurriculumElement = assignedCurriculums.options[assignedCurriculums.selectedIndex];

    if (!selectedCurriculumElement) {
        alert("Please select a curriculum to remove");
        return;
    }

    removeCurriculumFromAssigned(selectedCurriculumElement, assignedCurriculums);
}

function isContentAlreadyAssigned(selectedContentElement, assignedContent) {
    for (var i = 0; i < assignedContent.options.length; i++) {
        if (assignedContent.options[i].value === selectedContentElement.value) {
            return true;
        }
    }
    return false;
}

function addContentToAssigned(selectedContentElement, assignedContent) {
    var newOption = document.createElement('option');
    newOption.value = selectedContentElement.value;
    newOption.text = selectedContentElement.text;
    assignedContent.appendChild(newOption);
}

function addCurriculumsToAssigned(contentKey) {
    var contentDict = JSON.parse(sessionStorage.getItem('contentDict'));
    var baseCurriculums = contentDict[contentKey] || [];
    var assignedCurriculums = document.getElementById('assigned-curriculums');

    baseCurriculums.forEach(function(curriculum) {
        if (![...assignedCurriculums.options].some(option => option.value === curriculum)) {
            var curriculumOption = document.createElement('option');
            curriculumOption.value = curriculum;
            curriculumOption.text = curriculum;
            assignedCurriculums.appendChild(curriculumOption);
        }
    });
}

function removeContentFromAssigned(selectedContentElement, assignedContent) {
    assignedContent.removeChild(selectedContentElement);
}

function removeCurriculumsFromAssigned(contentKey) {
    var contentDict = JSON.parse(sessionStorage.getItem('contentDict'));
    var baseCurriculums = contentDict[contentKey] || [];
    var assignedCurriculums = document.getElementById('assigned-curriculums');

    baseCurriculums.forEach(function(curriculum) {
        for (var i = 0; i < assignedCurriculums.options.length; i++) {
            if (assignedCurriculums.options[i].value === curriculum) {
                assignedCurriculums.removeChild(assignedCurriculums.options[i]);
                break;
            }
        }
    });
}

function addCurriculumToAssigned(selectedCurriculumElement, assignedCurriculums) {
    for (var i = 0; i < assignedCurriculums.options.length; i++) {
        if (assignedCurriculums.options[i].value === selectedCurriculumElement.value) {
            return; // Curriculum already assigned, exit
        }
    }

    var newCurriculumOption = document.createElement('option');
    newCurriculumOption.value = selectedCurriculumElement.value;
    newCurriculumOption.text = selectedCurriculumElement.text;
    assignedCurriculums.appendChild(newCurriculumOption);
}

function removeCurriculumFromAssigned(selectedCurriculumElement, assignedCurriculums) {
    assignedCurriculums.removeChild(selectedCurriculumElement);
}

document.addEventListener('DOMContentLoaded', function () {
    initializeEditors();
    fetchAndPopulateUsers();
    fetchCourseData();
    
    setupContentButtons();
    setupCurriculumButtons();
});