var FXMReader=function(){
var FXM_TABLE=[
  0xfbf,0xedc,0xe07,0xd3d,0xc7f,0xbcc,0xb22,0xa82,0x9eb,0x95d,0x8d6,
  0x857,0x7df,0x76e,0x703,0x69f,0x640,0x5e6,0x591,0x541,0x4f6,0x4ae,
  0x46b,0x42c,0x3f0,0x3b7,0x382,0x34f,0x320,0x2f3,0x2c8,0x2a1,0x27b,
  0x257,0x236,0x216,0x1f8,0x1dc,0x1c1,0x1a8,0x190,0x179,0x164,0x150,
  0x13d,0x12c,0x11b,0x10b,0xfc,0xee,0xe0,0xd4,0xc8,0xbd,0xb2,0xa8,
  0x9f,0x96,0x8d,0x85,0x7e,0x77,0x70,0x6a,0x64,0x5e,0x59,0x54,0x4f,
  0x4b,0x47,0x43,0x3f,0x3b,0x38,0x35,0x32,0x2f,0x2d,0x2a,0x28,0x25,
  0x23,0x21
];
return function(buf,fname){
  var d=new Uint8Array(buf);
  function u8(o){return o<d.length?d[o]:0}
  function u16(o){return u8(o)|u8(o+1)<<8}

  if(d.length<8){this.error="File too small";return}
  if(String.fromCharCode(d[0],d[1],d[2],d[3])!=="FXSM"){this.error="Not an FXM file";return}

  var loadAddr=u16(4);
  var dataOff=6;

  function ramRead(a){
    var off=a-loadAddr+dataOff;
    if(off<0||off>=d.length)return 0;
    return d[off];
  }
  function ramRead16(a){return ramRead(a)|(ramRead(a+1)<<8)}

  var noiseBase=0;

  function chan(){
    return{
      addr:0,smpPtr:0,smpPos:0,ornPtr:0,ornPos:0,
      ton:0,mixer:8,note:0,vol:0,amp:0,
      transp:0,skipCnt:0,smpTick:0,
      b0:false,b1:false,b2:false,b3:false,
      stack:[]
    };
  }

  var chA=chan(),chB=chan(),chC=chan();

  function initChannel(ch,startAddr){
    ch.addr=startAddr;
    ch.smpPtr=0;ch.smpPos=0;
    ch.ornPtr=0;ch.ornPos=0;
    ch.ton=0;ch.mixer=8;
    ch.note=0;ch.vol=0;ch.amp=0;
    ch.transp=0;ch.skipCnt=1;ch.smpTick=0;
    ch.b0=false;ch.b1=false;ch.b2=false;ch.b3=false;
    ch.stack=[];
  }

  function realGetRegs(ch){
    noiseBase=noiseBase&31;
    ch.b2=false;
    ch.amp=(ch.ton!==0)?(ch.vol&15):0;
  }

  function getRegisters(ch){
    ch.smpTick--;
    if(ch.smpTick===0){
      while(true){
        var b=ramRead(ch.smpPos);
        if(b<=0x1d){
          ch.vol=b;
          ch.smpPos++;
          ch.smpTick=ramRead(ch.smpPos);
          ch.smpPos++;
          break;
        }else if(b===0x80){
          ch.smpPos=ramRead16(ch.smpPos+1);
        }else{
          ch.vol=b-0x32;
          ch.smpPos++;
          ch.smpTick=1;
          break;
        }
      }
    }
    if(ch.ton!==0&&!ch.b2){
      while(true){
        var b=ramRead(ch.ornPos);
        if(b===0x80){
          ch.ornPos=ramRead16(ch.ornPos+1);
        }else if(b===0x82){
          ch.ornPos++;
          ch.b3=true;
        }else if(b===0x83){
          ch.ornPos++;
          ch.b3=false;
        }else if(b===0x84){
          ch.ornPos++;
          ch.mixer=ch.mixer^9;
        }else{
          if(ch.b3){
            ch.note=(ch.note+ramRead(ch.ornPos))&0xff;
            var n=ch.note>0x53?0x53:ch.note;
            ch.ton=FXM_TABLE[n];
          }else{
            ch.ton=(ch.ton+((ramRead(ch.ornPos)<<24)>>24))&0xfff;
          }
          ch.ornPos++;
          break;
        }
      }
    }
    realGetRegs(ch);
  }

  function patternInterpreter(ch){
    ch.skipCnt=(ch.skipCnt-1)&0xff;
    if(ch.skipCnt!==0){
      getRegisters(ch);
      return;
    }
    while(true){
      var b=ramRead(ch.addr);
      if(b<=0x7f){
        if(b!==0){
          ch.note=(b-1+ch.transp)&0xff;
          var n=ch.note>0x53?0x53:ch.note;
          ch.ton=FXM_TABLE[n];
          ch.b3=false;
        }else{
          ch.ton=0;
        }
        ch.addr++;
        ch.skipCnt=ramRead(ch.addr);
        ch.addr++;
        ch.ornPos=ch.ornPtr;
        if(!ch.b1){
          ch.b1=ch.b0;
          ch.smpPos=ch.smpPtr;
          ch.vol=ramRead(ch.smpPos);
          ch.smpPos++;
          ch.smpTick=ramRead(ch.smpPos);
          ch.smpPos++;
          realGetRegs(ch);
        }else{
          getRegisters(ch);
        }
        return;
      }else if(b===0x80){
        ch.addr=ramRead16(ch.addr+1);
      }else if(b===0x81){
        ch.stack.push(ch.addr+3);
        ch.addr=ramRead16(ch.addr+1);
      }else if(b===0x82){
        ch.addr++;
        var count=ramRead(ch.addr);
        ch.addr++;
        ch.stack.push(count);
        ch.stack.push(ch.addr);
      }else if(b===0x83){
        var idx=ch.stack.length-2;
        ch.stack[idx]--;
        if((ch.stack[idx]&255)!==0){
          ch.addr=ch.stack[idx+1];
        }else{
          ch.stack.pop();ch.stack.pop();
          ch.addr++;
        }
      }else if(b===0x84){
        ch.addr++;
        noiseBase=ramRead(ch.addr);
        ch.addr++;
      }else if(b===0x85){
        ch.addr++;
        ch.mixer=ramRead(ch.addr);
        ch.addr++;
      }else if(b===0x86){
        ch.addr++;
        ch.ornPtr=ramRead16(ch.addr);
        ch.addr+=2;
      }else if(b===0x87){
        ch.addr++;
        ch.smpPtr=ramRead16(ch.addr);
        ch.addr+=2;
      }else if(b===0x88){
        ch.addr++;
        ch.transp=(ramRead(ch.addr)<<24)>>24;
        ch.addr++;
      }else if(b===0x89){
        ch.addr=ch.stack.pop();
      }else if(b===0x8a){
        ch.addr++;
        ch.b0=true;
        ch.b1=false;
      }else if(b===0x8b){
        ch.addr++;
        ch.b0=false;
        ch.b1=false;
      }else if(b===0x8c){
        ch.addr+=3;
      }else if(b===0x8d){
        ch.addr++;
        noiseBase=(noiseBase+ramRead(ch.addr))&31;
        ch.addr++;
      }else if(b===0x8e){
        ch.addr++;
        ch.transp=((ch.transp+ramRead(ch.addr))<<24)>>24;
        ch.addr++;
      }else if(b===0x8f){
        ch.stack.push(ch.transp);
        ch.addr++;
      }else if(b===0x90){
        ch.transp=ch.stack.pop();
        ch.addr++;
      }else{
        ch.addr++;
      }
    }
  }

  var addrA=u16(dataOff);
  var addrB=u16(dataOff+2);
  var addrC=u16(dataOff+4);

  function findLoopTime() {
    var j11=0,j22=0,j33=0;

    function runSim(checkAddrs) {
      var j1=addrA,j2=addrB,j3=addrC;
      var a1=1,a2=1,a3=1;
      var f71=false,f72=false,f73=false;
      var f61=false,f62=false,f63=false;
      var fxms1=[],fxms2=[],fxms3=[];
      var tr=0;

      function doCh1() {
        while(true) {
          var b=ramRead(j1);
          if(b<=0x7f||b>=0x8f) {
            j1+=2;
            a1=ramRead(j1-1);
            return;
          } else if(b===0x80) {
            j1=ramRead16(j1+1);
            if(!checkAddrs)j11=j1;
            f71=true;
          } else if(b===0x81) {
            fxms1.push(j1+3);
            j1=ramRead16(j1+1);
          } else if(b===0x82) {
            if(checkAddrs&&j1===j11&&j2===j22&&j3===j33){return true;}
            j1++;
            fxms1.push(ramRead(j1));
            j1++;
            fxms1.push(j1);
          } else if(b===0x83) {
            if(fxms1.length<2){j1++;return false;}
            fxms1[fxms1.length-2]--;
            if((fxms1[fxms1.length-2]&255)!==0){
              j1=fxms1[fxms1.length-1];
              if(!checkAddrs&&j1>=2)j11=j1-2;
              f61=true;
            }else{
              fxms1.pop();fxms1.pop();
              j1++;
            }
          } else if(b===0x84||b===0x85||b===0x88||b===0x8d||b===0x8e){j1+=2;}
          else if(b===0x86||b===0x87||b===0x8c){j1+=3;}
          else if(b===0x89) {
            if(fxms1.length<1){j1++;return false;}
            j1=fxms1.pop();
          }
          else{j1++;}
          if(j1>=65536)return false;
        }
      }
      function doCh2() {
        while(true) {
          var b=ramRead(j2);
          if(b<=0x7f||b>=0x8f) {
            j2+=2;
            a2=ramRead(j2-1);
            return;
          } else if(b===0x80) {
            j2=ramRead16(j2+1);
            if(!checkAddrs)j22=j2;
            f72=true;
          } else if(b===0x81) {
            fxms2.push(j2+3);
            j2=ramRead16(j2+1);
          } else if(b===0x82) {
            j2++;
            fxms2.push(ramRead(j2));
            j2++;
            fxms2.push(j2);
          } else if(b===0x83) {
            if(fxms2.length<2){j2++;return false;}
            fxms2[fxms2.length-2]--;
            if((fxms2[fxms2.length-2]&255)!==0){
              j2=fxms2[fxms2.length-1];
              if(!checkAddrs&&j2>=2)j22=j2-2;
              f62=true;
            }else{
              fxms2.pop();fxms2.pop();
              j2++;
            }
          } else if(b===0x84||b===0x85||b===0x88||b===0x8d||b===0x8e){j2+=2;}
          else if(b===0x86||b===0x87||b===0x8c){j2+=3;}
          else if(b===0x89) {
            if(fxms2.length<1){j2++;return false;}
            j2=fxms2.pop();
          }
          else{j2++;}
          if(j2>=65536)return false;
        }
      }
      function doCh3() {
        while(true) {
          var b=ramRead(j3);
          if(b<=0x7f||b>=0x8f) {
            j3+=2;
            a3=ramRead(j3-1);
            return;
          } else if(b===0x80) {
            j3=ramRead16(j3+1);
            if(!checkAddrs)j33=j3;
            f73=true;
          } else if(b===0x81) {
            fxms3.push(j3+3);
            j3=ramRead16(j3+1);
          } else if(b===0x82) {
            j3++;
            fxms3.push(ramRead(j3));
            j3++;
            fxms3.push(j3);
          } else if(b===0x83) {
            if(fxms3.length<2){j3++;return false;}
            fxms3[fxms3.length-2]--;
            if((fxms3[fxms3.length-2]&255)!==0){
              j3=fxms3[fxms3.length-1];
              if(!checkAddrs&&j3>=2)j33=j3-2;
              f63=true;
            }else{
              fxms3.pop();fxms3.pop();
              j3++;
            }
          } else if(b===0x84||b===0x85||b===0x88||b===0x8d||b===0x8e){j3+=2;}
          else if(b===0x86||b===0x87||b===0x8c){j3+=3;}
          else if(b===0x89) {
            if(fxms3.length<1){j3++;return false;}
            j3=fxms3.pop();
          }
          else{j3++;}
          if(j3>=65536)return false;
        }
      }

      do {
        if(checkAddrs&&j1===j11&&j2===j22&&j3===j33) {
          return tr;
        }
        a1=(a1-1)&0xff;
        if(a1===0) {f71=false;f61=false;if(doCh1()&&checkAddrs)return tr;}
        a2=(a2-1)&0xff;
        if(a2===0) {f72=false;f62=false;if(doCh2()&&checkAddrs)return tr;}
        a3=(a3-1)&0xff;
        if(a3===0) {f73=false;f63=false;if(doCh3()&&checkAddrs)return tr;}
        tr++;
        if(tr>180000)return -1;
      } while(!((f71&&(f72||f62)&&(f73||f63))||
                ((f71||f61)&&f72&&(f73||f63))||
                ((f71||f61)&&(f72||f62)&&f73)));
      return tr;
    }

    var result=runSim(false);
    if(result<0)return{tm:15001,lp:0};
    var loopLen=runSim(true);
    if(loopLen<0||loopLen>=result)loopLen=0;
    result--;
    if(result<0)result=0;
    return{tm:result,lp:loopLen};
  }

  var lt=findLoopTime();
  var loopFrame=lt.tm;
  var loopPoint=lt.lp;
  if(loopFrame===0)loopFrame=15001;
  var renderFrames=loopFrame;

  noiseBase=0;
  initChannel(chA,addrA);
  initChannel(chB,addrB);
  initChannel(chC,addrC);

  var dump=[];

  for(var f=0;f<renderFrames;f++){
    patternInterpreter(chA);
    patternInterpreter(chB);
    patternInterpreter(chC);

    var tonA=chA.ton&0xfff;
    var tonB=chB.ton&0xfff;
    var tonC=chC.ton&0xfff;
    var mix=((chA.mixer&9)|((chB.mixer&9)<<1)|((chC.mixer&9)<<2))&0x3f;

    dump.push([
      tonA&0xff,(tonA>>8)&0xff,
      tonB&0xff,(tonB>>8)&0xff,
      tonC&0xff,(tonC>>8)&0xff,
      noiseBase&0xff,
      mix,
      chA.amp,chB.amp,chC.amp,
      0,0,255
    ]);
  }

  var frameCount=dump.length;
  var curFrame=0;

  this.getFrameCount=function(){return frameCount};
  this.getFrameRate=function(){return 50};
  this.getClockRate=function(){return 1773400};
  this.getTurbo=function(){return false};
  this.getNumChips=function(){return 1};
  this.getTrackFileName=function(){return fname};
  this.getTrackName=function(){return fname.replace(/^.*[\\\/]/,"").replace(/\.fxm$/i,"")};
  this.getAuthorName=function(){return"Fuxoft"};
  this.getLoopFrame=function(){return loopPoint};
  this.getNumPositions=function(){return 1};
  this.getLoopPos=function(){return 0};
  this.getDelay=function(){return 0};
  this.getNextFrame=function(){
    if(curFrame>=frameCount)return [[0,0,0,0,0,0,0,0,0,0,0,0,0,255],[],[],true];
    var r=dump[curFrame];
    var looped=++curFrame>=frameCount;
    return [r,[],[],looped];
  };
}}()
if(typeof module!=='undefined'&&module.exports){module.exports={FXM:FXMReader}}
