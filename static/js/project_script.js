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
let description;
let video;

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

function getCurrentIndex(parsedQuestionsList, currentQuestionId) {
    return parsedQuestionsList.indexOf(currentQuestionId);
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
    if (!sessionStorage.getItem('correctAnswers')) {
        sessionStorage.setItem('correctAnswers', JSON.stringify([]));
    };
    if (!sessionStorage.getItem('incorrectAnswers')) {
        sessionStorage.setItem('incorrectAnswers', JSON.stringify([]));
    }
})();

//--------------------------------------------------------------------------------------

// Initialize XP structure in local storage if it doesn't already exist

(function initializeXP() {
    if (!sessionStorage.getItem('xp')) {
        const initialXP = {
            overallXP: 0,
            certifications: {
                pcap: { xp_1: 0, xp_2: 0, xp_3: 0, xp_4: 0, xp_5: 0 },
                pcep: { xp_1: 0, xp_2: 0, xp_3: 0, xp_4: 0 }
            }
        };
        sessionStorage.setItem('xp', JSON.stringify(initialXP));
    }
})();

//--------------------------------------------------------------------------------------

// Initialize the curriculumScores structure in local storage if it doesn't already exist
(function initializeCurriculumScores() {
    if (!sessionStorage.getItem('curriculumScores')) {
        const initialScores = {};
        sessionStorage.setItem('curriculumScores', JSON.stringify(initialScores));
    }
})();

//--------------------------------------------------------------------------------------

// Initialize the contentScores structure in local storage if it doesn't already exist
(function initializeContentScores() {
    if (!sessionStorage.getItem('contentScores')) {
        const initialScores = {};
        sessionStorage.setItem('contentScores', JSON.stringify(initialScores));
    }
})();

//--------------------------------------------------------------------------------------

function updateSessionData() {
    const sessionData = {
        completedCurriculums: JSON.parse(sessionStorage.getItem('completedCurriculums')),
        contentScores: JSON.parse(sessionStorage.getItem('contentScores')),
        correctAnswers: JSON.parse(sessionStorage.getItem('correctAnswers')),
        currentCurriculum: sessionStorage.getItem('currentCurriculum'),
        currentQuestionId: sessionStorage.getItem('currentQuestionId'),
        curriculumScores: JSON.parse(sessionStorage.getItem('curriculumScores')),
        incorrectAnswers: JSON.parse(sessionStorage.getItem('incorrectAnswers')),
        xp: JSON.parse(sessionStorage.getItem('xp')),
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

// Function to update the curriculumScores collection
function updateCurriculumScores(curriculumID, XP_earned, XP_possible) {
    // Get the current curriculumScores from sessionStorage
    let curriculumScores = JSON.parse(sessionStorage.getItem('curriculumScores')) || {};

    // If the curriculum does not exist in curriculumScores, initialize it
    if (!curriculumScores[curriculumID]) {
        curriculumScores[curriculumID] = { Earned: 0, Possible: 0 };
    }

    // Update the Earned and Possible values for the specific curriculum
    curriculumScores[curriculumID].Earned = parseFloat((curriculumScores[curriculumID].Earned + XP_earned).toFixed(2));
    curriculumScores[curriculumID].Possible = parseFloat((curriculumScores[curriculumID].Possible + XP_possible).toFixed(2));

    // Save the updated curriculumScores back to sessionStorage
    sessionStorage.setItem('curriculumScores', JSON.stringify(curriculumScores));
}

//--------------------------------------------------------------------------------------

// Function to update the contentScores collection in sessionStorage
function updateContentScores(contentId, XP_earned, XP_possible) {
    // Retrieve the current contentScores from sessionStorage
    let contentScores = JSON.parse(sessionStorage.getItem('contentScores')) || {};

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

    // Save the updated contentScores back to sessionStorage
    sessionStorage.setItem('contentScores', JSON.stringify(contentScores));
}

//------------------------------------------------------------------------------------------

// Function to calculate the XP change and update the XP storage

function updateXP(questionId, content, subject, difficulty, status) {
    console.log("Updating XP");
    // Get the list of correct and incorrect answers from sessionStorage
    let correctAnswers = JSON.parse(sessionStorage.getItem('correctAnswers')) || [];
    let incorrectAnswers = JSON.parse(sessionStorage.getItem('incorrectAnswers')) || [];

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

    // Get the current XP data from sessionStorage, or initialize it if it doesn't exist
    let xpData = JSON.parse(sessionStorage.getItem('xp')) || {
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

    // Save the updated XP data back to sessionStorage
    sessionStorage.setItem('xp', JSON.stringify(xpData));
    
    // Update content score
    updateContentScores(content, dXP_accrued, dXP_possible);
    
    // Update curriculum score
    let currentCurriculum = sessionStorage.getItem('currentCurriculum');
    updateCurriculumScores(currentCurriculum, dXP_accrued, dXP_possible);
    
    // Update the XP data bar
    updateXPDisplay(content)
    

    return dXP; // Return the XP change for display
}

//--------------------------------------------------------------------------------------

// Function to update the question metadata on the navbar

function updateNavbarData(questionId) {

    console.log("Updating Navbar Data:")

    // Get the completion status of the current question
    const isCompleted = checkQuestionStatus(questionId) ? "Completed" : "Not Completed";
    
    // Set the correct class for status
    const statusClass = isCompleted === "Completed" ? "completed" : "not-completed";
    
    // Update the navbar with category/objective/difficulty
    const questionInfo = `Content:${content}  |  Objective:${subject}.${objective}  |  Difficulty:${difficulty}  | Status: <span class="${statusClass}">${isCompleted}</span>  | `;
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
function updateXPDisplay(content) {
    // Retrieve the XP data from local storage
    const xpData = JSON.parse(sessionStorage.getItem('xp')) || {};
    
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
    const currentCurriculum = sessionStorage.getItem('currentCurriculum');
    const curriculumScores = JSON.parse(sessionStorage.getItem('curriculumScores')) || {};
    
    if (currentCurriculum && curriculumScores[currentCurriculum]) {
        const earned = curriculumScores[currentCurriculum].Earned || 0;
        const possible = curriculumScores[currentCurriculum].Possible || 0;
        const curriculumScore = possible > 0 ? ((earned / possible) * 100).toFixed(2) : '0.00';
        
        // Update the curriculum score display
        document.getElementById('curriculumScore').textContent = curriculumScore + '%';
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
    updateXPDisplay(content);
    
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

async function fetchCurriculum(keyInput, isNew = true) {
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
        console.log("Received questions list");

        // Save the questions list and curriculum name to local storage
        sessionStorage.setItem("questionsList", JSON.stringify(questionsList));
        sessionStorage.setItem("currentCurriculum", keyInput);

        // Now that we have curriculum data, load the question
        // If the curriculum is changed, find unanswered or incorrect questions
        if (isNew === false) {
            const currentQuestionId = sessionStorage.getItem('currentQuestionId');
            nextQuestion(currentQuestionId);
        } else {
            nextQuestion(findNextQuestion());
        }
        
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
        parsed_key = keyInput.split(".");
        content = parsed_key[0].toLowerCase();
        subject = parsed_key[1];
        objective = parsed_key[2];
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

document.getElementById("key-input").addEventListener("keypress", function(event) {
    const currentQuestionID = sessionStorage.getItem('currentQuestionId');
    if (event.key === "Enter") {
        const keyInput = event.target.value.toLowerCase();
        fetchCurriculum(keyInput, true).then(() => {
            //stopTimer();
            //updateSessionData();
            //checkCurriculumStatus();
            //loadQuestion(currentQuestionId);
            //loadProgressBar();
        });
    }
});

//--------------------------------------------------------------------------------------------

// Load the current question on page refresh
window.onload = function() {
    const currentQuestionId = sessionStorage.getItem('currentQuestionId');
    const currentCurriculum = sessionStorage.getItem('currentCurriculum');
    
    // If a current curriculum is set, put the text in the lesson code entry
    if (currentCurriculum && currentQuestionId) {
        fetchCurriculum(currentCurriculum, false).then(() => {
            //stopTimer();
            //updateSessionData();
            //checkCurriculumStatus();
            //nextQuestion(currentQuestionId);
            //loadProgressBar();
        });
        
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

document.getElementById("run").onclick = function() {
    var code = editor.getValue();

    console.log("Code output is being requested");

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
            console.log("Code output has been received");
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
        document.getElementById("inputModalPromptMessage").textContent = promptMessage;
        document.getElementById("inputModal").style.display = "block";

        document.getElementById("submitInput").onclick = function() {
            let userInput = document.getElementById("userInput").value;
            document.getElementById("inputModal").style.display = "none";
            resolve(userInput);
        };

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

// Handling the Submit Answer button click
document.getElementById("submit-answer").onclick = async function() {
    var selectedAnswer = document.querySelector('input[name="answer"]:checked');
    const currentQuestionId = sessionStorage.getItem('currentQuestionId');
    const timeLimit = content === 'pcap' ? 90 : 80; // Set time limit based on content type
    const answeredOnTime = checkTime(timeLimit); // Check if answered on time
    
    if (selectedAnswer) {
        stopTimer();
        // Check against the stored correct answer
        if (selectedAnswer.value === correctAnswer) {
            document.getElementById("run").disabled = false; // Enable the Run Code button
            
            if (answeredOnTime) {
                // Update XP and show alert for correct answer within time limit
                dXP = updateXP(currentQuestionId, content, subject, difficulty, 'correct');
                // Display the description and the video button
                updateDescription();
                updateAnswerStatus(currentQuestionId, "correct");
                await showResultDialog(true, dXP);               
            } else {
                // Handle case where correct answer is given but not within time limit
                dXP = updateXP(currentQuestionId, content, subject, 0, 'correct');
                // Display the description and the video button
                updateDescription();
                await showResultDialog("late", dXP);
            }
            
            updateNavbarData(currentQuestionId);
            document.getElementById("submit-answer").disabled = true;
        } else {
            // Incorrect answer handling (timing doesn't matter)
            dXP = updateXP(currentQuestionId, content, subject, difficulty, 'incorrect');
            // Display the description and the video button
            updateDescription();
            updateAnswerStatus(currentQuestionId, "incorrect");
            await showResultDialog(false, dXP);
            document.getElementById("submit-answer").disabled = true;
            document.getElementById("run").disabled = false; // Enable the Run Code button
        }
        
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

// Listener for the Next Question button
document.addEventListener("DOMContentLoaded", function() {
    // Add event listener to Next Question button
    const nextButton = document.getElementById("next-question-btn");
    
    // Initialize the session data and progress bar
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
    updateSessionData(); });

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
