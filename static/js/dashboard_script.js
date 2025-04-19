let totalXP = 0;
let xpLevel = "Beginner";
let xpScore = 0;
let xpCompletion = 0;
let myAssignments;
let myContent;
let myCurriculums;
window.standardsData = {}

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

function calculateKPIs(xpData) {
    // Retrieve potential XP data from localStorage.
    const curriculumXPFromStorage = JSON.parse(localStorage.getItem('curriculumXP')) || {};
    const standardObjectiveXPFromStorage = JSON.parse(localStorage.getItem('standardObjectiveXP')) || {};

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
    const assignments = JSON.parse(sessionStorage.getItem('studentAssignments')) || {};
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

// This function gets all data needed for dashboard from server
async function fetchDashboardData() {
    let lastUpdate = localStorage.getItem("xpLastFetchedDatetime") || "1970-01-01";
    let xpUsername = localStorage.getItem("xpUsername") || "default_xpusername";
    const username = sessionStorage.getItem("username") || "default_username";

    if (xpUsername !== username) {
        console.log("NEW USER ALERT!");
        localStorage.setItem("xpLastFetchedDatetime", "1970-01-01");
        localStorage.setItem("xpUsername", username);
        localStorage.removeItem("xpData");
        xpUsername = username;
        lastUpdate = "1970-01-01";
    }

    const params = new URLSearchParams({ lastUpdate, xpUsername });

    try {
        const response = await fetch(`/get_user_profile?${params.toString()}`);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const data = await response.json();
        return data.data;  // let the calling function unpack .userAssignments, .xpData, etc.
    } catch (error) {
        console.error("Dashboard fetch failed:", error);
        return null;
    }
}

//-----------------------------------------------------------------------------------------------------------------

// Function to fetch user content/curriculum/question assignments and create global variables
// Function will also save the xp history for the student in sessionStorage
async function setupDashboardSession() {
    const data = await fetchDashboardData();
    if (!data) return;

    const rawAssignments = data.userAssignments || {};
    const studentAssignments = {};
    const curriculumXP = {};
    const standardObjectiveXP = {};
    const tagSummary = {};

    for (const content in rawAssignments) {
        studentAssignments[content] = {};
        standardObjectiveXP[content] = {};

        for (const curriculum in rawAssignments[content]) {
            const details = rawAssignments[content][curriculum];
            studentAssignments[content][curriculum] = details.map(item => item.task_key);
            const totalDifficulty = details.reduce((sum, item) => sum + item.difficulty, 0);
            curriculumXP[curriculum] = totalDifficulty / 3;

            details.forEach(item => {
                // Standard/objective XP aggregation
                const soKey = `${item.standard}.${item.objective}`;
                standardObjectiveXP[content][soKey] = (standardObjectiveXP[content][soKey] || 0) + item.difficulty;

                // Tag summary aggregation with content as outer key
                if (item.tags && Array.isArray(item.tags)) {
                  if (!tagSummary[content]) tagSummary[content] = {};
                  
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

    // Convert to XP
    for (const content in standardObjectiveXP) {
        for (const soKey in standardObjectiveXP[content]) {
            standardObjectiveXP[content][soKey] /= 3;
        }
    }

    // Flatten tagSummary questions and convert difficulty to XP
    const finalTagSummary = {};
    for (const content in tagSummary) {
      finalTagSummary[content] = {};
      for (const tag in tagSummary[content]) {
        finalTagSummary[content][tag] = {
          questions: Array.from(tagSummary[content][tag].questions),
          potentialXP: tagSummary[content][tag].totalDifficulty / 3
        };
      }
    }

    // Save to storage
    sessionStorage.setItem('studentAssignments', JSON.stringify(studentAssignments));
    localStorage.setItem('curriculumXP', JSON.stringify(curriculumXP));
    localStorage.setItem('standardObjectiveXP', JSON.stringify(standardObjectiveXP));
    localStorage.setItem('tagSummary', JSON.stringify(finalTagSummary));

    // Merge and save XP data
    if (data.xpData) {
        const existingXP = JSON.parse(localStorage.getItem("xpData")) || [];
        const merged = [...existingXP, ...data.xpData];
        localStorage.setItem("xpData", JSON.stringify(merged));
        localStorage.setItem("xpLastFetchedDatetime", data.xpLastFetchedDatetime);
    }

    localStorage.setItem("xpUsername", data.xpUsername);
}

//-----------------------------------------------------------------------------------------------------------------

function setupTagsData() {

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

  // Retrieve KPI summary data (assumes xpData is in localStorage)
  const xpData = JSON.parse(localStorage.getItem('xpData')) || [];
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
  const assignments = JSON.parse(sessionStorage.getItem("studentAssignments")) || {};
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
  
  document.getElementById('radar').on('plotly_click', function(eventData) {
    const currentContent = sessionStorage.getItem("currentContent");
    if (!currentContent) return;

    // If a curriculum point was clicked
    if (eventData?.points?.length > 0) {
      const point = eventData.points[0];
      const curriculumId = point.theta;

      if (curriculumId) {
        renderTagPerformancePanel(currentContent, curriculumId);
        return;
      }
    }

    // If the click wasn’t on a valid curriculum point, reset to show all tags
    renderTagPerformancePanel(currentContent);
  });


  // --- Draw Historical XP Chart ---
  // Assuming your drawAreaChart() function renders into the xpChart container.
  drawAreaChart();
}

//-----------------------------------------------------------------------------------------------------------------

// Function to render tag-level performance panel below the KPI section
function renderTagPerformancePanel(content, filterCurriculum = null) {
  const tagSummary = JSON.parse(localStorage.getItem("tagSummary")) || {};
  const assignments = JSON.parse(sessionStorage.getItem("studentAssignments")) || {};
  const xpData = JSON.parse(localStorage.getItem("xpData")) || [];

  if (!tagSummary[content]) return; // no tag data for this content

  // If filtering by curriculum, create a set of allowed task_ids
  let allowedQuestions = null;
  if (filterCurriculum && assignments[content]?.[filterCurriculum]) {
    allowedQuestions = new Set(assignments[content][filterCurriculum]);
  }

  // Step 1: Collect all questions in this content area
  let allQuestions = [];
  Object.values(assignments[content] || {}).forEach(qList => {
    allQuestions = allQuestions.concat(qList);
  });

  // Step 2: Use processPriorAnswers to get performance on those questions
  const { correctAnswers, incorrectAnswers } = processPriorAnswers(xpData, allQuestions);
  const correctSet = new Set(correctAnswers);
  const incorrectSet = new Set(incorrectAnswers);

  // Step 3: Create or reuse the tag panel
  let tagPanel = document.getElementById("tag-panel");
  if (!tagPanel) {
    tagPanel = document.createElement("div");
    tagPanel.id = "tag-panel";
    tagPanel.style.margin = "20px auto";
    tagPanel.style.maxWidth = "1200px";
    tagPanel.style.color = "white";
    document.body.appendChild(tagPanel);
  }
  
  // Set the title dynamically
  tagPanel.innerHTML = `<h4>${content} - Skill Acquisition Map${filterCurriculum ? `: ${filterCurriculum}` : ''}</h4>`;
  // Remove any existing tag rows
  document.querySelectorAll(".tag-row").forEach(el => el.remove());

  

  const tagList = Object.entries(tagSummary[content]).sort(([a], [b]) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // Step 4: Measure longest label width
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

  // Step 5: Draw each tag line with colored blocks
  tagList.forEach(([tag, info]) => {
    // If filtering, exclude tags that don't have any matching questions
    const filteredQuestions = allowedQuestions
      ? info.questions.filter(task_id => allowedQuestions.has(task_id))
      : info.questions;

    if (filteredQuestions.length === 0) return; // skip this tag if no questions match

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.marginBottom = "8px";
    row.style.gap = "0px";

    // Tag label
    const label = document.createElement("div");
    label.textContent = tag;
    label.style.width = `${maxLabelWidth + 10}px`;
    label.style.fontWeight = "bold";
    label.style.textAlign = "right";
    label.style.marginRight = "10px";
    label.className = "tag-label";
    row.appendChild(label);

    // Each question block
    filteredQuestions.forEach(task_id => {
      const box = document.createElement("div");
      box.style.width = "16px";
      box.style.height = "16px";
      box.style.borderRadius = "2px";
      box.style.cursor = "pointer";
      box.className = "tag-box";

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

      // Clicking the box navigates to the question
      box.addEventListener("click", () => {
        for (let contentKey in assignments) {
          for (let curriculum in assignments[contentKey]) {
            if (assignments[contentKey][curriculum].includes(task_id)) {
              sessionStorage.setItem("currentContent", contentKey);
              sessionStorage.setItem("currentCurriculum", curriculum);
              sessionStorage.setItem("currentQuestionId", task_id);
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
  const currentCurriculum = sessionStorage.getItem('currentCurriculum');
  if (currentCurriculum) {
    const assignments = JSON.parse(sessionStorage.getItem("studentAssignments"));
    let foundContent = null;

    // Find which content includes the current curriculum
    for (let content in assignments) {
      if (assignments[content].hasOwnProperty(currentCurriculum)) {
        foundContent = content;
        break;
      }
    }

    if (foundContent) {
      renderKPIPanel(foundContent);
      renderTagPerformancePanel(foundContent);  // ← Add this line to draw tags panel too
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
        correctAnswers: Array.from(correctAnswersSet),
        incorrectAnswers: Array.from(incorrectAnswersSet)
    };
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
  const assignments = JSON.parse(sessionStorage.getItem("studentAssignments"));
  const xpData = JSON.parse(localStorage.getItem("xpData")) || [];
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
    if (summary.content[content]) {
      contentScore = ` (${summary.content[content].percent.toFixed(0)}%)`;
    }
    title.textContent = content + contentScore;
    
    // When clicking on the content title, load the KPI panel for that content.
    title.addEventListener("click", () => {
      sessionStorage.setItem("currentContent", content);
      renderKPIPanel(content);
      renderTagPerformancePanel(content);
    });
    row.appendChild(title);

    const curricula = assignments[content];
    // Extract curriculum keys and sort them naturally.
    const curriculumKeys = Object.keys(curricula).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    const completed = JSON.parse(sessionStorage.getItem("completedCurriculums")) || [];
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
      box.style.cursor = "pointer";
      box.style.padding = "8px 1px";
      box.style.borderRadius = "4px";
      // (The margin styling "px 0" doesn't have any effect; you may want to adjust that if needed.)
      
      box.addEventListener("click", () => {
        sessionStorage.setItem("currentCurriculum", curriculum);
        const questions = assignments[content][curriculum];
      
        const xpData = JSON.parse(localStorage.getItem("xpData")) || [];
        const { correctAnswers, incorrectAnswers } = processPriorAnswers(xpData, questions);
      
        sessionStorage.setItem("correctAnswers", JSON.stringify(correctAnswers));
        sessionStorage.setItem("incorrectAnswers", JSON.stringify(incorrectAnswers));
      
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
    await loadStandardsData();
    console.log("Processing XP")
    processXP();
    console.log("Calculating all curriculums status")
    identifyCompletedCurriculums();
    console.log("Drawing KPI Charts")
    loadKpiPanelFromCurrentCurriculum();
    console.log("Displaying KPI Summary")
    displayKPIData();
}

//--------------------------------------------------------------------------------------

// Things to do after DOM load
document.addEventListener("DOMContentLoaded", async function() {
    console.log("Initializing Page");
    await initializePage();
    console.log("Rendering Content Panel");
    renderContentPanel();
    console.log("Calculating Key Performance Indicators");
    console.log(calculateKPIs(JSON.parse(localStorage.getItem('xpData'))));
});



//-----------------------------------------------------------------------------------------------------------------
// Prepare data items on page load
window.onload = function() {
    //initializePage();
};

//-----------------------------------------------------------------------------------------------------------------

