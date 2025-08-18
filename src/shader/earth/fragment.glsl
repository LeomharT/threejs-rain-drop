precision mediump float;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

uniform sampler2D uEarthDayMapTexture;
uniform sampler2D uEarthNightMapTexture;

uniform vec3 uSunDirection;

void main() {
    vec2 uv = vUv;
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vPosition - cameraPosition);

    vec3 color = vec3(0.0);

    vec3 sunOrientation = uSunDirection;

    // DayMix
    float dayMix = dot(sunOrientation, normal);
    dayMix = smoothstep(-0.25, 0.5, dayMix);
    color = vec3(dayMix);

    

    // Fresnel
    float fresnel = dot(normal, viewDirection) + 1.0;
    fresnel = max(fresnel, 0.0);
    fresnel = pow(fresnel, 2.0);

    gl_FragColor = vec4(color, 1.0);
}