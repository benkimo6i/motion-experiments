/* =====================  BALL + ENTRANCE  ===================== */
var ball = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_R, 48, 48),
  new THREE.MeshStandardMaterial({color:BALL_COLOR, roughness:0.45, metalness:0.02})
);
ball.castShadow = true;
ball.position.copy(BALL_HOME);
ball.visible = false;
scene.add(ball);

var introStarted = false, introBounced = false, introVy = 0;
var introSettleT = -1, introSettleFrom = 0;
var pageInT = -1;   /* -1 = not running */
function easeOutBack(t){ var c = 1.70158; return 1 + (c+1)*Math.pow(t-1,3) + c*Math.pow(t-1,2); }
function startIntro(){
  if(introStarted) return;
  introStarted = true;
  ball.visible = true;
  ball.position.set(BALL_HOME.x, BALL_HOME.y + 9, BALL_HOME.z);
  introVy = 0; introBounced = false; introSettleT = -1;
  ballState = "intro";
  pageInT = -0.25;   /* slight delay before the page scales in */
}
function updateIntro(dt){
  if(pageInT === -1) return;
  pageInT += dt;
  if(pageInT < 0) return;
  var k = Math.min(pageInT/0.7, 1);
  pageGroup.scale.setScalar(Math.max(0.001, easeOutBack(k)));
  if(k >= 1){
    pageInT = -1;
    pageGroup.scale.setScalar(1);
    /* reveal the page contents with a pop */
    for(var i=0;i<letters.length;i++){
      letters[i].mesh.visible = true;
      letters[i].popT = 0.35 + (i%6)*0.05;   /* slight stagger */
    }
  }
}

/* --- vertex-level squish: finger dents pressed into the ball --- */
var ballGeo = ball.geometry;
var ballBasePos = ballGeo.attributes.position.array.slice();
var DENTS = [
  new THREE.Vector3( 1, 0.25,  0.35).normalize(),
  new THREE.Vector3(-1, 0.30, -0.25).normalize(),
  new THREE.Vector3( 0.3, 0.15, -1 ).normalize(),
  new THREE.Vector3(-0.35, 0.2,  1 ).normalize(),
  new THREE.Vector3( 0, -1, 0 )                    /* thumb underneath */
];
var lastDeform = -1;
var _v = new THREE.Vector3();
function deformBall(amount){
  if(Math.abs(amount - lastDeform) < 0.004) return;
  lastDeform = amount;
  var pos = ballGeo.attributes.position.array;
  for(var i=0;i<pos.length;i+=3){
    _v.set(ballBasePos[i], ballBasePos[i+1], ballBasePos[i+2]).normalize();
    var d = 0;
    for(var j=0;j<DENTS.length;j++){
      var dot = _v.dot(DENTS[j]);
      if(dot > 0.62) d += ((dot-0.62)/0.38) * 0.32;
    }
    var k = 1 - d*amount;
    pos[i]   = ballBasePos[i]  *k;
    pos[i+1] = ballBasePos[i+1]*k;
    pos[i+2] = ballBasePos[i+2]*k;
  }
  ballGeo.attributes.position.needsUpdate = true;
  ballGeo.computeVertexNormals();
}

/* aim direction helper (horizontal, toward the wall the camera faces) */
function aimDirection(){
  var d = _v.subVectors(BALL_HOME, camera.position); d.y = 0; d.normalize();
  return new THREE.Vector3(d.x, 0, d.z);
}

/* =====================  BALL LOGIC  ===================== */
var lastSquishAt = 0;
function throwBall(speed){
  if(ballState !== "idle") return;
  ballVel.copy(aimDirection()).multiplyScalar(speed);
  ballVel.y = speed*0.08;             /* slight arc, like before */
  ballState = "flying";
  gripTarget = 0;
  playWhoosh();
}

var splatTimer = 0, splatNormal = new THREE.Vector3();

function updateBall(dt){
  idleT += dt;

  if(ballState === "intro"){
    /* drop in from above, bounce off the grid floor, then ease up into place */
    if(introSettleT >= 0){
      /* easing from bounce apex up/over to the hover home */
      introSettleT += dt;
      var ks = Math.min(introSettleT/0.4, 1);
      ks = 1 - Math.pow(1-ks, 3);
      ball.position.y = introSettleFrom + (BALL_HOME.y - introSettleFrom)*ks;
      ball.scale.x += (1 - ball.scale.x)*Math.min(1, dt*8);
      ball.scale.y += (1 - ball.scale.y)*Math.min(1, dt*8);
      ball.scale.z = ball.scale.x;
      if(ks >= 1){
        ball.scale.setScalar(1);
        idleT = 0;
        ballState = "idle";
      }
    } else {
      introVy -= 22*dt;
      ball.position.y += introVy*dt;
      if(!introBounced && ball.position.y <= BALL_R && introVy < 0){
        /* hit the grid floor: squash and bounce */
        introBounced = true;
        ball.position.y = BALL_R;
        introVy = 9.2;                      /* enough to carry it near hover height */
        ball.scale.set(1.3, 0.7, 1.3);
        playSquish();
        shake = Math.max(shake, 0.15);
      } else if(introBounced){
        /* recover from squash on the way up; near the apex, ease into place */
        ball.scale.x += (1 - ball.scale.x)*Math.min(1, dt*8);
        ball.scale.y += (1 - ball.scale.y)*Math.min(1, dt*8);
        ball.scale.z = ball.scale.x;
        if(introVy <= 0.6){
          introSettleT = 0;
          introSettleFrom = ball.position.y;
        }
      }
    }
  }
  else if(ballState === "idle"){
    /* gentle bob + spin (spin fades out while squeezing) */
    ball.position.set(BALL_HOME.x, BALL_HOME.y + Math.sin(idleT*1.4)*0.06, BALL_HOME.z);
    ball.rotation.y += dt*0.3*Math.max(0, 1 - grip*5);
    /* squeeze "haptics": ball trembles + camera tenses with grip */
    if(grip > 0.15){
      var tension = grip*grip;
      ball.position.x += (Math.random()-0.5)*tension*0.05;
      ball.position.z += (Math.random()-0.5)*tension*0.05;
      ball.position.y += (Math.random()-0.5)*tension*0.03;
      shake = Math.max(shake, tension*0.06);            /* continuous micro-shake */
    }
    camera.fov += ((60 - grip*4) - camera.fov)*Math.min(1, dt*10);  /* slight zoom-in tension */
    camera.updateProjectionMatrix();
    /* squeeze squash + release wobble spring */
    var target = grip;
    wobbleVel += (target - wobble)*260*dt;
    wobbleVel *= Math.exp(-10*dt);
    wobble += wobbleVel*dt;
    var s = wobble;
    ball.scale.set(1 + s*0.28, 1 - s*0.38, 1 + s*0.28);
    deformBall(Math.max(0, Math.min(1, s)));   /* finger dents pressed in */
    if(grip > 0.5 && performance.now() - lastSquishAt > 450){
      lastSquishAt = performance.now();
      playSquish();
    }
  }
  else if(ballState === "flying"){
    ballVel.y -= 6.5*dt;
    var prevZ = ball.position.z;
    ball.position.addScaledVector(ballVel, dt);
    /* stretch along velocity for a sense of speed */
    var sp = ballVel.length();
    if(sp > 0.5){
      var stretch = 1 + Math.min(sp/30, 1)*0.45;
      ball.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), _v.copy(ballVel).normalize());
      ball.scale.set(1/Math.sqrt(stretch), stretch, 1/Math.sqrt(stretch));
    }
    var p = ball.position;
    var hit = null;

    /* the webpage: crossed the page plane within its bounds -> SPLAT */
    if(ballVel.z < 0 && prevZ - BALL_R > PAGE_Z && p.z - BALL_R <= PAGE_Z &&
       Math.abs(p.x) < PAGE_W/2 + BALL_R*0.5 && p.y > PAGE_BOTTOM && p.y < PAGE_TOP){
      hit = new THREE.Vector3(0,0,1);
      p.z = PAGE_Z + BALL_R;
    }

    if(hit){
      var pagePoint = new THREE.Vector3(p.x, p.y, PAGE_Z);
      addSplat(pagePoint, hit);
      knockLetters(p.x, p.y, ballVel.length());
      checkReload();
      burstParticles(pagePoint, hit);
      shake = 0.35 + Math.min(ballVel.length()/30, 1)*0.35;
      ball.quaternion.set(0,0,0,1);
      playSplat();
      vibrateSplat();
      ballState = "splat";
      splatTimer = 0;
      splatNormal.copy(hit);
    } else {
      /* grid floor bounce */
      if(p.y < BALL_R){ p.y = BALL_R; ballVel.y = Math.abs(ballVel.y)*0.5; ballVel.multiplyScalar(0.85); shake = Math.max(shake, 0.12); }
      /* missed everything: sailed into the void -> respawn */
      if(Math.abs(p.x) > 45 || Math.abs(p.z) > 45){ ballState = "reset"; splatTimer = 0; ball.quaternion.set(0,0,0,1); }
      if(ballVel.length() < 1.2 && p.y <= BALL_R + 0.01){ ballState = "reset"; splatTimer = 0; ball.quaternion.set(0,0,0,1); }
    }
  }
  else if(ballState === "splat"){
    /* squash flat against the wall, then fade */
    splatTimer += dt;
    var k = Math.min(splatTimer/0.15, 1);
    var flat = 1 - k*0.85;
    if(Math.abs(splatNormal.y) > 0.5)      ball.scale.set(1+k*0.5, flat, 1+k*0.5);
    else if(Math.abs(splatNormal.x) > 0.5) ball.scale.set(flat, 1+k*0.5, 1+k*0.5);
    else                                   ball.scale.set(1+k*0.5, 1+k*0.5, flat);
    ball.material.transparent = true;
    ball.material.opacity = 1 - Math.max(0, (splatTimer-0.15)/0.35);
    if(splatTimer > 0.5){ ballState = "reset"; splatTimer = 0; }
  }
  else if(ballState === "reset"){
    splatTimer += dt;
    if(splatTimer < 0.25){ ball.visible = false; }
    else {
      var k2 = Math.min((splatTimer-0.25)/0.3, 1);
      ball.visible = true;
      ball.position.copy(BALL_HOME);
      ball.scale.setScalar(0.2 + 0.8*k2);
      ball.material.opacity = k2;
      if(k2 >= 1){
        ball.material.transparent = false;
        ball.material.opacity = 1;
        ball.scale.setScalar(1);
        wobble = 0; wobbleVel = 0;
        deformBall(0);
        ballState = "idle";
      }
    }
  }
}
