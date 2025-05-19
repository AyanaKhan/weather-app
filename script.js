const SUPABASE_URL = 'https://ercxywsruugqapytmaxo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyY3h5d3NydXVncWFweXRtYXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTM4NzgsImV4cCI6MjA2MzE2OTg3OH0.dB8klW3RdZ4qBZBDcuzeJtGA2hvz09HHUATn-XekIfE';

function getWeatherImageUrl(weather) {
  const iconMap = {
    clearday: 'https://www.weatherbit.io/static/img/icons/c01d.png',
    sunnyday: 'https://www.weatherbit.io/static/img/icons/c01d.png',
    pcloudyday: 'https://www.weatherbit.io/static/img/icons/c02d.png',
    cloudynight: 'https://www.weatherbit.io/static/img/icons/c03d.png',
    rainday: 'https://www.weatherbit.io/static/img/icons/r01d.png',
    lightrain: 'https://www.weatherbit.io/static/img/icons/r01d.png',
    showers: 'https://www.weatherbit.io/static/img/icons/r02d.png',
    snow: 'https://www.weatherbit.io/static/img/icons/s01d.png',
    fog: 'https://www.weatherbit.io/static/img/icons/a01d.png',
    thunderstorm: 'https://www.weatherbit.io/static/img/icons/t01d.png'
  };
  const key = weather?.toLowerCase() || 'clear';
  return iconMap[key] || 'https://www.weatherbit.io/static/img/icons/u00d.png'; // default
}

async function logSearchToSupabase(lat, lon) {
  await fetch(`${SUPABASE_URL}/rest/v1/locations`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ latitude: lat, longitude: lon })
  });
}

async function getSearchHistory() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/locations?select=latitude,longitude,searched_at&order=searched_at.desc&limit=5`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  const data = await response.json();
  const historyDiv = document.getElementById('search-history');
  historyDiv.innerHTML = '';

  if (data.length > 0) {
    const list = document.createElement('ul');
    data.forEach(entry => {
      const item = document.createElement('li');
      item.textContent = `Lat: ${entry.latitude}, Lon: ${entry.longitude} — ${new Date(entry.searched_at).toLocaleString()}`;
      list.appendChild(item);
    });
    historyDiv.appendChild(list);
  } else {
    historyDiv.innerHTML = '<p>No recent searches yet.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const weatherForm = document.getElementById('weather-form');
  const forecastForm = document.getElementById('forecast-form');

  // Home Page
  if (weatherForm) {
    weatherForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const lat = document.getElementById('lat').value;
      const lon = document.getElementById('lon').value;

      await logSearchToSupabase(lat, lon);

      const response = await fetch(`https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`);
      const data = await response.json();
      const weatherDiv = document.getElementById('weather-results');
      weatherDiv.innerHTML = '';

      if (data && data.dataseries) {
        const day = data.dataseries[0];
        const temp = day.temp2m || 'N/A';
        const weather = day.weather || 'Not available';
        const wind = typeof day.wind10m === 'object' && day.wind10m.speed
          ? `${day.wind10m.speed} m/s`
          : (day.wind10m || 'N/A');
        const imageUrl = getWeatherImageUrl(weather);

        weatherDiv.innerHTML = `
          <img src="${imageUrl}" alt="${weather}" style="width: 100px;" />
          <p><strong>Temperature:</strong> ${temp}°C</p>
          <p><strong>Weather:</strong> ${weather}</p>
          <p><strong>Wind Speed:</strong> ${wind}</p>
        `;
      } else {
        weatherDiv.innerHTML = '<p>No data available. Try different coordinates.</p>';
      }

      getSearchHistory();
    });

    getSearchHistory();
  }

  // Forecast Page
  if (forecastForm) {
    forecastForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const lat = document.getElementById('lat').value;
      const lon = document.getElementById('lon').value;

      await logSearchToSupabase(lat, lon);

      const response = await fetch(`https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`);
      const data = await response.json();
      const forecastDiv = document.getElementById('forecast-results');
      forecastDiv.innerHTML = '';

      if (data && data.dataseries) {
        data.dataseries.slice(0, 7).forEach((day, index) => {
          const imageUrl = getWeatherImageUrl(day.weather || 'clear');
          const dayEl = document.createElement('div');
          dayEl.innerHTML = `
            <h4>Day ${index + 1}</h4>
            <img src="${imageUrl}" alt="${day.weather}" style="width: 80px;" />
            <p><strong>Timepoint:</strong> ${day.timepoint} hrs</p>
            <p><strong>Cloud Cover:</strong> ${day.cloudcover}</p>
            <p><strong>Humidity:</strong> ${day.rh2m}%</p>
            <p><strong>Temperature:</strong> ${day.temp2m}°C</p>
          `;
          forecastDiv.appendChild(dayEl);
        });

        const labels = data.dataseries.slice(0, 7).map((day, i) => `Day ${i + 1}`);
        const temps = data.dataseries.slice(0, 7).map(day => day.temp2m);
        const ctx = document.getElementById('tempChart').getContext('2d');

        new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Temperature (°C)',
              data: temps,
              fill: false,
              borderColor: '#0077b6',
              tension: 0.3
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: false } }
          }
        });
      } else {
        forecastDiv.innerHTML = '<p>No forecast data available.</p>';
      }
    });
  }
});
