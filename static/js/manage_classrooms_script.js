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
        if (accordionId === 'accordion2') {populateClassroomDropdown(2);}
        if (accordionId === 'accordion3') {populateClassroomDropdown(3);}
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
    populateStudentsAddedList(2);
    populateAvailableContent();
    populateContentAddedList(2);
});

// Event listener for the classroom-selector dropdown
document.getElementById('classroom-selector-2').addEventListener('change', async function() {
    const selectedClassroomId = this.value;
    
    // Clear out the selection elements of any remnants
    document.getElementById('removed-students').innerHTML = '';
    document.getElementById('removed-content').innerHTML = '';
    
    // first fetch the classroomData - ensure data is fetched before proceeding
    await fetchClassroomData(selectedClassroomId);
    
    
    // When data is done fetching then populate the students in the classroom
    populateStudentsAddedList(3);
    populateContentAddedList(3);
});


// Populate the Select Classroom dropdown
function populateClassroomDropdown(id) {

    // Identify which accordion is activated
    let dropdown;
    if (id===2) {
        dropdown = document.getElementById('classroom-selector');
    };
    if (id==3) {
        dropdown = document.getElementById('classroom-selector-2');
    };
    
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
function populateStudentsAddedList(id) {
    console.log(classroomData);
    const assignedStudents = classroomData['students'] || [];

    // Identify which accordion is activated
    let unassignedList;
    let assignedList;
    if (id===2) {
        unassignedList = document.getElementById('students-to-add');
        assignedList = document.getElementById('assigned-students');
    };
    if (id==3) {
        unassignedList = document.getElementById('removed-students');
        assignedList = document.getElementById('assigned-students-2');
    };

    // Clear existing options in both lists
    while (unassignedList.firstChild) {unassignedList.removeChild(unassignedList.firstChild)};
    while (assignedList.firstChild) {assignedList.removeChild(assignedList.firstChild)};

    // Populate assigned students list
    assignedStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student;
        option.textContent = student;
        assignedList.appendChild(option);
    });
}

// Initialize the Content Added list with content already in the classroom
function populateContentAddedList(id) {
    
    // Get content already assigned to classroom
    const assignedContent = classroomData['assignedContent'] || [];
    
    // Identify which accordion is activated
    let unassignedList;
    let assignedList;
    if (id===2) {
        unassignedList = document.getElementById('content-to-add');
        assignedList = document.getElementById('assigned-content');
    };
    if (id==3) {
        unassignedList = document.getElementById('removed-content');
        assignedList = document.getElementById('assigned-content-2');
    };

    // Clear existing options
    while (assignedList.firstChild) {assignedList.removeChild(assignedList.firstChild)};

    // Populate assigned list
    assignedContent.forEach(content => {
        const option = document.createElement('option');
        option.value = content;
        option.textContent = content;
        assignedList.appendChild(option);
    });
}

// Function to initialize the Content to Add list - all content available to this admin
function populateAvailableContent() {
    
    // Select the element to load the content
    const availableContent = document.getElementById('available-content');
    
    // Get available data from the classroomData array
    const myContent = classroomData['availableContent'];
    
    // Clear existing options
    while (availableContent.firstChild) {availableContent.removeChild(availableContent.firstChild)};
    
    // Populate available-content list
    myContent.forEach(content => {
        const option = document.createElement('option');
        option.value = content;
        option.textContent = content;
        availableContent.appendChild(option);
    });

}


function assignMoveButtons() {
    // Student assignment buttons
    document.getElementById('add-student').addEventListener('click', handleAddStudent);
    document.getElementById('add-student-2').addEventListener('click', handleAddStudent2);
    document.getElementById('remove-student').addEventListener('click', handleRemoveStudent);
    document.getElementById('remove-student-2').addEventListener('click', handleRemoveStudent2);
    // Content assignment buttons
    document.getElementById('add-content').addEventListener('click', handleAddContent);
    document.getElementById('add-content-2').addEventListener('click', handleAddContent2);
    document.getElementById('remove-content').addEventListener('click', handleRemoveContent);
    document.getElementById('remove-content-2').addEventListener('click', handleRemoveContent2);
}

// Common function for adding or removing items from list to list
function moveListItem(listElement, fromList, toList) {
    // Ensure the element exists in the fromList before removing it
    if (fromList.contains(listElement)) {
        fromList.removeChild(listElement);
        toList.appendChild(listElement);
    }
}

function isItemAlreadyAssigned(selectedContentElement, assignedContent) {
    for (var i = 0; i < assignedContent.options.length; i++) {
        if (assignedContent.options[i].value === selectedContentElement.value) {
            return true;
        }
    }
    return false;
}

function handleAddStudent() {
    var studentsToAdd = document.getElementById('students-to-add');
    var assignedStudents = document.getElementById('assigned-students');

    // Convert the studentsToAdd to an array
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

function handleAddStudent2() {
    var assignedStudents = document.getElementById('assigned-students-2');
    var removedStudents = document.getElementById('removed-students');
    var selectedContentElement = assignedStudents.options[assignedStudents.selectedIndex];

    if (!selectedContentElement) {
        alert("Please select a student to move");
        return;
    }

    if (isItemAlreadyAssigned(selectedContentElement, removedStudents)) {
        return;
    }

    // Add content to the assigned content list
    var newOption = document.createElement('option');
    newOption.value = selectedContentElement.value;
    newOption.text = selectedContentElement.text;
    removedStudents.appendChild(newOption);
    
    // Remove the selected item from the element
    assignedStudents.removeChild(selectedContentElement);    
}

function handleAddContent() {
    var availableContent = document.getElementById('available-content');
    var assignedContent = document.getElementById('assigned-content');
    var selectedContentElement = availableContent.options[availableContent.selectedIndex];

    if (!selectedContentElement) {
        alert("Please select a content item to add");
        return;
    }

    if (isItemAlreadyAssigned(selectedContentElement, assignedContent)) {
        return;
    }

    // Add content to the assigned content list
    var newOption = document.createElement('option');
    newOption.value = selectedContentElement.value;
    newOption.text = selectedContentElement.text;
    assignedContent.appendChild(newOption);
    
    // Remove the selected item from the element
   availableContent.removeChild(selectedContentElement);    
}

function handleAddContent2() {
    var assignedContent = document.getElementById('assigned-content-2');
    var removedContent = document.getElementById('removed-content');
    var selectedContentElement = assignedContent.options[assignedContent.selectedIndex];

    if (!selectedContentElement) {
        alert("Please select a content item to remove");
        return;
    }

    if (isItemAlreadyAssigned(selectedContentElement, removedContent)) {
        return;
    }

    // Add content to the assigned content list
    var newOption = document.createElement('option');
    newOption.value = selectedContentElement.value;
    newOption.text = selectedContentElement.text;
    removedContent.appendChild(newOption);
    
    // Remove the selected item from the element
   assignedContent.removeChild(selectedContentElement);  
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

function handleRemoveStudent2() {
    var assignedStudents = document.getElementById('assigned-students-2');
    var removedStudents = document.getElementById('removed-students');
    var selectedContentElement = removedStudents.options[removedStudents.selectedIndex];
    
    if (!selectedContentElement) {
        alert("Please select a content item");
        return;
    }
    // Remove selection from the assigned-content list
    removedStudents.removeChild(selectedContentElement);
    
    // Removed content should appear back in the available content list
    var newOption = document.createElement('option');
    newOption.value = selectedContentElement.value;
    newOption.text = selectedContentElement.text;
    assignedStudents.appendChild(newOption);
}

function handleRemoveContent() {
    var availableContent = document.getElementById('available-content');
    var assignedContent = document.getElementById('assigned-content');
    var selectedContentElement = assignedContent.options[assignedContent.selectedIndex];
    
    if (!selectedContentElement) {
        alert("Please select a content item to remove");
        return;
    }
    // Remove selection from the assigned-content list
    assignedContent.removeChild(selectedContentElement);
    
    // Removed content should appear back in the available content list
    var newOption = document.createElement('option');
    newOption.value = selectedContentElement.value;
    newOption.text = selectedContentElement.text;
    availableContent.appendChild(newOption);
}

function handleRemoveContent2() {
    var assignedContent = document.getElementById('assigned-content-2');
    var removedContent = document.getElementById('removed-content');
    var selectedContentElement = removedContent.options[removedContent.selectedIndex];
    
    if (!selectedContentElement) {
        alert("Please select a content item");
        return;
    }
    
    // Remove selection from the assigned-content list
   removedContent.removeChild(selectedContentElement);
    
    // Removed content should appear back in the available content list
    var newOption = document.createElement('option');
    newOption.value = selectedContentElement.value;
    newOption.text = selectedContentElement.text;
    assignedContent.appendChild(newOption);
}

// Sets up the button assignment so can be recognized on page load
function assignSubmitButtons() {
    const submitAdditionsButton = document.getElementById('submit-additions');
    const submitRemovalsButton = document.getElementById('submit-removals');
    if (submitAdditionsButton) {submitAdditionsButton.addEventListener('click', handleSubmitAdditions)}
    else {console.error('Button with ID "submit-additions" not found')};
    if (submitRemovalsButton) {submitRemovalsButton.addEventListener('click', handleSubmitRemovals)}
    else {console.error('Button with ID "submit-removals" not found')};
}

function handleSubmitAdditions() {
     
    // Get the classroom_code and array of student emails assigned
    const classroomCode = document.getElementById('classroom-selector')?.value;
    
    // Get the student additions information
    const assignedStudents = Array.from(document.getElementById('assigned-students')?.children || []).map(item => item.value);
    const existingStudents = classroomData['students'] || [];
    const newStudents = assignedStudents.filter(student => !existingStudents.includes(student));
    
    // Get the content additions information
    const assignedContent = Array.from(document.getElementById('assigned-content')?.children || []).map(item => item.value);
    const existingContent = classroomData['assignedContent'] || [];
    const newContent = assignedContent.filter(content => !existingContent.includes(content));

    // Make sure a classroom code has been selected
    if (!classroomCode) {
        alert('Please select a classroom to add students or content.');
        return;
    }
    
    // Make sure some students or or content has been selected for addition
    if (newStudents.length === 0 && newContent.length === 0) {
        // Show alert if nothing new has been added
        alert('No new students or content have been selected for addition')
        return;
    }
    
    // Prepare the payload
    const assignments = { 'classroom_code': classroomCode, 'students': newStudents, 'content': newContent };
    console.log("Adding Student", assignments['students']);
    console.log("Adding Content", assignments['content'])
    
    // Send the POST request using Fetch API
    fetch('/assign_to_classroom', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignments),
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

function handleSubmitRemovals() {
     
    // Get the classroom_code and array of student emails assigned
    const classroomCode = document.getElementById('classroom-selector-2')?.value;
    
    // Get the student removals information
    const removedStudents = Array.from(document.getElementById('removed-students')?.children || []).map(item => item.value);
    
    // Get the content removals information
    const removedContent = Array.from(document.getElementById('removed-content')?.children || []).map(item => item.value);
    

    // Make sure a classroom code has been selected
    if (!classroomCode) {
        alert('Please select a classroom to remove students or content.');
        return;
    }
    
    // Make sure some students or or content has been selected for removal
    if (removedStudents.length === 0 && removedContent.length === 0) {
        // Show alert if nothing new has been added
        alert('No new students or content have been selected for removal')
        return;
    }
    
    // Prepare the payload
    const removals = { 'classroom_code': classroomCode, 'students': removedStudents, 'content': removedContent };
    console.log("Payload", removals)
    // Send the POST request using Fetch API
    fetch('/remove_from_classroom', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(removals),
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

document.addEventListener('DOMContentLoaded', function () {
    // Fetch course data and attach event listeners
    fetchMyClassrooms();
    assignMoveButtons(); // For add/remove
    assignSubmitButtons();    // For submit content or curriculum assignment
});