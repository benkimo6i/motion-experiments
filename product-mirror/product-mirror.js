/* ══════════════════════════════════════════════════════════════
   SHOWCASE LANDING — glasses edition
   Eyeglasses · Sunglasses · Smart Glasses, all face-anchored.
   One shared TrackingEngine (Face Landmarker only — pose removed)
   feeds any number of MirrorTiles.
   ══════════════════════════════════════════════════════════════ */
"use strict";

const LOGP = "[showcase]";
const log  = (...a)=>console.log(LOGP, ...a);
const warn = (...a)=>console.warn(LOGP, ...a);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp  = (a,b,t)=>a+(b-a)*t;
function withTimeout(p, ms, label){
  return Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error(label+" timed out after "+ms+"ms")), ms))]);
}

/* ── tunables ── */
const TUNE = {
  posSmooth:.45, rotSmooth:.38, scaleSmooth:.30,
  glassesScale:1.00,
  heroSpinSpeed:.55,          // slow, gallery-like hero rotation
};

/* ── toast ── */
const toastEl = document.getElementById("toast");
let toastT = null;
function toast(msg, ms=2800){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(()=>toastEl.classList.remove("show"), ms);
}

/* ══════════════ CATALOG ══════════════ */
const CATALOG = {
  eyeglasses: {
    hero:{ variant:"duotone", name:"Hipster",
      headline:"Design, in focus.",
      lead:"The Hipster keeps a slim turtleshell rim around wide clear lenses.",
      desc:"An everyday frame that disappears on the face and reads sharp in every meeting.",
      specs:["Hipster", "Turtleshell rim · clear lens", "Fits narrow to medium"] },
    cards:[
      { variant:"rect",  name:"Corporate" },
      { variant:"round", name:"Creative" },
    ],
  },
  sunglasses: {
    hero:{ variant:"classic", name:"Ray-Ban Wayfayer",
      headline:"Design, in full sun.",
      lead:"The Ray-Ban Wayfayer pairs a timeless rim with smoked lenses cut for long horizons.",
      desc:"Feather-light hinges and a sculpted bridge keep it steady from first light to last call.",
      specs:["Ray-Ban Wayfayer", "Smoked lens", "Fits medium to wide"] },
    cards:[
      { variant:"cateye",  name:"Selena Kyle" },
      { variant:"fashion", name:"Bruce Wayne" },
    ],
  },
  smart: {
    hero:{ variant:"meta", name:"Ray-Ban Meta Display",
      headline:"Design, in digital.",
      lead:"The Ray-Ban Meta Display wraps iconic styling with a quiet, in-lens glow at the right lens.",
      desc:"Navigation, notifications, and glanceable media — projected, never in the way.",
      specs:["Ray-Ban Meta Display", "Wayfarer design · 600x600 in-lens display", "USB-C · 6 hr battery"] },
    cards:[
      { variant:"meta",  name:"Meta Glasses" },
      { variant:"vuzix", name:"Vuzix" },
    ],
  },
};
const DEFAULT_CAT = "sunglasses";

/* ══════════════ materials + procedural glasses factory ══════════════ */
const MAT = {
  dark:   () => new THREE.MeshStandardMaterial({color:0x22201f, roughness:.35, metalness:.35}),
  gold:   () => new THREE.MeshStandardMaterial({color:0xd4a94e, roughness:.28, metalness:.9}),
  silver: () => new THREE.MeshStandardMaterial({color:0xcfd2d8, roughness:.25, metalness:.95}),
  tint:   () => new THREE.MeshStandardMaterial({color:0x27313f, roughness:.12, metalness:.55, transparent:true, opacity:.62}),
  clear:  () => new THREE.MeshStandardMaterial({color:0xe8f0f6, roughness:.05, metalness:.2,  transparent:true, opacity:.16}),
  mirror: () => new THREE.MeshStandardMaterial({color:0x9fc8e8, roughness:.06, metalness:1.0}),
  tech:   () => new THREE.MeshStandardMaterial({color:0x2a2a30, roughness:.4,  metalness:.5}),
  glow:   (c)=> new THREE.MeshStandardMaterial({color:c, emissive:c, emissiveIntensity:.9, roughness:.4}),
};
function addTemples(g, mat, x, y, thick){
  [-1,1].forEach(s=>{
    const t = new THREE.Mesh(new THREE.CylinderGeometry(thick||0.011, thick||0.011, 0.42, 8), mat);
    t.rotation.x = Math.PI/2; t.position.set(s*x, (y||0)+0.03, -0.20); g.add(t);
  });
}
function roundedRectGeo(w,h,r,depth){
  const s = new THREE.Shape(); const hw=w/2, hh=h/2;
  s.moveTo(-hw+r,-hh); s.lineTo(hw-r,-hh); s.quadraticCurveTo(hw,-hh,hw,-hh+r);
  s.lineTo(hw,hh-r);   s.quadraticCurveTo(hw,hh,hw-r,hh);
  s.lineTo(-hw+r,hh);  s.quadraticCurveTo(-hw,hh,-hw,hh-r);
  s.lineTo(-hw,-hh+r); s.quadraticCurveTo(-hw,-hh,-hw+r,-hh);
  return depth ? new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false}) : new THREE.ShapeGeometry(s);
}
function ringLensPair(g, rimMat, lensMat, radius, sep, sy){
  [-sep, sep].forEach(x=>{
    const lens = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), lensMat);
    lens.scale.y = sy||1; lens.position.set(x, -0.01, 0.01); g.add(lens);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.016, 10, 40), rimMat);
    ring.scale.y = sy||1; ring.position.set(x, -0.01, 0.012); g.add(ring);
  });
}
function chunkyFramePair(g, rimMat, lensMat, w, h, sep){
  [-sep, sep].forEach(x=>{
    const frame = new THREE.Mesh(roundedRectGeo(w, h, 0.07, 0.05), rimMat);
    frame.position.set(x, 0, -0.01); g.add(frame);
    const lens = new THREE.Mesh(roundedRectGeo(w*0.82, h*0.78, 0.05), lensMat);
    lens.position.set(x, 0, 0.045); g.add(lens);
  });
}

const BUILD = {
  eyeglasses:{
    round(){
      const g = new THREE.Group(); const rim = MAT.dark();
      ringLensPair(g, rim, MAT.clear(), 0.16, 0.24);
      const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 20, Math.PI), rim);
      bridge.position.set(0, 0.02, 0.01); g.add(bridge);
      addTemples(g, rim, 0.40, 0);
      return g;
    },
    rect(){
      const g = new THREE.Group(); const rim = MAT.silver();
      [-0.25, 0.25].forEach(x=>{
        const frame = new THREE.Mesh(roundedRectGeo(0.34, 0.22, 0.05), rim);
        frame.position.set(x, 0, 0.012); g.add(frame);
        const lens = new THREE.Mesh(roundedRectGeo(0.30, 0.18, 0.04), MAT.clear());
        lens.position.set(x, 0, 0.008); g.add(lens);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.02), rim);
      bridge.position.set(0, 0.03, 0.01); g.add(bridge);
      addTemples(g, rim, 0.42, 0.01);
      return g;
    },
    duotone(){
      const g = new THREE.Group(); const bar = MAT.dark(), rim = MAT.silver();
      ringLensPair(g, rim, MAT.clear(), 0.155, 0.24);
      [-0.24, 0.24].forEach(x=>{
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.035), bar);
        brow.position.set(x, 0.13, 0.012); g.add(brow);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.02), bar);
      bridge.position.set(0, 0.11, 0.01); g.add(bridge);
      addTemples(g, bar, 0.40, 0.10);
      return g;
    },
  },
  sunglasses:{
    classic(){
      const g = new THREE.Group(); const rim = MAT.gold();
      ringLensPair(g, rim, MAT.tint(), 0.185, 0.26, 0.88);
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 8), rim);
      bridge.rotation.z = Math.PI/2; bridge.position.set(0, 0.055, 0.01); g.add(bridge);
      const brow = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.5, 8), rim);
      brow.rotation.z = Math.PI/2; brow.position.set(0, 0.10, 0.005); g.add(brow);
      addTemples(g, rim, 0.44, -0.02);
      return g;
    },
    fashion(){
      const g = new THREE.Group();
      chunkyFramePair(g, MAT.dark(), MAT.tint(), 0.36, 0.27, 0.245);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.05), MAT.dark());
      bridge.position.set(0, 0.05, 0.01); g.add(bridge);
      addTemples(g, MAT.dark(), 0.42, 0.06, 0.018);
      return g;
    },
    cateye(){
      const g = new THREE.Group(); const rim = MAT.dark();
      ringLensPair(g, rim, MAT.mirror(), 0.165, 0.245);
      const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 8, 20, Math.PI), rim);
      bridge.position.set(0, 0.02, 0.01); g.add(bridge);
      addTemples(g, rim, 0.405, 0);
      return g;
    },
  },
  smart:{
    meta(){
      const g = new THREE.Group();
      chunkyFramePair(g, MAT.tech(), MAT.tint(), 0.35, 0.26, 0.24);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.05), MAT.tech());
      bridge.position.set(0, 0.045, 0.01); g.add(bridge);
      addTemples(g, MAT.tech(), 0.41, 0.05, 0.02);
      /* camera pupil at the outer corner */
      const camRing = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 8, 18), MAT.silver());
      camRing.position.set(-0.40, 0.09, 0.03); g.add(camRing);
      const camDot = new THREE.Mesh(new THREE.CircleGeometry(0.02, 14), MAT.glow(0x77c9ff));
      camDot.position.set(-0.40, 0.09, 0.032); g.add(camDot);
      return g;
    },
    visor(){
      const g = new THREE.Group();
      /* one continuous wraparound lens: open cylinder segment */
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.46, 0.22, 40, 1, true, -Math.PI*0.36, Math.PI*0.72),
        new THREE.MeshStandardMaterial({color:0x1d2a3a, roughness:.08, metalness:.6, transparent:true, opacity:.7, side:THREE.DoubleSide}));
      lens.position.set(0, -0.01, -0.42); g.add(lens);
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.465, 0.465, 0.035, 40, 1, true, -Math.PI*0.36, Math.PI*0.72), MAT.tech());
      bar.position.set(0, 0.125, -0.42); g.add(bar);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.01), MAT.glow(0x7bffc9));
      strip.position.set(0.30, 0.10, 0.015); g.add(strip);
      addTemples(g, MAT.tech(), 0.44, 0.09, 0.016);
      return g;
    },
    vuzix(){
      const g = new THREE.Group(); const rim = MAT.tech();
      [-0.25, 0.25].forEach(x=>{
        const frame = new THREE.Mesh(roundedRectGeo(0.33, 0.20, 0.06), rim);
        frame.position.set(x, 0, 0.012); g.add(frame);
        const lens = new THREE.Mesh(roundedRectGeo(0.29, 0.16, 0.05), MAT.clear());
        lens.position.set(x, 0, 0.008); g.add(lens);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.02), rim);
      bridge.position.set(0, 0.025, 0.01); g.add(bridge);
      addTemples(g, rim, 0.415, 0.01, 0.016);
      /* compute pod on the right temple */
      const pod = new THREE.Mesh(roundedRectGeo(0.05, 0.09, 0.02, 0.05), rim);
      pod.rotation.y = Math.PI/2; pod.position.set(0.43, 0.02, -0.16); g.add(pod);
      const led = new THREE.Mesh(new THREE.CircleGeometry(0.012, 10), MAT.glow(0xffb46b));
      led.rotation.y = Math.PI/2; led.position.set(0.457, 0.05, -0.16); g.add(led);
      return g;
    },
  },
};

/* ══════════════ GLB drop-in (reads #glb-config) ══════════════ */
const DESIGN_SIZE = 0.9;   // all products are glasses — one design width
const glbCache = {};
function parseTriple(str){
  if(!str) return null;
  const p = str.split(",").map(Number);
  return (p.length===3 && p.every(n=>!isNaN(n))) ? p : null;
}
function loadGlb(url){
  if(glbCache[url]) return Promise.resolve(glbCache[url]);
  return new Promise((res,rej)=>{
    if(typeof THREE.GLTFLoader === "undefined"){ rej(new Error("GLTFLoader unavailable")); return; }
    const loader = new THREE.GLTFLoader();
    if(typeof THREE.DRACOLoader !== "undefined"){
      const draco = new THREE.DRACOLoader();
      draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
      loader.setDRACOLoader(draco);
    }
    loader.load(url, g=>{ glbCache[url]=g.scene; res(g.scene); }, undefined, rej);
  });
}
async function buildProduct(cat, variant){
  const cfg = document.querySelector(`#glb-config [data-product="${cat}/${variant}"]`);
  const url = cfg && cfg.dataset.glbUrl && cfg.dataset.glbUrl.trim();
  if(url){
    try{
      const tpl = await loadGlb(url);
      const model = tpl.clone(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3(); box.getSize(size);
      const center = new THREE.Vector3(); box.getCenter(center);
      const k = DESIGN_SIZE / Math.max(size.x,size.y,size.z,1e-6);
      const wrap = new THREE.Group();
      model.position.sub(center); wrap.add(model);
      wrap.scale.setScalar(k * (parseFloat(cfg.dataset.glbScale)||1));
      const off = parseTriple(cfg.dataset.glbOffset);
      if(off) model.position.add(new THREE.Vector3(...off));
      const rot = parseTriple(cfg.dataset.glbRotation);
      if(rot) model.rotation.set(...rot.map(d=>d*Math.PI/180));
      const outer = new THREE.Group(); outer.add(wrap);
      log(`GLB loaded: ${cat}/${variant}`);
      return outer;
    }catch(e){
      warn(`GLB failed for ${cat}/${variant} — using built-in mesh.`, e);
      toast("Couldn't load the 3D model — showing the built-in version");
    }
  }
  return BUILD[cat][variant]();
}
function disposeGroup(g){
  g.traverse(o=>{
    if(o.geometry) o.geometry.dispose();
    if(o.material) (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());
  });
}
function addLights(scene){
  scene.add(new THREE.AmbientLight(0xffffff,.75));
  const key=new THREE.DirectionalLight(0xffffff,.85); key.position.set(2,3,4); scene.add(key);
  const fill=new THREE.DirectionalLight(0xdfe6ff,.35); fill.position.set(-3,1,-2); scene.add(fill);
}

/* ══════════════ SHARED TRACKING ENGINE — face only ══════════════ */
const TASKS_URL  = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const Engine = {
  refs:0, startPromise:null, active:false, deniedOnce:false,
  video:null, stream:null, faceLm:null,
  faceRes:null, faceQ:null, lastVideoTime:-1, noDetectToastAt:0,

  async acquire(onStage){
    this.refs++;
    if(this.active) return;
    if(!this.startPromise) this.startPromise = this._start(onStage);
    try{ await this.startPromise; }
    catch(e){ this.refs--; this.startPromise = null; throw e; }
  },
  release(){
    this.refs = Math.max(0, this.refs-1);
    if(this.refs === 0) this._teardown();
  },

  async _start(onStage){
    const stage = (n,txt)=>{ log(`STAGE ${n}: ${txt}`); onStage && onStage(txt); };

    stage(0, "checking environment");
    if(!isSecureContext) throw new Error("Camera is blocked outside a secure context (use HTTPS or a local file).");
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      throw new Error("This browser doesn't expose a camera API.");
    if(window.self !== window.top) warn("STAGE 0: inside an iframe — camera permissions often fail here.");

    stage(1, "loading tracking library");
    const vision = await withTimeout(import(TASKS_URL + "/vision_bundle.mjs"), 15000, "Loading MediaPipe");

    stage(2, "requesting camera");
    this.stream = await withTimeout(
      navigator.mediaDevices.getUserMedia({video:{facingMode:"user", width:{ideal:1280}, height:{ideal:720}}, audio:false}),
      15000, "Camera permission");
    log("STAGE 2: stream acquired", this.stream.getVideoTracks()[0].getSettings());

    stage(3, "starting video");
    this.video = document.createElement("video");
    this.video.playsInline = true; this.video.muted = true;
    this.video.srcObject = this.stream;
    await withTimeout(new Promise(res=>{
      if(this.video.readyState >= 2) return res();
      this.video.onloadeddata = ()=>res();
    }), 10000, "Video start");
    await this.video.play().catch(()=>{});
    log("STAGE 3: video playing", this.video.videoWidth+"×"+this.video.videoHeight);

    stage(4, "waking the tracker");
    const fileset = await withTimeout(vision.FilesetResolver.forVisionTasks(TASKS_URL + "/wasm"), 15000, "WASM fileset");
    const make = delegate => vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions:{modelAssetPath:FACE_MODEL, delegate},
      runningMode:"VIDEO", numFaces:1, outputFacialTransformationMatrixes:true,
    });
    try{
      this.faceLm = await withTimeout(make("GPU"), 25000, "face landmarker (GPU)");
      log("STAGE 4: face landmarker ready (GPU)");
    }catch(e){
      warn(`STAGE 4: GPU delegate failed (${e.message}) — retrying on CPU`);
      this.faceLm = await withTimeout(make("CPU"), 25000, "face landmarker (CPU)");
      log("STAGE 4: face landmarker ready (CPU)");
    }

    stage(5, "first look (shader warm-up)");
    this.active = true;
    this.lastVideoTime = -1;
    this.noDetectToastAt = performance.now() + 9000;
    log("STAGE 5: engine running — detection happens in the global loop");
  },

  step(now){
    if(!this.active || !this.video || this.video.readyState < 2) return;
    if(this.video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = this.video.currentTime;
    try{ this.faceRes = this.faceLm.detectForVideo(this.video, now); }
    catch(e){ warn("detect error", e); }
    this.faceQ = this._faceQuat();
    if(this.noDetectToastAt && now > this.noDetectToastAt){
      if(!(this.faceRes && this.faceRes.faceLandmarks.length))
        toast("I can't see you yet — step into frame and add a little light 💡", 4000);
      this.noDetectToastAt = 0;
    }
  },

  _m4:new THREE.Matrix4(), _q:new THREE.Quaternion(), _p:new THREE.Vector3(), _s:new THREE.Vector3(),
  _faceQuat(){
    const fm = this.faceRes && this.faceRes.facialTransformationMatrixes;
    if(!fm || !fm.length) return null;
    this._m4.fromArray(fm[0].data);
    this._m4.decompose(this._p, this._q, this._s);
    this._q.y *= -1; this._q.z *= -1;      // mirrored display
    return this._q;
  },

  _teardown(){
    this.active = false; this.startPromise = null;
    if(this.stream){ this.stream.getTracks().forEach(t=>t.stop()); this.stream = null; }
    try{ this.faceLm && this.faceLm.close(); }catch(e){}
    this.faceLm = null;
    this.faceRes = this.faceQ = null;
    this.video = null;
    log("engine torn down — camera released, landmarker closed");
  },
};

const LM = { noseBridge:168, tragionL:454, tragionR:234 };

/* ══════════════ VIEWER SLOTS ══════════════ */
const slots = [];

function makeSlot(viewerEl, isHero){
  const canvas = viewerEl.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const prodScene = new THREE.Scene();
  addLights(prodScene);
  const prodCam = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
  prodCam.position.set(0, 0.12, 2.1);

  let controls = null;
  if(typeof THREE.OrbitControls !== "undefined"){
    controls = new THREE.OrbitControls(prodCam, viewerEl);
    controls.enableZoom = false;              // per spec: no zoom
    controls.enablePan = false;               // per spec: no pan
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7;
    controls.autoRotate = isHero && !REDUCED; // only the hero auto-spins
    controls.autoRotateSpeed = TUNE.heroSpinSpeed;
    controls.target.set(0, 0, 0);
    controls.addEventListener("start", ()=>{
      controls.autoRotate = false;
      viewerEl.classList.add("touched");
    });
  }else{
    warn("OrbitControls failed to load — falling back to simple drag rotation");
  }

  const slot = { viewerEl, canvas, renderer, prodScene, prodCam, controls,
                 product:null, mirror:null, cat:null, variant:null, isHero,
                 manualDrag:null };

  if(!controls){
    slot.manualDrag = {down:false, lx:0};
    viewerEl.addEventListener("pointerdown", e=>{ slot.manualDrag.down=true; slot.manualDrag.lx=e.clientX; viewerEl.classList.add("touched"); });
    addEventListener("pointermove", e=>{
      if(!slot.manualDrag.down || !slot.product) return;
      slot.product.rotation.y += (e.clientX - slot.manualDrag.lx)*0.012;
      slot.manualDrag.lx = e.clientX;
    });
    addEventListener("pointerup", ()=>{ slot.manualDrag.down=false; });
  }

  const ro = new ResizeObserver(()=>sizeSlot(slot));
  ro.observe(viewerEl);
  sizeSlot(slot);
  return slot;
}
function sizeSlot(slot){
  const w = slot.viewerEl.clientWidth || 1, h = slot.viewerEl.clientHeight || 1;
  slot.renderer.setSize(w, h, false);
  slot.prodCam.aspect = w/h; slot.prodCam.updateProjectionMatrix();
  if(slot.mirror){
    const oc = slot.mirror.cam;
    oc.left=-w/2; oc.right=w/2; oc.top=h/2; oc.bottom=-h/2; oc.updateProjectionMatrix();
  }
}
async function setSlotProduct(slot, cat, variant){
  if(slot.product){ slot.prodScene.remove(slot.product); disposeGroup(slot.product); slot.product=null; }
  slot.cat = cat; slot.variant = variant;
  const raw = await buildProduct(cat, variant);
  const box = new THREE.Box3().setFromObject(raw);
  const c = new THREE.Vector3(); box.getCenter(c);
  raw.position.sub(c);
  const wrap = new THREE.Group(); wrap.add(raw);
  slot.prodScene.add(wrap);
  slot.product = wrap;
  if(slot.isHero && slot.controls && !REDUCED && !slot.viewerEl.classList.contains("touched"))
    slot.controls.autoRotate = true;
}

/* ══════════════ MIRROR TILE ══════════════ */
function tileMapLm(lm, w, h){
  const vw = Engine.video.videoWidth || 1280, vh = Engine.video.videoHeight || 720;
  const s = Math.max(w/vw, h/vh);
  const dw = vw*s, dh = vh*s;
  const ox = (w-dw)/2, oy = (h-dh)/2;
  return new THREE.Vector3(ox + (1-lm.x)*dw - w/2, h/2 - (oy + lm.y*dh), 0);
}
function smoothItem(item, pos, quat, scale){
  if(!item.pos){ item.pos=pos.clone(); item.quat=quat.clone(); item.scl=scale; }
  else{
    item.pos.lerp(pos, TUNE.posSmooth);
    item.quat.slerp(quat, TUNE.rotSmooth);
    item.scl = lerp(item.scl, scale, TUNE.scaleSmooth);
  }
  item.popT = Math.min(1, (item.popT||0) + 0.045);
  const pop = REDUCED ? item.popT : item.popT*(2-item.popT);
  item.group.position.copy(item.pos);
  item.group.quaternion.copy(item.quat);
  item.group.scale.setScalar(Math.max(item.scl*pop, 0.0001));
  item.group.visible = true;
}

async function enterTryOn(slot, btn){
  if(slot.mirror) return;
  const load = document.createElement("div");
  load.className = "card-load";
  load.innerHTML = '<div class="spinner"></div><div class="stage-txt">Starting…</div>';
  slot.viewerEl.appendChild(load);
  const stageTxt = load.querySelector(".stage-txt");

  try{
    await Engine.acquire(txt=>{ stageTxt.textContent = txt; });
  }catch(e){
    load.remove();
    if(e.name === "NotAllowedError" || /permission|denied/i.test(e.message||"")){
      if(Engine.deniedOnce)
        toast("Camera is still blocked — enable it in your browser's address-bar site settings, then try again", 5000);
      else
        toast("Try-on isn't available — camera access was blocked");
      Engine.deniedOnce = true;
    }else{
      toast("Try-on couldn't start: " + (e.message || e), 5000);
    }
    warn("try-on failed:", e);
    return;
  }

  const video = document.createElement("video");
  video.className = "mirror-video";
  video.playsInline = true; video.muted = true; video.autoplay = true;
  video.srcObject = Engine.stream;
  slot.viewerEl.insertBefore(video, slot.canvas);

  const scene = new THREE.Scene();
  addLights(scene);
  const w = slot.viewerEl.clientWidth, h = slot.viewerEl.clientHeight;
  const cam = new THREE.OrthographicCamera(-w/2, w/2, h/2, -h/2, -4000, 4000);

  const group = await buildProduct(slot.cat, slot.variant);
  group.visible = false;
  scene.add(group);

  slot.mirror = { video, scene, cam, item:{group, popT:0, pos:null, quat:new THREE.Quaternion(), scl:0} };
  slot.viewerEl.classList.add("touched");
  btn.textContent = "Exit try-on";
  btn.classList.add("exiting");
  load.remove();
  log(`try-on started for ${slot.cat}/${slot.variant} — engine refs:`, Engine.refs);
}
function exitTryOn(slot, btn){
  if(!slot.mirror) return;
  slot.mirror.video.srcObject = null;
  slot.mirror.video.remove();
  disposeGroup(slot.mirror.item.group);
  slot.mirror = null;
  Engine.release();
  if(btn){ btn.textContent = "Try on"; btn.classList.remove("exiting"); }
  slot.renderer.clear();
  log("try-on exited — engine refs:", Engine.refs);
}
function exitAllTryOns(){
  slots.forEach(s=>{
    if(s.mirror){
      const card = s.viewerEl.closest(".card");
      exitTryOn(s, card && card.querySelector(".btn-try"));
    }
  });
}

/* every product on this page is face-anchored */
function updateMirror(slot){
  const m = slot.mirror; if(!m) return;
  const face = Engine.faceRes && Engine.faceRes.faceLandmarks && Engine.faceRes.faceLandmarks[0];
  if(!face || !Engine.faceQ){ m.item.group.visible = false; return; }
  const w = slot.viewerEl.clientWidth, h = slot.viewerEl.clientHeight;
  const faceW = tileMapLm(face[LM.tragionR], w, h).distanceTo(tileMapLm(face[LM.tragionL], w, h));
  smoothItem(m.item, tileMapLm(face[LM.noseBridge], w, h), Engine.faceQ, faceW*TUNE.glassesScale);
}

/* ══════════════ GLOBAL RENDER LOOP ══════════════ */
function loop(){
  const now = performance.now();
  if(Engine.active) Engine.step(now);
  for(const slot of slots){
    if(slot.mirror){
      updateMirror(slot);
      slot.renderer.render(slot.mirror.scene, slot.mirror.cam);
    }else{
      if(slot.controls) slot.controls.update();
      slot.renderer.render(slot.prodScene, slot.prodCam);
    }
  }
  requestAnimationFrame(loop);
}

/* ══════════════ CATEGORY SWITCHING ══════════════ */
let currentCat = null;
async function applyCategory(cat, pushHash=true){
  if(!CATALOG[cat] || cat === currentCat) return;
  currentCat = cat;
  exitAllTryOns();
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.cat===cat));
  if(pushHash) history.replaceState(null, "", "#"+cat);

  const content = document.getElementById("content");
  if(!REDUCED){ content.classList.add("fading"); await new Promise(r=>setTimeout(r, 220)); }

  const c = CATALOG[cat];
  document.getElementById("hero-headline").textContent = c.hero.headline;
  document.getElementById("hero-lead").textContent = c.hero.lead;
  document.getElementById("hero-desc").textContent = c.hero.desc;
  document.getElementById("hero-specs").innerHTML = c.hero.specs.map(escapeHtml).join("<br>");
  document.querySelectorAll(".card").forEach((cardEl, i)=>{
    cardEl.querySelector(".p-name").textContent = c.cards[i].name;
  });

  await Promise.all([
    setSlotProduct(slots[0], cat, c.hero.variant),
    setSlotProduct(slots[1], cat, c.cards[0].variant),
    setSlotProduct(slots[2], cat, c.cards[1].variant),
  ]);

  content.classList.remove("fading");
  log("category:", cat);
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }

/* ══════════════ wiring ══════════════ */
function init(){
  slots.push(makeSlot(document.getElementById("hero-viewer"), true));
  document.querySelectorAll(".card").forEach(cardEl=>{
    const slot = makeSlot(cardEl.querySelector(".viewer"), false);
    slots.push(slot);
    cardEl.querySelector(".btn-buy").addEventListener("click", ()=>toast("Added to cart ✓"));
    const tryBtn = cardEl.querySelector(".btn-try");
    tryBtn.addEventListener("click", ()=>{
      if(slot.mirror) exitTryOn(slot, tryBtn);
      else enterTryOn(slot, tryBtn);
    });
  });

  const nav = document.getElementById("nav");
  nav.addEventListener("click", e=>{
    const tab = e.target.closest(".tab");
    if(tab) applyCategory(tab.dataset.cat);
  });
  nav.addEventListener("keydown", e=>{
    if(e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const tabs = [...nav.querySelectorAll(".tab")];
    const i = tabs.findIndex(t=>t.classList.contains("active"));
    const next = tabs[(i + (e.key==="ArrowRight"?1:-1) + tabs.length) % tabs.length];
    next.focus(); applyCategory(next.dataset.cat);
  });
  addEventListener("hashchange", ()=>{
    const cat = location.hash.slice(1);
    if(CATALOG[cat]) applyCategory(cat, false);
  });

  addEventListener("beforeunload", exitAllTryOns);

  const startCat = CATALOG[location.hash.slice(1)] ? location.hash.slice(1) : DEFAULT_CAT;
  applyCategory(startCat, false);
  loop();
  log("ready — categories:", Object.keys(CATALOG).join(", "));
}
init();
