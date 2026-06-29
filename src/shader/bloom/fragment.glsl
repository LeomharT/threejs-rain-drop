varying vec2 vUv;

uniform sampler2D uDiffuse;
uniform sampler2D uBloomTexture;

void main() {
    vec2 uv    = vUv;
    vec3 color = vec3(0.0);

    vec4 diffuseColor = texture2D(uDiffuse, uv);
    vec4 bloomColor   = texture2D(uBloomTexture, uv);

    color = diffuseColor.rgb + vec3(1.0) * bloomColor.rgb;

    gl_FragColor = vec4(color, 1.0);
}