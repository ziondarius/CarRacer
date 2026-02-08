import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

const root = document.getElementById("scene-root");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe7ff);
scene.fog = new THREE.Fog(0xbfe7ff, 70, 220);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6.5, -12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
root.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xffffff, 0x88aa77, 1.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 0.95);
sun.position.set(24, 35, -14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: 0xb3e59f, roughness: 0.95, metalness: 0.02 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(400, 120, 0x5f8f52, 0x87b778);
grid.position.y = 0.01;
scene.add(grid);

const car = new THREE.Group();
scene.add(car);

const body = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, 0.75, 4.3),
  new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45, metalness: 0.2 })
);
body.position.y = 1.05;
body.castShadow = true;
car.add(body);

const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.55, 0.72, 2),
  new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.5 })
);
cabin.position.set(0, 1.7, -0.1);
cabin.castShadow = true;
car.add(cabin);

const wheelGeometry = new THREE.CylinderGeometry(0.42, 0.42, 0.42, 24);
const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
const wheelOffsets = [
  [-1.15, 0.45, 1.38],
  [1.15, 0.45, 1.38],
  [-1.15, 0.45, -1.38],
  [1.15, 0.45, -1.38],
];

const wheels = wheelOffsets.map(([x, y, z]) => {
  const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, y, z);
  wheel.castShadow = true;
  car.add(wheel);
  return wheel;
});

car.position.set(0, 0, 0);

const state = {
  speed: 0,
  heading: 0,
  steering: 0,
  keys: {
    forward: false,
    backward: false,
    left: false,
    right: false,
  },
};

const MAX_FWD_SPEED = 28;
const MAX_REV_SPEED = -14;
const ACCEL = 28;
const BRAKE = 38;
const COAST = 9;
const TURN_RATE = 1.85;
const STEER_RETURN = 4.2;
const WHEEL_SPIN_SCALE = 1.9;

const cameraOffset = new THREE.Vector3(0, 6, -12);
const cameraLookTarget = new THREE.Vector3();
const cameraDesired = new THREE.Vector3();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function onKeyChange(event, isDown) {
  const key = event.key.toLowerCase();

  if (key === "arrowup" || key === "w") state.keys.forward = isDown;
  if (key === "arrowdown" || key === "s") state.keys.backward = isDown;
  if (key === "arrowleft" || key === "a") state.keys.left = isDown;
  if (key === "arrowright" || key === "d") state.keys.right = isDown;
}

window.addEventListener("keydown", (event) => onKeyChange(event, true));
window.addEventListener("keyup", (event) => onKeyChange(event, false));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function updateCar(dt) {
  if (state.keys.forward) {
    state.speed += ACCEL * dt;
  } else if (state.keys.backward) {
    state.speed -= BRAKE * dt;
  } else if (state.speed > 0) {
    state.speed = Math.max(0, state.speed - COAST * dt);
  } else if (state.speed < 0) {
    state.speed = Math.min(0, state.speed + COAST * dt);
  }
  state.speed = clamp(state.speed, MAX_REV_SPEED, MAX_FWD_SPEED);

  const steerInput = (state.keys.left ? 1 : 0) - (state.keys.right ? 1 : 0);
  if (steerInput !== 0) {
    state.steering += steerInput * TURN_RATE * dt;
    state.steering = clamp(state.steering, -0.6, 0.6);
  } else if (state.steering > 0) {
    state.steering = Math.max(0, state.steering - STEER_RETURN * dt);
  } else if (state.steering < 0) {
    state.steering = Math.min(0, state.steering + STEER_RETURN * dt);
  }

  const speedFactor = state.speed / MAX_FWD_SPEED;
  state.heading += state.steering * speedFactor * 2.1 * dt;
  car.rotation.y = state.heading;

  car.position.x += Math.sin(state.heading) * state.speed * dt;
  car.position.z += Math.cos(state.heading) * state.speed * dt;

  for (const wheel of wheels) {
    wheel.rotation.x += state.speed * dt * WHEEL_SPIN_SCALE;
  }

  wheels[0].rotation.y = state.steering;
  wheels[1].rotation.y = state.steering;
}

function updateCamera() {
  const rotatedOffset = cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), state.heading);
  cameraDesired.copy(car.position).add(rotatedOffset);
  camera.position.lerp(cameraDesired, 0.09);

  cameraLookTarget.copy(car.position);
  cameraLookTarget.y += 1.2;
  camera.lookAt(cameraLookTarget);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  updateCar(dt);
  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
