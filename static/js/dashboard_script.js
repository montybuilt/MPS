let totalXP = 0;
let xpLevel = "Beginner";
let xpScore = 0;
let xpCompletion = 0;

function test(){}

//-----------------------------------------------------------------------------------------------------------------

// Function to initialize or check xp_last_fetched_datetime in localStorage
function checkAndInitializeLastFetchedDatetime() {
    // Check if xp_last_fetched_datetime exists in localStorage
    let lastFetchedDatetime = localStorage.getItem('xpLastFetchedDatetime');

    // If it doesn't exist, initialize it with a placeholder value
    if (!lastFetchedDatetime) {
        // You could use a placeholder like null or a very old date
        //localStorage.setItem('xpLastFetchedDatetime', '1970-01-01 00:00:00.000000');
        localStorage.setItem('xpLastFetchedDatetime', new Date('1970-01-01 00:00:00.000000').toISOString());
        console.log("No previous XP data found. Initializing with placeholder datetime.");
    } else {
        console.log("Last fetched datetime:", lastFetchedDatetime);
    }
}

//-----------------------------------------------------------------------------------------------------------------

// Function to fetch historical xp data if not updated
function fetchXPData() {
    // Get the lastFetchedDatetime from localStorage
    let lastFetchedDatetime = localStorage.getItem("xpLastFetchedDatetime");

    // Fetch the XP data from the server with the lastFetchedDatetime
    fetch('/get_xp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lastFetchedDatetime: lastFetchedDatetime })
    })
    .then(response => response.json())
    .then(data => {
        if (data.xpData) {
            // If new data is returned, update localStorage
            localStorage.setItem("xpData", JSON.stringify(data.xpData)); // Save the XP data
            localStorage.setItem("xpLastFetchedDatetime", data.mostRecentDatetime); // Save the latest datetime
            console.log("XP Data updated and stored.");
        } else {
            // If no new data is returned, log that the data is up to date
            console.log("No XP Data update needed.");
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}


//-----------------------------------------------------------------------------------------------------------------

// Function to process all cross-sectional xp related data

function processXP(){
    const xpDict = JSON.parse(sessionStorage.getItem('xp'));
    const contentScores = JSON.parse(sessionStorage.getItem('contentScores'))
    
    // Extract total XP
    totalXP = xpDict['overallXP'];
    console.log("Total XP:", totalXP);
    
    // Algorithm to calculate xpLevel
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
    
    // Algorithm to calculate xpScore
    let totalEarned = 0;
    let totalPossible = 0;
    
    for (let content in contentScores) {
        totalEarned += contentScores[content]['Earned'];
        totalPossible += contentScores[content]['Possible'];
        xpScore = totalEarned / totalPossible;
    };
    
    console.log("xpScore:", xpScore);
}

//-----------------------------------------------------------------------------------------------------------------

// Function to retrieve and process xpData
function getXPDataForChart() {
    const xpData = JSON.parse(localStorage.getItem('xpData')) || [];
    
    // Sort the xp data on timestamp
    xpData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Create the cumulative xp series for each curriculum_id
    const seriesData = {};
    const cumulativeData = {};
    xpData.forEach(record => {
        const { curriculum_id, dXP, timestamp } = record;
        
        if (!seriesData[curriculum_id]) {
            seriesData[curriculum_id] = { x: [], y: []};
            cumulativeData[curriculum_id] = 0;
        }
        
        cumulativeData[curriculum_id] += dXP;
        seriesData[curriculum_id].x.push(new Date(timestamp));
        seriesData[curriculum_id].y.push(cumulativeData[curriculum_id]);
    });
    
    // Create the cumulative totalXP series
    const totalXPSeries = { x: [], y: []};
    let cumulativeTotal = 0;
    
    xpData.forEach(record => {
        cumulativeTotal += record.dXP;
        totalXPSeries.x.push(new Date(record.timestamp));
        totalXPSeries.y.push(cumulativeTotal);
    });
    
    return [seriesData, totalXPSeries];
}

//-----------------------------------------------------------------------------------------------------------------

// Function to draw the line chart
function drawLineChart() {
    const [seriesData, totalXPSeries] = getXPDataForChart();
    
    const data = Object.keys(seriesData).map(curriculum_id => ({
        x: seriesData[curriculum_id].x,
        y: seriesData[curriculum_id].y,
        mode: 'lines',
        name: curriculum_id
    }));

    // Add totalXP series
    data.push({
        x: totalXPSeries.x,
        y: totalXPSeries.y,
        mode: 'lines',
        name: 'Total XP',
        yaxis: 'y2' // Use secondary y-axis
    });

    const layout = {
        title: 'XP Accumulation Over Time',
        xaxis: { title: 'Time', type: 'date', tickformat: '%d/%m %H:%M' },
        yaxis: { title: 'Curriculum XP' },
        yaxis2: {
            title: 'Total XP',
            overlaying: 'y',
            side: 'right'
        },
        showlegend: true
    };

    Plotly.newPlot('xpChart', data, layout);
}

// Ensure the chart is drawn when the page loads
window.onload = function() {
    checkAndInitializeLastFetchedDatetime();
    fetchXPData();
    processXP();
    displayKPIData();
    drawLineChart(); // Draw the chart on page load
}



//-----------------------------------------------------------------------------------------------------------------

// Update DOM elements with conditional styling
function updateKPI(id, value, condition) {
    const element = document.getElementById(id);
    element.textContent = value;

    // Apply conditional styling
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

// Function to display KPI data with conditional styling
function displayKPIData() {
    updateKPI('total-xp', totalXP.toFixed(1), xpLevel);
    updateKPI('xp-level', xpLevel, xpLevel);
    updateKPI('xp-score', (xpScore * 100).toFixed(0) + '%', xpLevel);
}

//-----------------------------------------------------------------------------------------------------------------

// Prepare data items on page load
window.onload = function() {
    // Call the function on page load to initialize if necessary
    checkAndInitializeLastFetchedDatetime();
    fetchXPData();
    processXP();
    displayKPIData();
    drawLineChart();
}



