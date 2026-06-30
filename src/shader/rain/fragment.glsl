uniform float uRefraction;
uniform float uBaseBrightness;

uniform sampler2D uNormalTexture;
uniform sampler2D uBgRT;

varying vec2 vUv;
varying vec2 vScreenspace;

void main() {
    vec2 uv          = vUv;
    vec3 color       = vec3(1.0);
    vec4 normalColor = texture2D(uNormalTexture, uv);

    if(normalColor.a < 0.5) discard;

    vec3 normal = normalize(normalColor.rgb);
 
    vec2 bgUV    = vScreenspace + normal.xy * uRefraction;
    vec4 bgColor = texture2D(uBgRT, bgUV);

    float brightness = uBaseBrightness * pow(normal.b, 40.0);

    color = bgColor.rgb + vec3(brightness);
 
    gl_FragColor = vec4(color,  1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}