
(function () {
const $ = id => document.getElementById(id);
const DEFAULT = `/fill -4 0 -2 5 0 5 stone
/fill -4 1 0 5 4 0 stone
/fill 0 1 0 1 2 0 air

/fill -2 1 0 -2 2 0 sticky_piston[facing_direction=4]
/fill 3 1 0 3 2 0 sticky_piston[facing_direction=5]

/setblock -2 1 1 stone
/setblock 3 1 1 stone
/fill -4 1 2 3 1 2 stone

/setblock -2 2 1 redstone_wire
/setblock 3 2 1 redstone_wire
/setblock -4 1 1 redstone_wire
/setblock -4 2 2 redstone_torch
/fill -3 2 2 3 2 2 redstone_wire

/setblock -4 1 -1 lever["lever_direction"="north"]
`;
$('script').value = DEFAULT;

let simulationWorker = null, workerReady = false, workerFailed = false, pendingMessages = [], buildHideTimer = null, buildRunning = false;
let renderQueue = new Map(), renderPump = 0, visualQueued = 0, visualDone = 0, workerBuildComplete = false;
let synthAudioContext=null;
let audioMixBus=null, audioLeftAnalyser=null, audioRightAnalyser=null;
let audioLeftSamples=null, audioRightSamples=null, audioVizRaf=0, audioVizUntil=0;
function unlockSynthAudio(){
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return null;
    if(!synthAudioContext)synthAudioContext=new C();
    ensureSpatialAudioGraph(synthAudioContext);
    if(synthAudioContext.state==='suspended')synthAudioContext.resume().catch(()=>{});
    return synthAudioContext;
  }catch(_){return null;}
}
document.addEventListener('pointerdown',unlockSynthAudio,{capture:true,passive:true});
document.addEventListener('keydown',unlockSynthAudio,{capture:true});
function ensureSpatialAudioGraph(ctx){
  if(!ctx||ctx.__redstoneSpatialGraphReady)return;
  try{
    audioMixBus=ctx.createGain();
    audioMixBus.gain.value=1;
    audioMixBus.connect(ctx.destination);
    const splitter=ctx.createChannelSplitter(2);
    audioLeftAnalyser=ctx.createAnalyser();audioRightAnalyser=ctx.createAnalyser();
    audioLeftAnalyser.fftSize=256;audioRightAnalyser.fftSize=256;
    audioLeftAnalyser.smoothingTimeConstant=.15;audioRightAnalyser.smoothingTimeConstant=.15;
    audioLeftAnalyser.channelCount=1;audioRightAnalyser.channelCount=1;
    audioMixBus.connect(splitter);
    splitter.connect(audioLeftAnalyser,0);
    splitter.connect(audioRightAnalyser,1);
    audioLeftSamples=new Float32Array(audioLeftAnalyser.fftSize);
    audioRightSamples=new Float32Array(audioRightAnalyser.fftSize);
    ctx.__redstoneMixBus=audioMixBus;
    ctx.__redstoneSpatialGraphReady=true;
  }catch(_){audioMixBus=ctx.destination;ctx.__redstoneMixBus=ctx.destination;ctx.__redstoneSpatialGraphReady=true;}
}
function setAudioVector(listener,prefix,values,now){
  const axes=['X','Y','Z'];
  if(listener[prefix+'X']&&typeof listener[prefix+'X'].setValueAtTime==='function'){
    axes.forEach((axis,i)=>listener[prefix+axis].setValueAtTime(Number(values[i])||0,now));
  }else if(prefix==='position'&&typeof listener.setPosition==='function')listener.setPosition(...values);
  else if(prefix==='forward'&&typeof listener.setOrientation==='function')listener.setOrientation(...values,0,1,0);
}
function updateSpatialListenerPose(ctx=synthAudioContext,pose=null){
  if(!ctx||!ctx.listener||!window.Renderer||typeof Renderer.getAudioListener!=='function')return;
  pose=pose||Renderer.getAudioListener();if(!pose)return;
  const listener=ctx.listener;
  try{
    const now=ctx.currentTime;
    if(listener.positionX&&listener.positionX.setValueAtTime){['X','Y','Z'].forEach((axis,i)=>{listener['position'+axis].value=Number(pose.position[i])||0;});}
    else if(typeof listener.setPosition==='function')listener.setPosition(...pose.position);
    if(listener.forwardX&&listener.forwardX.setValueAtTime){
      ['X','Y','Z'].forEach((axis,i)=>{listener['forward'+axis].value=Number(pose.forward[i])||0;listener['up'+axis].value=Number(pose.up[i])||0;});
    }else if(typeof listener.setOrientation==='function')listener.setOrientation(...pose.forward,...pose.up);
  }catch(_){try{const now=ctx.currentTime;setAudioVector(listener,'position',pose.position,now);if(typeof listener.setOrientation==='function')listener.setOrientation(...pose.forward,...pose.up);}catch(__){}}
}
function soundSpatialInfo(sound){
  const pose=window.Renderer&&typeof Renderer.getAudioListener==='function'?Renderer.getAudioListener():null;
  const raw=Array.isArray(sound&&sound.pos)&&sound.pos.length>=3?sound.pos.map(Number):null;
  if(!pose||!raw||!raw.every(Number.isFinite))return {distance:0,pan:0,attenuation:1,direction:'CENTER',source:raw};
  // Three.js block meshes are centered at their integer block coordinates.
  const source=raw,lp=pose.position,delta=[source[0]-lp[0],source[1]-lp[1],source[2]-lp[2]];
  const distance=Math.hypot(...delta),dir=distance>1e-6?delta.map(v=>v/distance):[0,0,0];
  const f=pose.forward,u=pose.up;
  let right=[f[1]*u[2]-f[2]*u[1],f[2]*u[0]-f[0]*u[2],f[0]*u[1]-f[1]*u[0]];
  const rlen=Math.hypot(...right)||1;right=right.map(v=>v/rlen);
  const pan=Math.max(-1,Math.min(1,dir[0]*right[0]+dir[1]*right[1]+dir[2]*right[2]));
  const front=dir[0]*f[0]+dir[1]*f[1]+dir[2]*f[2];
  let side=Math.abs(pan)<.18?'CENTER':pan<0?'LEFT':'RIGHT';
  if(front<-.24&&side!=='CENTER')side='BEHIND '+side;
  else if(front<-.45)side='BEHIND';
  else if(front>.55&&side==='CENTER')side='AHEAD';
  // Common block interaction sounds attenuate smoothly to silence over 16 blocks.
  const attenuation=distance<=1?1:Math.max(0,Math.min(1,(16-distance)/15));
  return {distance,pan,attenuation,direction:side,source};
}
function setAudioMeter(el,pct){if(el)el.style.width=Math.max(0,Math.min(100,pct))+'%';}
function updateAudioMonitor(sound){
  const info=soundSpatialInfo(sound),name=String(sound&&sound.kind||'sound').replace(/_/g,' ');
  const source=info.source&&info.source.every(Number.isFinite)?info.source.map(v=>Number(v).toFixed(0)).join(', '):'unknown source';
  const distance=Number.isFinite(info.distance)?info.distance.toFixed(1)+' blocks':'—';
  const direction=info.direction||'CENTER';
  const $sound=document.getElementById('audioSoundName'),$dist=document.getElementById('audioDistance'),$dir=document.getElementById('audioDirection'),$pos=document.getElementById('audioSourcePosition');
  if($sound)$sound.textContent=name.toUpperCase();if($dist)$dist.textContent=distance;if($dir)$dir.textContent=direction;if($pos)$pos.textContent='XYZ '+source;
  const leftBase=Math.sqrt((1-info.pan)/2)*Math.SQRT2,rightBase=Math.sqrt((1+info.pan)/2)*Math.SQRT2;
  // Initial directional estimate is replaced continuously by the real mixed output meters.
  setAudioMeter(document.getElementById('audioLeftMeter'),100*info.attenuation*Math.min(1,leftBase));
  setAudioMeter(document.getElementById('audioRightMeter'),100*info.attenuation*Math.min(1,rightBase));
  const $monitor=document.getElementById('audioMonitor');if($monitor)$monitor.classList.add('active');
  audioVizUntil=performance.now()+950;
  if(!audioVizRaf)audioVizRaf=requestAnimationFrame(pumpAudioMeters);
}
function analyserRms(analyser,buffer){
  if(!analyser||!buffer)return 0;
  try{analyser.getFloatTimeDomainData(buffer);let sum=0;for(let i=0;i<buffer.length;i++)sum+=buffer[i]*buffer[i];return Math.sqrt(sum/buffer.length);}catch(_){return 0;}
}
function pumpAudioMeters(now){
  audioVizRaf=0;
  const left=analyserRms(audioLeftAnalyser,audioLeftSamples),right=analyserRms(audioRightAnalyser,audioRightSamples);
  const $lm=document.getElementById('audioLeftMeter'),$rm=document.getElementById('audioRightMeter'),$lv=document.getElementById('audioLeftLevel'),$rv=document.getElementById('audioRightLevel');
  const leftPct=Math.max(0,Math.min(100,left*650)),rightPct=Math.max(0,Math.min(100,right*650));
  if(left>.0008||right>.0008){setAudioMeter($lm,leftPct);setAudioMeter($rm,rightPct);if($lv)$lv.textContent=Math.round(leftPct)+'%';if($rv)$rv.textContent=Math.round(rightPct)+'%';}
  if(now<audioVizUntil||left>.0012||right>.0012){audioVizRaf=requestAnimationFrame(pumpAudioMeters);}
  else{
    setAudioMeter($lm,0);setAudioMeter($rm,0);if($lv)$lv.textContent='0%';if($rv)$rv.textContent='0%';
    const $monitor=document.getElementById('audioMonitor');if($monitor)$monitor.classList.remove('active');
  }
}
function spatialDestination(ctx,sound){
  ensureSpatialAudioGraph(ctx);
  const p=Array.isArray(sound&&sound.pos)&&sound.pos.length>=3?sound.pos.map(Number):null;
  const pose=window.Renderer&&typeof Renderer.getAudioListener==='function'?Renderer.getAudioListener():null;
  if(!pose)return ctx.__redstoneMixBus||ctx.destination;
  // Events without an explicit block position are kept local to the listener instead of bypassing spatial audio.
  const source=p&&p.every(Number.isFinite)?p:[pose.position[0],pose.position[1],pose.position[2]];
  updateSpatialListenerPose(ctx,pose);
  const now=ctx.currentTime,panner=ctx.createPanner();
  panner.panningModel='HRTF';
  panner.distanceModel='linear';
  panner.refDistance=1;
  panner.maxDistance=16;
  panner.rolloffFactor=1;
  if(panner.positionX&&panner.positionX.setValueAtTime){['X','Y','Z'].forEach((axis,i)=>panner['position'+axis].setTargetAtTime(source[i],now,.008));}
  else panner.setPosition(source[0],source[1],source[2]);
  // Correct signal flow: synth sources -> input gain -> PannerNode -> stereo output.
  // The previous code connected synth sources to a gain downstream of the panner, bypassing spatial audio.
  const input=ctx.createGain();input.gain.value=1;input.connect(panner);panner.connect(ctx.__redstoneMixBus||ctx.destination);
  setTimeout(()=>{try{input.disconnect();panner.disconnect();}catch(_){}},2600);
  return input;
}
function synthTone(ctx,frequency,wave,gain,duration,options={}){
  const now=ctx.currentTime,osc=ctx.createOscillator(),amp=ctx.createGain();
  osc.type=wave||'sine';osc.frequency.setValueAtTime(Math.max(20,frequency),now);
  if(options.endFrequency)osc.frequency.exponentialRampToValueAtTime(Math.max(20,options.endFrequency),now+duration);
  if(options.detune)osc.detune.setValueAtTime(options.detune,now);
  const attack=Math.min(.012,duration*.2);amp.gain.setValueAtTime(.0001,now);amp.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),now+attack);
  amp.gain.exponentialRampToValueAtTime(.0001,now+duration);
  if(options.filter){const filter=ctx.createBiquadFilter();filter.type=options.filter;filter.frequency.value=options.cutoff||1800;osc.connect(filter);filter.connect(amp);}else osc.connect(amp);
  amp.connect(ctx.__redstoneSpatialDestination||ctx.destination);osc.start(now);osc.stop(now+duration+.015);
}
function synthNoise(ctx,duration,gain,filterType='lowpass',cutoff=1800){
  const now=ctx.currentTime,length=Math.max(1,Math.floor(ctx.sampleRate*duration)),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();src.buffer=buffer;filter.type=filterType;filter.frequency.value=cutoff;
  amp.gain.setValueAtTime(Math.max(.0001,gain),now);amp.gain.exponentialRampToValueAtTime(.0001,now+duration);src.connect(filter);filter.connect(amp);amp.connect(ctx.__redstoneSpatialDestination||ctx.destination);src.start(now);src.stop(now+duration+.01);
}
function playSynthSound(sound){
  const ctx=unlockSynthAudio();if(!ctx)return;if(ctx.state!=='running'){ctx.resume().then(()=>{if(ctx.state==='running')playSynthSound(sound);}).catch(()=>{});return;}
  updateAudioMonitor(sound);
  const previousDestination=ctx.__redstoneSpatialDestination;
  ctx.__redstoneSpatialDestination=spatialDestination(ctx,sound);
  try {
  const kind=String(sound.kind||'');
  if(kind==='piston'){
    const extending=sound.action!=='retract',base=extending?94:72;
    synthTone(ctx,base,'triangle',.19,.18,{endFrequency:extending?48:38});synthTone(ctx,base*1.53,'sine',.10,.12,{endFrequency:base*.82});synthTone(ctx,base*2.4,'square',.035,.045,{endFrequency:base*1.3});synthNoise(ctx,.055,.045,'lowpass',950);return;
  }
  if(kind==='lever'){synthTone(ctx,sound.powered?790:620,'square',.045,.055,{endFrequency:sound.powered?680:480});synthTone(ctx,180,'triangle',.07,.07,{endFrequency:105});return;}
  if(kind==='button'){synthTone(ctx,sound.wood? sound.pressed?720:490:sound.pressed?940:580,sound.wood?'triangle':'square',.05,.045,{endFrequency:sound.pressed?420:300});synthNoise(ctx,.025,.018,'highpass',1800);return;}
  if(kind==='pressure_plate'){synthTone(ctx,sound.wood?(sound.pressed?210:155):(sound.pressed?280:185),'triangle',.065,.085,{endFrequency:sound.pressed?130:95});return;}
  if(kind==='torch'){synthTone(ctx,sound.lit?1050:560,'square',.018,.025,{endFrequency:sound.lit?800:360});return;}
  if(kind==='repeater'){synthTone(ctx,430+(Number(sound.delay)||1)*85,'square',.045,.05,{endFrequency:260});synthTone(ctx,190,'triangle',.035,.06,{endFrequency:120});return;}
  if(kind==='comparator'){synthTone(ctx,sound.subtract?310:520,'triangle',.055,.085,{endFrequency:sound.subtract?180:300});synthTone(ctx,sound.subtract?620:780,'sine',.025,.06,{endFrequency:430});return;}
  if(kind==='torch_burnout'){synthTone(ctx,440,'sawtooth',.11,.42,{endFrequency:62});synthTone(ctx,277,'triangle',.10,.34,{endFrequency:47});synthNoise(ctx,.34,.095,'lowpass',950);synthTone(ctx,76,'sine',.13,.38,{endFrequency:35});return;}
  if(kind==='noteblock'){
    const note=Math.max(0,Math.min(24,Math.trunc(Number(sound.note)||0))),f=440*Math.pow(2,(note-15)/12),instrument=String(sound.instrument||'harp');
    const tones={
      harp:[[1,'sine',.17],[2.01,'sine',.07],[3.9,'triangle',.025]],bass:[[.5,'sine',.12],[1,'triangle',.12],[2,'sawtooth',.035]],bd:[[.5,'sine',.22],[1,'sine',.07]],snare:[[1,'triangle',.07],[2.4,'square',.025]],hat:[[5,'sine',.035],[8,'sine',.02]],bell:[[1,'sine',.13],[2.76,'sine',.08],[5.4,'sine',.035],[8.9,'sine',.02]],chime:[[1,'sine',.12],[2.5,'sine',.06],[4.1,'sine',.035]],flute:[[1,'sine',.14],[2,'triangle',.055],[3,'sine',.025]],guitar:[[1,'triangle',.13],[2,'sawtooth',.045],[3,'triangle',.025]],xylophone:[[1,'sine',.15],[2.7,'sine',.075],[5.4,'sine',.035]],iron_xylophone:[[1,'sine',.12],[3.01,'sine',.08],[6.2,'sine',.04]],cow_bell:[[1,'square',.055],[1.48,'square',.055],[2.1,'sine',.035]],didgeridoo:[[.5,'sawtooth',.075],[1,'triangle',.11],[1.5,'sawtooth',.04]],bit:[[1,'square',.095],[2,'square',.045]],banjo:[[1,'triangle',.14],[2.03,'square',.035],[3.8,'triangle',.02]],pling:[[1,'sine',.14],[2.8,'sine',.07],[5.1,'sine',.03]]
    };
    const profile=tones[instrument]||tones.harp,duration=({bass:.65,bd:.22,snare:.18,hat:.12,bell:.85,chime:.8,flute:.42,guitar:.36,xylophone:.48,iron_xylophone:.75,cow_bell:.35,didgeridoo:.58,bit:.2,banjo:.4,pling:.72})[instrument]||.48;
    for(const [mult,wave,vol] of profile)synthTone(ctx,f*mult,wave,vol,duration,{endFrequency:instrument==='bd'?Math.max(30,f*mult*.55):undefined,filter:instrument==='hat'?'highpass':undefined,cutoff:instrument==='hat'?6500:undefined,detune:mult===2?2:0});
    if(instrument==='snare')synthNoise(ctx,.18,.12,'bandpass',2100);if(instrument==='hat')synthNoise(ctx,.11,.075,'highpass',6800);if(instrument==='bd')synthNoise(ctx,.05,.045,'lowpass',650);
  }
  } finally { ctx.__redstoneSpatialDestination=previousDestination; }
}

function onMsg(m) {
  if (m.type === 'sound') playSynthSound(m.sound || {});
  else if (m.type === 'progress') updateBuildProgress(m);
  else if (m.type === 'runComplete') { workerBuildComplete = true; visualQueued=Math.max(visualDone+renderQueue.size,visualQueued); if(renderQueue.size)updateVisualProgress();else finishBuildProgress(); }
  else if (m.type === 'diff') { stat(m); queueRenderDiff(m); }
  else if (m.type === 'entities') Renderer.setEntities(m.entities || []);
  else if (m.type === 'stat') stat(m);
  else if (m.type === 'log') { printLog(m.logs); const bad=(m.logs||[]).find(x=>!x.ok && /^(Add|Remove) structure/.test(String(x.cmd))); if(bad){$('structureStatus').classList.add('error');$('structureStatus').textContent=bad.msg;} }
  else if (m.type === 'structureAdded') {
    const wasEditing = !!editingStructureName && editingStructureName === m.name;
    if (!bootLoading && m.structure) {
      structureStore.overrides[m.name] = m.structure;
      structureStore.deleted = structureStore.deleted.filter(n => n !== m.name);
      saveStructureStore();
    }
    if (wasEditing) cancelStructureEdit(false);
    $('structureStatus').classList.remove('error');
    $('structureStatus').textContent = (wasEditing ? 'Updated ' : 'Saved ') + m.name + ' (' + m.blocks + ' blocks)';
    if (!bootLoading) refreshStructureList();
  }
  else if (m.type === 'structureRemoved') {
    if (Object.prototype.hasOwnProperty.call(structureTemplates,m.name) && !structureStore.deleted.includes(m.name)) structureStore.deleted.push(m.name);
    delete structureStore.overrides[m.name]; saveStructureStore();
    if (editingStructureName === m.name) cancelStructureEdit(true);
    $('structureStatus').classList.remove('error'); $('structureStatus').textContent = 'Removed structure: ' + m.name;
    refreshStructureList();
  }
  else if (m.type === 'structureList') renderStructureList(m.structures || []);
  else if (m.type === 'snapshot') { try { const name=($('exportName').value.trim() || 'redstone_structure').replace(/\.(mcfunction|mcstructure|mcpack)$/i,'') || 'redstone_structure'; if(m.format==='mcpack'){const result=BedrockStructure.downloadMcpack(m.blocks,name);setFileStatus('Exported '+name+'.mcpack · '+m.count+' blocks. Enable the pack, then run /function '+result.functionName+'.',false);}else{const result=BedrockStructure.download(m.blocks,name);setFileStatus('Exported '+name+'.mcstructure · '+m.count+' blocks · '+result.size.join('×'),false);} } catch(e) { setFileStatus('Export failed: '+e.message,true); } }
}


const hudState = { tick: 0, count: 0, facing: 'North', dayTime: 0, daylightCycle: true };
function formatDayTime(value) {
  const ticks=((Math.trunc(Number(value)||0)%24000)+24000)%24000;
  const minutes=Math.floor(((ticks+6000)%24000)*1440/24000);
  return String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
}
function renderHud() {
  const el = $('hud');
  if (!el) return;
  el.textContent = 'Ticks: ' + hudState.tick + '  ·  Blocks: ' + hudState.count + '  ·  Facing: ' + hudState.facing + '  ·  Time: ' + formatDayTime(hudState.dayTime);
}
function stat(m) {
  if (m && Number.isFinite(Number(m.tick))) hudState.tick = Number(m.tick);
  if (m && Number.isFinite(Number(m.count))) hudState.count = Number(m.count);
  if (m && Number.isFinite(Number(m.dayTime))) hudState.dayTime = Number(m.dayTime);
  if (m && typeof m.daylightCycle === 'boolean') hudState.daylightCycle = m.daylightCycle;
  const toggle=$('daylightCycleToggle');if(toggle&&toggle.checked!==hudState.daylightCycle)toggle.checked=hudState.daylightCycle;
  renderHud();
}
function failWorker(message) {
  workerFailed=true;workerReady=false;
  try{if(simulationWorker)simulationWorker.terminate();}catch(_){}
  simulationWorker=null;pendingMessages=[];
  $('mode').textContent='worker unavailable';
  $('run').disabled=$('clearRun').disabled=$('wipe').disabled=true;$('cmd').disabled=true;
  printLog([{ok:false,cmd:'Simulation worker',msg:message}]);
  setTimeout(()=>showToast('Background simulation could not start. Check that js/simulationEngineSW.js is present beside the project scripts, then reload.',6000),0);
}
function startSimulation() {
  try {
    const mainScript=document.currentScript || Array.from(document.scripts).find(s=>/\/js\/main\.js(?:[?#]|$)/.test(s.src));
    const workerUrl=mainScript&&mainScript.src?new URL('simulationEngineSW.js',mainScript.src):new URL('./js/simulationEngineSW.js',location.href);
    simulationWorker = new Worker(workerUrl.href);
    simulationWorker.onmessage = event => {
      const m=event.data||{};
      if(m.type==='ready') {
        workerReady=true;$('mode').textContent='background simulation';
        const queued=pendingMessages;pendingMessages=[];
        for(const message of queued)simulationWorker.postMessage(message);
        return;
      }
      onMsg(m);
    };
    simulationWorker.onerror = event => {
      if(event&&typeof event.preventDefault==='function')event.preventDefault();
      failWorker('The worker script failed to load or execute ('+(event&&event.message||'unknown worker error')+').');
    };
    simulationWorker.onmessageerror = () => failWorker('A worker message could not be decoded.');
    $('mode').textContent='starting background simulation…';
  } catch (error) { failWorker(String(error&&error.message||error)); }
}
function send(m) {
  if(workerFailed){if(m&&m.type==='run')showToast('Build cancelled: background simulation worker is unavailable.',4500);return;}
  if(simulationWorker) {
    if(workerReady)simulationWorker.postMessage(m);
    else pendingMessages.push(m);
  }
}
function queueRenderDiff(message) {
  const changes=Array.isArray(message.changes)?message.changes:[];
  if(!changes.length)return;
  for(const change of changes){
    if(!Array.isArray(change)||change.length<5)continue;
    const key=change[0]+','+change[1]+','+change[2];
    renderQueue.set(key,change);
  }
  if(buildRunning)visualQueued=Math.max(visualQueued,visualDone+renderQueue.size);
  if(!renderPump)renderPump=requestAnimationFrame(processRenderQueue);
}
function updateVisualProgress() {
  if(!buildRunning||!workerBuildComplete)return;
  const total=Math.max(visualQueued,visualDone+renderQueue.size);
  const pct=total>0?Math.min(99,Math.floor(visualDone/total*100)):100;
  updateBuildProgress({percent:pct,label:'Rendering blocks...'});
}
function processRenderQueue() {
  renderPump=0;
  const deadline=performance.now()+5;let budget=80;const batch=[];
  while(renderQueue.size&&budget>0&&performance.now()<deadline){
    const key=renderQueue.keys().next().value;
    batch.push(renderQueue.get(key));renderQueue.delete(key);budget--;
  }
  if(batch.length){Renderer.apply(batch,[]);visualDone+=batch.length;}
  if(buildRunning&&workerBuildComplete)updateVisualProgress();
  if(renderQueue.size){renderPump=requestAnimationFrame(processRenderQueue);return;}
  if(workerBuildComplete)finishBuildProgress();
}
function updateBuildProgress(m={}) {
  const panel=$('buildingProgress');panel.hidden=false;
  const pct=Math.max(0,Math.min(100,Number(m.percent)||0));
  $('buildingProgressText').textContent=m.label||'Building...';
  $('buildingPercent').textContent=pct+'%';
  $('buildingProgressFill').style.width=pct+'%';
  $('buildingProgressTrack').setAttribute('aria-valuenow',String(pct));
  $('run').disabled=$('clearRun').disabled=$('wipe').disabled=true;
  $('cmd').disabled=true;
}
function beginBuildProgress() {
  if(buildRunning)return false;
  buildRunning=true;workerBuildComplete=false;visualQueued=0;visualDone=0;
  $('stage').classList.add('building');
  if(buildHideTimer){clearTimeout(buildHideTimer);buildHideTimer=null;}
  updateBuildProgress({percent:0,label:'Building...'});
  return true;
}
function finishBuildProgress() {
  if(renderQueue.size){workerBuildComplete=true;visualQueued=Math.max(visualQueued,visualDone+renderQueue.size);updateVisualProgress();return;}
  buildRunning=false;workerBuildComplete=false;
  $('buildingProgressText').textContent='Built';
  $('buildingPercent').textContent='100%';
  $('buildingProgressFill').style.width='100%';
  $('buildingProgressTrack').setAttribute('aria-valuenow','100');
  $('run').disabled=$('clearRun').disabled=$('wipe').disabled=false;
  $('cmd').disabled=false;
  if(buildHideTimer)clearTimeout(buildHideTimer);
  buildHideTimer=setTimeout(()=>{$('buildingProgress').hidden=true;$('stage').classList.remove('building');buildHideTimer=null;},700);
}
function replaceCustomJSBlocks(source) {
  let resolved=String(source),evaluated=0;
  const hasBlock=()=>/<js\s*>[\s\S]*?<\/js\s*>/i.test(resolved);
  for(let pass=0;pass<64&&hasBlock();pass++){
    let blockNumber=0;
    const before=resolved;
    resolved=resolved.replace(/<js\s*>([\s\S]*?)<\/js\s*>/gi,(_whole,body)=>{
      blockNumber++;evaluated++;
      if(evaluated>512)throw new Error('Too many nested editor JavaScript blocks (limit 512).');
      let result;
      try{
        const code=String(body||'').trim();
        result=(new Function('"use strict"; return eval('+JSON.stringify(code)+');'))();
      }catch(error){throw new Error('JS block '+evaluated+': '+String(error&&error.message||error));}
      if(typeof result!=='string'){
        const kind=result===null?'null':Array.isArray(result)?'array':typeof result;
        throw new Error('JS block '+evaluated+' must return a string (returned '+kind+').');
      }
      return result;
    });
    if(resolved===before&&hasBlock())throw new Error('Editor JavaScript expansion did not make progress.');
  }
  if(hasBlock())throw new Error('Editor JavaScript expansion exceeded 64 passes.');
  if(/<\/?js\b/i.test(resolved))throw new Error('Malformed editor JavaScript block: expected matching <js> and </js> tags.');
  return resolved;
}
function stripCustomJSBlocks(source) {
  return String(source).replace(/<js\s*>[\s\S]*?(?:<\/js\s*>|$)/gi,'').replace(/<\/js\s*>/gi,'');
}
function findEditorOnlyCommand(source) {
  const withoutJs=stripCustomJSBlocks(source);
  for (const line of withoutJs.split(/\r?\n/)) {
    const trimmed=line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    for (const segment of trimmed.split(/\s+(?=\/[a-z])/i)) {
      const command=segment.trim().replace(/^\//,'').split(/\s+/,1)[0].toLowerCase();
      if (command==='use') return segment.trim();
    }
  }
  return '';
}

function writeScriptEditor(value) { if(aceEditor)aceEditor.setValue(String(value),-1);else $('script').value=String(value); }
function prepareEditorScript() {
  const original=readScript();
  try {
    const resolved=replaceCustomJSBlocks(original);
    if(resolved!==original)writeScriptEditor(resolved);
    return resolved;
  } catch(error) {
    printLog([{ok:false,cmd:'<js>',msg:error.message||String(error)}]);
    showToast('Editor JavaScript failed; simulation was not started.',4200);
    return null;
  }
}
function runSource(source, options={}) {
  if(workerFailed){showToast('The simulation worker could not start. Reload after checking the project files.',5000);return false;}
  let resolved=String(source);
  try { resolved=replaceCustomJSBlocks(resolved); }
  catch(error) { printLog([{ok:false,cmd:'<js>',msg:error.message||String(error)}]);showToast('Editor JavaScript failed; simulation was not started.',4200);return false; }
  if(resolved!==String(source)){
    if(options.target==='editor')writeScriptEditor(resolved);
    else if(options.target==='input'&&options.element)options.element.value=resolved;
  }
  if(!beginBuildProgress())return false;
  send({type:'run',source:resolved});
  return true;
}

Renderer.init($('view'));
Renderer.setEntityTickDuration(50);
Renderer.onAudioListenerUpdate=()=>updateSpatialListenerPose();
Renderer.onFacingChange = facing => { hudState.facing=facing;renderHud(); };
renderHud();
startSimulation();
let viewOnly = false, selectingAnchor = false, anchorPosition = null, toastTimer = null;
function showToast(message, duration=2800) {
  const el=$('toast'); el.textContent=message; el.classList.add('visible');
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('visible'),duration);
}
function setFileStatus(message,error=false){const el=$('fileStatus');if(!el)return;el.textContent=message;el.classList.toggle('error',!!error);}
function openFileModal(){ $('fileModal').hidden=false;$('exportFormats').hidden=true;setFileStatus('Choose a file to import, or export the current project.'); }
function closeFileModal(){ $('fileModal').hidden=true;$('exportFormats').hidden=true; }
function exportTextFile(name,text){const safe=String(name||'redstone_function').replace(/\.(mcfunction|mcstructure|mcpack)$/i,'').replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'')||'redstone_function';const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=safe+'.mcfunction';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1200);}
function applyCameraAnchor(p) {
  if(!p){anchorPosition=null;Renderer.resetCameraAnchor();$('cameraAnchorSelect').value='none';showToast('Camera anchor reset to the normal center.');return;}
  anchorPosition=p.map(v=>Math.trunc(Number(v)||0));Renderer.setCameraAnchor(anchorPosition);
  let option=$('cameraAnchorSelect').querySelector('option[value="current"]');
  if(!option){option=document.createElement('option');option.value='current';$('cameraAnchorSelect').appendChild(option);}
  option.textContent='Anchor: '+anchorPosition.join(', ');$('cameraAnchorSelect').value='current';
  showToast('Camera anchored to block '+anchorPosition.join(' ')+'. Orbit and pan will use this block as the focus.');
}
let selectedBlockPosition = null;
function closeBlockMenu(){ $('blockMenu').hidden=true; selectedBlockPosition=null; }
function openBlockMenu(p, data, event){
  selectedBlockPosition=p.map(v=>Math.trunc(Number(v)||0));
  const type=String(data&&data.type||'air').replace(/^minecraft:/,'');
  $('blockMenuTitle').textContent='minecraft:'+type;
  $('blockMenuPosition').textContent='Position: '+selectedBlockPosition.join(', ');
  const states=data&&data.state&&typeof data.state==='object'?data.state:{};
  const pairs=Object.entries(states).filter(([key])=>!String(key).startsWith('_')).map(([key,value])=>key+' = '+(value&&typeof value==='object'?JSON.stringify(value):String(value)));
  $('blockMenuStates').textContent=pairs.length?'States\n'+pairs.join('\n'):'No active states';
  $('scrollCommandBtn').disabled=!(data&&data.sourceCommand);
  $('scrollCommandBtn').dataset.sourceCommand=String(data&&data.sourceCommand||'');
  const menu=$('blockMenu'), stage=$('stage'), rect=stage.getBoundingClientRect();
  menu.hidden=false;
  const x=Math.max(8,Math.min(rect.width-menu.offsetWidth-8,(event?event.clientX-rect.left:rect.width/2)+10));
  const y=Math.max(48,Math.min(rect.height-menu.offsetHeight-8,(event?event.clientY-rect.top:rect.height/2)+10));
  menu.style.left=x+'px';menu.style.top=y+'px';
}
Renderer.onClick = (p, data, event) => {
  if(selectingAnchor){selectingAnchor=false;$('cameraAnchorBtn').textContent='Set Camera Anchor';applyCameraAnchor(p);return;}
  if(viewOnly)return;
  if(event&&(event.button===2||event.isLongPress)){openBlockMenu(p,data,event);return;}
  if(buildRunning){showToast('Wait for the current build to finish before interacting with blocks.',2200);return;}
  send({type:'use',x:p[0],y:p[1],z:p[2]});
};
$('removeBlockBtn').onclick=()=>{
  if(!selectedBlockPosition)return;
  const p=selectedBlockPosition.slice();closeBlockMenu();runSource('/setblock '+p.join(' ')+' air');
};
function normalizeCommandLine(line){return String(line||'').trim().replace(/^\//,'').replace(/\s+/g,' ');}
$('scrollCommandBtn').onclick=()=>{
  const command=$('scrollCommandBtn').dataset.sourceCommand||'';
  if(!command){showToast('No source command recorded for this block.');return;}
  const target=normalizeCommandLine(command), lines=readScript().split(/\r?\n/);
  let row=-1;for(let i=lines.length-1;i>=0;i--)if(normalizeCommandLine(lines[i])===target){row=i;break;}
  if(row<0){
    const commandHead=target.split(/\s+/).slice(0,2).join(' ');
    for(let i=lines.length-1;i>=0;i--)if(normalizeCommandLine(lines[i]).startsWith(commandHead)){row=i;break;}
  }
  if(row>=0){
    if(aceEditor){aceEditor.gotoLine(row+1,0,true);aceEditor.selection.selectLine();aceEditor.focus();}
    else{const fallback=$('script');fallback.hidden=false;fallback.focus();let offset=0;for(let i=0;i<row;i++)offset+=lines[i].length+1;fallback.setSelectionRange(offset,offset+lines[row].length);}
  }else{
    $('cmd').value=command;
    if($('panel').classList.contains('closed'))$('toggle').click();
    $('cmd').focus();$('cmd').select();
  }
  closeBlockMenu();
};
$('closeBlockMenuBtn').onclick=closeBlockMenu;
document.addEventListener('pointerdown',e=>{if(!$('blockMenu').hidden&&!$('blockMenu').contains(e.target))closeBlockMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeBlockMenu();});
$('cameraAnchorBtn').onclick=()=>{
  selectingAnchor=!selectingAnchor;
  $('cameraAnchorBtn').textContent=selectingAnchor?'Cancel Anchor':'Set Camera Anchor';
  if(selectingAnchor)showToast('Select a block in the scene to make it the camera anchor. Select NONE to return to the normal center.',5000);
  else showToast('Camera anchor selection cancelled.');
};
$('cameraAnchorSelect').onchange=()=>{if($('cameraAnchorSelect').value==='none'){selectingAnchor=false;$('cameraAnchorBtn').textContent='Set Camera Anchor';applyCameraAnchor(null);}else if(anchorPosition)Renderer.setCameraAnchor(anchorPosition);};
$('viewOnlyBtn').onclick=()=>{
  viewOnly=!viewOnly;$('viewOnlyBtn').textContent='View Only: '+(viewOnly?'ON':'OFF');$('viewOnlyBtn').classList.toggle('active',viewOnly);
  showToast(viewOnly?'View Only enabled: block interactions are disabled. Camera orbit, pan and zoom still work.':'View Only disabled: block interactions are enabled.');
};

function printLog(logs) {
  const el = $('log');
  for (const l of logs) { const d = document.createElement('div'); const warning=l.level==='warn';d.className=warning?'warn':(l.ok?'ok':'err');
    d.textContent = (warning?'! ':(l.ok?'\u2713 ':'\u2717 ')) + l.cmd + (l.msg ? '  \u2014 ' + l.msg : ''); el.appendChild(d); }
  while (el.children.length > 300) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}
let aceEditor = null;
let availableStructureNames = new Set(['barrel_signal_1']);
const readScript = () => aceEditor ? aceEditor.getValue() : $('script').value;
function stateSuggestionsFor(item,key){
  const st=(item.states||[]).find(x=>x.key===key);if(!st)return [];
  if(Array.isArray(st.values))return st.values.slice();
  const range=st.values;
  if(range&&typeof range==='object'&&Number.isFinite(Number(range.min))&&Number.isFinite(Number(range.max))){
    const min=Math.trunc(Number(range.min)),max=Math.trunc(Number(range.max));
    if(max<min||max-min>4096)return [];
    return Array.from({length:max-min+1},(_,i)=>min+i);
  }
  return [];
}
function setupAceEditor(){
  const host=$('scriptEditor'), fallback=$('script');
  fallback.value=DEFAULT;
  if(!window.ace||typeof window.ace.edit!=='function'){
    host.hidden=true;fallback.hidden=false;$('editorTools').hidden=true;$('scriptLabel').htmlFor='script';$('scriptLabel').textContent='Command script (textarea fallback)';return;
  }
  aceEditor=window.ace.edit(host);
  let aceSearchBox=null;
  const openSearch=replace=>{
    if(!aceEditor)return;
    const show=mod=>{
      if(mod&&typeof mod.Search==='function')mod.Search(aceEditor,!!replace);
      else aceEditor.execCommand(replace?'replace':'find');
      aceEditor.focus();
    };
    try{
      if(aceSearchBox){show(aceSearchBox);return;}
      if(window.ace&&window.ace.config&&typeof window.ace.config.loadModule==='function'){
        window.ace.config.loadModule('ace/ext/searchbox',mod=>{aceSearchBox=mod;show(mod);});
        return;
      }
      aceSearchBox=window.ace&&window.ace.require?window.ace.require('ace/ext/searchbox'):null;
      show(aceSearchBox);
    }catch(_){try{aceEditor.execCommand(replace?'replace':'find');}catch(__){}aceEditor.focus();}
  };
  $('findScript').onclick=()=>openSearch(false);
  $('replaceScript').onclick=()=>openSearch(true);
  $('editorTools').hidden=false;
  aceEditor.setTheme('ace/theme/tomorrow_night');
  aceEditor.session.setMode('ace/mode/text');
  aceEditor.session.setUseWrapMode(false);
  aceEditor.setValue(DEFAULT,-1);
  aceEditor.setOptions({fontSize:'12.5px',showPrintMargin:false,highlightActiveLine:true,scrollPastEnd:0.15,enableBasicAutocompletion:true,enableLiveAutocompletion:true,enableSnippets:false,tabSize:2,useSoftTabs:true});
  fallback.hidden=true;host.hidden=false;
  if(window.ace.require){
    const lang=window.ace.require('ace/ext/language_tools');
    if(lang&&lang.addCompleter)lang.addCompleter({
      getCompletions(editor,session,pos,prefix,callback){
        const all=(RedstoneEngine.catalogAll?RedstoneEngine.catalogAll():RedstoneEngine.catalog());
        const line=session.getLine(pos.row),before=line.slice(0,pos.column);
        if(before.trimStart().startsWith('#')){callback(null,[]);return;}
        const out=[],seen=new Set();
        const add=(caption,value,meta,score=1000,filterText=caption)=>{
          const key=String(value)+'|'+meta;if(seen.has(key))return;seen.add(key);
          out.push({caption:String(caption),value:String(value),meta,score,filterText:String(filterText)});
        };
        const cleanName=x=>String(x||'').replace(/^minecraft:/i,'').toLowerCase();
        const getBlock=name=>all.find(b=>b.name===cleanName(name)||(b.commandNames||[]).some(n=>cleanName(n)===cleanName(name)));
        const addBlocks=(typed='')=>{
          const q=cleanName(typed);
          for(const item of all)for(const raw of (item.commandNames&&item.commandNames.length?item.commandNames:[item.name])){
            const name=cleanName(raw);if(q&&!name.startsWith(q))continue;
            add(name,name,'Bedrock block',1100,name);
          }
        };
        const addWords=(words,typed,meta,score=1150)=>{
          const q=String(typed||'').replace(/^\//,'').toLowerCase();
          for(const w of words)if(!q||w.toLowerCase().startsWith(q))add(w,w,meta,score,w);
        };
        const stateOpen=before.lastIndexOf('[')>before.lastIndexOf(']');
        if(stateOpen){
          const head=before.slice(0,before.lastIndexOf('['));
          const blockToken=head.trim().split(/\s+/).pop()||'';
          const item=getBlock(blockToken);
          if(item){
            const inside=before.slice(before.lastIndexOf('[')+1);
            const tail=inside.split(/[,;]/).pop().trim();
            const eq=tail.indexOf('=');
            if(eq>=0){
              const key=tail.slice(0,eq).trim().replace(/^['"]|['"]$/g,'');
              const valuePart=tail.slice(eq+1).trim(),valueQuote=valuePart.match(/^(['"])/)?.[1]||'';
              const typedValue=valuePart.replace(/^['"]/, '').toLowerCase();
              for(const rawValue of stateSuggestionsFor(item,key)){
                const stringValue=typeof rawValue==='string';
                const value=stringValue?(valueQuote?String(rawValue)+valueQuote:JSON.stringify(rawValue)):String(rawValue);
                const filter=String(rawValue).toLowerCase();if(typedValue&&!filter.startsWith(typedValue))continue;
                add(String(rawValue),value,'Bedrock state value · '+key,1400,filter);
              }
            }else{
              const typedKey=tail.replace(/^['"]/, '').replace(/['"]$/, '').toLowerCase();
              for(const st of (item.states||[])){
                const keyFilter=String(st.key).split(':').pop().toLowerCase();
                if(typedKey&&!String(st.key).toLowerCase().startsWith(typedKey)&&!keyFilter.startsWith(typedKey))continue;
                const keyQuote=tail.trim().match(/^(['"])/)?.[1]||'';
                const keyInsert=st.key.includes(':')?(keyQuote?st.key+keyQuote:JSON.stringify(st.key)):st.key;
                add(keyFilter,keyInsert+'=','Bedrock block state',1450,keyFilter);
              }
            }
          }
          callback(null,out);return;
        }
        const jsTyped=before.trimStart();
        if(/^<(?:j(?:s)?)?$/i.test(jsTyped) || /^(?:j|js)$/i.test(jsTyped)){
          const snippet='<js>\n  (()=>{\n    return ``; // must return string\n  })();\n</js>';
          add('Editor-only <js> IIFE string block',snippet,'Editor-only JavaScript (stripped from Minecraft exports)',1600,'js');
          callback(null,out);return;
        }
        if(/<js\s*>/i.test(before)&&!/<\/js\s*>/i.test(before)) { callback(null,[]); return; }
        const raw=before.trimStart(),trailing=/\s$/.test(before);
        let content=raw.trimEnd();
        let tokens=content?content.split(/\s+/):[];
        if(trailing)tokens.push('');
        if(tokens.length===0||(tokens.length===1&&!trailing)){
          const token=tokens[0]||'';const typed=token.replace(/^\//,'').toLowerCase();
          const commands=['setblock','fill','clone','clear','structure','function','summon','kill','time','gamerule'];
          for(const name of commands)if(!typed||name.startsWith(typed))add(name,name,name==='clear'?'Minecraft command · inventory is not simulated':'Minecraft Bedrock command',1500,name);
          callback(null,out);return;
        }
        const cmdToken=(tokens[0]||'').replace(/^\//,'').toLowerCase();
        const args=tokens.slice(1,-1),typed=tokens[tokens.length-1]||'';
        const argIndex=args.length;
        if(cmdToken==='time'){
          if(argIndex===0)addWords(['set','add','query'],typed,'Time command',1450);
          else if(String(args[0]||'').toLowerCase()==='set'&&argIndex===1)addWords(['day','sunrise','noon','sunset','night','midnight','0','1000','6000','12000','13000','18000','23000'],typed,'Bedrock time value',1400);
          else if(String(args[0]||'').toLowerCase()==='query'&&argIndex===1)addWords(['daytime','gametime','day'],typed,'Time query',1400);
          callback(null,out);return;
        }
        if(cmdToken==='gamerule'){
          if(argIndex===0)addWords(['doDaylightCycle'],typed,'Supported gamerule',1450);
          else if(String(args[0]||'').toLowerCase()==='dodaylightcycle'&&argIndex===1)addWords(['true','false'],typed,'Daylight cycle',1400);
          callback(null,out);return;
        }
        if(cmdToken==='summon'){if(argIndex===0)addWords(['armor_stand'],typed,'Supported entity',1450);callback(null,out);return;}
        if(cmdToken==='kill'){if(argIndex===0)addWords(['@e'],typed,'Entity selector',1450);callback(null,out);return;}
        if(cmdToken==='function'){
          const folder=String($('exportName').value||'redstone_structure').replace(/\.(mcfunction|mcstructure|mcpack)$/i,'').replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'')||'redstone_structure';
          const candidates=new Set([folder,folder+'/load_structure']);
          for(const name of availableStructureNames){const safe=String(name).replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'');if(safe)candidates.add(safe+'/load_structure');}
          addWords(Array.from(candidates).sort(),typed,'Exported structure function',1450);
          callback(null,out);return;
        }
        if(cmdToken==='structure'){
          if(argIndex===0){addWords(['load','save','delete'],typed,'Structure command',1400);callback(null,out);return;}
          const sub=String(args[0]||'').toLowerCase();
          if(sub==='load'){
            if(argIndex===1){addWords(Array.from(availableStructureNames).sort(),typed,'Saved structure',1450);}
            else if(argIndex===5)addWords(['0_degrees','90_degrees','180_degrees','270_degrees'],typed,'Structure rotation',1200);
            else if(argIndex===6)addWords(['none','x','z','xz'],typed,'Structure mirror',1200);
            else if(argIndex===7)addWords(['true','false'],typed,'Include blocks',1200);
          }else if(sub==='delete'&&argIndex===1){addWords(Array.from(availableStructureNames).sort(),typed,'Saved structure',1450);}
          else if(sub==='save'&&argIndex===1){addWords(Array.from(availableStructureNames).sort(),typed,'Existing structure name',1050);}
          callback(null,out);return;
        }
        if(cmdToken==='setblock'||cmdToken==='fill'){
          const blockIndex=cmdToken==='setblock'?3:6;
          if(argIndex===blockIndex){addBlocks(typed);}
          else if(argIndex===blockIndex+1){
            const block=getBlock(args[blockIndex]||'');
            if(block&&(block.states||[]).length)add('[','[','Block state list · open [',1200,'[');
            addWords(cmdToken==='fill'?['replace','destroy','hollow','outline','keep']:['replace','destroy','keep'],typed,'Block placement mode',1000);
          }
          else if(argIndex===blockIndex+2&&cmdToken==='fill')addWords(['replace','destroy','hollow','outline','keep'],typed,'Fill mode',1050);
        }else if(cmdToken==='clone'){
          if(argIndex===9)addWords(['replace','masked','filtered'],typed,'Clone mask',1100);
          else if(argIndex===10)addWords(['normal','force','move'],typed,'Clone mode',1100);
        }
        callback(null,out);
      }
    });
  }
  
  
  aceEditor.on('change', e=>{
    if(!e||!e.data||e.data.action!=='insertText')return;
    const inserted=String(e.data.text||'');if(!/[\/\s\[=,'"\]<>]$/.test(inserted))return;
    const row=aceEditor.getCursorPosition().row;
    if(aceEditor.session.getLine(row).trimStart().startsWith('#'))return;
    setTimeout(()=>{if(aceEditor&&aceEditor.isFocused())aceEditor.execCommand('startAutocomplete');},0);
  });
  aceEditor.commands.addCommand({name:'runRedstoneScript',bindKey:{win:'Ctrl-Enter',mac:'Command-Enter'},exec:()=>run(),readOnly:false});
  aceEditor.commands.addCommand({name:'findScriptText',bindKey:{win:'Ctrl-F',mac:'Command-F'},exec:()=>openSearch(false),readOnly:false});
  aceEditor.commands.addCommand({name:'replaceScriptText',bindKey:{win:'Ctrl-H',mac:'Command-Option-F'},exec:()=>openSearch(true),readOnly:false});
  aceEditor.commands.addCommand({name:'insertStateBracket',bindKey:{win:'Ctrl-Space',mac:'Ctrl-Space'},exec:ed=>ed.execCommand('startAutocomplete')});
  $('scriptLabel').htmlFor='scriptEditor';
}
const run = () => runSource(readScript(),{target:'editor'});
setupAceEditor();
$('run').onclick = run;
$('clearRun').onclick = () => { const source=prepareEditorScript();if(source!==null&&!workerFailed){send({type:'clear'});runSource(source,{target:'editor'});} };
$('script').addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); run(); } });
$('cmd').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) { const target=e.target,value=e.target.value,hasJS=/<js\s*>/i.test(value);const ran=runSource(value,{target:'input',element:target});if(ran&&!hasJS)target.value=''; } });
$('wipe').onclick = () => { send({ type: 'clear' }); Renderer.reset(); };
$('copyLogs').onclick = async () => {
  const text=Array.from($('log').children).map(node=>node.textContent||'').join('\n');
  if(!text){showToast('No logs to copy.');return;}
  try{await navigator.clipboard.writeText(text);showToast('Logs copied.');}
  catch(_){const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();showToast(ok?'Logs copied.':'Copy failed; select the logs and copy manually.');}
};
$('clearLogs').onclick = () => { $('log').replaceChildren(); };
let logsHidden=false;
$('toggleLogs').onclick=()=>{logsHidden=!logsHidden;$('log').hidden=logsHidden;$('toggleLogs').textContent=logsHidden?'Show logs':'Hide logs';$('toggleLogs').setAttribute('aria-expanded',String(!logsHidden));if(aceEditor)requestAnimationFrame(()=>aceEditor.resize());};
$('rate').oninput = e => { $('rateOut').textContent = e.target.value + ' ms'; Renderer.setEntityTickDuration(+e.target.value); send({ type: 'tickrate', ms: +e.target.value }); };
$('daylightCycleToggle').onchange = e => send({ type: 'daylightCycle', enabled: !!e.target.checked });
$('fileBtn').onclick=openFileModal;
$('closeFileModal').onclick=closeFileModal;
$('fileModal').addEventListener('click',e=>{if(e.target===$('fileModal'))closeFileModal();});
$('exportFileBtn').onclick=()=>{$('exportFormats').hidden=!$('exportFormats').hidden;};
$('exportFormats').querySelectorAll('[data-format]').forEach(button=>button.addEventListener('click',()=>{
  const format=button.dataset.format,name=$('exportName').value.trim()||'redstone_structure';
  $('exportFormats').hidden=true;
  if(format==='mcfunction'){try{const source=readScript(),clean=stripCustomJSBlocks(source),editorOnly=findEditorOnlyCommand(clean);if(editorOnly){setFileStatus('Export blocked: '+editorOnly+' is not a Minecraft Bedrock command. Interact with blocks by clicking/tapping them in the editor, then remove this old command before exporting.',true);return;}exportTextFile(name,clean);setFileStatus('Exported '+name+'.mcfunction; editor-only <js> blocks were removed.');}catch(error){setFileStatus('Export failed: '+error.message,true);}return;}
  setFileStatus(format==='mcpack'?'Building behavior pack…':'Preparing structure file…');send({type:'snapshot',format});
}));
let activeInfoButton=null;
function closeInfoPopover(){$('infoPopover').hidden=true;activeInfoButton=null;}
function openInfoPopover(button){
  const pop=$('infoPopover');
  if(!pop.hidden&&activeInfoButton===button){closeInfoPopover();return;}
  activeInfoButton=button;$('infoPopoverTitle').textContent=button.dataset.infoTitle||'Information';$('infoPopoverText').textContent=button.dataset.info||'';pop.hidden=false;
  const r=button.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight;
  let left=Math.max(8,Math.min(window.innerWidth-w-8,r.left));let top=r.bottom+6;
  if(top+h>window.innerHeight-8)top=Math.max(8,r.top-h-6);
  pop.style.left=left+'px';pop.style.top=top+'px';
}
document.addEventListener('click',e=>{
  const info=e.target.closest&&e.target.closest('.infoButton');
  if(info){openInfoPopover(info);return;}
  if(!$('infoPopover').hidden&&!$('infoPopover').contains(e.target))closeInfoPopover();
  if(!$('exportFormats').hidden&&!$('exportFormats').contains(e.target)&&e.target!==$('exportFileBtn'))$('exportFormats').hidden=true;
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeInfoPopover();if(!$('fileModal').hidden)closeFileModal();}});
let paused = false;
$('pause').onclick = () => { paused = !paused; send({ type: paused ? 'pause' : 'resume' }); $('pause').textContent = paused ? 'Resume' : 'Pause'; };
$('step').onclick = () => send({ type: 'step', n: 1 });
$('toggle').onclick = () => { const c = $('panel').classList.toggle('closed'); $('toggle').innerHTML = c ? '&#9654;' : '&#9664;'; };

const list = $('blocks');
function stateDescription(state){
  const values=state.values;
  if(Array.isArray(values))return values.map(v=>typeof v==='string'?JSON.stringify(v):String(v)).join(' | ');
  if(values&&typeof values==='object'&&Number.isFinite(Number(values.min))&&Number.isFinite(Number(values.max)))return values.min+'..'+values.max;
  return 'value';
}
function renderBlockCatalog(){
  const catalog=RedstoneEngine.catalog();
  list.replaceChildren();
  const heading=document.createElement('h2');heading.textContent='Bedrock blocks · tap to insert a /setblock command';list.appendChild(heading);
  const wool=catalog.find(item=>item.name==='wool');
  if(wool){
    const palette=document.createElement('section');palette.className='woolQuickPalette';
    const title=document.createElement('div');title.className='woolQuickPaletteTitle';title.textContent='Wool colors';palette.appendChild(title);
    const colors=(wool.states||[]).find(st=>st.key==='color')?.values||[];
    const hex={white:'#e9ecec',orange:'#f07613',magenta:'#bd44b3',light_blue:'#3aaedd',yellow:'#f8c627',lime:'#70b919',pink:'#ed8dac',gray:'#41484e',light_gray:'#9aa0a5',cyan:'#169c9b',purple:'#8932b8',blue:'#35399d',brown:'#72452a',green:'#546d1b',red:'#b02e26',black:'#191b1f'};
    for(const color of colors){const swatch=document.createElement('button');swatch.type='button';swatch.className='woolColorButton';swatch.title=color.replace(/_/g,' ');swatch.textContent=color.replace(/_/g,' ');swatch.style.setProperty('--wool-color',hex[color]||'#e9ecec');swatch.onclick=()=>{$('cmd').value='/setblock 0 1 0 wool["color"="'+color+'"]';if($('panel').classList.contains('closed'))$('toggle').click();$('cmd').focus();list.hidden=true;};palette.appendChild(swatch);}
    list.appendChild(palette);
  }
  for(const item of catalog){
    const button=document.createElement('button');button.className='b';
    const name=document.createElement('div');name.className='n';name.textContent='minecraft:'+item.name;
    const desc=document.createElement('div');desc.className='d';desc.textContent=item.description||item.name.replace(/_/g,' ');
    const states=document.createElement('div');states.className='s';
    const stateText=(item.states||[]).map(st=>st.key+'='+stateDescription(st)).join(' · ');
    const alternatives=(item.commandNames||[]).filter(n=>n!==item.commandNames?.[0]);
    states.textContent=(stateText?'States: '+stateText:'No configurable block states')+(alternatives.length?' · IDs: '+alternatives.join(', '):'');
    button.append(name,desc,states);
    button.onclick=()=>{
      const commandName=(item.commandNames&&item.commandNames[0])||item.name;
      $('cmd').value='/setblock 0 1 0 '+commandName;
      if($('panel').classList.contains('closed'))$('toggle').click();
      $('cmd').focus();list.hidden=true;
    };
    list.appendChild(button);
  }
}
renderBlockCatalog();
RedstoneEngine.onCatalogChange(renderBlockCatalog);
$('blocksBtn').onclick = () => { list.hidden = !list.hidden; };

const structureTemplates = {
  barrel_signal_1: {
    size:[3,2,1], blocks:[
      {pos:[0,0,0],name:'minecraft:stone'}, {pos:[1,0,0],name:'minecraft:stone'}, {pos:[2,0,0],name:'minecraft:stone'},
      {pos:[0,1,0],name:'minecraft:barrel',states:{facing_direction:5},items:[{name:'minecraft:stone',count:1,slot:0}]},
      {pos:[1,1,0],name:'minecraft:unpowered_comparator',states:{'minecraft:cardinal_direction':'west',output_lit_bit:false,output_subtract_bit:false}},
      {pos:[2,1,0],name:'minecraft:redstone_wire',states:{redstone_signal:0}}
    ]
  },
  barrel_signal_2: {
    size:[3,2,1], blocks:[
      {pos:[0,0,0],name:'minecraft:stone'}, {pos:[1,0,0],name:'minecraft:stone'}, {pos:[2,0,0],name:'minecraft:stone'},
      {pos:[0,1,0],name:'minecraft:barrel',states:{facing_direction:5},items:[{name:'minecraft:stone',count:64,slot:0},{name:'minecraft:stone',count:64,slot:1}]},
      {pos:[1,1,0],name:'minecraft:unpowered_comparator',states:{'minecraft:cardinal_direction':'west',output_lit_bit:false,output_subtract_bit:false}},
      {pos:[2,1,0],name:'minecraft:redstone_wire',states:{redstone_signal:0}}
    ]
  },
  barrel_signal_7: {
    size:[3,2,1], blocks:[
      {pos:[0,0,0],name:'minecraft:stone'}, {pos:[1,0,0],name:'minecraft:stone'}, {pos:[2,0,0],name:'minecraft:stone'},
      {pos:[0,1,0],name:'minecraft:barrel',states:{facing_direction:5},items:Array.from({length:12},(_,slot)=>({name:'minecraft:stone',count:64,slot}))},
      {pos:[1,1,0],name:'minecraft:unpowered_comparator',states:{'minecraft:cardinal_direction':'west',output_lit_bit:false,output_subtract_bit:false}},
      {pos:[2,1,0],name:'minecraft:redstone_wire',states:{redstone_signal:0}}
    ]
  },
  barrel_signal_15: {
    size:[3,2,1], blocks:[
      {pos:[0,0,0],name:'minecraft:stone'}, {pos:[1,0,0],name:'minecraft:stone'}, {pos:[2,0,0],name:'minecraft:stone'},
      {pos:[0,1,0],name:'minecraft:barrel',states:{facing_direction:5},items:Array.from({length:27},(_,slot)=>({name:'minecraft:stone',count:64,slot}))},
      {pos:[1,1,0],name:'minecraft:unpowered_comparator',states:{'minecraft:cardinal_direction':'west',output_lit_bit:false,output_subtract_bit:false}},
      {pos:[2,1,0],name:'minecraft:redstone_wire',states:{redstone_signal:0}}
    ]
  },
  all_noteblocks: {"size":[5,2,5],"blocks":[{"pos":[0,0,0],"name":"minecraft:dirt"},{"pos":[0,1,0],"name":"minecraft:noteblock","states":{"note":0}},{"pos":[1,0,0],"name":"minecraft:dirt"},{"pos":[1,1,0],"name":"minecraft:noteblock","states":{"note":1}},{"pos":[2,0,0],"name":"minecraft:dirt"},{"pos":[2,1,0],"name":"minecraft:noteblock","states":{"note":2}},{"pos":[3,0,0],"name":"minecraft:dirt"},{"pos":[3,1,0],"name":"minecraft:noteblock","states":{"note":3}},{"pos":[4,0,0],"name":"minecraft:dirt"},{"pos":[4,1,0],"name":"minecraft:noteblock","states":{"note":4}},{"pos":[0,0,1],"name":"minecraft:dirt"},{"pos":[0,1,1],"name":"minecraft:noteblock","states":{"note":5}},{"pos":[1,0,1],"name":"minecraft:dirt"},{"pos":[1,1,1],"name":"minecraft:noteblock","states":{"note":6}},{"pos":[2,0,1],"name":"minecraft:dirt"},{"pos":[2,1,1],"name":"minecraft:noteblock","states":{"note":7}},{"pos":[3,0,1],"name":"minecraft:dirt"},{"pos":[3,1,1],"name":"minecraft:noteblock","states":{"note":8}},{"pos":[4,0,1],"name":"minecraft:dirt"},{"pos":[4,1,1],"name":"minecraft:noteblock","states":{"note":9}},{"pos":[0,0,2],"name":"minecraft:dirt"},{"pos":[0,1,2],"name":"minecraft:noteblock","states":{"note":10}},{"pos":[1,0,2],"name":"minecraft:dirt"},{"pos":[1,1,2],"name":"minecraft:noteblock","states":{"note":11}},{"pos":[2,0,2],"name":"minecraft:dirt"},{"pos":[2,1,2],"name":"minecraft:noteblock","states":{"note":12}},{"pos":[3,0,2],"name":"minecraft:dirt"},{"pos":[3,1,2],"name":"minecraft:noteblock","states":{"note":13}},{"pos":[4,0,2],"name":"minecraft:dirt"},{"pos":[4,1,2],"name":"minecraft:noteblock","states":{"note":14}},{"pos":[0,0,3],"name":"minecraft:dirt"},{"pos":[0,1,3],"name":"minecraft:noteblock","states":{"note":15}},{"pos":[1,0,3],"name":"minecraft:dirt"},{"pos":[1,1,3],"name":"minecraft:noteblock","states":{"note":16}},{"pos":[2,0,3],"name":"minecraft:dirt"},{"pos":[2,1,3],"name":"minecraft:noteblock","states":{"note":17}},{"pos":[3,0,3],"name":"minecraft:dirt"},{"pos":[3,1,3],"name":"minecraft:noteblock","states":{"note":18}},{"pos":[4,0,3],"name":"minecraft:dirt"},{"pos":[4,1,3],"name":"minecraft:noteblock","states":{"note":19}},{"pos":[0,0,4],"name":"minecraft:dirt"},{"pos":[0,1,4],"name":"minecraft:noteblock","states":{"note":20}},{"pos":[1,0,4],"name":"minecraft:dirt"},{"pos":[1,1,4],"name":"minecraft:noteblock","states":{"note":21}},{"pos":[2,0,4],"name":"minecraft:dirt"},{"pos":[2,1,4],"name":"minecraft:noteblock","states":{"note":22}},{"pos":[3,0,4],"name":"minecraft:dirt"},{"pos":[3,1,4],"name":"minecraft:noteblock","states":{"note":23}},{"pos":[4,0,4],"name":"minecraft:dirt"},{"pos":[4,1,4],"name":"minecraft:noteblock","states":{"note":24}}]},
  noteblock_0: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 0}}
  ]
},
noteblock_1: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 1}}
  ]
},
noteblock_2: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 2}}
  ]
},
noteblock_3: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 3}}
  ]
},
noteblock_4: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 4}}
  ]
},
noteblock_5: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 5}}
  ]
},
noteblock_6: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 6}}
  ]
},
noteblock_7: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 7}}
  ]
},
noteblock_8: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 8}}
  ]
},
noteblock_9: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 9}}
  ]
},
noteblock_10: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 10}}
  ]
},
noteblock_11: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 11}}
  ]
},
noteblock_12: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 12}}
  ]
},
noteblock_13: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 13}}
  ]
},
noteblock_14: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 14}}
  ]
},
noteblock_15: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 15}}
  ]
},
noteblock_16: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 16}}
  ]
},
noteblock_17: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 17}}
  ]
},
noteblock_18: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 18}}
  ]
},
noteblock_19: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 19}}
  ]
},
noteblock_20: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 20}}
  ]
},
noteblock_21: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 21}}
  ]
},
noteblock_22: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 22}}
  ]
},
noteblock_23: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 23}}
  ]
},
noteblock_24: {
  size: [1, 2, 1],
  blocks: [
    {pos: [0, 0, 0], name: 'minecraft:dirt'},
    {pos: [0, 1, 0], name: 'minecraft:noteblock', states: {note: 24}}
  ]
}
};
const templateLabels = {
  barrel_signal_1:['Barrel · 1 item','One item slot; comparator outputs signal 1.'],
  barrel_signal_2:['Barrel · signal 2','Two full slots; comparator output signal 2.'],
  barrel_signal_7:['Barrel · signal 7','Twelve full slots; mid-range comparator test.'],
  barrel_signal_15:['Barrel · full','All 27 slots filled; comparator outputs signal 15.'],
  noteblock_example:['Note block','A real Bedrock noteblock palette entry, next to stone.']
};
const STRUCTURE_STORAGE_KEY = 'redstoneSim.structureLibrary.v2';
function readStructureStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STRUCTURE_STORAGE_KEY) || '{}');
    return { overrides: parsed.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {},
      deleted: Array.isArray(parsed.deleted) ? parsed.deleted.filter(x => typeof x === 'string') : [] };
  } catch (_) { return { overrides:{}, deleted:[] }; }
}
let structureStore = readStructureStore();
let bootLoading = false;
let editingStructureName = null;
function saveStructureStore() {
  try { localStorage.setItem(STRUCTURE_STORAGE_KEY, JSON.stringify(structureStore)); }
  catch (_) {  }
}
const toJSON = value => JSON.stringify(value,null,2);
$('structureJson').value = toJSON(structureTemplates.barrel_signal_1);
function cancelStructureEdit(clearStatus=true) {
  editingStructureName = null;
  $('structureName').readOnly = false;
  $('addStructure').textContent = 'Add Structure';
  $('cancelStructureEdit').hidden = true;
  if (clearStatus) { $('structureStatus').classList.remove('error'); $('structureStatus').textContent='Edit cancelled.'; }
}
function renderStructureList(items) {
  availableStructureNames = new Set((items||[]).map(x=>String(x.name||'')).filter(Boolean));
  const host=$('structurePresets'); host.replaceChildren();
  for (const item of items) {
    const name=item.name, structure=item.structure;
    const row=document.createElement('div'); row.className='presetRow';
    const details=document.createElement('div'); details.className='presetInfo';
    const title=document.createElement('strong'); title.textContent=name;
    const small=document.createElement('small'); small.textContent=(templateLabels[name]||[])[1]||((structure.blocks||[]).length+' blocks · tap Edit to inspect or change JSON');
    details.append(title,small);
    const actions=document.createElement('div'); actions.className='presetActions';
    const load=document.createElement('button'); load.className='miniAction'; load.textContent='Command'; load.title='Insert /structure load command into the command box';
    load.onclick=()=>{
      $('cmd').value='/structure load '+name+' 0 1 0';
      if($('panel').classList.contains('closed'))$('toggle').click();
      $('cmd').focus();
    };
    const edit=document.createElement('button'); edit.className='miniAction'; edit.textContent='Edit'; edit.title='Load this structure into the JSON editor';
    edit.onclick=()=>{
      editingStructureName=name;
      $('structureName').value=name; $('structureName').readOnly=true;
      $('structureJson').value=toJSON(structure);
      $('addStructure').textContent='Save Changes'; $('cancelStructureEdit').hidden=false;
      $('structureStatus').classList.remove('error'); $('structureStatus').textContent='Editing '+name+'. Save Changes overwrites it; Cancel Edit leaves it unchanged.';
      $('structureJson').focus();
    };
    const remove=document.createElement('button'); remove.className='miniAction dangerAction'; remove.textContent='Remove'; remove.title='Remove this structure from the library';
    remove.onclick=()=>{
      send({type:'removeStructure',name});
    };
    actions.append(load,edit,remove); row.append(details,actions); host.appendChild(row);
  }
  if (!items.length) {
    const empty=document.createElement('p'); empty.className='hint'; empty.textContent='No structures saved. Add one using the JSON editor above.'; host.appendChild(empty);
  }
}
function refreshStructureList(){send({type:'listStructures'});}
$('addStructure').onclick=()=>{
  try {
    const name=$('structureName').value.trim();
    if(!name)throw new Error('Enter a structure name.');
    const data=JSON.parse($('structureJson').value);
    if (editingStructureName && name !== editingStructureName) throw new Error('Cancel Edit before changing the name.');
    send({type:'addStructure',name,structure:data});
  } catch(e) { $('structureStatus').classList.add('error'); $('structureStatus').textContent='Could not add structure: '+e.message; }
};
$('cancelStructureEdit').onclick=()=>cancelStructureEdit(true);
async function importCommandFile(file){
  const text=await file.text();
  if(aceEditor)aceEditor.setValue(text,-1);else $('script').value=text;
  const base=String(file.name||'imported').trim().split(/[\\/]/).pop();
  $('exportName').value=base.replace(/\.(?:mcfunction|txt)$/i,'')||'redstone_function';
  closeFileModal();
  if($('panel').classList.contains('closed'))$('toggle').click();
  setFileStatus('Loaded '+base+' into the command editor.');
  showToast('Imported '+base+' into the command editor.');
}
async function importNativeStructure(file){
  const parsed=BedrockStructure.parse(new Uint8Array(await file.arrayBuffer()));
  const base=String(file.name||'imported_structure').trim().split(/[\\/]/).pop();
  const name=base.replace(/\.mcstructure$/i,'').replace(/[^a-z0-9_:-]+/gi,'_')||'imported_structure';
  $('exportName').value=name;$('structurePanel').classList.remove('closed');
  $('structureName').value=name;$('structureName').readOnly=false;$('structureJson').value=toJSON(parsed);
  editingStructureName=null;$('addStructure').textContent='Add Structure';$('cancelStructureEdit').hidden=true;
  $('structureStatus').classList.remove('error');$('structureStatus').textContent='Importing native Bedrock structure '+base+'…';
  setFileStatus('Imported '+base+' into the structure library.');send({type:'addStructure',name,structure:parsed});
}
async function importStructureJson(file){
  const txt=await file.text();let parsed;
  try{parsed=JSON.parse(txt);}catch(_){throw new Error('This file is not valid structure JSON. .mcfunction files go to the command editor.');}
  if(!parsed||typeof parsed!=='object'||(!Array.isArray(parsed.blocks)&&!Array.isArray(parsed.structure?.blocks)))throw new Error('JSON must contain a structure blocks array.');
  $('structureJson').value=toJSON(parsed);if(parsed.name)$('structureName').value=parsed.name;
  $('structurePanel').classList.remove('closed');
  $('structureStatus').textContent='Loaded JSON file: '+file.name+' · review it, then press Add Structure.';$('structureStatus').classList.remove('error');
  setFileStatus('Loaded '+file.name+' into the structure editor.');
}
$('structureJsonFile').addEventListener('change',async e=>{
  const file=e.target.files&&e.target.files[0];if(!file)return;
  const filename=String(file.name||'').trim().split(/[\\/]/).pop(),lower=filename.toLowerCase();
  const isFunction=/\.(?:mcfunction|txt)$/i.test(lower),isStructure=/\.mcstructure$/i.test(lower),isJson=/\.json$/i.test(lower);
  try{
    if(isFunction){await importCommandFile(file);}
    else if(isStructure){await importNativeStructure(file);}
    else if(isJson){await importStructureJson(file);}
    else throw new Error('Unsupported file type. Import .mcfunction or .txt into the command editor, .mcstructure into the structure library, or .json into the structure editor.');
  }catch(err){
    const message=String(err&&err.message||err);
    if(isFunction)setFileStatus('Import failed: '+message,true);
    else{$('structureStatus').classList.add('error');$('structureStatus').textContent='Import failed: '+message;setFileStatus('Import failed: '+message,true);}
  }
  e.target.value='';
});
$('structuresToggle').onclick=()=>{$('structurePanel').classList.toggle('closed');};
$('closeStructures').onclick=()=>{$('structurePanel').classList.add('closed');};
$('structurePanel').classList.add('closed');


bootLoading = true;
for(const [name,structure] of Object.entries(structureTemplates)) {
  if (!structureStore.deleted.includes(name)) send({type:'addStructure',name,structure});
}
for(const [name,structure] of Object.entries(structureStore.overrides)) {
  if (structure && typeof structure === 'object' && !structureStore.deleted.includes(name)) send({type:'addStructure',name,structure});
}
bootLoading = false;
refreshStructureList();

run();
})();
