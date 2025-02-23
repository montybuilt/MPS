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
    const lastUpdate = localStorage.getItem("xpLastFetchedDatetime") || "1970-01-01";
    const xpUsername = localStorage.getItem("xpUsername") || "default_xpusername";
    const username = sessionStorage.getItem("username") || "default_username";
    
    // Reset the xpData if the current user is not the same as the stored xpData
    if (xpUsername !== username) {
        localStorage.removeItem("xpLastFetchedDatetime");
        localStorage.removeItem("xpUsername");
        localStorage.removeItem("xpData");
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
    const xpDict = JSON.parse(sessionStorage.getItem('xp'));
    const contentScores = JSON.parse(sessionStorage.getItem('contentScores'));
    console.log("Content Scores:", contentScores);

    totalXP = xpDict['overallXP'];
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
// Main initialization function
async function initializePage() {
    await setupDashboardSession();
    processXP();
    displayKPIData();
    drawAreaChart();
}

//-----------------------------------------------------------------------------------------------------------------
// Prepare data items on page load
window.onload = function() {
    initializePage();
};

//-----------------------------------------------------------------------------------------------------------------