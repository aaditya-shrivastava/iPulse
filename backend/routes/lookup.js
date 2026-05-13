const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/lookup/:ip?', async (req, res) => {
  const ip = req.params.ip || '';

  try {
    // Step 1: Get IP data
    const { data } = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,mobile,proxy,hosting,query`
    );

    if (data.status === 'fail') {
      return res.status(400).json({ error: data.message });
    }

    // Step 2: Get live weather for that location
    let weather = null;
    try {
      const weatherRes = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${data.lat}&longitude=${data.lon}&current_weather=true`
      );
      weather = weatherRes.data.current_weather;
    } catch {
      weather = null;
    }

    // Step 3: Threat level
    let threat = 'safe';
    if (data.proxy) threat = 'suspicious';
    if (data.hosting) threat = 'suspicious';
    if (data.proxy && data.hosting) threat = 'dangerous';

    const result = {
      ip: data.query,
      city: data.city,
      region: data.regionName,
      country: data.country,
      countryCode: data.countryCode,
      zip: data.zip,
      lat: data.lat,
      lon: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      org: data.org,
      connectionType: data.mobile ? 'Mobile' : 'Broadband',
      isVPN: data.proxy,
      isHosting: data.hosting,
      threat,
      weather: weather
        ? {
            temp: weather.temperature,
            windspeed: weather.windspeed,
            code: weather.weathercode,
          }
        : null,
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Lookup failed. Try again.' });
  }
});

module.exports = router;