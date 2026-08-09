{
This is part of AY Emulator project
AY-3-8910/12 Emulator
Version 3.0 for Windows 95
Author Sergey Vladimirovich Bulba
(c)1999-2004 S.V.Bulba
}

{$i Settings.inc}

unit Common;

interface

 uses Windows, Messages;

const
//Default mixer parameters
 SampleRateDef  = 44100;
 SampleBitDef   = 16;
 FrqZ80Def      = 3494400;
 AY_FreqDef     = 1773400;
 IntOffsetDef   = 0;
 BeeperMaxDef   = 128;
 MaxTStatesDef  = 69888;
 Interrupt_FreqDef = 50000;
 Index_ALDef    = 255;
 Index_ARDef    = 13;
 Index_BLDef    = 170;
 Index_BRDef    = 170;
 Index_CLDef    = 13;
 Index_CRDef    = 255;
 NumOfChanDef   = 2;
 ChanModeDef    = 1;
 MFPTimerModeDef = 0;
 MFPTimerFrqDef = 2457600;

//User defined windows messages
 WM_LINEPARAM      = WM_USER;
 WM_PLAYNEXTITEM   = WM_USER + 1;
 WM_TRAYICON       = WM_USER + 3;
 WM_VISUALISATION  = WM_USER + 4;
 WM_GETTIMELENGTH  = WM_USER + 8;

 CLFast = 800; //command line delay if several Ay_Emuls are started
 InitialScan:boolean = False;
 Uninstall:boolean = False;

//Version related constants
 VersionString = '3.0';
 IsBeta = ' alpha';
 BetaNumber = ' 11';
 VersionMajor = 3;
 VersionMinor = 0;
 CompilYs = '2004';
 CompilY = 2004;
 CompilM = 08;
 CompilD = 3;
 CompilS = '3 of August 2004';

//Register paths
 MyRegPath1:string = 'SOFTWARE\Sergey Vladimirovich Bulba';
 MyRegPath2:string = 'ZX Spectrum Sound Chip Emulator';
 MyRegPath3:string = VersionString + IsBeta;
 NumOfOldPaths = 0;
{ MyRegPath3Old:array[1..NumOfOldPaths] of string = ('1.5 beta'#0,'1.5'#0,
                         '2.0 beta'#0,'2.0'#0,'2.2'#0,'2.3'#0,'2.4 beta'#0,
                         '2.4'#0,'2.5 beta','2.5','2.6 beta','2.6','2.7 beta',
                         '2.7');}
 
type
 BytePtr = ^byte;
 WordPtr = ^word;
 DWordPtr = ^longword;

 PArrayOfByte = ^TArrayOfByte;
 TArrayOfByte = packed array[0..0] of byte;

 PArrayOfString = ^TArrayOfString;
 TArrayOfString = array of string;

function IntelWord(Wrd:word):word;
function IntelDWord(DWrd:longword):longword;

procedure Set_Chip_Frq(Fr:integer);
procedure Set_Sample_Rate(SR:integer);
procedure Set_Sample_Bit(SB:integer);
procedure Set_Stereo(St:integer);
procedure Set_StereoCheckWO(St:integer);
procedure Set_Mode(It:Integer);
procedure Set_Mode_Manual(AL,AR,BL,BR,CL,CR:byte);
procedure Set_Player_Frq(Fr:integer);
procedure Set_Z80_Frq(NewF:integer);
procedure Set_MFP_Frq(Md,Fr:integer);
procedure Set_N_Tact(NewF:integer);
procedure SetPriority(Pr:longword);
procedure SetDefault;

procedure Calculate_Level_Tables;

procedure InitAll;
procedure FreeAll;
procedure StopPlaying;
procedure StopAndFreeAll;

procedure CommandLineInterpreter(CL:string;Start:boolean);

function ExpandFileName(const FileName: string): string;

var
 WHandle:longword = 0;
 AHandle:longword = 0;
 AThreadID:longword;
 Do_Loop:boolean = False;
 FrqZ80,Interrupt_Freq,AY_Freq:integer;
 SampleRate:integer;
 OUTZXAYConv_TotalTime:integer;
 MFPTimerMode:integer;
 IntOffset:integer;
 IsPlaying:boolean = False;
 Reseted:integer = 0;
 Paused:boolean;
 CurrTime_Rasch:integer;
 TimePlayStart:DWORD;
 DefaultDirectory:string;
 LastTimeComLine:DWORD;
 AfterScan:array of string;
 Priority:dword = NORMAL_PRIORITY_CLASS;

implementation

uses WaveOUTAPI, Formats, AY, Z80, lightBASS, CDviaMCI
    {$IFDEF WIN32GUI}, MainWin, PLWin {$ENDIF WIN32GUI}, Mixer, Errors, KOL;

function IntelWord;
asm
xchg al,ah
end;

function IntelDWord;
asm
xchg al,ah
ror eax,16
xchg al,ah
end;

procedure CalcFiltKoefs;
var
 i,i2,Filt_M2:integer;
 K,F,C:double;
 FKt:array of double;
begin
C := Pi * SampleRate / (AY_Freq div 8);
SetLength(FKt,Filt_M + 1);
Filt_M2 := Filt_M div 2;
K := 0;
for i := 0 to Filt_M do
 begin
  i2 := i - Filt_M2;
  if i2 = 0 then
   F := C
  else
   F := sin(C * i2) / i2 * (0.54 - 0.46 * cos(2 * Pi / Filt_M * i));
  FKt[i] := F;
  K := K + F
 end;
for i := 0 to Filt_M do
 Filt_K[i] := round(FKt[i] / K * $1000000)
end;

procedure SetFilter(FQ:integer);
begin
SuspendIfWO;
try
FilterQuality := FQ;
if (FQ = 0) or (SampleRate >= AY_Freq div 8) then
 begin
  IsFilt := False;
  Filt_K := nil;
  Filt_XL := nil;
  Filt_XR := nil;
  exit
 end;
IsFilt := True;
Filt_M := round(exp((FQ + 3) * ln(2)));
SetLength(Filt_K,Filt_M + 1);
CalcFiltKoefs;
SetLength(Filt_XL,Filt_M + 1);
SetLength(Filt_XR,Filt_M + 1);
FillChar(Filt_XL[0],(Filt_M + 1) * 4,0);
FillChar(Filt_XR[0],(Filt_M + 1) * 4,0);
Filt_I := 0
finally
ResumeIfWO
end
end;

procedure Set_Chip_Frq(Fr:integer);
begin
if (Fr >= 1000000) and (Fr <= 3000000) then
 begin
  SuspendIfWO;
  try
  AY_Freq := Fr;
  CalculateSpectrumPoints;
  if MFPTimerMode = 0 then
   MFPTimerFrq := round(AY_Freq * 16 / 13);
  Delay_In_Tiks := round(8192/SampleRate * AY_Freq);
  FrqAyByFrqZ80 := round(AY_Freq/FrqZ80/8 * 4294967296);
  Tik.Re := Delay_In_Tiks;
  AY_Tiks_In_Interrupt := round(AY_Freq/(Interrupt_Freq/1000 * 8));
  YM6TiksOnInt := AY_Freq/(Interrupt_Freq/1000 * 8);
  SetFilter(FilterQuality);
{  if IsPlaying then
   begin
    Form2.Edit18.Text := IntToStr(AY_Freq);
    Form2.Edit26.Text := IntToStr(MFPTimerFrq)
   end}
  finally
   ResumeIfWO
  end
 end
end;

procedure SetSynthesizer;
begin
if NumberOfChannels = 2 then
 begin
  if SampleBit = 8 then
   Synthesizer := Synthesizer_Stereo8
  else
   Synthesizer := Synthesizer_Stereo16;
 end
else if SampleBit = 8 then
 Synthesizer := Synthesizer_Mono8
else
 Synthesizer := Synthesizer_Mono16;
Calculate_Level_Tables
end;

procedure Set_StereoCheckWO(St:integer);
begin
if NumberOfChannels <> St then
 begin
  if WaveOutInitialized then
   StopAndFreeAll;
  Set_Stereo(St) 
 end
end;

procedure Set_Stereo(St:integer);
begin
NumberOfChannels := St;
SetSynthesizer
end;

procedure Set_Mode_Manual(AL,AR,BL,BR,CL,CR:byte);
begin
Index_AL := AL; Index_AR := AR;
Index_BL := BL; Index_BR := BR;
Index_CL := CL; Index_CR := CR;
Calculate_Level_Tables
end;

procedure Set_Mode(It:Integer);
var
 Echo:integer;
begin
if It > 0 then
 begin
  if ChType = AY_Chip then Echo := 85 else Echo := 13;
  case It of
  1: begin
      Index_AL := 255; Index_AR := Echo;
      Index_BL := 170; Index_BR := 170;
      Index_CL := Echo; Index_CR := 255
     end;
  2: begin
      Index_AL :=255; Index_AR := Echo;
      Index_BL :=Echo; Index_BR := 255;
      Index_CL :=170; Index_CR := 170
     end;
  3: begin
      Index_AL :=170; Index_AR := 170;
      Index_BL :=255; Index_BR := Echo;
      Index_CL :=Echo; Index_CR := 255
     end;
  4: begin
      Index_AL :=Echo; Index_AR := 255;
      Index_BL :=255; Index_BR := Echo;
      Index_CL :=170; Index_CR := 170
     end;
  5: begin
      Index_AL := 170; Index_AR := 170;
      Index_BL := Echo; Index_BR := 255;
      Index_CL := 255; Index_CR := Echo
     end;
  6: begin
      Index_AL := Echo; Index_AR := 255;
      Index_BL := 170; Index_BR := 170;
      Index_CL := 255; Index_CR := Echo
     end
   end
 end
else
 begin
  Index_AL := 255; Index_AR := 255;
  Index_BL := 255; Index_BR := 255;
  Index_CL := 255; Index_CR := 255
 end;
Calculate_Level_Tables
end;

procedure Set_Player_Frq;
begin
if (Fr >= 1000) and (Fr <= 2000000) and (Interrupt_Freq <> Fr) then
 begin
  SuspendIfWO;
  try
  if (Interrupt_Freq <> Fr) and FileAvailable and
                       (CurFileType in [MinVBLType..MaxVBLType])then
   begin
    Time_ms := round(Time_ms/Fr*Interrupt_Freq);
    ProgrMax := round(Time_ms/1000*SampleRate);
    VProgrPos := round(VProgrPos/Fr*Interrupt_Freq)
   end;
  Interrupt_Freq := Fr;
{  if IsPlaying then
   Form2.Edit23.Text := FloatToStrF(Interrupt_Freq/1000,ffFixed,70,3);}
  AY_Tiks_In_Interrupt := round(AY_Freq/(Interrupt_Freq/1000*8));
  YM6TiksOnInt := AY_Freq/(Interrupt_Freq/1000*8);
  finally
   ResumeIfWO
  end;
  RedrawPlaylist(ShownFrom,0,False);
  CalculateTotalTime(False)
 end
end;

procedure Calculate_Level_Tables;
var
 i,b,l,r:integer;
 Index_A,Index_B,Index_C:integer;
 k:real;
begin
Index_A := Index_AL; Index_B := Index_BL; Index_C := Index_CL;
l := Index_A + Index_B + Index_C;
r := Index_AR + Index_BR + Index_CR;
if NumberOfChannels = 2 then
 begin
  if l < r then
   l := r;
 end
else
 begin
  l := l + r;
  Inc(Index_A,Index_AR);
  Inc(Index_B,Index_BR);
  Inc(Index_C,Index_CR)
 end;
if l = 0 then Inc(l);
if SampleBit = 8 then
 r := 127
else
 r := 32767;
l := 255*r div l;
case ChType of
AY_Chip:
 for i := 0 to 15 do
  begin
   b := round(Index_A/255*Amplitudes_AY[i]);
   b := round(b/65535*l);
   Level_AL[i*2] := b; Level_AL[i*2 + 1] := b;
   b := round(Index_AR/255*Amplitudes_AY[i]);
   b := round(b/65535*l);
   Level_AR[i*2] := b; Level_AR[i*2 + 1] := b;
   b := round(Index_B/255*Amplitudes_AY[i]);
   b := round(b/65535*l);
   Level_BL[i*2] := b; Level_BL[i*2 + 1] := b;
   b := round(Index_BR/255*Amplitudes_AY[i]);
   b := round(b/65535*l);
   Level_BR[i*2] := b; Level_BR[i*2 + 1] := b;
   b := round(Index_C/255*Amplitudes_AY[i]);
   b := round(b/65535*l);
   Level_CL[i*2] := b; Level_CL[i*2 + 1] := b;
   b := round(Index_CR/255*Amplitudes_AY[i]);
   b := round(b/65535*l);
   Level_CR[i*2] := b; Level_CR[i*2 + 1] := b
  end;
YM_Chip:
 for i := 0 to 31 do
  begin
   b := round(Index_A/255*Amplitudes_YM[i]);
   Level_AL[i] := round(b/65535*l);
   b := round(Index_AR/255*Amplitudes_YM[i]);
   Level_AR[i] := round(b/65535*l);
   b := round(Index_B/255*Amplitudes_YM[i]);
   Level_BL[i] := round(b/65535*l);
   b := round(Index_BR/255*Amplitudes_YM[i]);
   Level_BR[i] := round(b/65535*l);
   b := round(Index_C/255*Amplitudes_YM[i]);
   Level_CL[i] := round(b/65535*l);
   b := round(Index_CR/255*Amplitudes_YM[i]);
   Level_CR[i] := round(b/65535*l)
  end
end;
//k := (exp(PreAmp*ln(2)/PreAmpMax) - 1);
k := PreAmp / PreAmpMax; //linear from version 2.7 fix 2
                         //because of volume control is system now 
for i := 0 to 31 do
 begin
  Level_AL[i] := round(Level_AL[i]*k);
  Level_AR[i] := round(Level_AR[i]*k);
  Level_BL[i] := round(Level_BL[i]*k);
  Level_BR[i] := round(Level_BR[i]*k);
  Level_CL[i] := round(Level_CL[i]*k);
  Level_CR[i] := round(Level_CR[i]*k)
 end;
if SampleBit = 8 then
 BeeperLevel := -round(BeeperMax div 2 * k)
else
 BeeperLevel := -round(BeeperMax * 128 * k)
end;

procedure Set_Z80_Frq;
begin
if (NewF >= 1000000) and (NewF <= 8000000) then
 begin
  SuspendIfWO;
  try
  if (FrqZ80 <> NewF) and FileAvailable and
     (CurFileType in [OUTFile,ZXAYFile,AYFile,AYMFile,EPSGFile]) then
   begin
    Time_ms := round(Time_ms/NewF*FrqZ80);
    ProgrMax := round(Time_ms/1000*SampleRate);
    VProgrPos := round(VProgrPos/NewF*FrqZ80)
   end;
  FrqZ80 := NewF;
  FrqAyByFrqZ80 := round(AY_Freq/FrqZ80/8*4294967296);
  finally
   ResumeIfWO;
  end;
  RedrawPlaylist(ShownFrom,0,False);
  CalculateTotalTime(False)
 end
end;

procedure Set_MFP_Frq;
begin
SuspendIfWO;
try
if Md = 0 then
 begin
  MFPTimerMode := 0;
  MFPTimerFrq := round(AY_Freq * 16 / 13)
 end
else
 if (Fr >= 1000000) and (Fr <= 3000000) then
  begin
   MFPTimerMode := 1;
   MFPTimerFrq := Fr
  end;
{if IsPlaying then
 Form2.Edit26.Text := IntToStr(MFPTimerFrq)}
finally
 ResumeIfWO;
end
end;

procedure Set_N_Tact(NewF:integer);
begin
if (NewF > 9999) and (NewF <= 200000) then
 begin
  SuspendIfWO;
  try
  if (MaxTStates <> NewF) and FileAvailable and
     (CurFileType in [AYFile,AYMFile]) then
   begin
    Time_ms := round(Time_ms/MaxTStates*NewF);
    ProgrMax := round(Time_ms/1000*SampleRate);
    VProgrPos := round(VProgrPos/MaxTStates*NewF)
   end;
  MaxTStates := NewF;
  if IntOffset >= MaxTStates then
   begin
    IntOffset := MaxTStates - 1;
//    Form2.FTact.Text := IntToStr(IntOffset)
   end
  finally
   ResumeIfWO;
  end;
  RedrawPlaylist(ShownFrom,0,False);
  CalculateTotalTime(False)
 end
end;

procedure SetDefault;
begin
BeeperMax := BeeperMaxDef;
Set_Z80_Frq(FrqZ80Def);
Set_Player_Frq(Interrupt_FreqDef);
if not WaveOutInitialized then Set_Sample_Rate(SampleRateDef);
Set_Chip_Frq(AY_FreqDef);
Set_MFP_Frq(MFPTimerModeDef,MFPTimerFrqDef);
IntOffset := IntOffsetDef;
Set_N_Tact(MaxTStatesDef);
if not WaveOutInitialized then
 begin
  Set_Sample_Bit(SampleBitDef);
  Set_Stereo(NumOfChanDef);
  SetBuffers(BufLen_msDef,NumberOfBuffersDef);
  WODevice := WODeviceDef
 end;
Set_Mode_Manual(Index_ALDef,Index_ARDef,Index_BLDef,Index_BRDef,
                Index_CLDef,Index_CRDef);
ChType := YM_Chip;
SetFilter(2);
BASSFFTType := BASS_DATA_FFT4096;
BASSAmpMin := 0.003;
Calculate_Level_Tables;
{$IFDEF WIN32GUI}
RedrawPlaylist(ShownFrom,0,False);
CalculateTotalTime(False)
{$ENDIF WIN32GUI}
end;

procedure Set_Sample_Rate(SR:integer);
begin
if not ((SR >= 8000) and (SR < 300000)) then exit;
SampleRate := SR;
VisStep := round(SampleRate/100);
BufferLength := round(BufLen_ms * SampleRate / 1000);
VisPosMax := round(BufferLength * NumberOfBuffers / VisStep) + 1;
VisTickMax := VisStep * VisPosMax;
SetLength(VisPoints,VisPosMax);
Delay_In_Tiks := round(8192/SampleRate*AY_Freq);
SetFilter(FilterQuality)
end;

procedure Set_Sample_Bit(SB:integer);
begin
SampleBit := SB;
SetSynthesizer
end;

procedure SetPriority(Pr:longword);
var
 HMyProcess:longword;
begin
if Pr <> 0 then
 Priority := Pr
else
 Pr := NORMAL_PRIORITY_CLASS;
HMyProcess := GetCurrentProcess;
SetPriorityClass(HMyProcess,Pr);
CloseHandle(HMyProcess);
end;

procedure StopPlaying;
begin
try
if not (CurFileType in [BASSFileMin..BASSFileMax,CDAFile]) then
 StopWOThread
else if CurFileType <> CDAFile then
 PlayFreeBASS
else
 StopCDDevice(CurCDNum)
finally
IsPlaying := False;
Reseted := 0;
Paused := False;
RestoreControls
end
end;

procedure StopAndFreeAll;
begin
try
try
 StopPlaying
finally
 CloseWaveOut;
 FreeBASS;
 UnloadBASS;
 try
  FreeAllCD
 except
 end
end
except
 ShowException(ExceptObject,ExceptAddr)
end
end;

procedure CommandLineInterpreter;
var
 CLPos,CLLen:integer;
 Param:string;
 fileex,quote,Fast:boolean;
 ParamFiles:TArrayOfString;

 procedure CommandLineParameter(CLP:string);
 var
  Ch:char;
  ErrPos,NewFrq,i,j:integer;
  usils:array[0..5]of byte;
  TempStr:string;
 begin
  if CLP = '' then exit;
  if CLP[1] = '/' then
   begin
    if Length(CLP) < 2 then exit;
    case char(byte(CLP[2]) or $20) of
    's':
      begin
       Val(Copy(CLP,3,Length(CLP) - 2),NewFrq,ErrPos);
       if ErrPos = 0 then
        Set_Sample_Rate{2}(NewFrq)
      end;
    'b':
     begin
      Val(Copy(CLP,3,Length(CLP) - 2),NewFrq,ErrPos);
      if ErrPos = 0 then
       Set_Sample_Bit{2}(NewFrq)
     end;
    'z':
     begin
      Val(Copy(CLP,3,Length(CLP) - 2),NewFrq,ErrPos);
      if ErrPos = 0 then Set_Z80_Frq{2}(NewFrq)
     end;
    'y':
     begin
      CLP := LowerCase(Copy(CLP,3,Length(CLP) - 2));
      Val(CLP,NewFrq,ErrPos);
      if ErrPos = 0 then Set_Chip_Frq{2}(NewFrq)
      else if CLP = 'list' then Mixer_AY_Freq_From_List := True
      else if CLP = 'mixer' then Mixer_AY_Freq_From_List := False
     end;
    'q':
     begin
      CLP := Trim(Copy(CLP,3,Length(CLP) - 2));
      if CLP = '' then
       Set_MFP_Frq{2}(0,0)
      else
       begin
        Val(CLP,NewFrq,ErrPos);
        if ErrPos = 0 then
         Set_MFP_Frq{2}(1,NewFrq)
       end
     end;
{    't':
     begin
      Val(Copy(CLP,3,Length(CLP) - 2),NewFrq,ErrPos);
      if ErrPos = 0 then Set_IntOffset2(Newfrq)
     end;}
    'a':
     begin
      CLP := LowerCase(Copy(CLP,3,Length(CLP) - 2));
      if CLP = 'on' then
       IndicatorChecked := True
      else if CLP = 'off' then
       IndicatorChecked := False
     end;
    'f':
     begin
      TempStr := LowerCase(Copy(CLP,3,Length(CLP) - 2));
      if TempStr = 'on' then
       SpectrumChecked := True
      else if TempStr = 'off' then
       SpectrumChecked := False
{      else if (Length(TempStr) > 2) and (TempStr[1] = 'd') then
       begin
        CLP := Copy(CLP,5,Length(CLP) - 4);
        case TempStr[2] of
        'f':FIDO_Descriptor_FileName := CLP;
        'n':FIDO_Descriptor_Nothing := CLP;
        's':FIDO_Descriptor_Suffix := CLP;
        'p':FIDO_Descriptor_Prefix := CLP;
        'e':FIDO_Descriptor_Enabled := CLP <> '0';
        'k':FIDO_Descriptor_KillOnNothing := CLP <> '0';
        'x':FIDO_Descriptor_KillOnExit := CLP <> '0';
        'w':FIDO_Descriptor_WinEnc := CLP <> '0'
        end
       end }
     end;
{    'i':
     Set_N_TactS(Copy(CLP,3,Length(CLP) - 2));}
{    'l':
     if Length(CLP) = 3 then
      begin
       Ch := char(byte(CLP[3]) or $20);
       if Ch in ['e','r'] then
        Set_Language2(Ch = 'r')
      end;}
    'n':
     begin
      CLP := LowerCase(Copy(CLP,3,Length(CLP) - 2));
      Val(CLP,NewFrq,ErrPos);
      if ErrPos = 0 then
       Set_Player_Frq{2}(NewFrq)
      else if CLP = 'list' then
       Mixer_Interrupt_Freq_From_List := True
      else if CLP = 'mixer' then
       Mixer_Interrupt_Freq_From_List := False
     end;
{    'c':
     begin
      CLP := LowerCase(Copy(CLP,3,Length(CLP) - 2));
      if CLP = 'on' then
       Set_Loop2(True)
      else if CLP = 'off' then
       Set_Loop2(False)
     end;}
    'r':
     if Length(CLP) = 3 then
      begin
       Ch := char(byte(CLP[3]) or $20);
       if Ch in ['i','n','h'] then
        begin
         case Ch of
         'i':SetPriority{2}(IDLE_PRIORITY_CLASS);
         'n':SetPriority{2}(NORMAL_PRIORITY_CLASS)
         else SetPriority{2}(HIGH_PRIORITY_CLASS)
         end
        end
      end;
    'h':
     begin
      CLP := UpperCase(Copy(CLP,3,Length(CLP) - 2));
      if CLP = 'MONO' then NewFrq := 0
      else if CLP = 'AYABC' then NewFrq := 1
      else if CLP = 'AYACB' then NewFrq := 2
      else if CLP = 'AYBAC' then NewFrq := 3
      else if CLP = 'AYBCA' then NewFrq := 4
      else if CLP = 'AYCAB' then NewFrq := 5
      else if CLP = 'AYCBA' then NewFrq := 6
      else if CLP = 'YMABC' then NewFrq := 7
      else if CLP = 'YMACB' then NewFrq := 8
      else if CLP = 'YMBAC' then NewFrq := 9
      else if CLP = 'YMBCA' then NewFrq := 10
      else if CLP = 'YMCAB' then NewFrq := 11
      else if CLP = 'YMCBA' then NewFrq := 12
      else if CLP = 'LIST' then
       begin
        Mixer_Channel_Mode_From_List := True;
        NewFrq := -1
       end
      else if CLP = 'MIXER' then
       begin
        Mixer_Channel_Mode_From_List := False;
        NewFrq := -1
       end
      else
       begin
        i := 1;
        CLP := CLP + ',';
        for j := 0 to 5 do
         begin
          TempStr := '';
          while (i <= Length(CLP)) and (CLP[i] <> ',') do
           begin
            TempStr := TempStr + CLP[i];
            Inc(i)
           end;
          Inc(i);
          if i - 1 > Length(CLP) then break;
          Val(TempStr,usils[j],ErrPos);
          if ErrPos <> 0 then break
         end;
        if (i - 1 <= Length(CLP)) and (ErrPos = 0) then
{         with Form2 do
          for j := 0 to 5 do
           SetChan2(usils[j],j);}
        NewFrq := -1
       end;
//      if NewFrq >= 0 then Form2.SetChanIndexes(NewFrq)
     end;
    'd':
     begin
      CLP := UpperCase(Copy(CLP,3,Length(CLP) - 2));
      if CLP = 'MONO' then Set_Stereo{2}(1)
      else if CLP = 'STEREO' then Set_Stereo{2}(2)
      else if CLP = 'LIST' then Mixer_Stereo_From_List := True
      else if CLP = 'MIXER' then Mixer_Stereo_From_List := False
     end;
    'e':
     begin
      CLP := UpperCase(Copy(CLP,3,Length(CLP) - 2));
      if CLP = 'AY' then //Set_Chip2(AY_Chip)
      else if CLP = 'YM' then //Set_Chip2(YM_Chip)
      else if CLP = 'LIST' then Mixer_ChType_From_List := True
      else if CLP = 'MIXER' then Mixer_ChType_From_List := False
     end;
{    'g':
     begin
      CLP := Copy(CLP,3,Length(CLP) - 2);
      if CLP = '0' then
       Set_TrayMode2(0)
      else if CLP = '1' then
       Set_TrayMode2(1)
      else if CLP = '2' then
       Set_TrayMode2(2)
     end;}
    'j':
     begin
      CLP := Copy(CLP,3,Length(CLP) - 2);
      if CLP = '0' then
       TimeMode := 0
      else if CLP = '1' then
       TimeMode := 1
      else if CLP = '2' then
       TimeMode := 2
     end;
    'k':
     begin
      CLP := LowerCase(Copy(CLP,3,Length(CLP) - 2));
      if CLP = 'on' then Do_Scroll := True
      else if CLP = 'off' then Do_Scroll := False
     end;
{    'p':
     LoadSkin(Copy(CLP,3,Length(CLP) - 2),False);}
{    'w':
     begin
      CLP := LowerCase(Copy(CLP,3,Length(CLP) - 2));
      if CLP = 'on' then
       SetAutoSaveDefDir2(True)
      else if CLP = 'off' then
       SetAutoSaveDefDir2(False)
      else if (Length(CLP) > 2) and (CLP[1] = 'o') then
       begin
        Val(Copy(CLP,3,Length(CLP) - 2),NewFrq,ErrPos);
        if ErrPos = 0 then
         case CLP[2] of
         'n':Set_NumberOfBuffers2(NewFrq);
         'l':Set_BufLen_ms2(NewFrq);
         'd':Set_WODevice2(NewFrq)
         end
       end
     end;}
{    'u':
     begin
      Val(Copy(CLP,3,Length(CLP) - 2),NewFrq,ErrPos);
      if ErrPos = 0 then SetChan2(NewFrq,6)
     end;}
    'v':
     begin
      CLP := LowerCase(Copy(CLP,3,Length(CLP) - 2));
      if CLP = 'hide' then
       AppletMinimize
      else if CLP = 'show' then
       Applet.Show
//       ShowApp(False)
     end;
{    'x':
     begin
      CLP := LowerCase(Copy(CLP,3,Length(CLP) - 2));
      if CLP = 'on' then
       SetAutoSaveWindowsPos2(True)
      else if CLP = 'off' then
       SetAutoSaveWindowsPos2(False)
     end;}
{    '!':
     begin
      CLP := LowerCase(Copy(CLP,3,Length(CLP) - 2));
      if CLP = 'on' then
       SetAutoSaveVolumePos2(True)
      else if CLP = 'off' then
       SetAutoSaveVolumePos2(False)
     end}
    end
   end
  else if FileExists(CLP) then
   begin
    fileex := True;
    if not Start and not Fast then StopPlaying;
    i := Length(ParamFiles);
    SetLength(ParamFiles,i + 1);
    ParamFiles[i] := CLP
   end
 end;

var
 First:boolean;

begin
Fast := GetTickCount - LastTimeComLine < CLFast;
fileex := False;
CLPos := 1;
CLLen := Length(CL);
First := True;
while CLPos <= CLLen do
 begin
  quote := False;
  Param := '';
  while (CLPos <= CLLen) and (quote or (CL[CLPos] > ' ')) do
   begin
    if CL[CLPos] = '"' then
     quote := not quote
    else
     Param := Param + CL[CLPos];
    Inc(CLPos)
   end;
  if First then
   First := False
  else
   CommandLineParameter(Param);
  Inc(CLPos)
 end;
if FileEx then
 begin
//  LockScroll;
  try
   if not Start and not Fast then ClearPlayList;
   Add_Files(@ParamFiles);
   CalculateTotalTime(False)
  finally
//   UnLockScroll;
   CreatePlayOrder
  end;
  if not Start and not Fast then PlayItem(0,0)
 end;
LastTimeComLine := GetTickCount
end;

procedure CommandLineAndRegCheck;
var
 i,v,v1:integer;
 subKeyHnd1:HKey;
 MyRegPath,dir:string;
 PlayIt,KeyOpened:boolean;
 Mixers:TSysMixers;

 function GetDW(Nm:PChar; var Vl:integer):boolean;
 var
  i:integer;
 begin
 i := 4;
 Result := RegQueryValueEx(subKeyHnd1,Nm,nil,nil,@Vl,@i) = ERROR_SUCCESS
 end;

 function GetStr(Nm:PChar; var Vl:string):boolean;
 var
  i:integer;
 begin
 Result := RegQueryValueEx(subKeyHnd1,Nm,nil,nil,nil,@i) = ERROR_SUCCESS;
 if Result then
  begin
   SetLength(Vl,i + 1);
   Result := RegQueryValueEx(subKeyHnd1,Nm,nil,nil,@Vl[1],@i) = ERROR_SUCCESS;
   if Result then
    Vl := PChar(Vl)
  end;
 end;

begin
//LockScroll;
try
ClearParams;
MyRegPath := MyRegPath1 + '\' + MyRegPath2 + '\' + MyRegPath3 + #0;
KeyOpened := RegOpenKeyEx(HKEY_CURRENT_USER{HKEY_LOCAL_MACHINE},PChar(MyRegPath),0,
   KEY_EXECUTE,subKeyHnd1) = ERROR_SUCCESS;
SetDefault;
if (integer(GetVersion) < 0) then //Win9x or Win32s
 SetPriority(HIGH_PRIORITY_CLASS);
try
try
if KeyOpened then
 begin
  if GetDW('SampleRate',v) then Set_Sample_Rate{2}(v);
  if GetDW('SampleBit',v) then Set_Sample_Bit{2}(v);
  if GetDW('OutChansMono',v) then Set_Stereo{2}(v);
  if GetDW('OutChansList',v) then Mixer_Stereo_From_List := v <> 0;
//  if GetDW('WODevice',v) then Set_WODevice2(v);
//  if GetDW('BufLen_ms',v) then Set_BufLen_ms2(v);
//  if GetDW('NumberOfBuffers',v) then Set_NumberOfBuffers2(v);
//  if GetDW('Chip',v) then Set_Chip2(ChTypes(v));
  if GetDW('ChipList',v) then Mixer_ChType_From_List := v <> 0;
  if GetDW('FrqZ80',v) then Set_Z80_Frq{2}(v);
  if GetDW('FrqAY',v) then Set_Chip_Frq{2}(v);
  if GetDW('FrqAYList',v) then Mixer_AY_Freq_From_List := v <> 0;
  if GetDW('FrqPl',v) then Set_Player_Frq{2}(v);
  if GetDW('FrqPlList',v) then Mixer_Interrupt_Freq_From_List := v <> 0;
  if GetDW('MaxTStates',v) then Set_N_Tact{2}(v);
//  if GetDW('IntOffset',v) then Set_IntOffset2(v);
  if GetDW('VisAmpls',v) then IndicatorChecked := v <> 0;
  if GetDW('VisSpectrum',v) then SpectrumChecked := v <> 0;
  if GetDW('VisScroll',v) then Do_Scroll := v <> 0;
  if GetDW('FilterQuality',v) then SetFilter{2}(v);
//  if GetDW('Russian',v) then Set_Language2(v <> 0);
//  if GetDW('Loop',v) then Set_Loop2(v <> 0);
//  if GetDW('TrayMode',v) then Set_TrayMode2(v);
  if GetDW('TimeMode',v) then if v in [0..2] then TimeMode := v;
{  SkinDirectory := '';
  if GetStr('Skin',dir) then if dir <> '' then
   begin
    LoadSkin(dir,False);
    SkinDirectory := ExtractFileDir(dir)
   end;
  if GetStr('SkinDirectory',dir) then if dir <> '' then
   SkinDirectory := dir;}
  v1 := MFPTimerMode;
  if GetDW('MFPTimerMode',v) then v1 := v;
  if v1 = 0 then
   Set_MFP_Frq{2}(0,0)
  else
   begin
    v1 := MFPTimerFrq;
    if GetDW('MFPTimerFrq',v) then v1 := v;
    Set_MFP_Frq{2}(1,v1)
   end;
//  if GetDW('AutoSaveDefDir',v) then SetAutoSaveDefDir2(v <> 0);
//  if GetDW('AutoSaveWindowsPos',v) then SetAutoSaveWindowsPos2(v <> 0);
//  if GetDW('AutoSaveVolumePos',v) then SetAutoSaveVolumePos2(v <> 0);
  if GetDW('Priority',v) then SetPriority{2}(v);
{  if GetDW('ChanAL',v) then SetChan2(v,0);
  if GetDW('ChanAR',v) then SetChan2(v,1);
  if GetDW('ChanBL',v) then SetChan2(v,2);
  if GetDW('ChanBR',v) then SetChan2(v,3);
  if GetDW('ChanCL',v) then SetChan2(v,4);
  if GetDW('ChanCR',v) then SetChan2(v,5);
  if GetDW('BeeperMax',v) then SetChan2(v,6);
  if GetDW('PreAmp',v) then SetChan2(v,7);}
  if GetDW('ChansList',v) then Mixer_Channel_Mode_From_List := v <> 0;
{  if GetDW('FIDO_Descriptor_Enabled',v) then FIDO_Descriptor_Enabled := v <> 0;
  if GetDW('FIDO_Descriptor_KillOnExit',v) then FIDO_Descriptor_KillOnExit := v <> 0;
  if GetDW('FIDO_Descriptor_KillOnNothing',v) then FIDO_Descriptor_KillOnNothing := v <> 0;
  if GetDW('FIDO_Descriptor_WinEnc',v) then FIDO_Descriptor_WinEnc := v <> 0;
  if GetStr('FIDO_Descriptor_FileName',dir) then FIDO_Descriptor_FileName := dir;
  if GetStr('FIDO_Descriptor_Nothing',dir) then FIDO_Descriptor_Nothing := dir;
  if GetStr('FIDO_Descriptor_Suffix',dir) then FIDO_Descriptor_Suffix := dir;
  if GetStr('FIDO_Descriptor_Prefix',dir) then FIDO_Descriptor_Prefix := dir;}
  if GetDW('PlayListDirection',v) then if v in [0..3] then SetDirection(v);
  if GetDW('PlayListLoop',v) then
   begin
    ListLooped := v <> 0;
    if ListLooped then
     PLButLoopList.Caption := 'Lp'
    else
     PLButLoopList.Caption := '-'
   end;
{  if GetDW('BASSVisUpdatePeriod',v) then
   if (v >= 5) and (v <= 1000) then
    BASSVisUpdatePeriod := v;}
  if GetDW('BASSFFTType',v) then
   if (DWORD(v) >= BASS_DATA_FFT512) and (DWORD(v) <= BASS_DATA_FFT4096) then
    BASSFFTType := v;
  if GetDW('BASSAmpMin',v) then
   if (v >= 1) and (v <= 1000) then
    BASSAmpMin := v / 10000;
  if GetDW('VolLinear',v) then VolLinear := v <> 0;
  if GetDW('VolMixerNumber',v) then SysVolumeParams.MixerNumber := v;
  if GetDW('VolDestNumber',v) then SysVolumeParams.DestNumber := v;
  if GetDW('VolCtrlNumber',v) then SysVolumeParams.CtrlNumber := v;
  GetSystemMixers(Mixers);
  if not SelectMixerControl(Mixers,SysVolumeParams.MixerNumber,
                                   SysVolumeParams.DestNumber,
                                   SysVolumeParams.CtrlNumber) then
   DetectVolumeCtrl2(Mixers);
  Mixers := nil;
{  if AutoSaveVolumePos then
   begin
    if GetDW('Volume',v) then
     if v < VolumeCtrlMax then
      begin
       VolumeCtrl := v;
       SetSysVolume
      end
   end;}
  DefaultDirectory := '';
  if GetStr('DefaultDirectory',dir) then DefaultDirectory := dir
 end
else
 DetectVolumeCtrl
finally
 SetMixer//Params
end;
dir := ExtractFilePath(ParamStr(0));
SetCurrentDirectory(PChar(dir));
LastTimeComLine := GetTickCount - CLFast;
if ParamCount <> 0 then
 CommandLineInterpreter(GetCommandLine,True);
for i := 0 to Length(AfterScan) - 1 do
 CommandLineInterpreter(AfterScan[i],True);
AfterScan := nil;
PlayIt := Length(PlaylistItems) <> 0;
if not PlayIt then
 begin
  MyRegPath := ExpandFileName('Ay_Emul.ayl');
  if FileExists(MyRegPath) then
   begin
    LoadAYL(MyRegPath);
    if KeyOpened then
     if GetDW('ListItem',v) then
      if (v >= 0) and (v < Length(PlayListItems)) then
       PlayingItem := v;
   end
 end;
CreatePlayOrder;
CalculateTotalTime(False);
if DefaultDirectory = '' then
 DefaultDirectory := dir;
if SetCurrentDirectory(PChar(DefaultDirectory)) then
 LastOpenDir := DefaultDirectory;
if KeyOpened then
 begin
//  if AutoSaveWindowsPos then
   begin
//    Position := poDesigned;
    if GetDW('MainX',v) then MainWnd.Left := v;
    if GetDW('MainY',v) then MainWnd.Top := v;
//    Form3.Position := poDesigned;
    if GetDW('ListX',v) then PLWnd.Left := v;
    if GetDW('ListY',v) then PLWnd.Top := v;
    if GetDW('ListW',v) then PLWnd.Width := v;
    if GetDW('ListH',v) then PLWnd.Height := v;
    if GetDW('ListVis',v) then PLWnd.Visible := v <> 0;
{    Form2.Position := poDesigned;
    if GetDW('MixerX',v) then Form2.Left := v;
    if GetDW('MixerY',v) then Form2.Top := v;
    if GetDW('ToolsX',v) then ToolsX := v;
    if GetDW('ToolsY',v) then ToolsY := v}
   end;
{  if GetDW('AppIcon',v) then SelectAppIcon(v);
  if GetDW('TrayIcon',v) then SelectTrayIcon(v);
  if GetDW('MenuIcon',v) then MenuIconNumber := v;
  if GetDW('MusIcon',v) then MusIconNumber := v;
  if GetDW('SkinIcon',v) then SkinIconNumber := v;
  if GetDW('ListIcon',v) then ListIconNumber := v;
  if GetDW('BASSIcon',v) then BASSIconNumber := v;}
 end;
finally
 if KeyOpened then RegCloseKey(subKeyHnd1)
end;
//FIDO_SaveStatus(FIDO_Nothing);
if PlayIt then
 PlayItem(0,0)
else
 PlayItem(PlayingOrderItem,-1)
finally
// UnlockScroll
end;
InitialScan := True
end;

procedure InitAll;
var
 i,j:integer;
begin
Randomize;
FileMode := 0;
for i := 0 to 15 do
 for j := 0 to 7 do
  YM6SinusTable[i,j] := round(sin(j*2*pi/8)*i/2 + i/2);
ResetMutex := CreateMutex(nil, False, 'AYEmul_Reset');
AThreadID := GetCurrentThreadID;
ClearPlaylist;
try
 CommandLineAndRegCheck;
except
 ShowException(ExceptObject,ExceptAddr)
end
end;

procedure SaveDefaultDir2(subKeyHnd1:integer);
var
 i:integer;
 DefDir:string;
begin
 if (DefaultDirectory <> '') and
    (AnsiUpperCase(DefaultDirectory) <> AnsiUpperCase(ExtractFilePath(ParamStr(0)))) then
  begin
   DefDir := DefaultDirectory + #0;
   i := Length(DefDir);
   i := RegSetValueEx(subKeyHnd1,'DefaultDirectory',0,REG_SZ,
                PChar(DefDir),i);
   //CheckRegError(i)
  end
 else
  begin
   i := RegDeleteValue(subKeyHnd1,'DefaultDirectory');
{   if i <> ERROR_FILE_NOT_FOUND then
    CheckRegError(i)}
  end
end;

procedure SaveParams;
var
 subKeyHnd1:HKey;
 i:integer;
 CreateStatus:longword;
 MyRegPath:string;

 procedure SaveDW(Nm:PChar; const Vl:integer);
 begin
 {CheckRegError(}RegSetValueEx(subKeyHnd1,Nm,0,REG_DWORD,@Vl,4)
 end;

 procedure SaveStr(Nm:PChar; const Vl:string);
 begin
 {CheckRegError(}RegSetValueEx(subKeyHnd1,Nm,0,REG_SZ,PChar(Vl),Length(Vl) + 1)
 end;

begin
if Uninstall then exit;
//RemoveOldPaths;
MyRegPath := MyRegPath1 + '\' + MyRegPath2 + '\' + MyRegPath3 + #0;
i := 0;
i := RegCreateKeyEx(HKEY_CURRENT_USER{HKEY_LOCAL_MACHINE},PChar(MyRegPath),0,@i,
       REG_OPTION_NON_VOLATILE,KEY_ALL_ACCESS,nil,subKeyHnd1,@CreateStatus);
if i <> ERROR_SUCCESS then exit;//CheckRegError(i);
try
 SaveDW('SampleRate',SampleRate);
 SaveDW('SampleBit',SampleBit);
 SaveDW('OutChansMono',Ord(Mixer_Stereo));
 SaveDW('OutChansList',Ord(Mixer_Stereo_From_List));
 SaveDW('WODevice',WODevice);
 SaveDW('BufLen_ms',BufLen_ms);
 SaveDW('NumberOfBuffers',NumberOfBuffers);
 SaveDW('Chip',Ord(Mixer_ChType));
 SaveDW('ChipList',Ord(Mixer_ChType_From_List));
 SaveDW('FrqZ80',FrqZ80);
 SaveDW('FrqAY',Mixer_AY_Freq);
 SaveDW('FrqAYList',Ord(Mixer_AY_Freq_From_List));
 SaveDW('FrqPl',Mixer_Interrupt_Freq);
 SaveDW('FrqPlList',Ord(Mixer_Interrupt_Freq_From_List));
 SaveDW('IntOffset',IntOffset);
 SaveDW('MaxTStates',MaxTStates);
 SaveDW('VisAmpls',Ord(IndicatorChecked));
 SaveDW('VisSpectrum',Ord(SpectrumChecked));
 SaveDW('VisScroll',Ord(Do_Scroll));
// SaveDW('Russian',Ord(Russian_Interface));
 SaveDW('Loop',Ord(Do_Loop));
// SaveDW('TrayMode',TrayMode);
 SaveDW('TimeMode',TimeMode);
{ if Form1.Is_Skined then
  SaveStr('Skin',SkinFileName)
 else
  SaveStr('Skin','');}
 SaveDW('MFPTimerMode',MFPTimerMode);
 SaveDW('MFPTimerFrq',MFPTimerFrq);
// SaveDW('AutoSaveDefDir',Ord(AutoSaveDefDir));
// SaveDW('AutoSaveWindowsPos',Ord(AutoSaveWindowsPos));
// SaveDW('AutoSaveVolumePos',Ord(AutoSaveVolumePos));
 SaveDW('BeeperMax',BeeperMax);
 SaveDW('Priority',Priority);
 SaveDW('ChanAL',Mixer_Index_AL);
 SaveDW('ChanAR',Mixer_Index_AR);
 SaveDW('ChanBL',Mixer_Index_BL);
 SaveDW('ChanBR',Mixer_Index_BR);
 SaveDW('ChanCL',Mixer_Index_CL);
 SaveDW('ChanCR',Mixer_Index_CR);
 SaveDW('ChansList',Ord(Mixer_Channel_Mode_From_List));
{ SaveDW('FIDO_Descriptor_Enabled',Ord(FIDO_Descriptor_Enabled));
 SaveDW('FIDO_Descriptor_KillOnExit',Ord(FIDO_Descriptor_KillOnExit));
 SaveDW('FIDO_Descriptor_KillOnNothing',Ord(FIDO_Descriptor_KillOnNothing));
 SaveDW('FIDO_Descriptor_WinEnc',Ord(FIDO_Descriptor_WinEnc));
 SaveStr('FIDO_Descriptor_FileName',FIDO_Descriptor_FileName);
 SaveStr('FIDO_Descriptor_Nothing',FIDO_Descriptor_Nothing);
 SaveStr('FIDO_Descriptor_Suffix',FIDO_Descriptor_Suffix);
 SaveStr('FIDO_Descriptor_Prefix',FIDO_Descriptor_Prefix);}
 SaveDW('FilterQuality',FilterQuality);
 SaveDW('PreAmp',PreAmp);
// SaveDW('BASSVisUpdatePeriod',BASSVisUpdatePeriod);
 SaveDW('BASSFFTType',BASSFFTType);
 SaveDW('BASSAmpMin',round(BASSAmpMin * 10000));
 SaveDW('VolLinear',Ord(VolLinear));
 SaveDW('VolMixerNumber',SysVolumeParams.MixerNumber);
 SaveDW('VolDestNumber',SysVolumeParams.DestNumber);
 SaveDW('VolCtrlNumber',SysVolumeParams.CtrlNumber);
// if AutoSaveVolumePos then SaveDW('Volume',VolumeCtrl);
// if AutoSaveWindowsPos then
  begin
   SaveDW('MainX',MainWnd.Left);
   SaveDW('MainY',MainWnd.Top);
   SaveDW('ListVis',Ord(ButList.Is_On));
{   SaveDW('MixerX',Form2.Left);
   SaveDW('MixerY',Form2.Top);
   if ButTools.Is_On then
    begin
     ToolsY := Form6.Top;
     ToolsX := Form6.Left
    end;
   SaveDW('ToolsX',ToolsX);
   SaveDW('ToolsY',ToolsY)}
  end;
 SaveDW('ListItem',PlayingItem);
{ SaveDW('AppIcon',AppIconNumber);
 SaveDW('TrayIcon',TrayIconNumber);
 SaveDW('MenuIcon',MenuIconNumber);
 SaveDW('MusIcon',MusIconNumber);
 SaveDW('SkinIcon',SkinIconNumber);
 SaveDW('ListIcon',ListIconNumber);
 SaveDW('BASSIcon',BASSIconNumber);
 SaveStr('SkinDirectory',SkinDirectory);}
 SaveDW('PlayListDirection',Direction);
 SaveDW('PlayListLoop',Ord(ListLooped));
{ if AutoSaveDefDir then }SaveDefaultDir2(subKeyHnd1)
finally
 RegCloseKey(subKeyHnd1)
end
end;

procedure FreeAll;
 function ExtractFileDrive(p:string):string;
 var
  i:integer;
  s:string;
 begin
  Result := '';
  if Length(p) >= 2 then
   if p[2] = ':' then
    Result := Copy(p,1,2) + '\'
   else if (Length(p) >= 3) and (p[1] = '\') and (p[2] = '\') then
    begin
     s := Copy(p,3,Length(p) - 2);
     i := Pos('\',s) - 1;
     if i <= 0 then
      Result := p
     else
      Result := '\\' + Copy(s,1,i)
    end
 end;

var
 p:string;
begin
FreePlayingResourses;
CloseHandle(ResetMutex);
ClipCursor(nil);
SaveParams;
try
p := ExtractFilePath(ParamStr(0));
if Cmp64(DiskFreeSpace(ExtractFileDrive(p)),Int2Int64(100)) > 0 then
 begin
  if (Length(p) <> 0) and (p[Length(p)] <> '\') then p := p + '\';
  p := p + 'Ay_Emul.ayl';
  SaveAYL(p)
 end
except
end;
ClearPlayListItems;
{$IFDEF WIN32GUI}
FreeControls;
{$ENDIF WIN32GUI}
end;

function ExpandFileName(const FileName: string): string;
var
  FName: PChar;
  Buffer: array[0..MAX_PATH - 1] of Char;
begin
  SetString(Result, Buffer, GetFullPathName(PChar(FileName), SizeOf(Buffer),
    Buffer, FName));
end;

end.