const HARDCODED_FI_WINTER_PRICES = [
  3.5, 3.2, 2.8, 2.5, 2.6, 3.0, 4.5, 6.2, 7.1, 6.8,
  6.5, 6.3, 6.4, 6.2, 5.8, 5.5, 5.9, 7.0, 8.5, 9.2,
  8.8, 7.5, 5.8, 4.2
];

const FALLBACK_OUTDOOR_TEMP = -5;

function applyHardcodedOverrides(schedule, outdoorTemp, roomTemps) {
  const modified = JSON.parse(JSON.stringify(schedule));

  // CRITICAL: Kodinhoitohuone frost protection
  if (roomTemps && roomTemps['Kodinhoitohuone'] !== undefined && roomTemps['Kodinhoitohuone'] < 15) {
    modified.overrides = modified.overrides || {};
    modified.overrides['Kodinhoitohuone'] = {
      relay: 'ON',
      reason: 'FROST_PROTECTION: Room temp below 15°C',
      priority: 'CRITICAL'
    };
  }

  // CRITICAL: Drain cable activation when outdoor temp < 0
  if (outdoorTemp !== undefined && outdoorTemp < 0) {
    modified.overrides = modified.overrides || {};
    modified.overrides['Ilmalämpöpumppu'] = {
      relay: 'ON',
      reason: 'DRAIN_CABLE: Outdoor temp below 0°C',
      priority: 'CRITICAL'
    };
  }

  return modified;
}

function getFallbackData(type) {
  switch (type) {
    case 'nordpool':
    case 'spot_price':
      return {
        source: 'fallback',
        prices: HARDCODED_FI_WINTER_PRICES.map((price, hour) => ({
          hour,
          price_cents_per_kwh: price,
          currency: 'EUR'
        })),
        note: 'Hardcoded average Finnish winter prices (Nord Pool API unavailable)'
      };

    case 'weather':
    case 'outdoor_temp':
      return {
        source: 'fallback',
        temperature_celsius: FALLBACK_OUTDOOR_TEMP,
        note: 'Conservative default temperature (OpenWeather API unavailable)'
      };

    default:
      return null;
  }
}

module.exports = {
  applyHardcodedOverrides,
  getFallbackData
};