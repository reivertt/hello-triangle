"use strict";

var gl;
init();

function init()
{
    var canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert( "WebGL 2.0 isn't available" );



    // Initialize the vertex  positions.

    var vertices = [
        vec2(0, 0),
        vec2(0,  1),
        vec2(0.951, 0.309),
        vec2(0.588, -0.809),
        vec2(-0.588, -0.809),
        vec2(-0.951, 0.309),
        vec2(0,  1),
    ];

    var indices = new Uint16Array([
        0, 1, 2,  // Triangle 1
        0, 2, 3,  // Triangle 2
        0, 3, 4,  // Triangle 3
        0, 4, 5,  // Triangle 4
        0, 5, 1   // Triangle 5 
    ]);
   //
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    //  Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU
    var bufferId = gl.createBuffer(); //creating a vertex buffer object (VBO) on the GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId ); //he binding operation makes this buffer the current buffer. Subsequent functions that put data in a buffer will use this buffer until we bind a different buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW); //function to send the data to a buffer on the GPU
   //fungsi flatten ada di MV.js yang berfungsi mengubah JavaScript objects (e.g., vec2, or mat4) ke format data yang diterima oleh gl.bufferData.
    //gl.STATIC_DRAW means we are sending them once and displaying them

    // Associate out shader variables with our data buffer

    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    //set up values for color atribute
   
    let  color = new Float32Array([ 
        1,1,1, 
        0,0,1, 
        0,1,0,
        0,1,1, 
        1,0,0, 
        1,0,1, 
        // 0,0,1 
    ]);

    var bufferColor = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferColor);
    gl.bufferData(gl.ARRAY_BUFFER, color, gl.STREAM_DRAW);

    var attributeColor = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(attributeColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributeColor); 
    
    // Create and bind the index buffer
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    //gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.drawElements(gl.TRIANGLES, 15, gl.UNSIGNED_SHORT, 0);
}
