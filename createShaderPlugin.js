function createShaderPlugin(name, vertShader, fragShader, uniformDefaults) {
    var ShaderPlugin = function (renderer) {
        PIXI.ObjectRenderer.call(this, renderer);

        if (!vertShader) {
            this.vertShader = [
                '#define GLSLIFY 1',

                'attribute vec2 aVertexPosition;',
                'attribute vec2 aTextureCoord;',

                'uniform mat3 projectionMatrix;',

                'varying vec2 vTextureCoord;',

                'void main(void) {',
                    'gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);',
                    'vTextureCoord = aTextureCoord;',
                '}'
            ].join('\n');
        }
        else {
            this.vertShader = '#define GLSLIFY 1\n' + vertShader;
        }

        this.fragShader = '#define GLSLIFY 1\n' + fragShader;
        this.uniformDefaults = uniformDefaults;
    };
    ShaderPlugin.prototype = Object.create(PIXI.ObjectRenderer.prototype);
    ShaderPlugin.prototype.constructor = ShaderPlugin;

    ShaderPlugin.prototype.onContextChange = function () {
        var gl = this.renderer.gl;
        this._tintAlpha = new Float32Array(4);

        var shader = this.shader = new PIXI.Shader(gl, this.vertShader, this.fragShader);
        if (this.uniformDefaults) {
            shader.bind();
            var defaultUniforms = this.uniformDefaults;
            var shaderUniforms = shader.uniforms;
            for (var key in defaultUniforms) {
                shaderUniforms[key] = defaultUniforms[key];
            }
        }

        this.quad = new PIXI.Quad(gl);
        this.quad.initVao(shader);
    };

    ShaderPlugin.prototype.start = function () {
    };

    ShaderPlugin.prototype.flush = function () {
    };

    ShaderPlugin.prototype.render = function (sprite) {
        // setup
        var shader = this.shader;

        var renderer = this.renderer;
        renderer.bindShader(shader);
        renderer.state.setBlendMode(sprite.blendMode);

        var quad = this.quad;
        renderer.bindVao(quad.vao);


        // calculate and upload vertices
        sprite._transformID = sprite.transform._worldID;
        var wt = sprite.transform.worldTransform;
        var a = wt.a;
        var b = wt.b;
        var c = wt.c;
        var d = wt.d;
        var tx = wt.tx;
        var ty = wt.ty;
        var anchor = sprite._anchor;

        var w  = sprite.pluginSize.x;
        var w1 = -anchor._x * w;
        var w0 = w1 + w;

        var h  = sprite.pluginSize.y;
        var h1 = -anchor._y * h;
        var h0 = h1 + h;

        // xy
        quad.vertices[0] = a * w1 + c * h1 + tx;
        quad.vertices[1] = d * h1 + b * w1 + ty;

        // xy
        quad.vertices[2] = a * w0 + c * h1 + tx;
        quad.vertices[3] = d * h1 + b * w0 + ty;

        // xy
        quad.vertices[4] = a * w0 + c * h0 + tx;
        quad.vertices[5] = d * h0 + b * w0 + ty;

        // xy
        quad.vertices[6] = a * w1 + c * h0 + tx;
        quad.vertices[7] = d * h0 + b * w1 + ty;

        quad.upload();


        // handle tint and worldAlpha
        var tintAlpha = this._tintAlpha;
        PIXI.utils.hex2rgb(sprite.tint, tintAlpha);
        var alpha = sprite.worldAlpha;
        tintAlpha[0] *= alpha;
        tintAlpha[1] *= alpha;
        tintAlpha[2] *= alpha;
        tintAlpha[3]  = alpha;
        shader.uniforms.uTintAlpha = tintAlpha;


        // copy uniforms from sprite to shader
        var spriteUniforms = sprite.pluginUniforms;
        var shaderUniforms = shader.uniforms;
        if (spriteUniforms) {
            for (var key in spriteUniforms) {
                shaderUniforms[key] = spriteUniforms[key];
            }
        }


        // draw
        quad.vao.draw(this.renderer.gl.TRIANGLES, 6, 0);
    };

    // register and assign ShaderPlugin
    PIXI.WebGLRenderer.registerPlugin(name, ShaderPlugin);
    PIXI.CanvasRenderer.registerPlugin(name, PIXI.CanvasSpriteRenderer);

    Object.assign(PIXI.extras, ShaderPlugin);
}