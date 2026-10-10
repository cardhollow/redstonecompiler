


(function (root) {
'use strict';
const DIRS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const NAMES = ['east','west','up','down','south','north'];
const opp = d => d ^ 1, key = p => p[0]+','+p[1]+','+p[2];
const add = (p, d) => [p[0]+DIRS[d][0], p[1]+DIRS[d][1], p[2]+DIRS[d][2]];
const H4 = [0,1,4,5], REG = {}, CATALOG_LISTENERS = new Set();
const WOOL_COLORS = ['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'];
const WOOD_VARIANTS = ['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','bamboo','crimson','warped','pale_oak'];
const WOOD_NOTE_BLOCKS = WOOD_VARIANTS.flatMap(w => w==='bamboo' ? ['bamboo_planks','bamboo_block','stripped_bamboo_block'] : (w==='crimson'||w==='warped') ? [w+'_planks',w+'_stem',w+'_hyphae','stripped_'+w+'_stem','stripped_'+w+'_hyphae'] : [w+'_planks',w+'_log',w+'_wood','stripped_'+w+'_log','stripped_'+w+'_wood']);
const NOTE_INSTRUMENT_BLOCKS = {
  harp:['dirt','coarse_dirt','rooted_dirt','grass_block','podzol','mycelium','mud','moss_block','leaves','oak_leaves','spruce_leaves','birch_leaves','jungle_leaves','acacia_leaves','dark_oak_leaves','mangrove_leaves','cherry_leaves','pale_oak_leaves','snow_block','farmland','dirt_path'],
  bass:[...WOOD_NOTE_BLOCKS,'bookshelf','chiseled_bookshelf','crafting_table','chest','trapped_chest','barrel','loom','cartography_table','fletching_table','smithing_table','lectern','jukebox','note_block','noteblock'],
  bd:['stone','granite','diorite','andesite','cobblestone','mossy_cobblestone','stone_bricks','mossy_stone_bricks','cracked_stone_bricks','chiseled_stone_bricks','deepslate','cobbled_deepslate','polished_deepslate','blackstone','polished_blackstone','basalt','smooth_basalt','tuff','calcite','bricks','brick_block','sandstone','red_sandstone','netherrack','magma_block','nether_brick','red_nether_brick','quartz_block','smooth_quartz','obsidian','concrete','heavy_core',...WOOL_COLORS.map(c=>c+'_concrete')],
  snare:['sand','red_sand','gravel','suspicious_sand','suspicious_gravel',...WOOL_COLORS.map(c=>c+'_concrete_powder')],
  hat:['glass','glass_pane','sea_lantern','beacon'],
  bell:['gold_block'], chime:['packed_ice','blue_ice'], flute:['clay'], guitar:['wool'],
  xylophone:['bone_block'], iron_xylophone:['iron_block'], cow_bell:['soul_sand'],
  didgeridoo:['pumpkin','carved_pumpkin','jack_o_lantern'], bit:['emerald_block'], banjo:['hay_block'], pling:['glowstone']
};
const NOTEBLOCK_SUPPORT_BLOCKS = [...new Set(Object.values(NOTE_INSTRUMENT_BLOCKS).flat())].filter(n=>!['note_block','noteblock'].includes(n));
const NOTE_INSTRUMENT_BY_BLOCK = new Map();
for (const [instrument, blocks] of Object.entries(NOTE_INSTRUMENT_BLOCKS)) for (const block of blocks) if (!NOTE_INSTRUMENT_BY_BLOCK.has(block)) NOTE_INSTRUMENT_BY_BLOCK.set(block,instrument);
const WOOD_BUTTON_TYPES = ['wooden_button','oak_button','spruce_button','birch_button','jungle_button','acacia_button','dark_oak_button','mangrove_button','cherry_button','bamboo_button','crimson_button','warped_button','pale_oak_button'];
const BUTTON_TYPES = new Set(['stone_button', ...WOOD_BUTTON_TYPES, 'polished_blackstone_button']);
const WOOD_PRESSURE_PLATE_TYPES = ['wooden_pressure_plate','oak_pressure_plate','spruce_pressure_plate','birch_pressure_plate','jungle_pressure_plate','acacia_pressure_plate','dark_oak_pressure_plate','mangrove_pressure_plate','cherry_pressure_plate','bamboo_pressure_plate','crimson_pressure_plate','warped_pressure_plate','pale_oak_pressure_plate'];
const PRESSURE_PLATE_TYPES = new Set(['stone_pressure_plate', ...WOOD_PRESSURE_PLATE_TYPES, 'light_weighted_pressure_plate','heavy_weighted_pressure_plate','polished_blackstone_pressure_plate']);
const clone = o => JSON.parse(JSON.stringify(o == null ? {} : o));
const pub = s => { const o = {}; for (const k in s) if (k[0] !== '_') o[k] = s[k]; return o; };
const cond = b => b.def.solid && !b.state.extended;           
const BEDROCK_STATE_SCHEMA = {
  stone:{}, obsidian:{}, glass:{}, slime:{}, honey_block:{}, glazed_terracotta:{}, redstone_block:{}, air:{},
  wool:{color:WOOL_COLORS},
  daylight_detector:{redstone_signal:{min:0,max:15}},
  barrel:{facing_direction:[0,1,2,3,4,5],open_bit:[false,true]},
  noteblock:{}, redstone_wire:{redstone_signal:{min:0,max:15}},
  lever:{lever_direction:['down_east_west','down_north_south','east','north','south','up_east_west','up_north_south','west'],open_bit:[false,true]},
  stone_button:{button_pressed_bit:[false,true],facing_direction:[0,1,2,3,4,5]},
  redstone_torch:{torch_facing_direction:['top','bottom','north','south','east','west']},
  repeater:{'minecraft:cardinal_direction':['north','south','east','west'],repeater_delay:[0,1,2,3]},
  comparator:{'minecraft:cardinal_direction':['north','south','east','west'],output_lit_bit:[false,true],output_subtract_bit:[false,true]},
  redstone_lamp:{}, observer:{'minecraft:facing_direction':['down','up','north','south','west','east'],powered_bit:[false,true]},
  piston:{facing_direction:[0,1,2,3,4,5]}, sticky_piston:{facing_direction:[0,1,2,3,4,5]},
  dropper:{facing_direction:[0,1,2,3,4,5],triggered_bit:[false,true]},
  piston_head:{facing_direction:[0,1,2,3,4,5]}
};
for (const name of BUTTON_TYPES) BEDROCK_STATE_SCHEMA[name] = {button_pressed_bit:[false,true],facing_direction:[0,1,2,3,4,5]};
for (const name of PRESSURE_PLATE_TYPES) BEDROCK_STATE_SCHEMA[name] = {redstone_signal:{min:0,max:15}};
const def = (n, o) => {
  const d = Object.assign({ solid:false, pushable:'destroy', pullable:true, defaults:{}, description:'', bedrockStates:null }, o || {});
  if (!d.bedrockStates) d.bedrockStates = d.states || BEDROCK_STATE_SCHEMA[n] || {};
  if (!d.description) d.description = n.replace(/_/g, ' ');
  REG[n] = d;
  for (const listener of CATALOG_LISTENERS) { try { listener(); } catch (_) {} }
  return d;
};

class Block {
  constructor(type, state, sourceState, sourceType, sourceCommand) { this.type = type; this.def = REG[type]; this.sourceCommand=String(sourceCommand||'');
    this.state = Object.assign(clone(this.def.defaults), state || {});
    
    
    this.sourceState = clone(sourceState === undefined ? (state || {}) : sourceState);
    this.sourceType = String(sourceType || type || 'air').toLowerCase().replace(/^minecraft:/,''); }
}

const BEDROCK_FACING_TO_DIR = [3,2,5,4,1,0];
const DIR_TO_BEDROCK_FACING = [5,4,1,0,3,2];
const PISTON_FACING_TO_DIR = [3,2,4,5,0,1];
const PISTON_DIR_TO_FACING = [4,5,1,0,2,3];
const PISTON_HEAD_FACING_TO_DIR = [2,3,4,5,0,1];
const PISTON_HEAD_DIR_TO_FACING = [4,5,0,1,2,3];
const BARREL_FACING_TO_DIR = [3,2,0,1,4,5];
const BARREL_DIR_TO_FACING = [2,3,1,0,4,5];
const isBool = v => v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
const asDir = v => Number.isInteger(Number(v)) && String(v).trim() !== '' && Number(v)>=0 && Number(v)<=5
  ? Math.trunc(Number(v)) : NAMES.indexOf(String(v == null ? '' : v).toLowerCase());
const enumDirection = d => NAMES[Math.max(0,Math.min(5,Number(d)||0))];
function canonicalBedrockStates(name, supplied, sourceName) {
  const n = ({redstone:'redstone_wire',wire:'redstone_wire',slime_block:'slime',torch:'redstone_torch',button:'stone_button',lamp:'redstone_lamp',sticky:'sticky_piston',note_block:'noteblock',note:'noteblock',glass_pane:'glass',unpowered_repeater:'repeater',powered_repeater:'repeater',unpowered_comparator:'comparator',powered_comparator:'comparator',lit_redstone_lamp:'redstone_lamp',unlit_redstone_torch:'redstone_torch',piston_arm_collision:'piston_head'})[name] || name;
  const s = supplied && typeof supplied === 'object' ? supplied : {}, out = {};
  const has = k => Object.prototype.hasOwnProperty.call(s,k);
  const copyBool = (to, keys) => { for (const k of keys) if (has(k)) { out[to] = isBool(s[k]); return; } };
  const copyInt = (to, keys, min=0, max=15) => { for (const k of keys) if (has(k) && Number.isFinite(Number(s[k]))) { out[to] = Math.max(min,Math.min(max,Math.trunc(Number(s[k])))); return; } };
  const rawDir = s.facing !== undefined ? asDir(s.facing) : -1;
  const rawAttach = s.attach !== undefined ? asDir(s.attach) : (s.face !== undefined ? asDir(s.face) : -1);
  if (n === 'redstone_wire' || n === 'daylight_detector') copyInt('redstone_signal',['redstone_signal','power'],0,15);
  else if (n === 'lever') {
    const allowed = ['down_east_west','down_north_south','east','north','south','up_east_west','up_north_south','west'];
    if (has('lever_direction') && allowed.includes(String(s.lever_direction).toLowerCase())) out.lever_direction=String(s.lever_direction).toLowerCase();
    else if (rawAttach>=0) out.lever_direction=({0:'west',1:'east',2:'down_east_west',3:'up_east_west',4:'north',5:'south'})[rawAttach];
    else if (has('attach')) out.lever_direction='up_east_west';
    copyBool('open_bit',['open_bit','powered']);
  } else if (BUTTON_TYPES.has(n)) {
    if (has('facing_direction') && Number.isFinite(Number(s.facing_direction))) out.facing_direction=Math.max(0,Math.min(5,Math.trunc(Number(s.facing_direction))));
    else if (rawDir>=0) out.facing_direction=DIR_TO_BEDROCK_FACING[rawDir];
    else if (rawAttach>=0) out.facing_direction=DIR_TO_BEDROCK_FACING[rawAttach^1];
    copyBool('button_pressed_bit',['button_pressed_bit','powered']);
  } else if (n === 'redstone_torch') {
    const allowed=['top','bottom','north','south','east','west'];
    if (has('torch_facing_direction') && allowed.includes(String(s.torch_facing_direction).toLowerCase())) out.torch_facing_direction=String(s.torch_facing_direction).toLowerCase();
    else if (rawAttach>=0) out.torch_facing_direction=({0:'west',1:'east',2:'bottom',3:'top',4:'north',5:'south'})[rawAttach];
  } else if (n === 'repeater' || n === 'comparator') {
    let card = s['minecraft:cardinal_direction'] ?? s.cardinal_direction;
    if (card === undefined && rawDir>=0) card=enumDirection(rawDir^1);
    if (typeof card === 'string' && ['north','south','east','west'].includes(card.toLowerCase())) out['minecraft:cardinal_direction']=card.toLowerCase();
    if (n === 'repeater') {
      if (has('repeater_delay') && Number.isFinite(Number(s.repeater_delay))) out.repeater_delay=Math.max(0,Math.min(3,Math.trunc(Number(s.repeater_delay))));
      else if (has('delay') && Number.isFinite(Number(s.delay))) out.repeater_delay=Math.max(0,Math.min(3,Math.trunc(Number(s.delay))-1));
    } else {
      copyBool('output_lit_bit',['output_lit_bit','out']);
      if (has('mode')) out.output_subtract_bit=String(s.mode).toLowerCase()==='subtract';
      else copyBool('output_subtract_bit',['output_subtract_bit','subtract']);
      if (!has('output_lit_bit') && !has('out') && String(sourceName||'')==='powered_comparator') out.output_lit_bit=true;
    }
  } else if (n === 'observer') {
    const f=s['minecraft:facing_direction'] ?? s.facing_direction;
    if (typeof f === 'string' && ['down','up','north','south','west','east'].includes(f.toLowerCase())) out['minecraft:facing_direction']=f.toLowerCase();
    else if (Number.isFinite(Number(f)) && String(f).trim()!=='') out['minecraft:facing_direction']=enumDirection(BEDROCK_FACING_TO_DIR[Math.max(0,Math.min(5,Math.trunc(Number(f))))]);
    else if (rawDir>=0) out['minecraft:facing_direction']=enumDirection(rawDir);
    copyBool('powered_bit',['powered_bit','powered']);
  } else if (n === 'piston' || n === 'sticky_piston') {
    if (has('facing_direction') && Number.isFinite(Number(s.facing_direction))) out.facing_direction=Math.max(0,Math.min(5,Math.trunc(Number(s.facing_direction))));
    else if (rawDir>=0) out.facing_direction=PISTON_DIR_TO_FACING[rawDir];
  } else if (n === 'piston_head') {
    if (has('facing_direction') && Number.isFinite(Number(s.facing_direction))) out.facing_direction=Math.max(0,Math.min(5,Math.trunc(Number(s.facing_direction))));
    else if (rawDir>=0) out.facing_direction=PISTON_HEAD_DIR_TO_FACING[rawDir];
  } else if (n === 'dropper') {
    if (has('facing_direction') && Number.isFinite(Number(s.facing_direction))) out.facing_direction=Math.max(0,Math.min(5,Math.trunc(Number(s.facing_direction))));
    else if (rawDir>=0) out.facing_direction=DIR_TO_BEDROCK_FACING[rawDir];
    copyBool('triggered_bit',['triggered_bit','triggered']);
  } else if (n === 'barrel') {
    if (has('facing_direction') && Number.isFinite(Number(s.facing_direction))) out.facing_direction=Math.max(0,Math.min(5,Math.trunc(Number(s.facing_direction))));
    else if (rawDir>=0) out.facing_direction=BARREL_DIR_TO_FACING[rawDir];
    copyBool('open_bit',['open_bit','open']);
  } else if (n === 'wool') {
    const fromAlias=String(sourceName||'').toLowerCase().replace(/^minecraft:/,'').match(/^([a-z_]+)_wool$/);
    const color=String(has('color')?s.color:(fromAlias?fromAlias[1]:'white')).toLowerCase();
    out.color=WOOL_COLORS.includes(color)?color:'white';
  } else if (n === 'redstone_lamp') {
    
  } else {
    const schema = REG[n] && REG[n].bedrockStates || BEDROCK_STATE_SCHEMA[n] || {};
    for (const k of Object.keys(schema)) if (has(k)) out[k]=s[k];
  }
  
  if (Array.isArray(s.items)) out.items=clone(s.items);
  if (s.note !== undefined && n==='noteblock') out.note=Math.max(0,Math.min(24,Math.trunc(Number(s.note)||0)));
  return out;
}
function runtimeStateFromBedrock(name, source, raw, sourceType) {
  const n=name, s=source||{}, r=raw||{}, out={};
  const getCard = s['minecraft:cardinal_direction'] || s.cardinal_direction;
  if (n==='wool') out.color=WOOL_COLORS.includes(String(s.color||'').toLowerCase())?String(s.color).toLowerCase():'white';
  if (n==='redstone_wire') out.power=Number(s.redstone_signal ?? r.power ?? 0)||0;
  if (n==='daylight_detector') { out.power=Math.max(0,Math.min(15,Math.trunc(Number(s.redstone_signal ?? r.power ?? 0)||0))); out.inverted=String(sourceType||'').toLowerCase().replace(/^minecraft:/,'')==='daylight_detector_inverted'||isBool(r.inverted); }
  if (n==='lever') {
    const ld=String(s.lever_direction||'up_east_west').toLowerCase();
    out.attach=({east:1,west:0,up_north_south:3,up_east_west:3,down_north_south:2,down_east_west:2,north:4,south:5})[ld] ?? 3;
    if (s.open_bit!==undefined) out.powered=isBool(s.open_bit);
  }
  if (BUTTON_TYPES.has(n)) {
    const fd=Number(s.facing_direction); if (Number.isFinite(fd) && String(s.facing_direction).trim()!=='') out.attach=(BEDROCK_FACING_TO_DIR[Math.max(0,Math.min(5,Math.trunc(fd)))]^1);
    if (s.button_pressed_bit!==undefined) out.powered=isBool(s.button_pressed_bit);
  }
  if (PRESSURE_PLATE_TYPES.has(n)) out.pressed = Number(s.redstone_signal ?? 0) > 0;
  if (n==='redstone_torch') {
    const tf=String(s.torch_facing_direction||'top').toLowerCase(); out.attach=({top:3,bottom:2,west:0,east:1,north:4,south:5})[tf]??3;
  }
  if (n==='repeater' || n==='comparator') {
    if (getCard!==undefined) { const f=NAMES.indexOf(String(getCard).toLowerCase()); if(f>=0) out.facing=f^1; }
    if (n==='repeater') { out.delay=Math.max(1,Math.min(4,Math.trunc(Number(s.repeater_delay ?? 0)||0)+1)); out.powered=String(sourceType||'')==='powered_repeater'; }
    else { out.subtract=isBool(s.output_subtract_bit); out.out=isBool(s.output_lit_bit)||String(sourceType||'')==='powered_comparator'?1:0; }
  }
  if (n==='observer') {
    const f=s['minecraft:facing_direction']; if (typeof f==='string') { const d=NAMES.indexOf(f.toLowerCase()); if(d>=0)out.facing=d; }
    if(s.powered_bit!==undefined) out.powered=isBool(s.powered_bit);
  }
  if (n==='piston'||n==='sticky_piston') {
    if (s.facing_direction!==undefined && Number.isFinite(Number(s.facing_direction))) out.facing=PISTON_FACING_TO_DIR[Math.max(0,Math.min(5,Math.trunc(Number(s.facing_direction))))];
  }
  if (n==='piston_head') {
    if (s.facing_direction!==undefined && Number.isFinite(Number(s.facing_direction))) out.facing=PISTON_HEAD_FACING_TO_DIR[Math.max(0,Math.min(5,Math.trunc(Number(s.facing_direction))))];
  }
  if (n==='barrel') {
    if (s.facing_direction!==undefined && Number.isFinite(Number(s.facing_direction))) out.facing=BARREL_FACING_TO_DIR[Math.max(0,Math.min(5,Math.trunc(Number(s.facing_direction))))];
  }
  if (n==='dropper') {
    if (s.facing_direction!==undefined && Number.isFinite(Number(s.facing_direction))) out.facing=BEDROCK_FACING_TO_DIR[Math.max(0,Math.min(5,Math.trunc(Number(s.facing_direction))))];
  }
  if(n==='dropper'&&s.triggered_bit!==undefined)out.triggered=isBool(s.triggered_bit);
  if(n==='barrel'&&s.open_bit!==undefined)out.open=isBool(s.open_bit);
  if(n==='redstone_lamp'&&String(sourceType||'').endsWith('lit_redstone_lamp'))out.lit=true;
  
  
  if (r.facing!==undefined && n!=='repeater' && n!=='comparator') { const d=asDir(r.facing); if(d>=0)out.facing=d; }
  if (r.attach!==undefined || r.face!==undefined) { const d=asDir(r.attach ?? r.face); if(d>=0)out.attach=d; }
  if(r.power!==undefined&&n==='redstone_wire'&&s.redstone_signal===undefined)out.power=Math.max(0,Math.min(15,Number(r.power)||0));
  if(r.delay!==undefined&&n==='repeater')out.delay=Math.max(1,Math.min(4,Math.trunc(Number(r.delay)||1)));
  if(r.mode!==undefined&&n==='comparator')out.subtract=String(r.mode).toLowerCase()==='subtract';
  if(r.subtract!==undefined&&n==='comparator')out.subtract=isBool(r.subtract);
  if(r.powered!==undefined&&(n==='lever'||BUTTON_TYPES.has(n)||n==='observer'))out.powered=isBool(r.powered);
  if(r.pressed!==undefined&&PRESSURE_PLATE_TYPES.has(n))out.pressed=isBool(r.pressed);
  if(r.open!==undefined&&n==='barrel')out.open=isBool(r.open);
  if(r.note!==undefined&&n==='noteblock')out.note=Math.max(0,Math.min(24,Math.trunc(Number(r.note)||0)));
  if(r.items!==undefined&&n==='barrel')out.items=clone(r.items);
  return out;
}


function daylightSkyPenalty(world,p) {
  let penalty=0;
  const transparent=new Set(['glass','glass_pane','daylight_detector']);
  for(let y=p[1]+1;y<=p[1]+320;y++){
    const b=world.getp([p[0],y,p[2]]);if(!b||!b.def.solid||transparent.has(b.type))continue;
    if(/(?:^|_)(?:leaves)$/.test(b.type)){penalty=Math.min(8,penalty+1);continue;}
    return null;
  }
  return penalty;
}
function daylightDetectorPower(world,p,inverted=false) {
  const penalty=daylightSkyPenalty(world,p);
  if(penalty===null)return inverted?15:0;
  const t=((Math.trunc(Number(world.dayTime)||0)%24000)+24000)%24000;
  let level;
  if(t>=23000)level=15*(t-23000)/7000;
  else if(t<=6000)level=15*(t+1000)/7000;
  else if(t<=12000)level=15*(12000-t)/6000;
  else level=0;
  level=Math.max(0,Math.min(15,Math.round(level-penalty)));
  return inverted?15-level:level;
}
function updateDaylightDetector(c) {
  const power=daylightDetectorPower(c.w,c.p,!!c.state.inverted);
  if(Number(c.state.power)!==power)c.setState({power});
}

function ordinaryBlock(name, extra={}) { return def(name, Object.assign({solid:true,pushable:'push',description:'Ordinary solid block; can be moved by pistons.'},extra)); }
ordinaryBlock('stone');
ordinaryBlock('iron_block',{description:'Iron block; a movable ordinary solid block.'});
ordinaryBlock('wool',{defaults:{color:'white'},description:'Colored wool block. Use wool["color"="red"] or a color-specific wool name.'});
for (const name of NOTEBLOCK_SUPPORT_BLOCKS) if (!REG[name]) ordinaryBlock(name,{description:'Block used beneath a note block to select its instrument sound.'});
def('obsidian',     { solid:true, pushable:'block', description:'Immovable solid block.' });
const IMMOVABLE_PISTON_BLOCKS = [
  'bedrock','barrier','beacon','calibrated_sculk_sensor','command_block','chain_command_block','repeating_command_block',
  'conduit','creaking_heart','crying_obsidian','enchanting_table','end_gateway','end_portal','end_portal_frame',
  'ender_chest','grindstone','jigsaw','jukebox','light_block','lodestone','monster_spawner',
  'moving_block','nether_portal','reinforced_deepslate','respawn_anchor','sculk_catalyst',
  'sculk_sensor','sculk_shrieker','structure_block','structure_void','allow','deny','border','trial_spawner','vault'
];
for (const name of IMMOVABLE_PISTON_BLOCKS) {
  if (!REG[name]) def(name,{solid:true,pushable:'block',pullable:false,description:'Cannot be pushed or pulled by pistons in Bedrock Edition.'});
}
def('glass',        { pushable:'push', description:'Transparent block; movable and does not conduct redstone power.' });
def('slime',        { solid:true, pushable:'push', description:'Moves adjacent movable blocks when pushed or pulled by a piston.' });
def('honey_block',  { solid:true, pushable:'push', description:'Sticky block; it does not stick to slime blocks or glazed terracotta.' });
def('glazed_terracotta', { solid:true, pushable:'push', pullable:false, description:'Can be pushed but not pulled; does not stick to slime or honey blocks.' });
def('heavy_core', { solid:true, pushable:'push', pullable:false, description:'Can be pushed but not pulled; does not stick to slime or honey blocks.' });
def('barrel', { solid:true, pushable:'push', defaults:{ facing:3, open:false, items:[] } });
def('dropper', { solid:true, pushable:'push', defaults:{ facing:3, triggered:false, powered:false },
  onNeighbor:c=>{const power=Array.from({length:6},(_,d)=>d).some(d=>c.input(d)>0);if(power&&!c.state.powered&&!c.w.hasSchedule(c.p,'d'))c.schedule(1,'d');if(!power&&c.state.powered)c.setState({powered:false});},
  onTick:(c,tag)=>{if(tag==='d'){c.setState({triggered:true,powered:true});c.schedule(4,'off',true);}else if(tag==='off'){c.setState({triggered:false,powered:Array.from({length:6},(_,d)=>d).some(d=>c.input(d)>0)});}}
});
def('noteblock', { solid:true, pushable:'push', defaults:{ instrument:'harp', note:0, powered:false, plays:0 },
  onUse:c => { const note=(c.state.note+1)%25;c.setState({note});playNoteBlock(c,note); }, onNeighbor:noteBlockChk });
function noteBlockInstrument(world,p) { const below=world.getp(add(p,3));return below?NOTE_INSTRUMENT_BY_BLOCK.get(below.type)||'harp':'harp'; }
function playNoteBlock(c,note=c.state.note) {
  if (c.w.getp(add(c.p,2))) return;
  c.w.emitSound('noteblock',{note:Math.max(0,Math.min(24,Math.trunc(Number(note)||0))),instrument:noteBlockInstrument(c.w,c.p),pos:c.p.slice()});
}
function noteBlockChk(c) {
  const powered = [0,1,2,3,4,5].some(d => c.input(d) > 0);
  if (powered === !!c.state.powered) return;
  const patch = { powered };
  if (powered && !c.w.getp(add(c.p,2))) { patch.plays = (Number(c.state.plays) || 0) + 1; }
  c.setState(patch);
  if (powered) playNoteBlock(c);
}
def('redstone_block',{ solid:true, pushable:'push', weak:() => 15, strong:() => 15, connects:() => true });
def('daylight_detector',{ solid:false, pushable:'push', pullable:true, defaults:{power:0,inverted:false},
  description:'Daylight Detector (older Bedrock name: Daylight Sensor). ID: minecraft:daylight_detector; inverted ID: minecraft:daylight_detector_inverted. A 6/16-height floor-surface block that outputs 0–15 redstone power from sky daylight; use/interact to invert it.',
  connects:()=>true,
  weak:c=>Math.max(0,Math.min(15,Number(c.state.power)||0)),
  onNeighbor:updateDaylightDetector,
  onUse:c=>{
    const inverted=!c.state.inverted;
    c.setState({inverted});
    c.b.sourceType=inverted?'daylight_detector_inverted':'daylight_detector';
    const authored=c.w.authoredBlocks.get(key(c.p));
    if(authored)authored.sourceType=c.b.sourceType;
    updateDaylightDetector(c);
    c.w.emitSound('lever',{powered:inverted,pos:c.p.slice()});
  }
});

def('lever', { defaults:{ attach:3, powered:false }, connects:() => true,
  weak:c => c.state.powered ? 15 : 0,
  strong:(c, d) => c.state.powered && d === c.state.attach ? 15 : 0,
  onUse:c => { const powered=!c.state.powered;c.setState({powered});c.w.emitSound('lever',{powered,pos:c.p.slice()}); } });

function buttonDefinition(duration) { return { defaults:{ attach:3, powered:false }, connects:() => true,
  weak:c => c.state.powered ? 15 : 0,
  strong:(c, d) => c.state.powered && d === c.state.attach ? 15 : 0,
  onUse:c => { if (!c.state.powered) { c.setState({ powered:true }); c.schedule(duration, 'b'); c.w.emitSound('button',{pressed:true,wood:!['stone_button','polished_blackstone_button'].includes(c.b.type),pos:c.p.slice()}); } },
  onTick:c => { if(c.state.powered){c.setState({powered:false});c.w.emitSound('button',{pressed:false,wood:!['stone_button','polished_blackstone_button'].includes(c.b.type),pos:c.p.slice()});} } }; }
def('stone_button', buttonDefinition(10));
for (const name of WOOD_BUTTON_TYPES) def(name, buttonDefinition(15));
def('polished_blackstone_button', buttonDefinition(10));
function pressurePlateEntityCount(world,p) {
  let count=0;
  for (const entity of world.entities.values()) {
    const e=entity.pos||[];
    if (Math.abs(Number(e[0])-p[0])<0.45 && Math.abs(Number(e[2])-p[2])<0.45 && Math.abs(Number(e[1])-p[1])<0.45) count++;
  }
  return count;
}
function pressurePlateSignal(c) {
  const count=pressurePlateEntityCount(c.w,c.p);
  if (c.b.type==='light_weighted_pressure_plate') return count ? Math.min(15,count) : (c.state.pressed ? 15 : 0);
  if (c.b.type==='heavy_weighted_pressure_plate') return count ? Math.min(15,Math.ceil(count/10)) : (c.state.pressed ? 15 : 0);
  return (c.state.pressed || count>0) ? 15 : 0;
}
function pressurePlateDefinition() { return { defaults:{ pressed:false }, connects:()=>true,
  weak:c=>pressurePlateSignal(c),
  strong:(c,d)=>d===3?pressurePlateSignal(c):0,
  onUse:c=>{if(!c.state.pressed)c.w.emitSound('pressure_plate',{pressed:true,wood:WOOD_PRESSURE_PLATE_TYPES.includes(c.b.type),pos:c.p.slice()});c.setState({pressed:true});c.schedule(5,'p',true);},
  onNeighbor:c=>{ if(pressurePlateEntityCount(c.w,c.p)>0&&!c.state.pressed){c.setState({pressed:true});c.w.emitSound('pressure_plate',{pressed:true,wood:WOOD_PRESSURE_PLATE_TYPES.includes(c.b.type),pos:c.p.slice()});} },
  onTick:c=>{ const occupied=pressurePlateEntityCount(c.w,c.p)>0;if(occupied!==!!c.state.pressed){c.setState({pressed:occupied});c.w.emitSound('pressure_plate',{pressed:occupied,wood:WOOD_PRESSURE_PLATE_TYPES.includes(c.b.type),pos:c.p.slice()});} if(occupied)c.schedule(5,'p',true); }
}; }
for (const name of PRESSURE_PLATE_TYPES) def(name, pressurePlateDefinition());

def('redstone_torch', { defaults:{ attach:3, lit:true }, connects:() => true,
  weak:(c, d) => c.state.lit && d !== c.state.attach ? 15 : 0,
  strong:(c, d) => c.state.lit && d === 2 && c.state.attach !== 2 ? 15 : 0,
  onNeighbor:torchChk, onTick:torchTick });
function torchPowered(c) { return c.w.strongInto(add(c.p, c.state.attach)) > 0; }
function torchChk(c) {
  if (c.state._burnUntil && c.w.time < c.state._burnUntil) return;
  if (torchPowered(c) === c.state.lit) c.schedule(1, 't');
}
function torchTick(c, tag) {
  const s = c.state, powered = torchPowered(c);
  if (tag === 'cool') {
    c.setState({ lit:!powered, _burnUntil:0, _toggles:[] });
    return;
  }
  if (s._burnUntil && c.w.time < s._burnUntil) return;
  if (powered !== s.lit) return;
  
  
  const toggles = (Array.isArray(s._toggles) ? s._toggles : []).filter(t => c.w.time - t <= 30);
  toggles.push(c.w.time);
  if (toggles.length >= 8) {
    c.setState({ lit:false, _toggles:toggles, _burnUntil:c.w.time + 30 });
    c.w.events.push({ok:false,level:'warn',cmd:'Redstone torch',msg:'Torch @ '+c.p.join(' ')+' burned out from rapid toggling.'});
    c.w.emitSound('torch_burnout',{pos:c.p.slice()});
    c.schedule(30, 'cool', true);
  } else { c.setState({ lit:!powered, _toggles:toggles }); c.w.emitSound('torch',{lit:!powered,pos:c.p.slice()}); }
}

const wirePow = (c, d) => {
  const s = c.state; if (c.w.wiresOff || !s.power) return 0;
  if (d === 3) return s.power; if (d === 2) return 0;
  const H = s.links.map(l => l[0]);
  return (!H.length || H.includes(d) || (H.length === 1 && H[0] === opp(d))) ? s.power : 0;
};
def('redstone_wire', { defaults:{ power:0, links:[] }, weak:wirePow, strong:wirePow,
  onNeighbor:c => c.w.updateWireNet(c.p) });

def('repeater', { defaults:{ facing:5, delay:1, powered:false, locked:false },
  connects:(s, d) => d === s.facing || d === opp(s.facing),
  weak:(c, d) => c.state.powered && d === c.state.facing ? 15 : 0,
  strong:(c, d) => c.state.powered && d === c.state.facing ? 15 : 0,
  onUse:c => {const delay=c.state.delay%4+1;c.setState({delay});c.w.emitSound('repeater',{delay,pos:c.p.slice()});},
  onNeighbor:c => {
    const s = c.state, locked = c.w.repeaterLocked(c.p, s.facing);
    if (s.locked !== locked) c.setState({ locked });
    
    
    if (locked) { c.w.cancelSchedule(c.p, 'r'); return; }
    const wantsPower = c.input(opp(s.facing)) > 0;
    if (wantsPower === s.powered) { c.w.cancelSchedule(c.p, 'r'); return; }
    if (!c.w.hasSchedule(c.p, 'r')) c.schedule(s.delay, 'r');
  },
  onTick:c => {
    const s = c.state, locked = c.w.repeaterLocked(c.p, s.facing);
    if (locked) { if (!s.locked) c.setState({ locked:true }); c.w.cancelSchedule(c.p, 'r'); return; }
    if (s.locked) c.setState({ locked:false });
    const wantsPower = c.input(opp(s.facing)) > 0;
    
    
    if (wantsPower !== s.powered) c.setState({ powered:wantsPower });
  } });

const sides = f => (f === 0 || f === 1) ? [4,5] : [0,1];
function compOut(c) { const s = c.state, backPos = add(c.p, opp(s.facing)), backBlock = c.w.getp(backPos);
  const readable = backBlock && backBlock.type === 'barrel' ? backBlock : (backBlock && cond(backBlock) ? c.w.getp(add(backPos, opp(s.facing))) : null);
  const back = readable && readable.type === 'barrel' ? c.w.containerSignal(readable) : c.input(opp(s.facing));
  const side = Math.max(...sides(s.facing).map(d => c.input(d)));
  return s.subtract ? Math.max(0, back - side) : (back >= side ? back : 0); }
def('comparator', { defaults:{ facing:5, subtract:false, out:0 },
  
  connects:(s, d) => H4.includes(d),
  weak:(c, d) => d === c.state.facing ? c.state.out : 0,
  strong:(c, d) => d === c.state.facing ? c.state.out : 0,
  onUse:c => { const subtract=!c.state.subtract;c.setState({subtract});c.w.emitSound('comparator',{subtract,pos:c.p.slice()}); },
  onNeighbor:c => { if (compOut(c) !== c.state.out) c.schedule(1, 'c'); },
  onTick:c => { const o = compOut(c); if (o !== c.state.out) c.setState({ out:o }); } });

function lampWant(c) { for (let d = 0; d < 6; d++) if (c.input(d) > 0) return true; return false; }
def('redstone_lamp', { solid:true, pushable:'push', defaults:{ lit:false },
  onNeighbor:c => { const p = lampWant(c); if (p && !c.state.lit) c.setState({ lit:true }); else if (!p && c.state.lit) c.schedule(2, 'l'); },
  onTick:c => { if (!lampWant(c) && c.state.lit) c.setState({ lit:false }); } });

def('observer', { solid:true, pushable:'push', defaults:{ facing:3, powered:false }, connects:(s, d) => d === s.facing || d === opp(s.facing),
  weak:(c, d) => c.state.powered && d === opp(c.state.facing) ? 15 : 0,
  strong:(c, d) => c.state.powered && d === opp(c.state.facing) ? 15 : 0,
  onNeighbor:obsChk,
  onTick:(c, tag) => { if (tag === 'on') { c.setState({ powered:true }); c.schedule(1, 'off'); }
    else { c.setState({ powered:false }); obsChk(c); } } });
function obsChk(c) { const s = c.state, g = c.w.sig(add(c.p, s.facing));
  if (s._s === undefined) { s._s = g; return; }
  if (g !== s._s) { s._s = g; if (!s.powered) c.schedule(1, 'on'); } }

function pistonPowered(c) { for (let d = 0; d < 6; d++) if (d !== c.state.facing && c.input(d) > 0) return true; return false; }
const pistonDef = sticky => ({ solid:true, pushable:'push', defaults:{ facing:3, extended:false },
  onNeighbor:c => { if (pistonPowered(c) !== c.state.extended) c.schedule(1, 'p'); },
  onTick:c => { const p = pistonPowered(c);
    if (p && !c.state.extended) c.w.extend(c.p, c.b, sticky);
    else if (!p && c.state.extended) c.w.retract(c.p, c.b, sticky); } });
def('piston', pistonDef(false));
def('sticky_piston', pistonDef(true));
def('piston_head', { solid:true, pushable:'block', pullable:false, defaults:{ facing:2, sticky:false },
  onNeighbor:c => { const b = c.w.getp(add(c.p, opp(c.state.facing)));
    if (!(b && b.def.solid !== undefined && b.state.extended && b.state.facing === c.state.facing && /piston$/.test(b.type)))
      c.w.setBlockAt(c.p, 'air', null); } });

const ALIAS = { redstone:'redstone_wire', wire:'redstone_wire', slime_block:'slime', torch:'redstone_torch', redstone_wall_torch:'redstone_torch',
  button:'stone_button', lamp:'redstone_lamp', sticky:'sticky_piston', cave_air:'air', void_air:'air',
  unpowered_repeater:'repeater', powered_repeater:'repeater', unpowered_comparator:'comparator', powered_comparator:'comparator',
  lit_redstone_lamp:'redstone_lamp', unlit_redstone_torch:'redstone_torch', piston_arm_collision:'piston_head',
  glass_pane:'glass', note_block:'noteblock', daylight_sensor:'daylight_detector', daylight_detector_inverted:'daylight_detector' };
for (const color of WOOL_COLORS) ALIAS[color+'_wool']='wool';


class World {
  constructor() { this.blocks = new Map(); this.authoredBlocks = new Map(); this.activeSourceCommand=null; this.structures = new Map(); this.entities = new Map(); this.entitySeq = 0; this.entitiesDirty = false; this.dirty = new Set(); this.moves = []; this.q = []; this.qh = 0;
    this.qset = new Set(); this.sched = []; this.sset = new Set(); this.schedCurrent = new Map(); this.scheduleSeq = 0; this.time = 0; this.dayTime = 0; this.daylightCycle = true; this.touched = []; this.wiresOff = false; this.events = []; this.sounds = []; }
  getp(p) { return this.blocks.get(key(p)); }
  updateDaylightSensors(force=false) {
    if(!force&&this.time%20!==0)return;
    for(const [k,b] of this.blocks){
      if(b.type!=='daylight_detector')continue;
      const p=k.split(',').map(Number),power=daylightDetectorPower(this,p,!!b.state.inverted);
      if(Number(b.state.power)!==power){b.state.power=power;this.dirty.add(k);this.notifyAround(p);}
    }
  }
  emitSound(kind, data={}) { if (this.sounds.length < 256) this.sounds.push(Object.assign({kind},data)); }
  
  
  recordAuthoredAt(p, type, sourceState, sourceType, sourceCommand) {
    const k=key(p);
    if(!type || type==='air') { this.authoredBlocks.delete(k); return; }
    this.authoredBlocks.set(k,{pos:p.slice(),type,sourceType:String(sourceType||type).toLowerCase().replace(/^minecraft:/,''),state:clone(sourceState||{}),command:String(sourceCommand===undefined?(this.activeSourceCommand||''):sourceCommand)});
  }
  recordAuthoredFromWorld(p) {
    const b=this.getp(p);
    if(!b) { this.authoredBlocks.delete(key(p)); return; }
    this.recordAuthoredAt(p,b.type,b.sourceState,b.sourceType,b.sourceCommand);
  }
  authoredSnapshot() {
    return Array.from(this.authoredBlocks.values(),b=>({pos:b.pos.slice(),type:b.type,sourceType:b.sourceType,state:clone(b.state),sourceState:clone(b.state)}));
  }
  summonEntity(type,pos) {
    if(String(type||'').toLowerCase().replace(/^minecraft:/,'')!=='armor_stand') throw new Error('Only armor_stand is supported by the simulator.');
    const id='entity_'+(++this.entitySeq),entity={id,type:'armor_stand',pos:pos.slice(0,3).map(Number)};
    this.entities.set(id,entity);this.entitiesDirty=true;return entity;
  }
  killAllEntities() { const n=this.entities.size;if(n){this.entities.clear();this.entitiesDirty=true;}return n; }
  entitySnapshot() { return Array.from(this.entities.values(),e=>({id:e.id,type:e.type,pos:e.pos.slice()})); }
  isSolid(p) { const b = this.getp(p); return !!(b && cond(b)); }
  containerSignal(b) { const slots = 27, items = Array.isArray(b.state.items) ? b.state.items : []; let units = 0; for (const it of items) { const count = Math.max(0, Number(it.count ?? it.Count ?? 0) || 0); const stack = Math.max(1, Number(it.maxStack || 64) || 64); units += count / stack; } const fullness = Math.min(1, units / slots); return fullness <= 0 ? 0 : Math.floor(fullness * 14) + 1; }
  normalizeStructure(data) {
    if (!data || typeof data !== 'object') throw new Error('Structure JSON must be an object');
    let rows = Array.isArray(data.blocks) ? data.blocks : (Array.isArray(data.structure?.blocks) ? data.structure.blocks : null);
    if (!rows) throw new Error('Structure needs a blocks array');
    const blocks = rows.map((raw,i) => {
      const pos = raw.pos || raw.position || [raw.x,raw.y,raw.z];
      if (!Array.isArray(pos) || pos.length < 3 || pos.slice(0,3).some(v=>!Number.isFinite(Number(v)))) throw new Error('Block '+i+' needs pos: [x,y,z]');
      
      
      const rawName=String(raw.sourceType || raw.name || raw.block || raw.type || 'air');
      const vanillaName=rawName.toLowerCase().replace(/^minecraft:/,'');
      const hasSourceState=!!(raw.sourceState&&typeof raw.sourceState==='object');
      let parsed;
      try { parsed=parseBlock(rawName); }
      catch(err) {
        const m=/^(?:minecraft:)?([a-z0-9_]+)$/i.exec(rawName);
        if(!m)throw new Error('Unsupported block identifier: '+rawName);
        let name=m[1].toLowerCase(); name=ALIAS[name]||name;
        if(!REG[name])def(name,{solid:true,pushable:'push'});
        parsed={name,state:{}};
      }
      const supplied=hasSourceState?raw.sourceState:(raw.states||raw.state||{});
      const canonicalState = canonicalBedrockStates(parsed.name, supplied, vanillaName);
      const initialRuntime = hasSourceState ? runtimeStateFromBedrock(parsed.name,canonicalState,supplied,vanillaName) : supplied;
      const state = Object.assign({},parsed.state,initialRuntime);
      const toBool=v=>v===true||v===1||v==='1'||String(v).toLowerCase()==='true';
      const opposite=d=>Number.isInteger(d)&&d>=0&&d<=5?(d^1):d;
      if (typeof state.facing === 'string') { const f=NAMES.indexOf(state.facing.toLowerCase()); if(f>=0)state.facing=f; }
      if (typeof state.attach === 'string') { const f=NAMES.indexOf(state.attach.toLowerCase()); if(f>=0)state.attach=f; }
      if (state.facing===undefined) {
        const face=state.facing_direction??state['minecraft:facing_direction'];
        if (face!==undefined && Number.isFinite(Number(face)) && String(face).trim()!=='' && Number(face)>=0 && Number(face)<=5) {
          const v=Math.trunc(Number(face));
          if(BUTTON_TYPES.has(parsed.name)) state.attach=BEDROCK_FACING_TO_DIR[v]^1;
          else if(parsed.name==='piston'||parsed.name==='sticky_piston') state.facing=PISTON_FACING_TO_DIR[v];
          else if(parsed.name==='piston_head') state.facing=PISTON_HEAD_FACING_TO_DIR[v];
          else if(parsed.name==='barrel') state.facing=BARREL_FACING_TO_DIR[v];
          else state.facing=BEDROCK_FACING_TO_DIR[v];
        } else if (typeof face==='string') {
          const f=NAMES.indexOf(face.toLowerCase());
          if(f>=0){if(BUTTON_TYPES.has(parsed.name))state.attach=opposite(f);else state.facing=(parsed.name==='repeater'||parsed.name==='comparator')?opposite(f):f;}
        }
      }
      const cardinal=state['minecraft:cardinal_direction']??state.cardinal_direction;
      if (cardinal!==undefined && supplied.facing===undefined && state.facing===undefined) {
        const f=NAMES.indexOf(String(cardinal).toLowerCase());
        if(f>=0) state.facing=(parsed.name==='repeater'||parsed.name==='comparator')?opposite(f):f;
      }
      if (state.mode !== undefined) state.subtract=String(state.mode).toLowerCase()==='subtract';
      if (state['output_subtract_bit']!==undefined) state.subtract=toBool(state['output_subtract_bit']);
      if (state['output_lit_bit']!==undefined) state.out=toBool(state['output_lit_bit'])?1:0;
      if (state['redstone_signal']!==undefined && state.power===undefined) state.power=Number(state['redstone_signal'])||0;
      if (state['repeater_delay']!==undefined) state.delay=Math.max(1,Math.min(4,Math.trunc(Number(state['repeater_delay'])||0)+1));
      if (parsed.name==='repeater' && state.delay!==undefined) state.delay=Math.max(1,Math.min(4,Math.trunc(Number(state.delay)||1)));
      if (parsed.name==='repeater' && state.delay===undefined) state.delay=1;
      if (state['button_pressed_bit']!==undefined) state.powered=toBool(state['button_pressed_bit']);
      if (state.powered_bit!==undefined) state.powered=toBool(state.powered_bit);
      if (state.extended_bit!==undefined) state.extended=toBool(state.extended_bit);
      if (parsed.name==='barrel' && state.open_bit!==undefined) state.open=toBool(state.open_bit);
      if (parsed.name==='lever' && state.open_bit!==undefined) state.powered=toBool(state.open_bit);
      if (parsed.name==='redstone_lamp' && vanillaName==='lit_redstone_lamp' && supplied.lit===undefined) state.lit=true;
      if (parsed.name==='redstone_torch' && vanillaName==='unlit_redstone_torch' && supplied.lit===undefined) state.lit=false;
      if (parsed.name==='redstone_torch' && state.attach===undefined && typeof state.torch_facing_direction==='string') {
        const tf=state.torch_facing_direction.toLowerCase(); state.attach=({top:3,bottom:2,west:0,east:1,north:4,south:5})[tf]??3;
      }
      if (parsed.name==='repeater' && supplied.powered===undefined) state.powered=vanillaName==='powered_repeater';
      if (parsed.name==='comparator' && supplied.out===undefined && supplied['output_lit_bit']===undefined) state.out=vanillaName==='powered_comparator'?1:0;
      if (parsed.name==='lever' && typeof state.lever_direction==='string' && supplied.attach===undefined) {
        const ld=state.lever_direction.toLowerCase(); state.attach=({east:1,west:0,up_north_south:3,up_east_west:3,down_north_south:2,down_east_west:2,north:4,south:5})[ld]??3;
      }
      Object.assign(state, runtimeStateFromBedrock(parsed.name, canonicalState, supplied, vanillaName));
      let items = raw.items || raw.nbt?.Items || raw.block_entity_data?.Items || state.items || [];
      if (parsed.name==='barrel') state.items = (Array.isArray(items)?items:[]).map((it,j)=>({name:String(it.name||it.Name||'minecraft:stone').replace(/^([^:]+)$/,'minecraft:$1'),count:Math.max(1,Math.min(64,Math.trunc(Number(it.count??it.Count??1)||1))),slot:Math.max(0,Math.min(26,Math.trunc(Number(it.slot??it.Slot??j)||0)))}));
      if (parsed.name==='noteblock' && state.note===undefined) { const note=raw.note??raw.nbt?.note??raw.block_entity_data?.note; if(note!==undefined)state.note=Math.max(0,Math.min(24,Math.trunc(Number(note)||0))); }
      const sourceState = canonicalBedrockStates(parsed.name, supplied, vanillaName);
      if (parsed.name==='barrel' && state.items) sourceState.items = clone(state.items);
      if (parsed.name==='noteblock' && state.note!==undefined) sourceState.note = state.note;
      return {pos:pos.slice(0,3).map(v=>Math.trunc(Number(v))),name:parsed.name,state,sourceState,sourceType:vanillaName,nbt:raw.nbt||raw.block_entity_data||null};
    });
    const max = [1,1,1]; for (const b of blocks) for(let i=0;i<3;i++) max[i]=Math.max(max[i],b.pos[i]+1);
    const size = Array.isArray(data.size)&&data.size.length>=3 ? data.size.slice(0,3).map(v=>Math.max(1,Math.trunc(Number(v)||1))) : max;
    const volume=size[0]*size[1]*size[2]; if(volume>LIMIT) throw new Error('Structure exceeds '+LIMIT+' cells');
    for(const b of blocks) if(b.pos.some((v,i)=>v<0||v>=size[i])) throw new Error('Block position is outside declared size');
    return {size,blocks};
  }
  addStructure(name,data) { name=String(name||data.name||'').trim().replace(/^\//,''); if(!name) throw new Error('Structure name is required'); const normalized=this.normalizeStructure(data); this.structures.set(name,normalized); return normalized; }
  loadStructure(name,origin,rotation='0_degrees',mirror='none',includeBlocks=true) {
    const s=this.structures.get(name); if(!s) throw new Error('Unknown structure: '+name); if(!includeBlocks)return 'Loaded '+name+' (blocks excluded)';
    const r=String(rotation||'0_degrees').toLowerCase(), turn=r.includes('90')?1:r.includes('180')?2:r.includes('270')?3:0;
    const mirrorRaw=String(mirror||'none').toLowerCase(), mir=({'0':'none','1':'x','2':'z','3':'xz'})[mirrorRaw]||mirrorRaw;
    const mirrorX=mir==='x'||mir==='xz', mirrorZ=mir==='z'||mir==='xz';
    const rotateDir=(direction)=>{ if(!Number.isInteger(direction)||direction<0||direction>5)return direction; let d=direction;
      if(mirrorX){if(d===0)d=1;else if(d===1)d=0;}
      if(mirrorZ){if(d===4)d=5;else if(d===5)d=4;}
      for(let i=0;i<turn;i++){if(d===0)d=4;else if(d===4)d=1;else if(d===1)d=5;else if(d===5)d=0;}
      return d;
    };
    const transformSourceState=(b,state)=>{
      const raw=clone(b.sourceState||{});
      if(!turn&&!mirrorX&&!mirrorZ)return raw;
      const n=b.name;
      if(['piston','sticky_piston'].includes(n)&&Number.isInteger(state.facing))raw.facing_direction=PISTON_DIR_TO_FACING[state.facing];
      else if(n==='piston_head'&&Number.isInteger(state.facing))raw.facing_direction=PISTON_HEAD_DIR_TO_FACING[state.facing];
      else if(n==='barrel'&&Number.isInteger(state.facing))raw.facing_direction=BARREL_DIR_TO_FACING[state.facing];
      else if(n==='dropper'&&Number.isInteger(state.facing))raw.facing_direction=DIR_TO_BEDROCK_FACING[state.facing];
      else if(n==='observer'&&Number.isInteger(state.facing))raw['minecraft:facing_direction']=NAMES[state.facing];
      else if((n==='repeater'||n==='comparator')&&Number.isInteger(state.facing))raw['minecraft:cardinal_direction']=NAMES[state.facing^1];
      else if(BUTTON_TYPES.has(n)&&Number.isInteger(state.attach))raw.facing_direction=DIR_TO_BEDROCK_FACING[state.attach^1];
      else if(n==='redstone_torch'&&Number.isInteger(state.attach))raw.torch_facing_direction=({0:'west',1:'east',2:'bottom',3:'top',4:'north',5:'south'})[state.attach]||'top';
      else if(n==='lever'&&Number.isInteger(state.attach)){
        const old=String(raw.lever_direction||'up_east_west');
        if(/^(up|down)_/.test(old)){
          const mount=old.startsWith('down')?'down':'up',axis=old.endsWith('north_south')?'north_south':'east_west';
          raw.lever_direction=mount+'_'+((turn%2)?(axis==='north_south'?'east_west':'north_south'):axis);
        }else raw.lever_direction=({0:'west',1:'east',4:'north',5:'south'})[state.attach]||old;
      }
      return raw;
    };
    let count=0;
    for(const b of s.blocks){ let [x,y,z]=b.pos; if(mirrorX)x=s.size[0]-1-x; if(mirrorZ)z=s.size[2]-1-z;
      let nx=x,nz=z; if(turn===1){nx=s.size[2]-1-z;nz=x;}else if(turn===2){nx=s.size[0]-1-x;nz=s.size[2]-1-z;}else if(turn===3){nx=z;nz=s.size[0]-1-x;}
      const state=clone(b.state||{}); if(Number.isInteger(state.facing))state.facing=rotateDir(state.facing); if(Number.isInteger(state.attach))state.attach=rotateDir(state.attach);
      const sourceState=transformSourceState(b,state);
      const p=[origin[0]+nx,origin[1]+y,origin[2]+nz]; this.setBlockAt(p,b.name,state,true,sourceState,b.sourceType); this.recordAuthoredAt(p,b.name,sourceState,b.sourceType); count++; }
    this.notifyTouched(); this.flush(); return 'Loaded '+name+' ('+count+' blocks)';
  }
  saveStructure(name,a,b,includeBlocks=true) { const lo=a.map((v,i)=>Math.min(v,b[i])),hi=a.map((v,i)=>Math.max(v,b[i])); const size=lo.map((v,i)=>hi[i]-v+1); const volume=size[0]*size[1]*size[2]; if(volume>LIMIT)throw new Error('Too many structure cells ('+volume+' > '+LIMIT+')'); const blocks=[]; if(includeBlocks)for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){ const old=this.authoredBlocks.get(key([x,y,z])); blocks.push({pos:[x-lo[0],y-lo[1],z-lo[2]],name:old?(old.sourceType||old.type):'air',state:old?clone(old.state):{}}); } this.addStructure(name,{size,blocks}); return 'Saved structure '+name+' ('+(includeBlocks?volume:0)+' blocks'+(includeBlocks?'':' excluded')+')'; }
  ctx(p, b) { const w = this; return { w, p, b, state:b.state,
    input:d => w.emitted(add(p, d), opp(d)),
    setState(patch) {
      let changed = false;
      for (const k of Object.keys(patch)) if (!Object.is(b.state[k], patch[k])) { changed = true; break; }
      if (!changed) return;
      Object.assign(b.state, patch); w.dirty.add(key(p)); w.notifyAround(p);
    },
    schedule(dl, tag, replace) { w.schedule(p, b.type, dl, tag, replace); } }; }
  hasSchedule(p, tag) { return this.sset.has(key(p)+'|'+tag); }
  cancelSchedule(p, tag) {
    const k = key(p)+'|'+tag;
    if (!this.sset.has(k)) return;
    this.sset.delete(k); this.schedCurrent.delete(k);
    this.sched = this.sched.filter(e => !(key(e.p)+'|'+e.tag === k));
  }
  schedule(p, type, dl, tag, replace) { const k = key(p)+'|'+tag;
    if (replace) this.cancelSchedule(p, tag);
    else if (this.sset.has(k)) return;
    const id = ++this.scheduleSeq; this.sset.add(k); this.schedCurrent.set(k,id);
    this.sched.push({ t:this.time + Math.max(1, Math.trunc(Number(dl)||1)), p, type, tag, id }); }
  repeaterLocked(p, facing) {
    if (!Number.isInteger(facing)) return false;
    for (const d of sides(facing)) {
      const source = this.getp(add(p, d)); if (!source || source.state.facing !== opp(d)) continue;
      if (source.type === 'repeater' && source.state.powered) return true;
      if (source.type === 'comparator' && Number(source.state.out) > 0) return true;
    }
    return false;
  }

  
  emitted(n, dTo) { const b = this.getp(n); if (!b) return 0;
    let p = b.def.weak ? b.def.weak(this.ctx(n, b), dTo) : 0;
    if (cond(b)) p = Math.max(p, this.strongInto(n)); return p; }
  strongInto(n) { let m = 0;
    for (let d = 0; d < 6; d++) { const q = add(n, d), o = this.getp(q);
      if (o && o.def.strong) m = Math.max(m, o.def.strong(this.ctx(q, o), opp(d))); }
    return m; }
  sig(p) { const b = this.getp(p); return b ? b.type + JSON.stringify(pub(b.state)) : ''; }

  
  queueUpd(p) { const k = key(p); if (!this.qset.has(k)) { this.qset.add(k); this.q.push(p); } }
  notifyAround(p) { for (let d = 0; d < 6; d++) { const n = add(p, d); this.queueUpd(n);
    if (this.isSolid(n)) for (let e = 0; e < 6; e++) this.queueUpd(add(n, e)); } }
  notifyTouched() { const t = this.touched; this.touched = []; for (const p of t) { this.queueUpd(p); this.notifyAround(p); } }
  supportPos(p,b) {
    if (b.type==='redstone_wire'||b.type==='repeater'||b.type==='comparator') return add(p,3);
    if (b.type==='lever'||BUTTON_TYPES.has(b.type)||b.type==='redstone_torch') {
      const d=Number.isInteger(b.state.attach)&&b.state.attach>=0&&b.state.attach<=5?b.state.attach:3; return add(p,d);
    }
    return null;
  }
  survives(p,b) {
    const support=this.supportPos(p,b); if(!support)return true;
    const base=this.getp(support);
    
    
    return !!(base&&base.def&&(base.def.solid||base.type==='glass'||base.type==='daylight_detector'));
  }
  flush() { let n = 0;
    while (this.qh < this.q.length && n++ < 400000) { const p = this.q[this.qh++]; this.qset.delete(key(p));
      const b = this.getp(p);
      if (b && !this.survives(p,b)) {
        const k=key(p);this.blocks.delete(k);this.dirty.add(k);this.events.push({ok:false,level:'warn',cmd:'Support',msg:'Removed '+b.type+' @ '+p.join(' ')+' (no support)'});this.notifyAround(p);continue;
      }
      if (b && b.def.onNeighbor) b.def.onNeighbor(this.ctx(p, b)); }
    this.q = []; this.qh = 0; this.qset.clear(); }

  setBlockAt(p, type, state, silent, sourceState, sourceType, sourceCommand) { const k = key(p), old = this.blocks.get(k);
    if (type === 'air') { if (!old) return; this.blocks.delete(k); }
    else this.blocks.set(k, new Block(type, state, sourceState, sourceType, sourceCommand===undefined?(this.activeSourceCommand||''):sourceCommand));
    this.dirty.add(k); if (silent) this.touched.push(p); else { this.queueUpd(p); this.notifyAround(p); } }
  moveBlock(from, to) { const b = this.getp(from); this.blocks.delete(key(from)); this.blocks.set(key(to), b);
    this.dirty.add(key(from)); this.dirty.add(key(to)); this.moves.push([...from, ...to]); this.touched.push(from, to); }
  pushEntitiesForPiston(movingPositions,direction,headPosition) {
    if(!this.entities.size)return;
    const vec=DIRS[direction],fromSet=new Set((movingPositions||[]).map(key)),destSet=new Set((movingPositions||[]).map(p=>key(add(p,direction))));
    if(headPosition)destSet.add(key(headPosition));
    for(const entity of this.entities.values()){
      const e=entity.pos,cell=[Math.round(e[0]),Math.floor(e[1]+0.001),Math.round(e[2])];
      const support=[cell[0],Math.round(e[1]-1),cell[2]];
      const riding=fromSet.has(key(support)) && Math.abs(e[1]-(support[1]+1))<0.3;
      if(riding){e.pos=[e.pos[0]+vec[0],e.pos[1]+vec[1],e.pos[2]+vec[2]];this.entitiesDirty=true;continue;}
      const overlapped=Array.from(destSet).some(k=>{const c=k.split(',').map(Number);return Math.abs(e[0]-c[0])<0.46&&Math.abs(e[2]-c[2])<0.46&&e[1]+1.2>=c[1]-0.5&&e[1]-0.5<=c[1]+0.5;});
      if(overlapped){e.pos=[e.pos[0]+vec[0],e.pos[1]+vec[1],e.pos[2]+vec[2]];this.entitiesDirty=true;}
    }
  }
  entityCountOnPlate(p) { return pressurePlateEntityCount(this,p); }
  updateEntityPhysics() {
    for(const entity of this.entities.values()){
      const e=entity.pos;if(!Array.isArray(e)||e.length<3)continue;
      if(!Array.isArray(entity.velocity))entity.velocity=[0,0,0];
      const oldY=Number(e[1])||0;
      entity.velocity[1]=Math.max(-3.92,((Number(entity.velocity[1])||0)-0.08)*0.98);
      const nextY=oldY+entity.velocity[1];const cx=Math.round(e[0]),cz=Math.round(e[2]);let landing=null;
      if(nextY<=oldY){for(const [k,b] of this.blocks){if(!b.def.solid)continue;const p=k.split(',').map(Number);if(p[0]!==cx||p[2]!==cz)continue;const surface=p[1]+1;if(oldY>=surface-0.001&&nextY<=surface+0.001&&(!landing||surface>landing.y))landing={y:surface};}}
      if(landing){e[1]=landing.y;entity.velocity[1]=0;}else e[1]=nextY;
      if(Math.abs(e[1]-oldY)>0.0001)this.entitiesDirty=true;
    }
    for(const [k,b] of this.blocks){
      if(!PRESSURE_PLATE_TYPES.has(b.type))continue;
      const p=k.split(',').map(Number),count=this.entityCountOnPlate(p);
      if(count>0){
        if(!b.state.pressed){b.state.pressed=true;this.dirty.add(k);this.notifyAround(p);}
        if(!this.hasSchedule(p,'p'))this.schedule(p,b.type,5,'p',false);
      } else if(b.state.pressed&&!this.hasSchedule(p,'p')) this.schedule(p,b.type,5,'p',false);
    }
  }

  
  slimeMoveGroup(seedPositions, excluded=[]) {
    const blocked=new Set(excluded.map(p=>key(p))), moved=new Map();
    for(const p of seedPositions){const k=key(p);if(blocked.has(k)||moved.has(k))continue;const b=this.getp(p);if(!b)continue;if(b.def.pushable!=='push'||b.state.extended)return null;moved.set(k,p.slice());}
    const stickyType=b=>b&&(['slime','honey_block'].includes(b.type))?b.type:null;
    const sticks=(sticky,other)=>{
      if(!sticky||!other||['glazed_terracotta','heavy_core'].includes(other.type))return false;
      if(sticky==='slime'&&other.type==='honey_block')return false;
      if(sticky==='honey_block'&&other.type==='slime')return false;
      return other.def.pushable==='push'&&!other.state.extended;
    };
    const queue=Array.from(moved.values());let head=0;
    while(head<queue.length){
      const p=queue[head++],current=this.getp(p),sticky=stickyType(current);
      for(let d=0;d<6;d++){
        const q=add(p,d),k=key(q);if(blocked.has(k)||moved.has(k))continue;
        const b=this.getp(q);if(!b)continue;
        const neighborSticky=stickyType(b);
        if(sticky&&sticks(sticky,b)){
          moved.set(k,q.slice());queue.push(q);
        }else if(neighborSticky&&sticks(neighborSticky,current)){
          moved.set(k,q.slice());queue.push(q);
        }else continue;
        if(moved.size>12)return null;
      }
    }
    return Array.from(moved.values());
  }
  moveGroup(positions, direction, extraDestroy=[], excluded=[]) {
    const blocked=new Set((excluded||[]).map(key)),moving=new Map(),destroy=new Map((extraDestroy||[]).map(p=>[key(p),p.slice()]));
    for(const p of positions||[]){const k=key(p),b=this.getp(p);if(b&&!moving.has(k))moving.set(k,p.slice());}
    if(moving.size>12)return false;
    const stickyType=b=>b&&(['slime','honey_block'].includes(b.type))?b.type:null;
    const sticks=(sticky,other)=>{
      if(!sticky||!other||['glazed_terracotta','heavy_core'].includes(other.type))return false;
      if(sticky==='slime'&&other.type==='honey_block')return false;
      if(sticky==='honey_block'&&other.type==='slime')return false;
      return other.def.pushable==='push'&&!other.state.extended;
    };
    const queue=Array.from(moving.values());let head=0;
    while(head<queue.length){
      const p=queue[head++],block=this.getp(p);if(!block||block.state.extended)return false;
      const sticky=stickyType(block);
      for(let side=0;side<6;side++){
        const q=add(p,side),k=key(q);if(blocked.has(k)||moving.has(k)||destroy.has(k))continue;
        const adjacent=this.getp(q);if(!adjacent)continue;
        const neighborSticky=stickyType(adjacent);
        if(sticky&&sticks(sticky,adjacent)){
          moving.set(k,q.slice());queue.push(q);
        }else if(neighborSticky&&sticks(neighborSticky,block)){
          moving.set(k,q.slice());queue.push(q);
        }else continue;
        if(moving.size>12)return false;
      }
      const dest=add(p,direction),dk=key(dest);if(moving.has(dk))continue;
      const blocker=this.getp(dest);if(!blocker)continue;
      if(blocker.def.pushable==='destroy'){destroy.set(dk,dest);continue;}
      if(blocker.def.pushable!=='push'||blocker.state.extended)return false;
      moving.set(dk,dest.slice());queue.push(dest);if(moving.size>12)return false;
    }
    const movingPositions=Array.from(moving.values());
    this.pushEntitiesForPiston(movingPositions,direction,null);
    for(const p of destroy.values())if(!moving.has(key(p)))this.setBlockAt(p,'air',null,true);
    movingPositions.sort((a,b)=>(b[0]*DIRS[direction][0]+b[1]*DIRS[direction][1]+b[2]*DIRS[direction][2])-(a[0]*DIRS[direction][0]+a[1]*DIRS[direction][1]+a[2]*DIRS[direction][2]));
    for(const p of movingPositions)this.moveBlock(p,add(p,direction));
    return true;
  }
  extend(p, b, sticky) {
    const f=b.state.facing,line=[];let q=add(p,f),destroy=[];
    
    for(;;){const o=this.getp(q);if(!o)break;const pr=o.def.pushable;
      if(pr==='destroy'){destroy.push(q);break;}
      if(pr!=='push'||o.state.extended)return;
      line.push(q);if(line.length>12)return;q=add(q,f);}
    
    
    
    const group=this.slimeMoveGroup(line,[p]);if(!group||group.length>12)return;
    if(!this.moveGroup(group,f,destroy,[p]))return;
    this.pushEntitiesForPiston([],f,add(p,f));
    this.setBlockAt(add(p,f),'piston_head',{facing:f,sticky},true);
    b.state.extended=true;this.dirty.add(key(p));this.touched.push(p);this.notifyTouched();this.emitSound('piston',{action:'extend',sticky,pos:p.slice()});
  }
  retract(p, b, sticky) {
    const f=b.state.facing,front=add(p,f),h=this.getp(front);
    if(h&&h.type==='piston_head')this.setBlockAt(front,'air',null,true);
    if(sticky){const q=add(front,f),o=this.getp(q);
      if(o&&o.def.pushable==='push'&&o.def.pullable!==false&&!o.state.extended){
        const group=this.slimeMoveGroup([q],[p,front]);
        if(group&&group.length<=12)this.moveGroup(group,f^1,[],[p,front]);
      }
    }
    b.state.extended=false;this.dirty.add(key(p));this.touched.push(p);this.notifyTouched();this.emitSound('piston',{action:'retract',sticky,pos:p.slice()});
  }

  
  wireLinks(p) { const out = [], upOK = !this.isSolid(add(p, 2));
    for (const d of H4) { const n = add(p, d), b = this.getp(n);
      if (b && b.type === 'redstone_wire') { out.push({ pos:n, d, dy:0, net:true }); continue; }
      if (b && ((b.def.connects && b.def.connects(b.state, d)) || b.def.solid)) { out.push({ pos:n, d, dy:0, net:false }); continue; }
      if (upOK) { const u = add(n, 2), ub = this.getp(u); if (ub && ub.type === 'redstone_wire') out.push({ pos:u, d, dy:1, net:true }); }
      if (!(b && cond(b))) { const dn = add(n, 3), db = this.getp(dn); if (db && db.type === 'redstone_wire') out.push({ pos:dn, d, dy:-1, net:true }); } }
    return out; }
  updateWireNet(p0) { const net = new Map(), st = [p0];
    while (st.length) { const p = st.pop(), k = key(p); if (net.has(k)) continue;
      const b = this.getp(p); if (!b || b.type !== 'redstone_wire') continue;
      const links = this.wireLinks(p); net.set(k, { p, b, links, pw:0 });
      for (const l of links) if (l.net) st.push(l.pos); }
    this.wiresOff = true;
    for (const n of net.values()) { let m = 0;
      for (let d = 0; d < 6; d++) { const q = add(n.p, d), o = this.getp(q);
        if (!o || o.type === 'redstone_wire') continue; m = Math.max(m, this.emitted(q, opp(d))); }
      n.pw = m; }
    this.wiresOff = false;
    for (let ch = true; ch;) { ch = false;
      for (const n of net.values()) for (const l of n.links) { if (!l.net) continue; const m = net.get(key(l.pos));
        if (m && m.pw < n.pw - 1) { m.pw = n.pw - 1; ch = true; } } }
    for (const n of net.values()) { const links = n.links.map(l => [l.d, l.dy]), s = n.b.state;
      if (s.power !== n.pw || JSON.stringify(s.links) !== JSON.stringify(links)) {
        s.power = n.pw; s.links = links; this.dirty.add(key(n.p)); this.notifyAround(n.p); } } }

  tick() { this.time++; if (this.daylightCycle) this.dayTime++; this.dayTime=Math.max(0,Math.trunc(this.dayTime)); if(this.time%20===0){this.updateDaylightSensors();this.flush();} this.updateEntityPhysics(); const due = [], rest = [];
    for (const e of this.sched) (e.t <= this.time ? due : rest).push(e); this.sched = rest;
    for (const e of due) { const k=key(e.p)+'|'+e.tag;
      
      if (this.schedCurrent.get(k) !== e.id) continue;
      this.schedCurrent.delete(k); this.sset.delete(k); const b = this.getp(e.p);
      if (b && b.type === e.type && b.def.onTick) { b.def.onTick(this.ctx(e.p, b), e.tag); this.flush(); } } }
  use(p) { const b = this.getp(p); if (!b || !b.def.onUse) return false; b.def.onUse(this.ctx(p, b)); this.flush(); return true; }
  clear() { for (const k of this.blocks.keys()) this.dirty.add(k); this.blocks.clear(); this.authoredBlocks.clear(); this.sched = []; this.sset.clear(); this.schedCurrent.clear(); if(this.entities.size){this.entities.clear();this.entitiesDirty=true;} }
  drain() { const ch = [];
    for (const k of this.dirty) { const b = this.blocks.get(k), [x, y, z] = k.split(',').map(Number);
      ch.push([x, y, z, b ? b.type : 'air', b ? pub(b.state) : null, b ? b.sourceCommand : (this.authoredBlocks.get(k)?.command||'')]); }
    this.dirty.clear(); const moves = this.moves; this.moves = []; const events=this.events; this.events=[]; const sounds=this.sounds;this.sounds=[];return { changes:ch, moves, events, sounds }; }
}


function parseBlock(s) {
  if (!s) throw new Error('Missing block name');
  const m = /^(?:minecraft:)?([a-z0-9_]+)(?:\[([^\]]*)\])?$/i.exec(String(s).trim());
  if (!m) throw new Error('Bad block: ' + s);
  const originalName = m[1].toLowerCase();
  let name = ALIAS[originalName] || originalName;
  if (name !== 'air' && !REG[name]) throw new Error('Unknown block: ' + name);
  const raw = {};
  if (m[2]) for (const entry of m[2].split(',')) {
    if (!entry.trim()) continue;
    const i = entry.indexOf('=');
    if (i < 1) throw new Error('Bad block state: ' + entry);
    const k = entry.slice(0, i).trim().replace(/^['"]|['"]$/g, '');
    let v = entry.slice(i + 1).trim().replace(/^['"]|['"]$/g, '').toLowerCase();
    if (v === 'true' || v === 'false') raw[k] = v === 'true';
    else if (v !== '' && Number.isFinite(Number(v))) raw[k] = Number(v);
    else raw[k] = v;
  }
  if(name==='wool' && raw.color===undefined){const wm=originalName.match(/^([a-z_]+)_wool$/);if(wm)raw.color=wm[1];}
  const sourceState = canonicalBedrockStates(name, raw, originalName);
  const state = runtimeStateFromBedrock(name, sourceState, raw, originalName);
  if (name === 'repeater' && state.delay !== undefined) state.delay = Math.max(1,Math.min(4,Math.trunc(Number(state.delay)||1)));
  
  const sourceType = (['powered_repeater','unpowered_repeater','powered_comparator','unpowered_comparator','lit_redstone_lamp','unlit_redstone_torch','daylight_detector_inverted'].includes(originalName)) ? originalName : name;
  return { name, state, sourceState, sourceType:name==='wool'?'wool':sourceType };
}
function coords(t, i) { const r = [];
  for (let k = 0; k < 3; k++) { const s = t[i + k]; if (s === undefined || !/^~?-?\d*\.?\d*$/.test(s) || s === '' ) throw new Error('Expected coordinates (x y z)');
    r.push(Math.floor(s === '~' ? 0 : parseFloat(s.replace('~', '')))); }
  return r; }
function normalizeCompactRelativeCoordinates(line) {
  return String(line||'').replace(/(~[+-]?(?:\d+(?:\.\d*)?|\.\d+)?)(?=~)/g,'$1 ');
}
function entityCoords(t,i) { const r=[]; for(let k=0;k<3;k++){const token=t[i+k];if(token===undefined||!/^~(?:-?(?:\d+(?:\.\d*)?|\.\d+))?$|^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token))throw new Error('Expected coordinates (x y z)');const relative=token.startsWith('~'),n=relative?token.slice(1):token;r.push(n===''?0:Number(n));}return r;}
const LIMIT = 65536;
function exec(w, line, onProgress) {
  const previousCommand=w.activeSourceCommand;w.activeSourceCommand=String(line||'').trim();
  try { return execLineWithSource(w,line,onProgress); } finally { w.activeSourceCommand=previousCommand||null; }
}
function execLineWithSource(w, line, onProgress) {
  const t = normalizeCompactRelativeCoordinates(line.trim().replace(/\[[^\]]*\]/g, m => m.replace(/\s+/g, ''))).replace(/^\//, '').trim().split(/\s+/);
  const cmd = t.shift().toLowerCase(); let msg = '';
  switch (cmd) {
    case 'setblock': { const p = coords(t, 0), b = parseBlock(t[3]), mode = t[4] || 'replace';
      if (mode === 'keep' && w.getp(p)) { msg = 'Block already there'; break; }
      w.setBlockAt(p, b.name, b.state, true, b.sourceState, b.sourceType); w.recordAuthoredAt(p,b.name,b.sourceState,b.sourceType); w.notifyTouched(); msg = 'Changed block at ' + p.join(' '); break; }
    case 'fill': { const a = coords(t, 0), b = coords(t, 3), bl = parseBlock(t[6]), mode = (t[7] || 'replace').toLowerCase();
      const filter = mode === 'replace' && t[8] ? parseBlock(t[8]).name : null;
      const lo = a.map((v, i) => Math.min(v, b[i])), hi = a.map((v, i) => Math.max(v, b[i]));
      const vol = (hi[0]-lo[0]+1) * (hi[1]-lo[1]+1) * (hi[2]-lo[2]+1);
      if (vol > LIMIT) throw new Error('Too many blocks (' + vol + ' > ' + LIMIT + ')');
      let n = 0, visited=0; const reportStep=Math.max(1,Math.ceil(vol/50));
      for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
        const p = [x, y, z], old = w.getp(p), shell = x === lo[0] || x === hi[0] || y === lo[1] || y === hi[1] || z === lo[2] || z === hi[2];
        visited++;
        if(onProgress&&visited%reportStep===0)onProgress(.85*visited/vol);
        let name = bl.name;
        if (mode === 'keep' && old) continue;
        if (filter !== null && (old ? old.type : 'air') !== (ALIAS[filter] || filter)) continue;
        if (mode === 'hollow' && !shell) name = 'air';
        if (mode === 'outline' && !shell) continue;
        w.setBlockAt(p, name, name === 'air' ? null : bl.state, true, name === 'air' ? null : bl.sourceState, name === 'air' ? 'air' : bl.sourceType); w.recordAuthoredAt(p,name,name==='air'?null:bl.sourceState,name==='air'?'air':bl.sourceType); n++; }
      if(onProgress)onProgress(.85); w.notifyTouched(); msg = 'Filled ' + n + ' block(s)'; break; }
    case 'clone': { const a = coords(t, 0), b = coords(t, 3), d = coords(t, 6), mask = t[9] === 'masked', move = t[10] === 'move';
      const lo = a.map((v, i) => Math.min(v, b[i])), hi = a.map((v, i) => Math.max(v, b[i]));
      const vol = (hi[0]-lo[0]+1) * (hi[1]-lo[1]+1) * (hi[2]-lo[2]+1);
      if (vol > LIMIT) throw new Error('Too many blocks (' + vol + ' > ' + LIMIT + ')');
      const snap = [];
      for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
        const o = w.getp([x, y, z]); snap.push([x-lo[0], y-lo[1], z-lo[2], o ? o.type : 'air', o ? clone(o.state) : null, [x, y, z], o ? clone(o.sourceState) : null, o ? o.sourceType : null]); }
      if (move) for (const s of snap) { w.setBlockAt(s[5], 'air', null, true); w.recordAuthoredAt(s[5],'air',null,'air'); }
      let n = 0;
      for (const s of snap) { if (mask && s[3] === 'air') continue;
        const st = s[4]; if (st) delete st._s;
        const dest=[d[0]+s[0],d[1]+s[1],d[2]+s[2]];
        w.setBlockAt(dest, s[3], st, true, s[6], s[7]); w.recordAuthoredFromWorld(dest); n++; }
      w.notifyTouched(); msg = 'Cloned ' + n + ' block(s)'; break; }
    case 'structure': {
      const sub=(t.shift()||'').toLowerCase(), isBool=v=>/^(true|false|0|1)$/i.test(String(v));
      const asBool=(v,fallback=true)=>v===undefined?fallback:!/^(false|0)$/i.test(String(v));
      if(sub==='load') {
        const name=t.shift(), p=coords(t,0), rotation=t[3]||'0_degrees', mirror=t[4]||'none';
        const tail=t.slice(5); let includeBlocks=true;
        if(tail[0]==='block_by_block'||tail[0]==='layer_by_layer') includeBlocks=asBool(tail[3],true);
        else if(isBool(tail[0])) includeBlocks=asBool(tail[1],true);
        else if(isBool(tail[1])) includeBlocks=asBool(tail[1],true);
        msg=w.loadStructure(name,p,rotation,mirror,includeBlocks);
      }
      else if(sub==='save') {
        const name=t.shift(), a=coords(t,0), b=coords(t,3), o1=t[6], o2=t[7], o3=t[8]; let includeBlocks=true;
        
        
        if(isBool(o1)) includeBlocks=isBool(o2)&&!['disk','memory'].includes(String(o2).toLowerCase())?asBool(o2,true):(String(o2).toLowerCase()==='disk'||String(o2).toLowerCase()==='memory'?asBool(o3,true):asBool(o2,true));
        else if(o1!==undefined&&['disk','memory'].includes(String(o1).toLowerCase())) includeBlocks=isBool(o3)?asBool(o3,true):asBool(o2,true);
        else if(isBool(o2)) includeBlocks=asBool(o2,true);
        msg=w.saveStructure(name,a,b,includeBlocks);
      }
      else if(sub==='delete') { const name=t.shift(); if(!w.structures.delete(name))throw new Error('Unknown structure: '+name); msg='Deleted structure '+name; }
      else throw new Error('Usage: /structure <save|load|delete> ...');
      break;
    }
    case 'summon': { const entityType=String(t[0]||'').toLowerCase().replace(/^minecraft:/,''); if(entityType!=='armor_stand')throw new Error('Only summon armor_stand is supported.'); if(t.length!==4)throw new Error('Usage: /summon armor_stand <x> <y> <z>'); const p=entityCoords(t,1);const e=w.summonEntity(entityType,p);msg='Summoned armor_stand at '+p.join(' ')+' ('+e.id+')';break; }
    case 'kill': { if(t.length!==1||String(t[0]).toLowerCase()!=='@e')throw new Error('Only /kill @e is supported.'); const n=w.killAllEntities();msg='Killed '+n+(n===1?' entity':' entities');break; }
    case 'time': {
      const sub=String(t.shift()||'').toLowerCase();
      const specs={day:1000,sunrise:23000,noon:6000,sunset:12000,night:13000,midnight:18000};
      const formatTime=value=>{const ticks=((Math.trunc(Number(value)||0)%24000)+24000)%24000;const minutes=Math.floor(((ticks+6000)%24000)*1440/24000);return String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');};
      if(sub==='set') {
        const raw=String(t[0]===undefined?'':t[0]).toLowerCase();
        if(Object.prototype.hasOwnProperty.call(specs,raw)){
          const target=specs[raw],current=((w.dayTime%24000)+24000)%24000;w.dayTime+=((target-current+24000)%24000);msg='Time advanced to '+raw+' ('+formatTime(w.dayTime)+')';
        }else if(/^-?\d+$/.test(raw)){
          const n=Number(raw);if(!Number.isSafeInteger(n)||n<0)throw new Error('Time ticks must be a non-negative integer.');w.dayTime=n;msg='Time set to '+n+' ticks ('+formatTime(w.dayTime)+')';
        }else throw new Error('Usage: /time set <ticks|day|sunrise|noon|sunset|night|midnight>');
      }else if(sub==='add'){
        const raw=String(t[0]===undefined?'':t[0]);if(!/^-?\d+$/.test(raw))throw new Error('Usage: /time add <integer>');const amount=Number(raw);if(!Number.isSafeInteger(amount))throw new Error('Time amount must be a safe integer.');w.dayTime=Math.max(0,w.dayTime+amount);msg='Added '+amount+' time ticks ('+formatTime(w.dayTime)+')';
      }else if(sub==='query'){
        const query=String(t[0]||'').toLowerCase();let value;if(query==='daytime')value=((w.dayTime%24000)+24000)%24000;else if(query==='gametime')value=w.time;else if(query==='day')value=Math.floor(w.dayTime/24000);else throw new Error('Usage: /time query <daytime|gametime|day>');msg=query+' = '+value;
      }else throw new Error('Usage: /time <set|add|query> ...');
      break;
    }
    case 'gamerule': {
      const rule=String(t[0]||'').toLowerCase();if(rule!=='dodaylightcycle')throw new Error('Only gamerule doDaylightCycle is supported.');
      if(t.length===1){msg='doDaylightCycle = '+w.daylightCycle;break;}
      const value=String(t[1]).toLowerCase();if(!['true','false','0','1'].includes(value))throw new Error('Usage: /gamerule doDaylightCycle <true|false>');
      w.daylightCycle=value==='true'||value==='1';msg='doDaylightCycle = '+w.daylightCycle;break;
    }
    case 'clear': throw new Error('Minecraft /clear clears player inventory; inventory simulation is unavailable. Use the Clear world button to clear this editor.');
    default: throw new Error('Unknown command: ' + cmd);
  }
  if(cmd==='time'||cmd==='gamerule')w.updateDaylightSensors(true);
  w.flush(); if(typeof onProgress==='function')onProgress(1); return msg;
}
function scriptTasks(src) { const tasks=[];
  for (let raw of String(src||'').split(/\r?\n/)) { raw=raw.trim(); if(!raw||raw[0]==='#'||raw.startsWith('//'))continue;
    for(const seg of raw.split(/\s+(?=\/[a-z])/i)){const command=seg.trim();if(command)tasks.push(command);} }
  return tasks;
}
function runScript(w, src) { const logs = [];
  for(const seg of scriptTasks(src)){try{logs.push({ok:true,cmd:seg,msg:exec(w,seg)});}catch(e){logs.push({ok:false,cmd:seg,msg:e.message});}}
  return logs;
}


async function runScriptAsync(w,src,onProgress) {
  const tasks=scriptTasks(src),logs=[];
  if(typeof onProgress==='function')onProgress({completed:0,total:tasks.length,percent:tasks.length?0:100});
  for(let i=0;i<tasks.length;i++){
    const seg=tasks[i];
    const report=fraction=>{if(typeof onProgress==='function'){const done=i+Math.max(0,Math.min(1,Number(fraction)||0));onProgress({completed:done,total:tasks.length,percent:Math.round(done/tasks.length*100)});}};
    try{logs.push({ok:true,cmd:seg,msg:exec(w,seg,report)});}catch(e){logs.push({ok:false,cmd:seg,msg:e.message});}
    report(1);
    
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  return logs;
}


function createHost(post) {
  const w = new World(); let ms = 50, timer = null, paused = false, running = false;
  const out = () => {
    if(w.entitiesDirty){w.entitiesDirty=false;post({type:'entities',entities:w.entitySnapshot()});}
    const d = w.drain();
    if(d.events.length)post({type:'log',logs:d.events});
    if(d.sounds.length)for(const sound of d.sounds)post({type:'sound',sound});
    if (d.changes.length) {
      const packetSize=1200,tick=w.time,count=w.blocks.size,dayTime=w.dayTime,daylightCycle=w.daylightCycle;
      for(let i=0;i<d.changes.length;i+=packetSize)post({type:'diff',changes:d.changes.slice(i,i+packetSize),moves:[],tick,count,dayTime,daylightCycle});
    } else post({ type:'stat', tick:w.time, count:w.blocks.size, dayTime:w.dayTime, daylightCycle:w.daylightCycle }); };
  const start = () => { clearInterval(timer); timer = setInterval(() => { if (!paused && !running) { w.tick(); out(); } }, ms); };
  return { world:w, start, handle(m) {
    switch (m.type) {
      case 'run': {
        if(running){post({type:'log',logs:[{ok:false,cmd:'Run',msg:'Build already in progress'}]});break;}
        running=true;
        const before = new Map(w.structures);
        runScriptAsync(w,m.source,p=>post({type:'progress',...p,label:'Building...'})).then(logs=>{
          post({type:'log',logs});
          
          for (const [name, structure] of w.structures) {
            if (!before.has(name) || before.get(name) !== structure) post({type:'structureAdded',name,size:structure.size,blocks:structure.blocks.length,structure});
          }
          for (const name of before.keys()) if (!w.structures.has(name)) post({type:'structureRemoved',name});
          running=false;out();post({type:'runComplete'});
        }).catch(err=>{running=false;post({type:'log',logs:[{ok:false,cmd:'Run',msg:String(err&&err.message||err)}]});out();post({type:'runComplete'});});
        break;
      }
      case 'use': if(!running){w.use([m.x, m.y, m.z]);out();} break;
      case 'tickrate': ms = Math.max(10, Math.min(1000, +m.ms || 100)); start(); break;
      case 'daylightCycle': w.daylightCycle=!!m.enabled; out(); break;
      case 'pause': paused = true; break;
      case 'resume': paused = false; break;
      case 'step': if(!running){for (let i = 0; i < (m.n || 1); i++) w.tick(); out();} break;
      case 'clear': if(!running){w.clear(); out();} break;
      case 'addStructure': { try { const normalized=w.addStructure(m.name,m.structure); const name=String(m.name||m.structure?.name||'').trim().replace(/^\//,''); post({type:'structureAdded',name,size:normalized.size,blocks:normalized.blocks.length,structure:normalized}); } catch(e) { post({type:'log',logs:[{ok:false,cmd:'Add structure '+(m.name||''),msg:e.message}]}); } break; }
      case 'removeStructure': { const name=String(m.name||'').trim(); if(w.structures.delete(name)) post({type:'structureRemoved',name}); else post({type:'log',logs:[{ok:false,cmd:'Remove structure '+name,msg:'Unknown structure: '+name}]}); break; }
      case 'snapshot': { const blocks=w.authoredSnapshot(); post({type:'snapshot',format:m.format||'mcstructure',blocks,tick:w.time,count:blocks.length}); break; }
      case 'listStructures': post({type:'structureList',structures:Array.from(w.structures.entries()).map(([name,structure])=>({name,structure}))}); break;
    } } };
}
function catalog(includeAll=false) {
  const visible = new Set([
    'air','stone','iron_block','glass','obsidian','wool','redstone_block','redstone_wire','redstone_torch',
    'redstone_lamp','daylight_detector','lever','repeater','comparator','observer','piston','sticky_piston','dropper','barrel',
    'noteblock','slime','honey_block',...NOTEBLOCK_SUPPORT_BLOCKS,
    ...BUTTON_TYPES,...PRESSURE_PLATE_TYPES
  ]);
  return [...new Set(Object.keys(REG).concat('air'))].filter(name => includeAll || visible.has(name)).sort().map(name => {
    const d=REG[name] || {description:'Removes a block.',bedrockStates:BEDROCK_STATE_SCHEMA.air}, states=d.bedrockStates || {};
    const commandNames = name==='wool' ? ['wool',...WOOL_COLORS.map(color=>color+'_wool')]
      : name==='repeater' ? ['unpowered_repeater','powered_repeater']
      : name==='comparator' ? ['unpowered_comparator','powered_comparator']
      : name==='redstone_torch' ? ['redstone_torch','unlit_redstone_torch']
      : name==='redstone_lamp' ? ['redstone_lamp','lit_redstone_lamp']
      : name==='daylight_detector' ? ['daylight_detector','daylight_detector_inverted','daylight_sensor']
      : name==='piston_head' ? ['piston_arm_collision'] : [name];
    return { name, id:'minecraft:'+(name==='piston_head'?'piston_arm_collision':name), commandNames:name==='air'?['air']:commandNames,
      description:d.description || name.replace(/_/g,' '),
      states:Object.entries(states).map(([key,values])=>({key,values:Array.isArray(values)?values.slice():values})) };
  });
}
function defineBlock(name, definition) { return def(String(name).replace(/^minecraft:/,''), definition || {}); }
function onCatalogChange(listener) { if (typeof listener!=='function') return () => {}; CATALOG_LISTENERS.add(listener); return () => CATALOG_LISTENERS.delete(listener); }
root.RedstoneEngine = { World, createHost, runScript, runScriptAsync, exec, parseBlock, catalog, catalogAll:()=>catalog(true), directions:NAMES.slice(), defineBlock, onCatalogChange };
})(typeof self !== 'undefined' ? self : this);
