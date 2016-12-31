const query = require('./lib/util/query');
const isMobile = require('./lib/util/isMobile');
const createApp = require('./lib/createApp');
const createLoop = require('raf-loop');
const classes = require('element-class');

// some hand-picked colors
const palettes = [ '#f7803c', '#b3204d', '#cbe86b', '#2b4e72', '#d4ee5e', '#ff003c', '#e6ac27', '#d95b43', '#a3a948', '#838689', '#556270', '#292c37', '#fa6900', '#eb7b59', '#ff4e50', '#9d9d93', '#00a8c6', '#2b4e72', '#e4844a', '#9cc4e4', '#515151' ];
let paletteIndex = 0;

const createTubes = require('./lib/components/createTubes');

const infoElement = document.querySelector('.info-container');

const app = createApp({
  canvas: document.querySelector('#canvas'),
  alpha: true
});

const background = 'hsl(0, 0%, 100%)';
document.body.style.background = background;
app.renderer.setClearColor(0xffffff, 0);

setupCursor();
start();

function setupCursor () {
  if (query.orbitControls) {
    const onMouseGrab = () => classes(app.canvas).add('grabbing');
    const onMouseUngrab = () => classes(app.canvas).remove('grabbing');
    app.canvas.addEventListener('mousedown', onMouseGrab, false);
    document.addEventListener('mouseup', onMouseUngrab, false);
  }
  classes(app.canvas).add(query.orbitControls ? 'grab' : 'clickable');
}

function start () {
  const line = createTubes(app);
  app.scene.add(line.object3d);

  const skipFrames = query.skipFrames;
  let intervalTime = 0;

  // no context menu on mobile...
  if (isMobile) app.canvas.oncontextmenu = () => false;

  app.canvas.addEventListener('touchstart', tap);
  app.canvas.addEventListener('mousedown', tap);
  if (isMobile) infoElement.textContent = 'tap to interact';
  infoElement.style.visibility = 'visible';

  if (query.renderOnce) tick(0);
  else createLoop(tick).start();

  function tick (dt = 0) {
    intervalTime += dt;
    if (intervalTime > 1000 / 20) {
      intervalTime = 0;
    } else if (skipFrames) {
      return;
    }
    line.update(dt);
    app.tick(dt);
    app.render();
  }

  function tap (ev) {
    line.setPalette(palettes[paletteIndex++ % palettes.length]);
  }
}
