// Farm-owned, original pond presentation. Static geometry is authored site data;
// only farm-pond-world-state may supply replay time, twin placement/state or warning subjects.
// Wheel movement, foam and local lamp accents are decorative. DT alone applies
// projection.environment to scene lighting, sky and fog.
export const COMMAND = 'farm-pond-world-state';
export const READY = 'farm-pond-world-ready';
export const OBSERVED = 'farm-pond-world-observed';
export const SELECT_COMMAND = 'farm-pond-select-twin';

const TAU = Math.PI * 2;
// Presentation exaggeration only: keep the twin root's complete canonical
// transform intact, and enlarge only the original figure's local geometry.
const WORKER_PRESENTATION_SCALE = 1.75;
const WARNING_KINDS = new Set(['equipment-fault', 'simulated-low-oxygen-risk']);
const RUNNING_STATES = new Set(['on', 'running']);
// Will, 2026-10-07: foam and paddle spin are animation, not simulated state.
const PADDLE_SPEED = TAU * 1.37;
const PADDLE_ACCELERATION = PADDLE_SPEED / 1.5;
const PRESET_ACCENTS = {
  night: {water: 0.2, windows: 4, lamps: 100, glow: 0.42, status: 2.5},
  dawn: {water: 0.6, windows: 0.25, lamps: 6, glow: 0.025, status: 0.3},
  day: {water: 1, windows: 0, lamps: 0, glow: 0, status: 0.1},
  dusk: {water: 0.5, windows: 2, lamps: 55, glow: 0.24, status: 1.4},
};
const DEFAULT_PALETTE = {
  water: '#62b5ba', deepWater: '#438e9b', bank: '#87a85e', soil: '#b7a078',
  path: '#d6c39d', concrete: '#d4d5bf', metal: '#456879', dark: '#354651',
  cream: '#f3e8c7', yellow: '#e8b94e', orange: '#cf7850', roof: '#bd725a',
  leaf: '#759b55', leafLight: '#a3b967', trunk: '#887255', rice: '#b2c768',
  foam: '#e5f4e4', warning: '#ee9550', fault: '#d85d4f', lamp: '#ffdb91',
};
const finitePoint = (point, length) => Array.isArray(point) && point.length >= length
  && point.slice(0, length).every(Number.isFinite);

function polygon(row, label) {
  if (typeof row?.id !== 'string' || !row.id || typeof row.label !== 'string' || !row.label
      || !Number.isFinite(row.z) || !Array.isArray(row.polygon)
      || row.polygon.length < 3 || !row.polygon.every(point => finitePoint(point, 2))) {
    throw new TypeError(`pond-world/v1: ${label} needs id, label, polygon of finite XY points and z`);
  }
  const points = row.polygon.map(point => point.slice(0, 2));
  if (points.length > 3 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]) points.pop();
  return {...row, polygon: points};
}

function readConfig(config) {
  if (config?.schema_version !== 'pond-world/v1' || config.simulation_label !== '模擬'
      || typeof config.source_ref !== 'string' || !config.source_ref.trim()
      || !Array.isArray(config.ponds) || !Array.isArray(config.assets)) {
    throw new TypeError('pond-world/v1 requires simulation_label 模擬, a site source_ref, ponds and assets');
  }
  const rows = key => {
    if (config[key] === undefined) return [];
    if (!Array.isArray(config[key])) throw new TypeError(`pond-world/v1: ${key} must be an array`);
    return config[key];
  };
  const position = (row, label) => {
    if (!finitePoint(row?.position, 3)) throw new TypeError(`pond-world/v1: ${label} needs a finite XYZ position`);
    if (row.rotation !== undefined && !Number.isFinite(row.rotation)) throw new TypeError(`pond-world/v1: ${label} rotation must be radians`);
    return {...row, rotation: row.rotation ?? 0};
  };
  const assets = config.assets.map(row => {
    if (typeof row?.id !== 'string' || !row.id || typeof row.label !== 'string' || !row.label || typeof row.kind !== 'string') {
      throw new TypeError('pond-world/v1: assets need id, label and kind');
    }
    if (row.scale !== undefined && (!Number.isFinite(row.scale) || row.scale <= 0)) {
      throw new TypeError(`pond-world/v1: ${row.id} scale must be a positive scalar`);
    }
    if (row.foam_path !== undefined && (!Array.isArray(row.foam_path) || row.foam_path.length < 2
        || !row.foam_path.every(point => finitePoint(point, 2)))) {
      throw new TypeError(`pond-world/v1: ${row.id} foam_path needs finite authored XY points`);
    }
    return position(row, row.id);
  });
  const sheds = rows('sheds').map(row => {
    if (typeof row?.id !== 'string' || !row.id || typeof row.label !== 'string' || !row.label
        || (row.scale !== undefined && (!Number.isFinite(row.scale) || row.scale <= 0))) {
      throw new TypeError('pond-world/v1: sheds need id, label and a positive scalar scale');
    }
    return position(row, row.id);
  });
  const vegetation = rows('vegetation').map(row => {
    if (!['tree', 'reeds', 'grass'].includes(row?.kind) || !Number.isFinite(row.scale) || row.scale <= 0) {
      throw new TypeError('pond-world/v1: vegetation needs tree/reeds/grass kind and positive scale');
    }
    return position(row, row.kind);
  });
  const readPaths = key => rows(key).map(row => {
    if (!Array.isArray(row?.points) || row.points.length < 2 || !row.points.every(point => finitePoint(point, 2))
        || !Number.isFinite(row.width) || row.width <= 0 || !Number.isFinite(row.z)) {
      throw new TypeError('pond-world/v1: paths need finite XY points, positive width and z');
    }
    return row;
  });
  const lamps = rows('lamps').map(row => position(row, 'artistic path lamp'));
  return {...config, ponds: config.ponds.map(row => polygon(row, 'pond')), assets, sheds, vegetation, lamps,
    paths: readPaths('paths'), context_dikes: readPaths('context_dikes'),
    context_ponds: rows('context_ponds').map(row => polygon(row, 'context pond')),
    paddies: rows('paddies').map(row => polygon(row, 'paddy'))};
}

export default async function install(api, input) {
  const config = readConfig(input);
  const groundColor = api.site?.farmPondGroundColor;
  if (groundColor !== undefined && !/^#[\da-f]{6}$/i.test(groundColor)) {
    throw new TypeError('farmPondGroundColor must be a site-authored six-digit hex colour');
  }
  const canonicalPlacement = config.twin_inventory_version === 1;
  const {THREE, scene} = api;
  const palette = {...DEFAULT_PALETTE, ...config.palette};
  const resources = new Set(), unregisters = [], hidden = new Map(), lightAccents = [];
  const own = resource => { resources.add(resource); return resource; };
  const world = new THREE.Group();
  world.name = 'farm-pond-world'; world.visible = false;
  world.userData = {schema_version: config.schema_version, simulation_label: '模擬', source_ref: config.source_ref,
    runtime_authority: 'canonical-command-only', scene_lighting_authority: 'DT canonical projection.environment',
    lighting_notice: '小屋、塭岸及人員頭燈為人工模擬藝術光源；非實測照明或設備供電狀態',
    canonicalState: null};
  const material = (color, options = {}) => own(new THREE.MeshStandardMaterial({color,
    roughness: 0.78, metalness: 0, flatShading: true, ...options}));
  // Broad opaque banks/planting and the construction color palette use
  // diffuse lighting. Focal water and emissive status materials stay separate.
  const diffuse = (color, options = {}) => own(new THREE.MeshLambertMaterial({color, flatShading: true, ...options}));
  const materials = Object.fromEntries(Object.entries(palette).map(([key, color]) => [key, diffuse(color)]));
  const warningMaterial = material(palette.warning, {emissive: palette.warning, emissiveIntensity: 0.35});
  const faultMaterial = material(palette.fault, {emissive: palette.fault, emissiveIntensity: 0.45});
  const statusMaterials = {on: material('#b5d991', {emissive: '#90bc6d', emissiveIntensity: 0.5}),
    off: material('#9ba5a6'), fault: faultMaterial};
  const windowMaterial = material(palette.lamp, {emissive: palette.lamp, emissiveIntensity: 0, toneMapped: false});
  // Shared radial texture: inexpensive decorative light pools, without bloom or
  // extra shadow passes. Canonical environment alone controls their visibility.
  const glowPixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const radius = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
    const offset = (y * 64 + x) * 4;
    glowPixels.set([255, 255, 255, Math.round(255 * Math.pow(Math.max(0, 1 - radius), 2))], offset);
  }
  const glowTexture = own(new THREE.DataTexture(glowPixels, 64, 64)); glowTexture.needsUpdate = true;
  const glowMaterial = own(new THREE.MeshBasicMaterial({color: palette.lamp, map: glowTexture,
    transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}));
  const haloMaterial = own(new THREE.SpriteMaterial({color: palette.lamp, map: glowTexture,
    transparent: true, opacity: 0, depthWrite: false, toneMapped: false}));
  const statusHalos = {on: own(haloMaterial.clone()), off: own(haloMaterial.clone()), fault: own(haloMaterial.clone())};
  statusHalos.on.color.set('#b5ed91'); statusHalos.off.color.set('#9ba5a6'); statusHalos.fault.color.set(palette.fault);
  const glowPlane = own(new THREE.PlaneGeometry(1, 1));
  const glowPool = (parent, at, scale) => {
    const pool = new THREE.Mesh(glowPlane, glowMaterial); pool.position.set(...at); pool.scale.set(...scale);
    pool.name = 'simulated-artistic-light-pool'; pool.raycast = () => {}; parent.add(pool); lightAccents.push(pool); return pool;
  };
  const halo = (parent, at, size, mat = haloMaterial) => {
    const sprite = new THREE.Sprite(mat); sprite.position.set(...at); sprite.scale.set(size, size, 1);
    sprite.name = 'simulated-artistic-light-halo'; sprite.raycast = () => {}; parent.add(sprite); lightAccents.push(sprite); return sprite;
  };
  const waterPhase = {value: 0}, waterAccent = {value: 0.5};
  const waterMaterial = material(palette.water, {roughness: 0.38, metalness: 0.18, flatShading: false, side: THREE.DoubleSide});
  // Regional/context ponds use diffuse vertex lighting rather than the focal
  // water sheen: no per-fragment PBR light loop, noise or reflection pass.
  const contextWaterMaterial = own(new THREE.MeshLambertMaterial({color: palette.water,
    side: THREE.DoubleSide}));
  waterMaterial.onBeforeCompile = shader => {
    shader.uniforms.uPondPhase = waterPhase; shader.uniforms.uPondAccent = waterAccent;
    shader.vertexShader = `varying vec2 vPondXY;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPondXY = position.xy;');
    shader.fragmentShader = `uniform float uPondPhase;\nuniform float uPondAccent;\nvarying vec2 vPondXY;
      float pondHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float pondNoise(vec2 p) {
        vec2 cell = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(pondHash(cell), pondHash(cell + vec2(1.0, 0.0)), f.x),
          mix(pondHash(cell + vec2(0.0, 1.0)), pondHash(cell + vec2(1.0, 1.0)), f.x), f.y);
      }
      ${shader.fragmentShader}`
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 drift = vec2(uPondPhase * 0.017, -uPondPhase * 0.011);
        float broad = pondNoise(vPondXY * 0.075 + drift);
        float fine = pondNoise(vPondXY * 0.43 + vec2(broad * 1.3) - drift * 0.6);
        float sheen = smoothstep(0.50, 0.95, broad * 0.65 + fine * 0.35);
        diffuseColor.rgb *= 0.98 + (fine - 0.5) * 0.025;
        diffuseColor.rgb += vec3(0.035, 0.048, 0.044) * sheen * (0.4 + uPondAccent * 0.6);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = normalize(normal + vec3((fine - 0.5) * 0.014, (broad - 0.5) * 0.014, 0.0));`);
  };
  waterMaterial.customProgramCacheKey = () => 'farm-pond-water-irregular-v2';

  const geometries = {
    box: own(new THREE.BoxGeometry(1, 1, 1)),
    sphere: own(new THREE.IcosahedronGeometry(1, 1)),
    cylinder: own(new THREE.CylinderGeometry(1, 1, 1, 10).rotateX(Math.PI / 2)),
    cone: own(new THREE.ConeGeometry(1, 1, 7).rotateX(Math.PI / 2)),
    ring: own(new THREE.TorusGeometry(1, 0.09, 4, 16)),
  };
  const box = (parent, mat, at, scale, rotation = [0, 0, 0], shape = 'box') => {
    const mesh = new THREE.Mesh(geometries[shape], mat);
    mesh.position.set(...at); mesh.scale.set(...scale); mesh.rotation.set(...rotation);
    parent.add(mesh); return mesh;
  };
  const groupAt = (row, prefix, twin = false) => {
    const group = new THREE.Group(); group.name = `${prefix}-${row.id}`;
    if (!canonicalPlacement || !twin) {
      group.position.set(...row.position); group.rotation.z = row.rotation;
      group.scale.setScalar(row.scale ?? 1);
    }
    group.userData = {entity_id: row.id, source_ref: config.source_ref, simulation_label: '模擬'};
    world.add(group); return group;
  };
  const pick = (object, row, type) => unregisters.push(api.registerPickable(object,
    {id: row.id, label: row.label, type, properties: {simulation_label: '模擬', source_ref: config.source_ref,
      presentation: '人工編寫的低多邊形展示；非現地外形或尺寸',
      ...(row.kind === 'worker' ? {presentation_scale: WORKER_PRESENTATION_SCALE,
        size_notice: '人員模型以 1.75 倍展示尺寸呈現；非現地身高或量測尺寸'} : {}),
      ...(row.kind ? {kind: row.kind} : {}), ...(row.anchor ? {anchor: row.anchor} : {}),
      ...(type === 'artistic-light' ? {notice: world.userData.lighting_notice} : {})}}));

  // Static banks, paths and planting use shared instanced geometry/materials.
  const batches = new Map();
  const dummy = new THREE.Object3D();
  const instance = (shape, mat, at, scale, rotation = [0, 0, 0]) => {
    const key = `${shape}:${mat.uuid}`;
    if (!batches.has(key)) batches.set(key, {shape, mat, rows: []});
    batches.get(key).rows.push({at, scale, rotation});
  };
  const segment = (a, b, width, height, z, mat) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 0) instance('box', mat, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z],
      [length, width, height], [0, 0, Math.atan2(b[1] - a[1], b[0] - a[0])]);
  };
  const bankSegment = (a, b, width, height, z, mat) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!length) return;
    const ux = (b[0] - a[0]) / length, uy = (b[1] - a[1]) / length;
    // Static authored construction openings; never move a runtime twin or
    // infer its position from a pond. The source explicitly supplies the span.
    const openings = canonicalPlacement ? config.assets.filter(row => row.kind === 'sluice'
      && Number.isFinite(row.drain_length_m)).flatMap(row => {
      const dx = row.position[0] - a[0], dy = row.position[1] - a[1];
      const along = dx * ux + dy * uy, across = Math.abs(dx * uy - dy * ux);
      if (across > 3.01 || along < 0 || along > length
          || Math.abs(Math.cos(row.rotation) * ux + Math.sin(row.rotation) * uy) > 0.01) return [];
      return [[Math.max(0, along - 0.65), Math.min(length, along + 0.65)]];
    }).sort((left, right) => left[0] - right[0]) : [];
    let start = 0;
    const draw = end => {
      if (end > start) segment([a[0] + ux * start, a[1] + uy * start],
        [a[0] + ux * end, a[1] + uy * end], width, height, z, mat);
    };
    for (const [from, to] of openings) { draw(from); start = Math.max(start, to); }
    draw(length);
  };
  const outline = (points, width, height, z, mat) => {
    points.forEach((point, index) => bankSegment(point, points[(index + 1) % points.length], width, height, z, mat));
  };
  const outerBank = (points, width, height, z, mat) => {
    const orientation = Math.sign(points.reduce((area, a, index) => {
      const b = points[(index + 1) % points.length]; return area + a[0] * b[1] - b[0] * a[1];
    }, 0));
    points.forEach((a, index) => {
      const b = points[(index + 1) % points.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!length) return;
      const ox = orientation * (b[1] - a[1]) / length * width / 2;
      const oy = -orientation * (b[0] - a[0]) / length * width / 2;
      bankSegment([a[0] + ox, a[1] + oy], [b[0] + ox, b[1] + oy], width, height, z, mat);
    });
  };
  const faceGeometry = (points, z) => {
    const triangles = THREE.ShapeUtils.triangulateShape(points.map(([x, y]) => new THREE.Vector2(x, y)), []);
    const vertices = triangles.flatMap(triangle => triangle.flatMap(index => [...points[index], z]));
    const geometry = own(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals(); return geometry;
  };
  const face = (row, mat, lift = 0) => {
    const mesh = new THREE.Mesh(faceGeometry(row.polygon, row.z + lift), mat);
    mesh.name = `farm-pond-water-${row.id}`;
    mesh.userData = {entity_id: row.id, simulation_label: '模擬', source_ref: config.source_ref};
    world.add(mesh); return mesh;
  };
  const warningGeometry = points => {
    const vertices = [];
    points.forEach((a, index) => {
      const b = points[(index + 1) % points.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!length) return;
      const ox = (b[1] - a[1]) / length * 0.28, oy = -(b[0] - a[0]) / length * 0.28;
      const p = [[a[0] + ox, a[1] + oy], [a[0] - ox, a[1] - oy], [b[0] + ox, b[1] + oy], [b[0] - ox, b[1] - oy]];
      for (const i of [0, 1, 2, 1, 3, 2]) vertices.push(...p[i], 0);
    });
    const geometry = own(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals(); return geometry;
  };
  const pondWarnings = new Map(), pondSelections = new Map();
  const selectionMaterial = own(new THREE.MeshBasicMaterial({color: '#ffe382', transparent: true,
    opacity: 0.98, side: THREE.DoubleSide, depthWrite: false, toneMapped: false}));
  const roundedWaterPolygon = points => points.flatMap((corner, i) => {
    const before = points[(i + points.length - 1) % points.length], after = points[(i + 1) % points.length];
    const incoming = Math.hypot(before[0] - corner[0], before[1] - corner[1]);
    const outgoing = Math.hypot(after[0] - corner[0], after[1] - corner[1]);
    if (!incoming || !outgoing) return [corner];
    const dot = ((before[0] - corner[0]) * (after[0] - corner[0])
      + (before[1] - corner[1]) * (after[1] - corner[1])) / (incoming * outgoing);
    // Already rounded authored faces retain their small corner segments.
    if (dot < -0.8) return [corner];
    const radius = Math.min(2, incoming * 0.16, outgoing * 0.16);
    const a = corner.map((v, axis) => v + (before[axis] - v) * radius / incoming);
    const b = corner.map((v, axis) => v + (after[axis] - v) * radius / outgoing);
    return Array.from({length: 6}, (_, j) => {
      const t = j / 5;
      return corner.map((v, axis) => (1 - t) ** 2 * a[axis] + 2 * (1 - t) * t * v + t ** 2 * b[axis]);
    });
  });
  for (const row of [...config.context_ponds, ...config.ponds]) {
    const coast = /coast|ocean|sea|海岸|海面/.test(row.id + row.label);
    const canal = canonicalPlacement && /canal|channel|水溝/.test(row.id + row.label);
    // Presentation rounding only; all topology IDs/anchors remain untouched.
    const visual = coast || canal ? row : {...row, polygon: roundedWaterPolygon(row.polygon)};
    const mesh = face(visual, config.ponds.includes(row) ? waterMaterial : contextWaterMaterial, 0.08);
    mesh.userData.visual_corner_rounding = !coast && !canal;
    if (canal) {
      // Narrow water channels retain narrow banks; they are not pond dikes.
      outerBank(row.polygon, 0.45, 0.32, row.z + 0.07, materials.soil);
      outerBank(row.polygon, 0.4, 0.12, row.z + 0.28, materials.bank);
      outline(row.polygon, 0.12, 0.2, row.z + 0.15, materials.deepWater);
    } else if (canonicalPlacement && row.liner) {
      // These outward strips fill the authored shared 3 m dikes without taking
      // a pond-width pad into the canal or changing the supplied water face.
      // Soil ends at the grass underside. Matching both visible tops caused
      // a depth tie even though the water and dike were already separated.
      outerBank(visual.polygon, 3, 0.22, row.z + 0.077, materials.soil);
      outerBank(visual.polygon, 3, 0.14, row.z + 0.257, materials.bank);
      outline(visual.polygon, 0.3, 0.27, row.z + 0.14, materials.deepWater);
    } else if (!coast) {
      outline(visual.polygon, 2.5, 0.72, row.z + 0.02, materials.soil);
      outline(visual.polygon, 2.2, 0.14, row.z + 0.45, materials.bank);
      outline(visual.polygon, 0.2, 0.14, row.z + 0.09, materials.deepWater);
    } else {
      // Coast-looking context is still an input polygon with the site's source.
      mesh.userData.context_kind = 'simulated-coastal-water';
    }
    if (config.ponds.includes(row)) {
      pick(mesh, row, 'Face');
      const selection = new THREE.Mesh(warningGeometry(visual.polygon), selectionMaterial);
      selection.name = `farm-pond-face-selection-${row.id}`;
      selection.position.z = row.z + 0.68; selection.visible = false; selection.raycast = () => {};
      world.add(selection); pondSelections.set(row.id, selection);
      const warning = new THREE.Mesh(warningGeometry(visual.polygon), warningMaterial);
      warning.position.z = row.z + 0.58; warning.visible = false;
      warning.name = `farm-pond-warning-${row.id}`; warning.raycast = () => {};
      world.add(warning); pondWarnings.set(row.id, warning);
    }
  }
  for (const row of config.paths) for (let index = 1; index < row.points.length; index++) {
    segment(row.points[index - 1], row.points[index], row.width, 0.18, row.z + 0.12, materials.path);
  }
  for (const row of config.context_dikes) for (let index = 1; index < row.points.length; index++) {
    segment(row.points[index - 1], row.points[index], row.width, 0.4, row.z, materials.soil);
    segment(row.points[index - 1], row.points[index], row.width * 0.8, 0.12, row.z + 0.25, materials.bank);
  }
  for (const row of config.paddies) {
    const mesh = face(row, materials.rice, 0.07); mesh.name = `farm-pond-paddy-${row.id}`;
    outline(row.polygon, 1.25, 0.28, row.z + 0.11, materials.bank);
    // Rows are a decorative pattern clipped to the supplied paddy polygon.
    const ys = row.polygon.map(point => point[1]);
    for (let y = Math.min(...ys) + 1.4; y < Math.max(...ys); y += 2.5) {
      const crossings = [];
      row.polygon.forEach((a, index) => {
        const b = row.polygon[(index + 1) % row.polygon.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) crossings.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      });
      crossings.sort((a, b) => a - b);
      for (let index = 1; index < crossings.length; index += 2) segment([crossings[index - 1], y], [crossings[index], y], 0.48, 0.28, row.z + 0.23, materials.leafLight);
    }
  }

  const equipment = new Map(), aerators = [];
  // Vertex colors preserve each opaque part's warm authored color in one
  // diffuse draw per rigid semantic root. Emitters, textures and connection
  // anchors retain independent materials/geometry and their original behavior.
  const constructionMaterial = diffuse('#ffffff', {vertexColors: true});
  const batchTwinParts = group => {
    for (const child of [...group.children]) if (child.isGroup) batchTwinParts(child);
    const rows = new Map();
    for (const child of group.children) {
      if (!child.isMesh || child.isInstancedMesh || child.userData.connection
          || child.name === 'farm-pond-sluice-panel') continue;
      const mat = child.material;
      if (mat.map || mat.transparent) continue;
      const opaqueDiffuse = (mat.isMeshStandardMaterial || mat.isMeshLambertMaterial)
        && !mat.transparent && !mat.map && mat.toneMapped && mat.side === THREE.FrontSide
        && mat.emissive?.getHex() === 0;
      const key = opaqueDiffuse ? 'opaque-construction' : mat.uuid;
      if (!rows.has(key)) rows.set(key, {parts: [], opaqueDiffuse});
      rows.get(key).parts.push(child);
    }
    for (const {parts, opaqueDiffuse} of rows.values()) {
      if (parts.length < 2 && !opaqueDiffuse) continue;
      const positions = [], normals = [], colors = [];
      for (const part of parts) {
        part.updateMatrix();
        const transformed = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
        transformed.applyMatrix4(part.matrix);
        positions.push(...transformed.attributes.position.array);
        normals.push(...transformed.attributes.normal.array);
        if (opaqueDiffuse) {
          const {r, g, b} = part.material.color;
          for (let i = 0; i < transformed.attributes.position.count; i++) colors.push(r, g, b);
        }
        transformed.dispose(); group.remove(part);
      }
      const geometry = own(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      if (opaqueDiffuse) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, opaqueDiffuse ? constructionMaterial : parts[0].material);
      mesh.name = 'farm-pond-twin-rigid-parts'; group.add(mesh);
    }
  };
  // A shared red badge stays legible at the workshop overview. It is a supplied
  // stopped-twin status, not a warning inferred from a circuit relationship.
  const markerPixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const dx = x - 15.5, dy = y - 15.5, inside = Math.hypot(dx, dy) < 15;
    const cross = Math.abs(dx) < 8 && Math.abs(dy) < 8 && Math.min(Math.abs(dx - dy), Math.abs(dx + dy)) < 2;
    markerPixels.set(cross ? [255, 247, 235, inside ? 255 : 0] : [220, 63, 53, inside ? 255 : 0], (y * 32 + x) * 4);
  }
  const markerTexture = own(new THREE.DataTexture(markerPixels, 32, 32)); markerTexture.needsUpdate = true;
  const markerMaterial = own(new THREE.SpriteMaterial({map: markerTexture, transparent: true,
    depthTest: false, depthWrite: false, toneMapped: false}));
  const stoppedMarker = group => {
    const sprite = new THREE.Sprite(markerMaterial); sprite.name = 'canonical-stopped-aerator-marker';
    sprite.visible = false; sprite.renderOrder = 10; sprite.raycast = () => {}; group.add(sprite); return sprite;
  };
  const statusLamp = group => {
    const lamp = box(group, statusMaterials.off, [0, -0.6, 2.05], [0.3, 0.3, 0.3], [0, 0, 0], 'sphere');
    lamp.name = 'canonical-equipment-status'; lamp.visible = false; return lamp;
  };
  const backupAccent = material('#57caba', {emissive: '#267d73', emissiveIntensity: 0.22});
  function aerator(group, backup = false) {
    const floatMaterial = backup ? backupAccent : materials.yellow;
    const motorMaterial = backup ? backupAccent : materials.orange;
    if (backup) group.userData.presentation_accent = 'turquoise-backup';
    for (const y of [-1.22, 1.22]) {
      box(group, floatMaterial, [0, y, 0.32], [5.5, 0.56, 0.53]);
      for (const x of [-2.75, 2.75]) box(group, floatMaterial, [x, y, 0.32], [0.35, 0.28, 0.27], [0, 0, 0], 'sphere');
    }
    box(group, materials.metal, [0, 0, 0.83], [3.3, 1.95, 0.22]);
    box(group, motorMaterial, [0, 0, 1.3], [1.55, 0.95, 0.86]);
    box(group, materials.cream, [0, 0, 1.8], [1.8, 1.1, 0.16]);
    for (let x = -0.5; x <= 0.5; x += 0.25) box(group, materials.dark, [x, -0.486, 1.35], [0.1, 0.02, 0.45]);
    box(group, materials.metal, [0, 0, 0.67], [0.11, 0.11, 5.1], [0, Math.PI / 2, 0], 'cylinder');
    const wheels = [];
    for (const x of [-2.05, 2.05]) {
      const wheel = new THREE.Group(); wheel.position.set(x, 0, 0.68); wheel.name = 'decorative-paddle-wheel';
      group.add(wheel); wheels.push(wheel);
      box(wheel, materials.cream, [0, 0, 0], [0.2, 0.2, 0.58], [0, Math.PI / 2, 0], 'cylinder');
      for (let i = 0; i < 8; i++) {
        const angle = i * TAU / 8;
        box(wheel, materials.metal, [0, Math.cos(angle) * 0.53, Math.sin(angle) * 0.53], [0.12, 1.0, 0.1], [angle, 0, 0]);
        box(wheel, floatMaterial, [0, Math.cos(angle) * 1.03, Math.sin(angle) * 1.03], [0.76, 0.39, 0.16], [angle, 0, 0]);
      }
    }
    if (backup) {
      // Portable unit's pale carry frame and teal floats distinguish it from
      // the original yellow pond aerators without changing its supplied pose.
      for (const y of [-0.66, 0.66]) box(group, materials.cream, [0, y, 1.92], [2.15, 0.09, 0.09]);
      for (const x of [-1.03, 1.03]) box(group, materials.cream, [x, 0, 1.65], [0.09, 1.4, 0.62]);
    }
    return wheels;
  }
  function pump(group, row) {
    box(group, materials.concrete, [0, 0, 0.14], [3.5, 2.7, 0.28]);
    box(group, materials.metal, [0, 0, 0.99], [0.75, 0.75, 1.6], [0, 0, 0], 'cylinder');
    box(group, materials.cream, [0, 0, 1.82], [1.7, 1.3, 0.24]);
    box(group, materials.orange, [0, 0, 2.16], [1.1, 0.88, 0.52]);
    for (const y of [-0.7, 0.7]) box(group, materials.dark, [0, y, 0.62], [2.15, 0.16, 0.18]);
    box(group, materials.cream, [3, 0, 0.7], [0.21, 0.21, 6], [0, Math.PI / 2, 0], 'cylinder');
    box(group, materials.cream, [6, 0, -0.2], [0.21, 0.21, 1.8], [0, 0, 0], 'cylinder');
    box(group, materials.cream, [6, 0, 0.69], [0.25, 0.25, 0.25], [0, 0, 0], 'sphere');
    // A separate intake drops into the authored canal on the opposite bank side.
    const intakeLength = Number.isFinite(row.intake_length_m) ? row.intake_length_m / (row.scale ?? 1) : 4;
    box(group, materials.dark, [-intakeLength / 2, 0, 0.7], [0.21, 0.21, intakeLength], [0, Math.PI / 2, 0], 'cylinder');
    const intake = box(group, materials.dark, [-intakeLength, 0, -0.2], [0.21, 0.21, 1.8], [0, 0, 0], 'cylinder');
    intake.name = 'farm-pond-pump-intake';
    intake.userData.connection = 'canal-intake';
    box(group, materials.dark, [-0.58, -0.68, 0.24], [0.22, 0.22, 0.12]);
    box(group, materials.dark, [0.58, 0.68, 0.24], [0.22, 0.22, 0.12]);
  }
  function feeder(group) {
    // Authored post-mounted hopper and spreading tray, rather than a cabinet.
    box(group, materials.concrete, [0, 0, 0.08], [0.72, 0.72, 0.16]);
    box(group, materials.metal, [0, 0, 0.95], [0.15, 0.15, 1.8], [0, 0, 0], 'cylinder');
    box(group, materials.cream, [0, 0, 1.95], [0.64, 0.64, 0.95], [0, 0, 0], 'cylinder');
    box(group, materials.orange, [0, 0, 1.36], [0.58, 0.58, 0.4], [Math.PI, 0, 0], 'cone');
    box(group, materials.yellow, [0, 0, 2.47], [0.75, 0.75, 0.13], [0, 0, 0], 'cylinder');
    box(group, materials.metal, [0, 0, 1.15], [0.22, 0.22, 0.25], [0, 0, 0], 'cylinder');
    box(group, materials.dark, [0, 0, 1.02], [0.8, 0.8, 0.1], [0, 0, 0], 'cylinder');
    box(group, materials.metal, [0, -0.64, 1.8], [0.26, 0.5, 0.2]);
  }
  function sluice(parent, row) {
    // Inventory rotation names the +X drainage direction. The gate width
    // belongs across that direction, along the dike, while its root remains
    // the canonical Node transform.
    const group = new THREE.Group(); group.name = 'farm-pond-sluice-wall';
    group.rotation.z = Math.PI / 2; parent.add(group);
    box(group, materials.concrete, [0, 0, 0.15], [4.1, 2.5, 0.3]);
    box(group, materials.deepWater, [0, 0, 0.34], [2.3, 3.0, 0.12]);
    for (const x of [-1.5, 1.5]) box(group, materials.concrete, [x, 0, 1.72], [0.42, 0.63, 3.2]);
    box(group, materials.metal, [0, 0, 3.34], [3.7, 0.65, 0.32]);
    const panel = box(group, materials.orange, [0, 0, 1.57], [2.45, 0.24, 2.05]);
    panel.name = 'farm-pond-sluice-panel';
    for (const x of [-0.82, 0, 0.82]) box(group, materials.metal, [x, -0.16, 1.57], [0.13, 0.1, 2.0]);
    box(group, materials.cream, [0, 0, 3.35], [0.08, 0.08, 1.75], [0, 0, 0], 'cylinder');
    box(group, materials.yellow, [0, 0, 4.21], [0.57, 0.57, 0.57], [0, 0, 0], 'ring');
    box(group, materials.yellow, [0, 0, 4.21], [1.05, 0.1, 0.08]);
    if (Number.isFinite(row.drain_length_m)) {
      const scale = row.scale ?? 1, length = row.drain_length_m / scale;
      // A site-authored construction span reaches its catalogued channel.
      // Neither the selected frame nor the renderer computes a water route.
      box(parent, materials.concrete, [length / 2, 0, -0.48 / scale], [length, 1.3 / scale, 0.1 / scale]);
      box(parent, materials.deepWater, [length / 2, 0, -0.42 / scale], [length, 1.12 / scale, 0.04 / scale]);
      for (const side of [-1, 1]) box(parent, materials.concrete,
        [length / 2, side * 0.64 / scale, -0.23 / scale], [length, 0.12 / scale, 0.4 / scale]);
      const outlet = new THREE.Object3D(); outlet.position.set(length, 0, -0.42 / scale); parent.add(outlet);
      outlet.name = 'farm-pond-sluice-outlet';
      outlet.userData.connection = 'drain-outlet';
    }
  }
  function generator(group) {
    box(group, materials.concrete, [0, 0, 0.13], [4.9, 3.4, 0.26]);
    box(group, materials.dark, [0, 0, 0.48], [4.5, 2.8, 0.42]);
    box(group, materials.yellow, [0, 0, 1.51], [3.95, 2.55, 1.75]);
    box(group, materials.cream, [0, 0, 2.47], [4.45, 2.92, 0.24]);
    box(group, materials.metal, [0.3, -1.3, 1.56], [1.0, 0.04, 0.7]);
    for (let x = -1.65; x < -0.2; x += 0.19) box(group, materials.dark, [x, -1.29, 1.5], [0.1, 0.03, 1.08]);
    box(group, materials.dark, [1.25, 0.8, 2.87], [0.18, 0.18, 1.0], [0, 0, 0], 'cylinder');
    box(group, materials.dark, [1.1, 0.8, 3.36], [0.18, 0.18, 0.6], [0, Math.PI / 2, 0], 'cylinder');
    for (const x of [-1.4, 1.4]) for (const y of [-1.25, 1.25]) {
      box(group, materials.dark, [x, y, 0.42], [0.42, 0.42, 0.24], [Math.PI / 2, 0, 0], 'cylinder');
    }
  }
  function powerCabinet(group) {
    box(group, materials.concrete, [0, 0, 0.14], [2.6, 2.0, 0.28]);
    box(group, materials.metal, [0, 0, 1.62], [1.8, 1.3, 2.8]);
    box(group, materials.cream, [0, 0, 3.12], [2.13, 1.63, 0.25]);
    box(group, materials.dark, [0, -0.66, 2.0], [0.8, 0.04, 0.56]);
    box(group, materials.yellow, [0.64, -0.7, 1.3], [0.09, 0.08, 0.35]);
  }
  function weatherStation(group) {
    box(group, materials.concrete, [0, 0, 0.12], [1.9, 1.9, 0.24]);
    box(group, materials.cream, [0, 0, 2.6], [0.14, 0.14, 5.1], [0, 0, 0], 'cylinder');
    box(group, materials.metal, [0.8, 0, 3.0], [1.55, 0.08, 0.16]);
    box(group, materials.cream, [1.2, 0, 3.1], [0.34, 0.34, 0.4], [0, 0, 0], 'cylinder');
    box(group, materials.yellow, [0, 0, 4.88], [1.7, 0.12, 0.12]);
    for (const x of [-0.9, 0.9]) box(group, materials.dark, [x, 0, 4.95], [0.31, 0.31, 0.22], [0, 0, 0], 'sphere');
  }
  const workerMaterials = {skin: material('#d6aa82'), shirt: material('#e3a054'),
    trousers: material('#38665e'), boots: material('#51443a'), hat: material('#dac698')};
  const workerLampMaterial = material(palette.lamp, {emissive: palette.lamp, emissiveIntensity: 0, toneMapped: false});
  const workerGlowMaterial = own(glowMaterial.clone());
  const workerHaloMaterial = own(haloMaterial.clone());
  const modelLabel = (group, text, at, width, color) => {
    // Canvas text is presentation only, attached to the canonical twin root.
    const canvas = globalThis.document?.createElement('canvas');
    if (!canvas) return null;
    canvas.width = 512; canvas.height = 96;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#17352ddd'; context.fillRect(0, 0, 512, 96);
    context.strokeStyle = color; context.lineWidth = 6; context.strokeRect(3, 3, 506, 90);
    context.font = `500 ${text.length <= 4 ? 64 : 42}px sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillStyle = '#fff8e7'; context.fillText(text, 256, 49);
    const texture = own(new THREE.CanvasTexture(canvas));
    const mat = own(new THREE.SpriteMaterial({map: texture, transparent: true,
      depthWrite: false, toneMapped: false}));
    const label = new THREE.Sprite(mat); label.name = 'simulated-twin-presentation-label';
    label.userData = {label: text, simulation_label: '模擬', source_ref: config.source_ref};
    label.position.set(...at); label.scale.set(width, width * 96 / 512, 1);
    label.raycast = () => {}; group.add(label); return label;
  };
  function worker(group) {
    // Original rounded farm figure. Joint poses, like its position, are supplied
    // by the bake; the renderer has no walking clock or route calculation.
    group.userData.model_kind = 'original-stylised-farm-worker';
    group.userData.presentation_scale = WORKER_PRESENTATION_SCALE;
    group.userData.size_notice = '人員模型以 1.75 倍展示尺寸呈現；非現地身高或量測尺寸';
    const figure = new THREE.Group(); figure.name = 'worker-presentation-geometry';
    figure.scale.setScalar(WORKER_PRESENTATION_SCALE); group.add(figure);
    // Geometry remains local to this child; canonical root placement is never enlarged.
    const canonicalRoot = group; group = figure;
    box(group, workerMaterials.shirt, [0, 0, 1.12], [0.25, 0.33, 0.43], [0, 0, 0], 'sphere');
    box(group, workerMaterials.trousers, [0, 0, 0.79], [0.22, 0.27, 0.18], [0, 0, 0], 'sphere');
    box(group, workerMaterials.skin, [0, 0, 1.62], [0.25, 0.24, 0.27], [0, 0, 0], 'sphere');
    box(group, workerMaterials.hat, [0, 0, 1.84], [0.66, 0.64, 0.07], [0, 0, 0], 'cylinder');
    box(group, workerMaterials.hat, [0, 0, 1.9], [0.43, 0.41, 0.17], [0, 0, 0], 'cylinder');
    box(group, workerMaterials.skin, [0.23, 0, 1.61], [0.08, 0.08, 0.09], [0, 0, 0], 'sphere');
    for (const y of [-0.09, 0.09]) box(group, materials.dark, [0.238, y, 1.68], [0.027, 0.026, 0.028], [0, 0, 0], 'sphere');
    box(group, materials.cream, [0.22, 0, 1.13], [0.055, 0.48, 0.08]);
    // Pale vest bands and a headlamp keep the original figure readable at night.
    box(group, materials.cream, [0.24, 0, 1.22], [0.055, 0.48, 0.065]);
    box(group, workerMaterials.trousers, [0.4, 0, 1.77], [0.11, 0.3, 0.14]);
    box(group, workerLampMaterial, [0.467, 0, 1.77], [0.045, 0.17, 0.09]);
    // Emissive headlamp and a raised light pool show the artistic source.
    // No per-worker point light adds another light loop to every scene pixel.
    halo(group, [0.49, 0, 1.77], 0.5, workerHaloMaterial);
    const pool = new THREE.Mesh(glowPlane, workerGlowMaterial);
    pool.name = 'simulated-worker-headlamp-pool'; pool.position.set(1.4, 0, 0.02);
    pool.scale.set(2.8, 2.1, 1); pool.raycast = () => {}; group.add(pool); lightAccents.push(pool);
    modelLabel(canonicalRoot, '場務人員（模擬）', [0, 0, 4.1], 7.2, '#e3a054');
    const joints = {};
    for (const [side, y] of [['left', 0.16], ['right', -0.16]]) {
      const leg = new THREE.Group(); leg.position.set(0, y, 0.74); group.add(leg);
      box(leg, workerMaterials.trousers, [0, 0, -0.28], [0.17, 0.18, 0.52]);
      box(leg, workerMaterials.boots, [0.07, 0, -0.62], [0.32, 0.23, 0.23]);
      const arm = new THREE.Group(); arm.position.set(0, y * 2, 1.33); group.add(arm);
      box(arm, workerMaterials.shirt, [0, 0, -0.2], [0.15, 0.17, 0.39]);
      box(arm, workerMaterials.skin, [0, 0, -0.43], [0.095, 0.11, 0.18], [0, 0, 0], 'sphere');
      joints[`${side}_leg`] = leg; joints[`${side}_arm`] = arm;
    }
    return joints;
  }
  for (const row of config.assets) {
    const group = groupAt(row, 'farm-pond-equipment', true);
    let wheels = [], joints = null;
    const isAerator = ['aerator', 'backup-aerator'].includes(row.kind);
    if (isAerator) wheels = aerator(group, row.kind === 'backup-aerator');
    else if (row.kind === 'worker') joints = worker(group);
    else if (row.kind === 'feeder') feeder(group);
    else if (row.kind === 'pump') pump(group, row);
    else if (row.kind === 'sluice') sluice(group, row);
    else if (['generator', 'generator-power', 'backup-generator'].includes(row.kind)) generator(group);
    else if (row.kind === 'weather-station') weatherStation(group);
    else powerCabinet(group);
    if (row.kind === 'backup-aerator') modelLabel(group, '備援水車', [0, 0, 3.45], 8, '#57caba');
    if (canonicalPlacement) batchTwinParts(group);
    const record = {id: row.id, kind: row.kind, group, wheels, joints, lamp: statusLamp(group),
      halo: isAerator ? halo(group, [0, -0.6, 2.05], 2.2, statusHalos.off) : null, state: null,
      marker: isAerator ? stoppedMarker(group) : null,
      angle: 0, speed: 0, lastElapsed: null, warning: false, config: row};
    if (wheels.length) aerators.push(record);
    if (equipment.has(row.id)) throw new TypeError(`pond-world/v1: duplicate twin ${row.id}`);
    equipment.set(row.id, record); pick(group, row, 'Asset');
  }

  // Static authored circulation paths become soft ribbons in twin-local space.
  // The canonical root supplies every runtime transform, including backup moves.
  // Shared scrolling noise costs no textures, particles or per-frame geometry.
  const foamPhase = {value: 0}, foamBrightness = {value: 0.45};
  for (const row of aerators) {
    const authored = row.config, scale = authored.scale ?? 1, angle = authored.rotation;
    const points = authored.foam_path
      ? authored.foam_path.map(([x, y]) => {
        const dx = x - authored.position[0], dy = y - authored.position[1];
        return new THREE.Vector3((dx * Math.cos(angle) + dy * Math.sin(angle)) / scale,
          (-dx * Math.sin(angle) + dy * Math.cos(angle)) / scale, 0.25 / scale);
      })
      : [new THREE.Vector3(0, 0, 0.25 / scale), new THREE.Vector3(0, -6, 0.25 / scale)];
    const curve = new THREE.CatmullRomCurve3(points);
    const length = curve.getLength() * scale;
    const samples = curve.getSpacedPoints(authored.foam_path ? 80 : 12);
    const vertices = [], uvs = [], indices = [];
    samples.forEach((point, i) => {
      const progress = i / (samples.length - 1);
      const before = samples[Math.max(0, i - 1)], after = samples[Math.min(samples.length - 1, i + 1)];
      const tangent = after.clone().sub(before).normalize();
      const width = (authored.foam_path ? 1.15 / scale : 2.2) * (1 - progress * 0.68);
      for (const side of [-1, 1]) {
        vertices.push(point.x - tangent.y * width * side, point.y + tangent.x * width * side, point.z);
        uvs.push(progress * length, (side + 1) / 2);
      }
      if (i) { const a = (i - 1) * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const geometry = own(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const mat = own(new THREE.MeshBasicMaterial({color: palette.foam, transparent: true,
      opacity: 0, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true}));
    mat.onBeforeCompile = shader => {
      shader.uniforms.uFoamPhase = foamPhase; shader.uniforms.uFoamBrightness = foamBrightness;
      shader.uniforms.uFoamLength = {value: length};
      shader.vertexShader = `varying vec2 vFoamUV;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFoamUV = uv;');
      shader.fragmentShader = `varying vec2 vFoamUV;
        uniform float uFoamPhase, uFoamBrightness, uFoamLength;
        float foamHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float foamNoise(vec2 p) {
          vec2 cell = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(foamHash(cell), foamHash(cell + vec2(1.0, 0.0)), f.x),
            mix(foamHash(cell + vec2(0.0, 1.0)), foamHash(cell + vec2(1.0, 1.0)), f.x), f.y);
        }
        ${shader.fragmentShader}`
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec2 drift = vec2(vFoamUV.x - uFoamPhase * 0.9, vFoamUV.y * 3.5);
          float broad = foamNoise(drift * vec2(0.8, 1.0));
          float fine = foamNoise(drift * 3.1 + vec2(broad * 1.3, uFoamPhase * 0.13));
          float across = abs(vFoamUV.y * 2.0 - 1.0);
          float edge = 1.0 - smoothstep(0.28 + broad * 0.22, 0.72 + broad * 0.25, across);
          float progress = clamp(vFoamUV.x / max(uFoamLength, 0.01), 0.0, 1.0);
          float churn = exp(-vFoamUV.x * 0.65);
          float density = smoothstep(0.25, 0.78, broad * 0.65 + fine * 0.35);
          float taper = pow(1.0 - progress, 1.2) * smoothstep(0.0, 0.18, vFoamUV.x);
          diffuseColor.a *= edge * taper * (0.18 + density * 0.52 + churn * 0.22);
          diffuseColor.rgb *= uFoamBrightness * (0.78 + fine * 0.22);`);
    };
    mat.customProgramCacheKey = () => 'farm-pond-soft-foam-v1';
    const ribbon = new THREE.Mesh(geometry, mat);
    ribbon.name = 'farm-pond-aerator-foam'; ribbon.visible = false; ribbon.raycast = () => {};
    ribbon.userData = {entity_id: row.id, simulation_label: '模擬', source_ref: config.source_ref,
      presentation: 'Decorative render-clock foam; visibility follows this twin canonical state'};
    row.group.add(ribbon); row.foam = ribbon;
  }

  const roofGeometry = own(new THREE.BufferGeometry());
  const roofVertices = [];
  const corners = [[-0.5, -0.5, 0], [0.5, -0.5, 0], [0, -0.5, 1], [-0.5, 0.5, 0], [0.5, 0.5, 0], [0, 0.5, 1]];
  for (const index of [0, 1, 2, 3, 5, 4, 0, 2, 5, 0, 5, 3, 1, 4, 5, 1, 5, 2]) roofVertices.push(...corners[index]);
  roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roofVertices, 3)); roofGeometry.computeVertexNormals();
  for (const row of config.sheds) {
    const group = groupAt(row, 'farm-pond-shed', canonicalPlacement);
    if (row.sheet_roof) {
      group.userData.model_kind = 'open-sheet-roof-work-shed';
      box(group, materials.concrete, [0, 0, 0.03], [10, 8, 0.12]);
      for (const x of [-4.6, 4.6]) for (const y of [-3.6, 3.6]) {
        box(group, materials.metal, [x, y, 1.8], [0.18, 0.18, 3.6]);
      }
      for (const y of [-3.6, 3.6]) box(group, materials.metal, [0, y, 3.45], [9.7, 0.18, 0.18]);
      box(group, materials.roof, [0, 0, 3.7], [10.8, 8.6, 0.14], [0.08, 0, 0]);
      for (let x = -5.1; x <= 5.1; x += 0.64) {
        box(group, materials.metal, [x, 0, 3.79], [0.045, 8.5, 0.045], [0.08, 0, 0]);
      }
      // Rear sheeting only: the front and sides stay open for inspection of
      // the canonical electrical twins and sheltered generator inside.
      box(group, materials.roof, [0, 3.74, 0.7], [9.8, 0.09, 1.4]);
      if (row.covered_departure) {
        // Dated site presentation reaches an existing topology Node; this
        // awning does not add a walkable corridor or move the shed twin.
        const [x, y] = row.covered_departure;
        const startX = 5;
        box(group, materials.concrete, [(startX + x) / 2, y, 0.03], [x - startX + 0.6, 2.6, 0.12]);
        box(group, materials.roof, [(startX + x) / 2, y, 3.15], [x - startX + 0.9, 3.1, 0.12]);
        for (const dy of [-1.35, 1.35]) box(group, materials.metal, [x + 0.15, y + dy, 1.55], [0.12, 0.12, 3.1]);
      }
    } else {
      box(group, materials.concrete, [0, 0, 0.12], [8.6, 5.8, 0.24]);
      box(group, materials.cream, [0, 0, 1.85], [8, 5.2, 3.45]);
      const roof = new THREE.Mesh(roofGeometry, materials.roof); roof.position.z = 3.5; roof.scale.set(9.2, 6.4, 1.75); group.add(roof);
      box(group, materials.trunk, [0, -2.64, 1.38], [1.62, 0.13, 2.5]);
      for (const x of [-2.5, 2.5]) {
        box(group, materials.metal, [x, -2.67, 2.13], [1.8, 0.14, 1.55]);
        box(group, windowMaterial, [x, -2.76, 2.13], [1.52, 0.06, 1.27]);
        halo(group, [x, -2.82, 2.13], 2.7);
        box(group, materials.cream, [x, -2.81, 2.13], [0.08, 0.05, 1.28]);
      }
    }
    const lampY = row.sheet_roof ? -3.5 : -2.92;
    box(group, materials.metal, [0, lampY, 3.08], [1.2, 1.2, 0.15]);
    if (canonicalPlacement) batchTwinParts(group);
    const lantern = box(group, windowMaterial, [0, lampY, 2.82], [0.3, 0.3, 0.46]);
    lantern.name = 'simulated-artistic-shed-lantern';
    pick(group, row, canonicalPlacement ? 'Asset' : 'building');
    glowPool(group, [0, -5.1, 0.27], [12, 9, 1]);
    if (canonicalPlacement) {
      if (equipment.has(row.id)) throw new TypeError(`pond-world/v1: duplicate twin ${row.id}`);
      equipment.set(row.id, {id: row.id, kind: 'work-shed', group, wheels: [], lamp: statusLamp(group),
        state: null, angle: 0, lastElapsed: null, warning: false, config: row});
    }
  }
  for (const row of config.lamps) {
    const group = groupAt(row, 'farm-pond-path-lamp');
    box(group, materials.dark, [0, 0, 1.8], [0.14, 0.14, 3.6]);
    box(group, windowMaterial, [0, 0, 3.5], [0.55, 0.55, 0.8]);
    box(group, materials.dark, [0, 0, 4.02], [0.85, 0.85, 0.18]);
    batchTwinParts(group);
    halo(group, [0, 0, 3.5], 3.8);
    // A local pool stays above its receiver; smaller decorative coverage
    // reduces transparent overdraw without altering canonical bank heights.
    glowPool(group, [0, 0, 0.38], [11, 11, 1]);
    pick(group, {...row, label: row.label ?? '塭岸燈（模擬）'}, 'artistic-light');
  }
  for (const row of config.vegetation) {
    const [x, y, z] = row.position, s = row.scale;
    if (row.kind === 'tree') {
      instance('cylinder', materials.trunk, [x, y, z + s * 1.8], [s * 0.28, s * 0.28, s * 3.6]);
      instance('sphere', materials.leaf, [x, y, z + s * 4.3], [s * 2.0, s * 1.65, s * 2.3]);
      instance('sphere', materials.leafLight, [x + s * 0.8, y - s * 0.35, z + s * 5.0], [s * 1.2, s * 1.25, s * 1.3]);
    } else if (row.kind === 'reeds') {
      for (let i = 0; i < 5; i++) {
        const angle = i * 2.4, dx = Math.cos(angle) * s * 0.45, dy = Math.sin(angle) * s * 0.45;
        instance('cylinder', materials.leaf, [x + dx, y + dy, z + s * 0.9], [s * 0.055, s * 0.055, s * (1.6 + i * 0.12)], [0.08 * Math.sin(angle), 0.1 * Math.cos(angle), 0]);
        instance('sphere', materials.trunk, [x + dx, y + dy, z + s * (1.7 + i * 0.07)], [s * 0.12, s * 0.12, s * 0.35]);
      }
    } else {
      for (let i = 0; i < 3; i++) instance('cone', materials.leafLight,
        [x + Math.sin(i * 2.1) * s * 0.3, y + Math.cos(i * 2.1) * s * 0.3, z + s * 0.35],
        [s * 0.25, s * 0.2, s * (0.65 + i * 0.13)], [0.08, -0.2 + i * 0.2, 0]);
    }
  }
  for (const {shape, mat, rows} of batches.values()) {
    const mesh = new THREE.InstancedMesh(geometries[shape], mat, rows.length);
    mesh.name = `farm-pond-dressing-${shape}`;
    rows.forEach(({at, scale, rotation}, index) => {
      dummy.position.set(...at); dummy.scale.set(...scale); dummy.rotation.set(...rotation); dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.raycast = () => {}; world.add(mesh);
  }
  scene.add(world);

  const selectionGeometry = own(new THREE.RingGeometry(1, 1.3, 48));
  for (const row of equipment.values()) {
    const ring = new THREE.Mesh(selectionGeometry, selectionMaterial);
    ring.name = 'farm-pond-twin-selection'; ring.visible = false; ring.raycast = () => {};
    const radius = ({aerator: 3.6, 'backup-aerator': 3.6, feeder: 1.5, worker: 1.5,
      pump: 2.4, sluice: 3, 'work-shed': 7})[row.kind] ?? 2.3;
    ring.scale.set(radius, radius, 1);
    // Above water and bank surfaces, without changing any twin transform.
    ring.position.z = ['aerator', 'backup-aerator'].includes(row.kind) ? 0.85 : 0.08;
    ring.renderOrder = 2; row.group.add(ring); row.selection = ring;
  }
  world.userData.selectedTwinId = null;

  const replacementIds = new Set([...config.ponds, ...config.assets, ...(canonicalPlacement ? config.sheds : [])].map(row => row.id));
  // Close workshop views need only nearby triangles from the retained regional
  // meshes. This is display culling of existing geometry, never new land facts.
  // Independent compact buffers avoid submitting the entire county every RAF.
  const points = [...config.ponds, ...config.context_ponds, ...config.paddies].flatMap(row => row.polygon);
  const center = [(Math.min(...points.map(p => p[0])) + Math.max(...points.map(p => p[0]))) / 2,
    (Math.min(...points.map(p => p[1])) + Math.max(...points.map(p => p[1]))) / 2];
  const bounds = [center[0] - 450, center[1] - 450, center[0] + 450, center[1] + 450];
  const contextMeshes = new Map(), contextWaterMaterials = new Map(), terrainMaterials = new Map();
  const compactContext = object => {
    const original = object.geometry, position = original?.attributes?.position;
    // The 2026-10-07 compressed terrain already has distance-dependent detail.
    // Keep its distant landscape visible behind the ponds on the opening view.
    if (object.userData?.regional_context_compressed) return;
    if (contextMeshes.has(object) || object.userData?.authority_scope !== 'context-only'
        || !position || position.count < 10000 || original.groups.length || Array.isArray(object.material)) return;
    object.updateWorldMatrix(true, false);
    const matrix = object.matrixWorld.elements, xs = new Float32Array(position.count), ys = new Float32Array(position.count);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      xs[i] = matrix[0]*x + matrix[4]*y + matrix[8]*z + matrix[12];
      ys[i] = matrix[1]*x + matrix[5]*y + matrix[9]*z + matrix[13];
    }
    const sourceIndex = original.index?.array, count = sourceIndex?.length ?? position.count;
    const indices = [], vertices = [], remap = new Map();
    for (let i = 0; i < count; i += 3) {
      const a = sourceIndex ? sourceIndex[i] : i, b = sourceIndex ? sourceIndex[i+1] : i+1, c = sourceIndex ? sourceIndex[i+2] : i+2;
      if (Math.max(xs[a],xs[b],xs[c]) < bounds[0] || Math.min(xs[a],xs[b],xs[c]) > bounds[2]
          || Math.max(ys[a],ys[b],ys[c]) < bounds[1] || Math.min(ys[a],ys[b],ys[c]) > bounds[3]) continue;
      for (const id of [a,b,c]) {
        if (!remap.has(id)) { remap.set(id, vertices.length); vertices.push(id); }
        indices.push(remap.get(id));
      }
    }
    const geometry = own(new THREE.BufferGeometry());
    for (const [name, attribute] of Object.entries(original.attributes)) {
      const values = new attribute.array.constructor(vertices.length * attribute.itemSize);
      vertices.forEach((id, target) => {
        for (let axis = 0; axis < attribute.itemSize; axis++) values[target*attribute.itemSize+axis] = attribute.array[id*attribute.itemSize+axis];
      });
      geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize, attribute.normalized));
    }
    geometry.setIndex(indices);
    if (vertices.length) { geometry.computeBoundingBox(); geometry.computeBoundingSphere(); }
    const originalMaterial = object.material;
    let closeMaterial = originalMaterial;
    if (object.userData.layer === 'water') closeMaterial = contextWaterMaterial;
    if (object.userData.layer === 'terrain' && config.ground_blend) {
      closeMaterial = own(originalMaterial.clone());
      const {center: blendCenter, inner_radius: inner, outer_radius: outer, color} = config.ground_blend;
      closeMaterial.onBeforeCompile = shader => {
        shader.uniforms.uGroundTint = {value: new THREE.Color(color)};
        shader.uniforms.uGroundCenter = {value: new THREE.Vector2(...blendCenter)};
        shader.uniforms.uGroundRadii = {value: new THREE.Vector2(inner, outer)};
        shader.vertexShader = `varying vec2 vGroundXY;\n${shader.vertexShader}`
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundXY = (modelMatrix * vec4(position, 1.0)).xy;');
        shader.fragmentShader = `varying vec2 vGroundXY;\nuniform vec3 uGroundTint;\nuniform vec2 uGroundCenter;\nuniform vec2 uGroundRadii;\n${shader.fragmentShader}`
          .replace('#include <color_fragment>', `#include <color_fragment>
            float blend = 1.0 - smoothstep(uGroundRadii.x, uGroundRadii.y, distance(vGroundXY, uGroundCenter));
            float grain = sin(vGroundXY.x * 0.19) * sin(vGroundXY.y * 0.23) * 0.025;
            diffuseColor.rgb = mix(diffuseColor.rgb, uGroundTint * (1.0 + grain), blend * 0.85);`);
      };
      closeMaterial.customProgramCacheKey = () => 'farm-pond-ground-blend-v1';
    }
    contextMeshes.set(object, {original, geometry, originalMaterial, closeMaterial,
      originalTriangles:count/3, closeTriangles:indices.length/3});
  };
  const updateContext = () => {
    scene.traverse(object => {
      if (!object.isMesh) return;
      // Will, 2026-10-07: interpolated static terrain paint looks smeared.
      // Use the site's neutral display palette on the retained compressed
      // ground only; geometry, normals and canonical environment stay intact.
      if (groundColor && object.userData?.regional_context_compressed && !Array.isArray(object.material)
          && !terrainMaterials.has(object)) {
        const original = object.material, neutral = own(original.clone());
        neutral.vertexColors = false; neutral.color.set(groundColor); neutral.needsUpdate = true;
        terrainMaterials.set(object, original); object.material = neutral;
      }
      compactContext(object);
      if (canonicalPlacement && object.userData?.authority_scope === 'context-only'
          && object.userData.layer === 'water' && !Array.isArray(object.material)) {
        if (!contextWaterMaterials.has(object)) contextWaterMaterials.set(object, object.material);
        object.material = contextWaterMaterial;
      }
    });
    const close = api.camera && Math.hypot(api.camera.position.x-center[0], api.camera.position.y-center[1], api.camera.position.z) < 350;
    for (const [object, row] of contextMeshes) {
      object.geometry = close ? row.geometry : row.original;
      object.material = canonicalPlacement && object.userData.layer === 'water' ? contextWaterMaterial
        : close ? row.closeMaterial : row.originalMaterial;
    }
    world.userData.contextBudget = {mode:close?'nearby retained triangles':'full retained region',
      originalTriangles:[...contextMeshes.values()].reduce((sum,row)=>sum+row.originalTriangles,0),
      submittedContextTriangles:[...contextMeshes.values()].reduce((sum,row)=>sum+(close?row.closeTriangles:row.originalTriangles),0)};
  };
  const findPlaceholders = () => {
    if (!world.visible) return;
    scene.traverse(object => {
      if (!object.isMesh || object.userData?.source_ref === config.source_ref && object.name.startsWith('farm-pond-')) return;
      // DT main.js stamps props from package_site_candidate.py with propId.
      // Exact ID fallbacks cover named GLBs; never blanket-hide props/terrain/roads.
      const id = object.userData?.propId ?? object.userData?.origin_id ?? object.userData?.entity_id ?? object.name;
      if (!replacementIds.has(id)) return;
      if (!hidden.has(object)) hidden.set(object, object.visible);
      object.visible = false;
    });
  };
  let disposed = false, lastSignature = null;
  const applyLocalAccents = preset => {
    // These are stylised water glints and labelled local light sources only.
    // Missing environment stays neutral; timestamps never choose a preset.
    const accents = PRESET_ACCENTS[preset] ?? {water: 0.5, windows: 0, lamps: 0, glow: 0, status: 0};
    waterAccent.value = accents.water;
    foamBrightness.value = 0.28 + accents.water * 0.62;
    windowMaterial.emissiveIntensity = accents.windows;
    workerLampMaterial.emissiveIntensity = accents.windows;
    workerGlowMaterial.opacity = accents.glow * 0.7; workerHaloMaterial.opacity = accents.glow;
    glowMaterial.opacity = accents.glow; haloMaterial.opacity = accents.glow;
    statusHalos.on.opacity = statusHalos.fault.opacity = accents.glow;
    statusHalos.off.opacity = 0;
    statusMaterials.on.emissiveIntensity = faultMaterial.emissiveIntensity = accents.status;
    // Fully transparent planes/sprites still cost draw submissions. Hide
    // day/off accents rather than sending zero-alpha geometry to the GPU.
    for (const accent of lightAccents) accent.visible = accent.material.opacity > 0;
    world.userData.nightAccents = {...accents};
  };
  const counts = {ponds: config.ponds.length, contextPonds: config.context_ponds.length, paddies: config.paddies.length,
    equipment: equipment.size, aerators: aerators.length, sheds: config.sheds.length, vegetation: config.vegetation.length,
    feeders: config.assets.filter(row => row.kind === 'feeder').length, foamRibbons: aerators.length,
    pathLamps: config.lamps.length, contextDikes: config.context_dikes.length, staticBatches: batches.size};
  world.userData.counts = counts;
  const readPlacements = payload => {
    const fail = detail => {
      world.visible = false;
      throw new TypeError(`farm-pond-world-state: ${detail}; canonical twin placement protects runtime authority `
        + '(Will/CTO pond twin brief, 2026-10-04; repository AGENTS.md Spatial and runtime truth)');
    };
    if (!Array.isArray(payload.assetTransforms)) fail('assetTransforms must include every twin');
    const placements = new Map();
    for (const row of payload.assetTransforms) {
      if (!equipment.has(row?.id) || placements.has(row.id) || !finitePoint(row.position, 3)
          || !Number.isFinite(row.rotation) || !Number.isFinite(row.scale) || row.scale <= 0) {
        fail('assetTransforms needs unique declared IDs, finite XYZ position, rotation radians and positive scalar scale');
      }
      placements.set(row.id, row);
    }
    if (placements.size !== equipment.size) fail(`assetTransforms missing ${[...equipment.keys()].filter(id => !placements.has(id)).join(', ')}`);
    return placements;
  };
  const offCommand = api.onAppCommand((name, payload) => {
    if (name === SELECT_COMMAND && !disposed) {
      const id = equipment.has(payload?.id) || pondSelections.has(payload?.id) ? payload.id : null;
      for (const row of equipment.values()) row.selection.visible = row.id === id;
      for (const [pondId, selection] of pondSelections) selection.visible = pondId === id;
      world.userData.selectedTwinId = id;
      return;
    }
    if (name !== COMMAND || disposed) return;
    if (typeof payload?.sampledAt !== 'string' || !payload.sampledAt.trim()
        || !Number.isFinite(payload.elapsedSeconds) || payload.elapsedSeconds < 0
        || !Number.isInteger(payload.frameIndex) || payload.frameIndex < 0
        || !Array.isArray(payload.equipment) || !Array.isArray(payload.events)) {
      throw new TypeError('farm-pond-world-state requires canonical sampledAt, elapsedSeconds, frameIndex, equipment and events');
    }
    const placements = canonicalPlacement ? readPlacements(payload) : null;
    const states = new Map(payload.equipment.filter(row => typeof row?.id === 'string' && typeof row.state === 'string')
      .map(row => [row.id, row.state]));
    const warnings = new Map();
    for (const event of payload.events) {
      if (!WARNING_KINDS.has(event?.kind) || !Array.isArray(event.subjectIds)) continue;
      if (Array.isArray(payload.activeAlertIds) && !payload.activeAlertIds.includes(event.id)) continue;
      for (const id of event.subjectIds) {
        if (!warnings.has(id)) warnings.set(id, []);
        warnings.get(id).push(event.kind);
      }
    }
    waterPhase.value = payload.elapsedSeconds * 0.7;
    for (const row of equipment.values()) {
      const placement = placements?.get(row.id);
      if (placement) {
        row.group.position.set(...placement.position.slice(0, 3));
        row.group.rotation.set(0, 0, placement.rotation);
        row.group.scale.setScalar(placement.scale);
        row.group.userData.canonical_transform = structuredClone(placement);
        if (row.joints) for (const [joint, object] of Object.entries(row.joints)) {
          const angle = placement.pose?.[joint];
          if (!Number.isFinite(angle)) throw new TypeError(`worker ${row.id} requires canonical ${joint} pose`);
          object.rotation.y = angle;
        }
      }
      const state = states.get(row.id) ?? null;
      const running = RUNNING_STATES.has(state);
      row.state = state; row.lastElapsed = payload.elapsedSeconds; row.warning = warnings.has(row.id);
      row.lamp.visible = state !== null && row.kind !== 'worker';
      row.lamp.material = state === 'fault' ? faultMaterial : row.warning ? warningMaterial
        : running ? statusMaterials.on : statusMaterials.off;
      if (row.halo) {
        row.halo.visible = row.lamp.visible;
        row.halo.material = state === 'fault' ? statusHalos.fault : running ? statusHalos.on : statusHalos.off;
      }
      if (row.marker) {
        row.marker.visible = ['off', 'fault'].includes(state);
        row.marker.position.set(0, 0, 1.1 + 1.4 / row.group.scale.z);
        // The guided close views retain stopped-state markers without covering
        // the worker, backup label or churn. Only presentation size changes.
        const markerSize = payload.story?.chapters?.length ? 1.25 : 3.2;
        row.marker.scale.set(markerSize / row.group.scale.x, markerSize / row.group.scale.y, 1);
      }
      row.group.userData.canonical_state = state; row.group.userData.warning_kinds = warnings.get(row.id) ?? [];
    }
    for (const [id, warning] of pondWarnings) { warning.visible = warnings.has(id); warning.userData.warning_kinds = warnings.get(id) ?? []; }
    const preset = typeof payload.environment?.preset_hint === 'string' ? payload.environment.preset_hint : null;
    const firstCommand = !world.visible;
    world.visible = true;
    if (firstCommand) findPlaceholders();
    applyLocalAccents(preset);
    const observed = {simulation_label: '模擬', source_ref: config.source_ref, sampledAt: payload.sampledAt,
      elapsedSeconds: payload.elapsedSeconds, frameIndex: payload.frameIndex, phase: preset,
      sceneLightingAuthority: world.userData.scene_lighting_authority,
      counts: {...counts, hiddenPlaceholders: hidden.size}, equipment: [...equipment.values()].map(row =>
        ({id: row.id, state: row.state, rotating: RUNNING_STATES.has(row.state), warning: row.warning,
          ...(canonicalPlacement ? {transform: structuredClone(placements.get(row.id)), stoppedMarker: !!row.marker?.visible} : {})})),
      warningSubjectIds: [...warnings.keys()].sort(),
      ...(payload.story ? {story: structuredClone(payload.story)} : {})};
    world.userData.canonicalState = observed;
    const signature = JSON.stringify(observed);
    if (signature !== lastSignature) { lastSignature = signature; api.appEvent(OBSERVED, observed); }
  });
  // Late static meshes and distance LOD need four discovery passes per second,
  // not two complete scene traversals and fresh summaries every rendered frame.
  // Discovery timing controls display cost; render animation changes only local
  // visual parts. Equipment state and root transforms stay canonical.
  let lastContextUpdate = -Infinity, lastAnimationTime = null;
  const offFrame = api.onFrame(time => {
    if (Number.isFinite(time)) {
      const dt = lastAnimationTime === null ? 0 : Math.max(0, (time - lastAnimationTime) / 1000);
      lastAnimationTime = time;
      if (world.visible) {
        foamPhase.value += dt;
        for (const row of aerators) {
          // Only the copied per-twin canonical state selects the animation target.
          // Replay time, environment, alerts and other twins do not drive spin.
          const running = RUNNING_STATES.has(row.state), target = running ? PADDLE_SPEED : 0;
          const previous = row.speed;
          const ramp = Math.min(dt, Math.abs(target - previous) / PADDLE_ACCELERATION);
          row.speed = previous + Math.sign(target - previous) * PADDLE_ACCELERATION * ramp;
          row.angle += (previous + row.speed) * ramp / 2 + target * (dt - ramp);
          // At the bottom, negative X rotation pushes toward local -Y, downstream along the foam.
          for (const wheel of row.wheels) wheel.rotation.x = -row.angle;
          row.group.userData.decorative_rotation = -row.angle;
          const opacity = row.foam.material.opacity;
          row.foam.material.opacity = running ? Math.min(1, opacity + dt) : Math.max(0, opacity - dt);
          row.foam.visible = row.foam.material.opacity > 0;
        }
      }
    }
    if (!Number.isFinite(time) || time - lastContextUpdate >= 250) {
      lastContextUpdate = Number.isFinite(time) ? time : lastContextUpdate;
      findPlaceholders(); updateContext();
    }
  });
  api.appEvent(READY, {simulation_label: '模擬', source_ref: config.source_ref, counts});
  return () => {
    if (disposed) return;
    disposed = true; offCommand?.(); offFrame?.(); unregisters.forEach(unregister => unregister());
    scene.remove(world);
    for (const [object, row] of contextMeshes) { object.geometry = row.original; object.material = row.originalMaterial; }
    for (const [object, mat] of contextWaterMaterials) object.material = mat;
    for (const [object, mat] of terrainMaterials) object.material = mat;
    for (const [object, visible] of hidden) object.visible = visible;
    for (const resource of resources) resource.dispose();
    world.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
  };
}
