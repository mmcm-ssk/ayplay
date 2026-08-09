{
This is part of AY Emulator project
AY-3-8910/12 Emulator
Version 3.0 for Windows 95
Author Sergey Vladimirovich Bulba
(c)1999-2004 S.V.Bulba
}

unit MainWin;

interface

uses Windows,Messages,MMSystem,Common,KOL,AY;

const
  T_ExtraTypes = ';*.trd;*.scl;*.sna;*.$*;*.!*;*.fdi;*.tap;*.zxs';
  T_AllSup = '|*.out;*.zxay;*.zx50;*.stc;*.asc;*.vtx;' +
             '*.ym;*.psg;*.stp;*.psc;*.ftc;*.fls;*.pt1;*.pt2;*.pt3;' +
             '*.sqt;*.gtr;*.fxm;*.m3u;*.ayl;*.ay;*.aym;*.mp3;*.mp2;*.mp1;' +
             '*.ogg;*.wav;*.mo3;*.it;*.xm;*.s3m;*.mtm;*.mod;*.umx;*.cda';
  T_SupTypes =   'Все допустимые типы';
  T_WinampPL =   'Списки проигрывания Winamp (M3U)|*.m3u';
  T_AYEmulPL =   'Списки проигрывания AY_Emul (AYL)|*.ayl';
  T_OUT      =   'Файлы вывода (OUT)|*.out';
  T_ZXAY     =   'Файлы сопроцессора (ZXAY)|*.zxay';
  T_STC      =   'Файлы Sound Tracker (STC)|*.stc';
  T_ASM      =   'Файлы редактора ASM (ASC)|*.asc';
  T_VTX      =   'Файлы Vortex (VTX)|*.vtx';
  T_YM       =   'Файлы ST-Sound (YM)|*.ym';
  T_PSG      =   'Файлы эмуляторов (PSG)|*.psg';
  T_STP      =   'Файлы Sound Tracker Pro (STP)|*.stp';
  T_PSC      =   'Файлы Pro Sound Creator (PSC)|*.psc';
  T_FTC      =   'Файлы Fast Tracker (FTC)|*.ftc';
  T_FLS      =   'Файлы Flash Tracker (FLS)|*.fls';
  T_PT1      =   'Файлы Pro Tracker 1 (PT1)|*.pt1';
  T_PT2      =   'Файлы Pro Tracker 2 (PT2)|*.pt2';
  T_PT3      =   'Файлы Pro Tracker 3 (PT3)|*.pt3';
  T_SQT      =   'Файлы SQ-Tracker (SQT)|*.sqt';
  T_GTR      =   'Файлы Global Tracker (GTR)|*.gtr';
  T_FXM      =   'Файлы AY Language Fuxoft''a (FXM)|*.fxm';
  T_AY       =   'Файлы AYPlay и DeliAY (AY)|*.ay';
  T_AYM      =   'Файлы RDOSPLAY (AYM)|*.aym';
  T_MP3      =   'Файлы MPEG 1 Layer 3 (MP3)|*.mp3';
  T_MP2      =   'Файлы MPEG 1 Layer 2 (MP2)|*.mp2';
  T_MP1      =   'Файлы MPEG 1 Layer 1 (MP1)|*.mp1';
  T_OGG      =   'Файлы Vorbis (OGG)|*.ogg';
  T_WAV      =   'Файлы звукозаписи (WAV)|*.wav';
  T_MO3      =   'Файлы MOD2MO3 (MO3)|*.mo3';
  T_IT       =   'Файлы PC Impulse Tracker (IT)|*.it';
  T_XM       =   'Файлы PC Fast Tracker 2 (XM)|*.xm';
  T_S3M      =   'Файлы PC Scream Tracker 3 (S3M)|*.s3m';
  T_MTM      =   'Файлы PC MultiTracker (MTM)|*.mtm';
  T_MOD      =   'Файлы Generic module format (MOD)|*.mod';
  T_UMX      =   'Пакет музыки Unreal Tournament (UMX)|*.umx';
  T_CDA      =   'Дорожки AudioCD (CDA)|*.cda';
  T_ALL      =   'Все файлы|*.*';

  E_SupTypes =   'All supported types';
  E_WinampPL =   'Winamp Playlists (M3U)|*.m3u';
  E_AYEmulPL =   'AY_Emul Playlists (AYL)|*.ayl';
  E_OUT      =   'OUT files (OUT)|*.out';
  E_ZXAY     =   'Sound chip files (ZXAY)|*.zxay';
  E_STC      =   'Sound Tracker files (STC)|*.stc';
  E_ASM      =   'ASM music editor files (ASC)|*.asc';
  E_VTX      =   'Vortex files (VTX)|*.vtx';
  E_YM       =   'ST-Sound files (YM)|*.ym';
  E_PSG      =   'Emulators files (PSG)|*.psg';
  E_STP      =   'Sound Tracker Pro files (STP)|*.stp';
  E_PSC      =   'Pro Sound Creator files (PSC)|*.psc';
  E_FTC      =   'Fast Tracker files (FTC)|*.ftc';
  E_FLS      =   'Flash Tracker files (FLS)|*.fls';
  E_PT1      =   'Pro Tracker 1 files (PT1)|*.pt1';
  E_PT2      =   'Pro Tracker 2 files (PT2)|*.pt2';
  E_PT3      =   'Pro Tracker 3 files (PT3)|*.pt3';
  E_SQT      =   'SQ-Tracker files (SQT)|*.sqt';
  E_GTR      =   'Global Tracker files (GTR)|*.gtr';
  E_FXM      =   'Fuxoft AY Language (FXM)|*.fxm';
  E_AY       =   'AYPlay and DeliAY files (AY)|*.ay';
  E_AYM      =   'RDOSPLAY files (AYM)|*.aym';
  E_MP3      =   'MPEG 1 Layer 3 files (MP3)|*.mp3';
  E_MP2      =   'MPEG 1 Layer 2 files (MP2)|*.mp2';
  E_MP1      =   'MPEG 1 Layer 1 files (MP1)|*.mp1';
  E_OGG      =   'Vorbis files (OGG)|*.ogg';
  E_WAV      =   'Wave files (WAV)|*.wav';
  E_MO3      =   'MOD2MO3 files (MO3)|*.mo3';
  E_IT       =   'PC Impulse Tracker files (IT)|*.it';
  E_XM       =   'PC Fast Tracker 2 files (XM)|*.xm';
  E_S3M      =   'PC Scream Tracker 3 files (S3M)|*.s3m';
  E_MTM      =   'PC MultiTracker files (MTM)|*.mtm';
  E_MOD      =   'Generic module format files (MOD)|*.mod';
  E_UMX      =   'Unreal Tournament music package (UMX)|*.umx';
  E_CDA      =   'AudioCD Tracks (CDA)|*.cda';
  E_ALL      =   'All files|*.*';

type

  TPrc = procedure;

//Own sens object
  PSensZone = ^TSensZone;
  TSensZone = class(TObject)
  constructor Create(ps:PSensZone;x,y,w,h:integer;pr:TPrc);
  function Touche(x,y:integer):boolean;
  public
  Next:PSensZone;
  zx,zy,zw,zh:integer;
  Clicked:boolean;
  Action:TPrc;
  end;
  
//Own button object
  PButtZone = ^TButtZone;
  TButtZone = class(TObject)
  constructor Create(ps:PButtZone;x,y,w,h,rh:integer;
                     Skin:boolean;{DC_Bmp:HDC}Bmp:PBitmap;
                     x1,y1,x2,y2:integer;pr:TPrc);
  procedure Free;
  function Touche(x,y:integer):boolean;
  procedure Push;
  procedure UnPush;
  procedure Switch_On;
  procedure Switch_Off;
  procedure Redraw(InDBuff:boolean);
  public
  Next:PButtZone;
  zx,zy,zw,zh,RgnHandle:integer;
  Clicked:integer;
  Has_Skin,Is_On,Is_Pushed:boolean;
  Bmp1,Bmp2:PBitmap;
{  Bmp1,Bmp2:HBITMAP;
  DC1,DC2:HDC;}
  Action:TPrc;
  end;

//Own mouse moving object
  PMoveZone = ^TMoveZone;
  TMoveZone = class(TObject)
  constructor Create(ps:PMoveZone;x,y,w,h,y1,h1,rh:integer;pr:TPrc);
  procedure Free;
  function Touche(x,y:integer):boolean;
  function ToucheBut(x,y:integer):boolean;
  procedure AddBitmaps(Bmp:PBitmap;x1,y1,bw,bh:integer;m:boolean);
  procedure Redraw(InDBuff:boolean);
  procedure HideBmp;
  public
  Next:PMoveZone;
  zx,zy,zw,zh,zy1,zh1,Delt,OldX,OldY,PosX,PosY,RgnHandle,
  bm1h,bm1w:integer;
  Clicked,State,Has_Skin,Mask:boolean;
  Bmp1,Bmp2,BmpMask:PBitmap;
//  Bmp1,Bmp2,BmpMask:HBITMAP;
//  DC1,DC2,DCMask:HDC;
  Action:TPrc;
  end;

procedure CreateMainWindow;
procedure MainWKeyDown(Slf:pointer;Sender:PControl;var Key:Longint;Shift:DWORD);
procedure MainWKeyUp(Slf:pointer;Sender:PControl;var Key:Longint;Shift:DWORD);
procedure Add_Item_Dialog(Add:boolean);
procedure Add_Directory_Dialog(Add:boolean);
procedure LoadSkin2xx(FName:string;First:boolean);
procedure RestoreControls;
procedure FreeControls;
procedure RedrawVolume;
procedure RedrawVisChannels(ca,cb,cc,mh:integer);
procedure CalculateSpectrumPoints;
procedure RedrawVisSpectrum(CP:TVisPoint);
procedure ShowProgress(a1:integer);
procedure ReprepareScroll;
procedure ButStopClick;

const
 //Scrolling title
 scr_lineheight = 24;
 scr_x = 108;scr_y = 48;
 scr_width = 197; scr_height = scr_lineheight;

 //Spectrum analizer
 spa_num = 91 - 26 - 2;
 spa_width = spa_num + 2; spa_height = 20;
 spa_x = 26; spa_y = 34;

var
 MainWnd:PControl;
 SensSpa,SensAmp,SensTime:TSensZone;
 ButPlay,ButNext,ButPrev,ButOpen,ButStop,ButPause,ButAbout,
 ButLoop,ButMixer,ButTools,ButList,ButMinimize,ButClose:TButtZone;
 MoveVol,MoveProgr,MoveScr:TMoveZone;
 LastOpenDir:string = '';
 ClearTimeInd:boolean;
 Scroll_Distination:integer = -1;
 Scroll_Offset:integer = scr_lineheight;
 Item_Displayed:integer = -1;
 IndicatorChecked:boolean = True;
 SpectrumChecked:boolean = True;
 SpaBmp,SpaBmpSrc:PBitmap;
 Do_Scroll:boolean = True;
 TimeMode:integer = 0;

implementation

uses UniReader, LH5, Formats, WaveOutAPI, lightBASS, CDviaMCI, PLWin, Mixer;

const
 SensZoneRoot:PSensZone = nil;
 ButtZoneRoot:PButtZone = nil;
 MoveZoneRoot:PMoveZone = nil;

 //Time label
 time_x = 24; time_y = 65;
 time_width = 93-24;time_height = 20;

 //Amplitude analizer
 amp_width = 17; amp_height = 15;
 amp_x = 50; amp_y = 18;

type
 //Spectrum analizer values
 TSpa = array[0..spa_num - 1] of byte;
 PSpa = ^TSpa;

var
  MyFormRgn,RgnClose,RgnMin,RgnMixer,RgnTools,RgnPList,
  RgnLoop,RgnBack,RgnPlay,RgnNext,RgnStop,RgnPause,RgnOpen,
  RgnVol,RgnProgr:HRGN;
  DBuffer:PBitmap = nil;
  ScrBmp,VScrBmp,ScrBmpSrc,
  AmpBmp,AmpBmpSrc,
  TimeBmp,TimeBmpSrc:PBitmap;
  MainWMouseLPrsAt:tagPOINT;
  MainWMouseLeftPressed:boolean = False;
  MainWHeader:record
   Clicked:boolean;
   X,Y,W,H:integer;
  end;
  HorScrl_Offset:integer = 0;
  TimeFont,ScrollFont:HFONT;
  BaseSample:DWORD;
  TimeShown:integer = -MaxInt;
  Scr_Left:boolean = False;
  Scr_Pause:integer = 1;
  pr1:integer = -2;
  pr2:integer = -2;
  ScrFlg:boolean = True;
  sw:integer = scr_width;
  sj,sw1,sj1,sw2,sj2:integer;
  ss,ss1,ss2:string;
  Spa_points:array[0..spa_num] of integer;
  Spa_piks,Spa_prev:TSpa;
  PSpa_Piks,PSpa_prev:PSpa;
 VisEventH:THANDLE;
 VisThreadID:DWORD;
 VisThreadH:THANDLE;

//----Sens zone methods begin---------

constructor TSensZone.Create(ps:PSensZone;x,y,w,h:integer;pr:TPrc);
var
 p:PSensZone;
begin
inherited Create;
zx := x; zy := y; zw := w; zh := h;
if SensZoneRoot = nil then
 SensZoneRoot := ps
else
 begin
  p := SensZoneRoot;
  while p.Next <> nil do p := p.Next;
  p.Next := ps
 end;
Next := nil;
Clicked := False;
Action := pr
end;

function TSensZone.Touche(x,y:integer):boolean;
begin
Result := (x >= zx) and (x < zx + zw) and (y >= zy) and (y < zy + zh)
end;

//----Sens zone methods end---------

//----Sens responders begin---------

procedure SensTimeClick;
begin
Inc(TimeMode);
if TimeMode > 2 then TimeMode := 0
end;

procedure SensSpaClick;
begin
SpectrumChecked := not SpectrumChecked
end;

procedure SensAmpClick;
begin
IndicatorChecked := not IndicatorChecked
end;

//----Sens responders end---------
 
procedure MainWPaint(Slf:pointer;Sender:PControl;DC:HDC);
var
 p:PButtZone;
 p1:PMoveZone;
{ p2:PLedZone;}
begin
if DBuffer = nil then exit;
{if LedZoneRoot <> nil then
 begin
  p2 := LedZoneRoot;
  repeat
   p2.Redraw(True);
   p2 := p2.Next
  until p2 = nil
 end;}
if ButtZoneRoot <> nil then
 begin
  p := ButtZoneRoot;
  repeat
   p.Redraw(True);
   p := p.Next
  until p = nil
 end;
if MoveZoneRoot <> nil then
 begin
  p1 := MoveZoneRoot;
  repeat
   p1.Redraw(True);
   p1 := p1.Next
  until p1 = nil
 end;
//BitBlt(DC_DBuffer,scr_x,scr_y,scr_width,scr_height,DC_Scroll,0,0,SRCCOPY);
DBuffer.CopyRect(MakeRect(scr_x,scr_y,scr_x + scr_width,scr_y + scr_height),ScrBmp,MakeRect(0,0,scr_width,scr_height));
//BitBlt(DC_DBuffer,time_x,time_y,time_width,time_height,DC_Time,0,0,SRCCOPY);
DBuffer.CopyRect(MakeRect(time_x,time_y,time_x + time_width,time_y + time_height),TimeBmp,MakeRect(0,0,time_width,time_height));
MainWnd.Canvas.CopyRect(MakeRect(0,0,358,123),DBuffer.Canvas,MakeRect(0,0,358,123));
end;

procedure MainWMouseDown(Slf:pointer;Sender:PControl; var Mouse:TMouseEventData);
var
 p:PSensZone; 
 p1:PMoveZone;
 p2:PButtZone;
 OfsR:integer;
 r:TRect;
begin
Mouse.StopHandling := True;
//ShiftPressed := ssShift in Shift;
//if ShiftPressed then Shift := Shift - [ssShift];
//if [ssLeft] = Shift then
if Mouse.Button = mbLeft then
 begin
  MainWMouseLPrsAt.x := Mouse.X;
  MainWMouseLPrsAt.y := Mouse.Y;
  MainWHeader.Clicked := (Mouse.X >= MainWHeader.X) and (Mouse.X < MainWHeader.X + MainWHeader.W) and
                         (Mouse.Y >= MainWHeader.Y) and (Mouse.Y < MainWHeader.Y + MainWHeader.H);
  if MainWHeader.Clicked then
   begin
    SystemParametersInfo(SPI_GETWORKAREA,0,@r,0);
    ClipCursor(@r)
   end;
  MainWMouseLeftPressed := True;
  SetCapture(MainWnd.Handle);
  p := SensZoneRoot;
  while p <> nil do
   begin
    if p.Touche(Mouse.X,Mouse.Y) then
     p.Clicked := True;
    p := p.Next
   end;
  p2 := ButtZoneRoot;
  while p2 <> nil do
   begin
    if p2.Has_Skin and (p2.Clicked = 0) and p2.Touche(Mouse.X,Mouse.Y) then
     begin
      p2.Clicked := 1;
      p2.Push
     end;
    p2 := p2.Next
   end;
  p1 := MoveZoneRoot;
  while p1 <> nil do
   begin
    if p1.Has_Skin then
     begin
      if p1.ToucheBut(Mouse.X,Mouse.Y) then
       begin
        p1.OldX := Mouse.X;
        p1.Delt := Mouse.X - p1.posX;
        p1.Clicked := True
       end
      else if p1.Touche(Mouse.X,Mouse.Y) then
       begin
        p1.Clicked := True;
        OfsR := Mouse.X - p1.zx - p1.bm1w div 2;
        if OfsR > p1.zw - p1.bm1w then
         OfsR := p1.zw - p1.bm1w
        else if OfsR < 0 then
         OfsR := 0;
        if OfsR <> p1.PosX then
         begin
          p1.HideBmp;
          OffsetRgn(p1.RgnHandle,OfsR - p1.PosX,0);
          p1.PosX := OfsR;
          p1.Redraw(False);
          p1.Action
         end;
        p1.OldX := Mouse.X;
        p1.Delt := Mouse.X - p1.posX
       end
     end
    else if p1.Touche(Mouse.X,Mouse.Y) then
     begin
      p1.OldX := Mouse.X;
      p1.OldY := Mouse.Y;
      p1.Clicked := True
     end;
    p1 := p1.Next
   end
 end
end;

procedure MainWMouseDblClk(Slf:pointer;Sender:PControl; var Mouse:TMouseEventData);
begin
Mouse.StopHandling := True;
if (Mouse.Button = mbLeft) and MoveScr.Touche(Mouse.X,Mouse.Y) then
 Do_Scroll := not Do_Scroll
else
 MainWMouseDown(Slf,Sender,Mouse)
end;

procedure MainWMouseUp(Slf:pointer;Sender:PControl; var Mouse:TMouseEventData);
var
 p:PSensZone;
 p1:PMoveZone;
 p2:PButtZone;
begin
Mouse.StopHandling := True;
//ShiftPressed := ssShift in Shift;
//if not (ssLeft in Shift) then
if Mouse.Button = mbLeft then
 begin
  MainWHeader.Clicked := False;
  MainWMouseLeftPressed := False;
  ReleaseCapture;
  ClipCursor(nil);
  p := SensZoneRoot;
  while p <> nil do
   begin
    if p.Clicked then
     begin
      if p.Touche(Mouse.X,Mouse.Y) then
       p.Action;
      p.Clicked := False
     end;
    p := p.Next
   end;
  p2 := ButtZoneRoot;
  while p2 <> nil do
   begin
    if p2.Has_Skin and (p2.Clicked = 1) then
     begin
      if p2.Touche(Mouse.X,Mouse.Y) then
       p2.Action;
      p2.Clicked := 0
     end;
    p2 := p2.Next
   end;
  p1 := MoveZoneRoot;
  while p1 <> nil do
   begin
    if p1.Clicked then
     begin
      p1.Clicked := False;
      p1.Action
     end;
    p1 := p1.Next
   end
 end
end;

procedure MainWMouseMove(Slf:pointer;Sender:PControl; var Mouse:TMouseEventData);
var
 p:PButtZone;
 p1:PMoveZone;
 OfsR:integer;
begin
Mouse.StopHandling := True;
//if ssShift in Shift then Shift := Shift - [ssShift];
//if [ssLeft] = Shift then
if MainWMouseLeftPressed then
 begin
  p := ButtZoneRoot;
  while p <> nil do
   begin
    if p.Has_Skin and (p.Clicked = 1) and not p.Is_On then
     if p.Touche(Mouse.X,Mouse.Y) then
      p.Push
     else
      p.UnPush;
    p := p.Next
   end;
  p1 := MoveZoneRoot;
  while p1 <> nil do
   begin
    if p1.Clicked then
     begin
      if p1.Has_Skin then
       begin
        OfsR := p1.posX + Mouse.X - p1.OldX;
        p1.OldX := Mouse.X;
        if OfsR < 0 then
         begin
          p1.OldX := p1.Delt;
          OfsR := 0
         end
        else if OfsR > p1.zw - p1.bm1w then
         begin
          OfsR := p1.zw - p1.bm1w;
          p1.OldX := OfsR + p1.Delt
         end;
        if OfsR <> p1.PosX then
         begin
          p1.HideBmp;
          OffsetRgn(p1.RgnHandle,OfsR - p1.PosX,0);
          p1.PosX := OfsR;
          p1.Redraw(False);
          p1.Action
         end
       end
      else
       begin
        p1.PosX := Mouse.X - p1.OldX;
        p1.PosY := Mouse.Y - p1.OldY;
        p1.Action
       end
     end;
    p1 := p1.Next
   end;
  if MainWHeader.Clicked then
   begin
    MainWnd.Left := MainWnd.Left + Mouse.X - MainWMouseLPrsAt.x;
    MainWnd.Top := MainWnd.Top + Mouse.Y - MainWMouseLPrsAt.y
   end
 end

end;

procedure VolUp;
begin
if MoveVol.PosX < MoveVol.zw - MoveVol.Bm1w then
 begin
  MoveVol.Clicked := False;
  MoveVol.HideBmp;
  Inc(MoveVol.PosX);
  OffsetRgn(MoveVol.RgnHandle,1,0);
  MoveVol.Redraw(False);
  MoveVol.Action
 end
end;

procedure VolDown;
begin
if MoveVol.posX > 0 then
 begin
  MoveVol.Clicked := False;
  MoveVol.HideBmp;
  Dec(MoveVol.PosX);
  OffsetRgn(MoveVol.RgnHandle,-1,0);
  MoveVol.Redraw(False);
  MoveVol.Action
 end
end;

procedure MainWMouseWheel(Slf:pointer;Sender:PControl; var Mouse:TMouseEventData);
var
 i:integer;
begin
Mouse.StopHandling := True;
i := smallint(HIWORD(Mouse.Shift)) div WHEEL_DELTA;
if i > 0 then
 for i := 0 to i - 1 do
  VolUp
else if i < 0 then
 for i := i + 1 to 0 do
  VolDown
end;

procedure GetStringWnJ(const s:string; var w,j:integer);
var
 Sz:tagSIZE;
begin
//GetTextExtentPoint32(DC_VScroll,PChar(s),System.Length(s),Sz);
Sz.cx := VScrBmp.Canvas.TextWidth(s);
j := 0;
w := Sz.cx;
if scr_width > w then
 j := (scr_width - w) div 2
end;

procedure RedrawScroll;
begin
//BitBlt(DC_Scroll,0,0,scr_width,scr_height,DC_Sources,scr_src,0,SRCCOPY);
ScrBmp.CopyRect(MakeRect(0,0,scr_width,scr_height),ScrBmpSrc,MakeRect(0,0,scr_width,scr_height));
//TextOut(DC_VScroll,-HorScrl_Offset + sj,scr_height,PChar(ss),Length(ss));
VScrBmp.Canvas.TextOut(-HorScrl_Offset + sj,scr_height,ss);
//BitBlt(DC_Scroll,0,0,scr_width,scr_height,DC_VScroll,0,scr_height,SRCAND);
ScrBmp.Canvas.CopyRect(MakeRect(0,0,scr_width,scr_height),VScrBmp.Canvas,MakeRect(0,scr_height,scr_width,scr_height * 2));
//BitBlt(DC_Window,scr_x,scr_y,scr_width,scr_height,DC_Scroll,0,0,SRCCOPY)}
MainWnd.Canvas.CopyRect(MakeRect(scr_x,scr_y,scr_x + scr_width,scr_y + scr_height),ScrBmp.Canvas,MakeRect(0,0,scr_width,scr_height))
end;

procedure RedrawTime;
var
 CurTimeJ:integer;
 CurrTimeStr:string;
 Sz:tagSIZE;
 sig:string;
begin
if TimeMode = 1 then sig := '-' else sig := '';
CurrTimeStr := sig + TimeSToStr(abs(TimeShown));
//GetTextExtentPoint32(DC_Time,PChar(CurrTimeStr),Length(CurrTimeStr),Sz);
//GetTextExtentPoint32(TimeBmp.Canvas.Handle,PChar(CurrTimeStr),Length(CurrTimeStr),Sz);
Sz.cx := TimeBmp.Canvas.TextWidth(CurrTimeStr);
CurTimeJ := time_width - Sz.cx;
if CurTimeJ > 0 then CurTimeJ := CurTimeJ div 2;
//BitBlt(DC_Time,0,0,time_width,time_height,DC_Sources,time_src,0,SRCCOPY);
//BitBlt(TimeBmp.Canvas.Handle,0,0,time_width,time_height,TimeBmpSrc.Canvas.Handle,0,0,SRCCOPY);
TimeBmp.CopyRect(MakeRect(0,0,time_width,time_height),TimeBmpSrc,MakeRect(0,0,time_width,time_height));
//TextOut(DC_Time,CurTimeJ,0,PChar(CurrTimeStr),Length(CurrTimeStr));
TimeBmp.Canvas.TextOut(CurTimeJ,0,CurrTimeStr);
//TextOut(TimeBmp.Canvas.Handle,CurTimeJ,0,PChar(CurrTimeStr),Length(CurrTimeStr));
//BitBlt(DC_Window,time_x,time_y,time_width,time_height,DC_Time,0,0,SRCCOPY)
//BitBlt(MainWnd.Canvas.Handle,time_x,time_y,time_width,time_height,TimeBmp.Canvas.Handle,0,0,SRCCOPY)
MainWnd.Canvas.CopyRect(MakeRect(time_x,time_y,time_x + time_width,time_y + time_height),TimeBmp.Canvas,MakeRect(0,0,time_width,time_height))
end;

procedure RedrawVisChannels;
begin
if IndicatorChecked then
 begin
//  BitBlt(DC_Vis,0,0,amp_width,amp_height,DC_Sources,amp_src,0,SRCCOPY);
  AmpBmp.CopyRect(MakeRect(0,0,amp_width,amp_height),AmpBmpSrc,MakeRect(0,0,amp_width,amp_height));
  if ca > 0 then
   begin
//    MoveToex(DC_Vis,1,15,nil);
    AmpBmp.Canvas.MoveTo(1,amp_height);
//    LineTo(DC_Vis,1,16 - ca)
    AmpBmp.Canvas.LineTo(1,amp_height + 1 - ca * amp_height div mh)
   end;
  if cb > 0 then
   begin
//    MoveToex(DC_Vis,8,15,nil);
    AmpBmp.Canvas.MoveTo(8,amp_height);
//    LineTo(DC_Vis,8,16 - cb)
    AmpBmp.Canvas.LineTo(8,amp_height + 1 - cb * amp_height div mh)
   end;
  if cc > 0 then
   begin
//    MoveToex(DC_Vis,15,15,nil);
    AmpBmp.Canvas.MoveTo(15,amp_height);
//    LineTo(DC_Vis,15,16 - cc)
    AmpBmp.Canvas.LineTo(15,amp_height + 1 - cc * amp_height div mh)
   end;
//  BitBlt(DC_Window,amp_x,amp_y,amp_width,amp_height,DC_Vis,0,0,SRCCOPY)
  MainWnd.Canvas.CopyRect(MakeRect(amp_x,amp_y,amp_x + amp_width,amp_y + amp_height),AmpBmp.Canvas,MakeRect(0,0,amp_width,amp_height))
 end
end;

procedure CalculateSpectrumPoints;
var
 i:integer;
begin
Spa_points[0] := $FFF;
for i := 1 to spa_num do
 Spa_points[i] := round($FFF * exp(-ln(16 * 22050 * $FFF/AY_Freq)*i/spa_num))
end;

procedure RedrawVisSpectrum;
var
 p:pointer;
 i,j:integer;
begin
if SpectrumChecked then
 begin
  p := PSpa_prev;
  PSpa_prev := PSpa_piks;
  PSpa_Piks := p;
  for i := 0 to spa_num - 1 do
   begin
    if (CP.TnA > Spa_Points[i + 1]) and (CP.TnA <= Spa_Points[i]) then
     PSpa_piks^[i] := CP.AmpA
    else
     PSpa_piks^[i] := 0;
    if (CP.TnB > Spa_Points[i + 1]) and (CP.TnB <= Spa_Points[i]) then
     if PSpa_piks^[i] < CP.AmpB then
      PSpa_piks^[i] := CP.AmpB;
    if (CP.TnC > Spa_Points[i + 1]) and (CP.TnC <= Spa_Points[i]) then
     if PSpa_piks^[i] < CP.AmpC then
      PSpa_piks^[i] := CP.AmpC
   end;
//  BitBlt(DC_Vis,0,0,spa_width,spa_height,DC_Sources,spa_src,0,SRCCOPY);
  SpaBmp.CopyRect(MakeRect(0,0,spa_width,spa_height),SpaBmpSrc,MakeRect(0,0,spa_width,spa_height));
  for i := 0 to spa_num - 1 do
   begin
    if PSpa_Piks^[i] > 0 then
     begin
//      MoveToex(DC_Vis,i + 1,spa_height,nil);
      SpaBmp.Canvas.MoveTo(i + 1,spa_height);
//      LineTo(DC_Vis,i + 1,(15 - PSpa_Piks^[i])*spa_height div 15)
      SpaBmp.Canvas.LineTo(i + 1,(31 - PSpa_Piks^[i])*spa_height div 30)
     end;
    if PSpa_Prev^[i] > PSpa_Piks^[i] then
     begin
      PSpa_Piks^[i] := PSpa_Prev^[i];
      if PSpa_Piks^[i] > 0 then
       begin
        j := (31 - PSpa_Piks^[i])*spa_height div 30;
//        SetPixel(DC_Vis,i,j,rgb(10,10,10));
        SpaBmp.Pixels[i,j] := rgb(10,10,10);
//        SetPixel(DC_Vis,i + 1,j,rgb(10,10,10));
        SpaBmp.Pixels[i + 1,j] := rgb(10,10,10);
//        SetPixel(DC_Vis,i + 2,j,rgb(10,10,10))
        SpaBmp.Pixels[i + 2,j] := rgb(10,10,10);
       end;
      Dec(PSpa_Piks^[i],2)
     end
   end;
//  BitBlt(DC_Window,spa_x,spa_y,spa_width,spa_height,DC_Vis,0,0,SRCCOPY)
  MainWnd.Canvas.CopyRect(MakeRect(spa_x,spa_y,spa_x + spa_width,spa_y + spa_height),SpaBmp.Canvas,MakeRect(0,0,spa_width,spa_height))
 end
end;

procedure ShowProgress;

 function divmul(q1,q2,q3:dword):dword;register;
 asm
  mul q2
  div q3
 end;

var
 x:word;
begin
ProgrPos := a1;
if (ProgrMax = 0) then exit;
if ProgrMax < ProgrPos then ProgrPos := ProgrMax;
x := divmul(ProgrWidth,ProgrPos,ProgrMax);
if ProgrX <> x then
 begin
  ProgrX := x;
  if MoveProgr.Clicked then exit;
  MoveProgr.HideBmp;
  OffsetRgn(MoveProgr.RgnHandle,x - MoveProgr.PosX,0);
  MoveProgr.PosX := x;
  MoveProgr.Redraw(False)
 end
end;

procedure DoVisualisation;
var
 Y_Stp:integer;
 Points_To_Scroll:integer;
 Temp,Temp1:integer;
begin
 begin
 WOVisualisation;
 BASSVisualisation;
 CDVisualisation;
 if ClearTimeInd then
  begin
//   BitBlt(DC_Time,0,0,time_width,time_height,DC_Sources,time_src,0,SRCCOPY);
   TimeBmp.CopyRect(MakeRect(0,0,time_width,time_height),TimeBmpSrc,MakeRect(0,0,time_width,time_height));
//   BitBlt(DC_Window,time_x,time_y,time_width,time_height,DC_Sources,time_src,0,SRCCOPY);
   MainWnd.Canvas.CopyRect(MakeRect(time_x,time_y,time_x + time_width,time_y + time_height),TimeBmpSrc.Canvas,MakeRect(0,0,time_width,time_height));
   TimeShown := -MaxInt;
   ClearTimeInd := False
  end;
 if Time_ms <> 0 then
  begin
   case TimeMode of
   0: Temp := round(CurrTime_Rasch / 1000);
   1:
    begin
     Temp := Time_ms - CurrTime_Rasch;
     if Temp < 0 then Temp := 0;
     Temp := -round(Temp / 1000);
    end
   else
    Temp := round(Time_ms / 1000);
   end;
   if Temp <> TimeShown then
    begin
     TimeShown := Temp;
     RedrawTime
    end
  end;
 Temp := Item_Displayed;
 Temp1 := Scroll_Distination;
 if Abs(Temp1 - Temp) > 16 then
  begin
   if Temp1 > Temp then
    Temp := Temp1 - 16
   else
    Temp := Temp1 + 16;
   Item_Displayed := Temp;
   ss := GetPlayListString(PlaylistItems[Temp]);
   GetStringWnJ(ss,sw,sj);
//   TextOut(DC_VScroll,sj,scr_lineheight,PChar(ss),Length(ss));
   VScrBmp.Canvas.TextOut(sj,scr_lineheight,ss);
   pr1 := -2; pr2 := -2
  end;
 Points_To_Scroll := scr_lineheight*(Temp1 - Temp + 1) - Scroll_Offset;
 if Points_To_Scroll <> 0 then
  begin
   ScrFlg := False;
   Y_Stp := (Abs(Points_To_Scroll) - 1) div scr_lineheight + 1;
   if Y_Stp >= scr_lineheight then Y_Stp := scr_lineheight - 1;
   if Points_To_Scroll > 0 then
    begin
     if (Scroll_Offset >= scr_lineheight) and (Temp <> pr2) then
      begin
       pr2 := Temp;
{       FillRect(DC_VScroll,Rect(0,scr_lineheight*2,
                scr_width,scr_lineheight*3),Brush_VScroll);}
       VScrBmp.Canvas.FillRect(MakeRect(0,scr_lineheight*2,scr_width,scr_lineheight*3));
       if Temp + 1 < Length(PlaylistItems) then
        begin
         ss2 := GetPlayListString(PlaylistItems[Temp + 1]);
         GetStringWnJ(ss2,sw2,sj2);
//         TextOut(DC_VScroll,sj2,scr_lineheight*2,PChar(ss2),Length(ss2))
         VScrBmp.Canvas.TextOut(sj2,scr_lineheight * 2,ss2);
        end
      end;
     Inc(Scroll_Offset,Y_Stp);
     if Scroll_Offset >= 2*scr_lineheight then
      begin
       HorScrl_Offset := 0;
       ss := ss2; sw := sw2; sj := sj2;
{       BitBlt(DC_VScroll,0,0,scr_width,scr_lineheight*2,
              DC_VScroll,0,scr_lineheight,SRCCOPY);}
       VScrBmp.CopyRect(MakeRect(0,0,scr_width,scr_lineheight*2),VScrBmp,MakeRect(0,scr_lineheight,scr_width,scr_lineheight + scr_lineheight*2));
       Dec(Scroll_Offset,scr_lineheight);
       Inc(Temp);
       Item_Displayed := Temp
      end
    end
   else
    begin
     if (Scroll_Offset <= scr_lineheight) and (Temp <> pr1) then
      begin
       pr1 := Temp;
//       FillRect(DC_VScroll,Rect(0,0,scr_width,scr_lineheight),Brush_VScroll);
       VScrBmp.Canvas.FillRect(MakeRect(0,0,scr_width,scr_lineheight));
       if Temp - 1 >= 0 then
        begin
         ss1 := GetPlayListString(PlaylistItems[Temp - 1]);
         GetStringWnJ(ss1,sw1,sj1);
//         TextOut(DC_VScroll,sj1,0,PChar(ss1),Length(ss1))
         VScrBmp.Canvas.TextOut(sj1,0,ss1)
        end
      end;
     Dec(Scroll_Offset,Y_Stp);
     if Scroll_Offset <= 0 then
      begin
       HorScrl_Offset := 0;
       ss := ss1; sw := sw1; sj := sj1;
{       BitBlt(DC_VScroll,0,scr_lineheight,scr_width,scr_lineheight*2,
              DC_VScroll,0,0,SRCCOPY);}
       VScrBmp.CopyRect(MakeRect(0,scr_lineheight,scr_width,scr_lineheight + scr_lineheight*2),VScrBmp,MakeRect(0,0,scr_width,scr_lineheight*2));
       Inc(Scroll_Offset,scr_lineheight);
       Dec(Temp);
       Item_Displayed := Temp
      end
    end;
//   BitBlt(DC_Scroll,0,0,scr_width,scr_height,DC_Sources,scr_src,0,SRCCOPY);
   ScrBmp.CopyRect(MakeRect(0,0,scr_width,scr_height),ScrBmpSrc,MakeRect(0,0,scr_width,scr_height));
//   BitBlt(DC_Scroll,0,0,scr_width,scr_height,DC_VScroll,0,Scroll_Offset,SRCAND);
   ScrBmp.Canvas.CopyRect(MakeRect(0,0,scr_width,scr_height),VScrBmp.Canvas,MakeRect(0,Scroll_Offset,scr_width,Scroll_Offset + scr_height));
//   BitBlt(DC_Window,scr_x,scr_y,scr_width,scr_height,DC_Scroll,0,0,SRCCOPY)
   MainWnd.Canvas.CopyRect(MakeRect(scr_x,scr_y,scr_x + scr_width,scr_y + scr_height),ScrBmp.Canvas,MakeRect(0,0,scr_width,scr_height))
  end;
 if ScrFlg then
  begin
   pr1 := -2;
   pr2 := -2
  end;
 if Do_Scroll and ScrFlg and (sw > scr_width) and
    not MoveScr.Clicked then
  begin
   Dec(Scr_Pause);
   if Scr_Pause = 0 then
    begin
     Inc(Scr_Pause);
     if Scr_Left then
      begin
       Dec(HorScrl_Offset);
       if HorScrl_Offset < 0 then
        begin
         Scr_Left := False;
         HorScrl_Offset := 0;
         Scr_Pause := 50
        end
       else
        RedrawScroll
      end
     else
      begin
       Inc(HorScrl_Offset);
       if HorScrl_Offset > sw - scr_width then
        begin
         Scr_Left := True;
         HorScrl_Offset := sw - scr_width;
         Scr_Pause := 50
        end
       else
        RedrawScroll
      end
    end
  end
 else
  ScrFlg := True;

 end;
end;

procedure MainWDestroy;
begin
StopAndFreeAll;
FreeAll;
end;

procedure WMLINEPARAM;
var
 HBlock,l:DWORD;
 HAddr:PChar;
begin
HBlock := OpenFileMapping(FILE_MAP_ALL_ACCESS,False,'Ay_Emul Command Line Area');
if HBlock <> 0 then
 try
  pointer(HAddr) := MapViewOfFile(HBlock,FILE_MAP_ALL_ACCESS,0,0,MAX_PATH + 1);
  if HAddr <> nil then
   try
    if InitialScan then
     CommandLineInterpreter(HAddr,False)
    else
     begin
      l := Length(AfterScan) + 1;
      SetLength(AfterScan,l);
      AfterScan[l - 1] := HAddr
     end
   finally
    UnmapViewOfFile(pointer(HAddr))
   end
 finally
  CloseHandle(HBlock)
 end
end;

function MainWMessage(Slf:pointer;var Msg:TMsg; var Rslt:Integer):Boolean;
var
 p:PButtZone;
 p1:PMoveZone;
 Flg:boolean;
 pr:dword;
begin
Result := False;
case Msg.message of
WM_LINEPARAM:
 WMLINEPARAM;
WM_VISUALISATION:
 begin
  Rslt := 0;
  Result := True;
  if DBuffer <> nil then
   DoVisualisation
 end;
WM_CLOSE,WM_ENDSESSION:
 SetPriority(0);
WM_DESTROY:
 MainWDestroy;
WM_KILLFOCUS:
 begin
  Rslt := 0;
  Result := True;
  MainWMouseLeftPressed := False;
  ClipCursor(nil);
  p := ButtZoneRoot;
  while p <> nil do
   begin
    if p.Has_Skin and (p.Clicked <> 0) then
     begin
      p.Clicked := 0;
      if not p.Is_On then p.UnPush
     end;
    p := p.Next
   end;
  p1 := MoveZoneRoot;
  while p1 <> nil do
   begin
    if p1.Has_Skin and p1.Clicked then
     p1.Clicked := False;
    p1 := p1.Next
   end
 end;
WM_PLAYNEXTITEM:
 begin
  Result := True;
  StopPlaying;
  Flg := Direction = 3;
  if not Flg then
   begin
    PlayNextItem;
    Flg := PlayingItem >= Length(PlayListItems) - 1
   end;
  if not IsPlaying and Flg then
   StopAndFreeAll;
 end;
MM_MIXM_CONTROL_CHANGE:
 if (Msg.WParam = SysVolumeParams.MixerHandle) and
    (Msg.LParam = SysVolumeParams.ControlID) then
  GetSysVolume;
MM_MCINOTIFY:
 begin
  Result := True;
  if not CheckCDNum(CurCDNum) then exit;
  if Msg.LParam <> integer(CDIDs[CurCDNum]) then exit;
  if Msg.WParam = MCI_NOTIFY_SUCCESSFUL then
   PostMessage(MainWnd.Handle,WM_PLAYNEXTITEM,0,0);
 end;
WM_ERASEBKGND:
 begin
  Rslt := 1;
  Result := True;
  MainWPaint(Slf,nil,Msg.WParam)
 end;
end
end;

procedure MainWKeyDown;

 procedure UnClickAllButButt(Butt:TButtZone);
 var
  p:PButtZone;
 begin
  p := ButtZoneRoot;
  while p <> nil do
   begin
    if p <> @Butt then
     if p.Clicked <> 0 then
      begin
       p.Clicked := 0;
       if not p.Is_On then p.UnPush
      end;
    p := p.Next
   end
 end;

 procedure Push(Bt:TButtZone);
 begin
  if Bt.Clicked = 0 then
   begin
    UnClickAllButButt(Bt);
    Bt.Clicked := 2;
    Bt.Push
   end
 end;

begin
case Key of
byte('P'):
 Push(ButTools);
byte('J'):
 begin
  UnClickAllButButt(nil);
//  JumpToTime
 end;
byte('E'):
 Push(ButList);
byte('G'):
 Push(ButMixer);
byte('R'):
 Push(ButLoop);
byte('X'),VK_NUMPAD5:
 Push(ButPlay);
byte('V'):
 Push(ButStop);
byte('C'):
 Push(ButPause);
byte('B'),VK_NUMPAD6:
 Push(ButNext);
byte('Z'),VK_NUMPAD4:
 Push(ButPrev);
byte('L'),VK_NUMPAD0:
 Push(ButOpen);
VK_UP,VK_NUMPAD8:
 VolUp;
VK_DOWN,VK_NUMPAD2:
 VolDown;
VK_LEFT:
 begin
  UnClickAllButButt(nil);
  if Time_ms > 0 then
   Rewind(CurrTime_Rasch - 5000,Time_ms)
 end;
VK_RIGHT:
 begin
  UnClickAllButButt(nil);
  if Time_ms > 0 then
   Rewind(CurrTime_Rasch + 5000,Time_ms)
 end;
VK_F1:
 begin
  UnClickAllButButt(nil);
//  CallHelp
 end
end
end;

procedure MainWKeyUp;

 procedure TryClick(Bt:TButtZone);
 begin
  if Bt.Clicked = 2 then
   begin
    Bt.Clicked := 0;
    Bt.Action
   end
 end;

begin
case Key of
byte('T'):
 SensTimeClick;
byte('1'):
 SensAmpClick;
byte('2'):
 SensSpaClick;
byte('P'):
 TryClick(ButTools);
byte('E'):
 TryClick(ButList);
byte('G'):
 TryClick(ButMixer);
byte('R'):
 TryClick(ButLoop);
byte('X'),VK_NUMPAD5:
 TryClick(ButPlay);
byte('V'):
 TryClick(ButStop);
byte('C'):
 TryClick(ButPause);
byte('B'),VK_NUMPAD6:
 TryClick(ButNext);
byte('Z'),VK_NUMPAD4:
 TryClick(ButPrev);
byte('L'),VK_NUMPAD0:
 TryClick(ButOpen)
end
end;

//----Own button methods begin---------

constructor TButtZone.Create;
var
 p:PButtZone;
begin
inherited Create;
zx := x; zy := y; zw := w; zh := h;
RgnHandle := rh;
if ButtZoneRoot = nil then
 ButtZoneRoot := ps
else
 begin
  p := ButtZoneRoot;
  while p.Next <> nil do p := p.Next;
  p.Next := ps
 end;
Next := nil;
Is_On := False;
Is_Pushed := False;
Clicked := 0;
Action := pr;
Has_Skin := Skin;
if not Skin then exit;
//DC1 := CreateCompatibleDC(DC_Window);
//Bmp1 := SelectObject(DC1,CreateCompatibleBitmap(DC_Window,zw,zh));
//BitBlt(DC1,0,0,zw,zh,DC_Bmp,x1,y1,SRCCOPY);
Bmp1 := NewBitmap(zw,zh);
Bmp1.CopyRect(MakeRect(0,0,zw,zh),Bmp,MakeRect(x1,y1,x1+zw,y1+zh));
//DC2 := CreateCompatibleDC(DC_Window);
//Bmp2 := SelectObject(DC2,CreateCompatibleBitmap(DC_Window,zw,zh));
//BitBlt(DC2,0,0,zw,zh,DC_Bmp,x2,y2,SRCCOPY)
Bmp2 := NewBitmap(zw,zh);
Bmp2.CopyRect(MakeRect(0,0,zw,zh),Bmp,MakeRect(x2,y2,x2+zw,y2+zh));
end;

function TButtZone.Touche(x,y:integer):boolean;
begin
if RgnHandle <> 0 then
 Result := PtInRegion(RgnHandle,x,y)
else
 Result := (x >= zx) and (x < zx + zw) and (y >= zy) and (y < zy + zh)
end;

procedure TButtZone.Free;
begin
if not Has_Skin then exit;
//DeleteObject(SelectObject(DC1,Bmp1));
//DeleteDC(DC1);
Bmp1.Free;
//DeleteObject(SelectObject(DC2,Bmp2));
//DeleteDC(DC2);
Bmp2.Free;
DeleteObject(RgnHandle);
inherited
end;

procedure TButtZone.Redraw(InDBuff:boolean);
var
 Bmp:PBitmap;
begin
if not Has_Skin then exit;
Bmp := Bmp1;
if Is_Pushed then Bmp := Bmp2;
if InDBuff then
//  BitBlt(DC_DBuffer,zx,zy,zw,zh,DC1,0,0,SRCCOPY)
 DBuffer.CopyRect(MakeRect(zx,zy,zx+zw,zy+zh),Bmp,MakeRect(0,0,zw,zh))
else
//  BitBlt(DC_Window,zx,zy,zw,zh,DC1,0,0,SRCCOPY)
 MainWnd.Canvas.CopyRect(MakeRect(zx,zy,zx+zw,zy+zh),Bmp.Canvas,MakeRect(0,0,zw,zh))
end;

procedure TButtZone.Push;
begin
if not Is_Pushed then
 begin
  Is_Pushed := True;
  Redraw(False)
 end
end;

procedure TButtZone.UnPush;
begin
if Is_Pushed then
 begin
  Is_Pushed := False;
  Redraw(False)
 end
end;

procedure TButtZone.Switch_On;
begin
if not Is_On then
 Is_On := True;
Push
end;

procedure TButtZone.Switch_Off;
begin
if Is_On then
 Is_On := False;
UnPush
end;

//----Own button methods end---------

//----Button responders begin---------

procedure ButLoopClick;
begin
if ButLoop.Is_On then
 ButLoop.Switch_Off
else
 ButLoop.Is_On := True;
Do_Loop := ButLoop.Is_On
end;

procedure ButPrevClick;
begin
ButPrev.UnPush;
PlayPreviousItem
end;

procedure ButNextClick;
begin
ButNext.UnPush;
PlayNextItem
end;

procedure PlayClick;
begin
if IsPlaying then exit;
if not FileAvailable then
 begin
  ButPlay.UnPush;
  exit
 end;
PlayCurrent
end;

procedure ButPauseClick;
begin
if not IsPlaying then
 begin
  ButPause.UnPush;
  exit
 end;
if not (CurFileType in [BASSFileMin..BASSFileMax,CDAFile]) then
 WOPauseRestart
else if CurFileType <> CDAFile then
 begin
  Paused := True;
  SwitchPause;
//  TimePlayStart := GetTickCount - TimePlayStart;
  Paused := BASSPaused
 end
else
 begin
  CDSwitchPause(CurCDNum,MainWnd.Handle);
  Paused := CDPlayingPaused
 end;
if not Paused then
 begin
//  FIDO_SaveStatus(FIDO_Playing);
  ButPause.Switch_Off
 end
else
 begin
//  FIDO_SaveStatus(FIDO_Nothing);
  ButPause.Switch_On
 end
end;

procedure ButStopClick;
begin
try
 StopAndFreeAll
finally
 ButStop.UnPush
end
end;

procedure ButOpenClick;
begin
ButOpen.UnPush;
if GetKeyState(VK_SHIFT) and 128 = 0 then
 Add_Item_Dialog(False)
else
 Add_Directory_Dialog(False)
end;

procedure ButMinClick;
begin
ButMinimize.UnPush;
AppletMinimize
end;

procedure ButCloseClick;
begin
MainWnd.Close
end;

procedure ButMixerClick;
begin
if ButMixer.Is_On then
 ButMixer.Switch_Off
else
 ButMixer.Is_On := True;
//Form2.Visible := ButMixer.Is_On
end;

procedure ButListClick;
begin
if ButList.Is_On then
 ButList.Switch_Off
else
 ButList.Is_On := True;
PLWnd.Visible := ButList.Is_On
end;

procedure ButToolsClick;
begin
if not ButTools.Is_On then
 begin
 ButTools.Is_On := True;
{ FinderWorksNow := False;
 Form6 := TForm6.Create(Self);
 with Form6 do
  begin
   AppIcSel := TIconSelector.Create(GenTools);
   AppIcSel.DoSelectIcon := SelectAppIcon;
   AppIcSel.IcGrp.Top := 227;
   AppIcSel.IcGrp.Left := 210;
   AppIcSel.IcGrp.Caption := 'Application icon';
   AppIcSel.IconUpDown.Position := AppIconNumber;
   AppIcSel.ShowIcon;

   TrayIcSel := TIconSelector.Create(GenTools);
   TrayIcSel.DoSelectIcon := SelectTrayIcon;
   TrayIcSel.IcGrp.Top := 227;
   TrayIcSel.IcGrp.Left := 108;
   TrayIcSel.IcGrp.Caption := 'Tray icon';
   TrayIcSel.IconUpDown.Position := TrayIconNumber;
   TrayIcSel.ShowIcon;

   StartIcSel := TIconSelector.Create(GenTools);
   StartIcSel.DoSelectIcon := SelectMenuIcon;
   StartIcSel.IcGrp.Top := 227;
   StartIcSel.IcGrp.Left := 6;
   StartIcSel.IcGrp.Caption := '''Start'' menu icon';
   StartIcSel.IconUpDown.Position := MenuIconNumber;
   StartIcSel.ShowIcon;

   MusIcSel := TIconSelector.Create(FTypTools);
   MusIcSel.DoSelectIcon := SelectMusIcon;
   MusIcSel.IcGrp.Top := 10;
   MusIcSel.IcGrp.Left := 10;
   MusIcSel.IcGrp.Caption := 'Music files icon';
   MusIcSel.IconUpDown.Position := MusIconNumber;
   MusIcSel.ShowIcon;

   SkinIcSel := TIconSelector.Create(FTypTools);
   SkinIcSel.DoSelectIcon := SelectSkinIcon;
   SkinIcSel.IcGrp.Top := 190;
   SkinIcSel.IcGrp.Left := 10;
   SkinIcSel.IcGrp.Caption := 'Skin files icon';
   SkinIcSel.IconUpDown.Position := SkinIconNumber;
   SkinIcSel.ShowIcon;

   ListIcSel := TIconSelector.Create(FTypTools);
   ListIcSel.DoSelectIcon := SelectListIcon;
   ListIcSel.IcGrp.Top := 100;
   ListIcSel.IcGrp.Left := 10;
   ListIcSel.IcGrp.Caption := 'Playlists icon';
   ListIcSel.IconUpDown.Position := ListIconNumber;
   ListIcSel.ShowIcon;

   BASSIcSel := TIconSelector.Create(FTypTools);
   BASSIcSel.DoSelectIcon := SelectBASSIcon;
   BASSIcSel.IcGrp.Top := 100;
   BASSIcSel.IcGrp.Left := 200;
   BASSIcSel.IcGrp.Caption := 'BASS files icon';
   BASSIcSel.IconUpDown.Position := BASSIconNumber;
   BASSIcSel.ShowIcon;

   FillTools;
   Edit1.Text := SkinAuthor;
   Edit2.Text := SkinComment;
   Edit3.Text := SkinFileName;
   Edit4.Text := DefaultDirectory;
   CheckBox38.Checked := AutoSaveDefDir;
   CheckBox40.Checked := AutoSaveWindowsPos;
   if (OpenDialog1.InitialDir<>'') and
      (OpenDialog1.InitialDir[Length(OpenDialog1.InitialDir)]<>'\') then
    DName.Text:=OpenDialog1.InitialDir+'\'
   else
    DName.Text:=OpenDialog1.InitialDir;
   DName.Text:=DName.Text+'AY Finder Temporary Folder';
   case Priority of
   IDLE_PRIORITY_CLASS:RadioButton3.Checked:=True;
   NORMAL_PRIORITY_CLASS:RadioButton4.Checked:=True;
   HIGH_PRIORITY_CLASS:RadioButton5.Checked:=True;
   end;
   case TrayMode of
   0:RadioButton8.Checked:=True;
   1:RadioButton9.Checked:=True;
   2:RadioButton10.Checked:=True;
   end;
   if Russian_Interface then RadioButton6.Checked:=True
   else RadioButton7.Checked:=True;
   CheckBox29.Checked := FIDO_Descriptor_Enabled;
   CheckBox42.Checked := FIDO_Descriptor_KillOnNothing;
   CheckBox41.Checked := FIDO_Descriptor_KillOnExit;
   CheckBox43.Checked := FIDO_Descriptor_WinEnc;
   Edit6.Text := FIDO_Descriptor_Prefix;
   Edit7.Text := FIDO_Descriptor_Suffix;
   Edit8.Text := FIDO_Descriptor_Nothing;
   Edit5.Text := FIDO_Descriptor_Filename;
   SetIfRegPath;
   STC_Registered := CheckRegistration('.stc',0);
   ZXS_Registered := CheckRegistration('.zxs',0);
   STP_Registered := CheckRegistration('.stp',0);
   ASC_Registered := CheckRegistration('.asc',0);
   PSC_Registered := CheckRegistration('.psc',0);
   SQT_Registered := CheckRegistration('.sqt',0);
   AYL_Registered := CheckRegistration('.ayl',1);
   PT1_Registered := CheckRegistration('.pt1',0);
   PT2_Registered := CheckRegistration('.pt2',0);
   PT3_Registered := CheckRegistration('.pt3',0);
   FTC_Registered := CheckRegistration('.ftc',0);
   FLS_Registered := CheckRegistration('.fls',0);
   GTR_Registered := CheckRegistration('.gtr',0);
   FXM_Registered := CheckRegistration('.fxm',0);
   M3U_Registered := CheckRegistration('.m3u',1);
   OUT_Registered := CheckRegistration('.out',0);
   ZXAY_Registered := CheckRegistration('.zxay',0);
   PSG_Registered := CheckRegistration('.psg',0);
   VTX_Registered := CheckRegistration('.vtx',0);
   AY_Registered := CheckRegistration('.ay',0);
   AYM_Registered := CheckRegistration('.aym',0);
   YM_Registered := CheckRegistration('.ym',0);
   AYS_Registered := CheckRegistration('.ays',2);
   MP3_Registered := CheckRegistration('.mp3',3);
   MP2_Registered := CheckRegistration('.mp2',3);
   MP1_Registered := CheckRegistration('.mp1',3);
   OGG_Registered := CheckRegistration('.ogg',3);
   WAV_Registered := CheckRegistration('.wav',3);
   MO3_Registered := CheckRegistration('.mo3',3);
   IT_Registered := CheckRegistration('.it',3);
   XM_Registered := CheckRegistration('.xm',3);
   S3M_Registered := CheckRegistration('.s3m',3);
   MTM_Registered := CheckRegistration('.mtm',3);
   MOD_Registered := CheckRegistration('.mod',3);
   UMX_Registered := CheckRegistration('.umx',3);
   CDA_Registered := CheckRegistration('.cda',0);
   SetRegInfo
  end;}
 end
//else if not FinderWorksNow then PostMessage(Form6.Handle,WM_CLOSE,0,0)
end;

procedure ButAboutClick;
begin
//{$ifdef beta}
MessageBox(0,'AY Emulator'#13'Version ' + VersionString + IsBeta +
                BetaNumber + #13+
                'Author Sergey Bulba'#13'Design Ivan Reshetnikov'+
                #13'Compiled at ' + CompilS + #13'(c)1999-' +
                CompilYs + ' S.V.Bulba'#13'http://bulba.at.kz/',
                'About program',MB_OK or MB_TASKMODAL);
//{$endif}
(*
  with TAboutBox.Create(Self) do
  try
   {$ifdef beta}
   AbDBuffer.Canvas.TextOut(142,255,IsBeta + BetaNumber);
   {$endif}
   ShowModal;
  finally
   Free;*)
   ButAbout.UnPush
//  end
end;

//----Button responders end---------

//----Move methods begin---------

constructor TMoveZone.Create;
var
 p:PMoveZone;
begin
inherited Create;
zx := x; zy := y; zw := w; zh := h;
zy1 := y1; zh1 := h1;
RgnHandle := rh;
PosX := 0;
if MoveZoneRoot = nil then
 MoveZoneRoot := ps
else
 begin
  p := MoveZoneRoot;
  while p.Next <> nil do p := p.Next;
  p.Next := ps
 end;
Next := nil;
Mask := False;
Has_Skin := False;
State := False;
Clicked := False;
Action := pr
end;

function TMoveZone.ToucheBut(x,y:integer):boolean;
begin
Result := PtInRegion(RgnHandle,x,y)
end;

function TMoveZone.Touche(x,y:integer):boolean;
begin
Result := ((x >= zx) and (x < zx + zw) and
           (y >= zy + zy1) and (y < zy + zy1 + zh1))
end;

procedure TMoveZone.AddBitmaps;
begin
Has_Skin := True;
//DC1 := CreateCompatibleDC(DC_Window);
//Bmp1 := SelectObject(DC1,CreateCompatibleBitmap(DC_Window,bw,bh));
Bm1w := bw;
Bm1h := bh;
Bmp1 := NewBitmap(bw,bh);
//BitBlt(DC1,0,0,bw,bh,DC_Bmp,x1,y1,SRCCOPY);
Bmp1.CopyRect(MakeRect(0,0,bw,bh),Bmp,MakeRect(x1,y1,x1+bw,y1+bh));
if m then
 begin
{  DCMask := CreateCompatibleDC(DC_Window);
  BmpMask := SelectObject(DCMask,CreateBitmap(bw,bh,1,1,nil));
  SetBkColor(DC_Bmp,GetPixel(DC_Bmp,x1,y1));
  BitBlt(DCMask,0,0,bw,bh,DC_Bmp,x1,y1,SRCCOPY);
  SetBkColor(DC1, RGB(0,0,0));
  SetTextColor(DC1,RGB(255,255,255));
  BitBlt(DC1,0,0,bw,bh,DCMask,0,0,SRCAND);}
  BmpMask := NewBitmap(bw,bh);
  BmpMask.Assign(Bmp1);
  BmpMask.Convert2Mask(Bmp1.Pixels[0,0]);
  Mask := True
 end;
//DC2 := CreateCompatibleDC(DC_Window);
//Bmp2 := SelectObject(DC2,CreateCompatibleBitmap(DC_Window,zw,zh));
//BitBlt(DC2,0,0,zw,zh,DC_Bmp,zx,zy,SRCCOPY)
Bmp2 := NewBitmap(zw,zh);
Bmp2.CopyRect(MakeRect(0,0,zw,zh),Bmp,MakeRect(zx,zy,zx+zw,zy+zh));
end;

procedure TMoveZone.Free;
begin
if Has_Skin then
 begin
//  DeleteObject(SelectObject(DC1,Bmp1));
//  DeleteDC(DC1);
  Bmp1.Free;
//  DeleteObject(SelectObject(DC2,Bmp2));
//  DeleteDC(DC2);
  Bmp2.Free;
  if Mask then
   begin
//    DeleteObject(SelectObject(DCMask,BmpMask));
//    DeleteDC(DCMask)
    BmpMask.Free;
   end;
  DeleteObject(RgnHandle);
 end;
inherited
end;

procedure TMoveZone.Redraw;
begin
if Has_Skin then
 begin
  if not Mask then
//   BitBlt(DC_DBuffer,zx + PosX,zy,Bm1w,Bm1h,DC1,0,0,SRCCOPY)
   DBuffer.CopyRect(MakeRect(zx + PosX,zy,zx + PosX + Bm1w,zy + Bm1h),
                    Bmp1,MakeRect(0,0,Bm1w,Bm1h))
  else
   begin
//    BitBlt(DC_DBuffer,zx + PosX,zy,Bm1w,Bm1h,DCMask,0,0,SRCAND);
//    BitBlt(DC_DBuffer,zx + PosX,zy,Bm1w,Bm1h,DC1,0,0,SRCPAINT)
    Bmp1.DrawMasked(DBuffer.Canvas.Handle,zx + PosX,zy,BmpMask.Handle)
   end;
  if not InDBuff then
//   BitBlt(DC_Window,zx,zy,zw,zh,DC_DBuffer,zx,zy,SRCCOPY)}
   MainWnd.Canvas.CopyRect(MakeRect(zx,zy,zx+zw,zy+zh),
                           DBuffer.Canvas,MakeRect(zx,zy,zx+zw,zy+zh))
 end;
end;

procedure TMoveZone.HideBmp;
begin
if Has_Skin then
// BitBlt(DC_DBuffer,zx + PosX,zy,Bm1w,Bm1h,DC2,PosX,0,SRCCOPY)
 DBuffer.CopyRect(MakeRect(zx + PosX,zy,zx + PosX + Bm1w,zy + Bm1h),Bmp2,MakeRect(PosX,0,PosX + Bm1w,Bm1h))
end;

//----Move responders begin---------

procedure DoMovingVol;
begin
VolumeCtrl := MoveVol.PosX;
SetSysVolume
end;

procedure DoMovingProgr;
begin
Rewind(MoveProgr.PosX,ProgrWidth)
end;

procedure DoMovingScroll;
begin
Inc(MoveScr.OldX,MoveScr.PosX);
if sw <= scr_width then exit;
if Scroll_Distination <> Item_Displayed then exit;
Dec(HorScrl_Offset,MoveScr.PosX);
if HorScrl_Offset < 0 then
 HorScrl_Offset := 0
else if HorScrl_Offset > sw - scr_width then
 HorScrl_Offset := sw - scr_width;
RedrawScroll
end;

//----Move responders end---------

procedure SetVolumeWidth(vw:integer);
begin
VolumeCtrl := vw;
VolumeCtrlMax := VolumeCtrl;
MoveVol.PosX := VolumeCtrl;
end;

procedure CopyBmpSources;
begin
{BitBlt(DC_Sources,spa_src,0,spa_width,spa_height,
       DC_DBuffer,spa_x,spa_y,SRCCOPY);}
SpaBmpSrc.CopyRect(MakeRect(0,0,spa_width,spa_height),DBuffer,
       MakeRect(spa_x,spa_y,spa_x + spa_width,spa_y + spa_height));
{BitBlt(DC_Sources,amp_src,0,amp_width,amp_height,
       DC_DBuffer,amp_x,amp_y,SRCCOPY);}
AmpBmpSrc.CopyRect(MakeRect(0,0,amp_width,amp_height),DBuffer,
       MakeRect(amp_x,amp_y,amp_x + amp_width,amp_y + amp_height));
{BitBlt(DC_Sources,time_src,0,time_width,time_height,
       DC_DBuffer,time_x,time_y,SRCCOPY);}
TimeBmpSrc.CopyRect(MakeRect(0,0,time_width,time_height),DBuffer,
       MakeRect(time_x,time_y,time_x + time_width,time_y + time_height));
{BitBlt(DC_Sources,scr_src,0,scr_width,scr_height,
       DC_DBuffer,scr_x,scr_y,SRCCOPY);}
ScrBmpSrc.CopyRect(MakeRect(0,0,scr_width,scr_height),DBuffer,
       MakeRect(scr_x,scr_y,scr_x + scr_width,scr_y + scr_height));
{BitBlt(DC_Time,0,0,time_width,time_height,
       DC_Sources,time_src,0,SRCCOPY);}
TimeBmp.CopyRect(MakeRect(0,0,time_width,time_height),TimeBmpSrc,
       MakeRect(0,0,time_width,time_height));
{BitBlt(DC_Scroll,0,0,scr_width,scr_height,
       DC_Sources,scr_src,0,SRCCOPY)}
ScrBmp.CopyRect(MakeRect(0,0,scr_width,scr_height),ScrBmpSrc,
       MakeRect(0,0,scr_width,scr_height));
end;

procedure LoadSkin2xx(FName:string;First:boolean);

 function AddRoundRectRgnR(a,b,c,d,e,f:integer):HRGN;
 begin
  Result := CreateRoundRectRgn(a,b,c,d,e,f);
  CombineRgn(MyFormRgn,MyFormRgn,Result,RGN_OR)
 end;

 procedure AddRoundRectRgn(a,b,c,d,e,f:integer);
 begin
  DeleteObject(AddRoundRectRgnR(a,b,c,d,e,f))
 end;

procedure SetMainBmp(p:pointer;size:integer);
const
 RegionVolPoints:array[0..2] of tagPOINT =
  ((x:237+70-18;y:21+11),(x:237+70;y:21+11),(x:237+70;y:21));
 RegionProgrPoints:array[0..11] of tagPOINT =
  ((x:96;y:84),(x:100;y:84),(x:100;y:83),(x:112;y:83),(x:112;y:84),
   (x:116;y:84),(x:116;y:92),(x:112;y:92),(x:112;y:93),(x:100;y:93),
   (x:100;y:92),(x:96;y:92));
var
 Stream:PStream;
 Bitmap:PBitmap;
begin

MyFormRgn := CreateRectRgn(51,1,311,114);
AddRoundRectRgn(0,0,115,115,115,115);
AddRoundRectRgn(358-115,0,358,115,115,115);
RgnLoop := AddRoundRectRgnR(62-10,110-10,62+11,110+11,21,21);
RgnBack := AddRoundRectRgnR(80,96,80+35,123,14,14);
RgnPlay := AddRoundRectRgnR(119,96,119+35,123,14,14);
RgnPause := AddRoundRectRgnR(158,96,158+35,123,14,14);
RgnStop := AddRoundRectRgnR(197,96,197+35,123,14,14);
RgnNext := AddRoundRectRgnR(235,96,235+35,123,14,14);
RgnOpen := AddRoundRectRgnR(275,96,275+35,123,14,14);
RgnMixer := CreateRoundRectRgn(318,21,318+26,21+26,26,26);
RgnPList := CreateRoundRectRgn(310,77,310+26,77+26,26,26);
RgnTools := CreateRoundRectRgn(322,50,322+26,50+26,26,26);
RgnMin := CreateRoundRectRgn(282,6,282+16,6+16,16,16);
RgnClose := CreateRoundRectRgn(304,6,304+16,6+16,16,16);
MainWnd.Height := 123;
MainWnd.Width := 358;
SetWindowRgn(MainWnd.Handle,MyFormRgn,True);

Stream := NewMemoryStream;
Stream.Write(p^,size);
Stream.Position := 0;
Bitmap := NewBitmap(0,0);
Bitmap.LoadFromStream(Stream);
Stream.Free;

DBuffer := NewBitmap(358,123);

DBuffer.CopyRect(MakeRect(0,0,358,123),Bitmap,MakeRect(0,0,358,123));
//BitBlt(DC_DBuffer,0,0,MWWidth,MWHeight,Bitmap.Canvas.Handle,0,0,SRCCOPY);
ButPlay := TButtZone.Create(@ButPlay,119,96,35,27,RgnPlay,
                            True,Bitmap,119,96,119,122,PlayClick);
ButPrev := TButtZone.Create(@ButPrev,80,96,35,27,RgnBack,
                            True,Bitmap,80,96,80,122,ButPrevClick);
ButNext := TButtZone.Create(@ButNext,235,96,35,27,RgnNext,
                            True,Bitmap,235,96,235,122,ButNextClick);
ButOpen := TButtZone.Create(@ButOpen,275,96,35,27,RgnOpen,
                            True,Bitmap,275,96,275,122,ButOpenClick);
ButStop := TButtZone.Create(@ButStop,197,96,35,27,RgnStop,
                            True,Bitmap,197,96,197,122,ButStopClick);
ButPause := TButtZone.Create(@ButPause,158,96,35,27,RgnPause,
                             True,Bitmap,158,96,158,122,ButPauseClick);
ButLoop := TButtZone.Create(@ButLoop,62-10,110-10,21,21,RgnLoop,
                             True,Bitmap,62-10,110-10,358-21,110-7,ButLoopClick);
ButMixer := TButtZone.Create(@ButMixer,318,21,26,26,RgnMixer,
                             True,Bitmap,318,21,26*2,124,ButMixerClick);
ButList := TButtZone.Create(@ButList,310,77,26,26,RgnPList,
                            True,Bitmap,310,77,26,124,ButListClick);
ButTools := TButtZone.Create(@ButTools,322,50,26,26,RgnTools,
                             True,Bitmap,322,50,0,124,ButToolsClick);
ButMinimize := TButtZone.Create(@ButMinimize,282,6,16,16,RgnMin,
                                True,Bitmap,282,6,0,0,ButMinClick);
ButClose := TButtZone.Create(@ButClose,304,6,16,16,RgnClose,
                             True,Bitmap,304,6,358-16,0,ButCloseClick);
ButAbout := TButtZone.Create(@ButAbout,258,84,307-258,92-84,0,
                             True,Bitmap,258,84,0,123-(92-84),ButAboutClick);
MainWHeader.X := 84;
MainWHeader.Y := 5;
MainWHeader.W := 279-84;
MainWHeader.H := 22-5;
RgnVol := CreatePolygonRgn(RegionVolPoints,3,ALTERNATE);
MoveVol := TMoveZone.Create(@MoveVol,237,21,70,12,4,8,RgnVol,DoMovingVol);
MoveVol.PosX := 70 - 18;
RgnProgr := CreatePolygonRgn(RegionProgrPoints,12,ALTERNATE);
MoveProgr := TMoveZone.Create(@MoveProgr,96,83,255-96,10,2,5,RgnProgr,DoMovingProgr);
MoveVol.AddBitmaps(Bitmap,358-41,113,18,11,True);
MoveProgr.AddBitmaps(Bitmap,0,103,20,10,True);
{Led_AY := TLedZone.Create(@Led_AY,99,26,144-99,33-26,
                          Bitmap.Canvas.Handle,99,26,358-(144-99)-1,150-(33-26)-1);
Led_YM := TLedZone.Create(@Led_YM,144,26,190-144,33-26,
                          Bitmap.Canvas.Handle,144,26,358-(190-144)-1,150-(33-26)*2-2);
Led_Stereo := TLedZone.Create(@Led_Stereo,190,26,234-190,33-26,
                              Bitmap.Canvas.Handle,190,26,358-(234-190)-1,150-(33-26)*3-3);
}
TimeBmp := NewBitmap(time_width,time_height);
TimeBmp.Canvas.Font.FontHeight := -20;
TimeBmp.Canvas.Font.Color := RGB(70,70,70);
TimeBmp.Canvas.Font.FontStyle := [fsBold];
TimeBmp.Canvas.Brush.BrushStyle := bsClear;
TimeBmpSrc := NewBitmap(time_width,time_height);

VScrBmp := NewBitmap(scr_width,scr_height * 3);
VScrBmp.Canvas.Font.FontHeight := -20;
VScrBmp.Canvas.Font.Color := RGB(96,96,96);
VScrBmp.Canvas.Brush.BrushStyle := bsSolid;
VScrBmp.Canvas.Brush.Color := RGB(255,255,255);
//FillRect(DC_VScroll,Rect(0,0,scr_width,scr_lineheight*3),Brush_VScroll);
VScrBmp.Canvas.FillRect(MakeRect(0,0,scr_width,scr_lineheight*3));
ScrBmp := NewBitmap(scr_width,scr_height);
ScrBmp.Canvas.ModeCopy := cmSrcAnd;
ScrBmpSrc := NewBitmap(scr_width,scr_height);

AmpBmp := NewBitmap(amp_width,amp_height);
AmpBmp.Canvas.Pen.PenWidth := 3;
AmpBmp.Canvas.Pen.Color := RGB(70,70,70);
AmpBmpSrc := NewBitmap(amp_width,amp_height);

SpaBmp := NewBitmap(spa_width,spa_height);
SpaBmp.Canvas.Pen.PenWidth := 3;
SpaBmp.Canvas.Pen.Color := RGB(70,70,70);
SpaBmpSrc := NewBitmap(spa_width,spa_height);

Bitmap.Free;
CopyBmpSources;
SetVolumeWidth(MoveVol.zw - MoveVol.Bm1w);
SetProgrWidth(MoveProgr.zw - MoveProgr.Bm1w);
end;

const
//Skin 2.0 identificator
 SkinId:string = 'Ay_Emul 2.0 Skin File'#13#10#26;
 SkinIdLen = 24;
var
 Buffer:array of byte;
 Author,Comment:string;
 s:string;
 i:integer;
 tl,mx,pl,ls,pa,l1,l2,l3,lp:boolean;
 URHandle:integer;
// DC_Window:HDC;
begin
{if FName = '' then
 begin
  i := FindResource(HInstance,pointer($101),pointer($100));
  UniReadInit(URHandle,URMemory,'',pointer(LoadResource(HInstance,i)));
  Compressed_Size:=80001; Original_Size:=161454;
  UniAddDepacker(URHandle,UDLZH);
  try
   SetLength(Buffer,Original_Size);
   UniRead(URHandle,@Buffer[0],Original_Size)
  finally
   UniReadClose(URHandle)
  end;
  SkinAuthor := '';
  SkinComment := '';
  SkinFileName := '';
  Is_Skined := False;
  i := 0
 end
else}
 begin
  UniReadInit(URHandle,URFile,FName,nil);
  SetLength(s,SkinIdLen);
  UniRead(URHandle,@s[1],SkinIdLen);
  if s <> SkinId then
   begin
    UniReadClose(URHandle);
{    if Russian_Interface then
     ShowMessage('Файл ' + FName +
       ' не является файлом шаблона для эмулятора версии 2.0')
    else}
     ShowMessage('File ' + FName +
       ' is not AY-3-8910/12 Emulator v2.0 Skin File');
    exit
   end;
  UniRead(URHandle,@Original_Size,4);
  Compressed_Size := UniReadersData[URHandle].UniFileSize -
                        UniReadersData[URHandle].UniFilePos;
  UniAddDepacker(URHandle,UDLZH);
  try
   SetLength(Buffer,Original_Size);
   UniRead(URHandle,@Buffer[0],Original_Size)
  finally
   UniReadClose(URHandle)
  end;
  Author := '';
  i := 0;
  while (i < Original_Size) and (Buffer[i] <> 0) do
   begin
    Author := Author + char(Buffer[i]);
    Inc(i)
   end;
//  SkinAuthor := Author;
  Comment := '';
  Inc(i);
  while (i < Original_Size) and (Buffer[i] <> 0) do
   begin
    Comment := Comment + char(Buffer[i]);
    Inc(i)
   end;
//  SkinComment := Comment;
//  SkinFileName := FName;
//  Is_Skined := True;
  Inc(i)
 end;
{if not First then
 begin
  tl := ButTools.Is_On;
  mx := ButMixer.Is_On;
  ls := ButList.Is_On;
  pa := ButPause.Is_Pushed;
  pl := ButPlay.Is_Pushed;
  lp := ButLoop.Is_Pushed;
  l1 := Led_AY.State;
  l2 := Led_YM.State;
  l3 := Led_Stereo.State;
  BmpFree;
  DeleteObject(SelectObject(MoveVol.DC1,MoveVol.Bmp1));
  DeleteObject(SelectObject(MoveVol.DC1,MoveVol.Bmp2));
  MoveVol.Bmps := False;
  DeleteObject(SelectObject(MoveProgr.DC1,MoveProgr.Bmp1));
  DeleteObject(SelectObject(MoveProgr.DC1,MoveProgr.Bmp2));
  MoveProgr.Bmps := False;
  SetMainBmp(@Buffer[i],Original_Size - i);
  CopyBmpSources;
  ButTools.Is_On := tl;
  ButTools.Is_Pushed := tl;
  ButMixer.Is_On := mx;
  ButMixer.Is_Pushed := mx;
  ButList.Is_On := ls;
  ButList.Is_Pushed := ls;
  ButPause.Is_Pushed := pa;
  ButPlay.Is_Pushed := pl;
  ButLoop.Is_Pushed := lp;
  ButLoop.Is_On := lp;
  Led_AY.State := l1;
  Led_YM.State := l2;
  Led_Stereo.State := l3;
  if ButTools.Is_On then
   begin
    Form6.Edit1.Text := SkinAuthor;
    Form6.Edit2.Text := SkinComment;
    Form6.Edit3.Text := SkinFileName
   end
 end
else}
 SetMainBmp(@Buffer[i],Original_Size - i);
//DC_Window := GetDC(MainWnd.Handle);
SensSpa  := TSensZone.Create(@SensSpa,spa_x,spa_y,spa_width,spa_height,SensSpaClick);
SensAmp := TSensZone.Create(@SensAmp,amp_x,amp_y,amp_width,amp_height,SensAmpClick);
SensTime := TSensZone.Create(@SensTime,time_x,time_y,time_width,time_height,SensTimeClick);
MoveScr := TMoveZone.Create(@MoveScr,scr_x,scr_y,scr_width,scr_height,0,scr_height,0,DoMovingScroll);
//ReleaseDC(MainWnd.Handle,DC_Window);



{if FileAvailable then
 begin
  RedrawTime;
  RedrawScroll
 end;}
//MainWnd.Up Refresh
end;

procedure FreeControls;
var
 p:pointer;
 ExCode:DWORD;
 msg:TMsg;
begin
SetEvent(VisEventH);
repeat
 if not GetExitCodeThread(VisThreadH,ExCode) then break;
 if ExCode = STILL_ACTIVE then
  while PeekMessage(msg,WHandle,
                WM_VISUALISATION,WM_VISUALISATION,PM_REMOVE) do
until ExCode <> STILL_ACTIVE;
CloseHandle(VisThreadH);
CloseHandle(VisEventH);
SpaBmp.Free;
SpaBmpSrc.Free;
AmpBmp.Free;
AmpBmpSrc.Free;
TimeBmp.Free;
TimeBmpSrc.Free;
while ButtZoneRoot <> nil do
 begin
  p := ButtZoneRoot.Next;
  ButtZoneRoot.Free;
  ButtZoneRoot := p
 end;
while MoveZoneRoot <> nil do
 begin
  p := MoveZoneRoot.Next;
  MoveZoneRoot.Free;
  MoveZoneRoot := p
 end;
{if LedZoneRoot <> nil then
 begin
  ppp := LedZoneRoot;
  LedZoneRoot := nil;
  repeat
   ppp1 := ppp.Next;
   ppp.Free;
   ppp := ppp1
  until ppp = nil
 end}
while SensZoneRoot <> nil do
 begin
  p := SensZoneRoot.Next;
  SensZoneRoot.Free;
  SensZoneRoot := p
 end;
DBuffer.Free;
DBuffer := nil
end;

procedure Add_Item_Dialog(Add:boolean);
var
 dr,s:string;
 OD:POpenSaveDialog;
 Fs:TArrayOfString;
 dpos,i,c:integer;
begin
// Applet.Left := MainWnd.Left;
// Applet.Top := MainWnd.Top;
 if Add then
  s := 'Add file(s):'
 else
  s := 'Open file(s):';
 OD := NewOpenSaveDialog(s,LastOpenDir,[OSFileMustExist,OSAllowMultiSelect,OSHideReadOnly]);
 try
// MainWnd.Parent := Applet;
// PLWnd.Parent := Applet;
// OD.WndOwner := Applet.Handle;
 if not Add then
  begin
   OD.WndOwner := MainWnd.Handle;
   PLWnd.Enabled := False
  end
 else
  begin
   OD.WndOwner := PLWnd.Handle;
   MainWnd.Enabled := False
  end;
 try
 {if Russian_Interface then
 Form1.OpenDIalog1.Filter := T_SupTypes  + T_AllSup + T_ExtraTypes + '|' +
  T_VTX + '|' + T_YM  + '|' + T_AY +  '|' + T_PT1 + '|' + T_PT2 + '|' +
  T_PT3 + '|' + T_STC + '|' + T_STP + '|' + T_ASM + '|' + T_PSC + '|' +
  T_SQT + '|' + T_FTC + '|' + T_FXM + '|' + T_FLS + '|' + T_GTR + '|' +
  T_AYM + '|' + T_PSG + '|' + T_OUT + '|' + T_ZXAY+ '|' + T_MP3 + '|' +
  T_MP2 + '|' + T_MP1 + '|' + T_OGG + '|' + T_WAV + '|' + T_MO3 + '|' +
  T_IT  + '|' + T_XM  + '|' + T_S3M + '|' + T_MTM + '|' + T_MOD + '|' +
  T_UMX + '|' + T_CDA + '|' + T_AYEmulPL + '|' + T_WinampPL + '|' + T_ALL
else}
 OD.Filter := E_SupTypes  + T_AllSup  + T_ExtraTypes + '|' +
  E_VTX + '|' + E_YM  + '|' + E_AY +  '|' + E_PT1 + '|' + E_PT2 + '|' +
  E_PT3 + '|' + E_STC + '|' + E_STP + '|' + E_ASM + '|' + E_PSC + '|' +
  E_SQT + '|' + E_FTC + '|' + E_FXM + '|' + E_FLS + '|' + E_GTR + '|' +
  E_AYM + '|' + E_PSG + '|' + E_OUT + '|' + E_ZXAY+ '|' + E_MP3 + '|' +
  E_MP2 + '|' + E_MP1 + '|' + E_OGG + '|' + E_WAV + '|' + E_MO3 + '|' +
  E_IT  + '|' + E_XM  + '|' + E_S3M + '|' + E_MTM + '|' + E_MOD + '|' +
  E_UMX + '|' + E_CDA + '|' + E_AYEmulPL + '|' + E_WinampPL + '|' + E_ALL;
if OD.Execute then
 begin
//  LockScroll;
  try
   if not Add then
    begin
     StopPlaying;
     ClearPlayList
    end;
   dpos := Pos(#13,OD.FileName);
   if dpos = 0 then
    begin
     dr := ExtractFilePath(OD.FileName);
     SetLength(Fs,1);
     Fs[0] := OD.FileName;
    end
   else
    begin
     dr := Copy(OD.Filename,1,dpos - 1);
     if (Length(dr) <> 0) and (dr[Length(dr)] <> '\') then dr := dr + '\';
     c := 1;
     for i := dpos + 1 to Length(OD.FileName) do
      if OD.FileName[i] = #13 then inc(c);
     SetLength(Fs,c);
     for i := 0 to c - 1 do
      begin
       c := Pos(#13,PChar(@OD.FileName[dpos + 1]));
       if c = 0 then c := Length(OD.FileName) - dpos + 1;
       Fs[i] := dr + Copy(OD.FileName,dpos + 1,c - 1);
       inc(dpos,c);
      end;
    end;
   LastOpenDir := dr;
//  if AutoSaveDefDir then
    DefaultDirectory := dr;
   Add_Files(@Fs);
   CalculateTotalTime(False)
  finally
//   UnLockScroll;
   CreatePlayOrder;
   RedrawPlaylist(0,0,True)
  end;
  if Length(PlayListItems) = 0 then
   StopAndFreeAll
  else if not Add then
   PlayItem(0,0)
 end
 finally
  PLWnd.Enabled := True;
  MainWnd.Enabled := True
 end
 finally
  OD.Free
 end
end;

procedure Add_Directory_Dialog(Add:boolean);

procedure SearchFilesInFolder(Dir:string);
var
 SearchRec:WIN32_FIND_DATA;
 h:DWORD;
 i:integer;
begin
if (Dir <> '') and (Dir[Length(Dir)] <> '\') then Dir := Dir + '\';
h := FindFirstFile(PChar(Dir + '*.*'),SearchRec);
if h = INVALID_HANDLE_VALUE then exit;
try
repeat
   if (PChar(@SearchRec.cFileName) <> '.') and (SearchRec.cFileName <> '..') then
    if SearchRec.dwFileAttributes and FILE_ATTRIBUTE_DIRECTORY <> 0 then
     begin
//      if RecurseDirs then
       SearchFilesInFolder(Dir + SearchRec.cFileName)
     end
    else if PInt64(@SearchRec.nFileSizeLow)^ <> 0 then
     Add_File(Dir + SearchRec.cFileName,False{RecurseOnlyKnownTypes});
until not FindNextFile(h,SearchRec)
finally
 FindClose(h)
end
end;

var
 OD:POpenDirDialog;
 s:string;

begin
 if Add then
  s := 'Add files from folder:'
 else
  s := 'Open files from folder:';
 OD := NewOpenDirDialog(s,[]);

// with TChngDir.Create(Self) do
  try
//   SHBrowseForFolder
   if not Add then
    begin
     OD.WndOwner := MainWnd.Handle;
     PLWnd.Enabled := False
    end
   else
    begin
     OD.WndOwner := PLWnd.Handle;
     MainWnd.Enabled := False
    end;
    try
{    CheckBox1.Visible := True;
    CheckBox1.Checked := RecurseDirs;
    CheckBox2.Visible := True;
    CheckBox2.Checked := RecurseOnlyKnownTypes;
    if Russian_Interface then
     begin
      CheckBox1.Caption := 'Просмотреть вложенные папки';
      CheckBox2.Caption := 'Поиск модулей в файлах';
      Caption := 'Открыть файлы из папки';
      Button2.Caption := 'Отмена'
     end
    else
     begin
      CheckBox1.Caption := 'Recurse all subfolders';
      CheckBox2.Caption := 'Search for tunes in files';
      Caption := 'Open files from folder';
      Button2.Caption := 'Cancel'
     end;}
//    if DirectoryExists(DefaultDirectory) then
     if DirectoryExists(LastOpenDir) then
      OD.InitialPath := LastOpenDir;
//    DirName.Text := DirectoryListBox1.Directory;
//    ShowModal;
//    if ModalResult = mrOk then
    if OD.Execute then
     begin
      ScreenCursor := LoadCursor(0,IDC_WAIT);
      SetCursor(ScreenCursor);
      try
//      Form1.OpenDialog1.InitialDir := DirName.Text;
       LastOpenDir := OD.Path;
//      if AutoSaveDefDir then
       DefaultDirectory := OD.Path;
//      RecurseDirs := CheckBox1.Checked;
//      RecurseOnlyKnownTypes := CheckBox2.Checked;
//      LockScroll;
      try
       if not Add then
        begin
         StopPlaying;
         ClearPlayList
        end;
       SearchFilesInFolder(LastOpenDir);
       CalculateTotalTime(False)
      finally
//       UnLockScroll;
       CreatePlayOrder;
       RedrawPlaylist(0,0,True);
      end
      finally
       ScreenCursor := 0;
       SetCursor(LoadCursor(0,IDC_ARROW))//crDefault
      end;
      if Length(PlayListItems) = 0 then
       StopAndFreeAll
      else if not Add then
       PlayItem(0,0)
     end
    finally
     PLWnd.Enabled := True;
     MainWnd.Enabled := True
    end
  finally
   OD.Free
  end
end;

function VisThreadFunc(a:pointer):dword;stdcall;
var
 t:DWORD;
begin
t := 0;
while WaitForSingleObject(VisEventH,t) <> WAIT_OBJECT_0 do
 begin
  t := 100;
  if not IsIconic(AHandle) then
   begin
    t := GetTickCount;
    SendMessage(WHandle,WM_VISUALISATION,0,0);
    Inc(integer(t),35 - integer(GetTickCount));
    if integer(t) < 0 then
     t := 0
   end
 end;
Result := STILL_ACTIVE - 1
end;

procedure CreateMainWindow;
var
 i:integer;
begin
MainWnd := NewForm(Applet,'AY-3-8910 & AY-3-8912 Emulator v3.0');
MainWnd.Style := WS_POPUP;
MainWnd.OnPaint := TOnPaint(MakeMethod(nil,@MainWPaint));
MainWnd.OnMouseDown := TOnMouse(MakeMethod(nil,@MainWMouseDown));
MainWnd.OnMouseDblClk := TOnMouse(MakeMethod(nil,@MainWMouseDblClk));
MainWnd.OnMouseUp := TOnMouse(MakeMethod(nil,@MainWMouseUp));
MainWnd.OnMouseMove := TOnMouse(MakeMethod(nil,@MainWMouseMove));
MainWnd.OnMouseWheel := TOnMouse(MakeMethod(nil,@MainWMouseWheel));
MainWnd.OnMessage := TOnMessage(MakeMethod(nil,@MainWMessage));
MainWnd.OnKeyDown := TOnKey(MakeMethod(nil,@MainWKeyDown));
MainWnd.OnKeyUp := TOnKey(MakeMethod(nil,@MainWKeyUp));
MainWnd.MinimizeNormalAnimated;
MainWnd.CreateWindow;
WHandle := MainWnd.Handle;
AHandle := Applet.Handle;
SetCurrentDirectory(PChar(ExtractFilePath(ParamStr(0))));
LoadSkin2xx('Ay_Emul2.ays',True);
MainWnd.CenterOnParent;
for i := 0 to spa_num - 1 do Spa_piks[i] := 0;
PSpa_prev := @Spa_prev;
PSpa_piks := @Spa_piks;
VisEventH := CreateEvent(nil,False,False,nil);
VisThreadH := CreateThread(nil,0,@VisThreadFunc,nil,0,VisThreadID);
end;

procedure RestoreControls;
begin
{ Form1.FIDO_SaveStatus(FIDO_Nothing);}
 ButPlay.Switch_Off;
{ Form2.GroupBox3.Enabled := True;
 Form2.GroupBox4.Enabled := True;
 Form2.Buff.Enabled := True;
 Form2.GroupBox10.Enabled := True;
 Form2.RadioButton13.Enabled := True;
 Form2.RadioButton14.Enabled := True;}
 ButStop.UnPush;
 ButPause.Switch_Off;
{ Form2.Edit12.Text := ''; Form2.Edit13.Text := ''; Form2.Edit14.Text := '';
 Form2.Edit15.Text := ''; Form2.Edit16.Text := ''; Form2.Edit17.Text := '';
 Form2.Edit18.Text := ''; Form2.Edit23.Text := ''; Form2.Edit26.Text := '';
 Form2.CheckBox4.Checked := False;
 Form2.CheckBox5.Checked := False;
 Form2.CheckBox6.Checked := False;
 Form2.CheckBox7.Checked := False}
end;

procedure RedrawVolume;
begin
if VolumeCtrl = MoveVol.PosX then exit;
MoveVol.HideBmp;
OffsetRgn(MoveVol.RgnHandle,VolumeCtrl - MoveVol.PosX,0);
MoveVol.PosX := VolumeCtrl;
MoveVol.Redraw(False)
end;

procedure ReprepareScroll;
begin
//LockScroll;
try
if Item_Displayed > 0 then
 begin
  ss1 := GetPlayListString(PlaylistItems[Item_Displayed - 1]);
  GetStringWnJ(ss1,sw1,sj1)
 end;
if Item_Displayed < Length(PlaylistItems) - 1 then
 begin
  ss2 := GetPlayListString(PlaylistItems[Item_Displayed + 1]);
  GetStringWnJ(ss2,sw2,sj2)
 end;
if (Item_Displayed >= 0) and (Item_Displayed < Length(PlaylistItems)) then
 begin
  ss := GetPlayListString(PlaylistItems[Item_Displayed]);
  GetStringWnJ(ss,sw,sj);
  if scr_lineheight*(Scroll_Distination - Item_Displayed + 1)
                         - Scroll_Offset = 0 then
   begin
    if scr_width < sw then
     begin
      if HorScrl_Offset > sw - scr_width then
       HorScrl_Offset := sw - scr_width - 1
     end
    else
     begin
      HorScrl_Offset := 0;
//      FillRect(DC_VScroll,Rect(0,scr_lineheight,scr_width,scr_lineheight*2),Brush_VScroll)
      ScrBmp.Canvas.FillRect(MakeRect(0,scr_lineheight,scr_width,scr_lineheight*2));
     end;
    RedrawScroll
   end
 end
finally
// UnLockScroll
end
end;

end.
