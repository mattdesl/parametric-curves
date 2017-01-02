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
uniform float time;
uniform float animateRadius;
uniform float animateStrength;
uniform float index;
uniform float radialSegments;

// pass a few things along to the vertex shader
varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;

// Import a couple utilities
#pragma glslify: PI = require('glsl-pi');
#pragma glslify: ease = require('glsl-easings/exponential-in-out');

// Some constants for the robust version
#ifdef ROBUST
  const float MAX_NUMBER = 1.79769313e+308;
  const float EPSILON = 1.19209290e-7;
#endif

// Angles to spherical coordinates
vec3 spherical (float r, float phi, float theta) {
  return r * vec3(
    cos(phi) * cos(theta),
    cos(phi) * sin(theta),
    sin(phi)
  );
}

// Flying a curve along a sine wave
// vec3 sample (float t) {
//   float x = t * 2.0 - 1.0;
//   float y = sin(t + time);
//   return vec3(x, y, 0.0);
// }

// Creates an animated torus knot
vec3 sample (float t) {
  float beta = t * PI;
  
  float ripple = ease(sin(t * 2.0 * PI + time) * 0.5 + 0.5) * 0.5;
  float noise = time + index * ripple * 8.0;
  
  // animate radius on click
  float radiusAnimation = animateRadius * animateStrength * 0.25;
  float r = sin(index * 0.75 + beta * 2.0) * (0.75 + radiusAnimation);
  float theta = 4.0 * beta + index * 0.25;
  float phi = sin(index * 2.0 + beta * 8.0 + noise);

  return spherical(r, phi, theta);
}

#ifdef ROBUST
// ------
// Robust handling of Frenet-Serret frames with Parallel Transport
// ------
vec3 getTangent (vec3 a, vec3 b) {
  return normalize(b - a);
}

void rotateByAxisAngle (inout vec3 normal, vec3 axis, float angle) {
  // http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm
  // assumes axis is normalized
  float halfAngle = angle / 2.0;
  float s = sin(halfAngle);
  vec4 quat = vec4(axis * s, cos(halfAngle));
  normal = normal + 2.0 * cross(quat.xyz, cross(quat.xyz, normal) + quat.w * normal);
}

void createTube (float t, vec2 volume, out vec3 outPosition, out vec3 outNormal) {
  // Reference:
  // https://github.com/mrdoob/three.js/blob/b07565918713771e77b8701105f2645b1e5009a7/src/extras/core/Curve.js#L268
  float nextT = t + (1.0 / lengthSegments);

  // find first tangent
  vec3 point0 = sample(0.0);
  vec3 point1 = sample(1.0 / lengthSegments);

  vec3 lastTangent = getTangent(point0, point1);
  vec3 absTangent = abs(lastTangent);
  #ifdef ROBUST_NORMAL
    float min = MAX_NUMBER;
    vec3 tmpNormal = vec3(0.0);
    if (absTangent.x <= min) {
      min = absTangent.x;
      tmpNormal.x = 1.0;
    }
    if (absTangent.y <= min) {
      min = absTangent.y;
      tmpNormal.y = 1.0;
    }
    if (absTangent.z <= min) {
      tmpNormal.z = 1.0;
    }
  #else
    vec3 tmpNormal = vec3(1.0, 0.0, 0.0);
  #endif
  vec3 tmpVec = normalize(cross(lastTangent, tmpNormal));
  vec3 lastNormal = cross(lastTangent, tmpVec);
  vec3 lastBinormal = cross(lastTangent, lastNormal);
  vec3 lastPoint = point0;

  vec3 normal;
  vec3 tangent;
  vec3 binormal;
  vec3 point;
  float maxLen = (lengthSegments - 1.0);
  float epSq = EPSILON * EPSILON;
  for (float i = 1.0; i < lengthSegments; i += 1.0) {
    float u = i / maxLen;
    // could avoid additional sample here at expense of ternary
    // point = i == 1.0 ? point1 : sample(u);
    point = sample(u);
    tangent = getTangent(lastPoint, point);
    normal = lastNormal;
    binormal = lastBinormal;

    tmpVec = cross(lastTangent, tangent);
    if ((tmpVec.x * tmpVec.x + tmpVec.y * tmpVec.y + tmpVec.z * tmpVec.z) > epSq) {
      tmpVec = normalize(tmpVec);
      float tangentDot = dot(lastTangent, tangent);
      float theta = acos(clamp(tangentDot, -1.0, 1.0)); // clamp for floating pt errors
      rotateByAxisAngle(normal, tmpVec, theta);
    }

    binormal = cross(tangent, normal);
    if (u >= t) break;

    lastPoint = point;
    lastTangent = tangent;
    lastNormal = normal;
    lastBinormal = binormal;
  }

  // extrude outward to create a tube
  float tubeAngle = angle;
  float circX = cos(tubeAngle);
  float circY = sin(tubeAngle);

  // compute the TBN matrix
  vec3 T = tangent;
  vec3 B = binormal;
  vec3 N = -normal;

  // extrude the path & create a new normal
  outNormal.xyz = normalize(B * circX + N * circY);
  outPosition.xyz = point + B * volume.x * circX + N * volume.y * circY;
}
#else
// ------
// Fast version; computes the local Frenet-Serret frame
// ------
void createTube (float t, vec2 volume, out vec3 offset, out vec3 normal) {
  // find next sample along curve
  float nextT = t + (1.0 / lengthSegments);

  // sample the curve in two places
  vec3 current = sample(t);
  vec3 next = sample(nextT);
  
  // compute the TBN matrix
  vec3 T = normalize(next - current);
  vec3 B = normalize(cross(T, next + current));
  vec3 N = -normalize(cross(B, T));

  // extrude outward to create a tube
  float tubeAngle = angle;
  float circX = cos(tubeAngle);
  float circY = sin(tubeAngle);

  // compute position and normal
  normal.xyz = normalize(B * circX + N * circY);
  offset.xyz = current + B * volume.x * circX + N * volume.y * circY;
}
#endif

void main() {
  // current position to sample at
  // [-0.5 .. 0.5] to [0.0 .. 1.0]
  float t = (position * 2.0) * 0.5 + 0.5;

  // build our tube geometry
  vec2 volume = vec2(thickness);

  // animate the per-vertex curve thickness
  float volumeAngle = t * lengthSegments * 0.5 + index * 20.0 + time * 2.5;
  float volumeMod = sin(volumeAngle) * 0.5 + 0.5;
  volume += 0.01 * volumeMod;

  // build our geometry
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
