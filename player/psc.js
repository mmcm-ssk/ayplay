class PSCParser {
    constructor(buffer) {
        this.view = new DataView(buffer);
        this.uint8 = new Uint8Array(buffer);

        this.MAX_SAMPLES_COUNT = 32;
        this.MAX_SAMPLE_SIZE = 32;
        this.MAX_ORNAMENTS_COUNT = 32;
        this.MAX_ORNAMENT_SIZE = 32;
        this.END_POSITION_MARKER = 0xff;
    }

    parse() {
        const result = {
            meta: {},
            positions: { loop: 0, lines: [] },
            samples: {},
            ornaments: {},
            patterns: {}
        };

        this.parseHeader(result);

        for (let i = 0; i < this.MAX_SAMPLES_COUNT; i++) {
            try { this.parseSample(i, result); } catch (e) {}
        }
        for (let i = 0; i < this.MAX_ORNAMENTS_COUNT; i++) {
            try { this.parseOrnament(i, result); } catch (e) {}
        }

        const patternsSet = this.parsePositions(result);
        patternsSet.forEach(pat => {
            this.parsePattern(pat, result);
        });

        return result;
    }

    parseHeader(result) {
        const vChar0 = String.fromCharCode(this.uint8[5]);
        const vChar2 = String.fromCharCode(this.uint8[7]);
        const vChar3 = String.fromCharCode(this.uint8[8]);

        let version = 0;
        if (!isNaN(vChar0) && !isNaN(vChar2) && !isNaN(vChar3)) {
            version = 100 * parseInt(vChar0) + 10 * parseInt(vChar2) + parseInt(vChar3);
        }

        this.samplesStart = this.view.getUint16(69, true);
        this.positionsOffset = this.view.getUint16(71, true);
        this.tempo = this.uint8[73];
        this.ornamentsTableOffset = this.view.getUint16(74, true);

        if (version === 0 || version >= 103) {
            this.ornamentsBase = this.ornamentsTableOffset;
            this.samplesBase = 76;
        } else {
            this.ornamentsBase = 0;
            this.samplesBase = 0;
        }

        result.meta.initialTempo = this.tempo;
    }

    parsePositions(result) {
        let offset = this.positionsOffset;
        const patterns = new Map();
        let patIndex = 0;

        while (offset < this.uint8.length) {
            if (this.uint8[offset + 1] === this.END_POSITION_MARKER) {
                result.positions.loop = Math.min(this.uint8[offset], result.positions.lines.length - 1);
                break;
            }

            const pat = {
                index: this.uint8[offset],
                size: this.uint8[offset + 1],
                offsets: [
                    this.view.getUint16(offset + 2, true),
                    this.view.getUint16(offset + 4, true),
                    this.view.getUint16(offset + 6, true)
                ]
            };

            const key = `${pat.size}-${pat.offsets.join(',')}`;
            if (!patterns.has(key)) {
                patterns.set(key, { ...pat, logicalIndex: patIndex++ });
            }

            result.positions.lines.push(patterns.get(key).logicalIndex);
            offset += 8;
        }
        return Array.from(patterns.values());
    }

    parseSample(index, result) {
        const offsetAddr = 76 + index * 2;
        if (offsetAddr >= this.uint8.length) return;

        const sampleAddr = this.samplesBase + this.view.getUint16(offsetAddr, true);
        let cursor = sampleAddr;
        const lines = [];

        for (let i = 0; i < this.MAX_SAMPLE_SIZE; i++) {
            if (cursor >= this.uint8.length) break;

            const tone = this.view.getUint16(cursor, true);
            const adding = this.view.getInt8(cursor + 2);
            const levelData = this.uint8[cursor + 3];
            const flags = this.uint8[cursor + 4];

            const isFinished = (flags & 32) === 0;

            lines.push({
                tone: tone,
                adding: adding,
                level: levelData & 15,
                noiseMask: (flags & 8) !== 0,
                toneMask: (flags & 1) !== 0,
                enableEnvelope: (flags & 16) === 0,
                volumeDelta: ((flags & 2) ? 1 : 0) - ((flags & 4) ? 1 : 0),
                loopBegin: (flags & 128) === 0,
                loopEnd: (flags & 64) === 0
            });

            cursor += 6;
            if (isFinished) break;
        }
        result.samples[index] = { lines };
    }

    parseOrnament(index, result) {
        const maxOrnaments = Math.floor((this.samplesStart - this.ornamentsTableOffset) / 2);
        if (index >= maxOrnaments) return;

        const offsetAddr = this.ornamentsTableOffset + index * 2;
        const ornamentAddr = this.ornamentsBase + this.view.getUint16(offsetAddr, true);
        let cursor = ornamentAddr;
        const lines = [];

        for (let i = 0; i < this.MAX_ORNAMENT_SIZE; i++) {
            if (cursor >= this.uint8.length) break;

            const loopAndNoise = this.uint8[cursor];
            const noteOffset = this.view.getInt8(cursor + 1);
            const isFinished = (loopAndNoise & 32) === 0;

            lines.push({
                noiseAddon: loopAndNoise & 31,
                noteAddon: noteOffset,
                loopBegin: (loopAndNoise & 128) === 0,
                loopEnd: (loopAndNoise & 64) === 0
            });

            cursor += 2;
            if (isFinished) break;
        }
        result.ornaments[index] = { lines };
    }

    parsePattern(pat, result) {
        const lines = [];
        const state = {
            channels: [
                { offset: pat.offsets[0], period: 0, counter: 0 },
                { offset: pat.offsets[1], period: 0, counter: 0 },
                { offset: pat.offsets[2], period: 0, counter: 0 }
            ]
        };

        let lineIdx = 0;
        while (lineIdx < pat.size) {
            let minCounter = state.channels[0].counter;
            for (let c = 1; c < 3; c++) {
                if (state.channels[c].counter < minCounter) minCounter = state.channels[c].counter;
            }

            if (minCounter > 0) {
                for (let c = 0; c < 3; c++) state.channels[c].counter -= minCounter;
                lineIdx += minCounter - 1;
            } else {
                const lineCommands = { channels: [{}, {}, {}] };
                for (let chan = 0; chan < 3; ++chan) {
                    const chanState = state.channels[chan];
                    if (chanState.counter > 0) {
                        chanState.counter--;
                        continue;
                    }
                    this.parseChannel(chan, chanState, lineCommands.channels[chan], lineCommands);
                    chanState.counter = chanState.period;
                }
                lines.push({ lineIndex: lineIdx, ...lineCommands });
            }
            lineIdx++;
        }
        result.patterns[pat.logicalIndex] = { size: pat.size, lines: lines };
    }

    parseChannel(chan, state, cmds, lineCmds) {
        while (state.offset < this.uint8.length) {
            const cmd = this.uint8[state.offset++];

            if (cmd >= 0xc0) {
                state.period = cmd - 0xc0;
                break;
            } else if (cmd >= 0xa0) {
                cmds.ornament = cmd - 0xa0;
            } else if (cmd >= 0x80) {
                cmds.sample = cmd - 0x80;
            } else if (cmd === 0x7d) {
                cmds.breakSample = true;
            } else if (cmd === 0x7c) {
                cmds.rest = true;
            } else if (cmd === 0x7b) {
                if (chan === 1) cmds.noiseBase = this.uint8[state.offset++];
            } else if (cmd === 0x7a) {
                if (chan === 1) {
                    cmds.envelopeType = this.uint8[state.offset++] & 15;
                    cmds.envelopeTone = (this.uint8[state.offset+1] << 8) | this.uint8[state.offset];
                    state.offset += 2;
                }
            } else if (cmd === 0x71) {
                cmds.breakOrnament = true;
                state.offset++;
            } else if (cmd === 0x70) {
                const val = this.uint8[state.offset++];
                cmds.volSlidePeriod = (val & 64) !== 0 ? -((val | 128) << 24 >> 24) : val;
                cmds.volSlideStep = (val & 64) !== 0 ? -1 : 1;
            } else if (cmd === 0x6f) {
                cmds.noOrnament = true;
                state.offset++;
            } else if (cmd === 0x6e) {
                lineCmds.tempo = this.uint8[state.offset++];
            } else if (cmd === 0x6d) {
                cmds.gliss = this.uint8[state.offset++];
            } else if (cmd === 0x6c) {
                cmds.slide = -this.view.getInt8(state.offset++);
            } else if (cmd === 0x6b) {
                cmds.slide = this.uint8[state.offset++];
            } else if (cmd >= 0x58 && cmd <= 0x66) {
                cmds.volume = cmd - 0x57;
                cmds.noEnvelope = true;
            } else if (cmd === 0x57) {
                cmds.volume = 0xf;
                cmds.envelope = true;
            } else if (cmd <= 0x56) {
                cmds.note = cmd;
            }
        }
    }
}
var PSCReader=function(){
var FREQ_TABLE=[0xedc,0xe07,0xd3e,0xc80,0xbcc,0xb22,0xa82,0x9ec,0x95c,0x8d6,0x858,0x7e0,0x76e,0x704,0x69f,0x640,0x5e6,0x591,0x541,0x4f6,0x4ae,0x46b,0x42c,0x3f0,0x3b7,0x382,0x34f,0x320,0x2f3,0x2c8,0x2a1,0x27b,0x257,0x236,0x216,0x1f8,0x1dc,0x1c1,0x1a8,0x190,0x179,0x164,0x150,0x13d,0x12c,0x11b,0x10b,0x0fc,0x0ee,0x0e0,0x0d4,0x0c8,0x0bd,0x0b2,0x0a8,0x09f,0x096,0x08d,0x085,0x07e,0x077,0x070,0x06a,0x064,0x05e,0x059,0x054,0x050,0x04b,0x047,0x043,0x03f,0x03c,0x038,0x035,0x032,0x02f,0x02d,0x02a,0x028,0x026,0x024,0x022,0x020,0x01e,0x01c,0x01a,0x019,0x017,0x016,0x015,0x014,0x013,0x012,0x011,0x010];
function clamp(v,a,b){return v<a?a:v>b?b:v}
return function(buf,fname){
var ab;
if(buf instanceof ArrayBuffer){ab=buf}else{var t=new Uint8Array(buf);ab=t.buffer}
var d=new Uint8Array(ab);
function u8(o){return d[o]}
if(d.length<76){this.error="File too small";return}
var id=String.fromCharCode(d[0],d[1],d[2],d[3],d[4]);
if(id!=="PSC V"){this.error="Not a PSC file";return}
var title="",author="";
for(var i=25;i<45;i++){var c=d[i];if(c>=32&&c<=127)title+=String.fromCharCode(c)}
title=title.trim();
var hasAuthor=false;
for(var i=45;i<49;i++){if(String.fromCharCode(d[i])==="B"&&String.fromCharCode(d[i+1])==="Y")hasAuthor=true}
if(hasAuthor){for(var i=49;i<69;i++){var c=d[i];if(c>=32&&c<=127)author+=String.fromCharCode(c)}author=author.trim()}
if(!author){for(var i=25;i<69;i++){var c=d[i];if(c>=32&&c<=127)author+=String.fromCharCode(c)}author=author.trim();if(author===title)author=""}
var pp=new PSCParser(ab);
var parsed=pp.parse();
var positions=parsed.positions.lines;
var loopPos=parsed.positions.loop;
var curTempo=parsed.meta.initialTempo||tempoByte(ab);
var tempo0=curTempo;
var patterns=parsed.patterns;
var samples=parsed.samples;
var ornaments=parsed.ornaments;
function tempoByte(b){return new Uint8Array(b)[73]||1}
function makeIterator(){
  return {obj:null,pos:0,loopPos:0,brk:false,
    set:function(o){this.obj=o},
    reset:function(){this.pos=0;this.brk=false},
    disable:function(){this.pos=this.obj?this.obj.length:0;this.brk=false},
    setBreakLoop:function(b){this.brk=b},
    getLine:function(){return this.pos<(this.obj?this.obj.length:0)?this.obj[this.pos]:null},
    next:function(){
      var cur=this.obj[this.pos];
      if(cur.loopBegin)this.loopPos=this.pos;
      if(cur.loopEnd){
        if(!this.brk){this.pos=this.loopPos}
        else{this.brk=false;this.pos++}
      }else{this.pos++}
    }
  };
}
var dump=[];
var chanState=[];
for(var ch=0;ch<3;ch++){
  chanState.push({
    note:0,vol:0,envelope:false,toneAcc:0,noiseAcc:0,attenuation:0,
    sample:makeIterator(),orn:makeIterator(),
    toneSlide:0,glissade:0,glissSteps:0,
    volSlidePeriod:0,volSlideDelta:0,volSlideCounter:0,
    sampleSet:false,ornSet:false
  });
}
var globalEnvTone=0,globalEnvType=0,globalNoiseBase=0;
for(var pos=0;pos<positions.length;pos++){
  var pat=patterns[positions[pos]];
  var ordered={};
  for(var li=0;li<pat.lines.length;li++){ordered[pat.lines[li].lineIndex]=pat.lines[li]}
  for(var line=0;line<pat.size;line++){
    var stored=ordered[line];
    var cmds=stored?stored.channels:null;
    var envShapePending=false;
    if(stored&&stored.tempo!==undefined)curTempo=stored.tempo;
    if(cmds){
      for(var ch=0;ch<3;ch++){
        var cs=chanState[ch];
        var cmd=cmds[ch];
        if(!cmd||Object.keys(cmd).length===0)continue;
        var oldTone=FREQ_TABLE[clamp(cs.note,0,95)]+cs.toneAcc+cs.toneSlide;
        if(cmd.rest){
          cs.sample.setBreakLoop(false);
          cs.sample.disable();
          cs.orn.setBreakLoop(false);
          cs.orn.disable();
          cs.toneSlide=0;cs.glissade=0;cs.glissSteps=0;
        }
        if(cmd.note!==undefined&&cmd.rest!==true){
          cs.sample.reset();
          cs.orn.reset();
          cs.toneSlide=0;cs.toneAcc=0;cs.noiseAcc=0;cs.attenuation=0;
          cs.volSlidePeriod=0;cs.volSlideDelta=0;cs.volSlideCounter=0;
        }
        if(cmd.note!==undefined)cs.note=cmd.note;
        if(cmd.sample!==undefined&&cmd.rest!==true){var s=samples[cmd.sample];cs.sample.set(s?s.lines:[]);cs.sampleSet=true}
        if(cmd.ornament!==undefined&&cmd.rest!==true){var o=ornaments[cmd.ornament];cs.orn.set(o?o.lines:[]);cs.ornSet=true}
        if(cmd.volume!==undefined){cs.vol=cmd.volume;cs.attenuation=0}
        if(cmd.noEnvelope===true)cs.envelope=false;
        if(cmd.envelope===true)cs.envelope=true;
        if(cmd.envelopeType!==undefined){
          if(cmd.envelopeType===0&&cmd.envelopeTone===0){
            cs.envelope=true;
          }else{
            globalEnvTone=cmd.envelopeTone;
            globalEnvType=cmd.envelopeType;
            envShapePending=true;
          }
        }
        if(cmd.noiseBase!==undefined)globalNoiseBase=cmd.noiseBase;
        if(cmd.breakSample)cs.sample.setBreakLoop(true);
        if(cmd.breakOrnament)cs.orn.setBreakLoop(true);
        if(cmd.noOrnament)cs.orn.disable();
        if(cmd.gliss!==undefined){
          var diff=oldTone-FREQ_TABLE[clamp(cs.note,0,95)];
          cs.glissade=diff>=0?-cmd.gliss:cmd.gliss;
          cs.glissSteps=cmd.gliss!==0?(1+Math.abs(diff)/cmd.gliss|0):0;
          cs.toneSlide=diff;
        }
        if(cmd.slide!==undefined){cs.glissade=cmd.slide;cs.glissSteps=0}
        if(cmd.volSlidePeriod!==undefined){cs.volSlidePeriod=cmd.volSlidePeriod;cs.volSlideDelta=cmd.volSlideStep;cs.volSlideCounter=cmd.volSlidePeriod}
      }
    }
    for(var ch=0;ch<3;ch++){chanState[ch].noiseAcc+=globalNoiseBase}
    for(var t=0;t<curTempo;t++){
      var frame=[0,0,0,0,0,0,0,0,0,0,0,0,0,255];
      for(var ch=0;ch<3;ch++){
        var cs=chanState[ch];
        var sl=cs.sample.getLine();
        if(sl&&cs.sampleSet){
          cs.sample.next();
          if(cs.ornSet&&cs.orn.getLine()){
            var ol=cs.orn.getLine();
            cs.noiseAcc+=ol.noiseAddon;
            cs.note+=ol.noteAddon;
            if(cs.note<0)cs.note+=0x56;
            else if(cs.note>0x55)cs.note-=0x56;
            if(cs.note>0x55)cs.note=0x55;
            cs.orn.next();
          }
          cs.toneAcc+=sl.tone;
          var slideVal=0;
          if(cs.glissade!==0){
            cs.toneSlide+=cs.glissade;
            if(cs.glissSteps&&!--cs.glissSteps)cs.glissade=0;
            slideVal=cs.toneSlide;
          }
          var noteIdx=clamp(cs.note,0,95);
          var tone=(FREQ_TABLE[noteIdx]+cs.toneAcc+slideVal)&0xFFF;
          if(sl.toneMask){frame[7]|=(1<<ch)}
          var vsd=0;
          if(cs.volSlidePeriod>0){
            cs.volSlideCounter--;
            if(cs.volSlideCounter<=0){cs.volSlideCounter=cs.volSlidePeriod;vsd=cs.volSlideDelta}
          }
          cs.attenuation+=sl.volumeDelta+vsd;
          var level=clamp(cs.attenuation+cs.vol,0,15);
          cs.attenuation=level-cs.vol;
          var vol=1+level;
          var outVol=vol*sl.level>>4;
          frame[8+ch]=clamp(outVol,0,15);
          var envActive=cs.envelope&&sl.enableEnvelope;
          if(envActive){frame[8+ch]|=0x10}
          if(envActive&&sl.noiseMask){
            globalEnvTone+=sl.adding;
          }else{
            cs.noiseAcc+=sl.adding;
            if(!sl.noiseMask){frame[6]=cs.noiseAcc&0x1F}
          }
          if(sl.noiseMask){frame[7]|=(1<<(ch+3))}
          frame[ch*2]=tone&0xFF;
          frame[ch*2+1]=(tone>>8)&0xF;
        }else{
          frame[8+ch]=0;
          frame[7]|=(1<<ch)|(1<<(ch+3));
        }
      }
      if(envShapePending){frame[13]=globalEnvType;envShapePending=false}
      frame[11]=globalEnvTone&0xFF;
      frame[12]=(globalEnvTone>>8)&0xFF;
      dump.push(frame);
    }
  }
}
var frameCount=dump.length;
var curFrame=0;
var loopFrame=0;
var ltempo=tempo0;
for(var i=0;i<loopPos;i++){
  var pat=patterns[positions[i]];
  var ordered={};
  for(var li=0;li<pat.lines.length;li++){ordered[pat.lines[li].lineIndex]=pat.lines[li]}
  for(var line=0;line<pat.size;line++){
    var stored=ordered[line];
    if(stored&&stored.tempo!==undefined)ltempo=stored.tempo;
    loopFrame+=ltempo;
  }
}
this.getFrameCount=function(){return frameCount};
this.getFrameRate=function(){return 50};
this.getClockRate=function(){return 1773400};
this.getTurbo=function(){return false};
this.getNumChips=function(){return 1};
this.getTrackFileName=function(){return fname};
this.getTrackName=function(){return title||fname.replace(/^.*[\\\/]/,"").replace(/\.psc$/i,"")};
this.getAuthorName=function(){return author};
this.getLoopFrame=function(){return loopFrame};
this.getNumPositions=function(){return positions.length};
this.getLoopPos=function(){return loopPos};
this.getDelay=function(){return 0};
this.getNextFrame=function(){
  if(curFrame>=frameCount)return [[0,0,0,0,0,0,0,0,0,0,0,0,0,255],[],[],true];
  var r=dump[curFrame];
  var looped=++curFrame>=frameCount;
  return [r,[],[],looped];
};
}}()
if(typeof module!=='undefined'&&module.exports){module.exports={PSC:PSCReader}}