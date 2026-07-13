/* =====================  ERROR OVERLAY + BOOT FLOW  ===================== */
var handError = document.getElementById("handError");
function showHandError(msg){
  document.getElementById("heMsg").textContent = msg;
  handError.style.display = "flex";
}
document.getElementById("heRetry").addEventListener("click", function(){
  handError.style.display = "none";
  stopHandMode();
  startHandMode();
});
document.getElementById("heMouse").addEventListener("click", function(){
  enterMouseMode("");
});

/* No landing page: the void loads immediately, the camera prompt decides the mode. */
function enterScene(m){
  mode = m;
  startIntro();       /* ball drops in, page scales up (runs once) */
}
function enterMouseMode(reason){
  stopHandMode();
  handError.style.display = "none";
  enterScene("mouse");
  showHint((reason ? reason + " \u2014 " : "") +
    "Cursor at screen edges: look around \u2022 Scroll: move \u2022 Hold click: squeeze \u2022 Flick-drag & release: throw", false);
}
document.getElementById("backBtn").addEventListener("click", function(){
  stopHandMode();
  window.location.href = "../index.html";
});
/* unlock/resume audio on the first user gesture (autoplay policy) */
window.addEventListener("pointerdown", function(){
  var ctx = audio();
  if(ctx && ctx.state === "suspended") ctx.resume();
}, {once:false});
