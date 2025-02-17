// Function to run when accordion headers are clicked    
function toggleAccordion(accordionId) {
    var body = document.getElementById(accordionId);
    if (body.style.display === "flex") {
        body.style.display = "none";
    } else {
        body.style.display = "flex";
        // Check if the accordion2 is clicked and call populateDropdown
        if (accordionId === 'accordion2') {populateContentDropdown();}
        if (accordionId === 'accordion3') {populateCurriculumDropdown();}
    }
}

// Centralized error handling for fetch requests
async function handleFetchError(response) {
    if (!response.ok) {
        const errorMessage = `Error: ${response.status} ${response.statusText}`;
        console.error(errorMessage);
        throw new Error(errorMessage); // Throwing error so that it can be handled in catch block
    }
    return response.json(); // Return the parsed JSON if successful
}

// function to load content, curriculum and question data on page load
async function fetchCourseData() {
    try {
        const response = await fetch('/course_data');
        const data = await handleFetchError(response); // Use the centralized error handler
        // Save the data in session storage
        sessionStorage.setItem('contentDict', JSON.stringify(data.content_dict));
        sessionStorage.setItem('allCurriculums', JSON.stringify(data.all_curriculums));
        sessionStorage.setItem('allQuestions', JSON.stringify(data.all_questions));
        sessionStorage.setItem('curriculumDict', JSON.stringify(data.curriculum_dict))
        console.log(data);
    } catch (error) {
        console.error('Failed to fetch course data:', error);
    }
}

// Event listener for the content-selector dropdown
document.getElementById('content-selector').addEventListener('change', function() {
    const selectedContentId = this.value;
    populateCurriculumsLists(selectedContentId);
});

// Event listener for the curriculum-selector dropdown
document.getElementById('curriculum-selector').addEventListener('change', function() {
    const selectedCurriculumId = this.value;
    populateQuestionLists(selectedCurriculumId);
});

// Populate the Select Content dropdown
function populateContentDropdown() {
    const contentDict = JSON.parse(sessionStorage.getItem('contentDict')) || {};
    const keys = Object.keys(contentDict);
    const dropdown = document.getElementById('content-selector');

    // Clear existing options
    while (dropdown.firstChild) {dropdown.removeChild(dropdown.firstChild)};

    // Add default "Select Content" option
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Select Content";
    defaultOption.disabled = true; // Prevent selection
    defaultOption.selected = true; // Make it the default selected option
    dropdown.appendChild(defaultOption);

    // Populate dropdown with dynamic options
    keys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        dropdown.appendChild(option);
    });
}

// Populate the Select Curriculum dropdown
function populateCurriculumDropdown() {
    const allCurriculums = JSON.parse(sessionStorage.getItem('allCurriculums')) || [];
    const dropdown = document.getElementById('curriculum-selector');

    // Clear existing options
    while (dropdown.firstChild) {dropdown.removeChild(dropdown.firstChild)};

    // Add default "Select Curriculum" option
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Select Curriculum";
    defaultOption.disabled = true; // Prevent selection
    defaultOption.selected = true; // Make it the default selected option
    dropdown.appendChild(defaultOption);

    // Populate dropdown with dynamic options
    allCurriculums.forEach(curriculum => {
        const option = document.createElement('option');
        option.value = curriculum;
        option.textContent = curriculum;
        dropdown.appendChild(option);
    });
}


// Populate the Available and Assigned Curriculums list
function populateCurriculumsLists(contentId) {
    // Retrieve contentDict and allCurriculums from sessionStorage
    const contentDict = JSON.parse(sessionStorage.getItem('contentDict')) || {};
    const allCurriculums = JSON.parse(sessionStorage.getItem('allCurriculums')) || [];

    // Get assigned curriculums for the given contentId
    const assignedCurriculums = contentDict[contentId] || [];

    // Filter available curriculums to exclude assigned curriculums
    const availableCurriculums = allCurriculums.filter(curriculum => !assignedCurriculums.includes(curriculum));

    // Get the list select elements
    const availableCurriculumsList = document.getElementById('available-curriculums');
    const assignedCurriculumsList = document.getElementById('assigned-curriculums');

    // Clear existing options in both lists
    while (availableCurriculumsList.firstChild) {availableCurriculumsList.removeChild(availableCurriculumsList.firstChild)};
    while (assignedCurriculumsList.firstChild) {assignedCurriculumsList.removeChild(assignedCurriculumsList.firstChild)};

    // Populate available curriculums list
    availableCurriculums.forEach(curriculum => {
        const option = document.createElement('option');
        option.value = curriculum;
        option.textContent = curriculum;
        availableCurriculumsList.appendChild(option);
    });

    // Populate assigned curriculums list
    assignedCurriculums.forEach(curriculum => {
        const option = document.createElement('option');
        option.value = curriculum;
        option.textContent = curriculum;
        assignedCurriculumsList.appendChild(option);
    });
}

// Populate the available and assigned Questions lists
function populateQuestionLists(curriculumId) {
    const curriculumDict = JSON.parse(sessionStorage.getItem('curriculumDict'));
    const allQuestions = JSON.parse(sessionStorage.getItem('allQuestions'));

    // Get assigned questions for the selected curriculum
    const assignedQuestions = curriculumDict[curriculumId] || [];

    // Filter out assigned questions to get the available questions
    const availableQuestions = allQuestions.filter(q => !assignedQuestions.includes(q));

    // Populate the assigned-questions list
    const assignedList = document.getElementById('assigned-questions');
    assignedList.innerHTML = '';
    assignedQuestions.forEach(question => {
        const option = document.createElement('option');
        option.value = question;
        option.textContent = question;
        assignedList.appendChild(option);
    });

    // Populate the available-questions list
    const availableList = document.getElementById('available-questions');
    availableList.innerHTML = '';
    availableQuestions.forEach(question => {
        const option = document.createElement('option');
        option.value = question;
        option.textContent = question;
        availableList.appendChild(option);
    });
}

// Event Listener to update database with new content upon pressing submit-new-content button
document.getElementById('submit-new-content').addEventListener('click', function() {
    // Get the value from the input field
    const newContent = document.getElementById('new-content').value;

    // Prepare the data to be sent in the POST request
    const data = { data: newContent, table: 'content' };

    // Send the POST request using the Fetch API
    fetch('/new_content_or_curriculum', {
        method: 'POST', // Use the POST method
        headers: {
            'Content-Type': 'application/json' // Send as JSON
        },
        body: JSON.stringify(data) // Convert data object to JSON string
    })
    .then(response => {
        // Parse JSON and check response status
        return response.json().then(jsonData => {
            if (!response.ok) {
                // Targeted error handling based on server response
                if (response.status === 409 && jsonData.error?.includes('UNIQUE constraint')) {
                    throw new Error("Database Error: Make sure your content ID is unique.");
                } else {
                    throw new Error(jsonData.error || "An Unexpected Error Occurred.");
                }
            }
            return jsonData;
        });
    })
    .then(data => {
        console.log('Success:', data);
        // Update contentDict in sessionStorage
        let contentDict = JSON.parse(sessionStorage.getItem('contentDict')) || {};
        contentDict[newContent] = [];
        sessionStorage.setItem('contentDict', JSON.stringify(contentDict));
        // Clear the new-content entry box and alert the user
        document.getElementById('new-content').value = '';
        alert("New content added successfully!");
    })
    .catch((error) => {
        // Handle errors
        console.error('Error:', error);
        alert(error.message || "An Unexpected Error Occurred.");
    });
});


// Event Listener to update database with new curriculum upon pressing submit-new-curriculum button
document.getElementById('submit-new-curriculum').addEventListener('click', function() {
    // Get the value from the input field
    const newCurriculum = document.getElementById('new-curriculum').value;

    // Prepare the data to be sent in the POST request
    const data = { data: newCurriculum, table: 'curriculum' };

    // Send the POST request using the Fetch API
    fetch('/new_content_or_curriculum', {
        method: 'POST', // Use the POST method
        headers: {
            'Content-Type': 'application/json' // Send as JSON
        },
        body: JSON.stringify(data) // Convert data object to JSON string
    })
    .then(response => {
        // Parse JSON and check response status
        return response.json().then(jsonData => {
            if (!response.ok) {
                // Targeted error handling based on server response
                if (response.status === 409 && jsonData.error?.includes('UNIQUE constraint')) {
                    throw new Error("Database Error: Make sure your curriculum ID is unique.");
                } else {
                    throw new Error(jsonData.error || "An Unexpected Error Occurred.");
                }
            }
            return jsonData;
        });
    })
    .then(data => {
        console.log('Success:', data);
        // Update allCurriculums in sessionStorage
        let allCurriculums = JSON.parse(sessionStorage.getItem('allCurriculums')) || [];
        allCurriculums.push(newCurriculum);
        sessionStorage.setItem('allCurriculums', JSON.stringify(allCurriculums));
        // Clear the new-curriculum entry box and alert the user
        document.getElementById('new-curriculum').value = '';
        alert("New curriculum added successfully!");
    })
    .catch((error) => {
        // Handle errors
        console.error('Error:', error);
        alert(error.message || "An Unexpected Error Occurred.");
    });
});



function assignAddRemoveButtons() {
    // Curriculum Buttons
    document.getElementById('add-curriculum').addEventListener('click', handleAddCurriculum);
    document.getElementById('remove-curriculum').addEventListener('click', handleRemoveCurriculum);
    // Add Question Button
    document.getElementById('add-question').addEventListener('click', handleAddQuestion);
    document.getElementById('remove-question').addEventListener('click', handleRemoveQuestion);
}

// Common function for adding or removing items from list to list
function moveListItem(listElement, fromList, toList) {
    // Ensure the element exists in the fromList before removing it
    if (fromList.contains(listElement)) {
        fromList.removeChild(listElement);
        toList.appendChild(listElement);
    }
}

// Handle adding a curriculum
function handleAddCurriculum() {
    var availableCurriculums = document.getElementById('available-curriculums');
    var assignedCurriculums = document.getElementById('assigned-curriculums');
    
    // Get all selected options from the available curriculums list
    var selectedCurriculums = Array.from(availableCurriculums.selectedOptions);
    
    if (selectedCurriculums.length === 0) {
        alert("Please select at least one curriculum to add");
        return;
    }
    
    // Loop through each selected curriculum and move it to the assigned list
    selectedCurriculums.forEach(function(curriculumElement) {
        moveListItem(curriculumElement, availableCurriculums, assignedCurriculums);
    });
}

// Handle adding a question
function handleAddQuestion() {
    var availableQuestions = document.getElementById('available-questions');
    var assignedQuestions = document.getElementById('assigned-questions');
    
    // Get all selected options from the available questions list
    var selectedQuestions = Array.from(availableQuestions.selectedOptions);
    
    if (selectedQuestions.length === 0) {
        alert("Please select at least one question to add");
        return;
    }
    
    // Loop through each selected question and move it to the assigned list
    selectedQuestions.forEach(function(questionElement) {
        moveListItem(questionElement, availableQuestions, assignedQuestions);
    });
}

// Handle removing a curriculum
function handleRemoveCurriculum() {
    var availableCurriculums = document.getElementById('available-curriculums');
    var assignedCurriculums = document.getElementById('assigned-curriculums');
    
    // Get all selected options from the assigned curriculums list
    var selectedCurriculums = Array.from(assignedCurriculums.selectedOptions);
    
    if (selectedCurriculums.length === 0) {
        alert("Please select at least one curriculum to remove");
        return;
    }
    
    // Loop through each selected curriculum and move it back to the available list
    selectedCurriculums.forEach(function(curriculumElement) {
        moveListItem(curriculumElement, assignedCurriculums, availableCurriculums);
    });
}

// Handle removing a question
function handleRemoveQuestion() {
    var availableQuestions = document.getElementById('available-questions');
    var assignedQuestions = document.getElementById('assigned-questions');
    
    // Get all selected options from the assigned questions list
    var selectedQuestions = Array.from(assignedQuestions.selectedOptions);
    
    if (selectedQuestions.length === 0) {
        alert("Please select at least one question to remove");
        return;
    }
    
    // Loop through each selected curriculum and move it back to the available list
    selectedQuestions.forEach(function(questionElement) {
        moveListItem(questionElement, assignedQuestions, availableQuestions);
    });
}

// Sets up the button assignment so can be recognized on page load
function assignAssignmentButtons() {
    const contentSubmitButton = document.getElementById('submit-content-assignment');
    const curriculumSubmitButton = document.getElementById('submit-curriculum-assignment');
    if (contentSubmitButton) {contentSubmitButton.addEventListener('click', handleSubmitContentAssignment)}
    else {console.error('Button with ID "submit-content-assignment" not found.')}
    if (curriculumSubmitButton) {curriculumSubmitButton.addEventListener('click', handleSubmitCurriculumAssignment)}
    else {console.error('Button with ID "submit-curriculum-assignment" not found.')}
}

function handleSubmitContentAssignment() {
    // Get the content_id and array of curriculums assigned
    const contentId = document.getElementById('content-selector')?.value;
    const assignedCurriculums = Array.from(document.getElementById('assigned-curriculums')?.children || []).map(item => item.value);

    if (!contentId) {
        alert('Please select a content item.');
        return;
    }

    alert("No curriculums assigned.");
    return;

    // Prepare the payload
    const contentAssignments = { 'content_id': contentId, 'base_curriculums': assignedCurriculums };

    // Send the POST request using Fetch API
    fetch('/assign_curriculum_to_content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(contentAssignments),
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                throw new Error(data.error);
            }
            // Update contentDict in sessionStorage
            const contentDict = JSON.parse(sessionStorage.getItem('contentDict')) || {};
            contentDict[contentId] = assignedCurriculums;
            sessionStorage.setItem('contentDict', JSON.stringify(contentDict));
            alert('Content and curriculum assignments updated successfully!');
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'An unexpected error occurred.');
        });
}

function handleSubmitCurriculumAssignment() {
    // Get the curriculum_id and array of tasks assigned
    const curriculumId = document.getElementById('curriculum-selector')?.value;
    const assignedQuestions = Array.from(document.getElementById('assigned-questions')?.children || []).map(item => item.value);

    if (!curriculumId) {
        alert('Please select a curriculum item.');
        return;
    }

    alert("No questions assigned.");
    return;

    // Prepare the payload
    const curriculumAssignments = { 'curriculum_id': curriculumId, 'task_list': assignedQuestions };

    // Send the POST request using Fetch API
    fetch('/assign_tasks_to_curriculum', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(curriculumAssignments),
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                throw new Error(data.error);
            }
            // Update curriculumDict in sessionStorage
            const curriculumDict = JSON.parse(sessionStorage.getItem('curriculumDict')) || {};
            curriculumDict[curriculumId] = assignedQuestions;
            sessionStorage.setItem('curriculumDict', JSON.stringify(curriculumDict));
            alert('Curriculum and task assignments updated successfully!');
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'An unexpected error occurred.');
        });
}

document.addEventListener('DOMContentLoaded', function () {
    // Fetch course data and attach event listeners
    fetchCourseData();
    assignAddRemoveButtons(); // For add/remove curriculum
    assignAssignmentButtons();    // For submit content or curriculum assignment
});