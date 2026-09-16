import type { GlobePose } from './globeGeometry.ts';
import { GLOBE_RADIUS, GLOBE_SIZE } from './globeGeometry.ts';

/** Decorative GPU material only. SVG above this canvas owns all geographic hit testing. */
export function earthMaterial(canvas: HTMLCanvasElement, ready: (value: boolean) => void) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  let disposed = false;
  const shaders: WebGLShader[] = [];
  function compile(type: number, source: string) {
    const shader = gl!.createShader(type);
    if (!shader) throw new Error('Earth shader unavailable');
    shaders.push(shader); gl!.shaderSource(shader, source); gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) throw new Error('Earth shader could not compile');
    return shader;
  }
  const program = gl.createProgram();
  if (!program) return null;
  let buffer: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  const dispose = () => { disposed = true; gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s)); };
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 point; void main(){point=p;gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
      precision highp float;
      varying vec2 point;
      uniform sampler2D earth;
      uniform vec3 pose;
      void main() {
        vec2 xy=point/(pose.z*${(GLOBE_RADIUS / (GLOBE_SIZE / 2)).toFixed(8)});
        float r2=dot(xy,xy);
        if(r2>1.){gl_FragColor=vec4(0.);return;}
        float z=sqrt(max(0.,1.-r2));
        float lat=asin(clamp(xy.y*cos(pose.y)+z*sin(pose.y),-1.,1.));
        float lon=atan(xy.x,z*cos(pose.y)-xy.y*sin(pose.y))+pose.x;
        vec2 uv=vec2(fract(lon/6.28318530718+.5),.5-lat/3.14159265359);
        vec3 base=texture2D(earth,uv).rgb;
        float water=1.-smoothstep(.045,.16,max(base.r,base.g));
        base=mix(base,vec3(.018,.16,.28),water);
        vec3 normal=vec3(xy,z);
        float sun=max(0.,dot(normal,normalize(vec3(-.55,.55,1.))));
        vec3 color=base*(.15+1.15*sun);
        float rim=pow(1.-z,3.5);
        color+=vec3(.025,.30,.48)*rim*(.35+sun);
        float reflection=pow(max(0.,dot(normal,normalize(vec3(-.35,.45,1.)))),36.);
        color+=water*reflection*vec3(.09,.21,.24);
        gl_FragColor=vec4(color,1.-smoothstep(.994,1.,r2));
      }`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Earth program unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
    texture = gl.createTexture();
    const location = gl.getUniformLocation(program, 'pose');
    let loaded = false;
    let current: GlobePose = { longitude: 12, latitude: 24, zoom: 1 };
    const render = (next: GlobePose) => {
      current = next;
      if (!loaded || disposed || gl.isContextLost()) return;
      gl.viewport(0,0,canvas.width,canvas.height); gl.useProgram(program);
      gl.uniform3f(location,next.longitude*Math.PI/180,next.latitude*Math.PI/180,next.zoom);
      gl.drawArrays(gl.TRIANGLES,0,6);
    };
    const img = new Image();
    img.onload = () => {
      if (disposed || gl.isContextLost()) return;
      try {
        // Bound texture memory on phones while retaining the original credited source asset.
        const image = document.createElement('canvas'); image.width=2048; image.height=1024;
        const ctx=image.getContext('2d'); if (!ctx) return;
        ctx.drawImage(img,0,0,image.width,image.height);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        loaded=true; render(current); ready(true);
      } catch { ready(false); }
    };
    img.onerror = () => { if (!disposed) ready(false); };
    img.src='/images/earth-nasa.jpg';
    return { render, dispose };
  } catch { dispose(); return null; }
}
