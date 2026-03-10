import { WindField } from "./WindField";
import { speedToColor } from "./colorScale";

interface Particle {
  lat: number;
  lon: number;
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

interface Projector {
  project(lngLat: [number, number]): { x: number; y: number };
  unproject(point: [number, number]): { lng: number; lat: number };
}

const PARTICLE_COUNT = 2500;
const MIN_AGE = 60;
const MAX_AGE = 120;

// Velocity scale: pixels per frame per m/s of wind.
// At 10 m/s wind → 0.08 * 10 = 0.8 px/frame → slow, syrupy motion.
// Old value was 0.8 which gave 8 px/frame at 10 m/s — far too fast.
export const SPEED_SCALE = 0.08;

// Cap frame delta to prevent particle jumps on tab-switch or lag spikes.
export const MAX_DELTA = 33; // ms (≈30fps minimum)

// Re-export from colorScale for backwards compatibility
export { speedToColor } from "./colorScale";

// Convert hex color to rgba string with given alpha
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

export class WindParticleSystem {
  private particles: Particle[] = [];
  private field: WindField | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId = 0;
  private projector: Projector | null = null;
  private running = false;
  private lastFrameTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setField(field: WindField) {
    const boundsChanged = !this.field ||
      field.bounds.west !== this.field.bounds.west ||
      field.bounds.south !== this.field.bounds.south ||
      field.bounds.east !== this.field.bounds.east ||
      field.bounds.north !== this.field.bounds.north;

    this.field = field;

    // Re-scatter particles when field bounds change (e.g. after zoom)
    // so they cover the new viewport instead of clustering in the old rectangle.
    if (this.running && (this.particles.length === 0 || boundsChanged)) {
      this.initParticles();
    }
  }

  setProjector(proj: Projector) {
    this.projector = proj;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = 0;
    this.initParticles();
    this.tick();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animId);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles = [];
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  destroy() {
    this.stop();
  }

  private initParticles() {
    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push(this.spawnParticle());
    }
  }

  private spawnParticle(): Particle {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const x = Math.random() * w;
    const y = Math.random() * h;

    let lat = 0;
    let lon = 0;
    if (this.projector) {
      const coord = this.projector.unproject([x, y]);
      lat = coord.lat;
      lon = coord.lng;
    }

    return {
      lat, lon, x, y,
      age: Math.floor(Math.random() * MIN_AGE),
      maxAge: MIN_AGE + Math.floor(Math.random() * (MAX_AGE - MIN_AGE)),
    };
  }

  private tick() {
    if (!this.running) return;

    if (!this.field || !this.projector) {
      this.animId = requestAnimationFrame(() => this.tick());
      return;
    }

    // Stable timestep: cap frame delta to prevent jumps
    const now = performance.now();
    if (this.lastFrameTime === 0) this.lastFrameTime = now;
    const rawDt = now - this.lastFrameTime;
    const dt = Math.min(rawDt, MAX_DELTA);
    this.lastFrameTime = now;

    // Scale factor normalized to 16.67ms (60fps baseline)
    const dtScale = dt / 16.67;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Fade previous frame for trail effect
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = "rgba(0, 0, 0, 0.94)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = prev;

    ctx.lineWidth = 1.2;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (p.age >= p.maxAge) {
        this.particles[i] = this.spawnParticle();
        continue;
      }

      const uv = this.field.interpolate(p.lat, p.lon);
      if (!uv) {
        this.particles[i] = this.spawnParticle();
        continue;
      }

      const projected = this.projector.project([p.lon, p.lat]);

      // Apply velocity with frame-time normalization
      const nx = projected.x + uv[0] * SPEED_SCALE * dtScale;
      const ny = projected.y - uv[1] * SPEED_SCALE * dtScale;

      // Skip if off-screen
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
        this.particles[i] = this.spawnParticle();
        continue;
      }

      // Wind magnitude for color and alpha
      const speed = Math.sqrt(uv[0] ** 2 + uv[1] ** 2);
      const alpha = Math.min(1, 0.2 + speed / 15) * (1 - p.age / p.maxAge);

      // Color by wind speed band
      const color = speedToColor(speed);
      ctx.strokeStyle = hexToRgba(color, alpha);

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      const newCoord = this.projector.unproject([nx, ny]);
      p.lon = newCoord.lng;
      p.lat = newCoord.lat;
      p.x = nx;
      p.y = ny;
      p.age++;
    }

    this.animId = requestAnimationFrame(() => this.tick());
  }
}
