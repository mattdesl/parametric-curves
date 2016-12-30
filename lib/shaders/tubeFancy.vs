// attributes of our mesh
attribute float position;
attribute float angle;
attribute vec2 uv;

// built-in uniforms from ThreeJS camera and Object3D
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;

// custom uniforms to build up our tubes
uniform float thickness;
uniform float totalMeshes;
uniform float index;
uniform float time;
uniform float drawOffset;
uniform float lengthSegments;
uniform float radialSegments;
uniform float extent;
uniform vec2 mousePosition;

// pass a few things along to the vertex shader
varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;

#define ANIMATE_DRAW
#pragma glslify: PI = require('glsl-pi');

vec3 sample2 (float t) {
  vec3 offset = vec3(0.0);

  // offset our angle of rotation a little by each line
  float angleOffset = index * drawOffset * 5.0;

  // create the angle along the arclength
  float angle = (t * PI * 2.0) + angleOffset;

  // rotate all lines at a constant rate
  angle += time * 0.5;

  // create a circle
  vec2 rotation = vec2(cos(angle), sin(angle));
  offset.zy = rotation;

  // shrink radius
  offset.zy *= 0.25;

  // decrease the radius even more on some of them
  offset.zy *= drawOffset;

  // stretch along depth
  offset.x = (t * 2.0 - 1.0);

  return offset;
}

vec3 sample (float t) {
  return vec3(t * 2.0 - 1.0, 0.0, 0.01);
}

float drawAnimate (float t, float animate, float segmentLength) {
  // "draw in" the curve
  float halfLength = segmentLength * 0.5;
  float padding = 0.0;
  float midLeft = 0.0 - padding - segmentLength / 2.0;
  float midRight = 1.0 + padding + segmentLength / 2.0;
  float mid = mix(midLeft, midRight, animate);
  return clamp(mid + segmentLength * position, 0.0, 1.0);
}

void createTube (float t, vec2 volume, out vec3 offset, out vec3 normal) {
  // find next sample along curve
  float nextT = t + (1.0 / lengthSegments);

  // extrude outward to create a tube
  float tubeAngle = angle;
  float circX = cos(tubeAngle);
  float circY = sin(tubeAngle);

  // if closed and we've reached the end
  #ifdef CLOSED_CURVE
    if (t == 1.0) {
      nextT = 1.0 / lengthSegments;
    }
  #endif

  // sample the polyline in two places
  vec3 current = sample(t);
  vec3 next = sample(nextT);
  
  // compute the TBN matrix
  vec3 T = normalize(next - current);
  vec3 B = normalize(cross(T, next + current));
  vec3 N = -normalize(cross(B, T));

  // extrude the path & create a new normal
  float capX = cos(0.0);
  float capY = sin(0.0);
  normal.xyz = normalize(B * circX + N * circY);
  offset.xyz = current + B * volume.x * circX + N * volume.y * circY;
}

void main() {
  // current position to sample at
  // [-0.5 .. 0.5] to [0.0 .. 1.0]
  float t = (position * 2.0) * 0.5 + 0.5;

  #ifdef ANIMATE_DRAW
    // modify the input so it looks like we are "drawing"
    // the tubes in.
    float drawOverlap = 0.25;
    float drawTime = time * 0.25 + index * drawOverlap;
    float animate = mod(0.5, 1.0);
    float segmentLength = 0.5;
    t = drawAnimate(t, animate, segmentLength);
  #endif

  // scale the tube at each end
  vec2 volume = vec2(thickness);
  #ifdef ANIMATE_DRAW
    // To help the "draw in" look, we'll taper each end a bit
    volume *= sin(t * 1.0 * PI);
  #endif

  // build our tube geometry
  vec3 transformed;
  vec3 objectNormal;
  createTube(t, volume, transformed, objectNormal);

  // pass the normal and UV along
  vec3 transformedNormal = normalMatrix * objectNormal;
  vNormal = normalize(transformedNormal);
  vUv = uv.yx; // swizzle this to match expectations

  // project our vertex position
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
