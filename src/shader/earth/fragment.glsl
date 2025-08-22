varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

uniform vec3 uSunDirection;

uniform sampler2D uEarthDayMapTexture;
uniform sampler2D uEarthNightMapTexture;
uniform sampler2D uSpecularCloudsTexture;

uniform vec3 uAtmosphereDayColor;
uniform vec3 uAtmosphereTwilightColor;

void main() {
    // Constant
    vec3 color         = vec3(0.0);
    vec2 uv            = vUv;
    vec3 normal        = normalize(vNormal);
    vec3 viewDriection = normalize(vPosition - cameraPosition);

    // Texture Color
    vec4 dayMapTextureColor         = texture2D(uEarthDayMapTexture, uv);
    vec4 nightMapTextureColor       = texture2D(uEarthNightMapTexture, uv);
    vec4 specularCloudsTextureColor = texture2D(uSpecularCloudsTexture, uv);

    // Sun orientation
    vec3  sunDirection   = uSunDirection;
    float sunOrientation = dot(sunDirection, normal);

    // Day mix
    float dayMix = smoothstep(-0.25, 0.5, sunOrientation);
    color = mix(
        nightMapTextureColor.rgb,
        dayMapTextureColor.rgb,
        dayMix
    );

    // Cloud
    float cloudMix = smoothstep(0.3, 1.0, specularCloudsTextureColor.g);
    cloudMix *= dayMix;
    color = mix(
        color,
        vec3(1.0),
        cloudMix
    );

    // Fresnel
    float fresnel = dot(viewDriection, normal) + 1.0;
    fresnel = max(0.0, fresnel);
    fresnel = pow(fresnel, 2.0);
 
    // Atmosphere
    float atmosphereMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(
        uAtmosphereTwilightColor,
        uAtmosphereDayColor,
        atmosphereMix
    );

    color = mix(
        color,
        atmosphereColor,
        fresnel * dayMix
    );

    // Specular
    vec3 reflection = reflect(-sunDirection, normal);
    float specular = -dot(reflection, viewDriection);
    specular = max(0.0, specular);
    specular = pow(specular, 20.0);
    specular *= specularCloudsTextureColor.r;

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