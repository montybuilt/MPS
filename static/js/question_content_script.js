
let questionKey = '';  // To store the current questionKey
let questionKeys = []; // To store all question keys
let newQuestion = false; // Monitor if a new question is being added
let teacherContent;

// Initialize CodeMirror
const codeEditor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    mode: "python",
    //theme: "dracula",
    tabSize: 4,
    indentUnit: 4,
    matchBrackets: true,
    viewportMargin: Infinity,
});

// Centralized error handling for fetch requests
async function handleFetchError(response) {
    if (!response.ok) {
        const errorMessage = `Error: ${response.status} ${response.statusText}`;
        console.error(errorMessage);
        throw new Error(errorMessage); // Throwing error so that it can be handled in catch block
    }
    return response.json(); // Return the parsed JSON if successful
}

// function to load content for the admin
// Represents all content areas admin user has assigned via classroom
// System user gets all content areas in the database
async function fetchCourseData() {
    try {
        const response = await fetch('/admin_content');
        const data = await handleFetchError(response); // Use the centralized error handler
        // Save the data in session storage
        teacherContent = Object.keys(data.content_dict);
        if (data.custom_curriculums) { teacherContent.push("custom") };
        
    } catch (error) {
        console.error('Failed to fetch course data:', error);
    }
}

// Fetch question from the server
function fetchQuestion(questionKey) {
    fetch('/question_content', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({'questionKey': questionKey})
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Populate the form with the received question data
        const question = data; // Direct access to the data

        document.getElementById("question-selector").value = questionKey;
        document.getElementById("content-selector").value = question.Content;
        document.getElementById("standard").value = question.Standard;
        document.getElementById("objective").value = question.Objective;
        document.getElementById("question-selector").value = questionKey;
        codeEditor.setValue(question.Code || "");
        document.getElementById("difficulty").value = question.Difficulty || "";
        document.getElementById("tags").value = (question.Tags || []).join(", ");
        document.getElementById("questionStem").value = question.Question || "";
        document.getElementById("answer").value = question.Answer || "";
        document.getElementById("distractor1").value = question.Distractor1 || "";
        document.getElementById("distractor2").value = question.Distractor2 || "";
        document.getElementById("distractor3").value = question.Distractor3 || "";
        document.getElementById("description").value = question.Description || "";
        document.getElementById("videoURL").value = question.Video || "";
        document.getElementById("videoStart").value = question.VideoStart || "";
        document.getElementById("videoEnd").value = question.VideoEnd || "";
    })
    .catch(error => {
        console.error('Error fetching question:', error);
        alert('Failed to load question. Please try again.');
    });
}

// Function to clear the entries
function clearEntries() {
    questionKey = "";  // Reset the global questionKey
    document.getElementById("question-selector").value = "";  // Allow user to input a new key
    document.getElementById("standard").value = "";
    document.getElementById("objective").value = "";
    codeEditor.setValue("");  // Clear the code editor
    document.getElementById("difficulty").value = "";  // Clear difficulty
    document.getElementById("tags").value = "";  // Clear tags
    document.getElementById("questionStem").value = "";  // Clear question stem
    document.getElementById("answer").value = "";  // Clear correct answer
    document.getElementById("distractor1").value = "";  // Clear distractor 1
    document.getElementById("distractor2").value = "";  // Clear distractor 2
    document.getElementById("distractor3").value = "";  // Clear distractor 3
    document.getElementById("description").value = "";  // Clear description
    document.getElementById("videoURL").value = "";  // Clear video URL
    document.getElementById("videoStart").value = "";  // Clear video start time
    document.getElementById("videoEnd").value = "";  // Clear video end time
}

// Populate the Select Content dropdown
function populateContentDropdown() {
    const keys = teacherContent;
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

// Function to prepare page for new question
function createNewQuestion() {
    clearEntries();
    newQuestion = true;  // Change the global state
    alert("Ready to create a new question. Enter a new question key and fill in the details.");
}

// Save the current question
function saveQuestion() {
    // get the question key based on the newQuestion state variable
    let newKey;
    if (newQuestion) {
        newKey = document.getElementById("newQuestionKey").value.trim();
    } else {
        newKey = document.getElementById("question-selector").value.trim();
    }
    
    if (!newKey) {
        alert("Please enter a valid question key.");
        return;
    }

    // Check if the key already exists
    if (questionKeys.includes(newKey) && !newQuestion) {
        if (!confirm("This key already exists. Do you want to overwrite it?")) {
            return;
        }
    }

    const questionData = {
        key: newKey,
        content_id: document.getElementById("content-selector").value,
        standard: document.getElementById("standard").value,
        objective: document.getElementById("objective").value,
        code: codeEditor.getValue(),
        difficulty: parseFloat(document.getElementById("difficulty").value) || 0,
        tags: document.getElementById("tags").value.split(",").map(tag => tag.trim()),
        question: document.getElementById("questionStem").value,
        answer: document.getElementById("answer").value,
        distractor_1: document.getElementById("distractor1").value,
        distractor_2: document.getElementById("distractor2").value,
        distractor_3: document.getElementById("distractor3").value,
        description: document.getElementById("description").value,
        video: document.getElementById("videoURL").value,
        video_start: parseFloat(document.getElementById("videoStart").value) || 0,
        video_end: parseFloat(document.getElementById("videoEnd").value) || 0
    };

    fetch('/submit_question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionData)
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message || "Question saved successfully!");
        if (!questionKeys.includes(newKey)) {
            questionKeys.push(newKey);  // Add the new key to the list
        }
        clearEntries();
    })
    .catch(error => console.error('Error saving question:', error));
    
    getKeys(); // Refresh the list of question keys
    currentIndex = questionKeys.indexOf(newKey);
    // Clear the new ID field
    document.getElementById("newQuestionKey").value = "";
}

// New question handler
document.getElementById("newQuestion").addEventListener("click", createNewQuestion);

// Navigation handlers
document.getElementById("prevQuestion").addEventListener("click", () => {
    const currentIndex = questionKeys.indexOf(questionKey);
    if (currentIndex > 0) {
        questionKey = questionKeys[currentIndex - 1];
        fetchQuestion(questionKey);
    }
});

document.getElementById("nextQuestion").addEventListener("click", () => {
    const currentIndex = questionKeys.indexOf(questionKey);
    
    if (currentIndex < questionKeys.length - 1) {
        questionKey = questionKeys[currentIndex + 1];
        fetchQuestion(questionKey);
    };
    fetchQuestion(questionKey);
});

// Add an event listener to listen for changes to questionKey input
// With new changes for dropdown
document.getElementById("question-selector").addEventListener("change", (event) => {
    const newQuestionKey = event.target.value;
    if (newQuestion) {
        // New question - validate the entered key
        if (!newQuestionKey) {
            alert("Please enter a valid key for the new question.");
            return;
        }
        return; // Exit early if creating a new question
    }
    if (questionKeys.includes(newQuestionKey)) {
        questionKey = newQuestionKey;
        fetchQuestion(questionKey);
    } else {
        alert("Invalid question ID.");
    }
});

// Function to fetch all question keys from the server
function getKeys() {
    fetch('/question_keys', {
        method: 'GET',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch question keys');
        }
        return response.json();
    })
    .then(data => {
        if (data.keys && Array.isArray(data.keys)) {
            questionKeys = data.keys;  // Store the keys in the global variable
            
            // Populate the dropdown
            const selector = document.getElementById("question-selector");
            selector.innerHTML = '';  // Clear existing options

            // Add default placeholder option
            const defaultOption = document.createElement("option");
            defaultOption.value = '';
            defaultOption.text = 'Select a question ID';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            selector.appendChild(defaultOption);

            // Add the question keys
            questionKeys.forEach(key => {
                const option = document.createElement("option");
                option.value = key;
                option.text = key;
                selector.appendChild(option);
            });
        } else {
            throw new Error('No valid keys returned from server');
        }
    })
    .catch(error => {
        console.error('Error fetching question keys:', error);
    });
}

getKeys(); // Load the keys when the page loads

document.addEventListener('DOMContentLoaded', async function() {
    // First fetch the content areas
    await fetchCourseData();
    
    // Populate content selector dropdown
    populateContentDropdown();
    
    // Set up the listener for the submitQuestion button
    document.getElementById("submitQuestion").addEventListener("click", (event) => {
        event.preventDefault();  // Prevent default form submission
        
        // Validate required fields
        let standard = document.getElementById("standard").value.trim();
        let objective = document.getElementById("objective").value.trim();
        let difficulut = document.getElementById("difficulty").value.trim();
        
        if (!standard || !objective || !difficulty) {
            alert("Standard, Objective, and Difficulty are required fields");
            return;
        }
        
        saveQuestion();  // Call the function to save the question
        newQuestion = false;  // Set the global newQuestion state to default
    });
});
