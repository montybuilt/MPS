// Global data variables
let myClassrooms;
let classroomData;

// Function to run when accordion headers are clicked    
function toggleAccordion(accordionId) {
    var body = document.getElementById(accordionId);
    if (body.style.display === "flex") {
        body.style.display = "none";
    } else {
        body.style.display = "flex";
        // Check if the accordion2 is clicked and call populateDropdown
        if (accordionId === 'accordion2') {populateClassroomDropdown();}
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

// Function to fetch all classrooms for this admin user
// gets called when the page loads
async function fetchMyClassrooms() {
    try {
        const response = await fetch('/classrooms');
        
        const new_response = await handleFetchError(response); // Use the centralized error handler
        
        // Save the data
        myClassrooms = new_response.data
    } catch (error) {
        console.error('Failed to fetch classrooms:', error);
    }
}
    
// function to get classroom members and content assignments and save in classroomData
// gets called when the user selects a classroom code from dropdown
async function fetchClassroomData(class_code) {
    try {
        const response = await fetch('/classroom_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ class_code })
        });
        
        const new_response = await handleFetchError(response); // Use the centralized error handler
        
        // Save the data
        classroomData = new_response.data;
    } catch (error) {
        console.error('Failed to fetch classroom data:', error);
    }
}

// Event listener for the classroom-selector dropdown
document.getElementById('classroom-selector').addEventListener('change', async function() {
    const selectedClassroomId = this.value;
    // first fetch the classroomData - ensure data is fetched before proceeding
    await fetchClassroomData(selectedClassroomId);
    // When data is done fetching then populate the students in the classroom
    populateStudentsAddedList();
});


// Populate the Select Classroom dropdown
function populateClassroomDropdown() {
    const dropdown = document.getElementById('classroom-selector');
    classrooms = myClassrooms || [];

    // Clear existing options
    while (dropdown.firstChild) {dropdown.removeChild(dropdown.firstChild)};

    // Add default "Select Classroom" option
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Select Classroom";
    defaultOption.disabled = true; // Prevent selection
    defaultOption.selected = true; // Make it the default selected option
    dropdown.appendChild(defaultOption);

    // Populate dropdown with dynamic options
    classrooms.forEach(classroom => {
        const option = document.createElement('option');
        option.value = classroom;
        option.textContent = classroom;
        dropdown.appendChild(option);
    });
    
}

// Initialize the Students Added list with students already in the classroom
function populateStudentsAddedList() {
    console.log(classroomData);
    const assignedStudents = classroomData['students'] || [];


    // Get the list select elements
    const studentsToAddList = document.getElementById('students-to-add');
    const assignedStudentsList = document.getElementById('assigned-students');

    // Clear existing options in both lists
    while (studentsToAddList.firstChild) {studentsToAddList.removeChild(studentsToAddList.firstChild)};
    while (assignedStudentsList.firstChild) {assignedStudentsList.removeChild(assignedStudentsList.firstChild)};

    // Populate assigned students list
    assignedStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student;
        option.textContent = student;
        assignedStudentsList.appendChild(option);
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

// Event Listener to update database with new classroom upon pressing submit-new-classroom button
document.getElementById('submit-new-classroom').addEventListener('click', function() {
    // Get the values from the input fields
    const newClassroom = document.getElementById('new-classroom').value;
    const newClassroomDescription = document.getElementById('new-classroom-description').value;

    // Prepare the data to be sent in the POST request
    const data = { data: [newClassroom, newClassroomDescription], table: 'classroom' };

    // Send the POST request using the Fetch API
    fetch('/new_classroom', {
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
        // Clear the new-content entry box and alert the user
        document.getElementById('new-classroom').value = '';
        document.getElementById('new-classroom-description').value = '';
        alert("New classroom added successfully!");
    })
    .catch((error) => {
        // Handle errors
        console.error('Error:', error);
        alert(error.message || "An Unexpected Error Occurred.");
    });
});

function assignAddRemoveButtons() {
    // Student assignment buttons
    document.getElementById('add-student').addEventListener('click', handleAddStudent);
    document.getElementById('remove-student').addEventListener('click', handleRemoveStudent);
    // Content assignment buttons
    //document.getElementById('add-content').addEventListener('click', handleAddContent);
    //document.getElementById('remove-content').addEventListener('click', handleRemoveContent);
}

// Common function for adding or removing items from list to list
function moveListItem(listElement, fromList, toList) {
    // Ensure the element exists in the fromList before removing it
    if (fromList.contains(listElement)) {
        fromList.removeChild(listElement);
        toList.appendChild(listElement);
    }
}

function handleAddStudent() {
    var studentsToAdd = document.getElementById('students-to-add');
    var assignedStudents = document.getElementById('assigned-students');

    // Get all entered email addresses
    var newStudents = studentsToAdd.value.split("\n").map(email => email.trim()).filter(email => email !== "");

    if (newStudents.length === 0) {
        alert("Please enter at least one student email to add.");
        return;
    }

    // Loop through each email and add it as an <option> in the <select>
    newStudents.forEach(function(student) {
        var option = document.createElement("option");
        option.value = student;
        option.textContent = student;
        assignedStudents.appendChild(option);
    });

    // Clear the textarea after adding students
    studentsToAdd.value = "";
}

function handleRemoveStudent() {
    var studentsToAdd = document.getElementById('students-to-add');
    var assignedStudents = document.getElementById('assigned-students');
    
    // Get all selected options from the assigned students list
    var selectedStudents = Array.from(assignedStudents.selectedOptions);
    
    if (selectedStudents.length === 0) {
        alert("Please select at least one student to remove.");
        return;
    }

    // Extract the values (email addresses) from the selected options
    var removedEmails = selectedStudents.map(option => option.value);

    // Append the removed emails to the textarea, preserving existing content
    var existingEmails = studentsToAdd.value.trim();
    studentsToAdd.value = existingEmails ? existingEmails + "\n" + removedEmails.join("\n") : removedEmails.join("\n");

    // Remove selected options from the <select>
    selectedStudents.forEach(option => option.remove());
}


// Sets up the button assignment so can be recognized on page load
function assignSubmitButtons() {
    const submitStudentAssignmentsButton = document.getElementById('submit-student-assignments');
    //const contentSubmitButton = document.getElementById('submit-curriculum-assignment');
    if (submitStudentAssignmentsButton) {submitStudentAssignmentsButton.addEventListener('click', handleSubmitStudentAssignments)}
    else {console.error('Button with ID "submit-student-assignments" not found.')}
    //if (contentSubmitButton) {curriculumSubmitButton.addEventListener('click', handleSubmitContentAssignment)}
    //else {console.error('Button with ID "submit-curriculum-assignment" not found.')}
}

function handleSubmitStudentAssignments() {
    // Get the classroom_code and array of student emails assigned
    const classroomCode = document.getElementById('classroom-selector')?.value;
    const assignedStudents = Array.from(document.getElementById('assigned-students')?.children || []).map(item => item.value);
    const existingStudents = classroomData['students'] || [];
    const newStudents = assignedStudents.filter(student => !existingStudents.includes(student));

    if (!classroomCode) {
        alert('Please select a classroom and add students.');
        return;
    }

    if (assignedStudents.length === 0) {
        // Show confirmation dialog with custom message
        const confirmAction = window.confirm('No students assigned. Continuing will remove all students from this classroom. Are you sure?');
        
        if (!confirmAction) {
            return;  // If user clicks "No", exit the function
        }
    }

    // Prepare the payload
    const studentAssignments = { 'classroom_code': classroomCode, 'students': newStudents };
    console.log("Adding Student", studentAssignments['students'])

    // Send the POST request using Fetch API
    fetch('/assign_students_to_classroom', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentAssignments),
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                throw new Error(data.error);
            }
            alert(data.message);
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

    if (assignedQuestions.length === 0) {
        // Show confirmation dialog with custom message
        const confirmAction = window.confirm('No tasks assigned. Continuing will remove all assigned tasks for this content area. Are you sure?');
        
        if (!confirmAction) {
            return;  // If user clicks "No", exit the function
        }
    }

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
    fetchMyClassrooms();
    assignAddRemoveButtons(); // For add/remove
    assignSubmitButtons();    // For submit content or curriculum assignment
});