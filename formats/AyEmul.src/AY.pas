{
This is part of AY Emulator project
AY-3-8910/12 Emulator
Version 3.0 for Windows 95
Author Sergey Vladimirovich Bulba
(c)1999-2004 S.V.Bulba
}

unit AY;

interface

const
//Amplitude tables of sound chips
{ (c)Hacker KAY }
 Amplitudes_AY:array[0..15]of Word=
    (0, 836, 1212, 1773, 2619, 3875, 5397, 8823, 10392, 16706, 23339,
    29292, 36969, 46421, 55195, 65535);
{ (c)V_Soft
 Amplitudes_AY:array[0..15]of Word=
    (0, 513, 828, 1239, 1923, 3238, 4926, 9110, 10344, 17876, 24682,
    30442, 38844, 47270, 56402, 65535);}
{ (c)Lion17
 Amplitudes_YM:array[0..31]of Word=
    (0,  30,  190,  286, 375, 470, 560, 664, 866, 1130, 1515, 1803, 2253,
    2848, 3351, 3862, 4844, 6058, 7290, 8559, 10474, 12878, 15297, 17787,
    21500, 26172, 30866, 35676, 42664, 50986, 58842, 65535);}
{ (c)Hacker KAY }
 Amplitudes_YM:array[0..31]of Word=
    (0, 0, $F8, $1C2, $29E, $33A, $3F2, $4D7, $610, $77F, $90A, $A42,
    $C3B, $EC2, $1137, $13A7, $1750, $1BF9, $20DF, $2596, $2C9D, $3579,
    $3E55, $4768, $54FF, $6624, $773B, $883F, $A1DA, $C0FC, $E094, $FFFF);

type
 TVisPoint = record
  AmpA,AmpB,AmpC,AmpE,
  TnA,TnB,TnC,EnvP,EnvT,Mix,Calc:integer;
 end;
//Available soundchips
  ChTypes = (No_Chip, AY_Chip, YM_Chip);

 TRegisterAY = packed record
 case Integer of
  0:(Index:array[0..15]of byte);
  1:(TonA,TonB,TonC: word;
     Noise:byte;
     Mixer:byte;
     AmplitudeA,AmplitudeB,AmplitudeC:byte;
     Envelope:word;
     EnvType:byte);
 end;

procedure SetEnvelopeRegister(Value:byte);
procedure SetMixerRegister(Value:byte);
procedure SetAmplA(Value:byte);
procedure SetAmplB(Value:byte);
procedure SetAmplC(Value:byte);
procedure SetAYRegister(Num:integer;Value:byte);
procedure SetAYRegisterFast(Num:integer;Value:byte);

procedure Synthesizer_Stereo16(Buf:pointer);
procedure Synthesizer_Stereo8(Buf:pointer);
procedure Synthesizer_Mono16(Buf:pointer);
procedure Synthesizer_Mono8(Buf:pointer);
procedure Case_EnvType_0_3__9;
procedure Case_EnvType_4_7__15;
procedure Case_EnvType_8;
procedure Case_EnvType_10;
procedure Case_EnvType_11;
procedure Case_EnvType_12;
procedure Case_EnvType_13;
procedure Case_EnvType_14;
procedure ResetAYChipEmulation;

procedure MakeBufferOUT(Buf:pointer);
procedure MakeBufferVTX(Buf:pointer);
procedure MakeBufferYM5(Buf:pointer);
procedure MakeBufferYM6(Buf:pointer);
procedure MakeBufferEPSG(Buf:pointer);
procedure MakeBufferPSG(Buf:pointer);
procedure MakeBufferZXAY(Buf:pointer);
procedure MakeBufferPT3(Buf:pointer);
procedure MakeBufferPT2(Buf:pointer);
procedure MakeBufferPT1(Buf:pointer);
procedure MakeBufferSTC(Buf:pointer);
procedure MakeBufferSTP(Buf:pointer);
procedure MakeBufferASC(Buf:pointer);
procedure MakeBufferPSC(Buf:pointer);
procedure MakeBufferSQT(Buf:pointer);
procedure MakeBufferFTC(Buf:pointer);
procedure MakeBufferFLS(Buf:pointer);
procedure MakeBufferGTR(Buf:pointer);
procedure MakeBufferFXM(Buf:pointer);
procedure MakeBufferAY(Buf:pointer);

procedure SynthesizerAY;

const
 NumberOfBuffersDef = 3;
 BufLen_msDef = 300;

var
 NumberOfChannels,SampleBit:integer;
 NumberOfBuffers,BufferLength,BuffLen,BufLen_ms:integer;
 NOfTicks:longword;
 BaseSample:longword;
 VisPoints:array of TVisPoint;
 MkVisPos,VisPosMax,VisPoint,VisStep,VisTickMax:longword;
 Real_End:boolean;
 MakeBuffer:procedure(Buf:pointer);
const
 Filt_NKoefs = 32; //powers of 2
type
 TFilt_K = array of integer;
var
 FilterQuality:integer = 2;
 Filt_M:integer = Filt_NKoefs;
 IsFilt:boolean = True;
 Filt_K,Filt_XL,Filt_XR:TFilt_K;
 Filt_I:integer;
 BeeperMax:integer;
 RegisterAY:TRegisterAY;
 IntFlag:boolean;
 IntBeeper,IntAY:boolean;
 RegNumNext,DatNext:integer;
 Beeper,BeeperNext:integer;
 BeeperLevel:integer;
 Delay_in_tiks:longword;
 FrqAyByFrqZ80:Int64;
 Previous_Tact:integer;
 First_Period:boolean;
 Ampl:integer;
 Tik:packed record
 case integer of
 0:(Lo:word;
    Hi:word);
 1:(Re:longword);
 end;
 Synthesizer:procedure(Buf:pointer);
 Current_Tik:longword;
 Number_Of_Tiks:packed record
 case boolean of
  False:(lo:longword;
         hi:longword);
  True: (re:int64);
 end;
 Envelope_EnA,Envelope_EnB,Envelope_EnC:boolean;
 Flg:smallint;
 Index_AL,Index_AR,Index_BL,Index_BR,Index_CL,Index_CR:byte;
 ChType:ChTypes = YM_Chip;
 PreAmp:integer = 230;
 PreAmpMax:integer = 255;
 BufP:pointer; //for Z80 emu
 AY_Tiks_In_Interrupt:longword;
 ZX_Takt:smallint;
 ZX_Port:word;
 ZX_Port_Data:byte;
 AY_Takt:longint;
 AY_Reg:byte;
 AY_Data:byte;
 Previous_AY_Takt:longint;
 Number_Of_AY_Takts:longint;
 Current_RegisterAY:byte;
 Level_AR,Level_AL,
 Level_BR,Level_BL,
 Level_CR,Level_CL:array[0..31]of Integer;

implementation

uses Z80, UniReader, Formats, Common;

var
    Ton_Counter_A,
    Ton_Counter_B,
    Ton_Counter_C,
    Noise_Counter:packed record
     case integer of
      0:(Lo:word;
         Hi:word);
      1:(Re:longword);
     end;
    Envelope_Counter:packed record
     case integer of
     0:(Lo:longword;
        Hi:longword);
     1:(Re:int64);
     end;
    Ton_A,Ton_B,Ton_C:integer;
    Noise:packed record
     case boolean of
      True: (Seed:longword);
      False:(Low:word;
             Val:longword);
     end;
    Left_Chan,Right_Chan:integer;
    Tick_Counter:byte;
    Ton_EnA,Ton_EnB,
    Ton_EnC,Noise_EnA,
    Noise_EnB,Noise_EnC:boolean;
    Case_EnvType:procedure;

type
 TS16 = packed array[0..0] of record
  Left:smallint;
  Right:smallint;
 end;
 PS16 = ^TS16;
 TS8 = packed array[0..0] of record
  Left:byte;
  Right:byte;
 end;
 PS8 = ^TS8;
 TM16 = packed array[0..0] of smallint;
 PM16 = ^TM16;
 TM8 = packed array[0..0] of byte;
 PM8 = ^TM8;

procedure Case_EnvType_0_3__9;
begin
if First_Period then
 begin
  dec(Ampl);
  if Ampl = 0 then First_Period := False
 end
end;

procedure Case_EnvType_4_7__15;
begin
if First_Period then
 begin
  Inc(Ampl);
  if Ampl = 32 then
   begin
    First_Period := False;
    Ampl := 0
   end
 end
end;

procedure Case_EnvType_8;
begin
Ampl := (Ampl - 1) and 31
end;

procedure Case_EnvType_10;
begin
if First_Period then
 begin
  dec(Ampl);
  if Ampl < 0 then
   begin
    First_Period := False;
    Ampl := 0
   end
 end
else
 begin
  inc(Ampl);
  if Ampl = 32 then
   begin
    First_Period := True;
    Ampl := 31
   end
 end
end;

procedure Case_EnvType_11;
begin
if First_Period then
 begin
  dec(Ampl);
  if Ampl < 0 then
   begin
    First_Period := False;
    Ampl := 31
   end
 end
end;

procedure Case_EnvType_12;
begin
Ampl := (Ampl + 1) and 31
end;

procedure Case_EnvType_13;
begin
if First_Period then
 begin
  inc(Ampl);
  if Ampl = 32 then
   begin
    First_Period := False;
    Ampl := 31
   end
 end
end;

procedure Case_EnvType_14;
begin
if not First_Period then
 begin
  dec(Ampl);
  if Ampl < 0 then
   begin
    First_Period := True;
    Ampl := 0
   end
 end
else
 begin
  inc(Ampl);
  if Ampl = 32 then
   begin
    First_Period := False;
    Ampl := 31
   end
 end
end;

procedure Synthesizer_Logic_Q;
begin
inc(Ton_Counter_A.Hi);
if Ton_Counter_A.Hi >= RegisterAY.TonA then
 begin
  Ton_Counter_A.Hi := 0;
  Ton_A := Ton_A xor 1
 end;
inc(Ton_Counter_B.Hi);
if Ton_Counter_B.Hi >= RegisterAY.TonB then
 begin
  Ton_Counter_B.Hi := 0;
  Ton_B := Ton_B xor 1
 end;
inc(Ton_Counter_C.Hi);
if Ton_Counter_C.Hi >= RegisterAY.TonC then
 begin
  Ton_Counter_C.Hi := 0;
  Ton_C := Ton_C xor 1
 end;
inc(Noise_Counter.Hi);
if (Noise_Counter.Hi and 1 = 0) and
   (Noise_Counter.Hi >= RegisterAY.Noise shl 1) then
 begin
  Noise_Counter.Hi := 0;
  Noise.Val := Random(2); //Real noise algorithm is replaced due Hacker KAY's wish
 end;
if Envelope_Counter.Hi = 0 then Case_EnvType;
inc(Envelope_Counter.Hi);
if Envelope_Counter.Hi >= RegisterAY.Envelope then
 Envelope_Counter.Hi := 0
end;

procedure SetMixerRegister(Value:byte);
begin
RegisterAY.Mixer := Value;
Ton_EnA := (Value and 1) = 0;
Noise_EnA := (Value and 8) = 0;
Ton_EnB := (Value and 2) = 0;
Noise_EnB := (Value and 16) = 0;
Ton_EnC := (Value and 4) = 0;
Noise_EnC := (Value and 32) = 0
end;

procedure SetEnvelopeRegister(Value:byte);
begin
Envelope_Counter.Hi := 0;
First_Period := True;
if (Value and 4) = 0 then
 ampl := 32
else
 ampl := -1;
RegisterAY.EnvType := Value;
Case Value of
0..3,9: Case_EnvType := Case_EnvType_0_3__9;
4..7,15:Case_EnvType := Case_EnvType_4_7__15;
8:      Case_EnvType := Case_EnvType_8;
10:     Case_EnvType := Case_EnvType_10;
11:     Case_EnvType := Case_EnvType_11;
12:     Case_EnvType := Case_EnvType_12;
13:     Case_EnvType := Case_EnvType_13;
14:     Case_EnvType := Case_EnvType_14;
end;
end;

procedure SetAmplA(Value:byte);
begin
RegisterAY.AmplitudeA := Value;
Envelope_EnA := (Value and 16) = 0;
end;

procedure SetAmplB(Value:byte);
begin
RegisterAY.AmplitudeB := Value;
Envelope_EnB := (Value and 16) = 0;
end;

procedure SetAmplC(Value:byte);
begin
RegisterAY.AmplitudeC := Value;
Envelope_EnC := (Value and 16) = 0;
end;

procedure SetAYRegister(Num:integer;Value:byte);
begin
case Num of
13:
 SetEnvelopeRegister(Value and 15);
1,3,5:
 RegisterAY.Index[Num] := Value and 15;
6:
 RegisterAY.Noise := Value and 31;
7: SetMixerRegister(Value and 63);
8: SetAmplA(Value and 31);
9: SetAmplB(Value and 31);
10:SetAmplC(Value and 31);
0,2,4,11,12:
 RegisterAY.Index[Num] := Value
end
end;

procedure SetAYRegisterFast(Num:integer;Value:byte);
begin
case Num of
13:
 SetEnvelopeRegister(Value);
1,3,5:
 RegisterAY.Index[Num] := Value;
6:
 RegisterAY.Noise := Value;
7: SetMixerRegister(Value);
8: SetAmplA(Value);
9: SetAmplB(Value);
10:SetAmplC(Value);
0,2,4,11,12:
 RegisterAY.Index[Num] := Value
end
end;

//sorry for assembler, I can't make effective qword procedure on pascal...
function ApplyFilter(Lev:integer;var Filt_X:TFilt_K):integer;
asm
        push    ebx
        push    esi
        push    edi
        add     esp,-8
        mov     ecx,Filt_M
        mov     edi,Filt_K
        lea     esi,edi+ecx*4
        mov     ebx,[edx]
        mov     ecx,Filt_I
        mov     [ebx+ecx*4],eax
        imul    dword ptr [edi]
        mov     [esp],eax
        mov     [esp+4],edx
@lp:    dec     ecx
        jns     @gz
        mov     ecx,Filt_M
@gz:    mov     eax,[ebx+ecx*4]
        add     edi,4
        imul    dword ptr [edi]
        add     [esp],eax
        adc     [esp+4],edx
        cmp     edi,esi
        jnz     @lp
        mov     Filt_I,ecx
        pop     eax
        pop     edx
        pop     edi
        pop     esi
        pop     ebx
        test    edx,edx
        jns     @nm
        add     eax,0FFFFFFh
        adc     edx,0
@nm:    shrd    eax,edx,24
end;

procedure Synthesizer_Mixer_Q;
var
 LevL,LevR,k:integer;
begin
LevL := Beeper;
LevR := LevL;

k := 1;
if Ton_EnA then k := Ton_A;
if Noise_EnA then k := k and Noise.Val;
if k <> 0 then
 begin
  if Envelope_EnA then
   begin
    inc(LevL,Level_AL[RegisterAY.AmplitudeA * 2 + 1]);
    inc(LevR,Level_AR[RegisterAY.AmplitudeA * 2 + 1])
   end
  else
   begin
    inc(LevL,Level_AL[Ampl]);
    inc(LevR,Level_AR[Ampl])
   end
 end;

k := 1;
if Ton_EnB then k := Ton_B;
if Noise_EnB then k := k and Noise.Val;
if k <> 0 then
 if Envelope_EnB then
  begin
   inc(LevL,Level_BL[RegisterAY.AmplitudeB * 2 + 1]);
   inc(LevR,Level_BR[RegisterAY.AmplitudeB * 2 + 1])
  end
 else
  begin
   inc(LevL,Level_BL[Ampl]);
   inc(LevR,Level_BR[Ampl])
  end;

k := 1;
if Ton_EnC then k := Ton_C;
if Noise_EnC then k := k and Noise.Val;
if k <> 0 then
 if Envelope_EnC then
  begin
   inc(LevL,Level_CL[RegisterAY.AmplitudeC * 2 + 1]);
   inc(LevR,Level_CR[RegisterAY.AmplitudeC * 2 + 1])
  end
 else
  begin
   inc(LevL,Level_CL[Ampl]);
   inc(LevR,Level_CR[Ampl])
  end;

if IsFilt then
 begin
  k := Filt_I;
  LevL := ApplyFilter(LevL,Filt_XL);
  Filt_I := k;
  LevR := ApplyFilter(LevR,Filt_XR)
 end;
 
inc(Left_Chan,LevL);
inc(Right_Chan,LevR)
end;

procedure FillVis;
begin
with VisPoints[MkVisPos], RegisterAY do
 begin
  TnA := TonA;
  TnB := TonB;
  TnC := TonC;
  Mix := Mixer;
  AmpA := AmplitudeA;
  AmpB := AmplitudeB;
  AmpC := AmplitudeC;
  AmpE := Ampl;
  EnvP := Envelope;
  EnvT := EnvType;
  Calc := 0
 end;
Inc(MkVisPos);
if MkVisPos >= VisPosMax then MkVisPos := 0;
Inc(VisPoint,VisStep)
end;

procedure Synthesizer_Stereo16;
var
 Tmp:integer;
begin
repeat
Synthesizer_Logic_Q;
Synthesizer_Mixer_Q;
Inc(Current_Tik);
Inc(Tick_Counter);
if Tick_Counter >= Tik.Hi then
 begin
  Inc(Tik.Re,Delay_In_Tiks);
  Dec(Tik.Hi,Tick_Counter);
  if NOfTicks = VisPoint then FillVis;
  Inc(NOfTicks);
  Tmp := Left_Chan div Tick_Counter;
  if Tmp > 32767 then
   Tmp := 32767
  else if Tmp < -32768 then
   Tmp := -32768;
  PS16(Buf)^[BuffLen].Left := Tmp;
  Tmp := Right_Chan div Tick_Counter;
  if Tmp > 32767 then
   Tmp := 32767
  else if Tmp < -32768 then
   Tmp := -32768;
  PS16(Buf)^[BuffLen].Right := Tmp;
  Inc(BuffLen);
  Tmp := 0;
  Left_Chan:= Tmp;
  Right_Chan := Tmp;
  Tick_Counter := Tmp;
  if BuffLen = BufferLength then
   begin
    if Current_Tik < Number_Of_Tiks.Hi then
     IntFlag := True;
    exit
   end
 end
until Current_Tik >= Number_Of_Tiks.Hi;
Tmp := 0;
Number_Of_Tiks.hi := Tmp;
Current_Tik := Tmp
end;

procedure Synthesizer_Stereo8;
var
 Tmp:integer;
begin
repeat
Synthesizer_Logic_Q;
Synthesizer_Mixer_Q;
Inc(Current_Tik);
Inc(Tick_Counter);
if Tick_Counter >= Tik.Hi then
 begin
  Inc(Tik.Re,Delay_In_Tiks);
  Dec(Tik.Hi,Tick_Counter);
  if NOfTicks = VisPoint then FillVis;
  Inc(NOfTicks);
  Tmp := Left_Chan div Tick_Counter;
  if Tmp > 127 then
   Tmp := 127
  else if Tmp < -128 then
   Tmp := -128;
  PS8(Buf)^[BuffLen].Left := 128 + Tmp;
  Tmp := Right_Chan div Tick_Counter;
  if Tmp > 127 then
   Tmp := 127
  else if Tmp < -128 then
   Tmp := -128;
  PS8(Buf)^[BuffLen].Right := 128 + Tmp;
  Inc(BuffLen);
  Tmp := 0;
  Left_Chan := Tmp;
  Right_Chan := Tmp;
  Tick_Counter := Tmp;
  if BuffLen = BufferLength then
   begin
    if Current_Tik < Number_Of_Tiks.Hi then
     IntFlag := True;
    exit
   end
 end
until Current_Tik >= Number_Of_Tiks.Hi;
Tmp := 0;
Number_Of_Tiks.hi := Tmp;
Current_Tik := Tmp
end;

procedure Synthesizer_Mixer_Q_Mono;
var
 Lev,k:integer;
begin
Lev := Beeper;

k := 1;
if Ton_EnA then k := Ton_A;
if Noise_EnA then k := k and Noise.Val;
if k <> 0 then
 if Envelope_EnA then
  inc(Lev,Level_AL[RegisterAY.AmplitudeA * 2 + 1])
 else
  inc(Lev,Level_AL[Ampl]);

k := 1;
if Ton_EnB then k := Ton_B;
if Noise_EnB then k := k and Noise.Val;
if k <> 0 then
 if Envelope_EnB then
  inc(Lev,Level_BL[RegisterAY.AmplitudeB * 2 + 1])
 else
  inc(Lev,Level_BL[Ampl]);

k := 1;
if Ton_EnC then k := Ton_C;
if Noise_EnC then k := k and Noise.Val;
if k <> 0 then
 if Envelope_EnC then
  inc(Lev,Level_CL[RegisterAY.AmplitudeC * 2 + 1])
 else
  inc(Lev,Level_CL[Ampl]);

if IsFilt then
 Lev := ApplyFilter(Lev,Filt_XL);
 
inc(Left_Chan,Lev)
end;

procedure Synthesizer_Mono16;
var
 Tmp:integer;
begin
repeat
Synthesizer_Logic_Q;
Synthesizer_Mixer_Q_Mono;
Inc(Current_Tik);
Inc(Tick_Counter);
if Tick_Counter >= Tik.Hi then
 begin
  Inc(Tik.Re,Delay_In_Tiks);
  Dec(Tik.Hi,Tick_Counter);
  if NOfTicks = VisPoint then FillVis;
  Inc(NOfTicks);
  Tmp := Left_Chan div Tick_Counter;
  if Tmp > 32767 then
   Tmp := 32767
  else if Tmp < -32768 then
   Tmp := -32768;
  PM16(Buf)^[BuffLen] := Tmp;
  Inc(BuffLen);
  Tmp := 0;
  Left_Chan := Tmp;
  Tick_Counter := Tmp;
  if BuffLen = BufferLength then
   begin
    if Current_Tik < Number_Of_Tiks.Hi then
     IntFlag := True;
    exit
   end
 end
until Current_Tik >= Number_Of_Tiks.Hi;
Tmp := 0;
Number_Of_Tiks.hi := Tmp;
Current_Tik := Tmp
end;

procedure Synthesizer_Mono8;
var
 Tmp:integer;
begin
repeat
Synthesizer_Logic_Q;
Synthesizer_Mixer_Q_Mono;
Inc(Current_Tik);
Inc(Tick_Counter);
if Tick_Counter >= Tik.Hi then
 begin
  Inc(Tik.Re,Delay_In_Tiks);
  Dec(Tik.Hi,Tick_Counter);
  if NOfTicks = VisPoint then FillVis;
  Inc(NOfTicks);
  Tmp := Left_Chan div Tick_Counter;
  if Tmp > 127 then
   Tmp := 127
  else if Tmp < -128 then
   Tmp := -128;
  PM8(Buf)^[BuffLen] := 128 + Tmp;
  Inc(BuffLen);
  Tmp := 0;
  Left_Chan := Tmp;
  Tick_Counter := Tmp;
  if BuffLen = BufferLength then
   begin
    if Current_Tik < Number_Of_Tiks.Hi then
     IntFlag := True;
    exit
   end
 end
until Current_Tik >= Number_Of_Tiks.Hi;
Tmp := 0;
Number_Of_Tiks.hi := Tmp;
Current_Tik := Tmp
end;

procedure ResetAYChipEmulation;
begin
Flg := 0;
IntFlag := False;
Number_Of_Tiks.Re := 0;
Current_Tik := 0;
Envelope_Counter.Re := 0;
Ton_Counter_A.Re := 0;
Ton_Counter_B.Re := 0;
Ton_Counter_C.Re := 0;
Noise_Counter.Re := 0;
Ton_A := 0;
Ton_B := 0;
Ton_C := 0;
Left_Chan := 0; Right_Chan := 0;
Tick_Counter := 0;
Tik.Re := Delay_In_Tiks;
Noise.Seed := $FFFF;
Noise.Val := 0
end;

procedure SynthesizerOUT(Buf:pointer);
var
 ZX_Takt2:smallint;
 Number_Of_Takts:smallInt;
 N_Of_Tiks:packed record
     case boolean of
      false:(lo:longword;
             hi:longword);
      true: (re:int64);
     end;
begin
if not IntFlag then
 begin
 if ZX_Takt = -1 then ZX_Takt2 := 0 else ZX_Takt2 := ZX_Takt;
 Number_Of_Takts := ZX_Takt2 - Previous_AY_Takt;
 if (Number_Of_Takts <= 0) then
  inc(Number_Of_Takts,17472)
 else if (flg > 0) then
  inc(Number_Of_Takts,17472);
 N_Of_Tiks.Re := Number_Of_Tiks.Re + Number_Of_Takts * FrqAyByFrqZ80;
 if N_Of_Tiks.Hi = 0 then
  begin
   if ZX_Takt2 = 0 then inc(Flg);
   exit;
  end;
 Flg := 0;
 Number_Of_Tiks.Re := N_Of_Tiks.Re;
 Previous_AY_Takt := ZX_Takt2;
 end
else
 IntFlag:=False;
Synthesizer(Buf)
end;

procedure MakeBufferOUT(Buf:pointer);
begin
BuffLen := 0;
if IntFlag then
 begin
  SynthesizerOUT(Buf);
  if IntFlag then exit;
  if (ZX_Takt <> -1) and ((ZX_Port and PortMask) = ($BFFD and PortMask)) then
   SetAYRegister(Current_RegisterAY,ZX_Port_Data)
 end;
with UniReadersData[FileHandle]^ do
 if UniFilePos = UniFileSize then
  if not Do_Loop then
   begin
    Real_End := True;
    exit
   end
  else
   InitForAllTypes(False);
repeat
UniRead(FileHandle,@ZX_Takt,2);
UniRead(FileHandle,@ZX_Port,2);
UniRead(FileHandle,@ZX_Port_Data,1);
if (ZX_Takt = -1) or (ZX_Takt = 0) then SynthesizerOUT(Buf);
if ZX_Takt <> -1 then
 if (ZX_Port and PortMask) = ($FFFD and PortMask) then
  Current_RegisterAY := ZX_Port_Data
 else if (ZX_Port and PortMask) = ($BFFD and PortMask) then
  begin
   if ZX_Takt <> 0 then SynthesizerOUT(Buf);
   if not IntFlag then
    SetAYRegister(Current_RegisterAY,ZX_Port_Data)
  end;
with UniReadersData[FileHandle]^ do
 if (UniFilePos = UniFileSize) and (not IntFlag) then
  if not Do_Loop then Real_End := True else InitForAllTypes(False)
until Real_End or (BuffLen = BufferLength)
end;

procedure SynthesizerAY;
asm
  cmp IntFlag,0
  jnz @me
  mov eax,CurrentTact
  sub eax,Previous_Tact
  mov ecx,eax
  mul dword ptr [FrqAyByFrqZ80]
  xchg eax,ecx
  push edx
  mul dword ptr [FrqAyByFrqZ80 + 4]
  pop edx
  add eax,edx
  add ecx,Number_Of_Tiks.lo
  adc eax,Number_Of_Tiks.hi
  jz @me2
  mov Number_Of_Tiks.hi,eax
  mov Number_Of_Tiks.lo,ecx
  mov eax,CurrentTact
  mov Previous_Tact,eax
  mov eax,edx
@me:
  mov IntFlag,0
  mov eax,BufP
  call [Synthesizer]
@me2:
end;

procedure MakeBufferAY;
begin
BufP := Buf;
Bufflen := 0;
if IntFlag then
 begin
  IntFlag := False;
  Synthesizer(Buf);
  if IntFlag then exit;
  if IntBeeper then
   begin
    IntBeeper := False;
    Beeper := BeeperNext
   end;
  if IntAY then
   begin
    IntAY := False;
    SetAYRegister(RegNumNext,DatNext)
   end
 end;
repeat
 asm
  mov al,Z80_Registers.IR.LoByte
  inc al
  and al,$7F
  or al,R_Hi_Bit
  mov Z80_Registers.IR.LoByte,al
 end;
 if IFF and not EIorDDorFD and (CurrentTact < IntLength) then
  begin
   IFF := False;
   Dec(Z80_Registers.SP,2);
   WordPointer(@RAM.Index[Z80_Registers.SP])^ := Z80_Registers.PC;
   case IMode of
   2:
    begin
     Z80_Registers.PC := WordPointer(
        @RAM.Index[Z80_Registers.IR.HiByte * 256 + 255])^;
     Inc(CurrentTact,18)
    end;
   else
    begin
     Z80_Registers.PC := $38;
     Inc(CurrentTact,12)
    end;
   end
  end
 else
  begin
   EIorDDorFD := False;
   Inc(CurrentTact,Z80_ExecuteCommand);
  end;
if CurrentTact >= MaxTStates then
 begin
  Dec(CurrentTact,MaxTStates);
  Dec(Previous_Tact,MaxTStates);
  if Bufflen < BufferLength then
   SynthesizerAY;
  Inc(Global_Tick_Counter);
  if Global_Tick_Counter >= Global_Tick_Max then
   if Do_Loop then
    Global_Tick_Counter := Global_Tick_Max
   else
    begin
     Real_End := True;
     exit
    end
 end
until Bufflen >= BufferLength
end;

procedure SynthesizerZX50(Buf:pointer);
begin
if not IntFlag then
 Number_Of_Tiks.hi := AY_Tiks_In_Interrupt
else
 IntFlag := False;
Synthesizer(Buf)
end;

procedure MakeBufferVTX;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit
  end;
repeat
 VTX_YM2_YM3_YM3b_Get_Registers;
 SynthesizerZX50(Buf);
 if (Global_Tick_Counter >= Global_Tick_Max) and (not IntFlag) then
  if Do_Loop then
   Global_Tick_Counter := Global_Tick_Max
  else
   begin
    Real_End := True;
    exit
   end;
 if Position_In_VTX = NumberOfVBLs then Position_In_VTX := LoopVBL
until Real_End or (BuffLen = BufferLength)
end;

procedure SynthesizerYM6(Buf:pointer);
begin
if not IntFlag then
 begin
  inc(Number_Of_Tiks.re,YM6Tiks);
  if Number_Of_Tiks.hi = 0 then exit
 end
else
 IntFlag := False;
Synthesizer(Buf)
end;

procedure MakeBufferYM5;
var
 MaxT:real;
begin
BuffLen := 0;
if IntFlag then SynthesizerYM6(Buf);
if IntFlag then exit;
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit
  end;
MaxT := YM6TiksOnInt;
if BytePtr(pointer(integer(PVTXYMUnpackedData) + 19))^ and 1 <> 0 then
 repeat
  if YM6CurTik >= MaxT then
   begin
    YM6CurTik := YM6CurTik - MaxT;
    YM5i_Get_Registers
   end;
  YM6_Extra_GetRegisters;
  SynthesizerYM6(Buf);
  if (Global_Tick_Counter >= Global_Tick_Max) and (not IntFlag) then
   if Do_Loop then
    Global_Tick_Counter := Global_Tick_Max
   else
    begin
     Real_End := True;
     exit
    end
 until Real_End or (BuffLen = BufferLength)
else
 repeat
  if YM6CurTik >= MaxT then
   begin
    YM6CurTik := YM6CurTik - MaxT;
    YM5_Get_Registers
   end;
  YM6_Extra_GetRegisters;
  SynthesizerYM6(Buf);
  if (Global_Tick_Counter >= Global_Tick_Max) and (not IntFlag) then
   if Do_Loop then
    Global_Tick_Counter := Global_Tick_Max
   else
    begin
     Real_End := True;
     exit
    end
 until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferYM6;
var
 MaxT:real;
begin
Bufflen := 0;
If IntFlag then SynthesizerYM6(Buf);
If IntFlag then exit;
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit
  end;
MaxT := YM6TiksOnInt;
if BytePtr(pointer(integer(PVTXYMUnpackedData) + 19))^ and 1 <> 0 then
 repeat
  if YM6CurTik >= MaxT then
   begin
    YM6CurTik := YM6CurTik - MaxT;
    YM6i_Get_Registers
   end;
  YM6_Extra_GetRegisters;
  SynthesizerYM6(Buf);
  if (Global_Tick_Counter >= Global_Tick_Max) and (not IntFlag) then
   if Do_Loop then Global_Tick_Counter := Global_Tick_Max else
    begin
     Real_End := True;
     exit
    end
 until Real_End or (BuffLen = BufferLength)
else
 repeat
  if YM6CurTik >= MaxT then
   begin
    YM6CurTik := YM6CurTik - MaxT;
    YM6_Get_Registers
   end;
  YM6_Extra_GetRegisters;
  SynthesizerYM6(Buf);
  if (Global_Tick_Counter >= Global_Tick_Max) and (not IntFlag) then
   if Do_Loop then
    Global_Tick_Counter := Global_Tick_Max
   else
    begin
     Real_End := True;
     exit
    end
 until Real_End or (BuffLen = BufferLength)
end;

procedure SynthesizerEPSG(Buf:pointer);
var
 N_Of_Tiks:packed record
     case boolean of
      false:(lo:longword;
             hi:longword);
      true: (re:int64);
     end;
begin
if not IntFlag then
 begin
  Number_Of_AY_Takts := AY_Takt - Previous_AY_Takt;
  N_Of_Tiks.Re := Number_Of_Tiks.Re + Number_Of_AY_Takts * FrqAyByFrqZ80;
  if N_Of_Tiks.hi = 0 then exit;
  Number_Of_Tiks.Re := N_Of_Tiks.Re;
  Previous_AY_Takt := AY_Takt
 end
else
 IntFlag := False;
Synthesizer(Buf)
end;

procedure MakeBufferEPSG;
var
 EPSGRec:packed record
  case Boolean of
  True:(Reg,Data:byte;
        TSt:longword);
  False:(All:int64);
 end;
begin
BuffLen := 0;
if IntFlag then
 begin
  SynthesizerEPSG(Buf);
  if IntFlag then exit;
  if Flg <> 0 then
   SetAYRegister(AY_Reg,AY_Data)
 end;
if UniReadersData[FileHandle].UniFilePos =
     UniReadersData[FileHandle].UniFileSize then
 if not Do_Loop then
  begin
   Real_End := True;
   exit
  end
 else
  InitForAllTypes(False);
EPSGRec.All := 0;
repeat
UniRead(FileHandle,@EPSGRec,5);
if EPSGRec.All = $FFFFFFFFFF then
 begin
  Flg := 0;
  AY_Takt := 0;
  Dec(Previous_AY_Takt,EPSG_TStateMax);
  SynthesizerEPSG(Buf)
 end
else
 begin
  Flg := 1;
  with EPSGRec do
   begin
    AY_Reg := Reg;
    AY_Data := Data;
    AY_Takt := TSt
   end;
  SynthesizerEPSG(Buf);
  if not IntFlag then
   SetAYRegister(AY_Reg,AY_Data)
 end;
if (UniReadersData[FileHandle].UniFilePos =
     UniReadersData[FileHandle].UniFileSize) and not IntFlag then
 if not Do_Loop then
  Real_End := True
 else
  InitForAllTypes(False)
until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferPSG;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 PSG_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf);
until Real_End or (BuffLen = BufferLength)
end;

procedure SynthesizerZXAY(Buf:pointer);
var
 N_Of_Tiks:packed record
     case boolean of
      false:(lo:longword;
             hi:longword);
      true: (re:int64);
     end;
begin
if not IntFlag then
 begin
  Number_Of_AY_Takts := AY_Takt - Previous_AY_Takt;
  if (Number_Of_AY_Takts <= 0) then inc(Number_Of_AY_Takts,$100000)
  else if (flg > 0) then inc(Number_Of_AY_Takts,$100000);
  N_Of_Tiks.Re := Number_Of_Tiks.Re + Number_Of_AY_Takts*FrqAyByFrqZ80;
  if N_Of_Tiks.hi = 0 then
   begin
    if AY_Takt = 0 then inc(Flg);
    exit
   end;
  Flg := 0;
  Number_Of_Tiks.Re := N_Of_Tiks.Re;
  Previous_AY_Takt := AY_Takt
 end
else
 IntFlag := False;
Synthesizer(Buf);
end;

procedure MakeBufferZXAY;
var
 tmp:integer;
begin
BuffLen := 0;
if IntFlag then
 begin
  SynthesizerZXAY(Buf);
  if IntFlag then exit;
  SetAYRegisterFast(AY_Reg,AY_Data)
 end;
if UniReadersData[FileHandle].UniFilePos >=
     UniReadersData[FileHandle].UniFileSize then
 if not Do_Loop then
  begin
   Real_End := True;
   exit
  end
 else
  InitForAllTypes(False);
repeat
UniRead(FileHandle,@tmp,4);
AY_Takt := tmp and $FFFFF;
AY_Reg := (tmp shr 20) and 15;
AY_Data := tmp shr 24;
SynthesizerZXAY(Buf);
if not IntFlag then
 SetAYRegisterFast(AY_Reg,AY_Data);
if (UniReadersData[FileHandle].UniFilePos >=
     UniReadersData[FileHandle].UniFileSize) and not IntFlag then
 if not Do_Loop then
  Real_End := True
 else
  InitForAllTypes(False)
until Real_End or (Bufflen = BufferLength)
end;

procedure MakeBufferPT3;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 PT3_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf);
until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferPT2;
begin
BuffLen := 0;
If IntFlag then SynthesizerZX50(Buf);
If IntFlag then exit;
repeat
 PT2_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf)
until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferPT1;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 PT1_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf);
until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferSTC;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 STC_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf);
until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferSTP;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 STP_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf)
until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferASC;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 ASC_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf)
until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferPSC;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 PSC_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf)
until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferSQT;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 SQT_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf);
until Real_End or (Bufflen = BufferLength)
end;

procedure MakeBufferFTC;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 FTC_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf)
until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferFLS;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 FLS_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf)
until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferGTR;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 GTR_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf)
until Real_End or (BuffLen = BufferLength)
end;

procedure MakeBufferFXM;
begin
BuffLen := 0;
if IntFlag then SynthesizerZX50(Buf);
if IntFlag then exit;
repeat
 FXM_Get_Registers;
 if not Real_End then SynthesizerZX50(Buf);
until Real_End or (BuffLen = BufferLength)
end;

end.