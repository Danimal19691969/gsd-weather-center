"use client";

import { getWeatherIcon, type IconName, type IconIntensity } from "@/lib/weather/weatherIconMapper";
import {
  ClearIcon,
  CloudyIcon,
  FogIcon,
  RainIcon,
  SnowIcon,
  SleetIcon,
  FreezingRainIcon,
  ThunderstormIcon,
} from "./icons/WeatherIcons";

type Size = "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

interface Props {
  weatherCode: number;
  size?: Size;
  className?: string;
}

const ICON_COMPONENTS: Record<
  IconName,
  React.ComponentType<{ size: number; className?: string; intensity: IconIntensity }>
> = {
  clear: ({ size, className }) => <ClearIcon size={size} className={className} />,
  cloudy: ({ size, className }) => <CloudyIcon size={size} className={className} />,
  fog: ({ size, className }) => <FogIcon size={size} className={className} />,
  rain: ({ size, className, intensity }) => (
    <RainIcon size={size} className={className} intensity={intensity} />
  ),
  snow: ({ size, className, intensity }) => (
    <SnowIcon size={size} className={className} intensity={intensity} />
  ),
  sleet: ({ size, className }) => <SleetIcon size={size} className={className} />,
  "freezing-rain": ({ size, className }) => (
    <FreezingRainIcon size={size} className={className} />
  ),
  thunderstorm: ({ size, className }) => (
    <ThunderstormIcon size={size} className={className} />
  ),
};

export function WeatherIcon({ weatherCode, size = "md", className }: Props) {
  const { iconName, intensity } = getWeatherIcon({ weatherCode });
  const px = SIZE_MAP[size];
  const Component = ICON_COMPONENTS[iconName];

  return <Component size={px} className={className} intensity={intensity} />;
}
