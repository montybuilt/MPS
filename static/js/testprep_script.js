//---------------- Scripts for testprep.html ------------------------------------------------

// Declare global variables
let correctAnswer;
let keyInput;
let content;
let curriculum;
let tags;
let standard;
let objective;
let difficulty;
let dXP_possible;
let questionStartTime;
let timeLimit;
let timerInterval;
let description;
let video;
let studentAssignments;

//--------------------------------------------------------------------------------------

// Async function to fetch standards data
async function loadStandardsData() {
  try {
    const response = await fetch('/static/data/standards.json');
    const data = await response.json();
    window.standardsData = data;
    console.log("Standards data loaded:", window.standardsData);
  } catch (error) {
    console.error("Error loading standards data:", error);
  }
}

//--------------------------------------------------------------------------------------

function pause(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

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
    clearInterval(timerInterval);
}

//--------------------------------------------------------------------------------------

// Function to check the elapsed question response time versus the requirement

function checkTime(timeLimit) {
    const questionEndTime = new Date().getTime();
    const elapsedTime = (questionEndTime - questionStartTime) / 1000; // in seconds
    const isWithinLimit =  elapsedTime <= timeLimit;
    return [isWithinLimit, elapsedTime];
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

function getCurrentIndex(parsedQuestionsList, currentQuestionId) {
    return parsedQuestionsList.indexOf(currentQuestionId);
}

//--------------------------------------------------------------------------------------

// function to find an inner key from a value in a nested dictionary
function findInnerKeyByValue(data, targetValue) {
    for (const outerKey in data) {
        const innerObject = data[outerKey];
        for (const innerKey in innerObject) {
            if (innerObject[innerKey].includes(targetValue)) {
            return innerKey;
            }
        }
    }
    return null; // Return null if not found.
}

function findOuterKeyByInnerKey(data, targetInnerKey) {
    for (const outerKey in data) {
        if (data[outerKey].hasOwnProperty(targetInnerKey)) {
        return outerKey;
        }
    }
    return null; // Return null if not found.
}

//--------------------------------------------------------------------------------------

//--------------------------------------------------------------------------------------



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
    if (!sessionStorage.getItem('correctAnswers')) {
        sessionStorage.setItem('correctAnswers', JSON.stringify([]));
    };
    if (!sessionStorage.getItem('incorrectAnswers')) {
        sessionStorage.setItem('incorrectAnswers', JSON.stringify([]));
    }
})();

//--------------------------------------------------------------------------------------

// Function POSTs session data to the database
function updateSessionData() {
    const sessionData = {
        currentCurriculum: sessionStorage.getItem('currentCurriculum'),
        currentQuestionId: sessionStorage.getItem('currentQuestionId'),
        updatedAt: new Date().toISOString()
    };

    fetch('/update_session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error updating session data:', data.error);
        } else {
            console.log('Session data updated successfully:', data);
        }
    })
    .catch(error => console.error('Error:', error));
}

//--------------------------------------------------------------------------------------

// This function checks to see if the question has been previously answered successfully

function checkQuestionStatus(questionId) {
    let correctAnswers = JSON.parse(sessionStorage.getItem('correctAnswers')) || [];
    return correctAnswers.includes(questionId);
}


//--------------------------------------------------------------------------------------

// Function to calculate the XP change and update the XP storage
function updateXP(questionId, difficulty, status) {
    // Get the list of correct and incorrect answers from sessionStorage
    let correctAnswers = JSON.parse(sessionStorage.getItem('correctAnswers')) || [];
    let incorrectAnswers = JSON.parse(sessionStorage.getItem('incorrectAnswers')) || [];

    // Calculate the multiplier based on the question status
    let multiplier = 1; // Default multiplier
    if (status === 'correct') {
        if (correctAnswers.includes(questionId)) {
            multiplier = 0.01; // Previously answered correctly
        } else if (incorrectAnswers.includes(questionId)) {
            multiplier = 0.5;  // Previously answered incorrectly
        }
    }

    // Calculate ΔXP using the given formula
    let dXP = (Number(difficulty) / 3) - (status === 'correct' ? 0 : 1);
    
    // Apply the multiplier and round to two decimals.
    //dXP = Math.round(dXP * multiplier * 100) / 100;
    dXP = dXP * multiplier;
    
    // For scoring, only positive XP counts.
    let dXP_accrued = Math.max(dXP, 0);
        
    // Calculate possible XP similarly, rounding to two decimals.
    //let dXP_possible = Math.round(((Number(difficulty) / 3) * multiplier) * 100) / 100;
    let dXP_possible = Number(difficulty) / 3 * multiplier;

    console.log("The Standard Is:", standard);  // Ensure this global is defined correctly.
    
    // Update global XP variables.
    window.totalXP += dXP;
    window.curriculumXPEarned += dXP_accrued;
    
    // Ensure the key exists in standardsXPEarned before adding.
    let stdKey = Number(standard); // or String(standard), but be consistent with initializeXPData
    if (typeof window.standardsXPEarned[stdKey] === 'undefined') {
        window.standardsXPEarned[stdKey] = 0;
    }
    window.standardsXPEarned[stdKey] += dXP_accrued;
    
    // (If you need to update standardsXPPossible here too, do the same check.)
    // updateXPDataBar();
    
    // Update the XP data bar.
    updateXPDataBar();

    return [dXP, dXP_possible]; // Return the XP change for display
}

//--------------------------------------------------------------------------------------

// Function to update the question metadata on the navbar

function updateNavbarData(questionId) {

    // Get the completion status of the current question
    const isCompleted = checkQuestionStatus(questionId) ? "Completed" : "Not Completed";
    
    // Set the correct class for status
    const statusClass = isCompleted === "Completed" ? "completed" : "not-completed";
    
    // Update the navbar with category/objective/difficulty
    const questionInfo = `Content:${content}  |  Objective:${standard}.${objective}  |  Difficulty:${difficulty}  | Status: <span class="${statusClass}">${isCompleted}</span>  | `;
    document.getElementById('question-info').innerHTML = questionInfo;
}

//--------------------------------------------------------------------------------------

// Function to update the description and enable the video button
function updateDescription() {
    // Directly update the content of the description element
    document.getElementById("description").innerHTML = description;
}

//---------------------------------------------------------------------------------------

// Function to update the XP data bar
function updateXPDataBar() {
    // Update Overall XP
    const overallXPSpan = document.getElementById("overallXP");
    overallXPSpan.textContent = window.totalXP.toFixed(1);
    
    // Update Curriculum Score
    const curriculumScoreSpan = document.getElementById("curriculumScore");
    let curriculumScore = window.curriculumXPPossible > 0 
        ? (window.curriculumXPEarned / window.curriculumXPPossible) * 100 
        : 0;
    curriculumScoreSpan.textContent = Math.round(curriculumScore) + "%";
    
    // Standards: use a standards mapping based on content
    const standardsMap = { 'pcep': [1, 2, 3, 4], 'pcap': [1, 2, 3, 4, 5] };
    // Use a fallback if currentContent is not set.
    const currentContent = sessionStorage.getItem('currentContent') || 'pcep';
    const standardsList = standardsMap[currentContent] || [];
    console.log("STANDARDS", standardsList);
    
    // Loop over possible standard spans (xp_1 ... xp_5)
    for (let i = 1; i <= 5; i++) {
        const span = document.getElementById("xp_" + i);
        if (standardsList.includes(i)) {
            let earned = window.standardsXPEarned[i] || 0;
            let possible = window.standardsXPPossible[i] || 0;
            let score = possible > 0 ? (earned / possible) * 100 : 0;
            
            // Set the text to display the score percentage
            span.textContent = Math.round(score) + "%";
            span.style.display = "inline";
            span.style.cursor = "help"; // sets the help cursor (question mark)
            
            // Set the tooltip using standardsData
            let stdKey = String(i);
            if (window.standardsData && window.standardsData[currentContent] && window.standardsData[currentContent][stdKey]) {
                span.title = window.standardsData[currentContent][stdKey].description;
            } else {
                span.title = "";
            }
        } else {
            // Hide any standards that are not relevant
            span.textContent = "";
            span.style.display = "none";
        }
    }
}

//-------------------------------------------------------------------------------------------------------

function loadProgressBar() {
    // Retrieve data from sessionStorage
    const currentCurriculum = sessionStorage.getItem('currentCurriculum');
    const questionsList = sessionStorage.getItem('questionsList');
    const correctAnswers = sessionStorage.getItem('correctAnswers');
    const incorrectAnswers = sessionStorage.getItem('incorrectAnswers');
    const currentQuestionId = sessionStorage.getItem('currentQuestionId');

    // Parse JSON data safely (use empty arrays as default if parsing fails)
    let parsedQuestionsList = [], parsedCorrectAnswers = [], parsedIncorrectAnswers = [];
    
    try {
        parsedQuestionsList = JSON.parse(questionsList) || [];
    } catch (e) {
        console.error("Error parsing 'questionsList' from sessionStorage:", e);
    }

    try {
        parsedCorrectAnswers = JSON.parse(correctAnswers) || [];
    } catch (e) {
        console.error("Error parsing 'correctAnswers' from sessionStorage:", e);
    }

    try {
        parsedIncorrectAnswers = JSON.parse(incorrectAnswers) || [];
    } catch (e) {
        console.error("Error parsing 'incorrectAnswers' from sessionStorage:", e);
    }

    // Check if we have a valid current curriculum
    if (!currentCurriculum || !parsedQuestionsList || parsedQuestionsList.length === 0) {
        console.error("No valid curriculum or question data available");
        return; // If no valid data, don't proceed
    }

    // Set curriculum name and progress percentage
    const curriculumNameElement = document.getElementById('curriculum-name');
    const progressPercentageElement = document.getElementById('progress-percentage');
    //curriculumNameElement.textContent = currentCurriculum;

    const totalQuestions = parsedQuestionsList.length;

    // Count only the attempted questions in the current curriculum
    const totalAttempted = parsedQuestionsList.filter((questionId) => 
        parsedCorrectAnswers.includes(questionId) || parsedIncorrectAnswers.includes(questionId)
    ).length;

    const progressPercentage = (totalAttempted / totalQuestions) * 100;
    //progressPercentageElement.textContent = `${Math.round(progressPercentage)}%`;

    // Get the progress bar container and clear any old content
    const progressBarContainer = document.getElementById('progress-bar');
    progressBarContainer.innerHTML = ''; // Clear previous progress boxes

    // If no correct or incorrect answers, initialize all progress boxes as grey
    if (totalAttempted === 0) {
        // Initialize all progress boxes as grey if no questions have been answered yet
        parsedQuestionsList.forEach(() => {
            const progressBox = document.createElement('div');
            progressBox.classList.add('progress-box', 'grey');
            progressBarContainer.appendChild(progressBox);
        });
        return; // Exit early as we don't need further processing if no questions have been attempted
    }

    // Iterate over questions in the current curriculum to generate the progress boxes
    parsedQuestionsList.forEach((questionId, index) => {
        const progressBox = document.createElement('div');
        progressBox.classList.add('progress-box'); // Default box class
    
        // Determine the correct color based on answer status
        if (parsedCorrectAnswers.includes(questionId) && parsedIncorrectAnswers.includes(questionId)) {
            progressBox.classList.add('yellow'); // Both correct and incorrect
        } else if (parsedCorrectAnswers.includes(questionId)) {
            progressBox.classList.add('correct'); // Correct answer
        } else if (parsedIncorrectAnswers.includes(questionId)) {
            progressBox.classList.add('incorrect'); // Incorrect answer
        } else {
            progressBox.classList.add('grey'); // Unanswered question
        }
    
        // Add click event listener to navigate to the specific question
       progressBox.addEventListener('click', () => {
            const nextQuestionId = parsedQuestionsList[index]; // Look up questionId by index
        
            // Add the 'selected' class to the clicked box
            // Remove 'selected' class from all boxes first
            const allProgressBoxes = progressBarContainer.getElementsByClassName('progress-box');
            Array.from(allProgressBoxes).forEach(box => {
                box.classList.remove('selected');
            });
        
            // Add the 'selected' class to the clicked box
            progressBox.classList.add('selected');
        
            // Now load the selected question
            nextQuestion(nextQuestionId); // Fetch and load the clicked question
        });

    
        // Append the progress box to the progress bar container
        progressBarContainer.appendChild(progressBox);
    });
    
    // After loading the boxes, apply the highlight to the currently selected box
    const currentIndex = parsedQuestionsList.indexOf(currentQuestionId);
    if (currentIndex >= 0) {
        const selectedBox = progressBarContainer.getElementsByClassName('progress-box')[currentIndex];
        selectedBox.classList.add('selected');
    }
}

//--------------------------------------------------------------------------------------


// Function to update the page with question data
function updatePage(data) {
    // Access the currentQuestionId
    const currentQuestionId = sessionStorage.getItem('currentQuestionId');
    
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
    correctAnswer = data.Answer;

    // Set answer choices in the radio buttons
    shuffledAnswers.forEach((answer, index) => {
        const label = document.getElementById(`label${index + 1}`);
        const input = document.getElementById(`answer${index + 1}`);
        if (label && input) {
            input.value = answer;  // Update the value of the input (radio button)
            label.innerText = answer;  // Update the label text
        }
    });

    // Reset the description content and disable the video button
    const feedbackWindow = document.getElementById('description');
    const videoButton = document.getElementById('launch-video');
    
    if (feedbackWindow) {
        feedbackWindow.innerHTML = '';  // Clear the description
    }
    
    if (videoButton) {
        videoButton.disabled = true;  // Disable the video button
    }

    // Update the code editor
    editor.setValue(data.Code); // Ensure that data.Code is correctly populated
    
    // Update the question metadata on the navbar
    updateNavbarData(currentQuestionId);
    
    // Update the XP data bar
    // updateXPDataBar();
    
    // Disable the Submit button again
    document.getElementById("submit-answer").disabled = false;
    
}

//--------------------------------------------------------------------------------------------

// Function to check curriculum status and update completedCurriculums

function checkCurriculumStatus() {

    // Retrieve data from local storage
    const curriculumKey = sessionStorage.getItem('currentCurriculum');
    const questionsList = JSON.parse(sessionStorage.getItem('questionsList')) || [];
    const correctAnswers = JSON.parse(sessionStorage.getItem('correctAnswers')) || [];
    const completedCurriculums = JSON.parse(sessionStorage.getItem('completedCurriculums')) || [];
    const currentQuestionId = sessionStorage.getItem('currentQuestionId');
    
    // Check if all questions have been answered
    const allQuestionsAnswered = questionsList.every(id => correctAnswers.includes(id));
    
    if (allQuestionsAnswered && !completedCurriculums.includes(curriculumKey)) {
        // Mark the curriculum as complete
        completedCurriculums.push(curriculumKey);
        sessionStorage.setItem('completedCurriculums', JSON.stringify(completedCurriculums));
        alert("Congratulations! You've completed the curriculum!");
        // Redirect to /dashboard
        //window.location.href = '/dashboard';
    }
    
}


//--------------------------------------------------------------------------------------------

// Function to advance to the next question in the curriculum
function loadQuestion(questionId) {
    // Stop the timer
    stopTimer();

    // Clear notepad
    notepadTextarea.value = '';
    sessionStorage.removeItem('notepadNotes');

    // Update the current question ID and fetch the next question
    sessionStorage.setItem('currentQuestionId', questionId);
    fetchAndUpdateQuestion(questionId);

    // Check if all questions have been answered
    checkCurriculumStatus();
    
    // Update the progress bar
    loadProgressBar();
}

//--------------------------------------------------------------------------------------------

function nextQuestion(questionId = 'next') {
    // Stop the timer
    stopTimer();

    // Clear notepad
    notepadTextarea.value = '';
    sessionStorage.removeItem('notepadNotes');

    if (questionId === 'next') {
        // Retrieve the questions list from session storage
        const questionsList = JSON.parse(sessionStorage.getItem('questionsList')) || [];
        const currentQuestionId = sessionStorage.getItem('currentQuestionId');

        // Find the index of the current question and determine the next index
        let currentIndex = questionsList.indexOf(currentQuestionId);
        let nextIndex = (currentIndex + 1) % questionsList.length;

        // Get the next question ID and update session storage
        const nextQuestionId = questionsList[nextIndex];
        sessionStorage.setItem('currentQuestionId', nextQuestionId);

        // Fetch and update the next question
        fetchAndUpdateQuestion(nextQuestionId);
    } else {
        // Set the current question ID to the specified question and update session storage
        sessionStorage.setItem('currentQuestionId', questionId);
        
        // Fetch and update the specified question
        fetchAndUpdateQuestion(questionId);
    }

    // Check if all questions have been answered
    checkCurriculumStatus();

    // Update the progress bar
    loadProgressBar();
}

//----------------------------------------------------------------------------------------------------
// Function to advance to the next question in the curriculum
function nextQuestion2() {
    // Stop the timer
    stopTimer();

    // Retrieve data from local storage
    const curriculumKey = sessionStorage.getItem('currentCurriculum');
    const questionsList = JSON.parse(sessionStorage.getItem('questionsList')) || [];
    const correctAnswers = JSON.parse(sessionStorage.getItem('correctAnswers')) || [];
    const completedCurriculums = JSON.parse(sessionStorage.getItem('completedCurriculums')) || [];
    const currentQuestionId = sessionStorage.getItem('currentQuestionId');

    // Clear notepad
    notepadTextarea.value = '';
    sessionStorage.removeItem('notepadNotes');

    // Determine the index of the current question
    let currentIndex = questionsList.indexOf(currentQuestionId);

    // Move to the next question, wrapping back to the start if needed
    let nextIndex = (currentIndex + 1) % questionsList.length;
    const nextQuestionId = questionsList[nextIndex];

    // Update the current question ID and fetch the next question
    sessionStorage.setItem('currentQuestionId', nextQuestionId);
    fetchAndUpdateQuestion(nextQuestionId);

    // Check if all questions have been answered
    // checkCurriculumStatus();
    
    //Update the progress bar
    loadProgressBar();
}

//--------------------------------------------------------------------------------------

function findNextQuestion() {
    // Get the information from sessionStorage and parse them into arrays
    const questionsList = JSON.parse(sessionStorage.getItem('questionsList') || '[]');
    const correctAnswers = JSON.parse(sessionStorage.getItem('correctAnswers') || '[]');
    const incorrectAnswers = JSON.parse(sessionStorage.getItem('incorrectAnswers') || '[]');

    // Find the first question not in either correctAnswers or incorrectAnswers
    for (let question of questionsList) {
        if (!correctAnswers.includes(question) && !incorrectAnswers.includes(question)) {
            return question;
        }
    }

    // If all questions are in either correctAnswers or incorrectAnswers,
    // find the first question in incorrectAnswers but not in correctAnswers
    for (let question of incorrectAnswers) {
        if (!correctAnswers.includes(question) && questionsList.includes(question)) {
            return question;
        }
    }

    // If no such question exists, return the first question from questionsList
    return questionsList.length > 0 ? questionsList[0] : null;
}

//--------------------------------------------------------------------------------------

async function fetchCurriculum(curriculumId, isNew = true) {
        
    // Given the curriculum, find the content area and set global variable
    studentAssignments = JSON.parse(sessionStorage.getItem("studentAssignments")) || {}
    xpData = JSON.parse(localStorage.getItem("xpData")) || [];
    content_area = findOuterKeyByInnerKey(studentAssignments, curriculumId);
    content = content_area;

    // Given the curriculum, find the questions list
    questionsList = studentAssignments[content_area][curriculumId] || [];

    // Save the questions list and curriculum name to local storage
    sessionStorage.setItem("questionsList", JSON.stringify(questionsList));
    sessionStorage.setItem("currentCurriculum", curriculumId);
    
    // Build the questions answered arrays
    processPriorAnswers(xpData, questionsList)

    // Now that we have curriculum data, load the question
    // If the curriculum is changed, find unanswered or incorrect questions
    if (isNew === false) {
        const currentQuestionId = sessionStorage.getItem('currentQuestionId');
        nextQuestion(currentQuestionId);
    } else {
        nextQuestion(findNextQuestion());
    }
}

//--------------------------------------------------------------------------------------

// Function to fetch question data and update the page
function fetchAndUpdateQuestion(keyInput) {

    // First clear any lingering items
    clearItems();
    
    // Disable the run code button
    document.getElementById("run").disabled = true;

    fetch('/task_request', {
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
        standard = data.Standard;
        objective = data.Objective;
        description = data.Description;
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
    let answerList = JSON.parse(sessionStorage.getItem(storageKey)) || [];

    // Add the new question ID if it's not already in the list
    if (!answerList.includes(questionId)) {
        answerList.push(questionId);
        sessionStorage.setItem(storageKey, JSON.stringify(answerList));
    }
}

//---------------------------------------------------------------------------------------------

// This is the function to display the console output
function displayOutput(output) {
  let consoleDiv = document.getElementById('console');
  // Replace newlines with <br> for proper formatting
  let formattedOutput = output.replace(/\n/g, '<br>');
  
  // Optional: Colorize errors or warnings
  formattedOutput = formattedOutput.replace(/Error/g, '<span style="color: red;">Error</span>');
  
  // Update the console div with the formatted output
  consoleDiv.innerHTML = formattedOutput;
}

//---------------------------------------------------------------------------------------------

// Function that runs when user enters a curriculum id in the lesson code entry
document.getElementById("key-input").addEventListener("keypress", function(event) {
    sessionStorage.setItem("currentCurriculum", keyInput)
    if (event.key === "Enter") {
        const keyInput = event.target.value  //.toLowerCase();
        fetchCurriculum(keyInput, true).then(() => {
            //stopTimer();
            //updateSessionData();
            //checkCurriculumStatus();
            //loadQuestion(currentQuestionId);
            //loadProgressBar();
        });
    }
})

//--------------------------------------------------------------------------------------------

// Load the current question on page refresh
window.onload = function() {
    const currentQuestionId = sessionStorage.getItem('currentQuestionId');
    const currentCurriculum = sessionStorage.getItem('currentCurriculum');
    
    // If a current curriculum is set, put the text in the lesson code entry
    if (currentCurriculum && currentQuestionId) {
        //fetchCurriculum(currentCurriculum, false).then(() => {
            //stopTimer();
            //updateSessionData();
            //checkCurriculumStatus();
            //nextQuestion(currentQuestionId);
            //loadProgressBar();
        //});
        
        document.getElementById("key-input").value = currentCurriculum;
    }

};

//---------------------------------------------------------------------------------------------

// Initialize CodeMirror
var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    mode: "python",
    //theme: "dracula",
    tabSize: 4,
    indentUnit: 4,
    matchBrackets: true,
    viewportMargin: Infinity,
});

//------------------------------------------------------------------------------------------------------------------

// Function to run when the Run Code button is pressed
document.getElementById("run").onclick = function() {
    var code = editor.getValue();

    // Prepare inputs (you can ask for them before running the code)
    let inputs = [];  // Store inputs here
    let modifiedCode = code;  // Start with the raw code

    // Find all input calls in the code
    let inputMatches = (code.match(/input\([^\)]*\)/g) || []);
    
    // Handle each input match asynchronously
    (async () => {
        for (let match of inputMatches) {
            let promptMessage = "Please provide input:";
            let matchResult = match.match(/input\(([^)]+)\)/);
            if (matchResult && matchResult[1]) {
                promptMessage = matchResult[1].replace(/['"]/g, '').trim();
            }

            // Show custom input modal dialog and get user input
            let userInput = await showInputModal(promptMessage);
            inputs.push(userInput);

            // Replace the first instance of input() with the user-provided input
            modifiedCode = modifiedCode.replace(match, `"${userInput}"`);
        }

        // Send the modified code (with inputs replaced) to the server for execution
        fetch('/run_code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: modifiedCode })
        })
        .then(response => response.json())
        .then(data => {
            // Display the output in the console div
            displayOutput(data.output);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    })();
};

//------------------------------------------------------------------------------------------------------------------

// Function to show the custom input modal and return input value
function showInputModal(promptMessage) {
    return new Promise((resolve) => {
        // Set the prompt message
        document.getElementById("inputModalPromptMessage").textContent = promptMessage;
        // Clear the input box
        document.getElementById("userInput").value = "";
        // Display the modal
        document.getElementById("inputModal").style.display = "block";
        //Handle submission
        document.getElementById("submitInput").onclick = function() {
            let userInput = document.getElementById("userInput").value;
            document.getElementById("inputModal").style.display = "none";
            resolve(userInput);
        };
        // Handle a blank submission
        document.getElementById("closeInputModal").onclick = function() {
            document.getElementById("inputModal").style.display = "none";
            resolve("");  // Resolve with an empty string if closed without input
        };
    });
}

//------------------------------------------------------------------------------------------------------------------

// Preload images
function preloadImages(imagePaths) {
    imagePaths.forEach((path) => {
        const img = new Image();
        img.src = path;
    });
}

// List of images to preload
const resultImages = [
    '/static/images/correct.png',
    '/static/images/incorrect.png',
    '/static/images/tooslow.png',
    '/static/images/reset.png'
];

// Preload the images when the window loads
//window.addEventListener('load', () => {
//    preloadImages(resultImages);
//});

//------------------------------------------------------------------------------------------------------------------

// Function to show the results bubble dialog --> gets called in
function showResultDialog(isCorrect, dXP) {
    return new Promise((resolve) => {
        const resultDialog = document.getElementById('resultDialog');
        const resultImage = document.getElementById('resultImage');
        const dXPValue = document.getElementById('dXPValue');

        const audio = new Audio('/static/sounds/bubble.mp3');
        audio.play();
        
        pause(500).then(() => {
            console.log('Pausing');
        });

        const isAnswerCorrect = (isCorrect === 'late' || isCorrect);
        let imageSrc = '';

        if (isCorrect === 'late') {
            imageSrc = '/static/images/tooslow.png';
        } else {
            imageSrc = isCorrect ? '/static/images/correct.png' : '/static/images/incorrect.png';
        }

        resultImage.src = '/static/images/reset.png'
        resultImage.src = imageSrc;
        dXPValue.textContent = (isAnswerCorrect ? '+' : '') + dXP.toFixed(2); 

        resultDialog.style.display = 'block';
        resultDialog.style.opacity = 1;
        resultDialog.style.transform = 'translateX(-50%) translateY(30px)';

        setTimeout(() => {
            resultDialog.style.transition = 'transform .999s ease, opacity 1.2s ease';
            resultDialog.style.transform = 'translateX(-50%) translateY(-10px)';
        }, 0); 

        setTimeout(() => {
            resultImage.style.transition = 'opacity .999s ease';
            dXPValue.style.transition = 'opacity .999s ease';
            resultImage.style.opacity = 0;
            dXPValue.style.opacity = 0;
        }, 999); 

        setTimeout(() => {
            resultDialog.style.transition = 'opacity 1s ease';
            resultDialog.style.opacity = 0;
        }, 1000);

        setTimeout(() => {
            resultDialog.style.display = 'none';
            resultDialog.style.transition = '';
            resultImage.style.transition = '';
            dXPValue.style.transition = '';
            resultImage.style.opacity = '';
            dXPValue.style.opacity = '';

            resolve();  // Resolve the promise here
        }, 1200);
    });
}

//------------------------------------------------------------------------------------------------------------------

// Function to handle posting the XP data to the server for datbase storage
function postXP(dXP, questionId, curriculumId, contentId, standard, objective, elapsedTime, difficulty, dXP_possible) {
    const XPData = {'dXP': dXP,
                    'question_id': questionId,
                    'curriculum_id': curriculumId,
                    'content_id': contentId,
                    'standard': standard,
                    'objective': objective,
                    'elapsed_time': elapsedTime,
                    'difficulty': difficulty,
                    'possible_xp': dXP_possible};
    
    fetch('/update_xp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(XPData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("XP data successfully updated:", data); // Log server response
    })
    .catch((error) => {
        console.error('Error posting XP data:', error); // Log any errors
    });
}

//------------------------------------------------------------------------------------------------------------------

// Handling the Submit Answer button click
document.getElementById("submit-answer").onclick = async function() {
    var selectedAnswer = document.querySelector('input[name="answer"]:checked');
    const currentQuestionId = sessionStorage.getItem('currentQuestionId');
    const currentCurriculum = sessionStorage.getItem('currentCurriculum');
    const timeLimit = content === 'pcap' ? 90 : 80; // Set time limit based on content type
    const timeData = checkTime(timeLimit);
    const answeredOnTime = timeData[0]; // Check if answered on time
    const elapsedTime = timeData[1];
    let dXP;
        
    if (selectedAnswer) {
        stopTimer();
        // Check against the stored correct answer
        if (selectedAnswer.value === correctAnswer) {
            document.getElementById("run").disabled = false; // Enable the Run Code button
            
            if (answeredOnTime) {
                // Update XP and show alert for correct answer within time limit
                [dXP, dXP_possible] = updateXP(currentQuestionId, difficulty, 'correct');
                // Display the description and the video button
                updateDescription();
                updateAnswerStatus(currentQuestionId, "correct");
                await showResultDialog(true, dXP);               
            } else {
                // Handle case where correct answer is given but not within time limit
                [dXP, dXP_possible] = updateXP(currentQuestionId, 0, 'correct');
                // Display the description and the video button
                updateDescription();
                await showResultDialog("late", dXP);
            }
            
            updateNavbarData(currentQuestionId);
            document.getElementById("submit-answer").disabled = true;
        } else {
            // Incorrect answer handling (timing doesn't matter)
            [dXP, dXP_possible] = updateXP(currentQuestionId, difficulty, 'incorrect');
            // Display the description and the video button
            updateDescription();
            updateAnswerStatus(currentQuestionId, "incorrect");
            await showResultDialog(false, dXP);
            document.getElementById("submit-answer").disabled = true;
            document.getElementById("run").disabled = false; // Enable the Run Code button
        }
        
        // Post XP Data to the server
        postXP(dXP, currentQuestionId, currentCurriculum, content, standard, objective, elapsedTime, difficulty, dXP_possible);
        
        // Call this function to load the progress bar when the question is answered
        loadProgressBar();  //here last
        
        // Check if all questions have been answered
        checkCurriculumStatus();
        
    } else {
        alert("Please select an answer.");
    }
};

//--------------------------------------------------------------------------------------

function nextQuestionButton() {
    nextQuestion();
}

//--------------------------------------------------------------------------------------

// Function to fetch user content/curriculum/question assignments and create global variables
// Function will also save the xp history for the student in sessionStorage
async function setupTestprepSession() {
    // Retrieve parameters from localStorage or define defaults.
    let lastUpdate = localStorage.getItem("xpLastFetchedDatetime") || "1970-01-01";
    let xpUsername = localStorage.getItem("xpUsername") || "default_xpusername";
    const username = sessionStorage.getItem("username") || "default_username";
    
    // Reset the xpData if the current user is not the same as the stored xpData
    if (xpUsername !== username) {
        localStorage.setItem("xpLastFetchedDatetime", "1970-01-01");
        localStorage.setItem("xpUsername", username);
        localStorage.removeItem("xpData");
        xpUsername = username;
        lastUpdate = "1970-01-01";
    }
  
    // Build query parameters.
    const params = new URLSearchParams({
        lastUpdate: lastUpdate,
        xpUsername: xpUsername
    });
  
    try {
        // Use GET with query parameters.
        const response = await fetch(`/get_student_profile?${params.toString()}`, {
            method: 'GET'
        });
    
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }
    
        const data = await response.json();
        // Note: Adjusting to match your Flask response structure (data.data)
        
        // Get the raw assignments from the response
        const rawAssignments = data.data.userAssignments || {};
        
        // Initialize our dictionaries.
        const studentAssignments = {};      // { content: { curriculum: [question_ids] } }
        const curriculumXP = {};            // { curriculum: potential_xp }
        const standardObjectiveXP = {};     // { content: { "standard.objective": potential_xp } }
        
        // Iterate through the raw assignments.
        for (const content in rawAssignments) {
          if (rawAssignments.hasOwnProperty(content)) {
            // Initialize the content key for both studentAssignments and standardObjectiveXP.
            studentAssignments[content] = {};
            standardObjectiveXP[content] = {};
        
            // Loop through each curriculum under this content.
            for (const curriculum in rawAssignments[content]) {
              if (rawAssignments[content].hasOwnProperty(curriculum)) {
                const details = rawAssignments[content][curriculum]; // Array of objects: { task_key, difficulty, standard, objective }
        
                // Build the array of question_ids (task_keys) for studentAssignments.
                studentAssignments[content][curriculum] = details.map(item => item.task_key);
        
                // Calculate total difficulty for the curriculum.
                const totalDifficulty = details.reduce((sum, item) => sum + item.difficulty, 0);
                // Compute potential XP for the curriculum (scaled by dividing by 3).
                curriculumXP[curriculum] = totalDifficulty / 3;
        
                // For each question, accumulate difficulty for its standard/objective pairing.
                details.forEach(item => {
                  const soKey = `${item.standard}.${item.objective}`;
                  if (!standardObjectiveXP[content].hasOwnProperty(soKey)) {
                    standardObjectiveXP[content][soKey] = 0;
                  }
                  standardObjectiveXP[content][soKey] += item.difficulty;
                });
              }
            }
          }
        }
        
        // Now, convert each standard/objective total into potential XP by dividing by 3.
        for (const content in standardObjectiveXP) {
          if (standardObjectiveXP.hasOwnProperty(content)) {
            for (const soKey in standardObjectiveXP[content]) {
              if (standardObjectiveXP[content].hasOwnProperty(soKey)) {
                standardObjectiveXP[content][soKey] /= 3;
              }
            }
          }
        }
        
        // Save the split dictionaries into storage.
        sessionStorage.setItem('studentAssignments', JSON.stringify(studentAssignments));
        localStorage.setItem('curriculumXP', JSON.stringify(curriculumXP));
        localStorage.setItem('standardObjectiveXP', JSON.stringify(standardObjectiveXP));
        
        // Extract all content areas (keys) from the student assignments.
        const assignedContent = Object.keys(studentAssignments) || [];
        
        // Process XP data if available.
        if (data.data.xpData) {
            // Retrieve existing XP data from localStorage.
            const existingXPData = JSON.parse(localStorage.getItem("xpData")) || [];
            
            // Merge the existing XP data with the new data.
            const mergedXPData = [...existingXPData, ...data.data.xpData];
            
            // Store the merged XP data and the new last fetched datetime in localStorage.
            localStorage.setItem("xpData", JSON.stringify(mergedXPData));
            localStorage.setItem("xpLastFetchedDatetime", data.data.xpLastFetchedDatetime);
        } else {
            console.log("No XP Data update needed.");
        }
        
        // Update the xpUsername in localStorage.
        localStorage.setItem("xpUsername", data.data.xpUsername);

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

//--------------------------------------------------------------------------------------

function initializeXPData() {
    // Get data from storage
    const xpData = JSON.parse(localStorage.getItem('xpData')) || [];
    const curriculumXP = JSON.parse(localStorage.getItem('curriculumXP')) || {};
    const standardObjectiveXP = JSON.parse(localStorage.getItem('standardObjectiveXP')) || {};
    //const content = sessionStorage.getItem('currentContent');
    const curriculum = sessionStorage.getItem('currentCurriculum');
    const standards = {'pcep': [1,2,3,4], 'pcap': [1,2,3,4,5]};
    
    // Calculate total XP: sum all dXP values from xpData.
    let totalXP = xpData.reduce((sum, record) => sum + record.dXP, 0);
    
    // Calculate XP earned for the current curriculum using only positive dXP.
    let curriculumXPEarned = xpData
        .filter(record => record.curriculum_id === curriculum)
        .reduce((sum, record) => sum + Math.max(record.dXP, 0), 0);
    
    // Get the possible XP for the current curriculum from the curriculumXP object.
    let curriculumXPPossible = curriculumXP[curriculum] || 0;
    
    // Initialize dictionaries for standards data.
    let standardsXPEarned = {};
    let standardsXPPossible = {};
    
    // Get the list of standards for the current content.
    const standardsList = standards[content] || [];
    
    // For each standard in the current content, calculate earned and possible XP.
    standardsList.forEach(std => {
        // Earned XP for this standard across the entire content:
        const earned = xpData
            .filter(record => record.content_id === content && Number(record.standard) === std)
            .reduce((sum, record) => sum + Math.max(record.dXP, 0), 0);
        standardsXPEarned[std] = earned;
        
        // Possible XP for this standard:
        let possible = 0;
        if (standardObjectiveXP[content]) {
            for (const key in standardObjectiveXP[content]) {
                // Assume key format "standard.objective", e.g., "1.2"
                const parts = key.split('.');
                if (parts.length === 2 && Number(parts[0]) === std) {
                    possible += standardObjectiveXP[content][key];
                }
            }
        }
        standardsXPPossible[std] = possible;
    });
    
    // Store the results in global variables
    window.totalXP = totalXP;
    window.curriculumXPEarned = curriculumXPEarned;
    window.curriculumXPPossible = curriculumXPPossible;
    window.standardsXPEarned = standardsXPEarned;
    window.standardsXPPossible = standardsXPPossible;
}

//--------------------------------------------------------------------------------------

// Function to determine the content of the current curriculum and set global variable
function determineContent() {
    currentCurriculum = sessionStorage.getItem('currentCurriculum');
    
    content = findOuterKeyByInnerKey(data, targetInnerKey)

}

//--------------------------------------------------------------------------------------

// Initialize the correcAnswers and incorrectAnswers collections from xpData
// Implies that curriculum is known and questions list has been created

function processPriorAnswers(xpData, questions) {
    
    // If xpData is empty, store empty arrays in sessionStorage and return.
    if (!xpData || xpData.length === 0) {
        sessionStorage.setItem("correctAnswers", JSON.stringify([]));
        sessionStorage.setItem("incorrectAnswers", JSON.stringify([]));
        return;
    }

    const correctAnswersSet = new Set();
    const incorrectAnswersSet = new Set();
    
    xpData.forEach(record => {
        // Check if record.question_id is in the questions array.
        if (questions.includes(record.question_id)) {
            // If dXP is positive, add question_id value to correctAnswers.
            if (record.dXP > 0) {
              correctAnswersSet.add(record.question_id);
            }
            // If dXP is negative, add question_id value to incorrectAnswers.
            else if (record.dXP < 0) {
              incorrectAnswersSet.add(record.question_id);
            }
            // (If key2 is zero or another value, decide what to do.)
        }
    });

  // Save the arrays in sessionStorage
  const correctAnswers = [...correctAnswersSet];
  const incorrectAnswers = [...incorrectAnswersSet];
  sessionStorage.setItem("correctAnswers", JSON.stringify(correctAnswers));
  sessionStorage.setItem("incorrectAnswers", JSON.stringify(incorrectAnswers));
  
}

//--------------------------------------------------------------------------------------

// Main initialization function
async function initializePage() {
    // Get currentCurriculum from session
    currentCurriculumId = sessionStorage.getItem('currentCurriculum');
    await setupTestprepSession();
    await loadStandardsData();
    fetchCurriculum(currentCurriculumId, false);
    initializeXPData();
    updateXPDataBar();
    
}



//--------------------------------------------------------------------------------------

// Things to do after DOM load
document.addEventListener("DOMContentLoaded", function() {
    // Add event listener to Next Question button
    const nextButton = document.getElementById("next-question-btn");
    
    // Initialize the session
    initializePage();
    //updateSessionData();  // Recent add here (all 3)
    //checkCurriculumStatus;
    //loadProgressBar();
    
    if (nextButton) {
        nextButton.addEventListener("click", nextQuestionButton);
    }
});

//---------------------------------------------------------------------------------------

// Add the beforeunload event listener to call updateSessionData()

window.addEventListener('beforeunload', function(event) { 
    updateSessionData();
});

//---------------------------------------------------------------------------------------

// Scripts for the calculator

// Get the elements
const calculatorBtn = document.getElementById("calculatorBtn");
const calculatorModal = document.getElementById("calculatorModal");
const closeCalculator = document.getElementById("closeCalculator");
const calcDisplay = document.getElementById("calcDisplay");
const calcButtons = document.querySelectorAll(".calc-btn");

// Open the calculator modal when the button is clicked
calculatorBtn.addEventListener("click", () => {
    calculatorModal.style.display = "flex";
});

// Close the modal when the close button is clicked or clicking outside the modal
closeCalculator.addEventListener("click", () => {
    calculatorModal.style.display = "none";
});

// Close the modal if the user clicks outside the modal content
window.addEventListener("click", (event) => {
    if (event.target === calculatorModal) {
        calculatorModal.style.display = "none";
    }
});

// Handle calculator button clicks
calcButtons.forEach(button => {
    button.addEventListener("click", () => {
        const value = button.textContent;

        if (value === "C") {
            // Clear the display
            calcDisplay.value = "";
        } else if (value === "=") {
            // Replace the '^' with '**' for exponentiation to work in JavaScript
            try {
                calcDisplay.value = eval(calcDisplay.value.replace("^", "**"));
            } catch (error) {
                calcDisplay.value = "Error";
            }
        } else {
            // Add the button value to the display
            calcDisplay.value += value;
        }
    });
});

//----------------------------------------------------------------------------------

// Scripts for the notepad

// Get the modal and button
const notepadModal = document.getElementById('notepadModal');
const notepadBtn = document.getElementById('notepadBtn');
const closeNotepad = document.getElementById('closeNotepad');
const notepadTextarea = document.getElementById('notepad');

// Open the notepad window
notepadBtn.onclick = function() {
    notepadModal.style.display = 'block'; // Show modal
    // Load saved notes if any
    const savedNotes = sessionStorage.getItem('notepadNotes');
    if (savedNotes) {
        notepadTextarea.value = savedNotes; // Set the textarea value to saved notes
    }
};

// Close the notepad window
closeNotepad.onclick = function() {
    notepadModal.style.display = 'none'; // Hide modal
    // Save notes when closing
    const notesContent = notepadTextarea.value;
    sessionStorage.setItem('notepadNotes', notesContent); // Save notes
};

// Draggable functionality
let isDragging = false;
let offsetX, offsetY;

notepadModal.onmousedown = function(e) {
    isDragging = true;
    offsetX = e.clientX - notepadModal.offsetLeft;
    offsetY = e.clientY - notepadModal.offsetTop;
    notepadModal.classList.add('draggable'); // Change cursor to move
};

document.onmousemove = function(e) {
    if (isDragging) {
        notepadModal.style.left = e.clientX - offsetX + 'px';
        notepadModal.style.top = e.clientY - offsetY + 'px';
    }
};

document.onmouseup = function() {
    isDragging = false;
    notepadModal.classList.remove('draggable'); // Reset cursor
};

// Close the modal if the user clicks outside of it
window.onclick = function(event) {
    if (event.target === notepadModal) {
        notepadModal.style.display = 'none'; // Hide modal if clicking outside
    }
};
