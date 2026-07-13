/* =====================  GLOBAL STATE  ===================== */
var mode = "boot";               // boot | mouse | hand
var yaw = 0, yawVel = 0;
var camRadius = 6, camRadiusTarget = 6;
var CAM_H = 2.6;
var grip = 0, gripTarget = 0;    // 0 open .. 1 full squeeze
var ballState = "hidden";        // hidden | intro | idle | flying | splat | reset
var ballVel = new THREE.Vector3();
var splats = [];
var MAX_SPLATS = 40;
var lastTime = performance.now();

var BALL_R = 1;
var BALL_HOME = new THREE.Vector3(0, 2.6, 0);
var BALL_COLOR = 0xff5c1f;

var PAGE_Z = -9, PAGE_W = 14, PAGE_H = 8, PAGE_BOTTOM = 0.5;
var PAGE_TOP = PAGE_BOTTOM + PAGE_H;

var letters = [];   /* holds letters AND ui elements: same physics */
var reloadPhase = "none", reloadT = 0;
var splatAnims = [];
var shake = 0;
var idleT = 0, wobble = 0, wobbleVel = 0;
