import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// Basic audio beeps
const AudioSys = (()=>{
  let ctx; let enabledMusic=true, enabledSfx=true;
  function ensure(){ if(!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)(); }
  function tone(freq, dur=0.15, vol=0.15){
    if(!enabledSfx) return;
    ensure(); const o=ctx.createOscillator(); const g=ctx.createGain();
    o.type='square'; o.frequency.value=freq; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur); o.start(); o.stop(ctx.currentTime+dur);
  }
  function musicStart(){
    if(!enabledMusic) return;
    ensure();
    const seq=[220,247,262,294,330,294,262,247]; let i=0;
    function step(){
      if(!enabledMusic) return;
      const o=ctx.createOscillator(); const g=ctx.createGain();
      o.type='triangle'; o.frequency.value=seq[i%seq.length];
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.34);
      o.start(); o.stop(ctx.currentTime+0.35);
      i++; setTimeout(step, 350);
    }
    step();
  }
  function setMusic(b){ enabledMusic=b; }
  function setSfx(b){ enabledSfx=b; }
  return { tone, musicStart, setMusic, setSfx };
})();

// State
let running=false, paused=false;
let speed=18, baseSpeed=18, score=0, lane=1, jumping=false, yVel=0;
let gravity = -60;
const LANES=[-2.2, 0, 2.2];
let lastSpawn=0;

// Difficulty params
const diffs={ easy:{mult:0.9, spawn:1.1}, normal:{mult:1.0, spawn:0.9}, hard:{mult:1.2, spawn:0.7} };
let diff = 'normal';

// Scene
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a0f16, 12, 60);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 200);
camera.position.set(0, 3.2, 7);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const hem = new THREE.HemisphereLight(0xbbe1ff, 0x304050, 0.8);
scene.add(hem);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(4,10,6);
scene.add(dir);

// Ground (three lanes road on a snowy ridge)
const groundGeo = new THREE.PlaneGeometry(8, 200, 1, 40);
const groundMat = new THREE.MeshStandardMaterial({color:0x152234, roughness:0.9, metalness:0.0});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.position.z = -60;
scene.add(ground);

// Side snow walls
const wallGeo = new THREE.BoxGeometry(0.6,1.2,200);
const wallMat = new THREE.MeshStandardMaterial({color:0x91a9c6, roughness:1});
const leftWall = new THREE.Mesh(wallGeo, wallMat);
leftWall.position.set(-4.5,0.6,-60); scene.add(leftWall);
const rightWall = leftWall.clone(); rightWall.position.x = 4.5; scene.add(rightWall);

// Player (low-poly skier-ish capsule/box)
const playerGeo = new THREE.BoxGeometry(0.9,1.2,1);
const playerMat = new THREE.MeshStandardMaterial({color:0x79d0ff, roughness:0.6});
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.set(LANES[lane], 0.6, 2.5);
scene.add(player);

// Simple mountains (background)
const mountainGeo = new THREE.ConeGeometry(3,4,4);
for(let i=0;i<12;i++){
  const m = new THREE.Mesh(mountainGeo, new THREE.MeshStandardMaterial({color:0x223247, roughness:1}));
  m.position.set((Math.random()*2-1)*12, 0, -20 - Math.random()*120);
  m.rotation.y = Math.random()*Math.PI;
  scene.add(m);
}

// Obstacles pool
const obstacles=[];
const OB_TYPES = ['rock','gap','ice'];
function spawnObstacle(){
  const t = OB_TYPES[Math.random()<0.6?0: (Math.random()<0.5?1:2)]; // more rocks, some gaps/ice
  const laneIndex = Math.floor(Math.random()*3);
  const z = -80;
  let mesh;
  if(t==='rock'){
    mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7+Math.random()*0.3), new THREE.MeshStandardMaterial({color:0x7b8594, roughness:1}));
    mesh.position.set(LANES[laneIndex], 0.6, z);
  } else if(t==='gap'){
    // gap: se ve como marco oscuro en el piso (hay que saltar)
    mesh = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.1,1.2), new THREE.MeshStandardMaterial({color:0x0b1624, metalness:0.0, roughness:1}));
    mesh.position.set(LANES[laneIndex], 0.05, z);
  } else { // ice (slows turning)
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,0.12,12), new THREE.MeshStandardMaterial({color:0x6fd6ff, roughness:0.2, metalness:0.1}));
    mesh.position.set(LANES[laneIndex], 0.08, z);
  }
  mesh.userData = {type:t, lane: laneIndex};
  scene.add(mesh);
  obstacles.push(mesh);
}

function resetGame(){
  speed = baseSpeed * diffs[diff].mult;
  score = 0; lane = 1; jumping=false; yVel=0;
  player.position.set(LANES[lane], 0.6, 2.5);
  for(const o of obstacles){ scene.remove(o); }
  obstacles.length=0;
  lastSpawn = 0;
  running=true; paused=false;
  document.getElementById('overlay').style.display='none';
  AudioSys.musicStart();
}

function endGame(){
  running=false;
  document.getElementById('overlay').style.display='grid';
  document.querySelector('#overlay .card p').innerHTML = 'Puntaje: <b>'+Math.floor(score)+'</b> — ¡intenta superarlo!';
}

// Input
const keys={};
window.addEventListener('keydown', (e)=>{
  keys[e.key.toLowerCase()]=true;
  if(e.key==='a' || e.key==='ArrowLeft') moveLane(-1);
  if(e.key==='d' || e.key==='ArrowRight') moveLane(1);
  if(e.key==='w' || e.key==='ArrowUp' || e.key===' ') jump();
});
window.addEventListener('keyup', (e)=>{ keys[e.key.toLowerCase()]=false; });

// Touch (swipe)
let touchStartX=0, touchStartY=0, touchTime=0;
window.addEventListener('touchstart', (e)=>{
  const t=e.touches[0]; touchStartX=t.clientX; touchStartY=t.clientY; touchTime=performance.now();
}, {passive:true});
window.addEventListener('touchend', (e)=>{
  const dx = (e.changedTouches[0].clientX - touchStartX);
  const dy = (e.changedTouches[0].clientY - touchStartY);
  const dt = performance.now()-touchTime;
  if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)){ moveLane(dx>0?1:-1); }
  else if(dt<200 && Math.abs(dy)<20){ jump(); }
}, {passive:true});

function moveLane(dir){
  if(!running || paused) return;
  const nl = Math.min(2, Math.max(0, lane+dir));
  if(nl!==lane){
    lane=nl; AudioSys.tone(660,0.08,0.12);
  }
}

function jump(){
  if(!running || paused) return;
  if(!jumping){
    jumping=true; yVel = 18; AudioSys.tone(880,0.12,0.15);
  }
}

// UI Buttons
document.getElementById('btnPlay').addEventListener('click', ()=>{
  const music = document.getElementById('music').checked;
  const sfx = document.getElementById('sfx').checked;
  const sel = document.getElementById('difficulty').value;
  diff = sel;
  AudioSys.setMusic(music);
  AudioSys.setSfx(sfx);
  resetGame();
});
document.getElementById('btnPause').addEventListener('click', ()=>{ if(!running) return; paused = !paused; });
document.getElementById('btnRestart').addEventListener('click', resetGame);

// Resize
window.addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Game loop
let last = performance.now();
function loop(now){
  requestAnimationFrame(loop);
  const dt = Math.min(0.033, (now-last)/1000); last = now;
  if(!running || paused) { renderer.render(scene,camera); return; }

  // Move ground/obstacles backwards
  ground.position.z += speed*dt;
  if(ground.position.z>-10){ ground.position.z = -60; } // loop

  for(let i=obstacles.length-1;i>=0;i--){
    const o = obstacles[i];
    o.position.z += speed*dt;
    if(o.position.z > 8){ scene.remove(o); obstacles.splice(i,1); continue; }
  }

  // Spawning
  lastSpawn += dt;
  if(lastSpawn > diffs[diff].spawn){
    spawnObstacle();
    lastSpawn = 0;
  }

  // Difficulty ramp
  speed += dt*0.6; // slowly faster

  // Player lane smoothing
  player.position.x += (LANES[lane]-player.position.x) * Math.min(1, dt*8);

  // Jump
  if(jumping){
    player.position.y += yVel*dt;
    yVel += gravity*dt;
    if(player.position.y <= 0.6){
      player.position.y = 0.6; jumping=false; yVel=0;
    }
  }

  // Collisions
  const pmin = new THREE.Vector3(player.position.x-0.4, 0, player.position.z-0.5);
  const pmax = new THREE.Vector3(player.position.x+0.4, 1.2, player.position.z+0.5);
  for(const o of obstacles){
    if(o.userData.type==='gap'){
      if(Math.abs(o.position.z - player.position.z) < 0.9 && Math.abs(o.position.x - LANES[lane])<0.2){
        if(!jumping){ endGame(); AudioSys.tone(180,0.3,0.3); return; }
      }
    } else {
      const omin = new THREE.Vector3(o.position.x-0.6, 0, o.position.z-0.6);
      const omax = new THREE.Vector3(o.position.x+0.6, 1.2, o.position.z+0.6);
      if( (pmin.x<=omax.x && pmax.x>=omin.x) && (pmin.z<=omax.z && pmax.z>=omin.z) ){
        endGame(); AudioSys.tone(180,0.3,0.3); return;
      }
    }
    // ice zone: reduce lane change response near ice
    if(o.userData.type==='ice' && Math.abs(o.position.z - player.position.z) < 2 && Math.abs(o.position.x - LANES[lane])<0.2){
      player.position.x += (LANES[lane]-player.position.x) * 0.5;
    }
  }

  // Score
  score += dt*speed;
  document.getElementById('score').textContent = Math.floor(score);
  document.getElementById('speed').textContent = speed.toFixed(1);

  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
