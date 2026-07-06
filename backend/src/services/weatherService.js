import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class WeatherService {
  constructor() {
    this.apiKey = config.openWeather.apiKey;
    this.lat = config.openWeather.lat;
    this.lon = config.openWeather.lon;
    this.units = config.openWeather.units;
  }

  async getCurrentWeather() {
    try {
      const response = await axios.get(
        'https://api.openweathermap.org/data/2.5/weather',
        {
          params: {
            lat: this.lat,
            lon: this.lon,
            appid: this.apiKey,
            units: this.units
          }
        }
      );

      if (response.data) {
        return {
          success: true,
          data: {
            temperature: response.data.main.temp,
            humidity: response.data.main.humidity,
            windSpeed: response.data.wind.speed,
            description: response.data.weather[0].description,
            icon: response.data.weather[0].icon
          }
        };
      }

      return {
        success: false,
        message: 'No weather data available'
      };
    } catch (error) {
      logger.error('OpenWeather API error - getCurrentWeather', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getForecast() {
    try {
      const response = await axios.get(
        'https://api.openweathermap.org/data/2.5/forecast',
        {
          params: {
            lat: this.lat,
            lon: this.lon,
            appid: this.apiKey,
            units: this.units
          }
        }
      );

      if (response.data && response.data.list) {
        const forecast = response.data.list.map(item => ({
          timestamp: new Date(item.dt * 1000),
          temperature: item.main.temp,
          humidity: item.main.humidity,
          windSpeed: item.wind.speed,
          description: item.weather[0].description,
          icon: item.weather[0].icon
        }));

        return {
          success: true,
          forecast
        };
      }

      return {
        success: false,
        message: 'No forecast data available'
      };
    } catch (error) {
      logger.error('OpenWeather API error - getForecast', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getOutdoorTemperature() {
    const weather = await this.getCurrentWeather();
    
    if (weather.success) {
      return {
        success: true,
        temperature: weather.data.temperature
      };
    }

    return {
      success: false,
      message: 'Temperature not available'
    };
  }
}

export default new WeatherService();
