export const MAX_HOURS = 168; // 7 days

export interface ForecastTimeline {
  getCurrentHour(): number;
  setHour(hour: number): void;
  advance(loop?: boolean): void;
}

export function createForecastTimeline(): ForecastTimeline {
  let currentHour = 0;

  return {
    getCurrentHour() {
      return currentHour;
    },
    setHour(hour: number) {
      currentHour = Math.max(0, Math.min(MAX_HOURS, hour));
    },
    advance(loop = false) {
      if (currentHour >= MAX_HOURS) {
        currentHour = loop ? 0 : MAX_HOURS;
      } else {
        currentHour++;
      }
    },
  };
}
