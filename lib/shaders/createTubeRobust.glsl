const float MAX_NUMBER = 1.79769313e+308;
const float EPSILON = 1.19209290e-7;

void createTubeRobust (float t, vec2 volume, out vec3 outPosition, out vec3 outNormal) {
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

#pragma glslify: export(createTubeRobust);