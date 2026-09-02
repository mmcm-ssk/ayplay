var FTCReader=function(){
var FREQ_PT2=[0xef8,0xe10,0xd60,0xc80,0xbd8,0xb28,0xa88,0x9f0,0x960,0x8e0,0x858,0x7e0,0x77c,0x708,0x6b0,0x640,0x5ec,0x594,0x544,0x4f8,0x4b0,0x470,0x42c,0x3fd,0x3be,0x384,0x358,0x320,0x2f6,0x2ca,0x2a2,0x27c,0x258,0x238,0x216,0x1f8,0x1df,0x1c2,0x1ac,0x190,0x17b,0x165,0x151,0x13e,0x12c,0x11c,0x10a,0x0fc,0x0ef,0x0e1,0x0d6,0x0c8,0x0bd,0x0b2,0x0a8,0x09f,0x096,0x08e,0x085,0x07e,0x077,0x070,0x06b,0x064,0x05e,0x059,0x054,0x04f,0x04b,0x047,0x042,0x03f,0x03b,0x038,0x035,0x032,0x02f,0x02c,0x02a,0x027,0x025,0x023,0x021,0x01f,0x01d,0x01c,0x01a,0x019,0x017,0x016,0x015,0x013,0x012,0x011,0x010,0x00f];
var FREQ_ST=[0xef8,0xe10,0xd60,0xc80,0xbd8,0xb28,0xa88,0x9f0,0x960,0x8e0,0x858,0x7e0,0x77c,0x708,0x6b0,0x640,0x5ec,0x594,0x544,0x4f8,0x4b0,0x470,0x42c,0x3f0,0x3be,0x384,0x358,0x320,0x2f6,0x2ca,0x2a2,0x27c,0x258,0x238,0x216,0x1f8,0x1df,0x1c2,0x1ac,0x190,0x17b,0x165,0x151,0x13e,0x12c,0x11c,0x10b,0x0fc,0x0ef,0x0e1,0x0d6,0x0c8,0x0bd,0x0b2,0x0a8,0x09f,0x096,0x08e,0x085,0x07e,0x077,0x070,0x06b,0x064,0x05e,0x059,0x054,0x04f,0x04b,0x047,0x042,0x03f,0x03b,0x038,0x035,0x032,0x02f,0x02c,0x02a,0x027,0x025,0x023,0x021,0x01f,0x01d,0x01c,0x01a,0x019,0x017,0x016,0x015,0x013,0x012,0x011,0x010,0x00f];
var FREQ_FT=[0xd10,0xc58,0xba0,0xb00,0xa60,0x9c8,0x940,0x8b8,0x840,0x7c0,0x750,0x6f0,0x688,0x62c,0x5d0,0x580,0x530,0x4e4,0x4a0,0x45c,0x420,0x3e0,0x3a8,0x378,0x344,0x316,0x2e8,0x2c0,0x298,0x272,0x250,0x22e,0x210,0x1f0,0x1d4,0x1bc,0x1a2,0x18b,0x174,0x160,0x14c,0x139,0x128,0x117,0x108,0xf8,0xea,0xde,0xd1,0xc5,0xba,0xb0,0xa6,0x9c,0x94,0x8b,0x84,0x7c,0x75,0x6f,0x68,0x62,0x5d,0x58,0x53,0x4e,0x4a,0x45,0x42,0x3e,0x3a,0x37,0x34,0x31,0x2e,0x2c,0x29,0x27,0x25,0x22,0x21,0x1f,0x1d,0x1b,0x1a,0x18,0x17,0x16,0x14,0x13,0x12,0x11,0x10,0xf,0xe,0xd];
var NOTE_TABLES=[FREQ_PT2,FREQ_ST,FREQ_FT];
function clamp(v,a,b){return v<a?a:v>b?b:v}
return function(buf,fname){
var d=new Uint8Array(buf);
function u8(o){return o<d.length?d[o]:0}
function s8(o){var v=u8(o);return v>=128?v-256:v}
function u16(o){return u8(o)|u8(o+1)<<8}
function u16s(o){var v=u16(o);return v>=32768?v-65536:v}
if(d.length<212){this.error="File too small";return}
var id=String.fromCharCode(d[0],d[1],d[2],d[3],d[4],d[5],d[6],d[7]);
if(id!=="Module: "){this.error="Not an FTC file";return}
var title="";
for(var i=8;i<50;i++){var c=d[i];if(c>=32&&c<=127)title+=String.fromCharCode(c)}
title=title.trim();
var noteTableCode=d[50];
var noteTableIdx=0;
if(noteTableCode===0x01)noteTableIdx=1;
else if(noteTableCode===0x02)noteTableIdx=2;
var FREQ=NOTE_TABLES[noteTableIdx];
var editor="";
for(var i=51;i<69;i++){var c=d[i];if(c>=32&&c<=127)editor+=String.fromCharCode(c)}
editor=editor.trim();
var tempo=u8(69);
var loopPos=u8(70);
var patOffset=u16(75);
var sampleOffsets=[];
for(var i=0;i<32;i++)sampleOffsets.push(u16(82+i*2));
var ornOffsets=[];
for(var i=0;i<33;i++)ornOffsets.push(u16(146+i*2));
function parseObject(off){
  if(off+3>d.length)return{size:0,loop:0,loopLimit:0,lines:[]};
  var size=u8(off)+1;
  var loop=u8(off+1);
  var loopLimit=u8(off+2)+1;
  return{size:size,loop:Math.min(loop,size),loopLimit:Math.min(loopLimit,size),off:off+3,lineSize:5};
}
function parseSampleLine(off){
  if(off+5>d.length)return null;
  var noise=u8(off);
  var toneLo=u8(off+1);
  var toneHi=u8(off+2);
  var level=u8(off+3);
  var envAddon=s8(off+4);
  return{
    level:level&15,
    volSlide:level&32?(level&16?-1:1):0,
    noise:noise&31,
    accumNoise:(noise&128)!==0,
    noiseMask:(noise&64)!==0,
    tone:(toneHi&15)*256+toneLo,
    accumTone:(toneHi&128)!==0,
    toneMask:(toneHi&64)!==0,
    envAddon:envAddon,
    accumEnv:(level&128)!==0,
    enableEnv:(level&64)!==0,
    isEmpty:noise===0&&toneLo===0&&toneHi===0&&level===0&&envAddon===0
  };
}
function parseOrnamentLine(off){
  if(off+2>d.length)return null;
  var b0=u8(off);
  var noteAddon=s8(off+1);
  return{
    noiseAddon:b0&31,
    keepNoise:(b0&128)!==0,
    noteAddon:noteAddon,
    keepNote:(b0&64)!==0
  };
}
function parseSample(idx){
  var off=sampleOffsets[idx]-baseAddr;
  var obj=parseObject(off);
  var lines=[];
  var cnt=obj.loopLimit;
  for(var i=0;i<cnt;i++){
    var sl=parseSampleLine(obj.off+i*obj.lineSize);
    if(!sl)break;
    lines.push(sl);
  }
  return{lines:lines,loop:obj.loop,loopLimit:cnt};
}
function parseOrnament(idx){
  var off=ornOffsets[idx]-baseAddr;
  var obj=parseObject(off);
  var lines=[];
  var cnt=obj.loopLimit;
  for(var i=0;i<cnt;i++){
    var ol=parseOrnamentLine(obj.off+i*2);
    if(!ol)break;
    lines.push(ol);
  }
  return{lines:lines,loop:obj.loop,loopLimit:cnt};
}
var baseAddr=0;
var firstDataAddr=0;
var sentinelPos=-1;
for(var posOff=patOffset;posOff+6<=d.length;posOff+=6){
  var v0=u16(posOff);
  if(v0===0xFFFF){sentinelPos=posOff;break}
  if(firstDataAddr===0&&v0!==0)firstDataAddr=v0;
}
if(sentinelPos>=0&&firstDataAddr>0){
  baseAddr=firstDataAddr-(sentinelPos+2);
}
if(baseAddr<0)baseAddr=0;
var samples=[];
for(var i=0;i<32;i++)samples.push(parseSample(i));
var ornaments=[];
for(var i=0;i<33;i++)ornaments.push(parseOrnament(i));
var posStart=212;
var positions=[];
for(var i=0;;i++){
  var pIdx=u8(posStart+i*2);
  var trans=s8(posStart+i*2+1);
  if(pIdx===0xFF)break;
  positions.push({pattern:pIdx,transposition:trans});
}
if(positions.length===0){this.error="No positions";return}
loopPos=clamp(loopPos,0,positions.length-1);
function getPatternData(idx){
  var patAddr=patOffset+idx*6;
  var addrs=[u16(patAddr)-baseAddr,u16(patAddr+2)-baseAddr,u16(patAddr+4)-baseAddr];
  var periods=[0,0,0];
  var counters=[0,0,0];
  var patLines=[];
  for(var line=0;line<64;line++){
    var minC=Math.min(counters[0],counters[1],counters[2]);
    if(minC>0){counters[0]-=minC;counters[1]-=minC;counters[2]-=minC;line+=minC-1;continue}
    var cmds=[null,null,null];
    if(counters[0]===0&&addrs[0]<d.length&&u8(addrs[0])===0xFF)break;
    for(var ch=0;ch<3;ch++){
      if(counters[ch]>0){counters[ch]--;cmds[ch]={done:true};continue}
      var cmd={note:-1,sample:null,ornament:null,volume:null,envType:null,envTone:null,envOff:false,noise:null,slide:null,noteSlide:null,tempo:null,rest:false};
      var off=addrs[ch];
      while(off<d.length){
        var b=u8(off);off++;
        if(b<=0x1F){cmd.sample=b}
        else if(b<=0x2F){cmd.volume=b-0x20}
        else if(b===0x30){cmd.rest=true;periods[ch]=0;break}
        else if(b<=0x3E){cmd.envType=b-0x30;cmd.envTone=u16(off);off+=2}
        else if(b===0x3F){cmd.envOff=true}
        else if(b<=0x5F){periods[ch]=b-0x40;break}
        else if(b<=0xCB){cmd.note=b-0x60;periods[ch]=0;break}
        else if(b<=0xEC){cmd.ornament=b-0xCC}
        else if(b===0xED){cmd.slide=u16s(off);off+=2}
        else if(b===0xEE){cmd.noteSlide=u8(off);off++}
        else if(b===0xEF){cmd.noise=u8(off);off++}
        else{cmd.tempo=u8(off);off++}
      }
      addrs[ch]=off;
      counters[ch]=periods[ch];
      cmds[ch]=cmd;
    }
    if(cmds[0]&&cmds[0].rest&&cmds[1]&&cmds[1].rest&&cmds[2]&&cmds[2].rest)break;
    patLines.push(cmds);
  }
  return{lines:patLines};
}
var patCache={};
function getPattern(idx){
  if(!patCache[idx])patCache[idx]=getPatternData(idx);
  return patCache[idx];
}
var dump=[];
var chanState=[];
for(var ch=0;ch<3;ch++){
  chanState.push({
    note:0,envelope:0,envelopeEnabled:false,volume:15,volumeSlide:0,
    noise:0,noteAcc:0,toneAcc:0,noiseAcc:0,sampleNoiseAcc:0,envelopeAcc:0,
    toneAddon:0,toneSlide:0,glissade:0,glissDir:0,
    sampleLines:null,samplePos:0,sampleLoop:0,sampleLoopLimit:0,
    ornLines:null,ornPos:0,ornLoop:0,
    sampleSet:false
  });
}
var globalTrans=0;
var curTempo=tempo;
var globalEnvShape=0;
var envWrittenThisLine=false;
var persistR6=0,persistEnvTone=0,persistR13=0;
function renderFrame(){
  var frame=[0,0,0,0,0,0,persistR6,0,0,0,0,persistEnvTone&0xFF,(persistEnvTone>>8)&0xF,255];
  var anyEnvCh=false;
  for(var ch=0;ch<3;ch++){
    var cs=chanState[ch];
    var noteAddon=0,noiseAddon=0;
    if(cs.ornLines&&cs.ornLines.lines.length>0){
      var ol=cs.ornLines.lines[cs.ornPos];
      noteAddon=cs.noteAcc+ol.noteAddon;
      if(ol.keepNote)cs.noteAcc+=ol.noteAddon;
      noiseAddon=cs.noiseAcc+ol.noiseAddon;
      if(ol.keepNoise)cs.noiseAcc+=ol.noiseAddon;
      cs.ornPos++;
      if(cs.ornPos>=cs.ornLines.lines.length)cs.ornPos=cs.ornLoop;
    }
    if(!cs.sampleLines||!cs.sampleSet||cs.samplePos>=cs.sampleLines.lines.length){
      frame[8+ch]=0;frame[7]|=(1<<ch)|(1<<(ch+3));
    }else{
      var sl=cs.sampleLines.lines[cs.samplePos];
      var sampleNoise=cs.sampleNoiseAcc+sl.noise;
      if(sl.accumNoise)cs.sampleNoiseAcc+=sl.noise;
      if(sl.noiseMask){frame[7]|=(1<<(ch+3))}
      else{frame[6]=(cs.noise+noiseAddon+sampleNoise)&0x1F;persistR6=frame[6]}
      var toneAddon=cs.toneAcc+sl.tone;
      if(sl.accumTone)cs.toneAcc+=sl.tone;
      if(sl.toneMask){frame[7]|=(1<<ch)}
      cs.toneAddon=toneAddon;
      cs.volumeSlide+=sl.volSlide;
      var vol=clamp(sl.level+cs.volumeSlide,0,15);
      var chanVol=((cs.volume*17+(cs.volume>7?1:0))*vol+128)>>8;
      frame[8+ch]=clamp(chanVol,0,15);
      var envVal=cs.envelopeAcc+sl.envAddon;
      if(sl.accumEnv)cs.envelopeAcc+=sl.envAddon;
      if(sl.enableEnv&&cs.envelopeEnabled){
        frame[8+ch]|=0x10;
        var envTone=cs.envelope-envVal;
        frame[11]=envTone&0xFF;frame[12]=(envTone>>8)&0xFF;
        persistEnvTone=envTone&0xFFF;
        anyEnvCh=true;
      }
      cs.samplePos++;
      if(cs.samplePos>=cs.sampleLines.lines.length)cs.samplePos=cs.sampleLoop;
      if(cs.samplePos>=cs.sampleLines.lines.length){cs.sampleSet=false}
    }
    if(cs.glissade!==0){cs.toneSlide+=cs.glissade;if(cs.glissDir!==0){if((cs.glissDir>0&&cs.toneSlide>=0)||(cs.glissDir<0&&cs.toneSlide<0)){cs.toneSlide=0;cs.glissade=0;cs.glissDir=0}}}
    var noteVal=clamp(cs.note+noteAddon,0,95);
    var toneVal=(FREQ[noteVal]+cs.toneAddon+cs.toneSlide)&0xFFF;
    frame[ch*2]=toneVal&0xFF;
    frame[ch*2+1]=(toneVal>>8)&0xF;
  }
  if(envWrittenThisLine){frame[13]=globalEnvShape;persistR13=globalEnvShape;envWrittenThisLine=false}
  dump.push(frame);
}
function processCommands(cmds){
  for(var ch=0;ch<3;ch++){
    var cs=chanState[ch];
    var cmd=cmds[ch];
    if(!cmd||cmd.done)continue;
    if(cmd.rest){
      cs.sampleSet=false;
      cs.toneSlide=0;cs.glissade=0;cs.glissDir=0;cs.volumeSlide=0;
      cs.noteAcc=0;cs.toneAcc=0;cs.noiseAcc=0;cs.sampleNoiseAcc=0;cs.envelopeAcc=0;
      cs.ornPos=0;
      continue;
    }
    if(cmd.sample!==null||cmd.note>=0){
      cs.noteAcc=0;cs.toneAcc=0;cs.noiseAcc=0;cs.sampleNoiseAcc=0;cs.envelopeAcc=0;
      cs.volumeSlide=0;cs.toneSlide=0;cs.glissade=0;cs.glissDir=0;
      cs.ornPos=0;
      cs.samplePos=0;
      cs.sampleSet=true;
    }
    if(cmd.sample!==null){
      cs.sampleLines=samples[cmd.sample];
      cs.samplePos=0;cs.sampleLoop=cs.sampleLines.loop;cs.sampleLoopLimit=cs.sampleLines.loopLimit;
      cs.sampleSet=true;
    }
    if(cmd.ornament!==null){
      cs.ornLines=ornaments[cmd.ornament];
      cs.ornPos=0;cs.ornLoop=cs.ornLines.loop;
      cs.noiseAcc=0;cs.noteAcc=0;
    }
    if(cmd.noteSlide!==null&&cmd.note>=0){
      var targetNote=cmd.note+globalTrans;
      var step=cmd.noteSlide;
      var slide=FREQ[clamp(cs.note,0,95)]-FREQ[clamp(targetNote,0,95)];
      cs.toneSlide=slide;
      cs.glissade=slide>=0?-step:step;
      cs.glissDir=slide>=0?-1:1;
      cs.note=targetNote;
    }else if(cmd.note>=0){cs.note=cmd.note+globalTrans}
    if(cmd.volume!==null)cs.volume=cmd.volume;
    if(cmd.envType!==null&&cmd.envTone!==null){globalEnvShape=cmd.envType;cs.envelope=cmd.envTone;cs.envelopeEnabled=true;envWrittenThisLine=true;persistEnvTone=cmd.envTone&0xFFF}
    if(cmd.envOff)cs.envelopeEnabled=false;
    if(cmd.noise!==null)cs.noise=cmd.noise;
    if(cmd.slide!==null){cs.glissade=cmd.slide}
    if(cmd.tempo!=null){curTempo=cmd.tempo}
  }
}
for(var pos=0;pos<positions.length;pos++){
  var p=positions[pos];
  globalTrans=p.transposition;
  var pat=getPattern(p.pattern);
  for(var line=0;line<pat.lines.length;line++){
    processCommands(pat.lines[line]);
    for(var t=0;t<curTempo;t++)renderFrame();
  }
}
var frameCount=dump.length;
var curFrame=0;
var loopFrame=0;
{
  var sumNoCarry=0;
  var lt=tempo;
  for(var pos=0;pos<positions.length;pos++){
    var pat=getPattern(positions[pos].pattern);
    for(var line=0;line<pat.lines.length;line++){
      var cmds=pat.lines[line];
      var lp=lt;
      for(var cc=0;cc<3;cc++){
        if(cmds[cc]&&cmds[cc].tempo!=null){lp=lt=cmds[cc].tempo}
      }
      sumNoCarry+=lp;
    }
  }
  }
{
  var ltempo=tempo;
  for(var i=0;i<loopPos;i++){
    var p=positions[i];
    var pat=getPattern(p.pattern);
    for(var line=0;line<pat.lines.length;line++){
      var cmds=pat.lines[line];
      for(var cc=0;cc<3;cc++){
        if(cmds[cc]&&cmds[cc].tempo!=null)ltempo=cmds[cc].tempo;
      }
      loopFrame+=ltempo;
    }
  }
}
this.getFrameCount=function(){return frameCount};
this.getFrameRate=function(){return 50};
this.getClockRate=function(){return 1773400};
this.getTurbo=function(){return false};
this.getNumChips=function(){return 1};
this.getTrackFileName=function(){return fname};
this.getTrackName=function(){return title||fname.replace(/^.*[\\\/]/,"").replace(/\.ftc$/i,"")};
this.getAuthorName=function(){return""};
this.getLoopFrame=function(){return loopFrame};
this.getNumPositions=function(){return positions.length};
this.getLoopPos=function(){return loopPos};
this.getDelay=function(){return 0};
this.getNextFrame=function(){
  if(curFrame>=frameCount)return [[0,0,0,0,0,0,0,0,0,0,0,0,0,0],[],[],true];
  var r=dump[curFrame];
  var looped=++curFrame>=frameCount;
  return [r,[],[],looped];
};
}}()
if(typeof module!=='undefined'&&module.exports){module.exports={FTC:FTCReader}}
