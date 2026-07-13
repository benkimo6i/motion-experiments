/* =====================  SPLAT DECALS  ===================== */
function makeSplatData(){
  var c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  var base = document.createElement("canvas");
  base.width = 512; base.height = 512;
  var g = base.getContext("2d");
  g.fillStyle = "#ff5c1f";

  /* irregular blob halo behind the text */
  var i, a, d, r;
  for(i=0;i<26;i++){
    a = Math.random()*Math.PI*2;
    d = 60 + Math.random()*130;
    r = 8 + Math.random()*26;
    g.globalAlpha = 0.75 + Math.random()*0.25;
    g.beginPath();
    g.arc(256 + Math.cos(a)*d, 236 + Math.sin(a)*d*0.55, r, 0, Math.PI*2);
    g.fill();
  }
  /* fine spray */
  for(i=0;i<70;i++){
    a = Math.random()*Math.PI*2;
    d = 120 + Math.random()*130;
    r = 1.5 + Math.random()*4;
    g.globalAlpha = 0.5 + Math.random()*0.5;
    g.beginPath();
    g.arc(256 + Math.cos(a)*d, 236 + Math.sin(a)*d*0.6, r, 0, Math.PI*2);
    g.fill();
  }
  g.globalAlpha = 1;
  /* the 404 itself */
  g.font = "900 190px 'Arial Black', Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = 14; g.strokeStyle = "#ff5c1f";
  g.strokeText("404", 256, 236);
  g.fillText("404", 256, 236);

  /* drips are animated after impact: store their targets */
  var drips = [];
  for(i=0;i<7;i++){
    drips.push({
      x: 130 + Math.random()*252,
      top: 300 + Math.random()*20,
      len: 40 + Math.random()*130,
      w: 5 + Math.random()*9,
      delay: Math.random()*0.3
    });
  }
  var tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  var data = {canvas:c, ctx:c.getContext("2d"), base:base, tex:tex, drips:drips};
  drawSplatFrame(data, 0);
  return data;
}

function drawSplatFrame(data, t){        /* t = seconds since impact */
  var g = data.ctx;
  g.clearRect(0,0,512,512);
  g.drawImage(data.base, 0, 0);
  g.fillStyle = "#ff5c1f";
  for(var i=0;i<data.drips.length;i++){
    var dr = data.drips[i];
    var k = Math.max(0, Math.min(1, (t - dr.delay)/1.1));
    k = 1 - Math.pow(1-k, 2);            /* ease-out: fast then slowing, like a real drip */
    if(k <= 0) continue;
    var len = dr.len*k, x = dr.x, top = dr.top, w = dr.w;
    g.beginPath();
    g.moveTo(x-w/2, top);
    g.quadraticCurveTo(x-w*0.2, top+len*0.6, x, top+len);
    g.quadraticCurveTo(x+w*0.2, top+len*0.6, x+w/2, top);
    g.closePath(); g.fill();
    g.beginPath(); g.arc(x, top+len, w*0.75*(0.6+0.4*k), 0, Math.PI*2); g.fill();
  }
  data.tex.needsUpdate = true;
}

function updateSplatAnims(dt){
  for(var i=splatAnims.length-1;i>=0;i--){
    var s = splatAnims[i];
    s.t += dt;
    drawSplatFrame(s.data, s.t);
    if(s.t > 1.6) splatAnims.splice(i,1);
  }
}

function addSplat(point, normal){
  var size = 3.4 + Math.random()*1.2;
  var geo = new THREE.PlaneGeometry(size, size);
  var data = makeSplatData();
  var mat = new THREE.MeshBasicMaterial({
    map: data.tex, transparent:true, depthWrite:false,
    polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2
  });
  var m = new THREE.Mesh(geo, mat);
  var offset = 0.02 + splats.length*0.0015;
  m.position.copy(point).addScaledVector(normal, offset);
  m.lookAt(point.clone().add(normal));
  m.rotateZ((Math.random()-0.5)*0.5);
  /* keep splats on the page */
  if(Math.abs(normal.z) > 0.5){
    m.position.x = Math.max(-PAGE_W/2 + size*0.3, Math.min(PAGE_W/2 - size*0.3, m.position.x));
    m.position.y = Math.max(PAGE_BOTTOM + size*0.3, Math.min(PAGE_TOP - size*0.3, m.position.y));
  }
  scene.add(m);
  splats.push(m);
  splatAnims.push({data:data, t:0});
  if(splats.length > MAX_SPLATS){
    var old = splats.shift();
    scene.remove(old);
    old.material.map.dispose(); old.material.dispose(); old.geometry.dispose();
  }
}
