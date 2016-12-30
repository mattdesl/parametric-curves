require('./lib/util/override-clone-uniforms')();

const query = require('./lib/util/query');
const createApp = require('./lib/createApp');
const createLoop = require('raf-loop');
const classes = require('element-class');

// some hand-picked colors
const palettes = [ '#f7803c', '#b3204d', '#cbe86b', '#2b4e72', '#d4ee5e', '#ff003c', '#e6ac27', '#d95b43', '#a3a948', '#838689', '#556270', '#292c37', '#fa6900', '#eb7b59', '#ff4e50', '#9d9d93', '#00a8c6', '#2b4e72', '#e4844a', '#9cc4e4', '#515151' ];
let paletteIndex = 0;

const createTubes = require('./lib/components/createTubes');

const app = createApp({
  canvas: document.querySelector('#canvas')
});

const background = 'hsl(0, 0%, 90%)';
document.body.style.background = background;
app.renderer.setClearColor(background, 1);

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
  const parentWindow = window.parent === window ? null : window.parent;
  const line = createTubes(app);
  app.scene.add(line.object3d);

  const skipFrames = query.skipFrames;
  let intervalTime = 0;

  app.canvas.addEventListener('touchstart', tap);
  app.canvas.addEventListener('mousedown', tap);

  let firstFrame = true;
  const iframe = parentWindow.document.querySelector('#curve-demo');

  if (query.renderOnce) tick(0);
  else createLoop(tick).start();

  function tick (dt = 0) {
    if (parentWindow && iframe) {
      const rect = iframe.getBoundingClientRect();
      const inside = rect.top <= parentWindow.innerHeight && rect.bottom >= 0;
      if (!inside && !firstFrame) return;
    }
    intervalTime += dt;
    if (intervalTime > 1000 / 20) {
      intervalTime = 0;
    } else if (skipFrames) {
      return;
    }
    line.update(dt);
    app.tick(dt);
    app.render();
    firstFrame = false;
  }

  function tap (ev) {
    line.setPalette(palettes[paletteIndex++ % palettes.length]);
  }
}
