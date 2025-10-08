"use strict";

var canvas;
var gl;

var viewProjectionMatrixLoc;
var worldMatrixLoc;
var normalMatrixLoc;

var vBuffer;
var nBuffer;
var iBuffer;

var numElements = 0;
var vertices = [];
var vertexNormals = [];
var indices = [];

var lightPositionLoc;
var ambientProductLoc, diffuseProductLoc, specularProductLoc;
var shininessLoc;
var eyePositionLoc;

var lightRotationAngle = 0.0;
var staticLightY = 0.0;
var rotationSpeed = 0.0;
var shininess = 30.0;

var movementFlag = 1;
var lightMovementFlag = 1;
var projFlag = 1;
var cameraAngle = 0;
var xRotation = 0.0;
var yHeight = 2.5;
var zScale = 1.0;
var lastFrameTime = 0;

const materialAmbient = vec4(0.1, 0.1, 0.1, 1.0);
const materialDiffuse = vec4(0.7, 0.7, 0.7, 1.0);
const materialSpecular = vec4(0.9, 0.9, 0.9, 1.0);
const lightColor = vec4(0.8, 0.8, 0.8, 1.0);

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

    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexNormals), gl.STATIC_DRAW);
    
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    
    if (!iBuffer || !nBuffer || !vBuffer) {
        showError(`Failed to create buffers: i=${!!iBuffer} c=${!!nBuffer} v=${!!vBuffer}`)
        return;
    }

    // --- LOCATIONS ---
    var positionLoc = gl.getAttribLocation(program, "aPosition");
    var colorLoc = gl.getAttribLocation(program, "aNormal");

    viewProjectionMatrixLoc = gl.getUniformLocation(program, "viewProjectionMatrix");
    worldMatrixLoc = gl.getUniformLocation(program, 'worldMatrix');
    normalMatrixLoc = gl.getUniformLocation(program, 'normalMatrix');
    
    if (positionLoc < 0 || colorLoc < 0 || !viewProjectionMatrixLoc || !worldMatrixLoc || !normalMatrixLoc) {
        showError(`Failed to get attribs: pos=${positionLoc} col=${colorLoc} viewProjectionMatrix=${!!viewProjectionMatrixLoc} worldMatrix=${!!worldMatrixLoc} normalMatrix=${!!normalMatrixLoc}`); 
        return;
    }

    ambientProductLoc = gl.getUniformLocation(program, "uAmbientProduct");
    diffuseProductLoc = gl.getUniformLocation(program, "uDiffuseProduct");
    specularProductLoc = gl.getUniformLocation(program, "uSpecularProduct"); 

    lightPositionLoc = gl.getUniformLocation(program, "uLightPosition");
    shininessLoc = gl.getUniformLocation(program, "uShininess");
    eyePositionLoc = gl.getUniformLocation(program, "uEyePosition");
    
    
    gl.enableVertexAttribArray(positionLoc);
    gl.enableVertexAttribArray(colorLoc);
        
    gl.uniform4fv(ambientProductLoc, mult(materialAmbient, lightColor));
    gl.uniform4fv(diffuseProductLoc, mult(materialDiffuse, lightColor));
    gl.uniform4fv(specularProductLoc, mult(materialSpecular, lightColor));

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
    document.getElementById("light_movement_toggle").addEventListener('change', function() {
        lightMovementFlag = this.checked ? 1 : 0
    })
    document.getElementById("rot_speed_slide").oninput = (event) => { rotationSpeed = parseFloat(event.target.value); };
    document.getElementById("static_y_slide").oninput = (event) => { staticLightY = parseFloat(event.target.value); };
    document.getElementById("shininess_slide").oninput = (event) => { shininess = parseFloat(event.target.value); };

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
    const matProj = projFlag == 1 ? perspective(45, canvas.width / canvas.height, 0.1, 100.0) : ortho(-2, 2, -0.5, 2, -10, 10.0);
    const matViewProj = mult(matProj, matView);

    let matWorld = rotateY(xRotation);
    // matWorld = mult(matWorld, rotateX(yRotation));
    matWorld = mult(matWorld, scale(zScale, zScale, zScale));

    const matNormal = normalMatrix(matWorld, true);
    
    gl.uniformMatrix4fv(viewProjectionMatrixLoc, false, flatten(matViewProj));
    gl.uniformMatrix4fv(worldMatrixLoc, false, flatten(matWorld));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(matNormal));

    lightRotationAngle += dt * radians(rotationSpeed * lightMovementFlag);
    const lightX = 3 * Math.sin(lightRotationAngle);
    const lightZ = 3 * Math.cos(lightRotationAngle);
    const lightPosition = vec4(lightX, staticLightY, lightZ, 1.0);

    gl.uniform4fv(lightPositionLoc, flatten(lightPosition));
    gl.uniform1f(shininessLoc, shininess);
    gl.uniform3fv(eyePositionLoc, flatten(eye));

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "aPosition"), 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "aNormal"), 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}
function createSceneGeometry() {
    vertices = [];
    vertexNormals = [];
    indices = [];

    const floorVerts = floor();
    const floorNormal = vec3(0.0, 1.0, 0.0);
    for (let i = 0; i < floorVerts.length; i++) {
        vertices.push(floorVerts[i]);
        vertexNormals.push(floorNormal);
    }
    indices.push(0, 1, 2, 0, 2, 3);
    let currentVertexIndex = 4;

    const tableVertices = table();
    const chair1Vertices = chair([0, 0, 1.2]);
    const chair2Vertices = chair([0, 0, -1.2]);
    let allObjectCubes = [
        ...tableVertices,
        ...chair1Vertices,
        ...chair2Vertices
    ];

    const faceOrder = [
        [1, 0, 3, 2], // Front
        [2, 3, 7, 6], // Right
        [3, 0, 4, 7], // Bottom
        [6, 5, 1, 2], // Top
        [4, 5, 6, 7], // Back
        [5, 4, 0, 1]  // Left
    ];

    const cubeFaceNormals = [
        vec3(0.0, 0.0, 1.0),   // Front
        vec3(1.0, 0.0, 0.0),   // Right
        vec3(0.0, -1.0, 0.0),  // Bottom
        vec3(0.0, 1.0, 0.0),   // Top
        vec3(0.0, 0.0, -1.0),  // Back
        vec3(-1.0, 0.0, 0.0),  // Left
    ];

    for (const cubeVerts of allObjectCubes) {
        for (let j = 0; j < 6; j++) { 
            const normal = cubeFaceNormals[j];
            const faceIndices = faceOrder[j];

            vertices.push(cubeVerts[faceIndices[0]], cubeVerts[faceIndices[1]], cubeVerts[faceIndices[2]], cubeVerts[faceIndices[3]]);
            vertexNormals.push(normal, normal, normal, normal);
            
            indices.push(
                currentVertexIndex, currentVertexIndex + 1, currentVertexIndex + 2,
                currentVertexIndex, currentVertexIndex + 2, currentVertexIndex + 3
            );
            currentVertexIndex += 4;
        }
    }
    numElements = indices.length;
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

    return chair_cubes;
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

    return table_cubes;
}