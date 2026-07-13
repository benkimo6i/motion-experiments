/* =====================  MOUSE MODE  ===================== */
var mouseX = 0.5, mouseY = 0.5;
var EDGE = 0.25, YAW_SPEED = 1.6, PITCH_SPEED = 0.9, VEDGE = 0.18;

function onMouseMove(e){
  mouseX = e.clientX / window.innerWidth;
  mouseY = e.clientY / window.innerHeight;
  if(mouseHeld){
    var now = performance.now();
    dragHist.push({x:e.clientX, y:e.clientY, t:now});
    while(dragHist.length > 2 && now - dragHist[0].t > 250) dragHist.shift();
  }
}
function onWheel(e){
  if(mode === "boot") return;
  camRadiusTarget = Math.max(2.5, Math.min(8.8, camRadiusTarget + e.deltaY*0.005));
}
var mouseHeld = false, dragHist = [];
function onMouseDown(e){
  if(mode !== "mouse" || e.target.closest("button")) return;
  audio();
  mouseHeld = true;
  dragHist = [{x:e.clientX, y:e.clientY, t:performance.now()}];
  gripTarget = 1;
}
function onMouseUp(e){
  if(mode !== "mouse" || e.target.closest("button")) return;
  if(mouseHeld && ballState === "idle"){
    /* measure the flick: total drag + peak speed over the last ~250ms */
    var first = dragHist[0], last = dragHist[dragHist.length-1];
    var dist = Math.hypot(last.x - first.x, last.y - first.y);
    var peak = 0;
    for(var i=1;i<dragHist.length;i++){
      var dt = (dragHist[i].t - dragHist[i-1].t)/1000;
      if(dt <= 0) continue;
      var d = Math.hypot(dragHist[i].x - dragHist[i-1].x, dragHist[i].y - dragHist[i-1].y);
      peak = Math.max(peak, d/dt);
    }
    if(dist > 30 && peak > 500){
      /* a real flick: speed scales with drag velocity */
      var speed = 12 + Math.min(1, (peak - 500)/3000)*16;
      throwBall(speed);
    }
    /* otherwise: stationary release, the ball just relaxes */
  }
  mouseHeld = false;
  gripTarget = 0;
}
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("wheel", onWheel, {passive:true});
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);

function mouseLook(){
  if(mouseHeld){ yawVel = 0; return; }
  if(mouseX < EDGE)          yawVel =  YAW_SPEED * (EDGE - mouseX)/EDGE;
  else if(mouseX > 1-EDGE)   yawVel = -YAW_SPEED * (mouseX-(1-EDGE))/EDGE;
  else                       yawVel = 0;
}
