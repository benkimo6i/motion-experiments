/* =====================  AUDIO (synthesized)  ===================== */
var actx = null;
function audio(){ if(!actx){ try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return actx; }
function noiseBuffer(ctx, secs){
  var b = ctx.createBuffer(1, ctx.sampleRate*secs, ctx.sampleRate);
  var d = b.getChannelData(0);
  for(var i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  return b;
}
function playSquish(){
  var ctx = audio(); if(!ctx) return;
  var src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, 0.18);
  var f = ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=600;
  var gvol = ctx.createGain();
  gvol.gain.setValueAtTime(0.25, ctx.currentTime);
  gvol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.18);
  src.connect(f); f.connect(gvol); gvol.connect(ctx.destination);
  src.start();
}
function playWhoosh(){
  var ctx = audio(); if(!ctx) return;
  var src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, 0.3);
  var f = ctx.createBiquadFilter(); f.type="bandpass"; f.Q.value=1.2;
  f.frequency.setValueAtTime(400, ctx.currentTime);
  f.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime+0.25);
  var gvol = ctx.createGain();
  gvol.gain.setValueAtTime(0.18, ctx.currentTime);
  gvol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.3);
  src.connect(f); f.connect(gvol); gvol.connect(ctx.destination);
  src.start();
}
/* --- grip rumble: continuous low tone that rises with squeeze --- */
var rumbleOsc = null, rumbleGain = null;
function updateRumble(){
  var ctx = actx;                       /* only if audio already unlocked */
  if(!ctx) return;
  if(!rumbleOsc){
    rumbleOsc = ctx.createOscillator();
    rumbleOsc.type = "triangle";
    rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0;
    rumbleOsc.connect(rumbleGain); rumbleGain.connect(ctx.destination);
    rumbleOsc.start();
  }
  var g = (ballState === "idle") ? grip : 0;
  rumbleGain.gain.setTargetAtTime(g > 0.1 ? g*0.10 : 0, ctx.currentTime, 0.06);
  rumbleOsc.frequency.setTargetAtTime(42 + g*58, ctx.currentTime, 0.06);
}

/* --- mobile haptics --- */
var lastVib = 0;
function vibrateTick(){
  if(!navigator.vibrate) return;        /* no-op on iOS Safari */
  var now = performance.now();
  if(grip > 0.4 && ballState === "idle" && now - lastVib > 100){
    navigator.vibrate(Math.round(15 + grip*35));
    lastVib = now;
  }
}
function vibrateSplat(){ if(navigator.vibrate) navigator.vibrate([70, 40, 40]); }

function playSplat(){
  var ctx = audio(); if(!ctx) return;
  var t = ctx.currentTime;
  var o = ctx.createOscillator(); o.type="sine";
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(45, t+0.22);
  var og = ctx.createGain();
  og.gain.setValueAtTime(0.5, t);
  og.gain.exponentialRampToValueAtTime(0.001, t+0.25);
  o.connect(og); og.connect(ctx.destination);
  o.start(t); o.stop(t+0.3);
  var src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, 0.15);
  var f = ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=900;
  var ng = ctx.createGain();
  ng.gain.setValueAtTime(0.35, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t+0.15);
  src.connect(f); f.connect(ng); ng.connect(ctx.destination);
  src.start(t);
}
