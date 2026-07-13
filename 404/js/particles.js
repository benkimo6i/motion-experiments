/* --- splat particle burst --- */
var PARTICLE_N = 26;
var particleMat = new THREE.MeshBasicMaterial({color:BALL_COLOR, transparent:true});
var particleGeo = new THREE.SphereGeometry(0.09, 8, 8);
var particles = [];
for(var pi=0; pi<PARTICLE_N; pi++){
  var pm = new THREE.Mesh(particleGeo, particleMat.clone());
  pm.visible = false;
  scene.add(pm);
  particles.push({mesh:pm, vel:new THREE.Vector3(), life:0, maxLife:1});
}
function burstParticles(point, normal){
  for(var i=0;i<particles.length;i++){
    var p = particles[i];
    p.mesh.visible = true;
    p.mesh.position.copy(point).addScaledVector(normal, 0.15);
    /* mostly along the wall plane, a bit outward */
    var tang = new THREE.Vector3(Math.random()-0.5, Math.random()-0.2, Math.random()-0.5);
    tang.addScaledVector(normal, -tang.dot(normal));       /* project onto wall */
    p.vel.copy(tang).normalize().multiplyScalar(2 + Math.random()*4)
         .addScaledVector(normal, 0.5 + Math.random()*1.5);
    p.maxLife = p.life = 0.45 + Math.random()*0.35;
    p.mesh.scale.setScalar(0.6 + Math.random()*0.9);
  }
}
function updateParticles(dt){
  for(var i=0;i<particles.length;i++){
    var p = particles[i];
    if(!p.mesh.visible) continue;
    p.life -= dt;
    if(p.life <= 0){ p.mesh.visible = false; continue; }
    p.vel.y -= 9.8*dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.material.opacity = p.life / p.maxLife;
  }
}
