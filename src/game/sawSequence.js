import { AnimatedSprite } from "../../vendor.js";

const exactWait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const exactTween = (duration, update) => new Promise((resolve, reject) => {
  let started = 0;
  const step = (now) => {
    if (!started) started = now;
    const t = Math.min(1, (now - started) / duration);
    try {
      update(t);
    } catch (error) {
      reject(error);
      return;
    }
    if (t < 1) requestAnimationFrame(step);
    else resolve();
  };
  requestAnimationFrame(step);
});
const degrees = (value) => value * Math.PI / 180;
const ROTATION = { L: -90, R: 90, D: 180, U: 0 };
const PARTICLE_SCALES = [0.3, 0.22, 0.35, 0.27, 0.39, 0.29];
const PARTICLE_ROTATIONS = [50, 100, 130, 150, 170, 40];

class SawSequence {
  constructor(game) {
    this.game = game;
  }
  async play(actions, concurrent, onTarget) {
    const ordered = [...actions].sort((a, b) => a.source.reel - b.source.reel || a.source.row - b.source.row);
    window.__SAW_STAGE__ = ordered.length ? "start" : "none";
    if (concurrent) await Promise.all(ordered.map((action) => this.playAction(action, onTarget)));
    else for (const action of ordered) await this.playAction(action, onTarget);
    window.__SAW_STAGE__ = "done";
  }
  async playAction(action, onTarget) {
    const { source, targets, direction } = action;
    const unit = this.game.girder.unit;
    const sourcePoint = this.game.reels.positionOf(source);
    window.__SAW_STAGE__ = `action-${source.reel}-${source.row}-${direction}`;
    if (action.skip) {
      window.__SAW_STAGE__ = `brick-skip-${source.reel}-${source.row}-${direction}`;
      await exactWait(500);
      this.game.reels.setSymbol(source, action.finalSourceSymbol);
      this.game.removeSymbolOverlay(source, false);
      this.game.createHatOverlay(source, 18);
      this.createCloudBurst(sourcePoint);
      return;
    }
    const saw = new AnimatedSprite(this.game.atlases.symbols.animation("green_saw_flip"));
    saw.label = "SawSequenceSaw";
    saw.anchor.set(0.5);
    saw.position.set(sourcePoint.x, sourcePoint.y);
    saw.scale.set(0);
    saw.rotation = degrees(ROTATION[direction] || 0);
    this.game.boardEffects.addChild(saw);
    // Saw.Flip as the buzzsaw flips into the grid.
    this.game.audio.play("sawFlip", 0.35);
    try {
      await Promise.all([
        this.playClip(saw, "green_saw_flip", 1.25, false),
        exactTween(300, (t) => {
          // Original bSa tween: scale 0→1 in the reels-component space.
          if (!saw.destroyed) saw.scale.set(unit * t);
        })
      ]);
      await this.playClip(saw, "green_saw_smoke", 1, false);
      if (saw.destroyed) return;
      void this.playClip(saw, "green_saw_rotate_in", 1, true);
      this.createTrail(sourcePoint, direction);
      this.createCloudBurst(saw.position);
      const lastTarget = targets.length ? targets[targets.length - 1] : source;
      const lastPoint = this.game.reels.positionOf(lastTarget);
      const endpoint = { x: lastPoint.x, y: lastPoint.y };
      const overshoot = 250 * unit;
      if (direction === "L") endpoint.x -= overshoot;
      else if (direction === "R") endpoint.x += overshoot;
      else if (direction === "D") endpoint.y += overshoot;
      else if (direction === "U") endpoint.y -= overshoot;
      const distance = Math.abs(source.reel - lastTarget.reel) || Math.abs(source.row - lastTarget.row);
      const duration = 300 * distance + 500;
      window.__SAW_STAGE__ = `move-${source.reel}-${source.row}-${direction}`;
      // Buzzsaw.Spinning while the saw runs across the grid.
      this.game.audio.play("buzzsawSpinning", 0.4);
      const targetPoints = targets.map((position) => this.game.reels.positionOf(position));
      const fired = new Set();
      let previous = { x: sourcePoint.x, y: sourcePoint.y };
      await exactTween(duration, (t) => {
        if (saw.destroyed) return;
        const current = {
          x: sourcePoint.x + (endpoint.x - sourcePoint.x) * t,
          y: sourcePoint.y + (endpoint.y - sourcePoint.y) * t
        };
        saw.position.set(current.x, current.y);
        for (let index = 0; index < targets.length; index++) {
          if (fired.has(index) || !this.crossedTarget(previous, current, targetPoints[index], direction, 50 * unit)) continue;
          fired.add(index);
          // Per-reel saw trail sound as the saw crosses each target.
          this.game.audio.play(`sawTrail${targets[index].reel + 1}`, 0.4);
          this.createTrail(targetPoints[index], direction);
          this.createCloudBurst(saw.position);
          onTarget(targets[index], action);
        }
        previous = current;
      });
    } finally {
      if (!saw.destroyed) saw.destroy();
    }
  }
  crossedTarget(previous, current, target, direction, threshold) {
    const boundary = direction === "L" ? target.x + threshold : direction === "R" ? target.x - threshold : direction === "U" ? target.y + threshold : target.y - threshold;
    const before = direction === "L" || direction === "R" ? previous.x : previous.y;
    const after = direction === "L" || direction === "R" ? current.x : current.y;
    return (before - boundary) * (after - boundary) <= 0;
  }
  playClip(sprite, animation, speed, loop) {
    if (sprite.destroyed) return Promise.resolve();
    sprite.textures = this.game.atlases.symbols.animation(animation);
    sprite.animationSpeed = this.game.atlases.symbols.fps / 60 * speed;
    sprite.loop = loop;
    if (loop) {
      sprite.play();
      return Promise.resolve();
    }
    const complete = new Promise((resolve) => { sprite.onComplete = resolve; });
    sprite.play();
    return complete;
  }
  createTrail(point, direction) {
    const unit = this.game.girder.unit;
    const trail = new AnimatedSprite(this.game.atlases.symbols.animation("green_trail"));
    trail.label = "SawSequenceTrail";
    trail.anchor.set(0.5);
    trail.position.set(point.x, point.y);
    // Original saw line keeps the parent component's unit scale.
    trail.scale.set(unit);
    trail.rotation = degrees(ROTATION[direction] || 0);
    trail.blendMode = "add";
    this.game.boardEffects.addChild(trail);
    void exactWait(700).then(() => exactTween(1500, (t) => {
      if (!trail.destroyed) trail.alpha = 1 - t;
    })).finally(() => {
      if (!trail.destroyed) trail.destroy();
    });
  }
  createCloudBurst(point) {
    const unit = this.game.girder.unit;
    const rng = this.game.reels.visualRng;
    for (let index = 0; index < 6; index++) {
      const particle = new AnimatedSprite(this.game.atlases.trailCloud.animation("cloud_particle"));
      particle.label = "SawSequenceCloud";
      particle.anchor.set(0.5);
      particle.position.set(point.x + (2 * rng.next() - 1) * 80 * unit, point.y + (2 * rng.next() - 1) * 80 * unit);
      particle.scale.set(unit * PARTICLE_SCALES[index]);
      particle.rotation = degrees(PARTICLE_ROTATIONS[index]);
      this.game.boardEffects.addChild(particle);
      const angle = index / 6 * 2 * Math.PI;
      const radius = (60 + 40 * rng.next()) * unit;
      const destination = { x: particle.x + Math.cos(angle) * radius, y: particle.y + Math.sin(angle) * radius };
      const start = { x: particle.x, y: particle.y };
      void exactTween(1000, (t) => {
        if (particle.destroyed) return;
        particle.alpha = 1 - t;
        particle.position.set(start.x + (destination.x - start.x) * t, start.y + (destination.y - start.y) * t);
      }).finally(() => {
        if (!particle.destroyed) particle.destroy();
      });
    }
  }
}

export { SawSequence };
