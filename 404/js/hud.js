/* =====================  HUD  ===================== */
var hud = document.getElementById("hud");
var hintEl = document.getElementById("hint");
var hintTimer = null;
function showHint(text, sticky){
  hintEl.textContent = text;
  hintEl.style.opacity = 1;
  if(hintTimer) clearTimeout(hintTimer);
  if(!sticky) hintTimer = setTimeout(function(){ hintEl.style.opacity = 0; }, 6000);
}
