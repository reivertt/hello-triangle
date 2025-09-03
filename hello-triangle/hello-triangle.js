function showError(errorText) {
    const errorBoxDiv = document.getElementById("error-box");
    const errorTextElement = document.createElement("p");
    errorTextElement.innerText = errorText;
    errorBoxDiv.appendChild(errorTextElement);
    console.log(errorText);
}

showError("This is a test error message.");

function helloTriangle() {
    /** @type {HTMLCanvasElement|null}*/
    const canvas = document.querySelector("#demo-canvas");
    if (!canvas) {
        showError("Unable to find canvas element with id 'demo-canvas'");
        return;
    }
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        const isWebLG1Supported = !!canvas.getContext("webgl");
        if (isWebLG1Supported) {
            showError("This browser supports WebGL 1 but not WebGL 2");
        } else {
            showError("This browser does not support WebGL");
        }
        return;
    }
    gl.clearColor(0.08, 0.08, 0.08, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //* Define triangle vertices in a typed array
    const triangleVertices = [
        0.0, 0.5,
        -0.5, -0.5,
        0.5, -0.5
    ];
    const triangleVerticesCpuBuffer = new Float32Array(triangleVertices);

    //* Create GPU buffer and upload vertex data
    const triangleGpuBuffer = gl.createBuffer();
    if (!triangleGpuBuffer) {
        showError("Unable to create GPU buffer");
        return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleGpuBuffer); // allocate buffer on GPU
    gl.bufferData(gl.ARRAY_BUFFER, triangleVerticesCpuBuffer, gl.STATIC_DRAW); // upload data to GPU
    
    //* Create and compile vertex shaders
    const vertexShaderSource = `#version 300 es
    precision mediump float;
    
    in vec2 vertexPosition;
    void main() {
        gl_Position = vec4(vertexPosition, 0.0, 1.0);
    }`;
   
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(vertexShader);
        showError(`Error compiling vertex shader: ${error}`);
        return;
    }

    //* Create and compile fragment shaders
    const fragmentShaderSource = `#version 300 es
    precision mediump float;

    out vec4 outputColor;

    void main() {
        outputColor = vec4(0.294, 0.0, 0.51, 1.0);
    }`;

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(fragmentShader);  
        showError(`Error compiling fragment shader: ${error}`);
        return;
    }

    //* Link shaders into a program
    const triangleShaderProgram = gl.createProgram();
    gl.attachShader(triangleShaderProgram, vertexShader);
    gl.attachShader(triangleShaderProgram, fragmentShader);
    gl.linkProgram(triangleShaderProgram);
    if (!gl.getProgramParameter(triangleShaderProgram, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(triangleShaderProgram);
        showError(`Error linking shader program: ${error}`);
        return;
    }
    const vertexPositionAttributeLocation = gl.getAttribLocation(triangleShaderProgram, "vertexPosition");
    if (vertexPositionAttributeLocation === -1) {
        showError("Unable to find attribute 'vertexPosition' in shader program");
        return;
    }

    // Output Merger
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.clearColor(0.08, 0.08, 0.08, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Rasterizer
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Set GPU program (vertex + fragment shaders)
    gl.useProgram(triangleShaderProgram);
    gl.enableVertexAttribArray(vertexPositionAttributeLocation);
    
    // Input Assembler
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleGpuBuffer);
    gl.vertexAttribPointer(
        vertexPositionAttributeLocation,
        2, // size (number of components per vertex attribute)
        gl.FLOAT, // type
        false, // normalized
        0, // stride (0 = move forward size * sizeof(type) each iteration to get the next position)
        0 // offset (start at the beginning of the buffer)
    );

    // Draw Call
    gl.drawArrays(gl.TRIANGLES, 0, 3); // mode, starting index, number of vertices
    
    }

try {
    helloTriangle();
} catch (e) {
    showError(`Uncaught JavaScript exception: ${e}`);
}