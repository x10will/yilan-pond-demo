// Optional optics only: never changes terrain Z, depth flags, or dolly behavior.
export const CAMERA_NEAR_FACTOR = 0.02;
export const CAMERA_NEAR_MIN = 0.3;
export const CAMERA_NEAR_MAX = 1000;
export const CAMERA_NEAR_RELATIVE_EPSILON = 0.001;

export function nearForOrbitDistance(distance, {
  factor = CAMERA_NEAR_FACTOR, min = CAMERA_NEAR_MIN, max = CAMERA_NEAR_MAX,
} = {}) {
  return Math.max(min, Math.min(max, factor * distance));
}

// Resolve once at startup. Unselected mode preserves the constant camera path.
export function createAdaptiveNearUpdater(camera, controls, site) {
  if (site.cameraNearMode !== 'adaptive') return null;
  const options = {
    factor: site.cameraNearFactor ?? CAMERA_NEAR_FACTOR,
    min: site.cameraNearMin ?? CAMERA_NEAR_MIN,
    max: site.cameraNearMax ?? CAMERA_NEAR_MAX,
  };
  return () => {
    const distance = camera.position.distanceTo(controls.target);
    if (!Number.isFinite(distance) || distance <= 0) return false;
    const near = nearForOrbitDistance(distance, options);
    if (near === camera.near) return false;
    if (near !== options.min && near !== options.max &&
        Math.abs(near - camera.near) < camera.near * CAMERA_NEAR_RELATIVE_EPSILON) return false;
    camera.near = near;
    camera.updateProjectionMatrix();
    return true;
  };
}
