/* =====================  THREE SCENE  ===================== */
var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("scene").appendChild(renderer.domElement);

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0e);
scene.fog = new THREE.Fog(0x0b0b0e, 22, 70);

var camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 200);

/* lights */
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
var key = new THREE.DirectionalLight(0xffffff, 0.6);
key.position.set(4, 9, 6);
key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-12; key.shadow.camera.right=12;
key.shadow.camera.top=12;  key.shadow.camera.bottom=-12;
key.shadow.radius = 5;
scene.add(key);
var pageGlow = new THREE.PointLight(0xfff3ea, 0.5, 30);   /* the "screen" lights the void */
pageGlow.position.set(0, 5, -5);
scene.add(pageGlow);

/* --- endless grid floor fading into darkness --- */
function makeGridTexture(){
  var c = document.createElement("canvas"); c.width = c.height = 256;
  var g = c.getContext("2d");
  g.fillStyle = "#121215"; g.fillRect(0,0,256,256);
  g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = 2;
  g.beginPath();
  for(var i=0;i<=256;i+=64){ g.moveTo(i,0); g.lineTo(i,256); g.moveTo(0,i); g.lineTo(256,i); }
  g.stroke();
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(60, 60);
  return t;
}
var floor = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 240),
  new THREE.MeshStandardMaterial({map:makeGridTexture(), roughness:0.95})
);
floor.rotation.x = -Math.PI/2; floor.receiveShadow = true;
scene.add(floor);
