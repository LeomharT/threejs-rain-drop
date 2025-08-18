precision mediump float;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

uniform sampler2D uEarthDayMapTexture;
uniform sampler2D uEarthNightMapTexture;
uniform sampler2D uSpecularCloudsTexture;

uniform vec3 uSunDirection;
uniform vec3 uAtmosphereDayColor;
uniform vec3 uAtmosphereTwilightColor;

void main() {
    vec2 uv = vUv;
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vPosition - cameraPosition);

    vec3 color = vec3(0.0);

    vec3 sunDirection = uSunDirection;
    float sunOrientation = dot(sunDirection, normal);

    // Textures
    vec4 dayMapTextureColor = texture2D(uEarthDayMapTexture, uv);
    vec4 nightMapTextureColor = texture2D(uEarthNightMapTexture, uv);
    vec4 specularCloudsColor = texture2D(uSpecularCloudsTexture, uv);

    // DayMix
    float dayMix = smoothstep(-0.25, 0.5, sunOrientation);
    color = mix(
        nightMapTextureColor.xyz,
        dayMapTextureColor.xyz,
        dayMix
    );

    // Fresnel
    float fresnel = dot(normal, viewDirection) + 1.0;
    fresnel = max(fresnel, 0.0);
    fresnel = pow(fresnel, 2.0);

    // Atomosphere
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);

    vec3 atmosphereDayColor = mix(
        uAtmosphereTwilightColor,
        uAtmosphereDayColor,
        atmosphereDayMix
    );

    color = mix(
        color,
        atmosphereDayColor,
        fresnel * dayMix
    );

    // Specular
    vec3 reflection = reflect(sunDirection, normal);

    float specular = dot(viewDirection, reflection);
    specular = max(0.0, specular);
    specular = pow(specular, 20.0);
    specular *= specularCloudsColor.r;

    vec3 specularColor = mix(vec3(1.0), uAtmosphereTwilightColor, fresnel);

    // color += specularColor * specular;

    // Final color
    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}