//---------------- Scripts for testprep.html ------------------------------------------------

// Declare global variables
let correctAnswer;
let keyInput;
let content;
let subject;
let objective;
let difficulty;
let questionStartTime;
let timeLimit;
let timerInterval;
let video;

//--------------------------------------------------------------------------------------

// Function to start the timer
function startTimer() {
    const startTime = Date.now();  // Capture the current time when the question is loaded
    const timeLimit = content === 'pcap' ? 90 : 80;  // Set time limit based on content type
    
    // Set an interval to update the timer every second
    timerInterval = setInterval(function() {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);  // Elapsed time in seconds
        
        // Calculate minutes and seconds
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;

        // Format the elapsed time as MM:SS
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update the timer display
        const timerDisplay = document.getElementById("timerDisplay");
        timerDisplay.textContent = formattedTime;

        // Make the time bold
        timerDisplay.style.fontWeight = 'bold';

        // Check the remaining time and update the color
        const timeLeft = timeLimit - elapsedTime; // Remaining time in seconds
        if (timeLeft <= 10) {
            // Change color to red if time is within 10 seconds
            timerDisplay.style.color = 'red';
        } else {
            // Keep color green otherwise
            timerDisplay.style.color = 'green';
        }

    }, 1000);
}

//--------------------------------------------------------------------------------------

// Function to stop the timer
function stopTimer() {
    clearInterval(timerInterval);  // Stop the timer when the question is answered
}

//--------------------------------------------------------------------------------------

// Function to check the elapsed question response time versus the requirement

function checkTime(timeLimit) {
    const questionEndTime = new Date().getTime();
    const elapsedTime = (questionEndTime - questionStartTime) / 1000; // in seconds
    return elapsedTime <= timeLimit;
}

//--------------------------------------------------------------------------------------

// Function to clear persistent items

function clearItems() {
    // Clear the console
    document.getElementById("console").textContent = '';

    // Reset answer choices
    const radioButtons = document.querySelectorAll('input[name="answer"]');
    radioButtons.forEach(radio => {
        radio.checked = false;  // Uncheck each radio button
    });
}

//--------------------------------------------------------------------------------------

// This section handles video loading

function updateVideo() {
    // Update the iframe with the video URL
    const videoFrame = document.getElementById('video-frame');
    videoFrame.src = video;
}

function rickRoll() {
    // Update the iframe with the Rick Roll video
    const videoFrame = document.getElementById('video-frame');
    videoFrame.src = "https://www.youtube.com/embed/dQw4w9WgXcQ?si=TTZ20U38OROVw6E1";
}

//--------------------------------------------------------------------------------------

// Initialize the completed questions storage

(function initializecorrectAnswers() {
    if (!localStorage.getItem('correctAnswers')) {
        localStorage.setItem('correctAnswers', JSON.stringify([]));
    };
    if (!localStorage.getItem('incorrectAnswers')) {
        localStorage.setItem('incorrectAnswers', JSON.stringify([]));
    }
})();

//--------------------------------------------------------------------------------------

// Initialize XP structure in local storage if it doesn't already exist

(function initializeXP() {
    if (!localStorage.getItem('xp')) {
        const initialXP = {
            overallXP: 0,
            certifications: {
                pcap: { xp_1: 0, xp_2: 0, xp_3: 0, xp_4: 0, xp_5: 0 },
                pcep: { xp_1: 0, xp_2: 0, xp_3: 0, xp_4: 0 }
            }
        };
        localStorage.setItem('xp', JSON.stringify(initialXP));
    }
})();

//--------------------------------------------------------------------------------------

// Initialize the curriculumScores structure in local storage if it doesn't already exist
(function initializeCurriculumScores() {
    if (!localStorage.getItem('curriculumScores')) {
        const initialScores = {};
        localStorage.setItem('curriculumScores', JSON.stringify(initialScores));
    }
})();

//--------------------------------------------------------------------------------------

// Initialize the contentScores structure in local storage if it doesn't already exist
(function initializeContentScores() {
    if (!localStorage.getItem('contentScores')) {
        const initialScores = {};
        localStorage.setItem('contentScores', JSON.stringify(initialScores));
    }
})();

//--------------------------------------------------------------------------------------

// This function checks to see if the question has been previously answered successfully

function checkQuestionStatus(questionId) {
    let correctAnswers = JSON.parse(localStorage.getItem('correctAnswers')) || [];
    return correctAnswers.includes(questionId);
}

//--------------------------------------------------------------------------------------

// Function to update the curriculumScores collection
function updateCurriculumScores(curriculumID, XP_earned, XP_possible) {
    // Get the current curriculumScores from localStorage
    let curriculumScores = JSON.parse(localStorage.getItem('curriculumScores')) || {};

    // If the curriculum does not exist in curriculumScores, initialize it
    if (!curriculumScores[curriculumID]) {
        curriculumScores[curriculumID] = { Earned: 0, Possible: 0 };
    }

    // Update the Earned and Possible values for the specific curriculum
    curriculumScores[curriculumID].Earned = parseFloat((curriculumScores[curriculumID].Earned + XP_earned).toFixed(2));
    curriculumScores[curriculumID].Possible = parseFloat((curriculumScores[curriculumID].Possible + XP_possible).toFixed(2));

    // Save the updated curriculumScores back to localStorage
    localStorage.setItem('curriculumScores', JSON.stringify(curriculumScores));
}

//--------------------------------------------------------------------------------------

// Function to update the contentScores collection in localStorage
function updateContentScores(contentId, XP_earned, XP_possible) {
    // Retrieve the current contentScores from localStorage
    let contentScores = JSON.parse(localStorage.getItem('contentScores')) || {};

    // If the contentId doesn't exist in the contentScores collection, initialize it
    if (!contentScores[contentId]) {
        contentScores[contentId] = {
            Earned: 0,
            Possible: 0
        };
    }

    // Update the Earned and Possible values for the specified contentId
    contentScores[contentId].Earned = parseFloat((contentScores[contentId].Earned + XP_earned).toFixed(2));
    contentScores[contentId].Possible = parseFloat((contentScores[contentId].Possible + XP_possible).toFixed(2));

    // Save the updated contentScores back to localStorage
    localStorage.setItem('contentScores', JSON.stringify(contentScores));
}

//------------------------------------------------------------------------------------------

// Function to calculate the XP change and update the XP storage

function updateXP(questionId, content, subject, difficulty, status) {
    console.log("XP 1: ", "Cont", content, "Subj:", subject, "Diff:", difficulty);
    // Get the list of correct and incorrect answers from localStorage
    let correctAnswers = JSON.parse(localStorage.getItem('correctAnswers')) || [];
    let incorrectAnswers = JSON.parse(localStorage.getItem('incorrectAnswers')) || [];

    // Calculate the multiplier based on the question status
    let multiplier = 1; // Default multiplier
    if (status === 'correct') {
        if (correctAnswers.includes(questionId)) {
            multiplier = 0.10; // Previously answered correctly
        } else if (incorrectAnswers.includes(questionId)) {
            multiplier = 0.5;  // Previously answered incorrectly
        }
    }

    // Calculate ΔXP using the given formula
    let dXP = (Number(difficulty) / 3) - (status === 'correct' ? 0 : 1);

    // Apply the multiplier to the XP change
    dXP = dXP * multiplier;
    dXP = Math.round(dXP * 100) / 100;
    let dXP_accrued = Math.max(dXP, 0);
    let dXP_possible = ((Number(difficulty) / 3) * multiplier);

    // Get the current XP data from localStorage, or initialize it if it doesn't exist
    let xpData = JSON.parse(localStorage.getItem('xp')) || {
        overallXP: 0,  // Overall XP score
        certifications: {} // Content certifications (e.g., PCAP, PCEP)
    };

    // Ensure that the content and category are properly initialized in the storage
    if (!xpData.certifications[content]) {
        xpData.certifications[content] = {}; // Initialize the content (e.g., PCAP or PCEP)
    }
    if (!xpData.certifications[content][`xp_${subject}`]) {
        xpData.certifications[content][`xp_${subject}`] = 0; // Initialize XP for the specific category
    }

    // Update the XP for the specified content and category
    xpData.certifications[content][`xp_${subject}`] += dXP;

    // Update the overall XP (if applicable)
    xpData.overallXP += dXP;

    // Save the updated XP data back to localStorage
    localStorage.setItem('xp', JSON.stringify(xpData));
    
    // Update content score
    updateContentScores(content, dXP_accrued, dXP_possible);
    
    // Update curriculum score
    let currentCurriculum = localStorage.getItem('currentCurriculum');
    updateCurriculumScores(currentCurriculum, dXP_accrued, dXP_possible);
    
    // Update the XP data bar
    updateXPDisplay(content)
    

    return dXP; // Return the XP change for display
}

//--------------------------------------------------------------------------------------

// Function to update the question metadata on the navbar

function updateNavbarData(questionId) {

    console.log("Updating Navbar Data:", questionId)

    // Get the completion status of the current question
    const isCompleted = checkQuestionStatus(questionId) ? "Completed" : "Not Completed";
    
    // Set the correct class for status
    const statusClass = isCompleted === "Completed" ? "completed" : "not-completed";
    
    // Update the navbar with category/objective/difficulty
    const questionInfo = `Content:${content}  |  Objective:${subject}.${objective}  |  Difficulty:${difficulty}  | Status: <span class="${statusClass}">${isCompleted}</span>  | `;
    console.log("Question Info:", questionInfo);
    document.getElementById('question-info').innerHTML = questionInfo;
}

//--------------------------------------------------------------------------------------

// Function to update the XP data bar

// Function to update the XP data bar
function updateXPDisplay(content) {
    // Retrieve the XP data from local storage
    const xpData = JSON.parse(localStorage.getItem('xp')) || {};
    
    // Check if the content exists in the XP data
    if (xpData.certifications && xpData.certifications[content]) {
        // Retrieve the overall XP and specific XP values for the content
        const overallXP = xpData.overallXP || 0;
        const contentXP = xpData.certifications[content];
        
        // Update the overall XP display
        document.getElementById('overallXP').textContent = overallXP.toFixed(2);
        
        // Loop through each XP entry in the content-specific XP data
        for (const [key, value] of Object.entries(contentXP)) {
            const element = document.getElementById(key.toLowerCase());
            if (element) {
                element.textContent = value.toFixed(2);
            }
        }
    }
    
    // Retrieve and display the curriculum score
    const currentCurriculum = localStorage.getItem('currentCurriculum');
    const curriculumScores = JSON.parse(localStorage.getItem('curriculumScores')) || {};
    
    if (currentCurriculum && curriculumScores[currentCurriculum]) {
        const earned = curriculumScores[currentCurriculum].Earned || 0;
        const possible = curriculumScores[currentCurriculum].Possible || 0;
        const curriculumScore = possible > 0 ? ((earned / possible) * 100).toFixed(2) : '0.00';
        
        // Update the curriculum score display
        document.getElementById('curriculumScore').textContent = curriculumScore + '%';
    }
}


//--------------------------------------------------------------------------------------

// Function to update the page with question data
function updatePage(data) {
    console.log(data);
    // Access the currentQuestionId
    const currentQuestionId = localStorage.getItem('currentQuestionId')
    
    // Clear the console output
    document.getElementById("console").textContent = '';
    
    // Clear the answer choice radio buttons
    // Reset answer choices
    const radioButtons = document.querySelectorAll('input[name="answer"]');
    radioButtons.forEach(radio => {
        radio.checked = false;  // Uncheck each radio button
    });
    
    // Update the question
    document.getElementById('question').innerText = data.Question;

    // Update answer choices
    const answers = [data.Answer, data.Distractor1, data.Distractor2, data.Distractor3];
    // Shuffle answers
    const shuffledAnswers = answers.sort(() => Math.random() - 0.5);
    // Set the global correctAnswer variable
    correctAnswer = data.Answer

    // Set answer choices in the radio buttons
    shuffledAnswers.forEach((answer, index) => {
        const label = document.getElementById(`label${index + 1}`);
        const input = document.getElementById(`answer${index + 1}`);
        if (label && input) {
            input.value = answer;  // Update the value of the input (radio button)
            label.innerText = answer;  // Update the label text
        }
    });

    // Hide the placeholder text for the video
    document.getElementById('loading-message').style.display = 'none';

    // Update the code editor
    editor.setValue(data.Code); // Ensure that data.Code is correctly populated
    
    // Update the question metadata on the navbar
    updateNavbarData(currentQuestionId)
    
    // Update the XP data bar
    updateXPDisplay(content)
    
    // Disable the Submit button again
    document.getElementById("submit-answer").disabled = false;
    
    // Set up the Rick Roll
    rickRoll();
}

//--------------------------------------------------------------------------------------------

// Function to identify and load the next unanswered question or advance through the curriculum
function nextQuestion() {
    
    // Stop and active timer before fetching the next question
    stopTimer();
    
    // Retrieve the current curriculum, questions list, and answers from local storage
    const curriculumKey = localStorage.getItem('currentCurriculum');
    const questionsList = JSON.parse(localStorage.getItem('questionsList')) || [];
    const correctAnswers = JSON.parse(localStorage.getItem('correctAnswers')) || [];
    const completedCurriculums = JSON.parse(localStorage.getItem('completedCurriculums')) || [];

    // Check if the current curriculum is complete
    const isCurriculumComplete = correctAnswers.filter(id => questionsList.includes(id)).length === questionsList.length;

    if (isCurriculumComplete) {
        // If this curriculum is complete and not already marked as completed, alert the user and add it to completedCurriculums
        if (!completedCurriculums.includes(curriculumKey)) {
            alert("Congratulations! You've completed the curriculum. Returning to the first question.");
            completedCurriculums.push(curriculumKey); // Add the completed curriculum to the list
            localStorage.setItem('completedCurriculums', JSON.stringify(completedCurriculums));
        }

        // Loop back to the start or proceed through all questions as usual
        let currentQuestionIndex = questionsList.indexOf(localStorage.getItem('currentQuestionId'));

        // If we are at the last question, loop back to the first question
        currentQuestionIndex = (currentQuestionIndex === questionsList.length - 1) ? 0 : currentQuestionIndex + 1;

        // Set the ID of the next question and fetch it
        const nextQuestionId = questionsList[currentQuestionIndex];
        localStorage.setItem('currentQuestionId', nextQuestionId);
        fetchAndUpdateQuestion(nextQuestionId);
        
        // Update the curriculum score display
        document.getElementById('curriculumScore').textContent = curriculumScore + '%';

    } else {
        // Find the next unanswered question in the current curriculum
        const nextUnansweredQuestionId = questionsList.find(id => !correctAnswers.includes(id));

        if (nextUnansweredQuestionId) {
            // Set the next unanswered question in local storage and fetch it
            localStorage.setItem('currentQuestionId', nextUnansweredQuestionId);
            fetchAndUpdateQuestion(nextUnansweredQuestionId);
        }
    }
}

//--------------------------------------------------------------------------------------

async function fetchCurriculum(keyInput) {
    try {
        console.log("Fetching curriculum for:", keyInput);  // Log to console

        const response = await fetch('/get_curriculum', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 'key-input': keyInput })  // Ensure the key is 'key-input'
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const questionsList = await response.json();  // The list of question IDs returned by Flask
        console.log("Received questions list:", questionsList);

        // Save the questions list and curriculum name to local storage
        localStorage.setItem("questionsList", JSON.stringify(questionsList));
        localStorage.setItem("currentCurriculum", keyInput);

        // Now that we have curriculum data, load the next question
        nextQuestion();
    } catch (error) {
        console.error("Error fetching curriculum:", error);
        alert("An error occurred while loading the curriculum. Please try again.");
    }
}


//--------------------------------------------------------------------------------------

// Function to fetch question data and update the page
function fetchAndUpdateQuestion(keyInput) {

    // First clear any lingering items
    clearItems();
    
    // Disable the run code button
    document.getElementById("run").disabled = true;

    fetch('/test_request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'key-input': keyInput }) // Match the data format
    })
    .then(response => {
        // Check if the response is not OK (e.g., 404, 500)
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Get the content data
        parsed_key = keyInput.split(".");
        content = parsed_key[0].toLowerCase();
        subject = parsed_key[1];
        objective = parsed_key[2];
        difficulty = data.Difficulty;
        video = data.Video;
        //Update the page
        updatePage(data);
        
    // Start timer
    startTimer();
    questionStartTime = new Date().getTime();
    
    })
    .catch(error => console.error('Error:', error));
}

//--------------------------------------------------------------------------------------------

// Function to update the list of correctly or incorrectly answered questions
function updateAnswerStatus(questionId, status) {
    // Determine which list to update based on status
    const storageKey = status === "correct" ? 'correctAnswers' : 'incorrectAnswers';

    // Get the existing list from local storage or initialize it as an empty array
    let answerList = JSON.parse(localStorage.getItem(storageKey)) || [];

    // Add the new question ID if it's not already in the list
    if (!answerList.includes(questionId)) {
        answerList.push(questionId);
        localStorage.setItem(storageKey, JSON.stringify(answerList));
    }
}

//---------------------------------------------------------------------------------------------

document.getElementById("key-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        const keyInput = event.target.value.toLowerCase();
        fetchCurriculum(keyInput);  // Fetch curriculum data and load the next question
    }
});

//--------------------------------------------------------------------------------------------

// Load the current question on page refresh
window.onload = function() {
    console.log("Window loaded, check currentQuestionId");
    const currentQuestionId = localStorage.getItem('currentQuestionId');
    if (currentQuestionId) {
        // Fetch and update the question using the stored ID
        fetchAndUpdateQuestion(currentQuestionId);
    }
};

//---------------------------------------------------------------------------------------------

// Initialize CodeMirror
var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    mode: "python",
    theme: "dracula",
    matchBrackets: true,
    viewportMargin: Infinity,
});

//------------------------------------------------------------------------------------------------------------------

// Handling the Run Code button click
document.getElementById("run").onclick = function() {
    var code = editor.getValue();

    console.log("Code output is being requested");

    // Send code to Flask server
    fetch('/run_code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: code })
    })
    .then(response => response.json())
    .then(data => {
        // Display the output in the console div
        console.log("Code output has been received:", data.output);
        document.getElementById("console").textContent = data.output;
    })
    .catch((error) => {
        console.error('Error:', error);
    });
};

//------------------------------------------------------------------------------------------------------------------

// Handling the Submit Answer button click
document.getElementById("submit-answer").onclick = function() {
    stopTimer();  // Stop the question timer
    var selectedAnswer = document.querySelector('input[name="answer"]:checked');
    const currentQuestionId = localStorage.getItem('currentQuestionId');
    const timeLimit = content === 'pcap' ? 90 : 80; // Set time limit based on content type
    const answeredOnTime = checkTime(timeLimit); // Check if answered on time
    
    if (selectedAnswer) {
        // Check against the stored correct answer
        if (selectedAnswer.value === correctAnswer) {
            document.getElementById("run").disabled = false; // Enable the Run Code button
            
            if (answeredOnTime) {
                // Update XP and show alert for correct answer within time limit
                dXP = updateXP(currentQuestionId, content, subject, difficulty, 'correct');
                alert("Correct answer! You earned " + dXP.toFixed(2) + " XP.");
                updateAnswerStatus(currentQuestionId, "correct");
            } else {
                // Handle case where correct answer is given but not within time limit
                alert("Correct answer, but you were too slow. No XP earned.");
            }
            
            updateNavbarData(currentQuestionId);
            document.getElementById("submit-answer").disabled = true;
        } else {
            // Incorrect answer handling (timing doesn't matter)
            dXP = updateXP(currentQuestionId, content, subject, difficulty, 'incorrect');
            alert("Incorrect. You earned " + dXP.toFixed(2) + " XP.");
            
            updateAnswerStatus(currentQuestionId, "incorrect");
            document.getElementById("submit-answer").disabled = true;
            document.getElementById("run").disabled = false; // Enable the Run Code button
        }
        
        // Display the video
        updateVideo();
        
    } else {
        alert("Please select an answer.");
    }
};

//--------------------------------------------------------------------------------------

// Listener for the Next Question button
document.addEventListener("DOMContentLoaded", function() {
    // Add event listener to Next Question button
    const nextButton = document.getElementById("next-question-btn");
    
    if (nextButton) {
        nextButton.addEventListener("click", nextQuestion);
    }
});

