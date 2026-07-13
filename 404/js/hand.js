/* =====================  HAND MODE (MediaPipe)  ===================== */
var TASKS_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
var visionModule = null, landmarker = null;
var video = document.getElementById("cam"), camStream = null;
var handRunning = false, handSeen = false, lastHandAt = 0, handStartAt = 0;
var palmHist = [];               /* {x,y,t} normalized, mirrored */
var gripEMA = 0, prevGrip = 0, lastFistAt = 0, handSizeEMA = 0;
var preview = document.getElementById("camPreview");
var pctx = preview.getContext("2d");

function withTimeout(p, ms, msg){
  return Promise.race([p, new Promise(function(_, rej){ setTimeout(function(){ rej(new Error(msg)); }, ms); })]);
}

/* verbose diagnostics: every stage logs to the console as [404-ball] */
function dbg(){ var a = ["[404-ball]"].concat([].slice.call(arguments)); console.log.apply(console, a); }

function startHandMode(){
  showHint("Setting up\u2026 allow camera for hand tracking, or deny for mouse mode", true);
  handSeen = false; handStartAt = performance.now();

  dbg("STAGE 0: startHandMode()", {
    secureContext: window.isSecureContext,
    protocol: location.protocol,
    inIframe: window.self !== window.top,
    hasMediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    visionAlreadyLoaded: !!visionModule
  });

  if(!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){
    dbg("FAIL at STAGE 0: navigator.mediaDevices.getUserMedia is unavailable.",
        window.isSecureContext ? "Likely an iframe/permissions-policy restriction." :
        "Page is not a secure context - use https:// or http://localhost, not file://");
    enterMouseMode("Camera not available in this context");
    return;
  }

  var chain = Promise.resolve();
  if(!visionModule){
    dbg("STAGE 1: importing @mediapipe/tasks-vision@0.10.14 from jsdelivr...");
    chain = withTimeout(
      import(TASKS_URL + "/vision_bundle.mjs"),
      15000, "Hand-tracking library couldn't load."
    ).then(function(mod){
      visionModule = mod;
      dbg("STAGE 1 OK: tasks-vision loaded, HandLandmarker =", typeof mod.HandLandmarker);
    });
  } else {
    dbg("STAGE 1 SKIPPED: tasks-vision already loaded");
  }
  chain.then(function(){
    dbg("STAGE 2: requesting camera (getUserMedia)... watch for the browser permission prompt");
    return withTimeout(
      navigator.mediaDevices.getUserMedia({video:{width:640, height:480, facingMode:"user"}}),
      15000, "Camera permission was not granted."
    );
  }).then(function(stream){
    var track = stream.getVideoTracks()[0];
    dbg("STAGE 2 OK: camera stream acquired", track ? track.label : "(no track label)", track ? track.getSettings() : "");
    camStream = stream;
    video.srcObject = stream;
    return video.play().catch(function(e){ dbg("STAGE 3 WARN: video.play() rejected (may still work):", e && e.message); });
  }).then(function(){
    dbg("STAGE 3 OK: video element playing, readyState =", video.readyState);
    if(landmarker) return;
    dbg("STAGE 4: creating HandLandmarker (fetches wasm from jsdelivr + model from Google storage - check the Network tab)...");
    return withTimeout(
      visionModule.FilesetResolver.forVisionTasks(TASKS_URL + "/wasm").then(function(fileset){
        function make(delegate){
          return visionModule.HandLandmarker.createFromOptions(fileset, {
            baseOptions:{
              modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: delegate
            },
            runningMode:"VIDEO",
            numHands:1,
            minHandDetectionConfidence:0.6,
            minTrackingConfidence:0.5
          });
        }
        return make("GPU").catch(function(e){
          dbg("STAGE 4 WARN: GPU delegate failed, retrying on CPU:", e && e.message);
          return make("CPU");
        });
      }).then(function(lm){
        landmarker = lm;
        dbg("STAGE 4 OK: HandLandmarker ready");
      }),
      25000, "Hand-tracking model couldn't load."
    );
  }).then(function(){
    handRunning = true;
    preview.style.display = "block";
    enterScene("hand");
    showHint("Open palm: move left/right to aim \u2022 Fist: squeeze \u2022 Flick & open: throw", false);
    dbg("STAGE 5: starting frame pump; first hands.send() compiles the model and can take a few seconds...");
    pumpFrames();
    /* if we never see a hand in the first 10s, offer help */
    setTimeout(function(){
      if(mode === "hand" && !handSeen){
        dbg("STAGE 6 TIMEOUT: pipeline running but no hand detected in 10s (frames sent:", framesSent, ", results received:", resultsReceived, ")");
        showHandError("We can see the camera but no hand yet. To fix it:");
      }
    }, 10000);
  }).catch(function(err){
    dbg("FAILED:", err && err.name, err && err.message, err, "-> falling back to mouse mode");
    enterMouseMode(err && err.name === "NotAllowedError" ? "No camera, no problem" : "Hand tracking unavailable");
  });
}

var framesSent = 0, resultsReceived = 0, lastVideoTime = -1;
function pumpFrames(){
  if(!handRunning) return;
  if(video.readyState >= 2 && video.currentTime !== lastVideoTime){
    lastVideoTime = video.currentTime;
    framesSent++;
    if(framesSent === 1) dbg("STAGE 5: detecting on first frame...");
    try{
      var results = landmarker.detectForVideo(video, performance.now());
      onHandResults(results);
    }catch(e){
      if(framesSent <= 3) dbg("STAGE 5 ERROR: detectForVideo failed:", e && e.message, e);
    }
  }
  requestAnimationFrame(pumpFrames);
}

function stopHandMode(){
  handRunning = false;
  if(camStream){ camStream.getTracks().forEach(function(t){ t.stop(); }); camStream = null; }
  preview.style.display = "none";
}

function dist2d(a,b){ var dx=a.x-b.x, dy=a.y-b.y; return Math.sqrt(dx*dx+dy*dy); }

function onHandResults(results){
  resultsReceived++;
  if(resultsReceived === 1) dbg("STAGE 5 OK: first result received from MediaPipe - pipeline is alive");
  if(!handSeen && results.landmarks && results.landmarks.length){
    dbg("STAGE 6 OK: hand detected! Tracking is fully working.");
  }
  /* mirrored preview */
  pctx.save();
  pctx.clearRect(0,0,160,120);
  pctx.translate(160,0); pctx.scale(-1,1);
  pctx.drawImage(video, 0, 0, 160, 120);
  pctx.restore();

  var lms = results.landmarks;
  if(!lms || !lms.length){
    if(handSeen && performance.now() - lastHandAt > 1500) showHint("Hold your hand up to the camera", true);
    gripTarget = Math.max(0, gripTarget - 0.1);
    yawVel = 0;
    return;
  }
  var lm = lms[0];
  handSeen = true; lastHandAt = performance.now();

  /* draw landmarks on preview (mirrored) */
  pctx.fillStyle = "#ff5c1f";
  for(var i=0;i<lm.length;i++){
    pctx.beginPath();
    pctx.arc((1-lm[i].x)*160, lm[i].y*120, 2, 0, Math.PI*2);
    pctx.fill();
  }

  /* grip: avg fingertip-to-wrist distance vs hand size */
  var handSize = dist2d(lm[0], lm[9]) || 0.001;
  var tips = [8,12,16,20], curl = 0;
  for(var t=0;t<tips.length;t++) curl += dist2d(lm[tips[t]], lm[0]);
  curl = (curl/4) / handSize;                        /* ~1.7 open, ~0.85 fist */
  var g = Math.max(0, Math.min(1, (1.55 - curl)/0.6));
  gripEMA = gripEMA*0.6 + g*0.4;

  /* palm center (mirrored x so moving right = right) */
  var px = (lm[0].x+lm[5].x+lm[9].x+lm[13].x+lm[17].x)/5;
  var py = (lm[0].y+lm[5].y+lm[9].y+lm[13].y+lm[17].y)/5;
  var now = performance.now();
  palmHist.push({x:1-px, y:py, t:now});
  while(palmHist.length && now - palmHist[0].t > 250) palmHist.shift();

  /* peak speed over the last 250 ms (normalized units / s) */
  var peak = 0;
  for(var k=1;k<palmHist.length;k++){
    var dt = (palmHist[k].t - palmHist[k-1].t)/1000;
    if(dt <= 0) continue;
    var d = Math.sqrt(Math.pow(palmHist[k].x-palmHist[k-1].x,2) + Math.pow(palmHist[k].y-palmHist[k-1].y,2));
    peak = Math.max(peak, d/dt);
  }

  /* throw: was a fist recently (within 400ms), now open, with a flick */
  if(gripEMA > 0.55) lastFistAt = now;
  if(gripEMA < 0.4 && now - lastFistAt < 400 && lastFistAt > 0 && peak > 0.7 && ballState === "idle"){
    var speed = 12 + Math.min(1, (peak-0.7)/2.5)*16;
    throwBall(speed);
    lastFistAt = 0;
    palmHist.length = 0;
  }

  /* aiming with open palm; hand distance to camera moves you forward/back */
  if(gripEMA < 0.35 && ballState === "idle"){
    var off = (1-px) - 0.5;
    /* wide neutral zone: only the outer ~30% of the frame turns the camera */
    var HAND_EDGE = 0.20;    /* |off| must exceed this (frame is off -0.5..0.5) */
    if(Math.abs(off) > HAND_EDGE){
      var into = (Math.abs(off) - HAND_EDGE)/(0.5 - HAND_EDGE);   /* 0..1 into the edge zone */
      yawVel = -Math.sign(off)*into*2.4;
    } else {
      yawVel = 0;
    }
    /* handSize grows as your hand nears the webcam: closer = dolly in */
    handSizeEMA = handSizeEMA ? handSizeEMA*0.85 + handSize*0.15 : handSize;
    var depth = Math.max(0, Math.min(1, (handSizeEMA - 0.10)/0.20));   /* 0 far .. 1 close */
    camRadiusTarget = 8.5 - depth*5.7;                                  /* 8.5 .. 2.8 */
  } else {
    yawVel = 0;
  }

  prevGrip = gripEMA;
  if(ballState === "idle") gripTarget = gripEMA;
}
