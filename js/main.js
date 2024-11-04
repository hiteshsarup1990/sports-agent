const API_KEY = '53c71f8053f145e29f1daf2fbeb355b0';

// Cache for storing match data
const matchesCache = new Map();

// Updated leagues list based on football-data.org competition codes
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

function getCachedData(key) {
    try {
        const cached = localStorage.getItem(key);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 3600000) {
                console.log('Found valid cache for:', key);
                return data;
            } else {
                console.log('Cache expired for:', key);
                localStorage.removeItem(key);
            }
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

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDisplayDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

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

async function fetchMatches(date) {
    console.log('Starting to fetch matches for date:', date);
    const container = document.querySelector('.matches-container');
    container.innerHTML = '<div class="loading">Loading matches...</div>';

    // Define cacheKey here
    const cacheKey = `PL-${date}`;  // Simplified cache key for Premier League

    try {
        // Check cache first
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
            console.log('Serving from cache for:', cacheKey);
            displayMatches(cachedData);
            return;
        }

        console.log('Making API request...');
        
        // Use the exact endpoint that worked in Postman
        let baseUrl = `https://api.football-data.org/v4/competitions/PL/matches`;
        
        const params = new URLSearchParams({
            dateFrom: date,
            dateTo: date
        });

        baseUrl = `${baseUrl}?${params.toString()}`;
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const url = proxyUrl + baseUrl;

        console.log('Full Request URL:', url);
        
        const response = await fetch(url, {
            method: 'GET', // explicitly specify method
            headers: {
                'X-Auth-Token': API_KEY,
                'Origin': 'http://localhost:5500',
                'Accept': 'application/json' // add Accept header
            }
        });

        console.log('Response Status:', response.status);

        // Log the raw response
        const rawResponse = await response.text();
        console.log('Raw Response:', rawResponse);

        // Parse the response
        const data = JSON.parse(rawResponse);
        console.log('Parsed API Response:', data);

        if (data.matches && Array.isArray(data.matches)) {
            console.log(`Found ${data.matches.length} matches for date:`, date);
            matchesCache.set(cacheKey, data.matches);
            displayMatches(data.matches);
        } else {
            console.log('No matches array in response:', data);
            container.innerHTML = '<div class="no-matches">No matches scheduled for this date</div>';
        }

    } catch (error) {
        console.error('Detailed Error Information:', {
            message: error.message,
            stack: error.stack,
            type: error.name
        });
        container.innerHTML = `<div class="error">
            <p>Error loading matches: ${error.message}</p>
            <p><small>Date: ${date}</small></p>
            <p><small>League: Premier League</small></p>
        </div>`;
    }
}
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

// League selection handler
document.getElementById('leagueSelect').addEventListener('change', (e) => {
    const selectedDate = document.querySelector('.date-btn.active')?.dataset.date || new Date().toISOString().split('T')[0];
    fetchMatches(selectedDate);
});

// Single initialization point
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded - initializing components');
    initializeDateSlider();
    initializeNavButtons();
    const today = new Date().toISOString().split('T')[0];
    fetchMatches(today);
});