{
lightBASS
---------
(c)2003 S.V.Bulba
http://bulba.at.kz/
vorobey@mail.khstu.ru

Description:
------------
Dinamycally loads/unloads BASS.DLL
Performs all required checks before calling BASS.DLL
Uses minimal set of constants, types and declarations from original BASS.PAS
Written for using with BASS.DLL version 2.0
}

{$i Settings.inc}

unit lightBASS;

interface

uses
 Windows,Messages,KOL,Errors;

type
 HSTREAM = DWORD;
 HMUSIC = DWORD;
 HSYNC = DWORD;
 QWORD = int64;
 FLOAT = Single;

 EBASSError = class(AYEmulError);

 SYNCPROC = procedure(handle: HSYNC; channel, data: DWORD; user: DWORD); stdcall;

{
Next procedures and functions checks some flags and handles
and if all OK calls BASS.DLL functions. During calling
some errors can be ocurred, all of them are correctly translated
into DELPHI's exceptions with error messages
}

procedure RaiseLastBASSError;

procedure LoadBASS;     //If BASS.DLL is not loaded then loads BASS.DLL,
                        //checks version and gets some procs addresses

procedure UnloadBASS;   //Unload BASS.DLL if it was loaded

procedure InitBASS(device: Integer; freq, flags: DWORD; win: HWND);
                        //calls BASS_Init if BASS was not initialized

procedure FreeBASS;     //calls BASS_Free if BASS was initialized

procedure PlayBASS(FileName:PChar;Stream:boolean);
                        //Tries start playing file: Stream = True - as stream,
                        //                          Stream = False - as module.
                        //If successed then set sync for end of music by
                        //WM_PLAYNEXTITEM message

procedure PlayFreeBASS;     //if PlayBASS was OK, stops playing and removes sync

procedure SwitchPause;  //during playing pauses/resumes playback

function GetLengthBASS(var TimeSec:DWORD):DWORD;
                        //returns max position for using with
                        //BASS_ChannelGetPosition. Length in bytes is
                        //stored in TimeSec var. For streams both values
                        //are identical.

procedure StartBASS;

procedure BASSVisualisation;

const
 BASS_NOSOUNDDEVICE = 0;
 BASS_FIRSTSOUNDDEVICE = 1;

//Some consts from BASS.PAS
 BASS_TAG_ID3   = 0;
 BASS_TAG_ID3V2 = 1;
 BASS_TAG_OGG   = 2;

 BASS_STREAM_DECODE      = $200000;

 BASS_MUSIC_STOPBACK     = $80000;
 BASS_MUSIC_CALCLEN      = $8000;
 BASS_MUSIC_NOSAMPLE     = $100000;

 BASS_DATA_FFT512   = $80000000;
 BASS_DATA_FFT1024  = $80000001;
 BASS_DATA_FFT2048  = $80000002;
 BASS_DATA_FFT4096  = $80000003;

var
//Some BASS.DLL function addresses (see description in original BASS.PAS)
 BASS_GetVersion:function: DWORD; stdcall;
 BASS_ErrorGetCode:function: DWORD; stdcall;
 BASS_Init:function (device: Integer; freq, flags: DWORD; win: HWND; clsid: PGUID): BOOL; stdcall;
 BASS_Free:function: BOOL; stdcall;
 BASS_StreamCreateFile:function (mem: BOOL; f: Pointer; offset, length, flags: DWORD): HSTREAM; stdcall;
 BASS_StreamFree:procedure (handle: HSTREAM); stdcall;
 BASS_StreamPlay:function (handle: HSTREAM; flush: BOOL; flags: DWORD): BOOL; stdcall;
 BASS_ChannelSetSync:function (handle: DWORD; stype: DWORD; param: QWORD; proc: SYNCPROC; user: DWORD): HSYNC; stdcall;
 BASS_ChannelRemoveSync:function (handle: DWORD; sync: HSYNC): BOOL; stdcall;
 BASS_ChannelPause:function (handle: DWORD): BOOL; stdcall;
 BASS_ChannelResume:function (handle: DWORD): BOOL; stdcall;
 BASS_StreamGetLength:function (handle: HSTREAM): QWORD; stdcall;
 BASS_ChannelGetPosition:function (handle: DWORD): QWORD; stdcall;
 BASS_ChannelSetPosition:function (handle: DWORD; pos: QWORD): BOOL; stdcall;
 BASS_ChannelGetLevel:function (handle: DWORD): DWORD; stdcall;
 BASS_ChannelGetData:function (handle: DWORD; buffer: Pointer; length: DWORD): DWORD; stdcall;
 BASS_ChannelGetAttributes:function (handle: DWORD; var freq, volume: DWORD; var pan: Integer): BOOL; stdcall;
 BASS_ChannelBytes2Seconds:function (handle: DWORD; pos: QWORD): FLOAT; stdcall;
 BASS_ChannelSeconds2Bytes:function (handle: DWORD; pos: FLOAT): QWORD; stdcall;
 BASS_StreamGetTags:function (handle: HSTREAM; tags : DWORD): PChar; stdcall;
 BASS_MusicLoad:function (mem: BOOL; f: Pointer; offset, length, flags, freq: DWORD): HMUSIC; stdcall;
 BASS_MusicFree:procedure (handle: HMUSIC); stdcall;
 BASS_MusicGetName:function (handle: HMUSIC): PChar; stdcall;
 BASS_MusicGetLength:function (handle: HMUSIC; playlen: BOOL): DWORD; stdcall;
 BASS_MusicPlay:function (handle: HMUSIC): BOOL; stdcall;

 hiBASS:THandle = 0;       //handle to BASS.DLL instance,
                           //0 => BASS.DLL is not loaded

 MusicHandle:integer = 0;  //handle to stream or module,
                           //0 => no music loaded

 MusicIsStream:boolean;    //True => Music is stream, otherwise module

 BASSPaused:boolean;       //pause flag, used by SwitchPause

 BASSInitialized:boolean = False; //True => BASS_Init was called successfully

 BASSDevice:integer;

 BASSFFTType:DWORD;
 BASSAmpMin:real;


implementation

uses Common, WaveOutAPI, Formats, MainWin;

const
//Some consts from BASS.PAS
 BASS_SYNC_MESSAGE                 = $20000000;
 BASS_SYNC_END                     = 2;
 BASS_MP3_SETPOS         = $20000;

var
 hsEND:HSYNC = 0; //sync handler, used for end of music message (WM_PLAYNEXTITEM)
                  //if <> 0 then sync is set

procedure RaiseLastBASSError;
const
 BASSErCodes:array[0..42] of string =
 ('All is OK',
  'Memory error',
  'Can''t open the file',
  'Can''t find a free sound driver',
  'The sample buffer was lost',
  'Invalid handle',
  'Unsupported sample format',
  'Invalid playback position',
  'BASS_Init has not been successfully called',
  'BASS_Start has not been successfully called',
  'Unknown error',
  'Unknown error',
  'Unknown error',
  'Unknown error',
  'Already initialized',
  'Unknown error',
  'Not paused',
  'Not an audio track',
  'Can''t get a free channel',
  'An illegal type was specified',
  'An illegal parameter was specified',
  'No 3D support',
  'No EAX support',
  'Illegal device number',
  'Not playing',
  'Illegal sample rate',
  'Unknown error',
  'The stream is not a file stream',
  'Unknown error',
  'No hardware voices available',
  'Unknown error',
  'The MOD music has no sequence data',
  'No internet connection could be opened',
  'Couldn''t create the file',
  'Effects are not enabled',
  'The channel is playing',
  'Unknown error',
  'Requested data is not available',
  'The channel is a "decoding channel"',
  'A sufficient DirectX version is not installed',
  'Connection timedout',
  'Unsupported file format',
  'Unavailable speaker');
var
 ErCode:DWORD;
begin
ErCode := BASS_ErrorGetCode;
if ErCode > 42 then ErCode := 26;
raise EBASSError.Create(BASSErCodes[ErCode])
end;

function TryGet(const p:pointer):pointer;
begin
Result := p;
if p = nil then RaiseLastWin32Error
end;

procedure CheckVersion;
begin
if BASS_GetVersion <> $00002 then
 raise EBASSError.Create('Sorry, BASS version 2.0 required')
end;

procedure LoadBASS;
begin
if hiBass <> 0 then exit;
hiBASS := LoadLibrary('BASS.DLL');
if hiBASS = 0 then
 raise EBASSError.Create(
   'BASS.DLL 2.0 by Ian Luck required for playing extra file types.'#13#10 +
        'Download it from http://bulba.at.kz/');
try
 BASS_GetVersion := TryGet(GetProcAddress(hiBASS,'BASS_GetVersion'));
 CheckVersion;
 BASS_ErrorGetCode := TryGet(GetProcAddress(hiBASS,'BASS_ErrorGetCode'));
 BASS_Init := TryGet(GetProcAddress(hiBASS,'BASS_Init'));
 BASS_Free := TryGet(GetProcAddress(hiBASS,'BASS_Free'));
 BASS_StreamCreateFile := TryGet(GetProcAddress(hiBASS,'BASS_StreamCreateFile'));
 BASS_StreamFree := TryGet(GetProcAddress(hiBASS,'BASS_StreamFree'));
 BASS_StreamPlay := TryGet(GetProcAddress(hiBASS,'BASS_StreamPlay'));
 BASS_ChannelSetSync := TryGet(GetProcAddress(hiBASS,'BASS_ChannelSetSync'));
 BASS_ChannelRemoveSync := TryGet(GetProcAddress(hiBASS,'BASS_ChannelRemoveSync'));
 BASS_ChannelPause := TryGet(GetProcAddress(hiBASS,'BASS_ChannelPause'));
 BASS_ChannelResume := TryGet(GetProcAddress(hiBASS,'BASS_ChannelResume'));
 BASS_StreamGetLength := TryGet(GetProcAddress(hiBASS,'BASS_StreamGetLength'));
 BASS_ChannelGetPosition := TryGet(GetProcAddress(hiBASS,'BASS_ChannelGetPosition'));
 BASS_ChannelSetPosition := TryGet(GetProcAddress(hiBASS,'BASS_ChannelSetPosition'));
 BASS_ChannelGetLevel := TryGet(GetProcAddress(hiBASS,'BASS_ChannelGetLevel'));
 BASS_ChannelGetData := TryGet(GetProcAddress(hiBASS,'BASS_ChannelGetData'));
 BASS_ChannelGetAttributes := TryGet(GetProcAddress(hiBASS,'BASS_ChannelGetAttributes'));
 BASS_ChannelBytes2Seconds := TryGet(GetProcAddress(hiBASS,'BASS_ChannelBytes2Seconds'));
 BASS_ChannelSeconds2Bytes := TryGet(GetProcAddress(hiBASS,'BASS_ChannelSeconds2Bytes'));
 BASS_StreamGetTags := TryGet(GetProcAddress(hiBASS,'BASS_StreamGetTags'));
 BASS_MusicLoad := TryGet(GetProcAddress(hiBASS,'BASS_MusicLoad'));
 BASS_MusicFree := TryGet(GetProcAddress(hiBASS,'BASS_MusicFree'));
 BASS_MusicGetName := TryGet(GetProcAddress(hiBASS,'BASS_MusicGetName'));
 BASS_MusicGetLength := TryGet(GetProcAddress(hiBASS,'BASS_MusicGetLength'));
 BASS_MusicPlay := TryGet(GetProcAddress(hiBASS,'BASS_MusicPlay'))
except
 FreeLibrary(hiBass);
 hiBass := 0;
 raise
end
end;

procedure UnloadBASS;
begin
if hiBass = 0 then exit;
FreeLibrary(hiBass);
hiBass := 0
end;

procedure InitBASS;
begin
if BASSInitialized and (BASSDevice = device) then exit;
FreeBASS;
BASSDevice := device;
BASSInitialized := BASS_Init(device,freq,flags,win,nil);
if not BASSInitialized then RaiseLastBASSError
end;

procedure FreeBASS;
begin
if BASSInitialized then
 begin
  BASSInitialized := False;
  BASS_Free
 end
end;

{$IFDEF WIN32CONSOLE}
procedure MySyncProc(handle: HSYNC; channel, data: DWORD; user: DWORD); stdcall;
begin
PostThreadMessage(AThreadID,WM_PLAYNEXTITEM,0,0)
end;
{$ENDIF WIN32CONSOLE}

procedure PlayBASS;
begin
if MusicHandle <> 0 then exit;
MusicIsStream := Stream;
if Stream then
 MusicHandle := BASS_StreamCreateFile(False,FileName,0,0,0{BASS_MP3_SETPOS}) //uncomment if you load MP3 only from HDD
else
 MusicHandle := BASS_MusicLoad(False,FileName,0,0,BASS_MUSIC_STOPBACK or BASS_MUSIC_CALCLEN,0);
if MusicHandle = 0 then RaiseLastBASSError;
BASSPaused := False;
hsEND := BASS_ChannelSetSync(MusicHandle,
                             {$IFDEF WIN32GUI}
                             BASS_SYNC_MESSAGE or
                             {$ENDIF WIN32GUI}
                             BASS_SYNC_END,0,
                             {$IFDEF WIN32CONSOLE}
                             @MySyncProc
                             {$ENDIF WIN32CONSOLE}
                             {$IFDEF WIN32GUI}
                             pointer(WM_PLAYNEXTITEM)
                             {$ENDIF WIN32GUI}
                             ,0);
if MusicIsStream then
 begin
  if not BASS_StreamPlay(MusicHandle,False,0) then RaiseLastBASSError
 end
else
 if not BASS_MusicPlay(MusicHandle) then RaiseLastBASSError
end;

procedure PlayFreeBASS;
begin
if MusicHandle = 0 then exit;
try
 if hsEND <> 0 then
  begin
   if not BASS_ChannelRemoveSync(MusicHandle,hsEND) then RaiseLastBASSError;
   hsEND := 0
  end;
finally
 if MusicIsStream then
  BASS_StreamFree(MusicHandle)
 else
  BASS_MusicFree(MusicHandle);
 MusicHandle := 0
end
end;

procedure SwitchPause;
begin
if MusicHandle = 0 then exit;
if not BASSPaused then
 begin
  BASSPaused := BASS_ChannelPause(MusicHandle);
  if not BASSPaused then RaiseLastBASSError
 end
else
 begin
  BASSPaused := not BASS_ChannelResume(MusicHandle);
  if BASSPaused then RaiseLastBASSError
 end
end;

function GetLengthBASS;
begin
Result := 0;
if MusicHandle = 0 then exit;
if MusicIsStream then
 begin
  Result := BASS_StreamGetLength(MusicHandle);
  TimeSec := Result
 end
else
 begin
  Result := BASS_MusicGetLength(MusicHandle,False);
  TimeSec := BASS_MusicGetLength(MusicHandle,True)
 end;
if (integer(Result) = - 1) or (integer(TimeSec) = - 1) then RaiseLastBASSError
end;

procedure BASSVisualisation;
var
 i,l,r,k:DWORD;
 fft:array[0..2047] of FLOAT;
 k1:real;
begin
if (MusicHandle = 0) or Paused then exit;
    if MusicIsStream then
     begin
      CurrTime_Rasch := round(BASS_ChannelBytes2Seconds(MusicHandle,BASS_ChannelGetPosition(MusicHandle)) * 1000);
      VProgrPos := CurrTime_Rasch
     end
    else
     begin
      CurrTime_Rasch := GetTickCount - TimePlayStart;
      VProgrPos := CurrTime_Rasch
     end;
    if IndicatorChecked then
     begin
      l := BASS_ChannelGetLevel(MusicHandle);
      if l <> $FFFFFFFF then
       begin
        r := l shr 16;
        if r <= BASSAmpMin * 128 then
         r := 0
        else
         r := round(15/ln(1/BASSAmpMin)*ln(r/BASSAmpMin/128));
        l := l and $FFFF;
        if l <= BASSAmpMin * 128 then
         l := 0
        else
         l := round(15/ln(1/BASSAmpMin)*ln(l/BASSAmpMin/128));
        RedrawVisChannels(l,0,r,15)
       end
     end;
    if SpectrumChecked then
     begin
      k1 := spa_num/ln(20000/20);
      BASS_ChannelGetData(MusicHandle,@fft,BASSFFTType);
//      BitBlt(DC_Vis,0,0,spa_width,spa_height,DC_Sources,spa_src,0,SRCCOPY);
      SpaBmp.CopyRect(MakeRect(0,0,spa_width,spa_height),SpaBmpSrc,MakeRect(0,0,spa_width,spa_height));
      case BASSFFTType of
      BASS_DATA_FFT512: k := 512;
      BASS_DATA_FFT1024: k := 1024;
      BASS_DATA_FFT2048: k := 2048
      else k := 4096
      end;
      for i := 1 to k div 2 - 1 do
       begin
        r := round(k1 * ln(i/k/20*SampleRate));
        if r < spa_num then
         begin
          if fft[i] <= BASSAmpMin then
           l := spa_height
          else
           l := round(spa_height - spa_height/ln(1/BASSAmpMin)*ln(fft[i]/BASSAmpMin));
          if l < spa_height then
           begin
//            MoveToex(DC_Vis,r,spa_height,nil);
            SpaBmp.Canvas.MoveTo(r,spa_height);
//            LineTo(DC_Vis,r,l + 1)
            SpaBmp.Canvas.LineTo(r,l + 1)
           end
         end
       end;
//      BitBlt(DC_Window,spa_x,spa_y,spa_width,spa_height,DC_Vis,0,0,SRCCOPY)
       MainWnd.Canvas.CopyRect(MakeRect(spa_x,spa_y,spa_x + spa_width,spa_y + spa_height),SpaBmp.Canvas,MakeRect(0,0,spa_width,spa_height))
     end;
    ShowProgress(VProgrPos)
end;

procedure StartBASS;
begin
 if IsPlaying then exit;
 PlayFreeBASS;
 LoadBASS;
 InitBASS(BASS_FIRSTSOUNDDEVICE,SampleRate,0,WHandle);
 PlayBASS(PChar(CurItem.FileName),CurFileType in [StreamFileMin..StreamFileMax]);
 TimePlayStart := GetTickCount;
 IsPlaying := True;
 Reseted := 0;
 Paused := False;
end;

end.
