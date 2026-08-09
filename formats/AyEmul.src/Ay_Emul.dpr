{
This is part of AY Emulator project
AY-3-8910/12 Emulator
Version 3.0 for Windows 95
Author Sergey Vladimirovich Bulba
(c)1999-2004 S.V.Bulba
}

{$i Settings.inc}

{$IFDEF WIN32CONSOLE}
{$APPTYPE CONSOLE}
{$ENDIF WIN32CONSOLE}

{$IFDEF WIN32GUI}
{$APPTYPE GUI}
{$ENDIF WIN32GUI}

program Ay_Emul;

uses
  Windows,
  Messages,
  TlHelp32,
  KOL,
  MainWin in 'MainWin.pas',
  PLWin in 'PLWin.pas',
  Formats in 'Formats.pas',
  AY in 'AY.pas',
  Common in 'Common.pas',
  UniReader in 'UniReader.pas',
  Lh5 in 'Lh5.pas',
  Languages in 'Languages.pas',
  CDviaMCI in 'CDviaMCI.pas',
  WaveOutAPI in 'WaveOutAPI.pas',
  lightBASS in 'lightBASS.pas',
  Z80 in 'Z80.pas',
  Errors in 'Errors.pas',
  Mixer in 'Mixer.pas';

{$IFDEF WIN32CONSOLE}
var
 InpHnd,Wr:dword;
 IR:INPUT_RECORD;
 Mess:TMsg;
{$ENDIF WIN32CONSOLE}

const
 WindowTitle = 'AY-3-8910 & AY-3-8912 Emulator v3.0';
 TitleLength = Length(WindowTitle);

var
 HPrevWindow:HWnd;

function CheckParams:boolean;
type
 arr = array[0..MAX_PATH] of byte;
var
 l:integer;
 T:DWORD;
 HBlock:longword;
 HAddr:^arr;
 s:string;
begin
Result := False;
T := GetTickCount;
repeat
HBlock := CreateFileMapping(longword(-1),nil,PAGE_READWRITE,0,
                                MAX_PATH + 1,'Ay_Emul Command Line Area');
if (HBlock <> 0) and (GetLastError = ERROR_ALREADY_EXISTS) then
 begin
  CloseHandle(HBlock);
  Sleep(1);
  HBlock := 0
 end
until (HBlock <> 0) or (GetTickCount - T >= 5000);
if HBlock <> 0 then
 begin
  HAddr := MapViewOfFile(HBlock,FILE_MAP_ALL_ACCESS,0,0,MAX_PATH + 1);
  if HAddr <> nil then
   begin
    Result := True;
    s := GetCommandLine;
    if ParamCount = 0 then s := s + ' /vshow';
    l := Length(s);
    if l > MAX_PATH then l := MAX_PATH;
    move(s[1],HAddr^,l);
    HAddr^[l] := 0;
    SendMessage(HPrevWindow,WM_LINEPARAM,0,0);
    UnmapViewOfFile(HAddr)
   end;
  CloseHandle(HBlock)
 end
end;

function ProcessExists:boolean;
var
 pe32:PROCESSENTRY32;
 T,hSnapshot,CPID:DWORD;
 FN:string;

 function EnumWindowsProc(hWnd,lParam:DWORD):BOOL;stdcall;
 var
  PID:DWORD;
  s:string;
 begin
  Result := True;
  GetWindowThreadProcessId(hWnd,@PID);
  if PID = lParam then
   if GetWindowTextLength(hWnd) = TitleLength then
    begin
     SetLength(s,TitleLength + 1);
     GetWindowText(hWnd,PChar(s),TitleLength + 1);
     s := PChar(s);
     if s = WindowTitle then
      begin
       HPrevWindow := hWnd;
       Result := False
      end
    end
 end;

begin
Result := False;
hSnapshot := CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS,0);
if hSnapshot = DWORD(-1) then RaiseLastWin32Error;
try
 FN := AnsiLowerCase(ExtractFileName(ParamStr(0)));
 CPID := GetCurrentProcessId;
 pe32.dwSize := sizeof(PROCESSENTRY32);
 if Process32First(hSnapshot,pe32) then
  repeat
   if pe32.th32ProcessID = CPID then exit;
   if AnsiLowerCase(ExtractFileName(pe32.szExeFile)) = FN then
    begin
     HPrevWindow := 0;
     T := GetTickCount;
     repeat
      EnumWindows(@EnumWindowsProc,pe32.th32ProcessID);
      if HPrevWindow = 0 then
       Sleep(1)
     until (HPrevWindow <> 0) or (GetTickCount - T >= 5000);
     if HPrevWindow <> 0 then Result := CheckParams;
     exit
    end;
  until not Process32Next(hSnapshot,pe32)
finally
 CloseHandle(hSnapshot)
end
end;

begin
try
//SetCurrentDirectory(PChar(ExtractFilePath(ParamStr(0))));
{$IFDEF WIN32CONSOLE}
if ParamCount = 0 then
 begin
  Writeln('Filename required');
  exit
 end;
InitAll;
PeekMessage(Mess,0,WM_USER,WM_USER,PM_NOREMOVE);
Add_Songs_From_File(ParamStr(1),True);
CreatePlayOrder;
PlayItem(0,0);
Writeln('F10 - exit');
inpHnd := GetStdHandle(STD_INPUT_HANDLE);
repeat
  if PeekMessage(Mess,0,WM_NULL,WM_APP,PM_REMOVE) then
   begin
    case Mess.message of
    WM_FINALIZEWO:
     begin
      WOThreadFinalization;
//      RestoreControls;
      PostThreadMessage(AThreadID,WM_PLAYNEXTITEM,0,0);
     end;
    WM_PLAYNEXTITEM:
     begin
      StopPlaying;
      PlayNextItem;
     end;
    end;
   end;
  GetNumberOfConsoleInputEvents(InpHnd,Wr);
  if WR > 0 then
   if not ReadConsoleInput(InpHnd,IR,1,Wr) then break;
  if (CurFileType = CDAFile) and IsPlaying and not Paused then
   if CDIsStopped(CurCDNum) then
    PostThreadMessage(AThreadID,WM_PLAYNEXTITEM,0,0);
  Sleep(20)
until (WR = 1) and (IR.Event.KeyEvent.wVirtualKeyCode = VK_F10);
StopAndFreeAll;
ClearPlayListItems;
FreeAll;
{$ENDIF WIN32CONSOLE}

{$IFDEF WIN32GUI}

if not ProcessExists then
 begin
  Applet := NewApplet('AY Emulator');
  Applet.Font.FontHeight := 13;
  CreateMainWindow;
  CreatePlaylistWindow;
  InitAll;
  ShowWindow(MainWnd.Handle,SW_SHOW);
  Run(Applet)
 end;
 
{$ENDIF WIN32GUI}

except
 ShowException(ExceptObject,ExceptAddr)
end;

end.
