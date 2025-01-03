let questionKey = '';  // To store the current questionKey
let questionKeys = []; // To store all question keys
let newQuestion = false; // Monitor if a new question is being added

// Initialize CodeMirror
const codeEditor = CodeMirror.fromTextArea(document.getElementById("code"), {
    mode: "python",
    lineNumbers: true,
    matchBrackets: true
});

// Fetch question from the server
function fetchQuestion(questionKey) {
    fetch('/content_data', {
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

        document.getElementById("questionKey").value = questionKey;
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

// Function to create a new question
function createNewQuestion() {
    questionKey = "";  // Reset the global questionKey
    newQuestion = true;  // Change the global state
    document.getElementById("questionKey").value = "";  // Allow user to input a new key
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

    alert("Ready to create a new question. Enter a new question key and fill in the details.");
}

// Save the current question
function saveQuestion() {
    const newKey = document.getElementById("questionKey").value.trim();
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
    })
    .catch(error => console.error('Error saving question:', error));
    
    getKeys(); // Refresh the list of question keys
    currentIndex = questionKeys.indexOf(newKey);
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
document.getElementById("questionKey").addEventListener("change", (event) => {
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
    fetch('/content_keys', {
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
        } else {
            throw new Error('No valid keys returned from server');
        }
    })
    .catch(error => {
        console.error('Error fetching question keys:', error);
    });
}

getKeys(); // Load the keys when the page loads

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("submitQuestion").addEventListener("click", (event) => {
        event.preventDefault();  // Prevent default form submission
        saveQuestion();  // Call the function to save the question
        newQuestion = false;  // Set the global newQuestion state to default
    });
});