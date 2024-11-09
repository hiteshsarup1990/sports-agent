const axios = require('axios');

exports.handler = async function(event, context) {
  try {
    // Get parameters from query string
    const { date } = event.queryStringParameters;
    
    // Call football-data API
    const response = await axios({
      url: `https://api.football-data.org/v4/competitions/PL/matches?dateFrom=${date}&dateTo=${date}`,
      method: 'GET',
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_API_KEY
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};