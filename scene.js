import * as THREE from 'three';
import { FontLoader } from './vendor/FontLoader.js';
import { TextGeometry } from './vendor/TextGeometry.js';
import { elements, roles, steps, FINAL_INDEX } from './story.js';

// The lighting, podiums and camera movement follow department-year-2026.
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .3, ...extra });
const neon = color => new THREE.MeshBasicMaterial({ color, toneMapped: false });
function mesh(parent, geometry, mat, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, mat);
  object.position.set(...position); object.castShadow = true; object.receiveShadow = true;
  parent.add(object); return object;
}
function box(parent, w, h, d, position, color = 0x102036) {
  return mesh(parent, new THREE.BoxGeometry(w, h, d), material(color), position);
}
function outline(parent, w, h, d, position, color) {
  const object = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .8, toneMapped: false }));
  object.position.set(...position); parent.add(object); return object;
}
function texture(draw, width = 1024, height = 256) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; return result;
}
function label(parent, value, position, width = 4, color = '#8ed3e7', flat = true) {
  const map = texture((ctx, w, h) => {
    ctx.fillStyle = color; ctx.font = `500 ${Math.min(66, 1700 / value.length)}px Rubik`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(value, w / 2, h / 2);
  });
  const plane = mesh(parent, new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), position);
  if (flat) plane.rotation.x = -Math.PI / 2;
  plane.castShadow = false; plane.userData.decoration = true; plane.raycast = () => {};
  return plane;
}
function figure(parent, x, z, color, height = 1) {
  mesh(parent, new THREE.CylinderGeometry(.14, .23, .58, 12), material(color, { emissive: color, emissiveIntensity: .12 }), [x, .75 + height * .15, z]);
  mesh(parent, new THREE.SphereGeometry(.17, 16, 12), material(0xb9d6de), [x, 1.22 + height * .15, z]);
}

export function createDepartmentScene(container, { onOpen, onReady, onError, reduced: initiallyReduced = false }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('role', 'img'); renderer.domElement.setAttribute('aria-label', 'Темна неонова платформа з чотирма інтерактивними складовими знайомства');
  container.prepend(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#060b16'); scene.fog = new THREE.Fog('#060b16', 55, 145);
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 180); camera.position.set(24, 24, 32);
  const base = camera.position.clone(), look = new THREE.Vector3(0, .5, 0);
  const ambient = new THREE.HemisphereLight(0x86b5ff, 0x12162a, 1.8); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0x91bbff, 3.2); sun.position.set(-15, 25, 15); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 85 });
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .035; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xa45cff, 1.5); fill.position.set(16, 9, -14); scene.add(fill);
  const spotlight = new THREE.PointLight(0x5be7ff, 25, 16, 2); scene.add(spotlight);
  const floor = mesh(scene, new THREE.PlaneGeometry(220, 220), material(0x060b16, { metalness: .45 }), [0, -.5, 0]); floor.rotation.x = -Math.PI / 2; floor.castShadow = false; floor.userData.decoration = true;
  const world = new THREE.Group(); scene.add(world);
  box(world, 23, .42, 19, [0, -.25, .5], 0x091322); box(world, 22.8, .09, 18.8, [0, .005, .5], 0x0d182a);
  outline(world, 23.03, .43, 19.03, [0, -.24, .5], 0x3279ac); outline(world, 22.84, .05, 18.84, [0, .04, .5], 0x56dfff);
  const grid = new THREE.GridHelper(23, 23, 0x24577d, 0x18314e); grid.position.set(0, .06, .5); grid.scale.z = 19 / 23; grid.material.transparent = true; grid.material.opacity = .38; world.add(grid);
  const core = new THREE.Group(); world.add(core);
  const fallback = label(core, 'EORE', [0, .35, .4], 5.4, '#7bdcf6', false);
  new FontLoader().load('./vendor/helvetiker_regular.typeface.json', font => {
    if (!alive) return;
    const geometry = new TextGeometry('EORE', { font, size: 1.65, depth: .4, curveSegments: 6, bevelEnabled: true, bevelThickness: .035, bevelSize: .025, bevelSegments: 2 });
    geometry.computeBoundingBox(); const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
    mesh(core, geometry, material(0x183044, { emissive: 0x2589b1, emissiveIntensity: .7, metalness: .5 }), [-width / 2, .09, -.5]);
    core.remove(fallback); fallback.geometry.dispose(); fallback.material.map.dispose(); fallback.material.dispose();
  }, undefined, () => {});
  label(core, 'ТВОЯ УЧАСТЬ МАЄ ЗНАЧЕННЯ', [0, .1, 2.1], 6, '#8acde4');
  label(core, 'ВІДДІЛ ПРОТИМІННОЇ ДІЯЛЬНОСТІ', [0, .1, 2.8], 5.4, '#426e8e');
  const glowMap = texture((ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gradient.addColorStop(0, '#ffffff66'); gradient.addColorStop(.4, '#ffffff22'); gradient.addColorStop(1, '#ffffff00'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  }, 256, 256);
  const loader = new THREE.TextureLoader();
  function photo(parent, path, position, width = 3.9, height = 2.65, accent = '#5be7ff') {
    box(parent, width + .12, height + .12, .13, [position[0], position[1], position[2] - .09], 0x0b1425);
    outline(parent, width + .14, height + .14, .15, [position[0], position[1], position[2] - .08], accent);
    const map = loader.load(path); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const plane = mesh(parent, new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, toneMapped: false }), position); plane.castShadow = false;
  }
  const layers = [], routes = [], markers = [];
  elements.forEach((element, index) => {
    const group = new THREE.Group(); group.position.set(element.pos[0], 0, element.pos[1]);
    group.userData = { index: index + 1, element: element.id, reveal: 0, target: 0, delay: 0 }; world.add(group); layers.push(group);
    box(group, 5.4, .2, 4.6, [0, .17, 0], 0x0a1222); box(group, 5.3, .06, 4.5, [0, .30, 0], 0x152039);
    group.userData.line = outline(group, 5.45, .25, 4.65, [0, .17, 0], element.accent);
    label(group, `${String(index + 1).padStart(2, '0')} / ${element.name.toUpperCase()}`, [0, .345, 1.95], 4.5, element.accent);
    const halo = mesh(group, new THREE.PlaneGeometry(8, 7), new THREE.MeshBasicMaterial({ map: glowMap, color: element.accent, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), [0, .075, 0]);
    halo.rotation.x = -Math.PI / 2; halo.castShadow = false; halo.userData.decoration = true; halo.raycast = () => {}; group.userData.halo = halo;
    if (element.id === 'purpose') {
      photo(group, element.image, [0, 2.2, -.95], 4.1, 2.75, element.accent);
      [-1.4, -.45, .55, 1.5].forEach((x, i) => figure(group, x, .9, i % 2 ? 0x2a6380 : 0x773f5a));
      label(group, 'ЗНАННЯ ДЛЯ БЕЗПЕЧНІШОЇ ПОВЕДІНКИ', [0, 3.9, -.95], 3.8, element.accent, false);
    } else if (element.id === 'roles') {
      roles.forEach((role, i) => {
        const card = new THREE.Group(); const col = i % 2, row = Math.floor(i / 2); card.position.set((col - .5) * 2.25, 1.53 + row * 1.3, row ? -.8 : .25); card.userData.role = role.id; group.add(card);
        box(card, 2, 1.12, .12, [0, 0, 0], 0x10253a); outline(card, 2.03, 1.15, .14, [0, 0, 0], role.color);
        label(card, role.name.toUpperCase(), [0, -.20, .08], 1.9, role.color, false);
        const symbol = mesh(card, new THREE.TorusGeometry(.20, .025, 8, 24), neon(role.color), [0, .20, .1]); symbol.rotation.z = i * Math.PI / 4;
        if (i === 2) box(card, .3, .18, .13, [0, .20, .15], 0x6e54a2);
      });
    } else if (element.id === 'experience') {
      photo(group, element.image, [0, 2.2, -.7], 4.1, 2.75, element.accent);
      [-1.35, 0, 1.35].forEach((x, i) => {
        box(group, 1.14, .16, .9, [x, .5, 1.1], 0x273451); outline(group, 1.17, .19, .93, [x, .5, 1.1], element.accent);
        label(group, ['КОМАНДА', 'СПІЛКУВАННЯ', 'ТВОРЧІСТЬ'][i], [x, .6, 1.1], 1.08, element.accent);
      });
    } else {
      steps.forEach((step, i) => {
        const stone = new THREE.Group(); stone.position.set(-1.65 + i * 1.1, .45 + i * .27, 0); stone.userData.step = i; group.add(stone);
        box(stone, .9, .23 + i * .13, 1.7, [0, 0, 0], 0x33384b); outline(stone, .93, .26 + i * .13, 1.73, [0, 0, 0], element.accent);
        label(stone, String(i + 1).padStart(2, '0'), [0, .28 + i * .065, 0], .75, element.accent);
        const pin = mesh(stone, new THREE.SphereGeometry(.10, 12, 10), neon(element.accent), [0, .7, -.45]); pin.userData.decoration = true; pin.raycast = () => {};
      });
      label(group, 'ЗНАЙОМСТВО / ПІДГОТОВКА / УЧАСТЬ', [0, .4, -1.55], 4.3, element.accent);
    }
    const from = index ? elements[index - 1].pos : [0, 2.7];
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(from[0], .1, from[1]), new THREE.Vector3((from[0] + element.pos[0]) / 2, .13, (from[1] + element.pos[1]) / 2), new THREE.Vector3(...[element.pos[0], .1, element.pos[1]])]);
    const route = mesh(world, new THREE.TubeGeometry(path, 40, .028, 6, false), neon(element.accent)); route.castShadow = false; route.userData.decoration = true; route.raycast = () => {}; routes.push(route);
    const button = document.createElement('button'); button.className = 'scene-marker'; button.dataset.element = element.id; button.style.setProperty('--marker-color', element.accent); button.textContent = `${String(index + 1).padStart(2, '0')} ${element.short} ↗`; button.setAttribute('aria-label', `Відкрити: ${element.name}`); button.hidden = true;
    button.addEventListener('click', event => onOpen({ element: element.id, point: [event.clientX, event.clientY] })); container.querySelector('#scene-markers').append(button); markers.push(button);
  });
  let alive = true, ready = false, reduced = initiallyReduced, stage = 0, cinematic = false, moving = null, previous = performance.now(), lastRender = 0, hovered = null, mouseX = 0, mouseY = 0, frameId;
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function resize() {
    const { width, height } = container.getBoundingClientRect(); if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.fov = innerWidth <= 700 ? 46 : 37;
    camera.setViewOffset(width, height, innerWidth <= 700 || cinematic ? 0 : -width * .15, 0, width, height); camera.updateProjectionMatrix();
  }
  function move(position, target, instant = false, duration = 1600) {
    const to = new THREE.Vector3(...position), lookTo = new THREE.Vector3(...target);
    if (innerWidth <= 700) to.sub(lookTo).multiplyScalar(stage === 0 || stage === FINAL_INDEX ? .9 : 1.04).add(lookTo);
    moving = { start: performance.now(), duration: instant || reduced ? 0 : duration, from: base.clone(), to, lookFrom: look.clone(), lookTo };
  }
  function reveal(count, instant) {
    const now = performance.now(); let newly = 0;
    layers.forEach((group, i) => {
      const d = group.userData, target = i < count ? 1 : 0;
      if (target && !d.target) d.delay = now + newly++ * 100;
      d.target = target;
      if (instant || reduced) { d.reveal = target; d.delay = 0; }
    });
    container.dataset.visibleCount = String(count);
  }
  function setChapter(index, position, target, { instant = false } = {}) {
    stage = index; cinematic = false; resize(); reveal(Math.min(elements.length, index), instant);
    const element = elements[Math.min(elements.length, index) - 1];
    spotlight.intensity = element && index !== FINAL_INDEX ? 28 : 9;
    if (element) { spotlight.color.set(element.accent); spotlight.position.set(element.pos[0], 4, element.pos[1] + 1); }
    move(position, target, instant);
  }
  function metadata(object) {
    const data = {}; let node = object;
    while (node) {
      if (node.userData.role) data.role = node.userData.role;
      if (node.userData.step !== undefined) data.step = node.userData.step;
      if (node.userData.index) {
        if (!node.visible || node.userData.target !== 1 || node.userData.reveal < .88) return null;
        return { ...data, index: node.userData.index, element: node.userData.element };
      }
      if (!node.visible) return null; node = node.parent;
    }
    return null;
  }
  function hit(event) {
    if (cinematic) return null;
    const bounds = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1); raycaster.setFromCamera(pointer, camera);
    for (const result of raycaster.intersectObjects(world.children, true)) {
      if (result.object.userData.decoration || result.object.isLineSegments || result.object.isGridHelper) continue;
      const data = metadata(result.object); if (data) return { ...data, point: [event.clientX, event.clientY] };
    }
    return null;
  }
  renderer.domElement.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') { const bounds = renderer.domElement.getBoundingClientRect(); mouseX = (event.clientX - bounds.left) / bounds.width - .5; mouseY = (event.clientY - bounds.top) / bounds.height - .5; }
    const picked = hit(event); hovered = picked?.index || null; renderer.domElement.style.cursor = picked ? 'pointer' : 'default';
  });
  renderer.domElement.addEventListener('pointerleave', () => { hovered = null; mouseX = mouseY = 0; });
  let down = null;
  renderer.domElement.addEventListener('pointerdown', event => { down = [event.clientX, event.clientY]; });
  renderer.domElement.addEventListener('pointerup', event => {
    if (!down) return; const moved = Math.hypot(event.clientX - down[0], event.clientY - down[1]); down = null;
    if (moved <= 9) { const picked = hit(event); if (picked) onOpen(picked); }
  });
  renderer.domElement.addEventListener('pointercancel', () => { down = null; });
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); alive = false; markers.forEach(button => button.hidden = true); onError('3D-сцену призупинено браузером. Історії доступні через кнопки й каталог.'); });
  function animate(now) {
    if (!alive) return; frameId = requestAnimationFrame(animate);
    if (document.hidden || now - lastRender < 1000 / 30) return;
    lastRender = now; const dt = Math.min(.05, Math.max(0, (now - previous) / 1000)); previous = now;
    if (moving) {
      const r = moving.duration ? Math.min(1, (now - moving.start) / moving.duration) : 1;
      const t = r < .5 ? 4 * r * r * r : 1 - Math.pow(-2 * r + 2, 3) / 2;
      base.lerpVectors(moving.from, moving.to, t); base.y += reduced ? 0 : Math.sin(r * Math.PI) * .8; look.lerpVectors(moving.lookFrom, moving.lookTo, t); if (r === 1) moving = null;
    }
    camera.position.copy(base); if (!reduced && !cinematic) { camera.position.x += mouseX * .25; camera.position.y -= mouseY * .13; } camera.lookAt(look); camera.updateMatrixWorld();
    const bounds = container.getBoundingClientRect();
    layers.forEach((group, i) => {
      const d = group.userData;
      if (now < d.delay && d.target) { group.visible = false; routes[i].visible = false; markers[i].hidden = true; return; }
      d.reveal += (d.target - d.reveal) * (reduced ? 1 : 1 - Math.exp(-dt * 5.3)); if (Math.abs(d.target - d.reveal) < .001) d.reveal = d.target;
      group.visible = d.reveal > .005; group.position.y = (1 - d.reveal) * 3.4; group.scale.setScalar(.78 + d.reveal * .22); group.rotation.y = (1 - d.reveal) * -.12;
      d.line.material.opacity = hovered === i + 1 ? 1 : .7; d.halo.material.opacity = hovered === i + 1 ? .6 : stage === i + 1 ? .42 : .20;
      const route = routes[i]; route.visible = group.visible; route.geometry.setDrawRange(0, Math.floor(route.geometry.index.count * d.reveal / 3) * 3);
      const point = new THREE.Vector3(elements[i].pos[0], 4.25, elements[i].pos[1] - .5).project(camera);
      const x = (point.x + 1) * bounds.width / 2, y = (1 - point.y) * bounds.height / 2;
      markers[i].hidden = cinematic || d.reveal < .95 || point.z > 1 || x < 35 || x > bounds.width - 35 || y < 25 || y > bounds.height - 10;
      markers[i].style.left = `${x}px`; markers[i].style.top = `${y}px`;
    });
    renderer.render(scene, camera);
    if (!ready) { ready = true; container.dataset.ready = 'true'; onReady(); }
  }
  resize(); frameId = requestAnimationFrame(animate);
  return {
    setChapter, resize,
    overview(position, target) { move(position, target); },
    setReduced(value) { reduced = value; if (value) { layers.forEach(group => { group.userData.reveal = group.userData.target; group.userData.delay = 0; }); if (moving) moving.duration = 0; } },
    cinematicShot(kind, index, shot) { cinematic = true; resize(); reveal(shot.count, true); move(shot.camera, shot.look, reduced, shot.duration); },
    clearCinematic() { cinematic = false; resize(); },
    dispose() { alive = false; cancelAnimationFrame(frameId); markers.forEach(button => button.remove()); world.traverse(object => { object.geometry?.dispose(); for (const mat of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) { mat.map?.dispose(); mat.dispose(); } }); renderer.dispose(); renderer.domElement.remove(); },
  };
}
