"use strict";

var canvas;
var gl;

var viewProjectionMatrixLoc;
var worldMatrixLoc;

var vBuffer;
var cBuffer;
var iBuffer;

var numElements = 0;
var vertices = [];
var vertexColors = [];
var indices = [];

var movementFlag = 1;
var projFlag = 1;
var cameraAngle = 0;
var xRotation = 0.0;
var yHeight = 2.5;
var zScale = 1.0;
var lastFrameTime = 0;

init();

function init() {
    canvas = document.getElementById("gl-canvas");
    if (!canvas) showError("Failed to retrieve the <canvas> element");
    
    gl = canvas.getContext('webgl2');
    if (!gl) showError("WebGL 2.0 isn't available");

    createSceneGeometry();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.9, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    if (!program) showError("Error in shader initialization");
    gl.useProgram(program);
    
    // --- BUFFERS ---
    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);
    
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    
    if (!iBuffer || !cBuffer || !vBuffer) {
        showError(`Failed to create buffers: i=${!!iBuffer} c=${!!cBuffer} v=${!!vBuffer}`)
        return;
    }

    // --- LOCATIONS ---
    var positionLoc = gl.getAttribLocation(program, "aPosition");
    var colorLoc = gl.getAttribLocation(program, "aColor");
    viewProjectionMatrixLoc = gl.getUniformLocation(program, "viewProjectionMatrix");
    worldMatrixLoc = gl.getUniformLocation(program, 'worldMatrix');
    
    if (positionLoc < 0 || colorLoc < 0 || !viewProjectionMatrixLoc || !worldMatrixLoc) {
        showError(`Failed to get attribs: pos=${positionLoc} col=${colorLoc} viewProjectionMatrix=${!!viewProjectionMatrixLoc} worldMatrix=${!!worldMatrixLoc}`)
        return;
    }
    
    gl.enableVertexAttribArray(positionLoc);
    gl.enableVertexAttribArray(colorLoc);
        
    // gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    // gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);

    // --- LISTENERS ---
    document.getElementById("x_slide").oninput = (event) => { xRotation = parseFloat(event.target.value); };
    document.getElementById("y_slide").oninput = (event) => { yHeight = parseFloat(event.target.value); };
    document.getElementById("z_slide").oninput = (event) => { zScale = parseFloat(event.target.value); };
    document.getElementById("movement_toggle").addEventListener('change', function() {
        movementFlag = this.checked ? 1 : 0
    })
    document.getElementById("projection_toggle").addEventListener('change', function() {
        projFlag = this.checked ? 1 : 0
    })

    lastFrameTime = performance.now();
    requestAnimationFrame(render);
}

function render(currentTime) {
    const dt = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;

    cameraAngle += dt * radians(10 * movementFlag);

    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const cameraX = 4 * Math.sin(cameraAngle);
    const cameraZ = 4 * Math.cos(cameraAngle);
    var cameraY = yHeight
    const eye = vec3(cameraX, cameraY, cameraZ);
    const at = vec3(0, 0, 0);
    const up = vec3(0, 1, 0);
    const matView = lookAt(eye, at, up);
    const matProj = projFlag == 1 ? perspective(45, canvas.width / canvas.height, 0.1, 100.0) : ortho(-2, 2, -0.5, 2, 0.1, 10.0);
    const matViewProj = mult(matProj, matView);

    let matWorld = rotateY(xRotation);
    // matWorld = mult(matWorld, rotateX(yRotation));
    matWorld = mult(matWorld, scale(zScale, zScale, zScale));
    
    gl.uniformMatrix4fv(viewProjectionMatrixLoc, false, flatten(matViewProj));
    gl.uniformMatrix4fv(worldMatrixLoc, false, flatten(matWorld));

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "aPosition"), 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "aColor"), 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);

    gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}

function createSceneGeometry(){
    const woodColors = [
        vec4(0.40, 0.29, 0.20, 1.0),  
        vec4(0.51, 0.36, 0.31, 1.0),
        vec4(0.91, 0.85, 0.82, 1.0),
        vec4(0.80, 0.69, 0.60, 1.0),
        vec4(0.25, 0.18, 0.13, 1.0),
        vec4(0.32, 0.22, 0.16, 1.0),
        vec4(0.69, 0.52, 0.39, 1.0),
        vec4(0.62, 0.44, 0.31, 1.0)
    ];

    vertices.push(...floor());
    vertexColors.push(
        vec4(0.08, 0.08, 0.08, 1.0), // Dark grey for the floor
        vec4(0.44, 0.44, 0.44, 1.0),
        vec4(0.77, 0.77, 0.77, 1.0),
        vec4(0.44, 0.44, 0.44, 1.0),
    );
    indices.push(0, 1, 2, 0, 2, 3); // Indices for the first 4 vertices

    const tableVertices = table();
    const chair1Vertices = chair([0, 0, 0.8]);
    const chair2Vertices = chair([0, 0, -0.8]);

    let allObjectVertices = [...tableVertices, ...chair1Vertices, ...chair2Vertices];

    for (const v of allObjectVertices) {
        vertices.push(v);
    }

    const numCubes = allObjectVertices.length / 8; // 8 vertices per cube
    for (let i = 0; i < numCubes; i++) {
        vertexColors.push(...woodColors);
        const vertexOffset = 4 + (i * 8); // Start after the 4 floor vertices
        indices.push(...cubeIndices(vertexOffset));
    }
    
    numElements = indices.length;
}
var debugColors = [
    vec4(0.0, 0.0, 0.0, 1.0),  // black
    vec4(1.0, 0.0, 0.0, 1.0),  // red
    vec4(1.0, 1.0, 0.0, 1.0),  // yellow
    vec4(0.0, 1.0, 0.0, 1.0),  // green
    vec4(0.0, 0.0, 1.0, 1.0),  // blue
    vec4(1.0, 0.0, 1.0, 1.0),  // magenta
    vec4(1.0, 1.0, 1.0, 1.0),  // white
    vec4(0.0, 1.0, 1.0, 1.0),   // cyan
]

function cube(anchor, length, width, height, message="cube") {
    // anchor is the bottom center of the cube
    var x = anchor[0];
    var y = anchor[1];
    var z = anchor[2];

    var vertices = [
        vec3(x - length / 2, y,          z + width / 2),
        vec3(x - length / 2, y + height, z + width / 2),
        vec3(x + length / 2, y + height, z + width / 2),
        vec3(x + length / 2, y,          z + width / 2),
        vec3(x - length / 2, y,          z - width / 2),
        vec3(x - length / 2, y + height, z - width / 2),
        vec3(x + length / 2, y + height, z - width / 2),
        vec3(x + length / 2, y,          z - width / 2)
    ];
    console.log({
        "message": message,
        vertices
    });
    return vertices;
}

function cubeIndices(offset) {
    var baseIndices = [
        1, 0, 3,  3, 2, 1, // front face
        2, 3, 7,  7, 6, 2, // right face
        3, 0, 4,  4, 7, 3, // bottom face
        6, 5, 1,  1, 2, 6, // top face
        4, 5, 6,  6, 7, 4, // back face
        5, 4, 0,  0, 1, 5, // left face
    ];

    return baseIndices.map(i => i + offset);
}

function floor(width=5) {
    var vertices = [
        vec3(-width, -0.5, -width),
        vec3(-width, -0.5,  width),
        vec3( width, -0.5,  width),
        vec3( width, -0.5, -width),
    ];
    // console.log(vertices);
    return vertices;
}

function chair(anchor, direction=0) {
    var x = anchor[0];
    var y = anchor[1];
    var z = anchor[2];
    var chair_cubes = [
        cube([x + 0,    y - 0.0875,  z +    0],  1.1,   0.2,   0.025, "chair top 1"),
        cube([x + 0,    y - 0.0875,  z + 0.15],  1.1,   0.1,   0.025, "chair top 2"),
        cube([x + 0,    y - 0.0875,  z - 0.15],  1.1,   0.1,   0.025, "chair top 3"),
        cube([x + 0.5,  y - 0.1375,  z +    0],  0.05,  0.3,   0.05, "chair z support 1"),
        cube([x - 0.5,  y - 0.1375,  z +    0],  0.05,  0.3,   0.05, "chair z support 2"),
        cube([x + 0,    y - 0.1375,  z - 0.17],  0.95,  0.05,  0.05, "chair x support 1"),
        cube([x + 0,    y - 0.1375,  z + 0.17],  0.95,  0.05,  0.05, "chair x support 1"),
        cube([x + 0.5,  y - 0.5,     z + 0.17],  0.05,  0.05,  0.4125, "chair leg 1"),
        cube([x + 0.5,  y - 0.5,     z - 0.17],  0.05,  0.05,  0.4125, "chair leg 2"),
        cube([x - 0.5,  y - 0.5,     z + 0.17],  0.05,  0.05,  0.4125, "chair leg 3"),
        cube([x - 0.5,  y - 0.5,     z - 0.17],  0.05,  0.05,  0.4125, "chair leg 4"),
    ]

    return chair_cubes.flat();
}

function table(anchor=[0,0,0]) {
    var x = anchor[0];
    var y = anchor[1];
    var z = anchor[2];

    var table_cubes = [
        cube([x +     0,  y + 0.2625,  z +     0],  0.1,    0.1,    0.001,  "top table center bop"), 
        cube([x + 0.225,  y + 0.2625,  z + 0.225],  0.05,   0.05,   0.001,  "top table bop 1"), 
        cube([x - 0.225,  y + 0.2625,  z + 0.225],  0.05,   0.05,   0.001,  "top table bop 2"), 
        cube([x + 0.225,  y + 0.2625,  z - 0.225],  0.05,   0.05,   0.001,  "top table bop 3"), 
        cube([x - 0.225,  y + 0.2625,  z - 0.225],  0.05,   0.05,   0.001,  "top table bop 4"), 
        cube([x + 0,      y + 0.1625,  z +     0],  1,      1,      0.1,    "top table"), 
        cube([x + 0,      y + 0.0125,  z +     0],  0.25,   0.25,   0.15,   "upper main leg"), 
        cube([x + 0,      y - 0.0375,  z +     0],  0.25,   0.25,   0.05,   "grooves 1"), 
        cube([x + 0,      y - 0.0875,  z +     0],  0.25,   0.25,   0.05,   "grooves 2"), 
        cube([x + 0,      y - 0.1375,  z +     0],  0.25,   0.25,   0.05,   "grooves 3"), 
        cube([x + 0,      y - 0.1875,  z +     0],  0.25,   0.25,   0.05,   "grooves 4"), 
        cube([x + 0,      y - 0.2375,  z +     0],  0.25,   0.25,   0.05,   "grooves 5"), 
        cube([x + 0.125,  y - 0.3375,  z +     0],  0.005,  0.05,   0.05,   "bopper x 1"), 
        cube([x - 0.125,  y - 0.3375,  z +     0],  0.005,  0.05,   0.05,   "bopper x 2"), 
        cube([x + 0,      y - 0.3375,  z + 0.125],  0.05,   0.005,  0.05,   "bopper z 1"), 
        cube([x + 0,      y - 0.3375,  z - 0.125],  0.05,   0.005,  0.05,   "bopper z 2"), 
        cube([x + 0,      y - 0.3875,  z +     0],  0.25,   0.25,   0.15,   "bottom main leg"), 
        cube([x + 0,      y - 0.4,     z +     0],  0.375,  0.375,  0.0125, "base support"), 
        cube([x + 0,      y - 0.5,     z +     0],  0.5,    0.5,    0.10,   "base") 
    ];

    return table_cubes.flat();
}