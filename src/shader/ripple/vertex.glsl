varying vec4 vPosition;
varying vec2 vUv;

varying vec4 vReflectUV;

uniform mat4 uTextureMatrix;

void main() {
    vUv        = uv;
    vPosition  = csm_PositionRaw;
    vReflectUV = uTextureMatrix * vec4(position, 1.0);
}