varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

uniform vec3 uSunDirection;

uniform sampler2D uEarthDayMapTexture;
uniform sampler2D uEarthNightMapTexture;
uniform sampler2D uSpacularCloudTexture;

uniform vec3 uAtmosphereDayColor;
uniform vec3 uAtmosphereTwilightColor;

void main() {
    vec3 color         = vec3(0.0);
    vec3 normal        = normalize(vNormal);
    vec2 uv            = vUv;
    vec3 viewDirection = normalize(vPosition - cameraPosition);

    // Sun orientation
    vec3  sunDirection   = uSunDirection;
    float sunOrientation = dot(sunDirection, normal);

    // Texture color
    vec4 dayMapTextureColor        = texture2D(uEarthDayMapTexture, uv);
    vec4 nightMapTextureColor      = texture2D(uEarthNightMapTexture, uv);
    vec4 specularCloudTextureColor = texture2D(uSpacularCloudTexture, uv);

    // Day mix
    float dayMix = smoothstep(-0.25, 0.5, sunOrientation);
    color = mix(
        nightMapTextureColor.xyz,
        dayMapTextureColor.xyz,
        dayMix
    );

    // Cloud
    float cloudMix = smoothstep(0.3, 1.0, specularCloudTextureColor.g);
    cloudMix *= dayMix;
    color = mix(
        color,
        vec3(1.0),
        cloudMix
    );

    // Fresnel 
    float fresnel = dot(viewDirection, normal) + 1.0;
    fresnel = max(0.0, fresnel);
    fresnel = pow(fresnel, 2.0);
 
    // Atmosphere
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(
        uAtmosphereTwilightColor,
        uAtmosphereDayColor,
        atmosphereDayMix
    );
    color = mix(
        color,
        atmosphereColor,
        fresnel * dayMix
    );

    // Specular
    vec3 reflection = reflect(-sunDirection, normal);
    float specular = -dot(viewDirection, reflection);
    specular = max(0.0, specular);
    specular = pow(specular, 20.0);
    specular *= specularCloudTextureColor.r;

    vec3 specularColor = mix(
        vec3(1.0),
        uAtmosphereTwilightColor,
        fresnel
    );

    color += specularColor * specular;


    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}