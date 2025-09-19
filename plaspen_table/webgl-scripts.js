"use strict";

var canvas;
var gl;
var cubes = 0;
var axis = 0;
var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var theta = [0, 0, 0];
var thetaLoc;
var flag = true;
var numElements = 0;
var ctm=[];
var MVMLoc;

// --- VARIABLES FOR ROTATION ---
var xRotation = 30.0;
var yRotation = 30.0;
var zScale = 1.0;

// --- CONSTANTS ---
const TABLE_CUBES = 19;
const CHAIR_CUBES = 11;

var defaultColors = [
    vec4(0.0, 0.0, 0.0, 1.0),  // black
    vec4(1.0, 0.0, 0.0, 1.0),  // red
    vec4(1.0, 1.0, 0.0, 1.0),  // yellow
    vec4(0.0, 1.0, 0.0, 1.0),  // green
    vec4(0.0, 0.0, 1.0, 1.0),  // blue
    vec4(1.0, 0.0, 1.0, 1.0),  // magenta
    vec4(1.0, 1.0, 1.0, 1.0),  // white
    vec4(0.0, 1.0, 1.0, 1.0),   // cyan
]

var wood = [
    vec4(0.40, 0.29, 0.20, 1.0),  
    vec4(0.51, 0.36, 0.31, 1.0),
    vec4(0.91, 0.85, 0.82, 1.0),
    vec4(0.80, 0.69, 0.60, 1.0),
    vec4(0.25, 0.18, 0.13, 1.0),
    vec4(0.32, 0.22, 0.16, 1.0),
    vec4(0.69, 0.52, 0.39, 1.0),
    vec4(0.62, 0.44, 0.31, 1.0)
];

// --- DATA SETUP ---
var vertices = [];
var vertexColors = [];
var indices = [];

cubes += TABLE_CUBES + (CHAIR_CUBES * 2); // 2 chairs
console.log(cubes)
// Floor
vertices.push(...floor(-0.5));
vertexColors.push(
    vec4(0.44, 0.44, 0.44, 1.0), // Dark grey for the floor
    vec4(0.44, 0.44, 0.44, 1.0),
    vec4(0.44, 0.44, 0.44, 1.0),
    vec4(0.44, 0.44, 0.44, 1.0)
);
indices.push(0, 1, 2, 2, 3, 0); // Indices for the first 4 vertices


// Structures
vertices.push(...table());
vertices = vertices.concat(chair([0,0,0.8]));
vertices = vertices.concat(chair([0,0,-0.8]));
// vertices = vertices.flat();

for (let i = 0; i < cubes; i++) {
    vertexColors.push(...wood);
    const vertexOffset = 4 + (i * 8);
    indices.push(...cubeIndices(vertexOffset));
}

numElements = indices.length;
console.log(numElements)

init();

function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.9, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

    var colorLoc = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    MVMLoc = gl.getUniformLocation(program, "modelViewMatrix");

    document.getElementById("x_slide").oninput = function(event) { 
        xRotation = parseFloat(event.target.value); 
        render();
    };
    
    document.getElementById("y_slide").oninput = function(event) { 
        yRotation = parseFloat(event.target.value); 
        render();
    };

    document.getElementById("z_slide").oninput = function(event) {
        zScale = parseFloat(event.target.value);
        render();
    };

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    theta[0] = -yRotation; // y
    theta[1] = xRotation; // x   

    ctm = rotateX(theta[xAxis]);
    ctm = mult(ctm, rotateY(theta[yAxis]));

    var scaleMatrix = scale(zScale, zScale, zScale);
    ctm = mult(ctm, scaleMatrix);

    gl.uniformMatrix4fv(MVMLoc, false, flatten(ctm));
    gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}

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

function floor(level=-0.5) {
    var vertices = [
        vec3(-2, level,  2),
        vec3(-2, level, -2),
        vec3( 2, level, -2),
        vec3( 2, level,  2),
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