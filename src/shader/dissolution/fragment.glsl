precision mediump float;

#include <simplex3DNoise>

varying vec3 vPosition;

uniform float uProcess;
uniform float uFrequency;
uniform vec3 uEdgeColor;
uniform float uStrength;
uniform float uEdge;


void main() {
    vec3 color = vec3(1.0);

    float noise = snoise(vPosition * uFrequency);

    if(noise < uProcess) discard;

    if(noise > uProcess && noise < uProcess + uEdge) {
        csm_DiffuseColor.rgb = uEdgeColor;
        csm_Roughness = 1.0;
        csm_Metalness = 1.0;
    }
}