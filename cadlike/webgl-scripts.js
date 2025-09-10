"use strict";

function showError(errorText) {
    const errorBoxDiv = document.getElementById("error-box");
    const errorTextElement = document.createElement("p");
    errorTextElement.innerText = errorText;
    errorBoxDiv.appendChild(errorTextElement);
    console.log(errorText);
}

// showError("This is a test error message.");

var gl;
var n;
var index = 0;
var bufferId;

var Red = 0.3;
var Green = 0.0;
var Blue = 0.5;
var Alpha = 1.0;

var thetaColor;
var flag = 1;
var t;

function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) showError( "WebGL 2.0 isn't available" );

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    // Initialize the vertex  positions.
    var vertices = [
        vec2(-0.5, -0.5),
        vec2(0, 0.5),
        vec2(0.5, -0.5),
    ];

    n = vertices.length
   
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.08, 0.08, 0.08, 1.0);

    //  Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU
    bufferId = gl.createBuffer(); //creating a vertex buffer object (VBO) on the GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId ); //he binding operation makes this buffer the current buffer. Subsequent functions that put data in a buffer will use this buffer until we bind a different buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.DYNAMIC_DRAW); //function to send the data to a buffer on the GPU
   //fungsi flatten ada di MV.js yang berfungsi mengubah JavaScript objects (e.g., vec2, or mat4) ke format data yang diterima oleh gl.bufferData.
    //gl.STATIC_DRAW means we are sending them once and displaying them

    // Associate out shader variables with our data buffer
    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    thetaColor = gl.getUniformLocation(program, "thetaColor");
    if (!thetaColor) {
        showError("Failed to get the storage location of 'thetaColor'");
        return;
    }

    // Event Listeners

    document.getElementById("mymenu").addEventListener("click", function() {
        if (parseInt(event.target.value) == 0) {
            flag = 1;
            render();
        }
        else{
            flag = 2;
            console.log("TRIANGLE_STRIP is selected");
            render();
        }
    });

    //set up values for color atribute

    document.getElementById("red_slide").oninput =
    function() { 
        // Red = event.srcElement.value; 
        Red = parseFloat(event.target.value); 
        render();
    };
    document.getElementById("green_slide").oninput =
    function() { 
        // Green = event.srcElement.value; 
        Green = parseFloat(event.target.value); 
        render();
    };
    document.getElementById("blue_slide").oninput =
    function() { 
        // Blue = event.srcElement.value; 
        Blue = parseFloat(event.target.value); 
        render();
    };
    document.getElementById("alpha_slide").oninput =
    function() { 
        // Alpha = event.srcElement.value; 
        Alpha = parseFloat(event.target.value); 
        render();
    };

    canvas.addEventListener("mousedown", function(event){
        const rect = canvas.getBoundingClientRect();

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        t  = vec2(
            2 * mouseX / canvas.width - 1, 
            2 * (canvas.height - mouseY) / canvas.height - 1
        );
        showError( "a mouse is clicked at " +t);
        gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));
        //numPositions[numPolygons]++;
        index = (index + 1) % n;
        // index++;
        // render();
    });

    document.getElementById("generate").addEventListener("click", render);

    render();
};

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.clearColor(0.08, 0.08, 0.08, 1.0);
    //gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.uniform4fv(thetaColor, vec4(Red, Green, Blue, Alpha));

    if (flag==1) {
        gl.drawArrays(gl.TRIANGLES, 0, n);
    } else {
        gl.drawArrays(gl.LINE_LOOP, 0, n);
    }

}

window.onload = init;