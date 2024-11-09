
// Constants for the leagues
const LEAGUES = {
    PL: 'Premier League',
    PD: 'La Liga',
    BL1: 'Bundesliga',
    SA: 'Serie A',
    FL1: 'Ligue 1',
    CL: 'Champions League',
    ELC: 'Championship',
    PPL: 'Primeira Liga',
    DED: 'Eredivisie',
    BSA: 'Serie A Brazil'
};

// Cache functions to store data locally
function getCachedData(key) {
    try {
        const cached = localStorage.getItem(key);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            // Cache valid for 1 hour (3600000 milliseconds)
            if (Date.now() - timestamp < 3600000) {
                console.log('Found valid cache for:', key);
                return data;
            }
            console.log('Cache expired for:', key);
            localStorage.removeItem(key);
        }
    } catch (error) {
        console.error('Cache error:', error);
        localStorage.clear();
    }
    return null;
}

function setCachedData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        console.log('Data cached for:', key);
    } catch (error) {
        console.error('Caching error:', error);
    }
}

// Function to generate date range for the slider (7 days before and after today)
function getDateRange() {
    const dates = [];
    const today = new Date();
    for (let i = -7; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date);
    }
    return dates;
}

// Date formatting functions
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDisplayDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Initialize the date slider with clickable dates
function initializeDateSlider() {
    console.log('Initializing date slider');
    const dateSlider = document.getElementById('dateSlider');
    
    if (!dateSlider) {
        console.error('Date slider element not found!');
        return;
    }

    const dates = getDateRange();
    const today = new Date().toISOString().split('T')[0];

    dateSlider.innerHTML = '';

    dates.forEach(date => {
        const dateBtn = document.createElement('button');
        dateBtn.className = 'date-btn';
        dateBtn.dataset.date = formatDate(date);
        dateBtn.textContent = formatDisplayDate(date);
        
        if (formatDate(date) === today) {
            dateBtn.classList.add('active');
            dateBtn.textContent = 'Today';
        }
        
        dateBtn.addEventListener('click', () => {
            document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
            dateBtn.classList.add('active');
            fetchMatches(dateBtn.dataset.date);
        });
        
        dateSlider.appendChild(dateBtn);
    });
}

// Initialize navigation buttons for date slider
function initializeNavButtons() {
    console.log('Initializing navigation buttons');
    const prevBtn = document.getElementById('prevDate');
    const nextBtn = document.getElementById('nextDate');
    const slider = document.getElementById('dateSlider');
    
    if (!prevBtn || !nextBtn || !slider) {
        console.error('Navigation buttons or slider not found!');
        return;
    }

    prevBtn.addEventListener('click', () => {
        slider.scrollBy({ left: -200, behavior: 'smooth' });
    });
    
    nextBtn.addEventListener('click', () => {
        slider.scrollBy({ left: 200, behavior: 'smooth' });
    });
}

// Main function to fetch matches from the API
async function fetchMatches(date) {
    console.log('Starting to fetch matches for date:', date);
    const container = document.querySelector('.matches-container');
    container.innerHTML = '<div class="loading">Loading matches...</div>';

    const selectedLeague = document.getElementById('leagueSelect').value;
    const cacheKey = `${selectedLeague}-${date}`;

    try {
        // Check cache first
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
            console.log('Serving from cache for:', cacheKey);
            displayMatches(cachedData);
            return;
        }

        console.log('Making API request...');
        
        // Use Netlify function
        const endpoint = `competitions/${selectedLeague}/matches?dateFrom=${date}&dateTo=${date}`;
        const response = await fetch(`/.netlify/functions/fetch-matches?endpoint=${encodeURIComponent(endpoint)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        if (data.matches && Array.isArray(data.matches)) {
            console.log(`Found ${data.matches.length} matches for date:`, date);
            setCachedData(cacheKey, data.matches);
            displayMatches(data.matches);
        } else {
            console.log('No matches array in response:', data);
            container.innerHTML = '<div class="no-matches">No matches scheduled for this date</div>';
        }

    } catch (error) {
        console.error('Error fetching matches:', error);
        container.innerHTML = `<div class="error">
            <p>Error loading matches: ${error.message}</p>
            <p><small>Date: ${date}</small></p>
            <p><small>League: ${LEAGUES[selectedLeague]}</small></p>
        </div>`;
    }
}

// Function to display matches in the UI
function displayMatches(matches) {
    console.log('Displaying matches:', matches);
    const container = document.querySelector('.matches-container');
    
    if (!matches || matches.length === 0) {
        console.log('No matches found');
        container.innerHTML = '<div class="no-matches">No matches scheduled for this date</div>';
        return;
    }
    
    const matchesHTML = matches.map(match => `
        <div class="match-card">
            <div class="competition">
                <img src="${match.competition.emblem}" alt="${match.competition.name}" class="competition-logo">
                ${match.competition.name}
            </div>
            <div class="match-time">
                ${new Date(match.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div class="match-content">
                <div class="team-container home-team">
                    <img src="${match.homeTeam.crest}" alt="${match.homeTeam.shortName}" class="team-logo">
                    <span class="team-name">${match.homeTeam.shortName || match.homeTeam.name}</span>
                    <span class="score">${match.score.fullTime.home ?? '-'}</span>
                </div>
                <div class="score-divider">-</div>
                <div class="team-container away-team">
                    <span class="score">${match.score.fullTime.away ?? '-'}</span>
                    <span class="team-name">${match.awayTeam.shortName || match.awayTeam.name}</span>
                    <img src="${match.awayTeam.crest}" alt="${match.awayTeam.shortName}" class="team-logo">
                </div>
            </div>
            <div class="match-status">${getMatchStatus(match.status)}</div>
        </div>
    `).join('');
    
    container.innerHTML = matchesHTML;
}

// Function to convert API status codes to display text
function getMatchStatus(status) {
    const statusMap = {
        SCHEDULED: 'Not Started',
        LIVE: 'LIVE',
        IN_PLAY: 'LIVE',
        PAUSED: 'Half Time',
        FINISHED: 'Full Time',
        POSTPONED: 'Postponed',
        CANCELLED: 'Cancelled',
        SUSPENDED: 'Suspended'
    };
    return statusMap[status] || status;
}

// Event listener for league selection
document.getElementById('leagueSelect').addEventListener('change', (e) => {
    const selectedDate = document.querySelector('.date-btn.active')?.dataset.date || new Date().toISOString().split('T')[0];
    fetchMatches(selectedDate);
});

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded - initializing components');
    initializeDateSlider();
    initializeNavButtons();
    const today = new Date().toISOString().split('T')[0];
    fetchMatches(today);
});
