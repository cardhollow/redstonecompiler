
(function () {
const T = THREE;
let entityInterpolationMs = 50;
const DIRV = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const V = a => new T.Vector3(a[0], a[1], a[2]);


function tex(base, speck, extra) {
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 16, 16); let s = 7;
  const r = () => (s = s * 16807 % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) { g.fillStyle = speck; g.globalAlpha = .06 + .25 * r(); g.fillRect(r() * 16 | 0, r() * 16 | 0, 1 + (r() * 2 | 0), 1 + (r() * 2 | 0)); }
  g.globalAlpha = 1; if (extra) extra(g);
  const t = new T.CanvasTexture(c); t.magFilter = t.minFilter = T.NearestFilter; return t;
}
const mat = (b, s, e, o) => new T.MeshLambertMaterial(Object.assign({ map: tex(b, s, e) }, o || {}));
const M = {
  
  stone: mat('#858a90', '#3b4148', g => { g.fillStyle='#aeb3b8'; g.fillRect(2,3,2,1); g.fillRect(10,11,3,1); g.fillStyle='#646a71'; g.fillRect(5,8,2,1); }), ironBlock: mat('#bfc4c8','#7b8186',g=>{g.strokeStyle='#e2e5e7';g.strokeRect(1,1,14,14);g.fillStyle='#a0a6ab';g.fillRect(3,4,3,2);g.fillRect(10,10,3,2);}), obsidian: mat('#16111f', '#8a50ff'),
  target: mat('#e8d9cf', '#d9d0c8', g => { g.fillStyle='#d8432e'; g.fillRect(4,4,8,8); g.fillStyle='#f4efe9'; g.fillRect(5,5,6,6); g.fillStyle='#d8432e'; g.fillRect(6,6,4,4); g.fillStyle='#f4efe9'; g.fillRect(7,7,2,2); }),
  rsblock: mat('#b01a0a', '#ff7050', g => { g.fillStyle = '#6a0c04'; g.fillRect(0, 7, 16, 2); g.fillRect(7, 0, 2, 16); }),
  lampOff: mat('#5d4a33', '#000', g => { g.fillStyle = '#3b2e1e'; g.strokeStyle = '#3b2e1e'; g.strokeRect(1.5, 1.5, 13, 13); }),
  lampOn: mat('#ffdc8c', '#fff', g => { g.strokeStyle = '#d8a050'; g.strokeRect(1.5, 1.5, 13, 13); }, { emissive: new T.Color(0x886622) }),
  glass: mat('#cbeaff', '#fff', g => { g.strokeStyle = '#f2fbff'; g.strokeRect(.5, .5, 15, 15); }, { transparent: true, opacity: .35, depthWrite: false }),
  body: mat('#767676', '#000'), wood: mat('#b08b52', '#000', g => { g.fillStyle = '#8c6c3a'; g.fillRect(0, 7, 16, 2); }),
  barrel: mat('#9b7140', '#000', g => { g.fillStyle='#6c4c2c';g.fillRect(0,2,16,2);g.fillRect(0,12,16,2);g.fillStyle='#c5a16c';g.fillRect(2,0,2,16);g.fillRect(12,0,2,16); }),
  barrelBand: new T.MeshLambertMaterial({color:0x60482f}), barrelFront: new T.MeshLambertMaterial({color:0x3e3027}),
  dropperSide: mat('#777b7e','#363a3d',g=>{g.strokeStyle='#92979a';g.strokeRect(1,1,14,14);}), dropperFront: mat('#777b7e','#363a3d',g=>{g.fillStyle='#202427';g.fillRect(3,3,10,10);g.strokeStyle='#c1c5c7';g.strokeRect(2.5,2.5,11,11);g.fillStyle='#4a5054';g.fillRect(6,6,4,4);}),
  noteBlock: mat('#79502e','#000',g=>{g.fillStyle='#a47748';g.fillRect(0,0,16,3);g.fillStyle='#55351f';g.fillRect(0,13,16,3);}),
  noteTop: mat('#39302a','#000',g=>{g.strokeStyle='#bd9164';g.strokeRect(2,2,12,12);g.fillStyle='#d2aa72';g.fillRect(6,5,4,6);}),
  slime: mat('#6fbf4a', '#000'), honey: mat('#d8a63d', '#78521f', g => { g.fillStyle='#f2c35e';g.fillRect(2,2,12,2);g.fillStyle='#a87324';g.fillRect(1,11,14,3); }),
  glazed: mat('#537c82', '#a73e2b', g => { g.fillStyle='#d65c35';g.fillRect(2,2,5,5);g.fillStyle='#e5c06b';g.fillRect(9,9,5,5); }), plate: mat('#c3c7cc', '#737981', g => { g.strokeStyle='#e0e3e7'; g.strokeRect(.5,.5,15,15); }),
  repeaterTop: mat('#b9bcb6','#747a73',g=>{
    g.fillStyle='#d0d1ca';g.fillRect(1,1,14,14);
    g.strokeStyle='#737972';g.lineWidth=1;g.strokeRect(1.5,1.5,13,13);
    
    
    g.fillStyle='#777d75';g.fillRect(2,6,12,4);
    g.fillStyle='#a6aaa1';g.fillRect(3,7,10,2);
    g.fillStyle='#7f2820';g.fillRect(2,5,2,6);g.fillRect(12,5,2,6);
    g.fillStyle='#c84a32';g.fillRect(3,6,1,4);g.fillRect(12,6,1,4);
    g.fillStyle='#e4e3da';g.fillRect(5,5,1,1);g.fillRect(10,10,1,1);
  }),
  obsSide: mat('#707070', '#000'), obsFront: mat('#666', '#000', g => { g.fillStyle = '#1d1d1d'; g.fillRect(3, 5, 10, 5); g.fillStyle = '#999'; g.fillRect(5, 6, 2, 2); g.fillRect(9, 6, 2, 2); }),
  obsBack: mat('#666', '#000', g => { g.fillStyle = '#4a1010'; g.fillRect(6, 6, 4, 4); }),
  obsBackOn: mat('#666', '#000', g => { g.fillStyle = '#ff3a2a'; g.fillRect(6, 6, 4, 4); }, { emissive: new T.Color(0x551100) }),
  daylightSide: mat('#463a26','#21190f',g=>{
    g.fillStyle='#382c1c';g.fillRect(0,0,16,16);
    g.fillStyle='#59462c';g.fillRect(1,1,14,14);
    g.fillStyle='#302315';g.fillRect(0,0,16,2);g.fillRect(0,14,16,2);
    g.fillStyle='#705a38';g.fillRect(2,3,1,10);g.fillRect(7,3,1,10);g.fillRect(12,3,1,10);
    g.fillStyle='#2a2014';g.fillRect(4,2,1,12);g.fillRect(9,2,1,12);
    g.fillStyle='#44331f';g.fillRect(1,6,14,1);
  }),
  daylightTop: mat('#3c3322','#211a10',g=>{
    g.fillStyle='#2a2116';g.fillRect(0,0,16,16);
    g.fillStyle='#5b482c';g.fillRect(1,1,14,14);
    const cells=[[2,2,'#ded4b5'],[7,2,'#d2c7a6'],[12,2,'#e7dcc0'],[2,7,'#cfc3a0'],[7,7,'#e2d7ba'],[12,7,'#d6c8a5'],[2,12,'#e2d7ba'],[7,12,'#d3c5a1'],[12,12,'#e7dcc0']];
    for(const [x,y,c] of cells){g.fillStyle='#302417';g.fillRect(x-1,y-1,5,5);g.fillStyle=c;g.fillRect(x,y,3,3);g.fillStyle='#f3e9d0';g.fillRect(x,y,2,1);g.fillStyle='#9c8b68';g.fillRect(x,y+2,3,1);}
    g.fillStyle='#2a2116';g.fillRect(0,0,16,1);g.fillRect(0,15,16,1);g.fillRect(0,0,1,16);g.fillRect(15,0,1,16);
  }),
  daylightTopInverted: mat('#302d35','#171721',g=>{
    g.fillStyle='#25232d';g.fillRect(0,0,16,16);
    g.fillStyle='#514b50';g.fillRect(1,1,14,14);
    const cells=[[2,2,'#a9c0d2'],[7,2,'#8daec7'],[12,2,'#b5cce0'],[2,7,'#8ba7c0'],[7,7,'#b8d0e0'],[12,7,'#94b5ce'],[2,12,'#afc8da'],[7,12,'#90aec5'],[12,12,'#b5cfe2']];
    for(const [x,y,c] of cells){g.fillStyle='#18202c';g.fillRect(x-1,y-1,5,5);g.fillStyle=c;g.fillRect(x,y,3,3);g.fillStyle='#d7e7f2';g.fillRect(x,y,2,1);g.fillStyle='#607991';g.fillRect(x,y+2,3,1);}
    g.fillStyle='#171721';g.fillRect(0,0,16,1);g.fillRect(0,15,16,1);g.fillRect(0,0,1,16);g.fillRect(15,0,1,16);
  }),
  stick: new T.MeshLambertMaterial({ color: 0x7a5b2e }),
  torchOn: new T.MeshBasicMaterial({ color: 0xff3a14 }), torchOff: new T.MeshLambertMaterial({ color: 0x4a1a14 }),
  lockBar: new T.MeshBasicMaterial({ color: 0x111316 }),
  pistonHeadFace: mat('#b68a4f','#664426',g=>{
    g.fillStyle='#64442a';g.fillRect(0,0,16,2);g.fillRect(0,14,16,2);g.fillRect(0,0,2,16);g.fillRect(14,0,2,16);
    g.fillStyle='#d0a263';g.fillRect(3,3,10,10);g.fillStyle='#ab7c43';g.fillRect(4,4,8,2);g.fillRect(4,9,8,2);
    g.fillStyle='#e1b878';g.fillRect(3,3,10,1);g.fillRect(3,3,1,10);
  }),
  stickyPistonHeadFace: mat('#6fbf4a','#244f1c',g=>{
    g.fillStyle='#244f1c';g.fillRect(0,0,16,2);g.fillRect(0,14,16,2);g.fillRect(0,0,2,16);g.fillRect(14,0,2,16);
    g.fillStyle='#8bd65e';g.fillRect(3,3,10,10);g.fillStyle='#4d9b35';g.fillRect(5,5,6,6);
    g.fillStyle='#b7f08a';g.fillRect(4,4,4,2);
  }),
  repeaterArrowOutline: new T.MeshBasicMaterial({ color: 0x737972, side: T.DoubleSide }),
  repeaterArrow: new T.MeshBasicMaterial({ color: 0xc3c7cc, side: T.DoubleSide }),
  lever: new T.MeshLambertMaterial({ color: 0xa07a40 }),
  woodButton: mat('#9b7043','#4b321e',g=>{g.fillStyle='#6e4a2b';g.fillRect(2,3,12,2);g.fillRect(2,11,12,2);}),
  stonePlate: mat('#85898e','#565b61',g=>{g.strokeStyle='#c3c7cc';g.strokeRect(1,1,14,14);}),
  woodPlate: mat('#987047','#4c321d',g=>{g.fillStyle='#5d3d24';g.fillRect(0,4,16,2);g.fillRect(0,10,16,2);}),
  goldPlate: mat('#d6ad32','#765a10',g=>{g.strokeStyle='#f6d45e';g.strokeRect(1,1,14,14);}),
  ironPlate: mat('#a9afb5','#59616a',g=>{g.strokeStyle='#dce0e4';g.strokeRect(1,1,14,14);}),
  armorStand: new T.MeshLambertMaterial({color:0x9b9589}), armorStandDark: new T.MeshLambertMaterial({color:0x625e56}),
  noteLabelFrame: new T.MeshBasicMaterial({color:0x35271e}),
  sand: mat('#dbd3a0','#b8ae7a'), dirt: mat('#795536','#4d3422'), grass_block: mat('#4f8539','#795536',g=>{g.fillStyle='#4f8539';g.fillRect(0,0,16,4);}), coarse_dirt: mat('#795536','#4d3422'), rooted_dirt: mat('#795536','#4d3422'), podzol: mat('#59402a','#38281c'), mycelium: mat('#74615e','#4b3941'), mud: mat('#554138','#352821'), moss_block: mat('#557c35','#385426'), leaves: mat('#55783b','#304b25'), snow_block: mat('#e9f2f8','#aebdc9'), farmland: mat('#6b4b2f','#453020'), dirt_path: mat('#9a8057','#604b32'), gravel: mat('#777b7b','#45494a'), clay: mat('#a1a8af','#79818b'),
  packed_ice: mat('#91c9ed','#e1f6ff'), gold_block: mat('#e7bd38','#947318'), bone_block: mat('#e5dfc8','#b6ad92'),
  emerald_block: mat('#20b66b','#08723e'), hay_block: mat('#d5b23f','#90731f'), pumpkin: mat('#d77b22','#82410f'),
  glowstone: mat('#d8b574','#9f7b3e'), soul_sand: mat('#55433b','#332620'), netherrack: mat('#6d3532','#361c20'),
  magma_block: mat('#52302c','#e36b28'), sea_lantern: mat('#a8d6c8','#e8fff1'), beacon: mat('#5dc5b7','#23796e'),
  cobblestone: mat('#777c80','#52575b'), stone_bricks: mat('#898d8d','#5b6060'), quartz_block: mat('#e5dfd2','#b5afa3'),
  planks: mat('#a97a46','#704a27'), blackstone: mat('#37363f','#1d1d27'), deepslate: mat('#4d5359','#343a41'),
};
/* ---- Bedrock block textures ----------------------------------------------
   PNGs use the Bedrock resource-pack names (resource_pack/textures/blocks/*.png).
   They come from window.BLOCK_TEXTURE_DATA (js/blockTextures.js, built by
   tools/pack-textures.py) or, when the page is served over http, straight from
   texture/blocks/. The procedural textures above stay in place until a PNG
   loads, and stay for good when a PNG is missing, so nothing ever goes blank.
   Redstone wire is deliberately not in this list. */
const bedrockCache = new Map();
function loadBedrock(name) {
  if (bedrockCache.has(name)) return bedrockCache.get(name);
  const embedded = window.BLOCK_TEXTURE_DATA || {};
  const p = new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        // Animated Bedrock textures are tall strips; the top square is frame one.
        const frame = Math.min(img.naturalWidth, img.naturalHeight);
        const size = frame > 64 ? 16 : frame;
        const c = document.createElement('canvas'); c.width = c.height = size;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
        g.drawImage(img, 0, 0, frame, frame, 0, 0, size, size);
        g.getImageData(0, 0, 1, 1); // throws on a tainted canvas (file:// without the packed bundle)
        const t = new T.CanvasTexture(c);
        t.magFilter = t.minFilter = T.NearestFilter; t.generateMipmaps = false;
        resolve(t);
      } catch (_) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = embedded[name] || ('texture/blocks/' + name + '.png');
  });
  bedrockCache.set(name, p);
  return p;
}
function applyBedrock(material, names, tint) {
  const list = [].concat(names);
  (function next(i) {
    if (i >= list.length) return;
    loadBedrock(list[i]).then(t => {
      if (!t) return next(i + 1);
      material.map = t; if (tint) material.color.set(tint); material.needsUpdate = true;
    });
  })(0);
}
const BEDROCK_MAP = {
  stone:['stone'], ironBlock:['iron_block'], obsidian:['obsidian'], target:['target_top','target_side'], rsblock:['redstone_block'],
  lampOff:['redstone_lamp_off'], lampOn:['redstone_lamp_on'], glass:['glass'], wood:['planks_oak'], barrel:['barrel_side'],
  dropperSide:['furnace_side'], dropperFront:['dropper_front_horizontal'],
  noteBlock:['noteblock'], noteTop:['noteblock'], slime:['slime'], honey:['honey_side','honey_top'],
  plate:['iron_block'], stonePlate:['stone'], woodPlate:['planks_oak'], goldPlate:['gold_block'], ironPlate:['iron_block'], woodButton:['planks_oak'],
  obsSide:['observer_side'], obsFront:['observer_front'], obsBack:['observer_back'], obsBackOn:['observer_back_lit'],
  daylightSide:['daylight_detector_side'], daylightTop:['daylight_detector_top'], daylightTopInverted:['daylight_detector_inverted_top'],
  pistonHeadFace:['piston_top_normal'], stickyPistonHeadFace:['piston_top_sticky'],
  dirt:['dirt'], grass_block:['grass_side_carried'], coarse_dirt:['coarse_dirt'], rooted_dirt:['dirt_with_roots','dirt'], podzol:['dirt_podzol_side'], mycelium:['mycelium_side'],
  mud:['mud'], moss_block:['moss_block'], snow_block:['snow'], farmland:['farmland_dry'], dirt_path:['grass_path_side'],
  gravel:['gravel'], clay:['clay'], sand:['sand'], packed_ice:['ice_packed'], gold_block:['gold_block'], bone_block:['bone_block_side'],
  emerald_block:['emerald_block'], hay_block:['hay_block_side'], pumpkin:['pumpkin_side'], glowstone:['glowstone'], soul_sand:['soul_sand'],
  netherrack:['netherrack'], magma_block:['magma'], sea_lantern:['sea_lantern'], beacon:['beacon'], cobblestone:['cobblestone'],
  stone_bricks:['stonebrick'], quartz_block:['quartz_block_side'], planks:['planks_oak'], blackstone:['blackstone'], deepslate:['deepslate']
};
for (const key in BEDROCK_MAP) if (M[key]) applyBedrock(M[key], BEDROCK_MAP[key]);

const WOOL_HEX = {
  white:'#e9ecec',orange:'#f07613',magenta:'#bd44b3',light_blue:'#3aaedd',yellow:'#f8c627',lime:'#70b919',pink:'#ed8dac',gray:'#41484e',light_gray:'#9aa0a5',cyan:'#169c9b',purple:'#8932b8',blue:'#35399d',brown:'#72452a',green:'#546d1b',red:'#b02e26',black:'#191b1f'
};
const woolMaterials={};
function ordinaryBlockMaterial(type,state){
  if(type==='wool'){
    const color=String(state&&state.color||'white').toLowerCase();
    if(!woolMaterials[color]){const base=WOOL_HEX[color]||WOOL_HEX.white;const tint=new T.Color(base);const shade='#'+tint.clone().multiplyScalar(.64).getHexString();woolMaterials[color]=mat(base,shade,g=>{g.fillStyle=base;g.fillRect(0,0,16,16);g.strokeStyle=shade;g.lineWidth=1;for(let y=2;y<16;y+=4){g.beginPath();g.moveTo(0,y);g.lineTo(16,y+1);g.stroke();}for(let x=3;x<16;x+=5){g.fillStyle=shade;g.fillRect(x,((x*3)%13),1,2);}});applyBedrock(woolMaterials[color],['wool_colored_white','concrete_white'],base);}
    return woolMaterials[color];
  }
  if(type.endsWith('_concrete_powder')||type.endsWith('_concrete')){
    const color=type.replace(/_concrete(?:_powder)?$/,'');const base=WOOL_HEX[color];if(base){const key='concrete_'+type;if(!woolMaterials[key]){const tint=new T.Color(base);woolMaterials[key]=mat(base,'#'+tint.clone().multiplyScalar(.72).getHexString(),g=>{g.fillStyle=base;g.fillRect(0,0,16,16);g.fillStyle='rgba(255,255,255,.18)';for(let y=2;y<16;y+=5)g.fillRect(0,y,16,1);});applyBedrock(woolMaterials[key],type.endsWith('_powder')?['concrete_powder_white','concrete_white']:['concrete_white'],base);}return woolMaterials[key];}
  }
  if(/_planks$|_log$|_wood$|_stem$|_hyphae$/.test(type)||type.startsWith('stripped_'))return M.planks;
  if(['red_sand','suspicious_sand'].includes(type))return M.sand;
  if(['suspicious_gravel'].includes(type))return M.gravel;
  if(['blue_ice','ice'].includes(type))return M.packed_ice;
  if(type==='glass_pane')return M.glass;
  return M[type]||M.stone;
}
const wireMats = {}, wireTopMats = {};
const wireColor = p => {
  const n=Math.max(0,Math.min(15,Number(p)||0));
  return `rgb(${Math.round(46 + 175*n/15)},${Math.round(24 + 12*n/15)},${Math.round(23 + 9*n/15)})`;
};
const wireMat = p => wireMats[p] || (wireMats[p] = new T.MeshBasicMaterial({ color: new T.Color().setRGB(.18 + .8 * p / 15, .02 + .03 * p / 15, .02) }));
function wireTopMat(power) {
  const p=Math.max(0,Math.min(15,Math.trunc(Number(power)||0)));
  if(wireTopMats[p])return wireTopMats[p];
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  g.imageSmoothingEnabled=false;g.fillStyle=wireColor(p);g.fillRect(0,0,64,64);
  
  g.fillStyle=p>0?'#ff7466':'#9b4b45';
  [[5,8,13,9],[44,10,14,8],[8,45,10,10],[46,45,10,10]].forEach(([x,y,w,h])=>g.fillRect(x,y,w,h));
  g.textAlign='center';g.textBaseline='middle';g.font='bold 40px system-ui, sans-serif';
  g.lineJoin='round';g.lineWidth=5;g.strokeStyle='#351719';g.strokeText(String(p),32,34,56);
  g.fillStyle='#fff7f0';g.fillText(String(p),32,34,56);
  const texture=new T.CanvasTexture(c);texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;
  wireTopMats[p]=new T.MeshBasicMaterial({map:texture});return wireTopMats[p];
}

const gc = {};
const geo = (w, h, d) => gc[w + ',' + h + ',' + d] || (gc[w + ',' + h + ',' + d] = new T.BoxGeometry(w, h, d));
const box = (w, h, d, m, x, y, z) => { const o = new T.Mesh(geo(w, h, d), m); o.position.set(x || 0, y || 0, z || 0); return o; };
const cube = m => new T.Mesh(geo(1, 1, 1), m);
const orient = (o, from, dir) => { o.quaternion.setFromUnitVectors(V(from), V(DIRV[dir])); return o; };
const grp = (...c) => { const g = new T.Group(); c.forEach(x => g.add(x)); return g; };
function repeaterArrowMesh(material, scale, y) {
  const shape = new T.Shape();
  shape.moveTo(-.16 * scale, -.16 * scale);
  shape.lineTo(.19 * scale, 0);
  shape.lineTo(-.16 * scale, .16 * scale);
  shape.closePath();
  const mesh = new T.Mesh(new T.ShapeGeometry(shape), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, y, 0);
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  return mesh;
}


const blockMesh = (type,state) => cube(ordinaryBlockMaterial(type,state));
const noteLabelMaterials=new Map();
const NOTE_NAMES=['F#3','G3','G#3','A3','A#3','B3','C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5','C#5','D5','D#5','E5','F5','F#5'];
function noteLabelMaterial(note){
  const n=Math.max(0,Math.min(24,Math.trunc(Number(note)||0)));if(noteLabelMaterials.has(n))return noteLabelMaterials.get(n);
  const c=document.createElement('canvas');c.width=128;c.height=32;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  g.fillStyle='#2b2119';g.fillRect(0,0,128,32);g.strokeStyle='#c3a174';g.lineWidth=3;g.strokeRect(1.5,1.5,125,29);
  g.fillStyle='#f4dfbb';g.textAlign='center';g.textBaseline='middle';g.font='bold 19px monospace';g.fillText(NOTE_NAMES[n],64,11,120);
  g.fillStyle='#c7ad87';g.font='bold 10px monospace';g.fillText('MC NOTE '+n,64,24,120);
  const tex=new T.CanvasTexture(c);tex.magFilter=tex.minFilter=T.NearestFilter;const m=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide});noteLabelMaterials.set(n,m);return m;
}
function addNoteSideLabels(g,note){
  const geo=new T.PlaneGeometry(.78,.195),material=noteLabelMaterial(note);
  const panels=[[0,.03,.507,0],[0,.03,-.507,Math.PI],[.507,.03,0,Math.PI/2],[-.507,.03,0,-Math.PI/2]];
  for(const [x,y,z,ry] of panels){const panel=new T.Mesh(geo,material);panel.position.set(x,y,z);panel.rotation.y=ry;panel.renderOrder=4;g.add(panel);}
}
const build = {
  stone: (s) => blockMesh('stone',s), wool: (s) => blockMesh('wool',s), obsidian: (s) => blockMesh('obsidian',s), glass: () => cube(M.glass), slime: () => cube(M.slime),
  redstone_block: () => cube(M.rsblock),
  daylight_detector: s => {
    const top=s.inverted?M.daylightTopInverted:M.daylightTop;
    const materials=[M.daylightSide,M.daylightSide,top,M.daylightSide,M.daylightSide,M.daylightSide];
    const height=6/16;
    // Keep the vertical offset on a child mesh: apply() positions the returned block root at the cell center.
    // The detector occupies the lower 6/16 of its cell and rests on the block below.
    const g=new T.Group();
    g.add(box(1,height,1,materials,0,-.5+height/2,0));
    return g;
  },
  dropper: s => orient(cube([M.dropperSide,M.dropperSide,M.dropperSide,M.dropperSide,M.dropperFront,M.dropperSide]), [0,0,1], s.facing),
  barrel: s => {
    const g=grp(cube(M.barrel),box(1.01,.07,1.01,M.barrelBand,0,-.27,0),box(1.01,.07,1.01,M.barrelBand,0,.27,0),box(.26,.24,.035,M.barrelFront,0,0,.505));
    const f=Math.max(0,Math.min(5,Math.trunc(Number(s.facing)||0)));
    if(f===0)g.rotation.y=Math.PI/2;
    else if(f===1)g.rotation.y=-Math.PI/2;
    else if(f===2)g.rotation.x=-Math.PI/2;
    else if(f===3)g.rotation.x=Math.PI/2;
    else if(f===5)g.rotation.y=Math.PI;
    return g;
  },
  noteblock: s => { const g=grp(cube(M.noteBlock),box(.6,.035,.6,s.powered ? M.torchOn : M.noteTop,0,.5,0)); const note=box(.07,.05,.22,M.stick,.12,.53,0); note.rotation.z=-.45; g.add(note); addNoteSideLabels(g,s.note||0); return g; },
  redstone_lamp: s => cube(s.lit ? M.lampOn : M.lampOff),
  observer: s => orient(cube([M.obsSide, M.obsSide, M.obsFront, s.powered ? M.obsBackOn : M.obsBack, M.obsSide, M.obsSide]), [0, 1, 0], s.facing),
  piston: (s, sticky) => {
    const face=Math.max(0,Math.min(5,Math.trunc(Number(s.facing)||0)));
    const sign=[1,-1,1,-1,1,-1][face]||1;
    const axis=face<2?'x':face<4?'y':'z';
    // Recess the stone/base body along the facing axis. The head plate starts at 0.40,
    // while the base ends at 0.38, eliminating coplanar overlap and visible z-fighting.
    const bodyMaterials=[M.body,M.body,M.body,M.stone,M.body,M.body];
    const base=axis==='x'?box(.88,1,1,bodyMaterials,-sign*.06,0,0):axis==='y'?box(1,.88,1,bodyMaterials,0,-sign*.06,0):box(1,1,.88,bodyMaterials,0,0,-sign*.06);
    const g=grp(base);
    const side=sticky?M.slime:M.wood,faceMat=sticky?M.stickyPistonHeadFace:M.pistonHeadFace;
    if(!s.extended){
      const materials=Array(6).fill(side);materials[face]=faceMat;
      const plate=axis==='x'?box(.10,1,1,materials,sign*.45,0,0):axis==='y'?box(1,.10,1,materials,0,sign*.45,0):box(1,1,.10,materials,0,0,sign*.45);
      g.add(plate);
    }else{
      const rod=axis==='x'?box(.54,.23,.23,M.stick,sign*.23,0,0):axis==='y'?box(.23,.54,.23,M.stick,0,sign*.23,0):box(.23,.23,.54,M.stick,0,0,sign*.23);
      g.add(rod);
      const frame=M.body, edge=.075, reach=.46, offset=sign*.48;
      if(axis==='x'){
        g.add(box(.035,edge,.92,frame,offset,reach,0),box(.035,edge,.92,frame,offset,-reach,0),box(.035,.77,edge,frame,offset,0,reach),box(.035,.77,edge,frame,offset,0,-reach));
      }else if(axis==='y'){
        g.add(box(edge,.035,.92,frame,reach,offset,0),box(edge,.035,.92,frame,-reach,offset,0),box(.77,.035,edge,frame,0,offset,reach),box(.77,.035,edge,frame,0,offset,-reach));
      }else{
        g.add(box(edge,.92,.035,frame,reach,0,offset),box(edge,.92,.035,frame,-reach,0,offset),box(.77,edge,.035,frame,0,reach,offset),box(.77,edge,.035,frame,0,-reach,offset));
      }
    }
    return g;
  },
  piston_head: s => {
    const g=new T.Group(),face=Math.max(0,Math.min(5,Math.trunc(Number(s.facing)||0))),axis=face<2?'x':face<4?'y':'z',sign=[1,-1,1,-1,1,-1][face]||1;
    const side=s.sticky?M.slime:M.wood,faceMat=s.sticky?M.stickyPistonHeadFace:M.pistonHeadFace;
    const materials=Array(6).fill(side);materials[face]=faceMat;
    // Extend the rod slightly into the head plate so there is no small visual gap.
    const rod=axis==='x'?box(.84,.22,.22,M.stick,-sign*.08,0,0):axis==='y'?box(.22,.84,.22,M.stick,0,-sign*.08,0):box(.22,.22,.84,M.stick,0,0,-sign*.08);
    const plate=axis==='x'?box(.18,1,1,materials,sign*.41,0,0):axis==='y'?box(1,.18,1,materials,0,sign*.41,0):box(1,1,.18,materials,0,0,sign*.41);
    g.add(rod,plate);return g;
  },
  redstone_wire: s => {
    const power=Math.max(0,Math.min(15,Math.trunc(Number(s.power)||0))), m = wireMat(power), g = grp(box(.3, .04, .3, [m,m,wireTopMat(power),m,m,m], 0, -.48, 0));
    const _links=Array.isArray(s.links)?s.links:[], _arms=_links.slice();
    if(_links.length===1) _arms.push([_links[0][0]^1,0]);   // one connection => dust lies as a straight line (vanilla)
    for (const [d, dy] of _arms) { const v = DIRV[d], x = !!v[0];
      g.add(box(x ? .35 : .3, .04, x ? .3 : .35, m, v[0] * .325, -.48, v[2] * .325));
      if (dy === 1) g.add(box(x ? .04 : .3, 1, x ? .3 : .04, m, v[0] * .48, 0, v[2] * .48));
      else if (dy === -1) g.add(box(x ? .04 : .3, 1, x ? .3 : .04, m, v[0] * .48, -.98, v[2] * .48)); }
    return g; },
  redstone_torch: s => {
    // The torch is built inside an outer wrapper group: the scene code later overwrites the position of the
    // returned object with the block centre, so the wall offset/tilt must live on an INNER group,
    // otherwise a wall torch ends up floating in the middle of the block.
    const d=Math.max(0,Math.min(5,Math.trunc(Number(s.attach)||0))),v=DIRV[d],on=s.lit;
    const outer=new T.Group(),t=new T.Group();
    // pivot = centre of the torch's foot; stick 0 -> .5 tall, flame on top (10/16 of a block in total, like vanilla)
    t.add(box(.125,.5,.125,M.stick,0,.25,0));
    t.add(box(.17,.17,.17,on?M.torchOn:M.torchOff,0,.54,0));
    const TILT=Math.PI/8, WALL=.44, FOOT=-.28;           // 22.5deg lean, foot sits flush against the wall
    if(d===0||d===1){ t.position.set(v[0]*WALL,FOOT,0); t.rotation.z=v[0]*TILT; }
    else if(d===4||d===5){ t.position.set(0,FOOT,v[2]*WALL); t.rotation.x=-v[2]*TILT; }
    else if(d===2){ t.position.set(0,.5,0); t.rotation.z=Math.PI; }
    else { t.position.set(0,-.5,0); }
    outer.add(t); return outer;
  },
  lever: s => {
    const d=Math.max(0,Math.min(5,Math.trunc(Number(s.attach)||0))),g=new T.Group();
    const makeStick=(x,y,z,rx,rz)=>{const stick=new T.Group();stick.position.set(x,y,z);stick.rotation.x=rx;stick.rotation.z=rz;stick.add(box(.105,.38,.105,M.lever,0,.02,0));stick.add(box(.13,.10,.13,M.stone,0,.18,0));g.add(stick);};
    if(d===3){
      g.add(box(.45,.10,.34,M.stone,0,-.445,0));makeStick(0,-.20,0,0,s.powered ? 0.55 : -0.45);
    }else if(d===2){
      g.add(box(.45,.10,.34,M.stone,0,.445,0));makeStick(0,.20,0,0,s.powered ? -0.55 : 0.45);
    }else{
      const v=DIRV[d],plate=d===0||d===1?box(.09,.40,.36,M.stone,v[0]*.455,0,0):box(.36,.40,.09,M.stone,0,0,v[2]*.455);
      g.add(plate);
      const start=new T.Vector3(v[0]*.43,0,v[2]*.43);
      const tip=new T.Vector3(v[0]*.20,s.powered?-.22:.22,v[2]*.20);
      const delta=tip.clone().sub(start),length=delta.length(),mid=start.clone().add(tip).multiplyScalar(.5);
      const stem=box(.105,length,.105,M.lever,mid.x,mid.y,mid.z);
      stem.quaternion.setFromUnitVectors(V([0,1,0]),delta.clone().normalize());
      const knob=box(.14,.12,.14,M.stone,tip.x,tip.y,tip.z);
      g.add(stem,knob);
    }
    return g;
  },
  stone_button: s => orient(grp(box(.4, s.powered ? .06 : .12, .3, M.stone, 0, s.powered ? -.47 : -.44, 0)), [0, -1, 0], s.attach),
  wooden_button: s => orient(grp(box(.4, s.powered ? .06 : .12, .3, M.woodButton, 0, s.powered ? -.47 : -.44, 0)), [0, -1, 0], s.attach),
  repeater: (s, _, comp) => {
    const out = comp ? s.out > 0 : s.powered, g = new T.Group();
    g.add(box(1, .125, 1, [M.plate,M.plate,M.repeaterTop,M.plate,M.plate,M.plate], 0, -.4375, 0));
    if (!comp) {
      g.add(repeaterArrowMesh(M.repeaterArrowOutline, 1.18, -.360));
      g.add(repeaterArrowMesh(M.repeaterArrow, .84, -.357));
    }
    if (!comp && s.locked) {
      
      
      g.add(box(.105,.045,.66,M.lockBar,0,-.31,0));
    }
    const tor = (x, z, on) => grp(
      box(.095,.22,.095,M.stick,x,-.25,z),
      box(.16,.13,.16,on?M.torchOn:M.torchOff,x,-.12,z)
    );
    if (comp) { g.add(tor(.3, 0, s.subtract ? true : out), tor(-.3, .28, false), tor(-.3, -.28, false)); }
    else { g.add(tor(.3, 0, out), tor(-.3 + (s.delay - 1) * .17, 0, out)); }
    g.rotation.y = [0, Math.PI, 0, 0, -Math.PI / 2, Math.PI / 2][s.facing] || 0; return g; },
};
for (const name of ['oak_button','spruce_button','birch_button','jungle_button','acacia_button','dark_oak_button','mangrove_button','cherry_button','bamboo_button','crimson_button','warped_button','pale_oak_button']) build[name]=s=>build.wooden_button(s);
build.polished_blackstone_button=s=>build.stone_button(s);
function plateMesh(s,material){return box(.86,s.pressed?.045:.065,.86,material,0,s.pressed?-.472:-.455,0);}
build.stone_pressure_plate=s=>grp(plateMesh(s,M.stonePlate));
build.wooden_pressure_plate=s=>grp(plateMesh(s,M.woodPlate));
for (const name of ['oak_pressure_plate','spruce_pressure_plate','birch_pressure_plate','jungle_pressure_plate','acacia_pressure_plate','dark_oak_pressure_plate','mangrove_pressure_plate','cherry_pressure_plate','bamboo_pressure_plate','crimson_pressure_plate','warped_pressure_plate','pale_oak_pressure_plate']) build[name]=s=>build.wooden_pressure_plate(s);
build.light_weighted_pressure_plate=s=>grp(plateMesh(s,M.goldPlate));
build.heavy_weighted_pressure_plate=s=>grp(plateMesh(s,M.ironPlate));
build.polished_blackstone_pressure_plate=s=>grp(plateMesh(s,M.stonePlate));
build.sticky_piston = s => build.piston(s, true);
build.comparator = s => build.repeater(s, 0, true);

const NOTE_WOOD_BLOCKS=['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','bamboo','crimson','warped','pale_oak'].flatMap(w=>w==='bamboo'?['bamboo_planks','bamboo_block','stripped_bamboo_block']:(w==='crimson'||w==='warped')?[w+'_planks',w+'_stem',w+'_hyphae','stripped_'+w+'_stem','stripped_'+w+'_hyphae']:[w+'_planks',w+'_log',w+'_wood','stripped_'+w+'_log','stripped_'+w+'_wood']);
const NOTE_SUPPORT_CUBES = new Set([...NOTE_WOOD_BLOCKS,'bookshelf','chiseled_bookshelf','crafting_table','chest','trapped_chest','barrel','loom','cartography_table','fletching_table','smithing_table','lectern','jukebox','dirt','coarse_dirt','rooted_dirt','grass_block','podzol','mycelium','mud','moss_block','leaves','oak_leaves','spruce_leaves','birch_leaves','jungle_leaves','acacia_leaves','dark_oak_leaves','mangrove_leaves','cherry_leaves','pale_oak_leaves','snow_block','farmland','dirt_path','sand','red_sand','gravel','suspicious_sand','suspicious_gravel','glass_pane','sea_lantern','beacon','gold_block','packed_ice','blue_ice','clay','bone_block','soul_sand','pumpkin','carved_pumpkin','jack_o_lantern','emerald_block','hay_block','glowstone','netherrack','magma_block','mossy_cobblestone','stone_bricks','mossy_stone_bricks','cracked_stone_bricks','chiseled_stone_bricks','granite','diorite','andesite','deepslate','cobbled_deepslate','polished_deepslate','blackstone','polished_blackstone','basalt','smooth_basalt','tuff','calcite','bricks','brick_block','sandstone','red_sandstone','nether_brick','red_nether_brick','quartz_block','smooth_quartz','heavy_core',...['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'].flatMap(c=>[c+'_concrete',c+'_concrete_powder'])]);
for(const name of NOTE_SUPPORT_CUBES)build[name]=s=>blockMesh(name,s);

let renderer, scene, camera, root, view, onClick = () => {}, onFacingChange = () => {}, onAudioListenerUpdate = () => {}, lastFacing = '';
const meshes = new Map(), anims = [], instanceBuckets = new Map(), entityMeshes = new Map();
const instanceObject = new T.Object3D();
const simpleMaterials = {
  stone:M.stone, iron_block:M.ironBlock, obsidian:M.obsidian, glass:M.glass, slime:M.slime,
  redstone_block:M.rsblock, honey_block:M.honey, glazed_terracotta:M.glazed, target:M.target
};
function instanceStyle(type,state) {
  if(type==='wool')return {key:'wool_'+String(state&&state.color||'white'),material:ordinaryBlockMaterial(type,state)};
  if (Object.prototype.hasOwnProperty.call(simpleMaterials,type)) return {key:type,material:simpleMaterials[type]};
  if (type==='redstone_lamp') return {key:'redstone_lamp_'+(state&&state.lit?'on':'off'),material:state&&state.lit?M.lampOn:M.lampOff};
  if (NOTE_SUPPORT_CUBES.has(type) || ['sand','gravel','clay','packed_ice','gold_block','bone_block','emerald_block','hay_block','pumpkin','glowstone','soul_sand','netherrack','magma_block','sea_lantern','beacon','cobblestone','stone_bricks','quartz_block','blackstone','deepslate'].includes(type)) return {key:'note-support-'+type,material:ordinaryBlockMaterial(type,state)};
  if (!build[type]) return {key:'fallback-stone',material:M.stone};
  return null;
}
function instanceMatrix(bucket,index,x,y,z,scale=1) {
  instanceObject.position.set(x,y,z);instanceObject.rotation.set(0,0,0);instanceObject.scale.setScalar(scale);instanceObject.updateMatrix();
  bucket.mesh.setMatrixAt(index,instanceObject.matrix);
}
function growInstanceBucket(bucket) {
  const previous=bucket.mesh,capacity=bucket.capacity*2;
  const mesh=new T.InstancedMesh(geo(1,1,1),bucket.material,capacity);
  mesh.count=bucket.nextIndex;mesh.userData.instanceBucket=bucket.key;mesh.userData.blockData=bucket.infos;
  for(let i=0;i<bucket.nextIndex;i++)previous.getMatrixAt(i,instanceObject.matrix),mesh.setMatrixAt(i,instanceObject.matrix);
  root.remove(previous);root.add(mesh);bucket.mesh=mesh;bucket.capacity=capacity;
}
function getInstanceBucket(style) {
  let bucket=instanceBuckets.get(style.key);if(bucket)return bucket;
  const capacity=16,mesh=new T.InstancedMesh(geo(1,1,1),style.material,capacity);
  bucket={key:style.key,material:style.material,mesh,capacity,nextIndex:0,free:[],infos:[]};
  mesh.count=0;mesh.userData.instanceBucket=style.key;mesh.userData.blockData=bucket.infos;
  instanceBuckets.set(style.key,bucket);root.add(mesh);return bucket;
}
function addInstance(k,pos,type,state,style,sourceCommand) {
  const bucket=getInstanceBucket(style);let index;
  if(bucket.free.length)index=bucket.free.pop();
  else {if(bucket.nextIndex>=bucket.capacity)growInstanceBucket(bucket);index=bucket.nextIndex++;}
  if(index>=bucket.mesh.count)bucket.mesh.count=index+1;
  const data={pos:pos.slice(),type,state:state||{},sourceCommand:String(sourceCommand||'')};bucket.infos[index]=data;
  instanceMatrix(bucket,index,pos[0],pos[1],pos[2]);
  const record={instance:true,bucket:bucket.key,index,data};meshes.set(k,record);return record;
}
function makeArmorStand(entity){
  const g=new T.Group();
  g.add(box(.34,.035,.34,M.armorStandDark,0,.02,0));
  g.add(box(.055,.78,.055,M.armorStandDark,0,.40,0));
  g.add(box(.22,.06,.22,M.armorStand,0,.20,0));
  g.add(box(.29,.26,.19,M.armorStand,0,.76,0));
  g.add(box(.24,.24,.24,M.armorStand,0,1.04,0));
  const la=box(.075,.39,.075,M.armorStand,-.22,.73,0);la.rotation.z=-.20;g.add(la);
  const ra=box(.075,.39,.075,M.armorStand,.22,.73,0);ra.rotation.z=.20;g.add(ra);
  const ll=box(.09,.40,.09,M.armorStand,-.09,.28,0);ll.rotation.z=-.05;g.add(ll);
  const rl=box(.09,.40,.09,M.armorStand,.09,.28,0);rl.rotation.z=.05;g.add(rl);
  g.position.set(Number(entity.pos[0])||0,(Number(entity.pos[1])||0)-.5,Number(entity.pos[2])||0);g.userData.targetPosition=g.position.clone();g.userData.previousPosition=g.position.clone();g.userData.entityUpdateTime=performance.now();g.userData.entityId=entity.id;return g;
}
function setEntities(entities){
  const list=Array.isArray(entities)?entities:[],wanted=new Set(list.map(e=>String(e.id)));
  for(const [id,obj] of entityMeshes)if(!wanted.has(id)){root.remove(obj);entityMeshes.delete(id);}
  for(const e of list){if(String(e.type)!=='armor_stand'||!Array.isArray(e.pos))continue;const id=String(e.id);let obj=entityMeshes.get(id);if(!obj){obj=makeArmorStand(e);entityMeshes.set(id,obj);root.add(obj);}else{obj.userData.previousPosition.copy(obj.position);obj.userData.targetPosition.set(Number(e.pos[0])||0,(Number(e.pos[1])||0)-.5,Number(e.pos[2])||0);obj.userData.entityUpdateTime=performance.now();}}
}
function removeRendered(k) {
  const record=meshes.get(k);if(!record)return;
  for(let i=anims.length-1;i>=0;i--){const a=anims[i];if(record.instance ? a.instance&&a.bucket===record.bucket&&a.index===record.index : !a.instance&&a.o===record.object)anims.splice(i,1);}
  if(record.instance){const bucket=instanceBuckets.get(record.bucket);if(bucket){instanceMatrix(bucket,record.index,0,0,0,0);bucket.infos[record.index]=null;bucket.free.push(record.index);}}
  else root.remove(record.object);
  meshes.delete(k);
}
const homeTarget = new T.Vector3(.5, 1.5, 1);
const target = homeTarget.clone(), cam = { th: .75, ph: 1.0, r: 12 };
const goal = { th: .75, ph: 1.0, r: 12 }, goalT = homeTarget.clone();
function placeCamera() {
  camera.position.set(target.x + cam.r * Math.sin(cam.ph) * Math.sin(cam.th), target.y + cam.r * Math.cos(cam.ph), target.z + cam.r * Math.sin(cam.ph) * Math.cos(cam.th));
  camera.lookAt(target); }
function getFacing() {
  if (!camera) return 'North';
  camera.updateMatrixWorld(true);
  const d=camera.getWorldDirection(new T.Vector3());
  if (Math.abs(d.x) > Math.abs(d.z)) return d.x >= 0 ? 'East' : 'West';
  return d.z >= 0 ? 'South' : 'North';
}
function panBy(dx,dy) {
  
  
  camera.updateMatrixWorld(true);
  const k=goal.r*.00165;
  const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0).normalize();
  const up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1).normalize();
  goalT.addScaledVector(right,-dx*k).addScaledVector(up,dy*k);
}
function init(el) {
  view = el; renderer = new T.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setClearColor(0x161617); el.appendChild(renderer.domElement);
  scene = new T.Scene(); root = new T.Group(); scene.add(root);
  camera = new T.PerspectiveCamera(55, 1, .1, 1000);
  scene.add(new T.AmbientLight(0xffffff, .65)); const sun = new T.DirectionalLight(0xffffff, .75); sun.position.set(.4, 1, .6); scene.add(sun);
  scene.add(new T.GridHelper(64, 64, 0x3d3e40, 0x262627).translateY(-.5));
  const anchor = new T.Group();
  [[0xff4d3a, [1, 0, 0]], [0x4dff7a, [0, 1, 0]], [0x4d8aff, [0, 0, 1]]].forEach(([c, d]) => {
    const g = new T.BufferGeometry().setFromPoints([new T.Vector3(0, -.5, 0), new T.Vector3(d[0] * 1.5, -.5 + d[1] * 1.5, d[2] * 1.5)]);
    anchor.add(new T.Line(g, new T.LineBasicMaterial({ color: c }))); });
  anchor.add(new T.Mesh(geo(1.04, 1.04, 1.04), new T.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: .25 })));
  scene.add(anchor);
  const resize = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(el); resize(); placeCamera();

  const cv=renderer.domElement, pointers=new Map();
  let primary=null, dragDistance=0, usedMultiPointer=false, pinch=null, longPressTimer=null, longPressTriggered=false;
  const cancelLongPress=()=>{if(longPressTimer!==null){clearTimeout(longPressTimer);longPressTimer=null;}};
  const distAndCenter=()=>{
    const a=Array.from(pointers.values()); if(a.length<2)return null;
    const p=a[0],q=a[1],dx=q.x-p.x,dy=q.y-p.y;
    return {distance:Math.max(1,Math.hypot(dx,dy)),cx:(p.x+q.x)/2,cy:(p.y+q.y)/2};
  };
  const beginPointer=(e)=>{
    cv.setPointerCapture(e.pointerId);
    if(pointers.size===0){
      primary={id:e.pointerId,button:e.button,shift:!!e.shiftKey,lastX:e.clientX,lastY:e.clientY};dragDistance=0;usedMultiPointer=false;longPressTriggered=false;
      if(e.pointerType==='touch'||e.pointerType==='pen'){
        const id=e.pointerId;
        longPressTimer=setTimeout(()=>{
          if(primary&&primary.id===id&&pointers.has(id)&&dragDistance<5){
            longPressTriggered=true;
            const p=pointers.get(id);
            pick({clientX:p.x,clientY:p.y,button:2,isLongPress:true});
          }
          longPressTimer=null;
        },560);
      }
    }
    else {usedMultiPointer=true;cancelLongPress();}
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    pinch=distAndCenter();
  };
  const movePointer=(e)=>{
    const point=pointers.get(e.pointerId); if(!point)return;
    const dx=e.clientX-point.x,dy=e.clientY-point.y; point.x=e.clientX;point.y=e.clientY;
    if(pointers.size>=2){
      const cur=distAndCenter();
      if(cur&&pinch){
        goal.r=Math.max(2,Math.min(150,goal.r*(pinch.distance/cur.distance)));
        panBy(cur.cx-pinch.cx,cur.cy-pinch.cy);
        dragDistance+=Math.abs(cur.cx-pinch.cx)+Math.abs(cur.cy-pinch.cy)+Math.abs(cur.distance-pinch.distance);
      }
      pinch=cur; return;
    }
    if(!primary||primary.id!==e.pointerId)return;
    dragDistance+=Math.abs(dx)+Math.abs(dy);
    if(dragDistance>=5)cancelLongPress();
    if(primary.button===0&&!primary.shift){goal.th-=dx*.0065;goal.ph=Math.max(.05,Math.min(3.09,goal.ph-dy*.0065));}
    else panBy(dx,dy);
    primary.lastX=e.clientX;primary.lastY=e.clientY;
  };
  const endPointer=(e,allowClick)=>{
    cancelLongPress();
    const canClick=allowClick&&pointers.size===1&&primary&&primary.id===e.pointerId&&dragDistance<5&&!usedMultiPointer&&!longPressTriggered&&(primary.button===0||primary.button===2);
    pointers.delete(e.pointerId); pinch=distAndCenter();
    if(canClick)pick(e);
    if(pointers.size===0){primary=null;dragDistance=0;usedMultiPointer=false;pinch=null;longPressTriggered=false;}
    else if(pointers.size===1){const only=Array.from(pointers.entries())[0];primary={id:only[0],button:0,shift:false,lastX:only[1].x,lastY:only[1].y};}
  };
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('pointerdown',beginPointer);
  cv.addEventListener('pointermove',movePointer);
  cv.addEventListener('pointerup',e=>endPointer(e,true));
  cv.addEventListener('pointercancel',e=>endPointer(e,false));
  cv.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))endPointer(e,false);});
  cv.addEventListener('wheel',e=>{e.preventDefault();goal.r=Math.max(2,Math.min(150,goal.r*Math.exp(Math.max(-120,Math.min(120,e.deltaY))*.0012)));},{passive:false});
  let prev=performance.now(),frame=0;
  const loop=now=>{requestAnimationFrame(loop);frame++;
    const dt=Math.max(0,Math.min(.05,(now-prev)/1000)),k=1-Math.exp(-dt*12);prev=now;
    cam.th+=(goal.th-cam.th)*k;cam.ph+=(goal.ph-cam.ph)*k;cam.r+=(goal.r-cam.r)*k;target.lerp(goalT,k);placeCamera();onAudioListenerUpdate();
    for(const entity of entityMeshes.values())if(entity.userData.targetPosition&&entity.userData.previousPosition){const alpha=Math.max(0,Math.min(1,(now-(entity.userData.entityUpdateTime||now))/Math.max(10,entityInterpolationMs)));entity.position.lerpVectors(entity.userData.previousPosition,entity.userData.targetPosition,alpha);}
    const facing=getFacing();if(facing!==lastFacing){lastFacing=facing;onFacingChange(facing);}
    for(let i=anims.length-1;i>=0;i--){const a=anims[i],u=Math.min(1,(now-a.t0)/180),x=a.from.x+(a.to.x-a.from.x)*u,y=a.from.y+(a.to.y-a.from.y)*u,z=a.from.z+(a.to.z-a.from.z)*u;
      if(a.instance){const bucket=instanceBuckets.get(a.bucket);if(bucket){instanceMatrix(bucket,a.index,x,y,z);bucket.mesh.instanceMatrix.needsUpdate=true;}}
      else a.o.position.set(x,y,z);
      if(u>=1)anims.splice(i,1);}
    const count=meshes.size,skip=count>40000?7:count>20000?4:count>9000?2:count>4500?1:0;
    if(frame%(skip+1)===0)renderer.render(scene,camera);};
  requestAnimationFrame(loop);
}
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect(), ray = new T.Raycaster();
  ray.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.intersectObjects(root.children, true)[0]; if (!hit) return;
  if(hit.object.isInstancedMesh&&Number.isInteger(hit.instanceId)){
    const data=hit.object.userData.blockData&&hit.object.userData.blockData[hit.instanceId];
    if(data)onClick(data.pos.slice(),{pos:data.pos.slice(),type:data.type,state:data.state||{},sourceCommand:data.sourceCommand||''},e);
    return;
  }
  let o = hit.object; while (o && !o.userData.pos) o = o.parent; if (o) onClick(o.userData.pos, o.userData, e);
}
const keyOf = (x, y, z) => x + ',' + y + ',' + z;
function apply(changes, moves) {
  const dirtyBuckets=new Set();
  for (const [x, y, z, type, st, sourceCommand] of changes) {
    const k=keyOf(x,y,z),previous=meshes.get(k);
    if(previous&&previous.instance)dirtyBuckets.add(previous.bucket);
    removeRendered(k);
    if(type==='air')continue;
    const pos=[x,y,z],state=st||{},style=instanceStyle(type,state);
    if(style){const record=addInstance(k,pos,type,state,style,sourceCommand);dirtyBuckets.add(record.bucket);continue;}
    const o=build[type]?build[type](state):cube(M.stone);o.position.set(x,y,z);o.userData.pos=pos;o.userData.type=type;o.userData.state=state;o.userData.sourceCommand=String(sourceCommand||'');root.add(o);meshes.set(k,{instance:false,object:o,pos,type,state});
  }
  for(const [fx,fy,fz,tx,ty,tz] of moves){const record=meshes.get(keyOf(tx,ty,tz));if(!record)continue;
    const from=new T.Vector3(fx,fy,fz),to=new T.Vector3(tx,ty,tz);
    if(record.instance){const bucket=instanceBuckets.get(record.bucket);if(!bucket)continue;instanceMatrix(bucket,record.index,fx,fy,fz);dirtyBuckets.add(record.bucket);anims.push({instance:true,bucket:record.bucket,index:record.index,from,to,t0:performance.now()});}
    else{record.object.position.set(fx,fy,fz);anims.push({instance:false,o:record.object,from,to,t0:performance.now()});}
  }
  for(const name of dirtyBuckets){const bucket=instanceBuckets.get(name);if(bucket)bucket.mesh.instanceMatrix.needsUpdate=true;}
}
window.Renderer = { init, apply, setEntities, setEntityTickDuration(ms){entityInterpolationMs=Math.max(10,Math.min(1000,Number(ms)||50));}, getFacing, getAudioListener(){ if(!camera)return null; camera.updateMatrixWorld(true); const forward=camera.getWorldDirection(new T.Vector3()),up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion); return {position:[camera.position.x,camera.position.y,camera.position.z],forward:[forward.x,forward.y,forward.z],up:[up.x,up.y,up.z]}; }, set onClick(f) { onClick = f; }, set onFacingChange(f) { onFacingChange = f; if (typeof f === 'function') f(getFacing()); }, set onAudioListenerUpdate(f){onAudioListenerUpdate=typeof f==='function'?f:()=>{};}, setCameraAnchor(p) { if(!p){goalT.copy(homeTarget);return;} goalT.set(Number(p[0])||0,Number(p[1])||0,Number(p[2])||0); }, resetCameraAnchor(){goalT.copy(homeTarget);}, reset() { for(const r of meshes.values())if(!r.instance)root.remove(r.object);for(const b of instanceBuckets.values())root.remove(b.mesh);for(const e of entityMeshes.values())root.remove(e);entityMeshes.clear();instanceBuckets.clear();meshes.clear();anims.length=0; } };
})();
