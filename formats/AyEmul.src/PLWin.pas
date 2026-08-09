{
This is part of AY Emulator project
AY-3-8910/12 Emulator
Version 3.0 for Windows 95
Author Sergey Vladimirovich Bulba
(c)1999-2004 S.V.Bulba
}

unit PLWin;

interface

uses Windows,Messages,KOL;

procedure CreatePlaylistWindow;
function TimeSToStr(ms:integer):string;
procedure RedrawItem(DC:HDC;n:integer);
procedure RedrawPlaylist(From:integer;DC:HDC;OnlyItems:boolean);
function PLAreaMessage(Slf:pointer;var Msg:TMsg; var Rslt:Integer):Boolean;
procedure PLAreaResize(Slf:pointer;Sender:PObj);
procedure PLAreaPaint(Slf:pointer;Sender:PControl;DC:HDC);
procedure PLAreaMouseDown(Slf:pointer;Sender:PControl; var Mouse:TMouseEventData);
procedure PLAreaMouseUp(Slf:pointer;Sender:PControl; var Mouse:TMouseEventData);
procedure PLAreaMouseMove(Slf:pointer;Sender:PControl; var Mouse:TMouseEventData);
procedure PLAreaMouseDblClk(Slf:pointer;Sender:PControl; var Mouse:TMouseEventData);
procedure PLLbTimeMouseDown(Slf:pointer;Sender:PControl; var Mouse:TMouseEventData);
procedure PLWDestroy;
procedure PLButAddClick(Slf:pointer;Sender:PObj);
procedure PLButClrClick(Slf:pointer;Sender:PObj);
procedure PLButSaveClick(Slf:pointer;Sender:PObj);
procedure PLButSortClick(Slf:pointer;Sender:PObj);
procedure PLButDirectionClick(Slf:pointer;Sender:PObj);
procedure PLButLoopListClick(Slf:pointer;Sender:PObj);
procedure MakeVisible(Index:integer;All:boolean);

var
 PLWnd,PLLbTime,PLButDirection,PLButLoopList:PControl;
 ShownFrom,ListLineHeight:integer;
 DisablePLRedraw:boolean = False;
 LastSelected:integer;

implementation

uses MainWin, Formats, Common, Z80, UniReader;

type
 TMyCompare = function(Index1,Index2:integer):integer;

var
 PLPanel,PLButAdd,PLButClr,PLButSave,PLButSort,PLScrBar,PLArea:PControl;
 IsClicked:boolean;
 MTimerHandle:integer = 0;
 MTimerY:integer;
 SortMenuHnd:HMENU = 0;

procedure StopTimer;forward;
 
procedure DestroySortMenu;
begin
if SortMenuHnd <> 0 then
 begin
  DestroyMenu(SortMenuHnd);
  SortMenuHnd := 0
 end
end;

function TimeSToStr;
begin
SetLength(Result,4);
Result[4] := char(ms mod 10 + 48);
ms := ms div 10;
Result[3] := char(ms mod 6 + 48);
ms := ms div 6;
Result[2] := ':';
Result[1] := char(ms mod 10 + 48);
ms := ms div 10;
if ms = 0 then exit;
Result := char(ms mod 6 + 48) + Result;
ms := ms div 6;
if ms = 0 then exit;
Result := Int2Str(ms) + ':' + Result
end;

procedure CalculatePlaylistScrollBar;
var
 l,p:integer;
 si:tagSCROLLINFO;
begin
l := Length(PlayListItems);
si.cbSize := sizeof(si);
si.fMask := SIF_ALL;
si.nMin := 0;
if l = 0 then
 begin
  si.nMax := 0;
  si.nPage := 1;
  si.nPos := 0;
 end
else
 begin
  p := PLArea.ClientHeight div ListLineHeight;
  if l < p then l := p;
  //if (Max = l - 1) and (Position = ShownFrom) and (PageSize = p) then exit;
  si.nMax := l - 1;
  si.nPage := p;
  si.nPos := ShownFrom;
 end;
SetScrollInfo(PLScrBar.Handle,SB_CTL,si,True);
end;

function GetPlayListTimeStr(PLItem:PPLayListItem):string;
begin
if PLItem.Time > 0 then
 Result := TimeSToStr(GetPlayListTime(PLItem))
else
 Result := ''
end;

function RemoveStdExt(Ext:TAvailableTypes;const FileName:string):string;
var
 SExt:string;
 i:integer;
begin
SExt := Trim(FileName);
i := Length(SExt);
while (i > 1) and (SExt[i] <> '.') do Dec(i);
if i = 1 then
 begin
  Result := FileName;
  exit
 end;
SExt := AnsiUpperCase(Copy(SExt,i,Length(SExt) - i + 1));
if SExts[Ext] = SExt then
 Result := Copy(FileName,1,i - 1)
else
 Result := FileName;
end;

function GetPlayListString(PLItem:PPLayListItem):string;
begin
with PLItem^ do
 if Error = FileNoError then
  begin
   if (Author <> '') and (Title <> '') then
    Result := Author + ' - ' + Title
   else if Author <> '' then
    Result := Author
   else if Title <> '' then
    Result := Title
   else
    Result := RemoveStdExt(FileType,ExtractFileName(FileName))
  end
 else
   Result := ExtractFileName(FileName) + ' (' + Errors[Error] + ')'
end;

procedure RedrawItemRealy(DC:HDC;i,n:integer);
var
 s,t:string;
 sz:tagSIZE;
 Client:TRect;
 BkColor,TxtColor:HBRUSH;
 tw,nch:integer;
begin
with PlayListItems[n]^ do
 begin
  if Selected then
   begin
    BkColor := GetSysColor(COLOR_HIGHLIGHT);
    if Error = FileNoError then
     begin
      if PlayingItem = n then
       TxtColor := $FF80FF
      else
       TxtColor := GetSysColor(COLOR_HIGHLIGHTTEXT)
     end
    else
     TxtColor := $FFFF00
   end
  else
   begin
    if PlayingItem = n then
     begin
      BkColor := GetSysColor(COLOR_WINDOW) - $100D10;
      if integer(BkColor) < 0 then BkColor := 0
     end
    else
     BkColor := GetSysColor(COLOR_WINDOW);
    if Error = FileNoError then
     begin
      if PlayingItem = n then
       TxtColor := $0DA00D
      else
       TxtColor := GetSysColor(COLOR_WINDOWTEXT)
     end
    else
     TxtColor := $FF
   end;
  SetTextColor(DC,TxtColor);
  SetBkColor(DC,BkColor);
  s := GetPlayListString(PlayListItems[n]);
  if Error = FileNoError then
   begin
    t := GetPlayListTimeStr(PlayListItems[n]);
    if t = '' then
     begin
      PostMessage(PLWnd.Handle,WM_GETTIMELENGTH,0,n);
      t := STypes[FileType]
     end
    else
     t := STypes[FileType] + ' ' + t;
    GetTextExtentPoint32(DC,PChar(t),System.Length(t),Sz);
    tw := Sz.cx
   end
  else
   tw := 0;
  GetTextExtentExPoint(DC,PChar(s),System.Length(s),PLArea.ClientWidth - tw - 4,@nch,nil,Sz);
  if nch < System.Length(s) then
   begin
    s[nch] := '.';
    s[nch - 1] := '.';
    s[nch - 2] := '.'
   end;
  Client.Left := 0;
  Client.Top := i * ListLineHeight;
  Client.Right := PLArea.ClientWidth - tw;
  Client.Bottom := (i + 1)*ListLineHeight;
  ExtTextOut(DC,0,i*ListLineHeight,ETO_OPAQUE or ETO_CLIPPED,@Client,PChar(s),nch,nil);
  if Error = FileNoError then
   begin
    Client.Left := Client.Right;
    Client.Right := PLArea.ClientWidth;
    ExtTextOut(DC,Client.Left,i*ListLineHeight,ETO_OPAQUE or ETO_CLIPPED,@Client,PChar(t),System.Length(t),nil);
   end
 end
end;

procedure RedrawItem;
var
 DC1:HDC;
 p:THandle;
begin
if DisablePLRedraw then exit;
if (n < ShownFrom) or
   (n >= ShownFrom + PLArea.ClientHeight div ListLineHeight) then exit;
if not PLWnd.Visible then exit;
if DC = 0 then
 DC1 := GetDC(PLArea.Handle)
else
 DC1 := DC;
p := SelectObject(DC1,PLArea.Font.Handle);
RedrawItemRealy(DC1,n - ShownFrom,n);
SelectObject(DC1,p);
if DC = 0 then
 ReleaseDC(PLArea.Handle,DC1);
end;

procedure RedrawPlaylist;
var
 i,n,na,nmax:integer;
 DC1:HDC;
 Client:TRect;
 p:THandle;
begin
ShownFrom := From;
if DisablePLRedraw then exit;
if not PLWnd.Visible then exit;
if DC = 0 then
 DC1 := GetDC(PLArea.Handle)
else
 DC1 := DC;
na := Length(PlayListItems);
if na <> 0 then
 begin
  p := SelectObject(DC1,PLArea.Font.Handle);
  nmax := PLArea.ClientHeight div ListLineHeight;
  n := na - From;
  if n > nmax then
   n := nmax
  else if n < nmax then
   begin
    dec(From,nmax - n);
    n := nmax;
    if From < 0 then
     begin
      inc(n,From);
      From := 0
     end;
    ShownFrom := From
   end;
  for i := 0 to n - 1 do
   RedrawItemRealy(DC1,i,i + From);
  if not OnlyItems then
   begin
    Client.Left := 0;
    Client.Top := n * ListLineHeight;
    Client.Right := PLArea.ClientWidth;
    Client.Bottom := PLArea.ClientHeight;
    FillRect(DC1,Client,HBrush(COLOR_WINDOW + 1));
   end;
  SelectObject(DC1,p)
 end
else if not OnlyItems then
 begin
  Client.Left := 0;
  Client.Top := 0;
  Client.Right := PLArea.ClientWidth;
  Client.Bottom := PLArea.ClientHeight;
  FillRect(DC1,Client,HBrush(COLOR_WINDOW + 1));
 end;
if DC = 0 then
 ReleaseDC(PLArea.Handle,DC1);
CalculatePlaylistScrollBar
end;

procedure PLAreaResize;
begin
InvalidateRect(PLArea.Handle,nil,False)
end;

procedure PLAreaPaint;
begin
RedrawPlaylist(ShownFrom,DC,False)
end;

procedure SaveParamsPLW;
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
// if AutoSaveWindowsPos then
  begin
   SaveDW('ListX',PLWnd.Left);
   SaveDW('ListY',PLWnd.Top);
   SaveDW('ListW',PLWnd.Width);
   SaveDW('ListH',PLWnd.Height);
  end;
finally
 RegCloseKey(subKeyHnd1)
end
end;

procedure PLWDestroy;
begin
StopAndFreeAll;
StopTimer;
DestroySortMenu;
SaveParamsPLW
end;

procedure PLWShow(Slf:pointer;Sender:PObj);
begin
ButList.Switch_On
end;

procedure PLWHide(Slf:pointer;Sender:PObj);
begin
ButList.Switch_Off
end;

procedure PLWClose(Slf:pointer;Sender:PObj; var Accept:Boolean);
begin
Accept := False;
StopTimer;
DestroySortMenu;
if PLWnd.Visible then
 begin
  MainWnd.Focused := True;
  PLWnd.Hide
 end
end;

procedure MakeVisible;
var
 n:integer;
begin
if Index <= ShownFrom then
 RedrawPlayList(Index,0,True)
else
 begin
  n := PLArea.ClientHeight div ListLineHeight;
  if Index - ShownFrom >= n  then
   RedrawPlayList(Index - n + 1,0,True)
  else if not All then
   RedrawItem(0,Index)
  else
   RedrawPlayList(ShownFrom,0,True)
 end
end;

procedure PLLbTimeMouseDown;
begin
ScreenCursor := LoadCursor(0,IDC_APPSTARTING);
SetCursor(ScreenCursor);//crHourGlass;
try
 CalculateTotalTime(True)
finally
 ScreenCursor := 0;
 SetCursor(LoadCursor(0,IDC_ARROW))//crDefault
end
end;

procedure MovePLItem(i,n:integer);
var
 PLI:pointer;
 j:integer;
begin
if i = n then exit;
if i > n then
 for j := i - 1 downto n do
  begin
   PLI := PlaylistItems[j + 1];
   PlaylistItems[j + 1] := PlaylistItems[j];
   PlaylistItems[j] := PLI
  end
else
 for j := i + 1 to n do
  begin
   PLI := PlaylistItems[j - 1];
   PlaylistItems[j - 1] := PlaylistItems[j];
   PlaylistItems[j] := PLI
  end;
CreatePlayOrder
end;

procedure DoMove(Y:integer);
var
 Index:integer;
begin
  Index := (Y + ShownFrom * ListLineHeight) div ListLineHeight;
  if Index < 0 then
   Index := 0
  else if Index >= Length(PlaylistItems) then
   Index := Length(PlaylistItems) - 1;
  if  LastSelected <> Index then
   begin
    if Item_Displayed = LastSelected then
     Item_Displayed := Index
    else if (LastSelected < Item_Displayed) and
            (Index >= Item_Displayed) then
     Dec(Item_Displayed)
    else if (LastSelected > Item_Displayed) and
            (Index <= Item_Displayed) then
     Inc(Item_Displayed);
    if Scroll_Distination = LastSelected then
     Scroll_Distination := Index
    else if (LastSelected < Scroll_Distination) and
            (Index >= Scroll_Distination) then
     Dec(Scroll_Distination)
    else if (LastSelected > Scroll_Distination) and
            (Index <= Scroll_Distination) then
     Inc(Scroll_Distination);
    if PlayingItem = LastSelected then
     PlayingItem := Index
    else if (LastSelected < PlayingItem) and
            (Index >= PlayingItem) then
     Dec(PlayingItem)
    else if (LastSelected > PlayingItem) and
            (Index <= PlayingItem) then
     Inc(PlayingItem);
    MovePLItem(LastSelected,Index);
    MakeVisible(Index,True);
    ReprepareScroll;
    LastSelected := Index
   end
end;

procedure StartTimer(Y:integer);
begin
MTimerY := Y;
DoMove(MTimerY);
if Y < 0 then
 Y := -Y
else
 Y := Y - PLArea.Height + 1;
Y := 300 - Y*10;
if Y <= 0 then Y := 1;
if MTimerHandle <> 0 then KillTimer(PLArea.Handle,1);
MTimerHandle := SetTimer(PLArea.Handle,1,Y,nil)
end;

procedure StopTimer;
begin
if MTimerHandle <> 0 then
 begin
  KillTimer(PLArea.Handle,1);
  MTimerHandle := 0
 end
end;

function PLAreaMessage;
begin
Result := False;
case Msg.message of
WM_KILLFOCUS:
 begin
  Rslt := 0;
  Result := True;
  StopTimer
 end;
WM_TIMER:
 begin
  Rslt := 0;
  Result := True;
  if (MTimerHandle <> 0) and (Msg.wParam = 1) then
   DoMove(MTimerY)
 end;
end
end;

procedure RandomSortClick;
var
 i,i1,i2:integer;
 PLI:pointer;
begin
if Length(PlaylistItems) < 2 then exit;
try
for i := 0 to Length(PlaylistItems) - 1 do
 PlaylistItems[i].Tag := 0;
i := Length(PlaylistItems) div 2;
while i > 0 do
 begin
  repeat
   i1 := Random(Length(PlaylistItems));
  until PlaylistItems[i1].Tag = 0;
  PlaylistItems[i1].Tag := 1;
  repeat
   i2 := Random(Length(PlaylistItems));
  until PlaylistItems[i2].Tag = 0;
  PlaylistItems[i2].Tag := 1;
  if PlayingItem = i1 then
   PlayingItem := i2
  else if PlayingItem = i2 then
   PlayingItem := i1;
  if Item_Displayed = i1 then
   Item_Displayed := i2
  else if Item_Displayed = i2 then
   Item_Displayed := i1;
  if Scroll_Distination = i1 then
   Scroll_Distination := i2
  else if Scroll_Distination = i2 then
   Scroll_Distination := i1;
  PLI := PlaylistItems[i1];
  PlaylistItems[i1] := PlaylistItems[i2];
  PlaylistItems[i2] := PLI;
  Dec(i)
 end;
ReprepareScroll;
finally
 CreatePlayOrder;
 RedrawPlaylist(0,0,True)
end
end;

procedure MyQuickSort(Compare:TMyCompare);

 procedure QuickSort(L,R:Integer);
 var
   I, J, P: Integer;
   N:pointer;
 begin
   repeat
     I := L;
     J := R;
     P := (L + R) shr 1;
     repeat
       while Compare(I, P) < 0 do Inc(I);
       while Compare(J, P) > 0 do Dec(J);
       if I <= J then
       begin
         N := PlaylistItems[J];
         PlaylistItems[J] := PlaylistItems[I];
         PlaylistItems[I] := N;
         if P = I then
           P := J
         else if P = J then
           P := I;
         Inc(I);
         Dec(J);
       end;
     until I > J;
     if L < J then QuickSort(L, J);
     L := I;
   until I >= R;
 end;

var
 temp,i:integer;
 PI,ID,SD:pointer;
begin
temp := Length(PlaylistItems) - 1;
if temp > 0 then
 begin
  PI := PlaylistItems[PlayingItem];
  ID := PlaylistItems[Item_Displayed];
  SD := PlaylistItems[Scroll_Distination];
  try
   QuickSort(0,temp);
   for i := 0 to temp do
    if PlaylistItems[i] = PI then
     begin
      PlayingItem := i;
      break
     end;
   for i := 0 to temp do
    if PlaylistItems[i] = ID then
     begin
      Item_Displayed := i;
      break
     end;
   for i := 0 to temp do
    if PlaylistItems[i] = SD then
     begin
      Scroll_Distination := i;
      break
     end;
   ReprepareScroll
  finally
   CreatePlayOrder;
   RedrawPlaylist(0,0,True)
  end
 end
end;

function CompareFileNames(Index1, Index2: Integer): Integer;
begin
Result := AnsiCompareText(PlaylistItems[Index1].FileName,PlaylistItems[Index2].FileName)
end;

function CompareTitles(Index1, Index2: Integer): Integer;
begin
Result := AnsiCompareText(PlaylistItems[Index1].Title,PlaylistItems[Index2].Title);
if Result = 0 then Result := CompareFileNames(Index1,Index2)
end;

function CompareAuthors(Index1, Index2: Integer): Integer;
begin
Result := AnsiCompareText(PlaylistItems[Index1].Author,PlaylistItems[Index2].Author);
if Result = 0 then Result := CompareTitles(Index1,Index2)
end;

function PLWMessage(Slf:pointer;var Msg:TMsg; var Rslt:Integer):Boolean;
var
 si:tagSCROLLINFO;

  procedure GetSI;
  begin
   si.cbSize := sizeof(si);
   si.fMask := SIF_ALL;
   GetScrollInfo(PLScrBar.Handle,SB_CTL,si)
  end;

  procedure SetSI;
  var
   l,p:integer;
  begin
   l := Length(PlayListItems);
   p := PLArea.ClientHeight div ListLineHeight;
   if si.nPos > l - p then
    si.nPos := l - p;
   if si.nPos < 0 then
    si.nPos := 0;
   if si.nPos <> ShownFrom then
    RedrawPlaylist(si.nPos,0,True)
  end;

begin
Result := False;
case Msg.message of
WM_DESTROY:
 PLWDestroy;
WM_COMMAND:
 if (SortMenuHnd <> 0) and (HIWORD(Msg.wParam) = 0) and (Msg.lParam = 0) then
  begin
   Rslt := 0;
   Result := True;
   DestroyMenu(SortMenuHnd);
   SortMenuHnd := 0;
   case LOWORD(Msg.wParam) of
   0:RandomSortClick;
   1:MyQuickSort(CompareAuthors);
   2:MyQuickSort(CompareTitles);
   3:MyQuickSort(CompareFileNames);
   end
  end;
WM_ACTIVATE:
 begin
  Rslt := 0;
  Result := True;
  if LOWORD(Msg.wParam) <> WA_INACTIVE then
   IsClicked := False
  else
   StopTimer
  end;
WM_GETTIMELENGTH:
 if DWORD(Msg.lParam) < DWORD(Length(PlayListItems)) then
  TryGetTime(Msg.lParam);
WM_VSCROLL:
 begin
  case LOWORD(Msg.wParam) of
  SB_LINEDOWN:
   begin
    GetSI;
    inc(si.nPos);
    SetSI
   end;
  SB_LINEUP:
   begin
    GetSI;
    dec(si.nPos);
    SetSI
   end;
  SB_PAGEDOWN:
   begin
    GetSI;
    inc(si.nPos,si.nPage);
    SetSI
   end;
  SB_PAGEUP:
   begin
    GetSI;
    dec(si.nPos,si.nPage);
    SetSI
   end;
  SB_THUMBTRACK:
   begin
    GetSI;
    si.nPos := si.nTrackPos;
    SetSI
   end;
  end;
  Rslt := 0;
  Result := True
 end;
end
end;

procedure ClearSelection;
var
 i:integer;
begin
 LastSelected := -1;
 for i := 0 to Length(PlayListItems) - 1 do
  with PlayListItems[i]^ do
   if Selected then
    begin
     Selected := False;
     RedrawItem(0,i)
    end
end;

procedure DeletePlayListItem(n:integer);
var
 i,c:integer;
begin
if n < 0 then exit;
c := Length(PlayListItems) - 1;
if n > c then exit;
Dispose(PlayListItems[n]);
for i := n + 1 to c do
 PlayListItems[i - 1] := PlayListItems[i];
SetLength(PlayListItems,c)
end;

procedure PLAreaDblClick;
begin
if LastSelected < 0 then exit;
PlayItem(PlayListItems[LastSelected].Tag,0);
if Direction = 2 then CreatePlayOrder
end;

procedure PLWKeyDown(Slf:pointer;Sender:PControl;var Key:Longint;Shift:DWORD);

var
 LS,Index,n:integer;

 procedure CheckVis;
 begin
  LastSelected := Index;
  PlayListItems[Index].Selected := True;
  MakeVisible(Index,False)
 end;

 procedure Do_Home;
 var
  i:integer;
 begin
  if Length(PlayListItems) <> 0 then
   begin
    if (Shift and MK_SHIFT = 0) or (LastSelected = -1) then
     begin
      ClearSelection;
      PlayListItems[0].Selected := True
     end
    else
     for i := 0 to LastSelected do
      PlayListItems[i].Selected := True;
    LastSelected := 0;
    RedrawPlayList(0,0,True)
   end
 end;

 procedure Do_End;
 var
  i:integer;
 begin
  if Length(PlayListItems) <> 0 then
   begin
    if (Shift and MK_SHIFT = 0) or (LastSelected = -1) then
     begin
      ClearSelection;
      PlayListItems[Length(PlayListItems) - 1].Selected := True
     end
    else
     for i := LastSelected to Length(PlayListItems) - 1 do
      PlayListItems[i].Selected := True;
    LastSelected := Length(PlayListItems) - 1;
    RedrawPlayList(LastSelected,0,True)
   end
 end;

begin
case Key of
VK_DELETE:
 if Length(PlayListItems) <> 0 then
  begin
   LS := LastSelected;
   try
   for Index := Length(PlayListItems) - 1 downto 0 do
    if PlayListItems[Index].Selected then
     begin
      if (Scroll_Distination <> Item_Displayed) and
         (Index = Scroll_Distination) then
       ForceScrollForDelete;
      if Index < PlayingItem then
       Dec(PlayingItem)
      else if Index = PlayingItem then
       PlayingItem := -1;
      if Index < Scroll_Distination then
       Dec(Scroll_Distination)
      else if Index = Scroll_Distination then
       Scroll_Distination := -1;
      if Index < Item_Displayed then
       Dec(Item_Displayed)
      else if Index = Item_Displayed then
       Item_Displayed := -1;
      DeletePlayListItem(Index);
      ReprepareScroll
     end;
   if LS >= Length(PlayListItems) then LS := Length(PlayListItems) - 1;
   LastSelected := LS;
   if LS >= 0 then PlayListItems[LS].Selected := True;
   finally
    RedrawPlaylist(ShownFrom,0,False);
    CreatePlayOrder;
    CalculateTotalTime(False)
   end
  end;
VK_DOWN:
 if Length(PlayListItems) <> 0 then
  begin
   Index := LastSelected + 1;
   LastSelected := -1;
   if (Shift and MK_SHIFT = 0) then ClearSelection;
   if Index < Length(PlayListItems) then CheckVis
  end;
VK_UP:
 if Length(PlayListItems) <> 0 then
  begin
   Index := LastSelected - 1;
   LastSelected := -1;
   if (Shift and MK_SHIFT = 0) then ClearSelection;
   if Index = -2 then Index := Length(PlayListItems) - 1;
   if Index >= 0 then CheckVis
  end;
VK_HOME:
 Do_Home;
VK_END:
 Do_End;
VK_PRIOR:
 if (Shift and MK_CONTROL <> 0) then
  Do_Home
 else if Length(PlayListItems) <> 0 then
  begin
   if (LastSelected = ShownFrom) and (ShownFrom <> 0) then
    begin
     Dec(ShownFrom,PLArea.ClientHeight div ListLineHeight);
     if ShownFrom < 0 then ShownFrom := 0
    end;
   if Shift and MK_SHIFT = 0 then
    begin
     ClearSelection;
     PlayListItems[ShownFrom].Selected := True
    end
   else
    for Index := 0 to LastSelected do
     PlayListItems[Index].Selected := True;
   LastSelected := ShownFrom;
   RedrawPlaylist(ShownFrom,0,True)
  end;
VK_NEXT:
 if (Shift and MK_CONTROL <> 0) then
  Do_End
 else if Length(PlayListItems) <> 0 then
  begin
   n := PLArea.ClientHeight div ListLineHeight;
   if (LastSelected = ShownFrom + n - 1) and
      (ShownFrom <> Length(PlayListItems) - 1) then
    begin
     Inc(ShownFrom,n);
     if ShownFrom >= Length(PlayListItems) then
      ShownFrom := Length(PlayListItems) - 1
    end;
   LS := ShownFrom + n - 1;
   if LS >= Length(PlayListItems) then
    LS := Length(PlayListItems) - 1;
   if Shift and MK_SHIFT = 0 then
    begin
     ClearSelection;
     PlayListItems[LS].Selected := True
    end
   else
    for Index := LastSelected to LS do
     PlayListItems[Index].Selected := True;
   LastSelected := LS;
   RedrawPlaylist(ShownFrom,0,True)
  end;
VK_INSERT:
 PLButAddClick(Slf,Sender);
VK_RETURN:
 PLAreaDblClick;
Ord('A'):
 if (Length(PlayListItems) <> 0) and (Shift and MK_CONTROL <> 0) then
  begin
   for Index := 0 to Length(PlayListItems) - 1 do
    PlayListItems[Index].Selected := True;
   RedrawPlaylist(ShownFrom,0,True)
  end;
VK_ESCAPE:
 PLWnd.Visible := False
else
 MainWKeyDown(Slf,Sender,Key,Shift)
end
end;


procedure PLWMouseWheel(Slf:pointer;Sender:PControl; var Mouse:TMouseEventData);
var
 i,l,p:integer;
begin
Mouse.StopHandling := True;
i := ShownFrom - smallint(HIWORD(Mouse.Shift)) div WHEEL_DELTA;
l := Length(PlayListItems);
p := PLArea.ClientHeight div ListLineHeight;
if i > l - p then
 i := l - p;
if i < 0 then
 i := 0;
if i <> ShownFrom then RedrawPlaylist(i,0,True)
end;

procedure PLAreaMouseDown;
var
 i,n,sfr,sto:integer;
begin
Mouse.StopHandling := True;
PLArea.Focused := True;
i := PLArea.ClientHeight div ListLineHeight;
n := Mouse.Y div ListLineHeight;
if Mouse.Button = mbLeft then
 begin
  SetCapture(PLArea.Handle);
  IsClicked := True;
  if (Mouse.Y >= 0) and (n < i) then
   begin
    Inc(n,ShownFrom);
    if n < Length(PlayListItems) then
     begin
      if GetKeyState(VK_CONTROL) and 128 = 0 then
       for i := 0 to Length(PlayListItems) - 1 do
        with PlayListItems[i]^ do
         if Selected and (i <> n) then
          begin
           Selected := False;
           RedrawItem(0,i)
          end;
      if (GetKeyState(VK_SHIFT) and 128 = 0) or (LastSelected = -1) then
       begin
        LastSelected := n;
        if not PlayListItems[n].Selected then
         begin
          PlayListItems[n].Selected := True;
          RedrawItem(0,n)
         end
        else if GetKeyState(VK_CONTROL) and 128 <> 0 then
         begin
          PlayListItems[n].Selected := False;
          RedrawItem(0,n)
         end
       end
      else
       begin
        if LastSelected > n then
         begin
          sfr := n;
          sto := LastSelected
         end
        else
         begin
          sfr := LastSelected;
          sto := n
         end;
        for i := sfr to sto do
         with PlayListItems[i]^ do
          if not Selected then
           begin
            Selected := True;
            RedrawItem(0,i)
           end
       end
     end
    else
     ClearSelection
   end
  else
   ClearSelection
 end
else if Mouse.Button = mbRight then
 if (Mouse.Y >= 0) and (n < i) then
  begin
   Inc(n,ShownFrom);
   if n < Length(PlayListItems) then
    begin
     if not PlayListItems[n].Selected then
      begin
       ClearSelection;
       PlayListItems[n].Selected := True;
       RedrawItem(0,n)
      end;
     LastSelected := n
    end
  end
end;

procedure PLAreaMouseMove;
begin
Mouse.StopHandling := True;
if (GetKeyState(VK_SHIFT) and 128 <> 0) or
   (GetKeyState(VK_CONTROL) and 128 <> 0) then exit;
if IsClicked and (LastSelected <> -1) then
 begin
  if (Mouse.Y < 0) or
     (Mouse.Y >= PLArea.ClientHeight - PLArea.ClientHeight mod ListLineHeight) then
   StartTimer(Mouse.Y)
  else
   begin
    StopTimer;
    DoMove(Mouse.Y)
   end
 end
end;

procedure PLAreaMouseUp;
begin
Mouse.StopHandling := True;
IsClicked := False;
ReleaseCapture;
StopTimer
end;

procedure PLAreaMouseDblClk;
begin
if (Mouse.Button <> mbLeft) or
   (GetKeyState(VK_SHIFT) and 128 <> 0) or
   (GetKeyState(VK_CONTROL) and 128 <> 0) then
 begin
  PLAreaMouseDown(Slf,Sender,Mouse);
  exit
 end;
Mouse.StopHandling := True;
PLAreaDblClick;
end;

procedure PLButAddClick;
begin
if GetKeyState(VK_SHIFT) and 128 = 0 then
 Add_Item_Dialog(True)
else
 Add_Directory_Dialog(True)
end;

procedure PLButClrClick;
begin
ClearPlayList
end;

procedure PLButSaveClick;
var
 SD:POpenSaveDialog;
 i:integer;
 m3uf:TextFile;
 FName:string;
begin
SD := NewOpenSaveDialog('Save playlist:',LastOpenDir,[OSHideReadOnly]);
try
 SD.OpenDialog := False;
 SD.WndOwner := PLWnd.Handle;
 MainWnd.Enabled := False;
 try
{if Russian_Interface then
 Form1.SaveDialog1.Filter := T_AyEmulPL + '|' + T_WinampPL
else}
 SD.Filter := E_AyEmulPL + '|' + E_WinampPL;

  SD.FilterIndex := 1;
  if SD.Execute then
   begin
    FName := AnsiLowerCase(ExtractFileExt(SD.FileName));
    if SD.FilterIndex = 2 then
     begin
      if FName <> '.m3u' then
       FName := SD.FileName + '.m3u'
      else
       FName := SD.FileName;
      AssignFile(m3uf,FName);
      Rewrite(m3uf);
      for i := 0 to Length(PlaylistItems) - 1 do
       Writeln(m3uf,PlaylistItems[i].FileName);
      CloseFile(m3uf)
     end
    else
     begin
      if FName <> '.ayl' then
       FName := SD.FileName + '.ayl'
      else
       FName := SD.FileName;
      SaveAYL(FName)
     end
   end;

 finally
  MainWnd.Enabled := True;
 end
finally
 SD.Free
end;
end;

procedure PLButSortClick;
var
 Pt:TPoint;
begin
if SortMenuHnd = 0 then
 begin
  SortMenuHnd := CreatePopupMenu;
  if SortMenuHnd = 0 then exit;
  AppendMenu(SortMenuHnd,MF_STRING or MF_ENABLED,0,'Randomly');
  AppendMenu(SortMenuHnd,MF_STRING or MF_ENABLED,1,'By author');
  AppendMenu(SortMenuHnd,MF_STRING or MF_ENABLED,2,'By title');
  AppendMenu(SortMenuHnd,MF_STRING or MF_ENABLED,3,'By file name');
 end;
Pt.x := PLButSort.Width; Pt.y := 0;
Pt := PLButSort.Client2Screen(Pt);
TrackPopupMenu(SortMenuHnd,TPM_LEFTALIGN or TPM_LEFTBUTTON,Pt.x,Pt.y,0,PLWnd.Handle,nil);
end;

procedure PLButDirectionClick;
var
 Dir:integer;
begin
Dir := (Direction + 1) and 3;
SetDirection(Dir);
CreatePlayOrder
end;

procedure PLButLoopListClick;
begin
ListLooped := not ListLooped;
    if ListLooped then
     PLButLoopList.Caption := 'Lp'
    else
     PLButLoopList.Caption := '-'
end;


procedure CreatePlaylistWindow;
var
 DC:HDC;
 p:THandle;
 sz:tagSIZE;
 si:tagSCROLLINFO;
begin
PLWnd := NewForm(Applet,'Playlist');
PLWnd.Visible := False;
PLWnd.OnMessage := TOnMessage(MakeMethod(nil,@PLWMessage));
PLWnd.OnMouseWheel := TOnMouse(MakeMethod(nil,@PLWMouseWheel));
PLWnd.OnHide := TOnEvent(MakeMethod(nil,@PLWHide));
PLWnd.OnShow := TOnEvent(MakeMethod(nil,@PLWShow));
PLWnd.OnClose := TOnEventAccept(MakeMethod(nil,@PLWClose));
PLWnd.Width := 491;
PLWnd.Height := 344;
PLWnd.Top := 0;
PLWnd.Left := 0;
PLPanel := NewPanel(PLWnd,esNone);
PLPanel.Align := caBottom;
PLPanel.Height := 26;
PLButAdd := NewButton(PLPanel,'Add items');
with PLButAdd^ do
 begin
  LikeSpeedButton;
  Left := 5;
  Top := 3;
  Width := 89;
  Height := 23;
  OnClick := TOnEvent(MakeMethod(nil,@PLButAddClick));
 end;
PLButClr := NewButton(PLPanel,'Clear list');
with PLButClr^ do
 begin
  LikeSpeedButton;
  Left := 94;
  Top := 3;
  Width := 89;
  Height := 23;
  OnClick := TOnEvent(MakeMethod(nil,@PLButClrClick));
 end;
PLButSave := NewButton(PLPanel,'Save list');
with PLButSave^ do
 begin
  LikeSpeedButton;
  Left := 183;
  Top := 3;
  Width := 89;
  Height := 23;
  OnClick := TOnEvent(MakeMethod(nil,@PLButSaveClick));
 end;
PLButSort := NewButton(PLPanel,'Sort list');
with PLButSort^ do
 begin
  LikeSpeedButton;
  Left := 272;
  Top := 3;
  Width := 89;
  Height := 23;
  OnClick := TOnEvent(MakeMethod(nil,@PLButSortClick));
 end;
PLButDirection := NewButton(PLPanel,'-');
with PLButDirection^ do
 begin
  LikeSpeedButton;
  Left := 361;
  Top := 3;
  Width := 25;
  Height := 23;
  OnClick := TOnEvent(MakeMethod(nil,@PLButDirectionClick));
 end;
PLButLoopList := NewButton(PLPanel,'Lp');
with PLButLoopList^ do
 begin
  LikeSpeedButton;
  Left := 386;
  Top := 3;
  Width := 25;
  Height := 23;
  OnClick := TOnEvent(MakeMethod(nil,@PLButLoopListClick));
 end;
PLLbTime := NewLabel(PLPanel,'0:00');
with PLLbTime^ do
 begin
  TextAlign := taCenter;
  Left := 416;
  Top := 8;
  Width := 63;
  Height := 13;
  OnMouseDown := TOnMouse(MakeMethod(nil,@PLLbTimeMouseDown));
 end;
PLScrBar := _NewControl(PLWnd,'SCROLLBAR',WS_CHILD or WS_VISIBLE or SBS_VERT
              or SBS_RIGHTALIGN,False,nil);
PLScrBar.Align := caRight;
PLArea := NewPanel(PLWnd,esLowered);
PLArea.Style := PLArea.Style or WS_TABSTOP;
PLArea.Tabstop := True;
PLArea.Align := caClient;
PLArea.OnMessage := TOnMessage(MakeMethod(nil,@PLAreaMessage));
PLArea.OnResize := TOnEvent(MakeMethod(nil,@PLAreaResize));
PLArea.OnPaint := TOnPaint(MakeMethod(nil,@PLAreaPaint));
PLArea.OnMouseDown := TOnMouse(MakeMethod(nil,@PLAreaMouseDown));
PLArea.OnMouseUp := TOnMouse(MakeMethod(nil,@PLAreaMouseUp));
PLArea.OnMouseMove := TOnMouse(MakeMethod(nil,@PLAreaMouseMove));
PLArea.OnMouseDblClk := TOnMouse(MakeMethod(nil,@PLAreaMouseDblClk));

{????KOL is SHIT. Or am I shit? Win32 techical documentation is shit anyway}
PLWnd.OnKeyDown := TOnKey(MakeMethod(nil,@PLWKeyDown));
PLWnd.OnKeyUp := TOnKey(MakeMethod(nil,@MainWKeyUp));
PLArea.OnKeyDown := PLWnd.OnKeyDown;
PLArea.OnKeyUp := PLWnd.OnKeyUp;
PLButAdd.OnKeyDown := PLWnd.OnKeyDown;
PLButAdd.OnKeyUp := PLWnd.OnKeyUp;
PLButClr.OnKeyDown := PLWnd.OnKeyDown;
PLButClr.OnKeyUp := PLWnd.OnKeyUp;
PLButSave.OnKeyDown := PLWnd.OnKeyDown;
PLButSave.OnKeyUp := PLWnd.OnKeyUp;
PLButSort.OnKeyDown := PLWnd.OnKeyDown;
PLButSort.OnKeyUp := PLWnd.OnKeyUp;
PLButDirection.OnKeyDown := PLWnd.OnKeyDown;
PLButDirection.OnKeyUp := PLWnd.OnKeyUp;
PLButLoopList.OnKeyDown := PLWnd.OnKeyDown;
PLButLoopList.OnKeyUp := PLWnd.OnKeyUp;
{????}

PLWnd.CreateWindow;

ClearParams;
SetDirection(1);
ShownFrom := 0;
DC :=  GetDC(PLArea.Handle);
PLArea.Font.FontHeight := 16;
p := SelectObject(DC,PLArea.Font.Handle);
GetTextExtentPoint32(DC,'0',1,Sz);
SelectObject(DC,p);
ReleaseDC(PLArea.Handle,DC);
ListLineHeight := Sz.cy;

si.cbSize := sizeof(si);
si.fMask := SIF_ALL;
si.nMin := 0;
si.nMax := 0;
si.nPage := 1;
si.nPos := 0;
SetScrollInfo(PLScrBar.Handle,SB_CTL,si,True);
end;

end.
