let totalXP = 0;
let xpLevel = "Beginner";
let xpScore = 0;
let xpCompletion = 0;

//-----------------------------------------------------------------------------------------------------------------
// Function to initialize or check xp_last_fetched_datetime in localStorage
function checkAndInitializeLastFetchedDatetime() {
    let lastFetchedDatetime = localStorage.getItem('xpLastFetchedDatetime');
    if (!lastFetchedDatetime) {
        localStorage.setItem('xpLastFetchedDatetime', new Date('1970-01-01T00:00:00.000Z').toISOString());
        console.log("No previous XP data found. Initializing with placeholder datetime.");
    } else {
        console.log("Last fetched datetime:", lastFetchedDatetime);
    }
}

//-----------------------------------------------------------------------------------------------------------------
// Function to fetch historical XP data if not updated
async function fetchXPData() {
    let lastFetchedDatetime = localStorage.getItem("xpLastFetchedDatetime");

    try {
        const response = await fetch('/get_xp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastFetchedDatetime })
        });

        const data = await response.json();

        if (data.xpData) {
            localStorage.setItem("xpData", JSON.stringify(data.xpData));
            localStorage.setItem("xpLastFetchedDatetime", data.mostRecentDatetime);
            console.log("XP Data updated and stored.");
        } else {
            console.log("No XP Data update needed.");
        }
    } catch (error) {
        console.error('Error fetching XP data:', error);
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

    console.log("Total Earned:", totalEarned);
    console.log("Total Possible", totalPossible);
    console.log("xpScore:", xpScore);
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

    xpData.forEach(record => {
        const { curriculum_id, dXP, timestamp } = record;

        if (!cumulativeData[curriculum_id]) {
            cumulativeData[curriculum_id] = 0;
            seriesData[curriculum_id] = { x: [], y: [] };
        }

        cumulativeData[curriculum_id] += dXP;
        cumulativeTotal += dXP;

        seriesData[curriculum_id].x.push(new Date(timestamp));
        seriesData[curriculum_id].y.push(cumulativeData[curriculum_id]);

        totalXPSeries.x.push(new Date(timestamp));
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
        xaxis: { title: 'Time', type: 'date', tickformat: '%d/%m %H:%M', color: 'white', gridcolor: 'rgba(255, 255, 255, 0.2)' },
        yaxis: { title: 'XP', rangemode: 'tozero', color: 'white', gridcolor: 'rgba(255, 255, 255, 0.2)' },
        paper_bgcolor: 'black',
        plot_bgcolor: 'black',
        showlegend: true,
        legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.2, font: { color: 'white' } }
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
    checkAndInitializeLastFetchedDatetime();
    await fetchXPData();
    processXP();
    displayKPIData();
    drawAreaChart();
}

//-----------------------------------------------------------------------------------------------------------------
// Prepare data items on page load
window.onload = function() {
    initializePage();
};
