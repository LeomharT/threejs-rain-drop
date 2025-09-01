varying vec3 vPosition;
varying vec2 vUv;

void main() {
    vUv       = uv;
    vPosition = csm_Position.xyz;
}