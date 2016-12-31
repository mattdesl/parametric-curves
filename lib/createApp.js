/*
  This is a generic "ThreeJS Application"
  helper which sets up a renderer and camera
  controls.
 */

const createControls = require('orbit-controls');
const assign = require('object-assign');
const defined = require('defined');
const mouseEventOffset = require('mouse-event-offset');
const tweenr = require('tweenr')();

const isIOS = /(iOS|iPhone|iPod|iPad)/i.test(navigator.userAgent);

const query = require('./util/query');

module.exports = createApp;
function createApp (opt = {}) {
  // Scale for retina
  const dpr = defined(query.dpr, Math.min(2, window.devicePixelRatio));

  const cameraDistance = 1.75;
  const theta = 0 * Math.PI / 180;
  const angleOffset = 20;
  const mouseOffset = new THREE.Vector2();
  const tmpQuat1 = new THREE.Quaternion();
  const tmpQuat2 = new THREE.Quaternion();
  const AXIS_X = new THREE.Vector3(1, 0, 0);
  const AXIS_Y = new THREE.Vector3(0, 1, 0);

  // Our WebGL renderer with alpha and device-scaled
  const renderer = new THREE.WebGLRenderer(assign({
    alpha: false,
    stencil: false,
    antialias: true // default enabled
  }, opt));
  renderer.setPixelRatio(dpr);
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = true;
  renderer.gammaInput = true;
  renderer.sortObjects = false;

  // Add the <canvas> to DOM body
  const canvas = renderer.domElement;

  // perspective camera
  const near = 0.1;
  const far = 10;
  const fieldOfView = 65;
  const camera = new THREE.PerspectiveCamera(fieldOfView, 1, near, far);
  const target = new THREE.Vector3();

  // 3D scene
  const scene = new THREE.Scene();

  // slick 3D orbit controller with damping
  const useOrbitControls = query.orbitControls;
  let controls;
  if (useOrbitControls) {
    controls = createControls(assign({
      canvas,
      theta,
      distanceBounds: [ 0.5, 5 ],
      distance: cameraDistance
    }, opt));
  }

  // Update renderer size
  window.addEventListener('resize', resize);

  const app = assign({}, {
    tick,
    camera,
    scene,
    renderer,
    canvas,
    render
  });

  app.width = 0;
  app.height = 0;
  app.top = 0;
  app.left = 0;

  // Setup initial size & aspect ratio
  resize();
  tick();
  createMouseParallax();
  return app;

  function tick (dt = 0) {
    const aspect = app.width / app.height;

    if (useOrbitControls) {
      // update camera controls
      controls.update();
      camera.position.fromArray(controls.position);
      camera.up.fromArray(controls.up);
      target.fromArray(controls.direction).add(camera.position);
      camera.lookAt(target);
    } else {
      const phi = Math.PI / 2;
      camera.position.x = Math.sin(phi) * Math.sin(theta);
      camera.position.y = Math.cos(phi);
      camera.position.z = Math.sin(phi) * Math.cos(theta);

      const radius = cameraDistance;
      const radianOffset = angleOffset * Math.PI / 180;
      const xOff = mouseOffset.y * radianOffset;
      const yOff = mouseOffset.x * radianOffset;
      tmpQuat1.setFromAxisAngle(AXIS_X, -xOff);
      tmpQuat2.setFromAxisAngle(AXIS_Y, -yOff);
      tmpQuat1.multiply(tmpQuat2);
      camera.position.applyQuaternion(tmpQuat1);
      camera.position.multiplyScalar(radius);

      target.set(0, 0, 0);
      camera.lookAt(target);
    }

    // Update camera matrices
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  function render () {
    renderer.render(scene, camera);
  }

  function resize () {
    let width = defined(query.width, window.innerWidth);
    let height = defined(query.height, window.innerHeight);

    if (isIOS) { // weird hack for iOS 10 rotate to landscape
      height += 2;
    }

    app.width = width;
    app.height = height;
    renderer.setSize(width, height);
    tick(0);
    render();
  }

  function createMouseParallax () {
    const tmp = [ 0, 0 ];
    window.addEventListener('mousemove', ev => {
      mouseEventOffset(ev, app.canvas, tmp);
      tweenr.cancel().to(mouseOffset, {
        x: (tmp[0] / app.width * 2 - 1),
        y: (tmp[1] / app.height * 2 - 1),
        ease: 'expoOut',
        duration: 0.5
      });
    });
  }
}
