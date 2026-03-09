export type IconName =
  | "clear"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "sleet"
  | "freezing-rain"
  | "thunderstorm";

export type IconIntensity = "none" | "light" | "moderate" | "heavy";

export const ICON_NAMES: IconName[] = [
  "clear",
  "cloudy",
  "fog",
  "rain",
  "snow",
  "sleet",
  "freezing-rain",
  "thunderstorm",
];

export interface WeatherIconResult {
  iconName: IconName;
  intensity: IconIntensity;
}

interface WeatherIconInput {
  weatherCode: number;
}

/**
 * Map WMO weather codes to icon names and intensity levels.
 * WMO codes: https://open-meteo.com/en/docs (Weather interpretation codes)
 */
export function getWeatherIcon(data: WeatherIconInput): WeatherIconResult {
  const c = data.weatherCode;

  // Clear sky
  if (c === 0) return { iconName: "clear", intensity: "none" };

  // Partly cloudy / overcast
  if (c >= 1 && c <= 3) return { iconName: "cloudy", intensity: "none" };

  // Fog
  if (c === 45 || c === 48) return { iconName: "fog", intensity: "none" };

  // Drizzle
  if (c === 51) return { iconName: "rain", intensity: "light" };
  if (c === 53) return { iconName: "rain", intensity: "moderate" };
  if (c === 55) return { iconName: "rain", intensity: "heavy" };

  // Freezing drizzle
  if (c === 56) return { iconName: "freezing-rain", intensity: "light" };
  if (c === 57) return { iconName: "freezing-rain", intensity: "moderate" };

  // Rain
  if (c === 61) return { iconName: "rain", intensity: "light" };
  if (c === 63) return { iconName: "rain", intensity: "moderate" };
  if (c === 65) return { iconName: "rain", intensity: "heavy" };

  // Freezing rain
  if (c === 66) return { iconName: "freezing-rain", intensity: "light" };
  if (c === 67) return { iconName: "freezing-rain", intensity: "heavy" };

  // Snowfall
  if (c === 71) return { iconName: "snow", intensity: "light" };
  if (c === 73) return { iconName: "snow", intensity: "moderate" };
  if (c === 75) return { iconName: "snow", intensity: "heavy" };

  // Snow grains
  if (c === 77) return { iconName: "sleet", intensity: "light" };

  // Rain showers
  if (c === 80) return { iconName: "rain", intensity: "light" };
  if (c === 81) return { iconName: "rain", intensity: "moderate" };
  if (c === 82) return { iconName: "rain", intensity: "heavy" };

  // Snow showers
  if (c === 85) return { iconName: "snow", intensity: "light" };
  if (c === 86) return { iconName: "snow", intensity: "heavy" };

  // Thunderstorm
  if (c === 95) return { iconName: "thunderstorm", intensity: "moderate" };
  if (c === 96 || c === 99) return { iconName: "thunderstorm", intensity: "heavy" };

  // Default
  return { iconName: "cloudy", intensity: "none" };
}
