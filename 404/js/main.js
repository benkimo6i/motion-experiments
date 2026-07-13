/* =====================  MAIN LOOP  ===================== */
function animate(now){
  requestAnimationFrame(animate);
  var dt = Math.min((now - lastTime)/1000, 0.05);
  lastTime = now;

  if(mode === "mouse") mouseLook();

  /* grip easing */
  var rate = (gripTarget > grip) ? 4.5 : 8;
  grip += (gripTarget - grip)*Math.min(1, dt*rate);

  updateCamera(dt);
  updateBall(dt);
  updateParticles(dt);
  updateSplatAnims(dt);
  updateLetters(dt);
  updateReload(dt);
  updateIntro(dt);
  updateRumble();
  vibrateTick();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

window.addEventListener("resize", function(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* kick off: ask for the camera; allow -> hand tracking, deny/fail -> mouse */
startHandMode();
