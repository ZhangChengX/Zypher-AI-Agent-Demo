// Weather forecast module and CLI script
// Run with: deno -A weather.ts [zipcode] [days]

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface WeatherData {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  weatherCode: number;
  weatherDescription: string;
}

// Weather code descriptions based on WMO codes
const weatherCodes: { [key: number]: string } = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

/**
 * Convert ZIP code to coordinates using zippopotam.us API
 * @param zipCode - US ZIP code as a string
 * @returns Promise with latitude and longitude coordinates
 */
export async function getCoordinatesFromZip(zipCode: string): Promise<Coordinates> {
  const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch coordinates for ZIP code ${zipCode}`);
  }
  
  const data = await response.json();
  const place = data.places[0];
  
  return {
    lat: parseFloat(place.latitude),
    lon: parseFloat(place.longitude)
  };
}

/**
 * Get weather forecast for a specific future day using Open-Meteo API
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @param nextday - Number of days from today (0 = today, 1 = tomorrow, etc. Max: 16)
 * @returns Promise with weather data for the specified day
 */
export async function getWeather(lat: number, lon: number, nextday: number): Promise<WeatherData> {
  if (nextday < 0 || nextday > 16) {
    throw new Error('nextday must be between 0 and 16 (Open-Meteo free tier limit)');
  }
  
  // Request enough forecast days to cover the requested day
  const forecastDays = nextday + 1;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=${forecastDays}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }
  
  const data = await response.json();
  
  // Get the weather for the specified day
  const weatherCode = data.daily.weather_code[nextday];
  
  return {
    date: data.daily.time[nextday],
    maxTemp: data.daily.temperature_2m_max[nextday],
    minTemp: data.daily.temperature_2m_min[nextday],
    precipitation: data.daily.precipitation_sum[nextday],
    weatherCode: weatherCode,
    weatherDescription: weatherCodes[weatherCode] || 'Unknown'
  };
}

/**
 * Get weather forecast by ZIP code for a specific future day
 * @param zipCode - US ZIP code as a string
 * @param daysAhead - Number of days from today (0 = today, 1 = tomorrow, etc. Max: 16)
 * @returns Promise with weather data for the specified day
 */
export async function getWeatherByZip(zipCode: string, daysAhead: number): Promise<WeatherData> {
  const coords = await getCoordinatesFromZip(zipCode);
  return await getWeather(coords.lat, coords.lon, daysAhead);
}

/**
 * Format weather data into a readable string
 * @param weather - Weather data object
 * @returns Formatted weather information string
 */
export function formatWeather(weather: WeatherData): string {
  return `
Weather Forecast for ${weather.date}
Condition: ${weather.weatherDescription}
High: ${weather.maxTemp}°F
Low: ${weather.minTemp}°F
Precipitation: ${weather.precipitation} mm
Description: ${weather.weatherDescription}
  `.trim();
}

export async function getReadableWeatherByZip(zipCode: string, daysAhead: number): string {
  const weather = await getWeatherByZip(zipCode, daysAhead);
  return formatWeather(weather);
}

// CLI Script execution - only runs when executed directly
if (import.meta.main) {
  const args = Deno.args;
  
  // Default values
  const zipCode = args[0] || '02148';
  const daysAhead = args[1] ? parseInt(args[1]) : 1;
  
  console.log('🌤️  Weather Forecast CLI\n');
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: deno -A weather.ts [zipcode] [days]');
    Deno.exit(0);
  }
  
  try {
    console.log(`Fetching weather for ZIP code ${zipCode} (${daysAhead} day${daysAhead !== 1 ? 's' : ''} from today)...\n`);
    
    // const weather = await getWeatherByZip(zipCode, daysAhead);
    // console.log(formatWeather(weather));

    console.log(await getReadableWeatherByZip(zipCode, daysAhead));
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    Deno.exit(1);
  }
}