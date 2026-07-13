/* =====================  THE 404 WEBPAGE  ===================== */

/* page slab lives in a group so it can scale 0 -> 1 on entrance */
var pageGroup = new THREE.Group();
pageGroup.position.set(0, PAGE_BOTTOM + PAGE_H/2, PAGE_Z);
pageGroup.scale.setScalar(0.001);
scene.add(pageGroup);

var page = new THREE.Mesh(
  new THREE.PlaneGeometry(PAGE_W, PAGE_H),
  new THREE.MeshBasicMaterial({color:0xfafaf8})   /* self-lit, like a screen */
);
pageGroup.add(page);
/* thin dark frame behind it so the page reads as a floating slab */
var pageBack = new THREE.Mesh(
  new THREE.BoxGeometry(PAGE_W+0.3, PAGE_H+0.3, 0.15),
  new THREE.MeshStandardMaterial({color:0x1c1a17, roughness:0.7})
);
pageBack.position.z = -0.12;
pageGroup.add(pageBack);

function registerElement(mesh, h){
  mesh.visible = false;              /* revealed by the entrance animation */
  scene.add(mesh);
  letters.push({mesh:mesh, state:"on", home:mesh.position.clone(),
                shakeT:0, popT:0, vel:new THREE.Vector3(), angVel:new THREE.Vector3(), h:h});
}
function makeElementMesh(wWorld, hWorld, texW, texH, draw){
  var c = document.createElement("canvas");
  c.width = texW; c.height = texH;
  draw(c.getContext("2d"), texW, texH);
  var tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(wWorld, hWorld),
    new THREE.MeshBasicMaterial({map:tex, transparent:true, side:THREE.DoubleSide})
  );
}

/* browser chrome bar (dots + URL) */
var chromeBar = makeElementMesh(PAGE_W, 0.9, 1400, 90, function(g, W, H){
  g.fillStyle = "#e8e6e2"; g.fillRect(0,0,W,H);
  var dots = ["#ff5f57","#febc2e","#28c840"];
  for(var i=0;i<3;i++){ g.fillStyle = dots[i]; g.beginPath(); g.arc(45+i*38, 45, 12, 0, Math.PI*2); g.fill(); }
  g.fillStyle = "#ffffff";
  g.beginPath(); g.moveTo(200,22); g.lineTo(W-50,22); g.quadraticCurveTo(W-27,22,W-27,45); g.quadraticCurveTo(W-27,68,W-50,68); g.lineTo(200,68); g.quadraticCurveTo(177,68,177,45); g.quadraticCurveTo(177,22,200,22); g.fill();
  g.fillStyle = "#8a867e"; g.font = "400 30px Arial, sans-serif"; g.textBaseline = "middle";
  g.fillText("https://www.criticalmass.com/404", 210, 47);
});
chromeBar.position.set(0, PAGE_TOP - 0.45, PAGE_Z + 0.07);
registerElement(chromeBar, 0.9);

/* fake "go home" button */
var goHome = makeElementMesh(3.2, 0.95, 640, 190, function(g, W, H){
  g.strokeStyle = "#1c1a17"; g.lineWidth = 8;
  g.strokeRect(6, 6, W-12, H-12);
  g.fillStyle = "#1c1a17"; g.font = "700 78px Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("\u2190 Go home", W/2, H/2 + 4);
});
goHome.position.set(0, 2.4, PAGE_Z + 0.07);
registerElement(goHome, 0.95);

/* footer: divider + text */
var footer = makeElementMesh(10, 0.6, 1000, 60, function(g, W, H){
  g.strokeStyle = "#dcd9d3"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 4); g.lineTo(W, 4); g.stroke();
  g.fillStyle = "#b6b2aa"; g.font = "400 30px Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("\u00a9 2026 \u00b7 there is nothing here \u00b7 throw responsibly", W/2, H/2 + 6);
});
footer.position.set(0, 1.0, PAGE_Z + 0.07);
registerElement(footer, 0.6);

/* reload spinner (hidden until the page "refreshes") */
var spinner = makeElementMesh(1.2, 1.2, 128, 128, function(g, W, H){
  g.strokeStyle = "#1c1a17"; g.lineWidth = 12;
  g.beginPath(); g.arc(W/2, H/2, 44, 0, Math.PI*1.5); g.stroke();
});
spinner.position.set(0, PAGE_BOTTOM + PAGE_H/2, PAGE_Z + 0.07);
spinner.visible = false;
scene.add(spinner);

function makeCharMesh(ch, h, color){
  var fontPx = 200;
  var m = document.createElement("canvas").getContext("2d");
  m.font = "900 " + fontPx + "px 'Arial Black', Arial, sans-serif";
  var wPx = Math.max(m.measureText(ch).width, fontPx*0.3);
  var c = document.createElement("canvas");
  c.width = Math.ceil(wPx) + 24; c.height = fontPx + 60;
  var g = c.getContext("2d");
  g.font = m.font; g.fillStyle = color;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(ch, c.width/2, c.height/2 + 10);
  var tex = new THREE.CanvasTexture(c);
  var w = h * c.width/c.height;
  var mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({map:tex, transparent:true, side:THREE.DoubleSide})
  );
  return {mesh:mesh, w:w, h:h};
}
function layoutText(str, cx, cy, h, color, tracking){
  var made = [], totalW = 0, i;
  for(i=0;i<str.length;i++){
    if(str[i] === " "){ made.push(null); totalW += h*0.35; continue; }
    var cm = makeCharMesh(str[i], h, color);
    made.push(cm); totalW += cm.w*tracking;
  }
  var x = cx - totalW/2;
  for(i=0;i<made.length;i++){
    if(!made[i]){ x += h*0.35; continue; }
    var cm2 = made[i];
    x += cm2.w*tracking/2;
    cm2.mesh.position.set(x, cy, PAGE_Z + 0.08);
    x += cm2.w*tracking/2;
    cm2.mesh.visible = false;          /* revealed by the entrance animation */
    scene.add(cm2.mesh);
    letters.push({mesh:cm2.mesh, state:"on", home:cm2.mesh.position.clone(),
                  shakeT:0, popT:0, vel:new THREE.Vector3(), angVel:new THREE.Vector3(), h:cm2.h});
  }
}
layoutText("404", 0, 5.6, 2.3, "#ff5c1f", 1.02);
layoutText("PAGE NOT FOUND", 0, 3.9, 0.58, "#1c1a17", 1.08);

function knockLetters(px, py, force){
  var attached = [];
  for(var i=0;i<letters.length;i++){
    var L = letters[i];
    if(L.state !== "on") continue;
    var dx = L.mesh.position.x - px, dy = L.mesh.position.y - py;
    var d = Math.sqrt(dx*dx + dy*dy);
    if(d < 2.8){
      /* direct hit zone: blasted outward */
      var k = (1 - d/2.8)*0.8 + 0.4;
      L.state = "loose";
      L.vel.set(dx*1.6*k, (dy*1.2 + 2.5)*k, (2.5 + Math.random()*2.5)*k*(force/20));
      L.angVel.set((Math.random()-0.5)*7, (Math.random()-0.5)*7, (Math.random()-0.5)*7);
    } else {
      attached.push({L:L, d:d});
    }
  }
  /* the whole page jolts: closest 2 surviving letters shake loose and drop off */
  attached.sort(function(a,b){ return a.d - b.d; });
  for(var j=0;j<Math.min(2, attached.length);j++){
    var A = attached[j].L;
    A.state = "loose";
    A.vel.set((Math.random()-0.5)*0.8, 0.4 + Math.random()*0.6, 0.8 + Math.random()*0.8);
    A.angVel.set((Math.random()-0.5)*3, (Math.random()-0.5)*3, (Math.random()-0.5)*3);
  }
  /* everyone else rattles in place */
  for(var m=Math.min(2, attached.length); m<attached.length; m++) attached[m].L.shakeT = 0.45;
}

function checkReload(){
  if(reloadPhase !== "none") return;
  for(var i=0;i<letters.length;i++) if(letters[i].state === "on") return;
  reloadPhase = "waiting"; reloadT = 0;
}
function clearSplats(){
  while(splats.length){
    var s = splats.pop();
    scene.remove(s);
    s.material.map.dispose(); s.material.dispose(); s.geometry.dispose();
  }
  splatAnims.length = 0;
}
function updateReload(dt){
  if(reloadPhase === "none") return;
  reloadT += dt;
  if(reloadPhase === "waiting"){
    if(reloadT > 1.3){ reloadPhase = "spin"; reloadT = 0; spinner.visible = true; }
  } else if(reloadPhase === "spin"){
    spinner.rotation.z -= dt*7;
    var fade = Math.max(0, 1 - reloadT/0.7);
    for(var i=0;i<letters.length;i++) letters[i].mesh.material.opacity = fade;
    if(reloadT > 1.1){
      spinner.visible = false;
      clearSplats();
      for(var j=0;j<letters.length;j++){
        var L = letters[j];
        L.state = "on"; L.shakeT = 0; L.popT = 0.35;
        L.mesh.position.copy(L.home);
        L.mesh.rotation.set(0,0,0);
        L.mesh.material.opacity = 1;
        L.vel.set(0,0,0); L.angVel.set(0,0,0);
      }
      reloadPhase = "none";
      showHint("Page reloaded. Do it again.", false);
    }
  }
}

function updateLetters(dt){
  for(var i=0;i<letters.length;i++){
    var L = letters[i];
    if(L.state === "on"){
      if(L.popT > 0){
        L.popT -= dt;
        var pk = 1 - Math.max(0, L.popT/0.35);
        L.mesh.scale.setScalar(0.3 + 0.7*(1 - Math.pow(1-pk, 3)));
        if(L.popT <= 0) L.mesh.scale.setScalar(1);
      }
      if(L.shakeT > 0){
        L.shakeT -= dt;
        var s = Math.max(0, L.shakeT/0.45)*0.08;
        L.mesh.position.set(L.home.x + (Math.random()-0.5)*s,
                            L.home.y + (Math.random()-0.5)*s,
                            L.home.z);
        L.mesh.rotation.z = (Math.random()-0.5)*s*1.5;
        if(L.shakeT <= 0){ L.mesh.position.copy(L.home); L.mesh.rotation.z = 0; }
      }
      continue;
    }
    if(L.state !== "loose") continue;
    L.vel.y -= 9.8*dt;
    L.mesh.position.addScaledVector(L.vel, dt);
    L.mesh.rotation.x += L.angVel.x*dt;
    L.mesh.rotation.y += L.angVel.y*dt;
    L.mesh.rotation.z += L.angVel.z*dt;
    var floorY = L.h*0.5*0.4;                     /* lying nearly flat */
    if(L.mesh.position.y < floorY){
      L.mesh.position.y = floorY;
      L.vel.y = Math.abs(L.vel.y)*0.35;
      L.vel.x *= 0.7; L.vel.z *= 0.7;
      L.angVel.multiplyScalar(0.5);
      if(L.vel.length() < 0.6){
        L.state = "rest";
        L.mesh.rotation.x = -Math.PI/2 + (Math.random()-0.5)*0.3;   /* settle flat on the grid */
      }
    }
  }
}
