import { WindField } from "./WindField";

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
const SPEED_SCALE = 0.8;

export class WindParticleSystem {
  private particles: Particle[] = [];
  private field: WindField | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId = 0;
  private projector: Projector | null = null;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setField(field: WindField) {
    this.field = field;
    if (this.particles.length === 0 && this.running) {
      this.initParticles();
    }
  }

  setProjector(proj: Projector) {
    this.projector = proj;
  }

  start() {
    if (this.running) return;
    this.running = true;
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

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Fade previous frame for trail effect
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = "rgba(0, 0, 0, 0.94)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = prev;

    ctx.lineWidth = 1;

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
      const nx = projected.x + uv[0] * SPEED_SCALE;
      const ny = projected.y - uv[1] * SPEED_SCALE;

      // Skip if off-screen
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
        this.particles[i] = this.spawnParticle();
        continue;
      }

      const speed = Math.sqrt(uv[0] ** 2 + uv[1] ** 2);
      const alpha = Math.min(1, 0.15 + speed / 12) * (1 - p.age / p.maxAge);

      ctx.strokeStyle = `rgba(6, 182, 212, ${alpha.toFixed(3)})`;
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
