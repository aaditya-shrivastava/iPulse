const API = 'http://localhost:3000/api';
let map, marker, lastResult;

// Weather code to text
function weatherDesc(code) {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Showers';
  return 'Thunderstorm';
}

// Init Leaflet map
function initMap(lat, lon) {
  if (!map) {
    map = L.map('map').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
    marker = L.marker([lat, lon]).addTo(map);
  } else {
    map.setView([lat, lon], 10);
    marker.setLatLng([lat, lon]);
  }
}

// Show/hide skeleton
function showSkeleton(show) {
  document.getElementById('skeleton').classList.toggle('hidden', !show);
  document.getElementById('results').classList.toggle('hidden', show);
  document.getElementById('map-container').classList.toggle('hidden', show);
}

// Populate UI with result
function populateUI(d) {
  lastResult = d;

  // Summary cards
  document.getElementById('res-ip').textContent = d.ip;
  document.getElementById('res-location').textContent = `${d.city}, ${d.country}`;
  document.getElementById('res-timezone').textContent = d.timezone;

  const threatEl = document.getElementById('res-threat');
  threatEl.textContent = d.threat.charAt(0).toUpperCase() + d.threat.slice(1);
  const threatCard = document.getElementById('card-threat');
  threatCard.className = `summary-card threat-card threat-${d.threat}`;

  // Network
  document.getElementById('res-isp').textContent = d.isp || '—';
  document.getElementById('res-org').textContent = d.org || '—';
  document.getElementById('res-conn').textContent = d.connectionType;
  document.getElementById('res-vpn').textContent = d.isVPN ? '⚠ Yes' : '✓ No';
  document.getElementById('res-host').textContent = d.isHosting ? '⚠ Yes' : '✓ No';

  // Location
  document.getElementById('res-city').textContent = d.city;
  document.getElementById('res-region').textContent = d.region;
  document.getElementById('res-country').textContent = `${d.country} ${getFlag(d.countryCode)}`;
  document.getElementById('res-zip').textContent = d.zip || '—';
  document.getElementById('res-coords').textContent = `${d.lat.toFixed(4)}, ${d.lon.toFixed(4)}`;

  // Weather
  if (d.weather) {
    document.getElementById('res-temp').textContent = `${d.weather.temp}°C`;
    document.getElementById('res-wind').textContent = `${d.weather.windspeed} km/h`;
    document.getElementById('res-condition').textContent = weatherDesc(d.weather.code);
  } else {
    document.getElementById('res-temp').textContent = 'N/A';
    document.getElementById('res-wind').textContent = 'N/A';
    document.getElementById('res-condition').textContent = 'N/A';
  }

  // Local time
  try {
    const localTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: d.timezone,
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    }).format(new Date());
    document.getElementById('res-localtime').textContent = localTime;
  } catch {
    document.getElementById('res-localtime').textContent = '—';
  }

  // Map
  document.getElementById('map-container').classList.remove('hidden');
  initMap(d.lat, d.lon);

  // Show results
  document.getElementById('results').classList.remove('hidden');
}

// Country code to flag emoji
function getFlag(code) {
  if (!code) return '';
  return code.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(127397 + c.charCodeAt())
  );
}

// Main lookup
async function lookup(ip) {
  const errorEl = document.getElementById('error-msg');
  errorEl.classList.add('hidden');
  document.getElementById('skeleton').classList.remove('hidden');
  document.getElementById('results').classList.add('hidden');
  document.getElementById('map-container').classList.add('hidden');

  try {
    const res = await fetch(`${API}/lookup/${ip}`);
    const data = await res.json();

    document.getElementById('skeleton').classList.add('hidden');

    if (!res.ok) {
      errorEl.textContent = data.error || 'Something went wrong.';
      errorEl.classList.remove('hidden');
      return;
    }

    populateUI(data);

    // Save to history
    await fetch(`${API}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: data.ip, city: data.city,
        country: data.country, countryCode: data.countryCode,
        threat: data.threat
      })
    });

    loadHistory();
  } catch (err) {
    document.getElementById('skeleton').classList.add('hidden');
    errorEl.textContent = 'Could not connect to server.';
    errorEl.classList.remove('hidden');
  }
}

// Load search history
async function loadHistory() {
  try {
    const res = await fetch(`${API}/history`);
    const list = await res.json();
    const el = document.getElementById('history-list');
    const section = document.getElementById('history-section');

    if (!list.length) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');

    el.innerHTML = list.map(h => `
      <div class="history-item" onclick="lookup('${h.ip}')">
        <span class="threat-dot dot-${h.threat}"></span>
        <span class="flag">${getFlag(h.countryCode)}</span>
        <span class="hist-ip">${h.ip}</span>
        <span class="hist-city">${h.city}, ${h.country}</span>
      </div>
    `).join('');
  } catch {}
}

// Event listeners
document.getElementById('search-btn').addEventListener('click', () => {
  const val = document.getElementById('ip-input').value.trim();
  if (val) lookup(val);
});

document.getElementById('ip-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (val) lookup(val);
  }
});

document.getElementById('theme-toggle').addEventListener('click', () => {
  const html = document.documentElement;
  html.setAttribute('data-theme',
    html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
  );
});

document.getElementById('copy-btn').addEventListener('click', () => {
  if (lastResult) {
    navigator.clipboard.writeText(lastResult.ip);
    document.getElementById('copy-btn').textContent = '✓ Copied!';
    setTimeout(() => {
      document.getElementById('copy-btn').textContent = '📋 Copy IP';
    }, 2000);
  }
});

document.getElementById('export-btn').addEventListener('click', () => {
  if (!lastResult) return;
  const blob = new Blob([JSON.stringify(lastResult, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ipulse-${lastResult.ip}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('clear-history-btn').addEventListener('click', async () => {
  await fetch(`${API}/history`, { method: 'DELETE' });
  document.getElementById('history-section').classList.add('hidden');
});

// On load: detect visitor's own IP
window.addEventListener('DOMContentLoaded', () => {
  lookup('');
  loadHistory();
});