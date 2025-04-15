// This script animates the student_detail.html page

let totalXP = 0;
let xpLevel = "Beginner";
let xpScore = 0;
let xpCompletion = 0;
let studentName;
let lastUpdate = ""
let curriculumXP = {};
let standardObjectiveXP = {};
let xpData = [];
let studentAssignments = {};
let completedCurriculums = [];
let currentCurriculum;
let currentQuestionId;
window.standardsData = {}

currentCurriculum = 'pcap1'
currentQuestionId = 'pcap.1.1.1'

//-----------------------------------------------------------------------------------------------------------------

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

//-----------------------------------------------------------------------------------------------------------------

// Async function to get the students assigned to all of the teachers classrooms
async function fetchAndPopulateUsers() {
    try {
        const response = await fetch('/get_users');
        if (!response.ok) {
            const errorData = await response.json();  // Extract the error message from the response
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();  // Assume response is { "users": [...] }
        console.log("Data:", data);
        // Populate the dropdown
        const dropdown = document.getElementById('studentName');
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

//-----------------------------------------------------------------------------------------------------------------

function calculateKPIs(xpData) {
    // Retrieve potential XP data from localStorage.
    const curriculumXPFromStorage = curriculumXP || {};
    const standardObjectiveXPFromStorage = standardObjectiveXP || {};

    const summary = {
        overall: { totalEarned: 0, scoreEarned: 0, totalPossible: 0, percent: 0 },
        content: {},
        curriculum: {},
        standardObjective: {}
    };

    // Iterate over xpData to accumulate earned XP.
    xpData.forEach(record => {
        const { content_id, curriculum_id, standard, objective, dXP } = record;
        
        // Overall: accumulate raw earned XP and positive earned XP.
        summary.overall.totalEarned += dXP;
        summary.overall.scoreEarned += (dXP > 0 ? dXP : 0);
    
    // Content grouping: accumulate earned XP.
    if (!summary.content[content_id]) {
        summary.content[content_id] = { totalEarned: 0, scoreEarned: 0, totalPossible: 0, percent: 0 };
    }
    summary.content[content_id].totalEarned += dXP;
    summary.content[content_id].scoreEarned += (dXP > 0 ? dXP : 0);
    
    // Curriculum grouping: accumulate earned XP.
    if (!summary.curriculum[curriculum_id]) {
        summary.curriculum[curriculum_id] = { totalEarned: 0, scoreEarned: 0, totalPossible: 0, percent: 0 };
    }
    summary.curriculum[curriculum_id].totalEarned += dXP;
    summary.curriculum[curriculum_id].scoreEarned += (dXP > 0 ? dXP : 0);
    
    // Standard/Objective grouping (nested by content)
    if (!summary.standardObjective[content_id]) {
        summary.standardObjective[content_id] = {};
    }
    const soKey = `${standard}.${objective}`;
    if (!summary.standardObjective[content_id][soKey]) {
        summary.standardObjective[content_id][soKey] = { totalEarned: 0, scoreEarned: 0, totalPossible: 0, percent: 0 };
    }
    summary.standardObjective[content_id][soKey].totalEarned += dXP;
    summary.standardObjective[content_id][soKey].scoreEarned += (dXP > 0 ? dXP : 0);
    });

    // Build a mapping of content -> set of unique curriculum_ids encountered in xpData.
    const contentCurricula = {};
    xpData.forEach(record => {
        const { content_id, curriculum_id } = record;
        if (!contentCurricula[content_id]) {
          contentCurricula[content_id] = new Set();
        }
        contentCurricula[content_id].add(curriculum_id);
    });

    // For each curriculum group, override totalPossible from curriculumXP.
    for (const curriculum_id in summary.curriculum) {
        if (summary.curriculum.hasOwnProperty(curriculum_id)) {
            summary.curriculum[curriculum_id].totalPossible = curriculumXPFromStorage[curriculum_id] || 0;
        }
    }

    // For content grouping, sum up the curriculumXP values for each curriculum in that content
    const assignments = studentAssignments || {};
    for (const content_id in summary.content) {
        if (summary.content.hasOwnProperty(content_id)) {
            let totalPossible = 0;
            if (assignments[content_id]) {
                Object.keys(assignments[content_id]).forEach(curriculum_id => {
                    totalPossible += (curriculumXPFromStorage[curriculum_id] || 0);
                });
            }
            summary.content[content_id].totalPossible = totalPossible;
        }
    }

    // For overall, sum up all unique curriculumXP values (across all curricula encountered).
    let overallPossible = 0;
    for (const curriculum_id in curriculumXPFromStorage) {
        if (curriculumXPFromStorage.hasOwnProperty(curriculum_id)) {
            overallPossible += curriculumXPFromStorage[curriculum_id];
        }
    }
    summary.overall.totalPossible = overallPossible;
    console.log("Overall Possible", overallPossible);

    // For standard/objective grouping: override totalPossible using standardObjectiveXP.
    for (const content_id in summary.standardObjective) {
        if (summary.standardObjective.hasOwnProperty(content_id)) {
            for (const soKey in summary.standardObjective[content_id]) {
                if (summary.standardObjective[content_id].hasOwnProperty(soKey)) {
                    summary.standardObjective[content_id][soKey].totalPossible =
                      (standardObjectiveXPFromStorage[content_id] &&
                        standardObjectiveXPFromStorage[content_id][soKey]) || 0;
                }
            }
        }
    }

    // Compute overall percent using scoreEarned (only positive dXP) over totalPossible.
    summary.overall.percent = summary.overall.totalPossible > 0 ?
        (summary.overall.scoreEarned / summary.overall.totalPossible) * 100 : 0;
    
    // Set the global XP values.
    totalXP = summary.overall.totalEarned;  // raw total earned XP (including negatives)
    xpScore = summary.overall.percent;        // XP Score is percentage of positive earned XP
    
    // Helper: Compute percentage for group using scoreEarned.
    function computePercentage(group) {
        group.percent = group.totalPossible > 0 ? (group.scoreEarned / group.totalPossible) * 100 : 0;
    }

    Object.values(summary.content).forEach(computePercentage);
    Object.values(summary.curriculum).forEach(computePercentage);
    Object.values(summary.standardObjective).forEach(soGroup => {
        Object.values(soGroup).forEach(computePercentage);
    });
    
    return summary;
}

//-----------------------------------------------------------------------------------------------------------------

// Function to fetch user content/curriculum/question assignments and create global variables
// Function will also save the xp history for the student in sessionStorage
async function setupDashboardSession(studentName) {
    // Retrieve parameters from localStorage or define defaults.
    lastUpdate = "1970-01-01";
    
    // Build query parameters.
    const params = new URLSearchParams({
        lastUpdate: lastUpdate,
        xpUsername: studentName
    });
    
    console.log("Search Params:", lastUpdate, studentName);
  
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
        
        // Get the raw assignments from the response
        const rawAssignments = data.data.userAssignments || {};
        console.log("RAW ASSIGNMENTS", rawAssignments);
        
        // Initialize our dictionaries.
        studentAssignments = {};      // { content: { curriculum: [question_ids] } }
        curriculumXP = {};            // { curriculum: potential_xp }
        standardObjectiveXP = {};     // { content: { "standard.objective": potential_xp } }
        
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
        curriculumXP = curriculumXP;
        standardObjectiveXP = standardObjectiveXP;
        
        console.log("Curriculum XPs", curriculumXP);
        console.log("Standard/Objective XPs", standardObjectiveXP);

        // Extract all content areas (keys) from the student assignments.
        const assignedContent = Object.keys(studentAssignments) || [];
        
        // Get Students XP Data
        xpData = data.data.xpData || [];
        console.log("XP DATA DUDE", xpData)
        
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

//-----------------------------------------------------------------------------------------------------------------

// Helper: Convert a score (0-100) to a color from red (low) to green (high)
function getColorForScore(score) {
  if (score > 70) {
    return "green";
  } else if (score >= 50) {
    return "yellow";
  } else {
    return "red";
  }
}

function renderKPIPanel(currentContent) {
  // Create or select the KPI panel container (inserted between content-panel and chart-container)
  let kpiPanel = document.getElementById('kpi-panel');
  if (!kpiPanel) {
    kpiPanel = document.createElement('div');
    kpiPanel.id = 'kpi-panel';
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer) {
      chartContainer.parentNode.insertBefore(kpiPanel, chartContainer);
    } else {
      document.body.appendChild(kpiPanel);
    }
  }
  kpiPanel.innerHTML = ''; // Clear previous content

  // Set a fixed overall width for the KPI panel and center it.
  kpiPanel.style.width = '1200px';
  kpiPanel.style.margin = '0 auto';
  // Use column layout so we have a title row above the panels.
  kpiPanel.style.display = 'flex';
  kpiPanel.style.flexDirection = 'column';

  // --- Create a title container for the three sub-panels ---
  const detailTitles = document.createElement('div');
  detailTitles.id = 'kpi-detail-titles';
  detailTitles.style.display = 'flex';
  detailTitles.style.justifyContent = 'space-between';
  detailTitles.style.alignItems = 'center';
  detailTitles.style.marginBottom = '10px';
  
  // Create three title boxes; adjust marginLeft as needed to shift horizontally.
  const heatmapTitle = document.createElement('div');
  heatmapTitle.id = 'heatmapTitle';
  heatmapTitle.className = 'title-box';
  heatmapTitle.style.flex = '1';
  heatmapTitle.style.textAlign = 'left';
  heatmapTitle.style.marginLeft = '68px';
  heatmapTitle.innerHTML = `<h5 style="margin: 0; color: white; font-size: .9em;">${currentContent} - Objectives Heatmap</h5>`;
  
  const radarTitle = document.createElement('div');
  radarTitle.id = 'radarTitle';
  radarTitle.className = 'title-box';
  radarTitle.style.flex = '1';
  radarTitle.style.textAlign = 'left';
  radarTitle.style.marginLeft = '50px';
  radarTitle.innerHTML = `<h5 style="margin: 0; color: white; font-size: .9em;">${currentContent} - Curriculum Performance</h5>`;
  
  const xpTitle = document.createElement('div');
  xpTitle.id = 'xpTitle';
  xpTitle.className = 'title-box';
  xpTitle.style.flex = '1';
  xpTitle.style.textAlign = 'right';
  xpTitle.style.marginRight = '155px';
  xpTitle.innerHTML = `<h5 style="margin: 0; color: white; font-size: .9em;">Historical XP Performance</h5>`;
  
  detailTitles.appendChild(heatmapTitle);
  detailTitles.appendChild(radarTitle);
  detailTitles.appendChild(xpTitle);
  
  // Append the title container to the KPI panel.
  kpiPanel.appendChild(detailTitles);

  // --- Create a container for the three sub-panels ---
  const panelsContainer = document.createElement('div');
  panelsContainer.id = 'kpi-panels';
  panelsContainer.style.display = 'flex';
  panelsContainer.style.justifyContent = 'space-around';
  panelsContainer.style.alignItems = 'flex-start';
  
  // Define sizes for the three sub-panels:
  const gridWidth = 300;    // for the heatmap grid
  const radarWidth = 400;   // for the radar chart
  const xpChartWidth = 450; // for the historical XP chart

  // Create grid container (heatmap).
  const gridDiv = document.createElement('div');
  gridDiv.id = 'grid';
  gridDiv.style.width = `${gridWidth}px`;
  gridDiv.style.display = 'grid';
  gridDiv.style.gridGap = '2px';
  // Use 6 columns; 48px cells.
  gridDiv.style.gridTemplateColumns = `repeat(6, 48px)`;

  // Create radar container.
  const radarDiv = document.createElement('div');
  radarDiv.id = 'radar';
  radarDiv.style.width = `${radarWidth}px`;
  // For a 3:2 aspect ratio, height = radarWidth * 2/3 (e.g., 400 x ~267)
  radarDiv.style.height = `${Math.round(radarWidth * 2/2.98)}px`;
  radarDiv.style.backgroundColor = "#3d3d39";
  radarDiv.style.border = '1px solid white';

  // Create historical XP chart container.
  const xpChartDiv = document.createElement('div');
  xpChartDiv.id = 'xpChart';
  xpChartDiv.style.width = `${xpChartWidth}px`;
  xpChartDiv.style.height = `${xpChartWidth * 2/3.35}px`;
  xpChartDiv.style.backgroundColor = "#3d3d39";
  xpChartDiv.style.border = '1px solid white';

  // Append the three sub-panels to the panels container.
  panelsContainer.appendChild(gridDiv);
  panelsContainer.appendChild(radarDiv);
  panelsContainer.appendChild(xpChartDiv);
  
  // Append the panels container to the KPI panel.
  kpiPanel.appendChild(panelsContainer);

  // Retrieve KPI summary data (assumes xpData is in localStorage)
  const summary = calculateKPIs(xpData);
  const soData = summary.standardObjective[currentContent] || {};

  // Build a fixed 5x6 grid for standards/objectives.
  // For tooltip purposes, currentContent, row and col will determine what text to display.
  for (let row = 1; row <= 5; row++) {
    for (let col = 1; col <= 6; col++) {
      const key = `${row}.${col}`;
      const cell = document.createElement('div');
      cell.style.width = '50px';
      cell.style.height = '50px';
      cell.style.display = 'flex';
      cell.style.alignItems = 'center';
      cell.style.justifyContent = 'center';
      cell.style.border = '1px solid #ffffff';
      cell.style.fontSize = '12px';
      cell.style.color = '#000000';
      
      if (soData.hasOwnProperty(key)) {
        const score = soData[key].percent;
        cell.style.backgroundColor = getColorForScore(score);
        
        console.log("Standards Available?", window.standardsData)
        
        // Build a detailed tooltip using the standardsData.
        let tooltipText = `${currentContent} ${key}: ${score.toFixed(1)}%\n`;
        if (window.standardsData &&
            window.standardsData[currentContent] &&
            window.standardsData[currentContent][row]) {
          const stdInfo = window.standardsData[currentContent][row];
          tooltipText += stdInfo.description + "\n";
          if (stdInfo.objectives && stdInfo.objectives[col]) {
            tooltipText += stdInfo.objectives[col];
          }
        }
        cell.style.cursor = "help";
        cell.title = tooltipText;
        cell.textContent = score.toFixed(0) + '%';
      } else {
        cell.style.backgroundColor = '#3d3d39';
        cell.title = `${currentContent} ${key}: No data`;
        cell.textContent = '';
      }
      gridDiv.appendChild(cell);
    }
  }

  // --- Build Radar Chart for Curriculum Performance ---
  const assignments = studentAssignments || {};
  const curricula = assignments[currentContent] || {};
  const curriculumIDs = Object.keys(curricula);
  
  let radarValues = [];
  let radarLabels = [];
  curriculumIDs.forEach(currId => {
    if (summary.curriculum[currId]) {
      radarValues.push(summary.curriculum[currId].percent);
      radarLabels.push(currId);
    }
  });
  // Close the loop for the polygon trace.
  let polygonValues = [...radarValues];
  let polygonLabels = [...radarLabels];
  if (radarValues.length > 0) {
    polygonValues.push(radarValues[0]);
    polygonLabels.push(radarLabels[0]);
  }
  
  const polygonTrace = {
    type: 'scatterpolar',
    mode: 'lines',
    r: polygonValues,
    theta: polygonLabels,
    fill: 'toself',
    line: { color: '#888' },
    name: 'Overall Performance',
    showlegend: false
  };
  
  const markerColors = ['red', 'blue', 'green', 'orange', 'purple', 'cyan', 'magenta', 'yellow'];
  
  const markerTraces = curriculumIDs.map((currId, i) => {
    if (summary.curriculum[currId]) {
      return {
        type: 'scatterpolar',
        mode: 'markers',
        r: [summary.curriculum[currId].percent],
        theta: [currId],
        marker: { color: markerColors[i % markerColors.length], size: 10 },
        name: currId,
        showlegend: true,
        text: '' // Hide data point labels.
      };
    }
  }).filter(trace => trace !== undefined);
  
  const radarData = [polygonTrace, ...markerTraces];
  
  const radarLayout = {
    paper_bgcolor: '#3d3d39',
    plot_bgcolor: '#3d3d39',
    polar: {
      bgcolor: '#3d3d39',
      domain: { x: [0, 0.85], y: [0, 1] },
      radialaxis: {
        visible: true,
        range: [0, 100.5],
        gridcolor: 'white',
        gridwidth: 2,
        tickfont: { color: 'white' },
        linecolor: 'white'
      },
      angularaxis: {
        showticklabels: false,
        gridcolor: 'white',
        gridwidth: 2,
        linecolor: 'white',
        gridshape: 'circular'
      }
    },
    margin: { t: 0, r: 145, b: 0, l: 15 },
    showlegend: true,
    legend: {
      orientation: 'v',
      x: 0.9,
      y: 0.9,
      font: { color: 'white' }
    },
    title: `${currentContent} - Curriculum Performance`,
    width: radarWidth,
    height: Math.round(radarWidth * 2 / 3)
  };
  
  Plotly.newPlot('radar', radarData, radarLayout);

  // --- Draw Historical XP Chart ---
  // Assuming your drawAreaChart() function renders into the xpChart container.
  drawAreaChart();
}

//-----------------------------------------------------------------------------------------------------------------
// Function to load the kpi panel with content related to session curriculumId
function loadKpiPanelFromCurrentCurriculum() {
  //const currentCurriculum = currentCurriculum;
  if (currentCurriculum) {
    const assignments = studentAssignments;
    let foundContent = null;
    // Iterate through each content area to see if it contains the currentCurriculum.
    for (let content in assignments) {
      if (assignments[content].hasOwnProperty(currentCurriculum)) {
        foundContent = content;
        break;
      }
    }
    if (foundContent) {
      renderKPIPanel(foundContent);
    }
  }
}


//-----------------------------------------------------------------------------------------------------------------
// Function to process XP data
function processXP() {
    
    if (totalXP > 100) {
        xpLevel = 'Advanced';
    } else if (totalXP > 70) {
        xpLevel = 'Intermediate';
    } else if (totalXP > 35) {
        xpLevel = 'Developing';
    } else {
        xpLevel = 'Beginner';
    }
}

//-----------------------------------------------------------------------------------------------------------------
// Function to create cumulative XP series for chart
function getXPDataForChart() {

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
        correctAnswers = [];
        incorrectAnswers = [];
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
  correctAnswers = correctAnswers;
  incorrectAnswers = incorrectAnswers;
  
}

//-----------------------------------------------------------------------------------------------------------------

function identifyCompletedCurriculums() {
  const assignments = studentAssignments || {};
  //const xpData = xpData || [];
  completedCurriculums = [];

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
        title: "", //{ text: 'XP Accumulation Over Time', font: { color: 'white' } },
        xaxis: {
            title: '',
            showticklabels: false, // Hide x-axis labels
            color: '#3d3d39',
            gridcolor: 'rgba(255, 255, 255, 0.2)'
        },
        yaxis: {
            title: 'XP',
            rangemode: 'tozero',
            color: 'white',
            gridcolor: 'rgba(255, 255, 255, 0.2)',
            side: 'right' // Move y-axis labels to the right side
        },
        paper_bgcolor: '#3d3d39',
        plot_bgcolor: '#3d3d39',
        showlegend: false, // Hide legend
        margin: {
            l: 20,
            r: 30,
            t: 20,
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
    updateKPI('xp-score', (xpScore).toFixed(0) + '%', xpLevel);
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
  const assignments = studentAssignments;
  //const xpData = xpData || [];
  const summary = calculateKPIs(xpData); // Calculate KPI summary here
  const panel = document.getElementById("content-panel");
  panel.innerHTML = '';

  for (let content in assignments) {
    const row = document.createElement("div");
    row.classList.add("content-row");

    // Create content title element styled as a button.
    const title = document.createElement("div");
    title.classList.add("content-title");
    
    // Button-like minimal styling:
    title.style.backgroundColor = "#ddd";      // light gray background
    title.style.color = "#000";                  // black text
    title.style.border = "1px solid #999";        // dark gray border
    title.style.borderRadius = "4px";
    title.style.padding = "8px 8px";             // smaller padding
    title.style.cursor = "pointer";
    title.style.boxShadow = "0px 1px 2px rgba(0, 0, 0, 0.2)";
    title.style.display = "inline-block";
    title.style.marginBottom = "0px";
    title.style.whiteSpace = "nowrap";           // prevents wrapping
    
    // Add a hover effect that doesn't increase the overall size too much.
    title.addEventListener("mouseover", () => {
      title.style.backgroundColor = "#ccc";
      title.style.boxShadow = "0px 2px 4px rgba(0, 0, 0, 0.3)";
    });
    title.addEventListener("mouseout", () => {
      title.style.backgroundColor = "#ddd";
      title.style.boxShadow = "0px 1px 2px rgba(0, 0, 0, 0.2)";
    });

    title.addEventListener("mouseout", () => {
      title.style.backgroundColor = "#ddd";
      title.style.boxShadow = "0px 2px 4px rgba(0, 0, 0, 0.3)";
    });

    // Get content score percentage (if available) from summary.content.
    let contentScore = '';
    if (summary.content[content] && !isNaN(summary.content[content].percent)) {
      contentScore = ` (${summary.content[content].percent.toFixed(0)}%)`;
    } else {
      contentScore = ` (0%)`;
    }

    title.textContent = content + contentScore;
    
    // When clicking on the content title, load the KPI panel for that content.
    title.addEventListener("click", () => {
      renderKPIPanel(content);
    });
    row.appendChild(title);

    const curricula = assignments[content];
    // Extract curriculum keys and sort them naturally.
    const curriculumKeys = Object.keys(curricula).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    const completed = completedCurriculums || [];
    for (let curriculum of curriculumKeys) {
      const box = document.createElement("div");
      box.classList.add("curriculum-box");
    
      // Determine the curriculum's score percentage.
      let percent = summary.curriculum[curriculum] ? summary.curriculum[curriculum].percent : 0;
      const isCompleted = completed.includes(curriculum);
      // If the curriculum is completed, force percent to 100.
      if (isCompleted) {
        percent = 100;
        // Append a checkmark (Unicode U+2713) to indicate completion.
        box.innerHTML = `${curriculum} <span style="font-size:16px; font-weight:bold; color:white;">&#10003;</span>`;
      } else {
        box.textContent = curriculum;
      }
      
      // Set background color based on score thresholds.
      if (percent > 70) {
        box.style.backgroundColor = "green";
      } else if (percent >= 50) {
        box.style.backgroundColor = "yellow";
      } else {
        box.style.backgroundColor = "red";
      }
      // Always set text color to black.
      box.style.color = "black";
      box.style.padding = "8px 1px";
      box.style.borderRadius = "4px";

      row.appendChild(box);
    }

    panel.appendChild(row);
  }
}

//-----------------------------------------------------------------------------------------------------------------


function clearKPIPanel() {

    let kpiPanel = document.getElementById('kpi-panel');
    let totalXP = document.getElementById('total-xp');
    let xpLevel = document.getElementById('xp-level');
    let xpScore = document.getElementById('xp-score');
    kpiPanel.innerHTML = "";
    totalXP.innerHTML = "";
    xpLevel.innerHTML = "";
    xpScore.innerHTML = "";
    curriculumXP = {};
    standardObjectiveXP = {};
    xpData = [];
    studentAssignments = {};
    completedCurriculums = [];
    

}

//-----------------------------------------------------------------------------------------------------------------

// Main initialization function

async function loadStudentName() {
    // first clear out the existing global variables and KPI Panel
    clearKPIPanel();
    // Fetch the student name from dropdown
    const studentName = document.getElementById("studentName").value;
    if (!studentName) return;  // ignore empty selection
    console.log("Student Name Selected:", studentName);
    await setupDashboardSession(studentName);
    console.log("Processing XP");
    await processXP();
    console.log("Calculating all curriculums status");
    completedCurriculums = identifyCompletedCurriculums();
    console.log("Drawing KPI Charts");
    //loadKpiPanelFromCurrentCurriculum();
    console.log("Displaying KPI Summary");
    renderContentPanel();
    displayKPIData();
}

//--------------------------------------------------------------------------------------

// Things to do after DOM load
document.addEventListener("DOMContentLoaded", async function() {
    await loadStandardsData();
    await fetchAndPopulateUsers();
    console.log("Page Loaded. Waiting for student selection.");
});




//-----------------------------------------------------------------------------------------------------------------


//-----------------------------------------------------------------------------------------------------------------

