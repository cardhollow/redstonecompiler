
(function (root) {
'use strict';
const VERSION = 18168865; 
const TYPE = { end:0, byte:1, short:2, int:3, long:4, float:5, double:6, byteArray:7, string:8, list:9, compound:10, intArray:11, longArray:12 };
const encoder = new TextEncoder();
class Writer {
  constructor(){ this.a=[]; }
  u8(v){ this.a.push(v & 255); }
  i16(v){ v=Number(v)||0; this.u8(v); this.u8(v>>8); }
  i32(v){ v=Number(v)||0; this.u8(v); this.u8(v>>8); this.u8(v>>16); this.u8(v>>24); }
  f32(v){ const b=new ArrayBuffer(4); new DataView(b).setFloat32(0,v,true); this.bytes(new Uint8Array(b)); }
  bytes(b){ for(const x of b)this.a.push(x); }
  str(s){ const b=encoder.encode(String(s)); this.i16(b.length); this.bytes(b); }
  named(type,name,write){ this.u8(type); this.str(name); write(); }
  stringTag(name,value){ this.named(TYPE.string,name,()=>this.str(value)); }
  intTag(name,value){ this.named(TYPE.int,name,()=>this.i32(value)); }
  byteTag(name,value){ this.named(TYPE.byte,name,()=>this.u8(value ? 1 : 0)); }
  compoundTag(name,fn){ this.named(TYPE.compound,name,fn); this.u8(TYPE.end); }
  listTag(name,type,values,write){ this.named(TYPE.list,name,()=>{this.u8(type);this.i32(values.length);for(const v of values)write(v);}); }
  intList(name,values){ this.listTag(name,TYPE.int,values,v=>this.i32(v)); }
  rootCompound(fn){ this.u8(TYPE.compound); this.str(''); fn(); this.u8(TYPE.end); return new Uint8Array(this.a); }
}
const DIRECTIONS=['east','west','up','down','south','north'];
const BEDROCK_FACING_TO_DIR=[3,2,5,4,1,0];
const PISTON_FACING_TO_DIR=[3,2,4,5,0,1];
const PISTON_HEAD_FACING_TO_DIR=[2,3,4,5,0,1];
const BARREL_FACING_TO_DIR=[3,2,0,1,4,5];
const DIR_TO_BEDROCK_FACING=[5,4,1,0,3,2];
const PISTON_DIR_TO_FACING=[4,5,1,0,2,3];
const PISTON_HEAD_DIR_TO_FACING=[4,5,0,1,2,3];
const BARREL_DIR_TO_FACING=[2,3,1,0,4,5];
function canonicalName(name){
  let n=String(name||'air').toLowerCase().replace(/^minecraft:/,'');
  const map={redstone:'redstone_wire',wire:'redstone_wire',slime_block:'slime',torch:'redstone_torch',button:'stone_button',lamp:'redstone_lamp',sticky:'sticky_piston',note_block:'noteblock',note:'noteblock',unpowered_repeater:'repeater',powered_repeater:'repeater',unpowered_comparator:'comparator',powered_comparator:'comparator',lit_redstone_lamp:'redstone_lamp',unlit_redstone_torch:'redstone_torch',piston_arm_collision:'piston_head',daylight_sensor:'daylight_detector',daylight_detector_inverted:'daylight_detector'};
  for(const color of ['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'])if(n===color+'_wool')return 'wool';
  return map[n]||n;
}
function stateFor(block){
  const n=canonicalName(block.type||block.name),s=block.state||block.states||{};
  const sourceName=String(block.sourceType||block.type||block.name||n).toLowerCase().replace(/^minecraft:/,'');
  const has=k=>Object.prototype.hasOwnProperty.call(s,k);
  const bool=(...keys)=>{for(const k of keys)if(has(k))return s[k]===true||s[k]===1||String(s[k]).toLowerCase()==='true';return false;};
  const num=(keys,fallback,min=0,max=15)=>{for(const k of keys)if(has(k)&&Number.isFinite(Number(s[k])))return Math.max(min,Math.min(max,Math.trunc(Number(s[k]))));return fallback;};
  const dirFromValue=v=>{if(Number.isInteger(v)&&v>=0&&v<=5)return v;return typeof v==='string'?DIRECTIONS.indexOf(v.toLowerCase()):-1;};
  const facingInternal=()=>{
    if(has('facing')) { const d=dirFromValue(s.facing); if(d>=0)return d; }
    if(has('facing_direction')&&Number.isFinite(Number(s.facing_direction))){
      const fd=Math.max(0,Math.min(5,Math.trunc(Number(s.facing_direction))));
      if(n==='piston'||n==='sticky_piston')return PISTON_FACING_TO_DIR[fd];
      if(n==='piston_head')return PISTON_HEAD_FACING_TO_DIR[fd];
      if(n==='barrel')return BARREL_FACING_TO_DIR[fd];
      return BEDROCK_FACING_TO_DIR[fd];
    }
    const cardinal=s['minecraft:cardinal_direction']??s.cardinal_direction;
    if(typeof cardinal==='string'){const d=DIRECTIONS.indexOf(cardinal.toLowerCase());if(d>=0)return d^1;}
    if(typeof s['minecraft:facing_direction']==='string'){const d=DIRECTIONS.indexOf(s['minecraft:facing_direction'].toLowerCase());if(d>=0)return d;}
    if(n==='piston'||n==='sticky_piston'||n==='dropper'||n==='barrel'||n==='observer')return 3;
    if(n==='piston_head')return 2;
    return 5;
  };
  const facing=facingInternal(), direction=DIRECTIONS[facing]||'north';
  const bedrockFacing=DIR_TO_BEDROCK_FACING[facing];
  const pistonFacing=PISTON_DIR_TO_FACING[facing];
  const pistonHeadFacing=PISTON_HEAD_DIR_TO_FACING[facing];
  const barrelFacing=BARREL_DIR_TO_FACING[facing];
  const out={};
  const byte=(k,v)=>out[k]={type:'byte',value:v?1:0};
  const integer=(k,v)=>out[k]={type:'int',value:Math.trunc(Number(v)||0)};
  const string=(k,v)=>out[k]={type:'string',value:String(v)};
  let id='minecraft:'+n;
  switch(n){
    case 'air': case 'stone': case 'iron_block': case 'obsidian': case 'glass': case 'slime': case 'redstone_block': break;
    case 'wool': {
      const colors=['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'];
      const fromAlias=sourceName.match(/^([a-z_]+)_wool$/);
      const color=String(s.color||(fromAlias&&fromAlias[1])||'white').toLowerCase();
      id='minecraft:'+(colors.includes(color)?color:'white')+'_wool'; break;
    }
    case 'redstone_wire': integer('redstone_signal',num(['redstone_signal','power'],0,0,15)); break;
    case 'daylight_detector':
      if(sourceName==='daylight_detector_inverted')id='minecraft:daylight_detector_inverted';
      integer('redstone_signal',num(['redstone_signal'],0,0,15)); break;
    case 'lever': {
      const attach=has('attach')?Number(s.attach):3;
      const legacy=({0:'west',1:'east',2:'down_east_west',3:'up_east_west',4:'north',5:'south'})[attach]||'up_east_west';
      const allowed=['down_east_west','down_north_south','east','north','south','up_east_west','up_north_south','west'];
      const ld=String(s.lever_direction||legacy).toLowerCase();
      string('lever_direction',allowed.includes(ld)?ld:legacy); byte('open_bit',bool('open_bit','powered')); break;
    }
    case 'stone_button': case 'wooden_button': case 'oak_button': case 'spruce_button': case 'birch_button': case 'jungle_button': case 'acacia_button': case 'dark_oak_button': case 'mangrove_button': case 'cherry_button': case 'bamboo_button': case 'crimson_button': case 'warped_button': case 'pale_oak_button': case 'polished_blackstone_button': {
      let fd;
      if(has('facing_direction'))fd=num(['facing_direction'],1,0,5);
      else if(has('attach'))fd=[5,4,1,0,3,2][(Math.max(0,Math.min(5,Math.trunc(Number(s.attach)||0)))^1)];
      else fd=1;
      integer('facing_direction',fd); byte('button_pressed_bit',bool('button_pressed_bit','powered')); break;
    }
    case 'stone_pressure_plate': case 'wooden_pressure_plate': case 'oak_pressure_plate': case 'spruce_pressure_plate': case 'birch_pressure_plate': case 'jungle_pressure_plate': case 'acacia_pressure_plate': case 'dark_oak_pressure_plate': case 'mangrove_pressure_plate': case 'cherry_pressure_plate': case 'bamboo_pressure_plate': case 'crimson_pressure_plate': case 'warped_pressure_plate': case 'pale_oak_pressure_plate': case 'light_weighted_pressure_plate': case 'heavy_weighted_pressure_plate': case 'polished_blackstone_pressure_plate':
      integer('redstone_signal',num(['redstone_signal'],bool('pressed')?15:0,0,15)); break;
    case 'dropper':
      integer('facing_direction',has('facing_direction')?num(['facing_direction'],bedrockFacing,0,5):bedrockFacing);
      byte('triggered_bit',bool('triggered_bit','triggered')); break;
    case 'redstone_torch': {
      if(sourceName==='unlit_redstone_torch')id='minecraft:unlit_redstone_torch';
      const attach=has('attach')?Number(s.attach):3;
      const derived=({0:'west',1:'east',2:'bottom',3:'top',4:'north',5:'south'})[attach]||'top';
      const allowed=['top','bottom','north','south','east','west'];
      string('torch_facing_direction',allowed.includes(String(s.torch_facing_direction||'').toLowerCase())?s.torch_facing_direction:derived); break;
    }
    case 'repeater': {
      id=sourceName==='powered_repeater'?'minecraft:powered_repeater':'minecraft:unpowered_repeater';
      
      
      const card=s['minecraft:cardinal_direction']??s.cardinal_direction??DIRECTIONS[facing^1];
      string('minecraft:cardinal_direction',['east','west','north','south'].includes(String(card).toLowerCase())?String(card).toLowerCase():'south');
      integer('repeater_delay',num(['repeater_delay'],Math.max(0,Math.min(3,num(['delay'],1,1,4)-1)),0,3)); break;
    }
    case 'comparator': {
      const lit=bool('output_lit_bit','out')||sourceName==='powered_comparator';
      id=lit?'minecraft:powered_comparator':'minecraft:unpowered_comparator';
      const card=s['minecraft:cardinal_direction']??s.cardinal_direction??DIRECTIONS[facing^1];
      string('minecraft:cardinal_direction',['east','west','north','south'].includes(String(card).toLowerCase())?String(card).toLowerCase():'south');
      byte('output_lit_bit',lit); byte('output_subtract_bit',bool('output_subtract_bit','subtract')||String(s.mode||'').toLowerCase()==='subtract'); break;
    }
    case 'redstone_lamp': if(sourceName==='lit_redstone_lamp'||bool('lit'))id='minecraft:lit_redstone_lamp'; break;
    case 'observer': {
      const f=s['minecraft:facing_direction']??s.facing_direction??direction;
      const names=['down','up','north','south','west','east'];
      string('minecraft:facing_direction',names.includes(String(f).toLowerCase())?String(f).toLowerCase():direction);
      byte('powered_bit',bool('powered_bit','powered')); break;
    }
    case 'piston': case 'sticky_piston':
      
      integer('facing_direction',has('facing_direction')?num(['facing_direction'],pistonFacing,0,5):pistonFacing); break;
    case 'piston_head':
      id=bool('sticky')?'minecraft:sticky_piston_arm_collision':'minecraft:piston_arm_collision';
      integer('facing_direction',has('facing_direction')?num(['facing_direction'],pistonHeadFacing,0,5):pistonHeadFacing); break;
    case 'barrel':
      integer('facing_direction',has('facing_direction')?num(['facing_direction'],barrelFacing,0,5):barrelFacing);
      byte('open_bit',bool('open_bit','open')); break;
    case 'noteblock': break; 
    default:
      
      
      for(const [k,v] of Object.entries(s)){
        if(k.startsWith('_')||k==='items'||k==='note'||k==='links'||k==='locked'||k==='extended'||k==='extended_bit'||k==='attach'||k==='facing'||k==='powered'||k==='lit'||k==='out'||k==='delay'||k==='subtract'||k==='mode'||k==='sticky')continue;
        if(typeof v==='boolean')byte(k,v);else if(typeof v==='number')integer(k,v);else if(typeof v==='string')string(k,v);
      }
  }
  return {id: n==='noteblock'?'minecraft:noteblock':id, states:out, items:s.items||block.items||(block.nbt&&block.nbt.Items)||[]};
}
function writeCompoundFields(w,obj){
  for(const [name,t] of Object.entries(obj)){
    if(t.type==='byte')w.byteTag(name,t.value);
    else if(t.type==='int')w.intTag(name,t.value);
    else if(t.type==='string')w.stringTag(name,t.value);
    else if(t.type==='short')w.named(TYPE.short,name,()=>w.i16(t.value));
    else if(t.type==='byteArray')w.named(TYPE.byteArray,name,()=>{w.i32(t.value.length);w.bytes(t.value);});
  }
}
function numberByteTag(w,name,value){w.named(TYPE.byte,name,()=>w.u8(Math.max(0,Math.min(255,Math.trunc(Number(value)||0)))));}
function itemsFor(block){
  const src=block.items||block.state?.items||block.nbt?.Items||[];
  return src.map((it,i)=>({name:String(it.name||it.Name||'minecraft:stone').replace(/^([^:]+)$/,'minecraft:$1'), count:Math.max(1,Math.min(64,Math.trunc(Number(it.count??it.Count??1)||1))), slot:Math.max(0,Math.min(26,Math.trunc(Number(it.slot??it.Slot??i)||0))) }));
}
function encode(blocks, opts={}){
  const filtered=(blocks||[]).map(b=>({pos:(b.pos||[b.x,b.y,b.z]).map(v=>Math.trunc(Number(v)||0)),type:canonicalName(b.type||b.name),sourceType:String(b.sourceType||b.type||b.name||'air').toLowerCase().replace(/^minecraft:/,''),state:b.sourceState||b.state||b.states||{},items:itemsFor({state:b.sourceState||b.state||b.states||{},items:b.items,nbt:b.nbt}),nbt:b.nbt||null}));
  if(!filtered.length)filtered.push({pos:[0,0,0],type:'air',state:{},items:[]});
  let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(const b of filtered)for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],b.pos[i]);hi[i]=Math.max(hi[i],b.pos[i]);}
  const size=lo.map((v,i)=>hi[i]-v+1),volume=size[0]*size[1]*size[2];
  if(volume>1048576)throw new Error('Structure is too large to export ('+volume+' cells).');
  const blockMap=new Map();for(const b of filtered)blockMap.set(b.pos.join(','),b);
  const palette=[], paletteMap=new Map(), indices=[],posData={};
  const paletteIndex=b=>{
    const shaped=stateFor(b), key=JSON.stringify([shaped.id,shaped.states]);
    if(!paletteMap.has(key)){paletteMap.set(key,palette.length);palette.push(shaped);}
    return paletteMap.get(key);
  };
  for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
    const b=blockMap.get([x,y,z].join(','));
    indices.push(b?paletteIndex(b):paletteIndex({type:'air',state:{}}));
    if(b&&(b.type==='barrel'||b.type==='noteblock')){
      const pos=(x-lo[0])*size[1]*size[2]+(y-lo[1])*size[2]+(z-lo[2]);
      const common={x:x-lo[0],y:y-lo[1],z:z-lo[2]};
      if(b.type==='barrel') posData[String(pos)]={...common,id:'Barrel',kind:'barrel',Items:itemsFor(b)};
      else posData[String(pos)]={...common,id:'Music',kind:'noteblock',note:Math.max(0,Math.min(24,Math.trunc(Number(b.state?.note??b.nbt?.note??0)||0)))};
    }
  }
  const w=new Writer();
  const bytes=w.rootCompound(()=>{
    w.intTag('format_version',1);w.intList('size',size);
    w.compoundTag('structure',()=>{
      w.listTag('block_indices',TYPE.list,[indices,indices.map(()=>-1)],vals=>{w.u8(TYPE.int);w.i32(vals.length);vals.forEach(v=>w.i32(v));});
      w.listTag('entities',TYPE.compound,[],()=>{});
      w.compoundTag('palette',()=>{
        w.compoundTag('default',()=>{
          w.listTag('block_palette',TYPE.compound,palette,p=>{
            w.stringTag('name',p.id);
            w.compoundTag('states',()=>writeCompoundFields(w,p.states));
            w.intTag('version',VERSION);
            w.u8(TYPE.end);
          });
          w.compoundTag('block_position_data',()=>{
            for(const [index,be] of Object.entries(posData))w.compoundTag(index,()=>{
              w.compoundTag('block_entity_data',()=>{
                w.stringTag('id',be.id||'Barrel'); w.byteTag('isMovable',true);
                w.intTag('x',Number(be.x)||0);w.intTag('y',Number(be.y)||0);w.intTag('z',Number(be.z)||0);
                if(be.kind==='noteblock') numberByteTag(w,'note',be.note||0);
                if(be.kind==='barrel') {
                  const its=Array.isArray(be.Items)?be.Items:[];
                  w.listTag('Items',TYPE.compound,its,it=>{
                    numberByteTag(w,'Count',it.count||it.Count||1);w.stringTag('Name',it.name||it.Name||'minecraft:stone');
                    w.named(TYPE.short,'Damage',()=>w.i16(it.damage||it.Damage||0));numberByteTag(w,'Slot',it.slot??it.Slot??0);w.u8(TYPE.end);
                  });
                }
              });
            });
          });
        });
      });
    });
    w.intList('structure_world_origin',[0,0,0]);
  });
  return {bytes,size,blocks:filtered.length,name:opts.name||'redstone_structure'};
}
function safeName(name){return (String(name||'redstone_structure').replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'')||'redstone_structure').slice(0,80);}
function triggerDownload(bytes,filename,mime='application/octet-stream'){
  const blob=new Blob([bytes],{type:mime});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}
function download(blocks,name){
  const safe=safeName(name),result=encode(blocks,{name:safe});
  triggerDownload(result.bytes,safe+'.mcstructure');return result;
}
function uuid(){
  if(root.crypto&&typeof root.crypto.randomUUID==='function')return root.crypto.randomUUID();
  const bytes=new Uint8Array(16);if(root.crypto&&root.crypto.getRandomValues)root.crypto.getRandomValues(bytes);else for(let i=0;i<16;i++)bytes[i]=Math.random()*256;
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const h=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}
const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=CRC_TABLE[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function zipStore(entries){
  const enc=new TextEncoder(),local=[],central=[];let offset=0;
  const u16=n=>[n&255,(n>>>8)&255],u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
  const append=(arr,src)=>{for(const x of src)arr.push(x);};
  for(const entry of entries){
    const name=enc.encode(entry.name),data=entry.data instanceof Uint8Array?entry.data:new Uint8Array(entry.data),crc=crc32(data);
    const localHeader=[];append(localHeader,u32(0x04034b50));append(localHeader,u16(20));append(localHeader,u16(0));append(localHeader,u16(0));append(localHeader,u16(0));append(localHeader,u16(0x21));append(localHeader,u32(crc));append(localHeader,u32(data.length));append(localHeader,u32(data.length));append(localHeader,u16(name.length));append(localHeader,u16(0));append(localHeader,name);append(localHeader,data);
    append(local,localHeader);
    const ch=[];append(ch,u32(0x02014b50));append(ch,u16(20));append(ch,u16(20));append(ch,u16(0));append(ch,u16(0));append(ch,u16(0));append(ch,u16(0x21));append(ch,u32(crc));append(ch,u32(data.length));append(ch,u32(data.length));append(ch,u16(name.length));append(ch,u16(0));append(ch,u16(0));append(ch,u16(0));append(ch,u16(0));append(ch,u32(0));append(ch,u32(offset));append(ch,name);append(central,ch);offset+=localHeader.length;
  }
  const centralOffset=local.length,centralSize=central.length,end=[];append(end,u32(0x06054b50));append(end,u16(0));append(end,u16(0));append(end,u16(entries.length));append(end,u16(entries.length));append(end,u32(centralSize));append(end,u32(centralOffset));append(end,u16(0));
  return new Uint8Array([...local,...central,...end]);
}
function downloadMcpack(blocks,name){
  const safe=safeName(name),result=encode(blocks,{name:safe});
  const manifest={format_version:2,header:{name:'Redstone Compiler - '+safe,description:'Structure exported by Redstone Compiler. Load it using mystructure:'+safe+'.',uuid:uuid(),version:[1,0,0],min_engine_version:[1,21,60]},modules:[{description:'Redstone Compiler structures',type:'data',uuid:uuid(),version:[1,0,0]}]};
  
  
  const functionName=safe+'/load_structure';
  
  const functionText='structure load mystructure:'+safe+' ~ ~1 ~\n';
  const readme='Redstone Compiler Bedrock Structure Pack\n\nEnable this behavior pack in your world, then run /function '+functionName+' near the place where you want the structure.\nThe function uses player-relative coordinates (~ ~1 ~) so it places one block above your current position instead of targeting world origin.\n\nYou can also run: /structure load mystructure:'+safe+' ~ ~1 ~\n';
  const pack=zipStore([
    {name:'manifest.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2))},
    {name:'structures/'+safe+'.mcstructure',data:result.bytes},
    {name:'functions/'+safe+'/load_structure.mcfunction',data:new TextEncoder().encode(functionText)},
    {name:'README.txt',data:new TextEncoder().encode(readme)}
  ]);
  triggerDownload(pack,safe+'.mcpack','application/zip');return {...result,manifest,structureId:'mystructure:'+safe,functionName};
}


class NBTReader{
  constructor(bytes){this.bytes=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);this.view=new DataView(this.bytes.buffer,this.bytes.byteOffset,this.bytes.byteLength);this.i=0;this.decoder=new TextDecoder();}
  need(n){if(n<0||this.i+n>this.bytes.length)throw new Error('Invalid/truncated NBT in .mcstructure file.');}
  u8(){this.need(1);return this.view.getUint8(this.i++);}
  i8(){this.need(1);return this.view.getInt8(this.i++);}
  i16(){this.need(2);const v=this.view.getInt16(this.i,true);this.i+=2;return v;}
  u16(){this.need(2);const v=this.view.getUint16(this.i,true);this.i+=2;return v;}
  i32(){this.need(4);const v=this.view.getInt32(this.i,true);this.i+=4;return v;}
  f32(){this.need(4);const v=this.view.getFloat32(this.i,true);this.i+=4;return v;}
  f64(){this.need(8);const v=this.view.getFloat64(this.i,true);this.i+=8;return v;}
  i64(){this.need(8);const v=this.view.getBigInt64(this.i,true);this.i+=8;return Number(v);}
  str(){const n=this.u16();this.need(n);const v=this.decoder.decode(this.bytes.subarray(this.i,this.i+n));this.i+=n;return v;}
  payload(type){
    switch(type){
      case 0:return null;case 1:return this.i8();case 2:return this.i16();case 3:return this.i32();case 4:return this.i64();case 5:return this.f32();case 6:return this.f64();
      case 7:{const n=this.i32();if(n<0||n>16777216)throw new Error('Invalid NBT byte array length.');this.need(n);const a=Array.from(this.bytes.subarray(this.i,this.i+n));this.i+=n;return a;}
      case 8:return this.str();
      case 9:{const et=this.u8(),n=this.i32();if(n<0||n>16777216)throw new Error('Invalid NBT list length.');const a=new Array(n);for(let j=0;j<n;j++)a[j]=this.payload(et);return a;}
      case 10:{const o={};for(;;){const t=this.u8();if(t===0)break;const name=this.str();o[name]=this.payload(t);}return o;}
      case 11:{const n=this.i32();if(n<0||n>16777216)throw new Error('Invalid NBT int-array length.');const a=new Array(n);for(let j=0;j<n;j++)a[j]=this.i32();return a;}
      case 12:{const n=this.i32();if(n<0||n>16777216)throw new Error('Invalid NBT long-array length.');const a=new Array(n);for(let j=0;j<n;j++)a[j]=this.i64();return a;}
      default:throw new Error('Unsupported NBT tag type '+type+'.');
    }
  }
  readRoot(){const type=this.u8();if(type!==10)throw new Error('Not a Bedrock .mcstructure NBT file (root is not a compound).');this.str();return this.payload(10);}
}
function parse(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  const reader=new NBTReader(bytes),rootTag=reader.readRoot(),st=rootTag.structure;
  if(!st||!Array.isArray(rootTag.size)||!st.palette?.default?.block_palette||!Array.isArray(st.block_indices))throw new Error('This NBT file is not a valid Bedrock .mcstructure.');
  const size=rootTag.size.map(v=>Math.max(1,Math.trunc(Number(v)||1))),volume=size[0]*size[1]*size[2];
  if(volume>1048576||volume<1)throw new Error('Structure is too large to import ('+volume+' cells).');
  const palettes=st.palette.default.block_palette,layer0=st.block_indices[0],layer1=st.block_indices[1]||[],pData=st.palette.default.block_position_data||{};
  if(!Array.isArray(layer0)||layer0.length<volume)throw new Error('The structure block index layer is incomplete.');
  const blocks=[];
  for(let index=0;index<volume;index++){
    let pi=Number(layer0[index]);if(pi<0&&Number(layer1[index])>=0)pi=Number(layer1[index]);
    if(pi<0)continue; 
    if(pi>=palettes.length)throw new Error('Structure palette index is out of range.');
    const entry=palettes[pi],name=String(entry.name||'minecraft:air'),states={...(entry.states||{})};
    const z=index%size[2],y=Math.floor(index/size[2])%size[1],x=Math.floor(index/(size[1]*size[2]));
    const posData=pData[String(index)]||pData[index],be=posData&&(posData.block_entity_data||posData)||null;
    const block={pos:[x,y,z],name,states};
    if(be){block.nbt=be;if(Array.isArray(be.Items))block.items=be.Items.map((it,j)=>({name:it.Name||it.name||'minecraft:stone',count:Number(it.Count??it.count??1)||1,slot:Number(it.Slot??it.slot??j)||0}));if(name.endsWith(':noteblock')||be.id==='Music')block.states.note=Number(be.note)||0;}
    blocks.push(block);
  }
  return {size,blocks};
} 
root.BedrockStructure={encode,download,downloadMcpack,parse,VERSION};
})(window);
