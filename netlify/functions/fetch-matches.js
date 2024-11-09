const axios = require('axios');
//direct changes to github
exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get the endpoint from the querystring
    const { endpoint } = event.queryStringParameters || {};
    
    if (!endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Endpoint parameter is required' })
      };
    }

    console.log('Making request to:', `https://api.football-data.org/v4/${endpoint}`);
    
    // Make the request to football-data.org
    const response = await axios.get(`https://api.football-data.org/v4/${endpoint}`, {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_API_KEY
      }
    });

    console.log('Response received:', response.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : null
    });

    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch data',
        details: error.message,
        response: error.response?.data
      })
    };
  }
};
