export class Particle {
  constructor() {
    this.active = false;
  }

  reset(data) {
    Object.assign(this, data);
    this.active = true;
    return this;
  }

  release() {
    this.active = false;
    this.textureImage = null;
    this.emitter = null;
  }
}

