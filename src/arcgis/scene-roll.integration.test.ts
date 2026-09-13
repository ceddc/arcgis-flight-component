import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  gl: null as unknown as WebGL2RenderingContext,
  instances: [] as unknown[],
  subclassProperties: [] as unknown[],
  output: null as unknown,
  throwOnConstruction: false,
}));

vi.mock("@arcgis/core/core/accessorSupport/decorators.js", () => ({
  subclass: () => (target: new (...args: unknown[]) => object) => new Proxy(target, {
    construct(constructor, args) {
      harness.subclassProperties.push(args[0]);
      if (!args[0] || typeof args[0] !== "object" || !("view" in args[0])) {
        throw new TypeError("RenderNode subclasses require a properties object.");
      }
      return Reflect.construct(constructor, args);
    },
  }),
}));
vi.mock("@arcgis/core/views/3d/webgl/RenderNode.js", () => ({
  default: class MockRenderNode {
    readonly gl = harness.gl;

    constructor() {
      if (harness.throwOnConstruction) throw new Error("RenderNode unavailable");
      harness.instances.push(this);
    }

    readonly resetWebGLState = vi.fn();

    acquireOutputFramebuffer(): unknown {
      return harness.output;
    }

    destroy(): void {}
  },
}));

import { createSceneRoll } from "./scene-roll";

function createGl(): WebGL2RenderingContext {
  const gl = {
    ACTIVE_TEXTURE: 0x84e0,
    BLEND: 0x0be2,
    COLOR_ATTACHMENT1: 0x8ce1,
    COLOR_WRITEMASK: 0x0c23,
    COMPILE_STATUS: 0x8b81,
    CURRENT_PROGRAM: 0x8b8d,
    CULL_FACE: 0x0b44,
    DEPTH_STENCIL_ATTACHMENT: 0x821a,
    DEPTH_TEST: 0x0b71,
    DEPTH_WRITEMASK: 0x0b72,
    FRAGMENT_SHADER: 0x8b30,
    LINK_STATUS: 0x8b82,
    SCISSOR_TEST: 0x0c11,
    TEXTURE0: 0x84c0,
    TEXTURE_2D: 0x0de1,
    TEXTURE_BINDING_2D: 0x8069,
    TRIANGLES: 0x0004,
    VERTEX_ARRAY_BINDING: 0x85b5,
    VERTEX_SHADER: 0x8b31,
    VIEWPORT: 0x0ba2,
    drawingBufferHeight: 360,
    drawingBufferWidth: 640,
    activeTexture: vi.fn(),
    attachShader: vi.fn(),
    bindTexture: vi.fn(),
    bindVertexArray: vi.fn(),
    colorMask: vi.fn(),
    compileShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    createShader: vi.fn(() => ({})),
    createVertexArray: vi.fn(() => ({})),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    deleteVertexArray: vi.fn(),
    depthMask: vi.fn(),
    disable: vi.fn(),
    drawArrays: vi.fn(),
    enable: vi.fn(),
    getParameter: vi.fn((parameter: number) => {
      if (parameter === 0x84e0) return 0x84c2;
      if (parameter === 0x8069) return { id: "previous-texture" };
      if (parameter === 0x0c23) return [false, true, false, true];
      if (parameter === 0x0b72) return true;
      if (parameter === 0x8b8d) return { id: "previous-program" };
      if (parameter === 0x85b5) return { id: "previous-vao" };
      if (parameter === 0x0ba2) return [1, 2, 320, 180];
      return null;
    }),
    getProgramInfoLog: vi.fn(() => ""),
    getProgramParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ""),
    getShaderParameter: vi.fn(() => true),
    getUniformLocation: vi.fn(() => ({})),
    isEnabled: vi.fn((capability: number) => capability === 0x0be2),
    linkProgram: vi.fn(),
    shaderSource: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    useProgram: vi.fn(),
    viewport: vi.fn(),
  };
  return gl as unknown as WebGL2RenderingContext;
}

beforeEach(() => {
  harness.instances.length = 0;
  harness.subclassProperties.length = 0;
  harness.throwOnConstruction = false;
  harness.gl = createGl();
  harness.output = {
    attachColor: vi.fn(),
    attachDepth: vi.fn(),
  };
});

describe("SceneRollNode production framebuffer wiring", () => {
  it("passes a properties object to the registered ArcGIS subclass", () => {
    const view = Object.freeze({ __accessor__: Object.freeze({ id: "caller-view" }) });
    const controller = createSceneRoll(view as never, true);
    expect(harness.subclassProperties).toEqual([{ view }]);
    expect(controller.appliesRoll).toBe(true);
    expect(controller.diagnostics().disabled).toBe(false);
    expect(view.__accessor__.id).toBe("caller-view");
    controller.destroy();
  });

  it("returns output with input depth-stencil and optional color1 attachments", () => {
    const gl = harness.gl;
    const depth = { id: "depth" };
    const emissive = { id: "emissive" };
    const input = {
      name: "final-color",
      getAttachment: vi.fn((attachment: number) => {
        if (attachment === gl.DEPTH_STENCIL_ATTACHMENT) return depth;
        if (attachment === gl.COLOR_ATTACHMENT1) return emissive;
        return undefined;
      }),
      getTexture: vi.fn(() => ({
        descriptor: { height: 360, width: 640 },
        glName: { id: "color0" },
      })),
    };
    const output = harness.output as {
      attachColor: ReturnType<typeof vi.fn>;
      attachDepth: ReturnType<typeof vi.fn>;
    };

    const controller = createSceneRoll({} as never, true);
    controller.setTransform(12, 1.05);
    const node = harness.instances[0] as {
      render(inputs: unknown[]): unknown;
      resetWebGLState: ReturnType<typeof vi.fn>;
    };

    expect(node.render([input])).toBe(output);
    expect(output.attachDepth).toHaveBeenCalledWith(depth);
    expect(output.attachColor).toHaveBeenCalledWith(
      emissive,
      gl.COLOR_ATTACHMENT1,
    );
    expect(controller.diagnostics().renderCount).toBe(1);
    expect(controller.appliesRoll).toBe(true);
    expect(node.resetWebGLState).not.toHaveBeenCalled();
    expect(gl.viewport).toHaveBeenLastCalledWith(1, 2, 320, 180);
    expect(gl.colorMask).toHaveBeenLastCalledWith(false, true, false, true);
    expect(gl.activeTexture).toHaveBeenLastCalledWith(0x84c2);
  });

  it("does not attach color1 when final-color has no secondary attachment", () => {
    const gl = harness.gl;
    const depth = { id: "depth" };
    const input = {
      name: "final-color",
      getAttachment: vi.fn((attachment: number) =>
        attachment === gl.DEPTH_STENCIL_ATTACHMENT ? depth : undefined
      ),
      getTexture: vi.fn(() => ({
        descriptor: { height: 360, width: 640 },
        glName: { id: "color0" },
      })),
    };
    const output = harness.output as {
      attachColor: ReturnType<typeof vi.fn>;
      attachDepth: ReturnType<typeof vi.fn>;
    };

    const controller = createSceneRoll({} as never, true);
    controller.setTransform(12, 1.05);
    const node = harness.instances[0] as {
      render(inputs: unknown[]): unknown;
    };

    expect(node.render([input])).toBe(output);
    expect(output.attachDepth).toHaveBeenCalledWith(depth);
    expect(output.attachColor).not.toHaveBeenCalled();
  });

  it("deletes the compiled vertex shader when fragment compilation fails", () => {
    const gl = harness.gl;
    const vertex = { id: "vertex" } as WebGLShader;
    const fragment = { id: "fragment" } as WebGLShader;
    vi.mocked(gl.createShader)
      .mockReturnValueOnce(vertex)
      .mockReturnValueOnce(fragment);
    vi.mocked(gl.getShaderParameter).mockImplementation(
      (shader) => shader === vertex,
    );
    vi.mocked(gl.getShaderInfoLog).mockReturnValue("fragment failed");

    const controller = createSceneRoll({} as never, true);
    controller.setTransform(12, 1.05);
    const node = harness.instances[0] as { render(inputs: unknown[]): unknown };

    expect(node.render([{ name: "final-color" }])).toEqual({ name: "final-color" });
    expect(gl.deleteShader).toHaveBeenCalledWith(fragment);
    expect(gl.deleteShader).toHaveBeenCalledWith(vertex);
    expect(controller.appliesRoll).toBe(false);
    expect(controller.diagnostics().disabled).toBe(true);
  });

  it("deletes both shaders when program allocation fails", () => {
    const gl = harness.gl;
    const vertex = { id: "vertex" } as WebGLShader;
    const fragment = { id: "fragment" } as WebGLShader;
    vi.mocked(gl.createShader)
      .mockReturnValueOnce(vertex)
      .mockReturnValueOnce(fragment);
    vi.mocked(gl.createProgram).mockImplementation(
      () => null as unknown as WebGLProgram,
    );

    const controller = createSceneRoll({} as never, true);
    controller.setTransform(12, 1.05);
    const node = harness.instances[0] as { render(inputs: unknown[]): unknown };

    node.render([{ name: "final-color" }]);
    expect(gl.deleteShader).toHaveBeenCalledWith(vertex);
    expect(gl.deleteShader).toHaveBeenCalledWith(fragment);
    expect(gl.deleteProgram).not.toHaveBeenCalled();
    expect(controller.diagnostics().disabled).toBe(true);
  });

  it("keeps a disabled RenderNode allocation-free and enables it live", () => {
    const controller = createSceneRoll({} as never, false);
    controller.setTransform(12, 1.05);
    const input = {
      name: "final-color",
      getAttachment: vi.fn(() => undefined),
      getTexture: vi.fn(() => ({
        descriptor: { height: 360, width: 640 },
        glName: { id: "color0" },
      })),
    };

    expect(harness.instances).toHaveLength(0);
    expect(controller.appliesRoll).toBe(false);
    expect(harness.gl.createProgram).not.toHaveBeenCalled();
    expect(controller.diagnostics()).toEqual({
      enabled: false,
      disabled: false,
      rollDegrees: 12,
      viewportScale: 1.05,
      renderCount: 0,
    });

    controller.setEnabled(true);
    controller.setTransform(12, 1.05);
    const node = harness.instances[0] as {
      render(inputs: unknown[]): unknown;
    };
    node.render([input]);

    expect(harness.instances).toHaveLength(1);
    expect(controller.diagnostics().enabled).toBe(true);
    expect(harness.gl.createProgram).toHaveBeenCalledOnce();
    expect(controller.appliesRoll).toBe(true);
    controller.destroy();
    expect(controller.appliesRoll).toBe(false);
  });

  it("falls back to a level viewport when RenderNode construction fails", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    harness.throwOnConstruction = true;

    const controller = createSceneRoll({} as never, true);

    expect(controller.diagnostics()).toMatchObject({
      enabled: true,
      disabled: true,
      renderCount: 0,
    });
    expect(harness.instances).toHaveLength(0);
    expect(controller.appliesRoll).toBe(false);
    expect(warning).toHaveBeenCalledWith(
      "ArcGIS scene-roll RenderNode unavailable; using a level viewport.",
      expect.any(Error),
    );
    expect(() => controller.destroy()).not.toThrow();
    warning.mockRestore();
  });
});
