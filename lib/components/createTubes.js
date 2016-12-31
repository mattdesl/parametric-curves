const createTubeGeometry = require('../geom/createTubeGeometry');
const glslify = require('glslify');
const path = require('path');
const newArray = require('new-array');
const tweenr = require('tweenr')();
const isMobile = require('../util/isMobile');

const {
  randomFloat
} = require('../util/random');

module.exports = function (app) {
  const totalMeshes = isMobile ? 30 : 40;
  const isSquare = false;
  const subdivisions = isMobile ? 200 : 300;

  const numSides = isSquare ? 4 : 8;
  const openEnded = false;
  const geometry = createTubeGeometry(numSides, subdivisions, openEnded);

  const baseMaterial = new THREE.RawShaderMaterial({
    vertexShader: glslify(path.resolve(__dirname, '../shaders/tube.vert')),
    fragmentShader: glslify(path.resolve(__dirname, '../shaders/tube.frag')),
    side: THREE.FrontSide,
    extensions: {
      deriviatives: true
    },
    defines: {
      lengthSegments: subdivisions.toFixed(1),
      ROBUST: false,
      ROBUST_NORMALS: true, // can be disabled for a slight optimization
      FLAT_SHADED: isSquare
    },
    uniforms: {
      thickness: { type: 'f', value: 1 },
      time: { type: 'f', value: 0 },
      color: { type: 'c', value: new THREE.Color('#303030') },
      animateRadius: { type: 'f', value: 0 },
      animateStrength: { type: 'f', value: 0 },
      index: { type: 'f', value: 0 },
      totalMeshes: { type: 'f', value: totalMeshes },
      radialSegments: { type: 'f', value: numSides }
    }
  });

  const lines = newArray(totalMeshes).map((_, i) => {
    const t = totalMeshes <= 1 ? 0 : i / (totalMeshes - 1);

    const material = baseMaterial.clone();
    material.uniforms = THREE.UniformsUtils.clone(material.uniforms);
    material.uniforms.index.value = t;
    material.uniforms.thickness.value = randomFloat(0.005, 0.0075);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false; // to avoid ThreeJS errors
    return mesh;
  });

  // add to a parent container
  const container = new THREE.Object3D();
  lines.forEach(mesh => container.add(mesh));

  return {
    object3d: container,
    update,
    setPalette
  };

  // animate in a new color palette
  function setPalette (palette) {
    tweenr.cancel();
    lines.forEach((mesh, i) => {
      const uniforms = mesh.material.uniforms;
      uniforms.color.value.set(palette);

      const delay = i * 0.004;
      uniforms.animateRadius.value = 0;
      uniforms.animateStrength.value = 1;
      tweenr.to(uniforms.animateRadius, { value: 1, duration: 0.5, delay, ease: 'epxoOut' });
      tweenr.to(uniforms.animateStrength, { value: 0, duration: 1, delay, ease: 'expoInOut' });
    });
  }

  function update (dt) {
    dt = dt / 1000;
    lines.forEach(mesh => {
      mesh.material.uniforms.time.value += dt;
    });
  }
};
