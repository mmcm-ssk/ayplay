unit Errors;

interface

uses Windows,KOL;

type
  AYEmulError = class(TObject)
  private
    FMessage: string;
  public
    constructor Create(const Msg: string);
    property Message: string read FMessage write FMessage;
  end;

  EWin32Error = class(AYEmulError);

  PRaiseFrame = ^TRaiseFrame;
  TRaiseFrame = record
    NextRaise: PRaiseFrame;
    ExceptAddr: Pointer;
    ExceptObject: TObject;
    ExceptionRecord: PExceptionRecord;
  end;

function ExceptObject: TObject;
function ExceptAddr: Pointer;
procedure ShowException(ExceptObject: TObject; ExceptAddr: Pointer);
procedure RaiseLastWin32Error;

implementation

function ExceptObject: TObject;
begin
  if RaiseList <> nil then
    Result := PRaiseFrame(RaiseList)^.ExceptObject else
    Result := nil;
end;

function ExceptAddr: Pointer;
begin
  if RaiseList <> nil then
    Result := PRaiseFrame(RaiseList)^.ExceptAddr else
    Result := nil;
end;

constructor AYEmulError.Create(const Msg: string);
begin
  FMessage := Msg;
end;

procedure RaiseLastWin32Error;
var
  LastError: DWORD;
  S:string;
begin
  LastError := GetLastError;
  if LastError <> ERROR_SUCCESS then
    S := 'Win32 Error #' + Int2Str(LastError) + ': ''' +
          SysErrorMessage(LastError) + ''''
  else
    S := 'Unknown Win32 error';
  raise EWin32Error.Create(s);
end;

function ConvertAddr(Address: Pointer): Pointer; assembler;
asm
        TEST    EAX,EAX         { Always convert nil to nil }
        JE      @@1
        SUB     EAX, $1000      { offset from code start; code start set by linker to $1000 }
@@1:
end;

function ExceptionErrorMessage(ExceptObject: TObject; ExceptAddr: Pointer;
  Buffer: PChar; Size: Integer): Integer;
var
  MsgPtr: PChar;
  MsgEnd: PChar;
  MsgLen: Integer;
  ModuleName: array[0..MAX_PATH] of Char;
  Temp: array[0..MAX_PATH] of Char;
  Info: TMemoryBasicInformation;
  ConvertedAddress: Pointer;
  ErStr:string;
begin
  VirtualQuery(ExceptAddr, Info, sizeof(Info));
  if (Info.State <> MEM_COMMIT) or
    (GetModuleFilename(THandle(Info.AllocationBase), Temp, SizeOf(Temp)) = 0) then
  begin
    GetModuleFileName(HInstance, Temp, SizeOf(Temp));
    ConvertedAddress := ConvertAddr(ExceptAddr);
  end
  else
    Integer(ConvertedAddress) := Integer(ExceptAddr) - Integer(Info.AllocationBase);
  StrLCopy(ModuleName, StrRScan(Temp, '\') + 1, SizeOf(ModuleName) - 1);
  MsgPtr := '';
  MsgEnd := '';
  if ExceptObject is AYEmulError then
  begin
    MsgPtr := PChar(AYEmulError(ExceptObject).Message);
    MsgLen := StrLen(MsgPtr);
    if (MsgLen <> 0) and (MsgPtr[MsgLen - 1] <> '.') then MsgEnd := '.';
  end;
  ErStr := 'Error ''' + ExceptObject.ClassName + ''' in ' + ModuleName +
           ' at ' + Int2Hex(integer(ConvertedAddress),8) + ': "'
           + MsgPtr + MsgEnd + '"';
  StrLCopy(Buffer, PChar(ErStr), Size);
  Result := StrLen(Buffer);
end;

procedure ShowException(ExceptObject: TObject; ExceptAddr: Pointer);
var
  Buffer: array[0..1023] of Char;
begin
  ExceptionErrorMessage(ExceptObject, ExceptAddr, Buffer, SizeOf(Buffer));
  if IsConsole then
    WriteLn(Buffer)
  else
    MessageBox(0, Buffer, 'Ay_Emul Error Message', MB_OK or MB_ICONSTOP or MB_TASKMODAL);
end;

procedure ErrorHandler(ErrorCode: Integer; ErrorAddr: Pointer);
var
 E:AYEmulError;
begin
if ErrorCode = 0 then
 E := AYEmulError.Create('I/O Error #' + Int2Str(IOResult))
else
 E := AYEmulError.Create('Error #' + Int2Str(ErrorCode));
raise E at ErrorAddr;
end;

initialization

  ErrorProc := @ErrorHandler;
  ExceptionClass := AYEmulError;

finalization

  ErrorProc := nil;
  ExceptionClass := nil;

end.