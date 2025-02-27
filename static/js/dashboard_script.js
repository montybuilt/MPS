let totalXP = 0;
let xpLevel = "Beginner";
let xpScore = 0;
let xpCompletion = 0;
let myAssignments;
let myContent;
let myCurriculums;



//-----------------------------------------------------------------------------------------------------------------

// Function to fetch user content/curriculum/question assignments and create global variables
// Function will also save the xp history for the student in sessionStorage
async function setupDashboardSession() {
    // Retrieve parameters from localStorage or define defaults.
    let lastUpdate = localStorage.getItem("xpLastFetchedDatetime") || "1970-01-01";
    let xpUsername = localStorage.getItem("xpUsername") || "default_xpusername";
    const username = sessionStorage.getItem("username") || "default_username";
    
    // Reset the xpData if the current user is not the same as the stored xpData
    if (xpUsername !== username) {
        console.log("NEW USER ALERT!");
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
    
    console.log("Search Params:", lastUpdate, xpUsername);
  
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
        console.log('Student Assignments:', data.data.userAssignments);
        
        // Save the student assignments dictionary into sessionStorage.
        const studentAssignments = data.data.userAssignments || {};
        sessionStorage.setItem('studentAssignments', JSON.stringify(studentAssignments));
        
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
            console.log("XP Data updated and stored.");
        } else {
            console.log("No XP Data update needed.");
        }
        
        // Update the xpUsername in localStorage.
        localStorage.setItem("xpUsername", data.data.xpUsername);
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

//-----------------------------------------------------------------------------------------------------------------
// Function to process XP data
function processXP() {
    const xpDict = {'overallXP': 50};
    const contentScores = JSON.parse(sessionStorage.getItem('contentScores'));
    console.log("Content Scores:", contentScores);

    totalXP = xpDict['overallXP'] || 0;
    console.log("Total XP:", totalXP);

    if (totalXP > 100) {
        xpLevel = 'Advanced';
    } else if (totalXP > 70) {
        xpLevel = 'Intermediate';
    } else if (totalXP > 35) {
        xpLevel = 'Developing';
    } else {
        xpLevel = 'Beginner';
    }
    console.log("xpLevel:", xpLevel);

    let totalEarned = 0;
    let totalPossible = 0;

    for (let content in contentScores) {
        totalEarned += contentScores[content]['Earned'];
        totalPossible += contentScores[content]['Possible'];
        xpScore = totalEarned / totalPossible;
    }
}

//-----------------------------------------------------------------------------------------------------------------
// Function to create cumulative XP series for chart
function getXPDataForChart() {
    const xpData = JSON.parse(localStorage.getItem('xpData')) || [];

    // Sort by timestamp
    xpData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const cumulativeData = {};
    const seriesData = {};
    const totalXPSeries = { x: [], y: [] };
    let cumulativeTotal = 0;

    xpData.forEach((record, index) => {
        const { curriculum_id, dXP, timestamp } = record;

        if (!cumulativeData[curriculum_id]) {
            cumulativeData[curriculum_id] = 0;
            seriesData[curriculum_id] = { x: [], y: [] };
        }

        cumulativeData[curriculum_id] += dXP;
        cumulativeTotal += dXP;

        // Ensure each series has points for each timestamp
        Object.keys(cumulativeData).forEach(id => {
            seriesData[id].x.push(index); //new Date(timestamp));
            seriesData[id].y.push(cumulativeData[id]);
        });

        totalXPSeries.x.push(index); //new Date(timestamp));
        totalXPSeries.y.push(cumulativeTotal);
    });

    return [seriesData, totalXPSeries];
}

//-----------------------------------------------------------------------------------------------------------------
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

//-----------------------------------------------------------------------------------------------------------------

function identifyCompletedCurriculums() {
  const assignments = JSON.parse(sessionStorage.getItem("studentAssignments")) || {};
  const xpData = JSON.parse(localStorage.getItem("xpData")) || [];
  const completedCurriculums = [];

  // Build a set of correct answers from xpData for quick lookup.
  const correctAnswerSet = new Set();
  xpData.forEach(record => {
    if (record.dXP > 0 && record.question_id) {
      correctAnswerSet.add(record.question_id);
    }
  });

  // Iterate over each content area and curriculum.
  for (let content in assignments) {
    const curricula = assignments[content];
    for (let curriculum in curricula) {
      const questions = curricula[curriculum];
      // Check if all questions are answered correctly.
      const allCorrect = questions.every(q => correctAnswerSet.has(q));
      if (allCorrect) {
        completedCurriculums.push(curriculum);
      }
    }
  }

  // Store the completed curriculums in sessionStorage.
  sessionStorage.setItem("completedCurriculums", JSON.stringify(completedCurriculums));
  return completedCurriculums;
}

//-----------------------------------------------------------------------------------------------------------------
// Function to choose the next question
function chooseNextQuestion(questions, correctAnswers, incorrectAnswers) {
    // First question not in correctAnswers.
    for (let q of questions) {
        if (!correctAnswers.includes(q)) {
            return q;
        }
    }
    // If all are correct, choose the first that is in incorrectAnswers.
    for (let q of questions) {
        if (incorrectAnswers.includes(q)) {
            return q;
        }
    }
    // Default to the first question.
    return questions[0];
}

//-----------------------------------------------------------------------------------------------------------------
// Helper function to generate bright random colors for the series
function getRandomBrightColor() {
    const r = Math.floor(200 + Math.random() * 55);
    const g = Math.floor(200 + Math.random() * 55);
    const b = Math.floor(200 + Math.random() * 55);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
}

//-----------------------------------------------------------------------------------------------------------------
// Function to draw an area chart
function drawAreaChart() {
    const [seriesData, totalXPSeries] = getXPDataForChart();

    const data = Object.keys(seriesData).map(curriculum_id => ({
        x: seriesData[curriculum_id].x,
        y: seriesData[curriculum_id].y,
        mode: 'lines',
        fill: 'tozeroy',
        stackgroup: 'one', // Ensure stacking
        name: curriculum_id,
        line: { width: 2 },
        fillcolor: getRandomBrightColor(),
    }));

    data.push({
        x: totalXPSeries.x,
        y: totalXPSeries.y,
        mode: 'lines',
        name: 'Total XP',
        line: { color: 'orange', width: 5 }
    });

    const layout = {
        title: { text: 'XP Accumulation Over Time', font: { color: 'white' } },
        xaxis: {
            title: '',
            showticklabels: false, // Hide x-axis labels
            color: 'white',
            gridcolor: 'rgba(255, 255, 255, 0.2)'
        },
        yaxis: {
            title: 'XP',
            rangemode: 'tozero',
            color: 'white',
            gridcolor: 'rgba(255, 255, 255, 0.2)',
            side: 'right' // Move y-axis labels to the right side
        },
        paper_bgcolor: 'black',
        plot_bgcolor: 'black',
        showlegend: false, // Hide legend
        margin: {
            l: 20,
            r: 30,
            t: 40,
            b: 20,
        }
    };

    Plotly.newPlot('xpChart', data, layout);
}

//-----------------------------------------------------------------------------------------------------------------
// Function to display KPI data
function displayKPIData() {
    updateKPI('total-xp', totalXP.toFixed(1), xpLevel);
    updateKPI('xp-level', xpLevel, xpLevel);
    updateKPI('xp-score', (xpScore * 100).toFixed(0) + '%', xpLevel);
}

function updateKPI(id, value, condition) {
    const element = document.getElementById(id);
    element.textContent = value;

    if (condition === 'Advanced') {
        element.style.color = 'green';
    } else if (condition === 'Intermediate') {
        element.style.color = 'yellow';
    } else if (condition === 'Developing') {
        element.style.color = 'orange';
    } else {
        element.style.color = 'red';
    }
}


//-----------------------------------------------------------------------------------------------------------------
function renderContentPanel() {
  const assignments = JSON.parse(sessionStorage.getItem("studentAssignments"));
  const completed = JSON.parse(sessionStorage.getItem("completedCurriculums")) || [];
  const xpData = JSON.parse(localStorage.getItem("xpData")) || [];
  const panel = document.getElementById("content-panel");
  panel.innerHTML = '';

  for (let content in assignments) {
    const row = document.createElement("div");
    row.classList.add("content-row");

    const title = document.createElement("div");
    title.classList.add("content-title");
    title.textContent = content;
    row.appendChild(title);

    const curricula = assignments[content];
    // Extract curriculum keys and sort them naturally
    const curriculumKeys = Object.keys(curricula).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    for (let curriculum of curriculumKeys) {
      const box = document.createElement("div");
      box.classList.add("curriculum-box");
      box.textContent = curriculum;

      // Determine box color and text color:
      if (completed.includes(curriculum)) {
        box.style.backgroundColor = "green";
        box.style.color = "white";
      } else {
        const questions = assignments[content][curriculum];
        const answered = xpData.some(record => questions.includes(record.question_id));
        if (answered) {
          box.style.backgroundColor = "yellow";
          box.style.color = "black";
        } else {
          box.style.backgroundColor = "grey";
          box.style.color = "white";
        }
      }

      box.addEventListener("click", () => {
        sessionStorage.setItem("currentCurriculum", curriculum);
        const questions = assignments[content][curriculum];
        processPriorAnswers(xpData, questions);
        const correctAnswers = JSON.parse(sessionStorage.getItem("correctAnswers")) || [];
        const incorrectAnswers = JSON.parse(sessionStorage.getItem("incorrectAnswers")) || [];
        const nextQuestion = chooseNextQuestion(questions, correctAnswers, incorrectAnswers);
        sessionStorage.setItem("currentQuestionId", nextQuestion);
        window.location.href = "testprep";
      });

      row.appendChild(box);
    }
    panel.appendChild(row);
  }
}


//-----------------------------------------------------------------------------------------------------------------
// Main initialization function
async function initializePage() {
    await setupDashboardSession();
    console.log("Processing XP")
    processXP();
    console.log("Calculating all curriculums status")
    identifyCompletedCurriculums();
    console.log("Displaying KPI Data")
    displayKPIData();
    console.log("Drawing Chart")
    drawAreaChart();
}

//--------------------------------------------------------------------------------------

// Things to do after DOM load
document.addEventListener("DOMContentLoaded", async function() {
    console.log("Initializing Page");
    await initializePage();
    console.log("Rendering Content Panel");
    renderContentPanel();
});



//-----------------------------------------------------------------------------------------------------------------
// Prepare data items on page load
window.onload = function() {
    //initializePage();
};

//-----------------------------------------------------------------------------------------------------------------