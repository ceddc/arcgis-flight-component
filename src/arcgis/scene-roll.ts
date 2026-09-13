import { subclass } from "@arcgis/core/core/accessorSupport/decorators.js";
import type SceneView from "@arcgis/core/views/SceneView.js";
import type ManagedFBO from "@arcgis/core/views/3d/webgl/ManagedFBO.js";
import RenderNode from "@arcgis/core/views/3d/webgl/RenderNode.js";
import { resolveRenderTargetSize } from "./render-target-size";
import { preserveDepthStencil } from "./scene-roll-framebuffer";

const FULLSCREEN_VERTEX_SHADER = [
  "#version 300 es",
  "precision highp float;",
  "out vec2 vUv;",
  "void main() {",
  "  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));",
  "  vUv = position;",
  "  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);",
  "}",
].join("\n");

const SCENE_ROLL_FRAGMENT_SHADER = [
  "#version 300 es",
  "precision highp float;",
  "uniform sampler2D uColor;",
  "uniform float uRollRadians;",
  "uniform float uViewportScale;",
  "uniform float uAspectRatio;",
  "in vec2 vUv;",
  "layout(location=0) out vec4 outColor;",
  "void main() {",
  "  float aspect = max(0.01, uAspectRatio);",
  "  vec2 centered = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);",
  "  float cosine = cos(uRollRadians);",
  "  float sine = sin(uRollRadians);",
  "  vec2 sourceCentered = vec2(",
  "    cosine * centered.x - sine * centered.y,",
  "    sine * centered.x + cosine * centered.y",
  "  ) / max(1.0, uViewportScale);",
  "  vec2 sourceUv = clamp(",
  "    vec2(sourceCentered.x / aspect, sourceCentered.y) + vec2(0.5),",
  "    vec2(0.0),",
  "    vec2(1.0)",
  "  );",
  "  outColor = texture(uColor, sourceUv);",
  "}",
].join("\n");

interface TextureHandle {
  glName: WebGLTexture;
  descriptor?: {
    height?: number;
    width?: number;
  };
}

export interface SceneRollDiagnostics {
  enabled: boolean;
  disabled: boolean;
  rollDegrees: number;
  viewportScale: number;
  renderCount: number;
}

export interface SceneRollController {
  readonly appliesRoll: boolean;
  setEnabled(enabled: boolean): void;
  setTransform(rollDegrees: number, viewportScale: number): void;
  diagnostics(): SceneRollDiagnostics;
  destroy(): void;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  label: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to allocate " + label + " shader.");
  let compiled = false;
  try {
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader) ?? "unknown shader error";
      throw new Error(label + ": " + info);
    }
    compiled = true;
    return shader;
  } finally {
    if (!compiled) gl.deleteShader(shader);
  }
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  let vertex: WebGLShader | null = null;
  let fragment: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  try {
    vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource, "Scene roll vertex");
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, "Scene roll fragment");
    program = gl.createProgram();
    if (!program) throw new Error("Unable to allocate scene-roll program.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program) ?? "unknown link error";
      throw new Error("Scene roll: " + info);
    }
    return program;
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}

interface WebGLStateSnapshot {
  activeTexture: number;
  blend: boolean;
  colorMask: [boolean, boolean, boolean, boolean];
  cullFace: boolean;
  depthMask: boolean;
  depthTest: boolean;
  program: WebGLProgram | null;
  scissorTest: boolean;
  texture0: WebGLTexture | null;
  vao: WebGLVertexArrayObject | null;
  viewport: [number, number, number, number];
}

function captureWebGLState(gl: WebGL2RenderingContext): WebGLStateSnapshot {
  const activeTexture = gl.getParameter(gl.ACTIVE_TEXTURE) as number;
  gl.activeTexture(gl.TEXTURE0);
  const texture0 = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
  gl.activeTexture(activeTexture);
  return {
    activeTexture,
    blend: gl.isEnabled(gl.BLEND),
    colorMask: Array.from(
      gl.getParameter(gl.COLOR_WRITEMASK) as ArrayLike<boolean>,
    ) as WebGLStateSnapshot["colorMask"],
    cullFace: gl.isEnabled(gl.CULL_FACE),
    depthMask: gl.getParameter(gl.DEPTH_WRITEMASK) as boolean,
    depthTest: gl.isEnabled(gl.DEPTH_TEST),
    program: gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null,
    scissorTest: gl.isEnabled(gl.SCISSOR_TEST),
    texture0,
    vao: gl.getParameter(gl.VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject | null,
    viewport: Array.from(
      gl.getParameter(gl.VIEWPORT) as ArrayLike<number>,
    ) as WebGLStateSnapshot["viewport"],
  };
}

function setCapability(
  gl: WebGL2RenderingContext,
  capability: number,
  enabled: boolean,
): void {
  if (enabled) gl.enable(capability);
  else gl.disable(capability);
}

function restoreWebGLState(
  gl: WebGL2RenderingContext,
  state: WebGLStateSnapshot,
): void {
  gl.viewport(...state.viewport);
  gl.colorMask(...state.colorMask);
  gl.depthMask(state.depthMask);
  setCapability(gl, gl.SCISSOR_TEST, state.scissorTest);
  setCapability(gl, gl.DEPTH_TEST, state.depthTest);
  setCapability(gl, gl.BLEND, state.blend);
  setCapability(gl, gl.CULL_FACE, state.cullFace);
  gl.useProgram(state.program);
  gl.bindVertexArray(state.vao);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, state.texture0);
  gl.activeTexture(state.activeTexture);
}

// ArcGIS Camera has no roll property. Rotate the final scene image, then return the
// original framebuffer if this optional effect is unavailable; flight itself still works.
class SceneRollNode extends RenderNode {
  private resourceGl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private colorUniform: WebGLUniformLocation | null = null;
  private rollUniform: WebGLUniformLocation | null = null;
  private viewportScaleUniform: WebGLUniformLocation | null = null;
  private aspectRatioUniform: WebGLUniformLocation | null = null;
  private disabled = false;
  private rollDegrees = 0;
  private viewportScale = 1;
  private renderCount = 0;

  constructor({ view }: { view: SceneView }) {
    super({
      view,
      consumes: { required: ["final-color"] },
      produces: "final-color",
    });
  }

  setTransform(rollDegrees: number, viewportScale: number): void {
    this.rollDegrees = rollDegrees;
    this.viewportScale = viewportScale;
  }

  get appliesRoll(): boolean {
    return !this.disabled;
  }

  diagnostics(): SceneRollDiagnostics {
    return {
      enabled: true,
      disabled: this.disabled,
      rollDegrees: this.rollDegrees,
      viewportScale: this.viewportScale,
      renderCount: this.renderCount,
    };
  }

  disposeResources(): void {
    const gl = this.resourceGl;
    if (gl) {
      if (this.program) gl.deleteProgram(this.program);
      if (this.vao) gl.deleteVertexArray(this.vao);
    }
    this.program = null;
    this.vao = null;
    this.resourceGl = null;
  }

  protected render(inputs: ManagedFBO[]): ManagedFBO | null | undefined {
    const input = inputs.find(({ name }) => name === "final-color");
    if (
      !input
      || this.disabled
      || Math.abs(this.rollDegrees) < 0.01
      || !this.ensureResources()
    ) {
      return input;
    }
    const colorTexture = input.getTexture() as TextureHandle | null | undefined;
    if (!colorTexture?.glName) return input;

    const gl = this.gl;
    // ArcGIS shares this WebGL context with its own render passes; return every state we touch.
    const previousState = captureWebGLState(gl);
    try {
      const output = this.acquireOutputFramebuffer();
      const renderTarget = resolveRenderTargetSize(
        colorTexture.descriptor,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
      );
      gl.viewport(0, 0, renderTarget.width, renderTarget.height);
      gl.disable(gl.SCISSOR_TEST);
      gl.colorMask(true, true, true, true);
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);
      gl.useProgram(this.program);
      gl.bindVertexArray(this.vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, colorTexture.glName);
      gl.uniform1i(this.colorUniform, 0);
      gl.uniform1f(this.rollUniform, this.rollDegrees * Math.PI / 180);
      gl.uniform1f(this.viewportScaleUniform, this.viewportScale);
      gl.uniform1f(this.aspectRatioUniform, renderTarget.width / renderTarget.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      preserveDepthStencil(
        input,
        output,
        gl.DEPTH_STENCIL_ATTACHMENT,
        gl.COLOR_ATTACHMENT1,
      );
      this.renderCount += 1;
      return output;
    } finally {
      restoreWebGLState(gl, previousState);
    }
  }

  private ensureResources(): boolean {
    const gl = this.gl;
    if (this.resourceGl && this.resourceGl !== gl) {
      this.disposeResources();
      this.disabled = false;
    }
    if (this.program) return true;
    if (this.disabled) return false;
    try {
      this.resourceGl = gl;
      this.program = createProgram(gl, FULLSCREEN_VERTEX_SHADER, SCENE_ROLL_FRAGMENT_SHADER);
      this.vao = gl.createVertexArray();
      this.colorUniform = gl.getUniformLocation(this.program, "uColor");
      this.rollUniform = gl.getUniformLocation(this.program, "uRollRadians");
      this.viewportScaleUniform = gl.getUniformLocation(this.program, "uViewportScale");
      this.aspectRatioUniform = gl.getUniformLocation(this.program, "uAspectRatio");
      if (!this.vao || !this.colorUniform || !this.rollUniform
        || !this.viewportScaleUniform || !this.aspectRatioUniform) {
        throw new Error("Unable to allocate scene-roll resources.");
      }
      return true;
    } catch (error) {
      this.disabled = true;
      console.warn("ArcGIS scene-roll RenderNode disabled:", error);
      this.disposeResources();
      return false;
    }
  }
}

const RegisteredSceneRollNode = subclass(
  "arcgisFlightComponent.SceneRollNode",
)(SceneRollNode) as typeof SceneRollNode;

export function createSceneRoll(view: SceneView, enabled: boolean): SceneRollController {
  let node: SceneRollNode | null = null;
  let unavailable = false;
  let currentRollDegrees = 0;
  let currentViewportScale = 1;
  const ensureNode = (): SceneRollNode | null => {
    if (!enabled || unavailable) return null;
    if (node) return node;
    try {
      node = new RegisteredSceneRollNode({ view });
      node.setTransform(currentRollDegrees, currentViewportScale);
      return node;
    } catch (error) {
      unavailable = true;
      console.warn("ArcGIS scene-roll RenderNode unavailable; using a level viewport.", error);
      return null;
    }
  };
  ensureNode();

  return {
    get appliesRoll(): boolean {
      return enabled && !unavailable && (node?.appliesRoll ?? false);
    },
    setEnabled(nextEnabled): void {
      enabled = nextEnabled;
      if (!enabled) {
        node?.disposeResources();
        node?.destroy();
        node = null;
        return;
      }
      ensureNode();
    },
    setTransform(rollDegrees, viewportScale): void {
      if (Number.isFinite(rollDegrees)) {
        currentRollDegrees = Math.max(-60, Math.min(60, rollDegrees));
      } else {
        currentRollDegrees = 0;
      }
      if (Number.isFinite(viewportScale)) {
        currentViewportScale = Math.max(1, Math.min(2.2, Math.abs(viewportScale)));
      } else {
        currentViewportScale = 1;
      }
      node?.setTransform(currentRollDegrees, currentViewportScale);
    },
    diagnostics: () => node?.diagnostics() ?? {
      enabled,
      disabled: unavailable,
      rollDegrees: currentRollDegrees,
      viewportScale: currentViewportScale,
      renderCount: 0,
    },
    destroy(): void {
      enabled = false;
      node?.disposeResources();
      node?.destroy();
      node = null;
    },
  };
}
