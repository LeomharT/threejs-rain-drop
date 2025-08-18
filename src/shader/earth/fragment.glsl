precision mediump float;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

uniform sampler2D uEarthDayMapTexture;
uniform sampler2D uEarthNightMapTexture;
uniform sampler2D uSpecularCloudsTexture;

uniform vec3 uSunDirection;

void main() {
    vec2 uv = vUv;
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vPosition - cameraPosition);

    vec3 color = vec3(0.0);

    vec3 sunOrientation = uSunDirection;

    // Textures
    vec4 dayMapTextureColor = texture2D(uEarthDayMapTexture, uv);
    vec4 nightMapTextureColor = texture2D(uEarthNightMapTexture, uv);
    vec4 specularCloudsColor = texture2D(uSpecularCloudsTexture, uv);

    // DayMix
    float dayMix = dot(sunOrientation, normal);
    dayMix = smoothstep(-0.25, 0.5, dayMix);
    color = mix(
        nightMapTextureColor.xyz,
        dayMapTextureColor.xyz,
        dayMix
    );

    // Fresnel
    float fresnel = dot(normal, viewDirection) + 1.0;
    fresnel = max(fresnel, 0.0);
    fresnel = pow(fresnel, 2.0);

    // Specular
    vec3 reflection = reflect(sunOrientation, normal);

    float specular = dot(viewDirection, reflection);
    specular = max(0.0, specular);
    specular = pow(specular, 20.0);
    specular *= specularCloudsColor.r;
 
    

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}