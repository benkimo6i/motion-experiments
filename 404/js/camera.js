/* =====================  CAMERA  ===================== */
function updateCamera(dt){
  yaw += yawVel*dt;
  camRadius += (camRadiusTarget - camRadius)*Math.min(1, dt*8);
  camera.position.set(Math.sin(yaw)*camRadius, CAM_H, Math.cos(yaw)*camRadius);
  if(shake > 0.001){
    camera.position.x += (Math.random()-0.5)*shake*0.35;
    camera.position.y += (Math.random()-0.5)*shake*0.35;
    camera.position.z += (Math.random()-0.5)*shake*0.35;
    shake *= Math.exp(-7*dt);
  }
  camera.lookAt(BALL_HOME.x, CAM_H, BALL_HOME.z);
}
