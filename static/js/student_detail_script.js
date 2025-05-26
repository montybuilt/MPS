// This script animates the student_detail.html page

let totalXP = 0;
let xpLevel = "Beginner";
let xpScore = 0;
let xpCompletion = 0;
let studentName;
let lastUpdate = "";
let curriculumXP = {};
let standardObjectiveXP = {};
let xpData = [];
let studentAssignments = {};
let completedCurriculums = [];
let currentContent = "";
let currentCurriculum;
let currentQuestionId;
let curriculumOrderMap;
let questionDifficultyMap;
let tagSummary = {};  // <-- Step 1: add tag summary for tag performance panel
window.standardsData = {};

currentCurriculum = ""
currentQuestionId = ""

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

// NEW: Event listener for radar chart clicks
function setupRadarChartClickHandler(content) {
  const radarDiv = document.getElementById('radar');
  if (!radarDiv) return;

  radarDiv.on('plotly_click', function (eventData) {
    const point = eventData?.points?.[0];
    const curriculumId = point?.theta || null;
    if (content) {
      renderTagPerformancePanel(content, curriculumId);
    }
  });
} 

//-----------------------------------------------------------------------------------------------------------------

function calculateKPIs(xpData) {
    const assignments = studentAssignments || {};
    const difficultyMap = questionDifficultyMap || {};
    const summary = {
        overall: { scoreEarned: 0, totalPossible: 0, percent: 0 },
        content: {},
        curriculum: {},
        standardObjective: {}
    };

    // Step 1: Build performance map
    const history = {};
    const performanceMap = {};  // task_key → multiplier

    xpData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (const record of xpData) {
        const qid = record.question_id;
        if (!history[qid]) history[qid] = { correct: false, incorrect: false };

        if (record.dXP > 0) {
            if (history[qid].correct) {
                performanceMap[qid] = 0.001;
            } else if (history[qid].incorrect) {
                performanceMap[qid] = 0.5;
            } else {
                performanceMap[qid] = 1.0;
            }
            history[qid].correct = true;
        } else {
            history[qid].incorrect = true;
        }
    }

    // Step 2: Calculate earnedXP and totalPossible from assignments
    for (const content in assignments) {
        summary.content[content] = { scoreEarned: 0, totalPossible: 0, percent: 0 };
        summary.standardObjective[content] = {};

        for (const curriculum in assignments[content]) {
            summary.curriculum[curriculum] = { scoreEarned: 0, totalPossible: 0, percent: 0 };

            const questions = assignments[content][curriculum];

            for (const task_key of questions) {
                const difficulty = (typeof difficultyMap[task_key] === 'number') ? difficultyMap[task_key] / 3 : 0;
                const multiplier = performanceMap[task_key] || 0;
                const earned = difficulty * multiplier;

                // Overall
                summary.overall.totalPossible += difficulty;
                summary.overall.scoreEarned += earned;

                // Curriculum
                summary.curriculum[curriculum].totalPossible += difficulty;
                summary.curriculum[curriculum].scoreEarned += earned;

                // Content
                summary.content[content].totalPossible += difficulty;
                summary.content[content].scoreEarned += earned;

                // Standard.Objective — lookup from xpData
                const raw = xpData.find(r =>
                    r.question_id === task_key &&
                    r.content_id === content &&
                    r.curriculum_id === curriculum
                );
                const soKey = raw ? `${raw.standard}.${raw.objective}` : "0.0";

                if (!summary.standardObjective[content][soKey]) {
                    summary.standardObjective[content][soKey] = { scoreEarned: 0, totalPossible: 0, percent: 0 };
                }

                summary.standardObjective[content][soKey].scoreEarned += earned;
            }
        }
    }

    // Step 3: Fill in totalPossible for standardObjective
    for (const content in summary.standardObjective) {
        for (const soKey in summary.standardObjective[content]) {
            summary.standardObjective[content][soKey].totalPossible =
                (standardObjectiveXP[content] && standardObjectiveXP[content][soKey]) || 0;
        }
    }

    // Step 4: Compute percentages
    function computePercentage(group) {
        group.percent = group.totalPossible > 0
            ? (group.scoreEarned / group.totalPossible) * 100
            : 0;
    }

    computePercentage(summary.overall);
    Object.values(summary.content).forEach(computePercentage);
    Object.values(summary.curriculum).forEach(computePercentage);
    Object.values(summary.standardObjective).forEach(soGroup =>
        Object.values(soGroup).forEach(computePercentage)
    );

    // Set global values
    totalXP = summary.overall.scoreEarned;
    xpScore = summary.overall.percent;

    return summary;
}

//-----------------------------------------------------------------------------------------------------------------

async function fetchStudentDashboardData(studentName) {
    const lastUpdate = "1970-01-01";
    const params = new URLSearchParams({
        lastUpdate: lastUpdate,
        xpUsername: studentName
    });

    try {
        const response = await fetch(`/get_student_profile?${params.toString()}`);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error("Fetch error:", error);
        return null;
    }
}

//-----------------------------------------------------------------------------------------------------------------

// Function to fetch user content/curriculum/question assignments and create global variables
async function setupDashboardSession(studentName) {
    const data = await fetchStudentDashboardData(studentName);
    if (!data) return;

    const rawAssignments = data.userAssignments || {};
    studentAssignments = {};
    curriculumXP = {};
    standardObjectiveXP = {};
    tagSummary = {};
    curriculumOrderMap = data.curriculumOrderMap || {};
    questionDifficultyMap = {};

    for (const content in rawAssignments) {
        studentAssignments[content] = {};
        standardObjectiveXP[content] = {};
        if (!tagSummary[content]) tagSummary[content] = {};

        for (const curriculum in rawAssignments[content]) {
            const details = rawAssignments[content][curriculum];
            studentAssignments[content][curriculum] = details.map(item => item.task_key);
            curriculumXP[curriculum] = 0;

            details.forEach(item => {
                const xp = item.difficulty / 3;
                questionDifficultyMap[item.task_key] = item.difficulty;
                curriculumXP[curriculum] += xp;

                const soKey = `${item.standard}.${item.objective}`;
                standardObjectiveXP[content][soKey] = (standardObjectiveXP[content][soKey] || 0) + xp;

                if (item.tags && Array.isArray(item.tags)) {
                    item.tags.forEach(tag => {
                        if (!tagSummary[content][tag]) {
                            tagSummary[content][tag] = { questions: new Set(), totalDifficulty: 0 };
                        }
                        tagSummary[content][tag].questions.add(item.task_key);
                        tagSummary[content][tag].totalDifficulty += item.difficulty;
                    });
                }
            });
        }
    }

    // If there's no XP data, forcibly zero out all tag percent values
    if (xpData.length === 0) {
        for (const content in tagSummary) {
            for (const tag in tagSummary[content]) {
                const tagObj = tagSummary[content][tag];
                tagSummary[content][tag] = {
                    questions: Array.from(tagObj.questions),
                    potentialXP: tagObj.totalDifficulty / 3,
                    percent: 0
                };
            }
        }
        return;
    }

    // Flatten tagSummary and calculate % scores based on actual XP data
    xpData = data.xpData || [];
    currentContent = data.currentContent || null;

    for (const content in tagSummary) {
        for (const tag in tagSummary[content]) {
            const tagObj = tagSummary[content][tag];
            const questions = Array.from(tagObj.questions);
            const possibleXP = tagObj.totalDifficulty / 3;

            let earnedXP = 0;
            const seen = {};
            xpData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            for (const record of xpData) {
                if (!questions.includes(record.question_id)) continue;
                if (seen[record.question_id] === 'full') continue;

                if (record.dXP > 0) {
                    if (seen[record.question_id] === 'recovery') {
                        earnedXP += 0.001 * (questionDifficultyMap[record.question_id] || 0);
                        seen[record.question_id] = 'full';
                    } else if (seen[record.question_id] === 'fail') {
                        earnedXP += 0.5 * (questionDifficultyMap[record.question_id] || 0) / 3;
                        seen[record.question_id] = 'recovery';
                    } else {
                        earnedXP += (questionDifficultyMap[record.question_id] || 0) / 3;
                        seen[record.question_id] = 'full';
                    }
                } else if (record.dXP < 0 && !seen[record.question_id]) {
                    seen[record.question_id] = 'fail';
                }
            }

            tagSummary[content][tag] = {
                questions,
                potentialXP: possibleXP,
                percent: possibleXP > 0 ? (earnedXP / possibleXP) * 100 : 0
            };
        }
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

//-----------------------------------------------------------------------------------------------------------------

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

  // Retrieve KPI summary data
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

function renderTagPerformancePanel(content, filterCurriculum = null) {
  // Always ensure the tag panel exists and is cleared
  let tagPanel = document.getElementById("tag-panel");
  if (!tagPanel) {
    tagPanel = document.createElement("div");
    tagPanel.id = "tag-panel";
    tagPanel.style.margin = "20px auto";
    tagPanel.style.maxWidth = "1200px";
    tagPanel.style.color = "white";
    document.body.appendChild(tagPanel);
  }

  // Always clear previous content before proceeding
  tagPanel.innerHTML = `<h4>${content} - Skill Acquisition Map${filterCurriculum ? ` (${filterCurriculum})` : ""}</h4>`;

  // If there's no tag data for the selected content, exit early
  if (!tagSummary[content]) return;

  const assignments = studentAssignments || {};
  let allowedQuestions = null;
  if (filterCurriculum && assignments[content]?.[filterCurriculum]) {
    allowedQuestions = new Set(assignments[content][filterCurriculum]);
  }

  // Gather all questions for performance lookup
  let allQuestions = [];
  Object.values(assignments[content] || {}).forEach(qList => {
    allQuestions = allQuestions.concat(qList);
  });

  const { correctAnswers, incorrectAnswers } = processPriorAnswers(xpData, allQuestions);
  const correctSet = new Set(correctAnswers);
  const incorrectSet = new Set(incorrectAnswers);

  const tagList = Object.entries(tagSummary[content]).sort(([a], [b]) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const testSpan = document.createElement("span");
  testSpan.style.visibility = "hidden";
  testSpan.style.position = "absolute";
  testSpan.style.fontWeight = "bold";
  document.body.appendChild(testSpan);

  let maxLabelWidth = 100;
  tagList.forEach(([tag]) => {
    testSpan.textContent = tag;
    const width = testSpan.offsetWidth;
    if (width > maxLabelWidth) maxLabelWidth = width;
  });
  document.body.removeChild(testSpan);

  tagList.forEach(([tag, info]) => {
    const filteredQuestions = allowedQuestions
      ? info.questions.filter(task_id => allowedQuestions.has(task_id))
      : info.questions;

    // Always render the row, even if there's no performance data
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.flexWrap = "nowrap";
    row.style.whiteSpace = "nowrap";
    row.style.marginBottom = "8px";
    row.style.gap = "0px";

    const label = document.createElement("div");
    const tagData = tagSummary[content][tag];
    label.textContent = tag;

    // Add percent badge (even if 0)
    const percent = typeof tagData.percent === 'number' ? tagData.percent : 0;
    const scoreSpan = document.createElement("span");
    scoreSpan.textContent = `${percent.toFixed(0)}%`;
    scoreSpan.style.minWidth = "30px";
    scoreSpan.style.display = "inline-block";
    scoreSpan.style.marginLeft = "6px";
    scoreSpan.style.padding = "2px 4px";
    scoreSpan.style.borderRadius = "4px";
    scoreSpan.style.fontSize = "0.75em";
    scoreSpan.style.fontWeight = "bold";
    scoreSpan.style.color = "black";
    scoreSpan.style.backgroundColor =
      percent > 70 ? "green" :
      percent >= 50 ? "yellow" :
      "red";

    label.appendChild(scoreSpan);
    label.style.width = `${maxLabelWidth + 50}px`;
    label.style.fontWeight = "bold";
    label.style.textAlign = "right";
    label.style.marginRight = "10px";
    label.style.justifyContent = "flex-end";
    label.style.display = "flex";
    label.style.alignItems = "center";
    row.appendChild(label);

    filteredQuestions.forEach(task_id => {
      const box = document.createElement("div");
      box.style.width = "16px";
      box.style.height = "16px";
      box.style.borderRadius = "2px";
      box.style.cursor = "pointer";

      const isCorrect = correctSet.has(task_id);
      const isIncorrect = incorrectSet.has(task_id);

      if (isCorrect && isIncorrect) {
        box.style.backgroundColor = "yellow";
      } else if (isCorrect) {
        box.style.backgroundColor = "green";
      } else if (isIncorrect) {
        box.style.backgroundColor = "red";
      } else {
        box.style.backgroundColor = "gray";
      }

      box.title = task_id;
      box.className = "tag-box";

      box.addEventListener("click", () => {
        for (let contentKey in assignments) {
          for (let curriculum in assignments[contentKey]) {
            if (assignments[contentKey][curriculum].includes(task_id)) {
              currentCurriculum = curriculum;
              currentQuestionId = task_id;
              window.location.href = "testprep";
              return;
            }
          }
        }
      });

      row.appendChild(box);
    });

    tagPanel.appendChild(row);
  });
}

//-----------------------------------------------------------------------------------------------------------------

// Function to load the kpi panel with content related to session curriculumId
function loadKpiPanelFromCurrentCurriculum() {
  if (currentCurriculum) {
    let foundContent = null;
    for (let content in studentAssignments) {
      if (studentAssignments[content].hasOwnProperty(currentCurriculum)) {
        foundContent = content;
        break;
      }
    }
    if (foundContent) {
      renderKPIPanel(foundContent);
      renderTagPerformancePanel(foundContent);  // <-- Add this line
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
  const correctAnswersSet = new Set();
  const incorrectAnswersSet = new Set();

  xpData.forEach(record => {
    if (questions.includes(record.question_id)) {
      if (record.dXP > 0) {
        correctAnswersSet.add(record.question_id);
      } else if (record.dXP < 0) {
        incorrectAnswersSet.add(record.question_id);
      }
    }
  });

  return {
    correctAnswers: [...correctAnswersSet],
    incorrectAnswers: [...incorrectAnswersSet]
  };
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
    
    // Add click event to filter tag panel when a curriculum is selected
    document.getElementById('radar').on('plotly_click', function(eventData) {
      const point = eventData?.points?.[0];
      const curriculumId = point?.theta;
    
      if (curriculumId) {
        renderTagPerformancePanel(currentContent, curriculumId);
      } else {
        renderTagPerformancePanel(currentContent); // fallback to all tags
      }
    });
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
    // Extract curriculum keys
    const curriculumKeys = curriculumOrderMap[content] || Object.keys(curricula);

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
    
    document.getElementById('radar').on('plotly_click', function(eventData) {
      if (!eventData?.points?.length) {
        renderTagPerformancePanel(currentContent); // Reset to all tags
        return;
      }
    
      const point = eventData.points[0];
      const curriculumId = point?.theta;
      if (curriculumId) {
        renderTagPerformancePanel(currentContent, curriculumId); // Filtered view
      }
    });
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
    renderKPIPanel(currentContent);
    renderTagPerformancePanel(currentContent);
    console.log("Processing XP");
    await processXP();
    console.log("Calculating all curriculums status");
    completedCurriculums = identifyCompletedCurriculums();
    console.log("Drawing KPI Charts");
    //loadKpiPanelFromCurrentCurriculum();
    console.log("Drawing KPI Charts");
    loadKpiPanelFromCurrentCurriculum();    
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

