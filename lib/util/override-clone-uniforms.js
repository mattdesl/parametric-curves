module.exports = function () {
  THREE.UniformsUtils.clone = cloneUniforms;
};

function cloneUniforms (uniformsSrc) {
  var uniformsDst = {};
  for (var u in uniformsSrc) {
    uniformsDst[u] = {};

    for (var p in uniformsSrc[ u ]) {
      var parameters = uniformsSrc[ u ][ p ];

      if (parameters && (parameters.isColor ||
        parameters.isMatrix3 || parameters.isMatrix4 ||
        parameters.isVector2 || parameters.isVector3 || parameters.isVector4 ||
        parameters.isTexture)) {
        uniformsDst[ u ][ p ] = parameters.clone();
      } else if (Array.isArray(parameters)) {
        uniformsDst[ u ][ p ] = parameters.slice();
      } else {
        uniformsDst[ u ][ p ] = parameters;
      }
    }
  }
  return uniformsDst;
}
