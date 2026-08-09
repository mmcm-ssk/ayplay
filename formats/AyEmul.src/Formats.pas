{
This is part of AY Emulator project
AY-3-8910/12 Emulator
Version 3.0 for Windows 95
Author Sergey Vladimirovich Bulba
(c)1999-2004 S.V.Bulba
}

{$i Settings.inc}

unit Formats;

interface

uses Common, Errors, AY;

procedure CreatePlayOrder;
procedure ClearPlayListItems;
procedure SetDirection(Dir:integer);
procedure ClearParams;
procedure ClearPlayList;
procedure ForceScrollForDelete;
procedure Add_Files(SF:PArrayOfString);
procedure Add_File(FN:string;Detect:boolean);
procedure Add_Songs_From_File(File_Name:string;Detect:boolean);
procedure PlayCurrent;
procedure PlayItem(Index:integer;Play:integer);
procedure PlayNextItem;
procedure PlayPreviousItem;
procedure FreePlayingResourses;

procedure OUT_Get_Registers;
procedure VTX_YM2_YM3_YM3b_Get_Registers;
procedure YM5_Get_Registers;
procedure YM5i_Get_Registers;
procedure YM6_Get_Registers;
procedure YM6i_Get_Registers;
procedure YM6_Extra_GetRegisters;
procedure EPSG_Get_Registers;
procedure PSG_Get_Registers;
procedure ZXAY_Get_Registers;
procedure PT3_Get_Registers;
procedure PT2_Get_Registers;
procedure PT1_Get_Registers;
procedure STC_Get_Registers;
procedure STP_Get_Registers;
procedure ASC_Get_Registers;
procedure PSC_Get_Registers;
procedure SQT_Get_Registers;
procedure FTC_Get_Registers;
procedure FLS_Get_Registers;
procedure GTR_Get_Registers;
procedure FXM_Get_Registers;
procedure AY_Get_Registers;

procedure InitForAllTypes(InitAll:boolean);
procedure TryGetTime(n:integer);
function CalculateTotalTime(Force:boolean):boolean;
procedure SaveAYL(AYLName:string);
procedure SetProgrWidth(pw:longword);
procedure Rewind(newpos:integer;maxpos:longword);
procedure LoadAYL(AYLName:string);

type
 TErrorCodes = (FileNoError,ErFileNotFound,ErReadingFile,ErLZHDataIsNotValid,
               ErFLSAddrNotDetected,ErBASSError,ErBadFileStructure);

const
 Errors:array[Succ(Low(TErrorCodes))..High(TErrorCodes)] of string =
 ('File not found','Error reading file','LZH data is not valid',
  'Address of compilation is not detected: not FLS-file',
  'Error calling BASS.DLL','Bad file structure');

type
//Supported types
 TAvailableTypes =
 (Unknown, OUTFile, ZXAYFile, EPSGFile, AYFile, AYMFile, STCFile, ASCFile,
  ASC0File, STPFile, PSCFile, FLSFile, FTCFile, PT1File, PT2File, PT3File,
  SQTFile, GTRFile, FXMFile, VTXFile, YM2File, YM3File, YM3BFile, YM5File,
  YM6File, PSGFile, MP3File, MP2File, MP1File, OGGFile, WAVFile,
  MO3File, ITFile, XMFile, S3MFile, MTMFile, MODFile, UMXFile, CDAFile);

//PlayListItem parameters
 PPlayListItem = ^TPlayListItem;
 TPlayListItem = record
   FileName,Author,Title,Programm,Tracker,Computer,Date,Comment:string;
   FileType:TAvailableTypes;
   Time,Loop,Offset,Address,Length,UnpackedSize,AY_Freq,Int_Freq,
   Channel_Mode,Number_Of_Channels,FormatSpec,Tag:Integer;
   Chip_Type:ChTypes;
   AL,AR,BL,BR,CL,CR:byte;
   Selected:boolean;
   Error:TErrorCodes;
 end;

function GetPlayListTime(PLItem:PPLayListItem):integer;
function GetPlayListString(PLItem:PPLayListItem):string;
procedure Calculate_Slider_Points;

type
//Trackers structure
PModTypes = ^ModTypes;
ModTypes = packed record
case Integer of
0: (Index:array[0..65536] of byte);//65537 bytes (for Z80 emulation)
1: (ST_Delay:byte;
    ST_PositionsPointer,ST_OrnamentsPointer,ST_PatternsPointer:word;
    ST_Name:array[0..17]of char;
    ST_Size:word);
2: (ASC1_Delay,ASC1_LoopingPosition:byte;
    ASC1_PatternsPointers,ASC1_SamplesPointers,ASC1_OrnamentsPointers:word;
    ASC1_Number_Of_Positions:byte;
    ASC1_Positions:array[0..65535-9]of byte);
3: (ASC0_Delay:byte;
    ASC0_PatternsPointers,ASC0_SamplesPointers,ASC0_OrnamentsPointers:word;
    ASC0_Number_Of_Positions:byte;
    ASC0_Positions:array[0..65535-8]of byte);
4: (STP_Delay:byte;
    STP_PositionsPointer,STP_PatternsPointer,
    STP_OrnamentsPointer,STP_SamplesPointer:word;
    STP_Init_Id:byte);
5: (PT2_Delay:byte;
    PT2_NumberOfPositions:byte;
    PT2_LoopPosition:byte;
    PT2_SamplesPointers:array[0..31]of word;
    PT2_OrnamentsPointers:array[0..15]of word;
    PT2_PatternsPointer:word;
    PT2_MusicName:array[0..29]of char;
    PT2_PositionList:array[0..65535 - 131]of byte);
6: (PT3_MusicName:array[0..$62]of char;
    PT3_TonTableId:byte;
    PT3_Delay:byte;
    PT3_NumberOfPositions:byte;
    PT3_LoopPosition:byte;
    PT3_PatternsPointer:word;
    PT3_SamplesPointers:array[0..31]of word;
    PT3_OrnamentsPointers:array[0..15]of word;
    PT3_PositionList:array[0..65535-201]of byte);
7: (PSC_MusicName:array[0..68]of char;
    PSC_UnknownPointer:word;
    PSC_PatternsPointer:word;
    PSC_Delay:byte;
    PSC_OrnamentsPointer:word;
    PSC_SamplesPointers:array[0..31]of word);
8: (FTC_MusicName:array[0..68]of char;
    FTC_Delay:byte;
    FTC_Loop_Position:byte;
    FTC_Slack:integer;
    FTC_PatternsPointer:word;
    FTC_Slack2:array[0..4]of byte;
    FTC_SamplesPointers:array[0..31]of word;
    FTC_OrnamentsPointers:array[0..32]of word;
    FTC_Positions:array[0..(65536 - $d4) div 2 - 1] of packed record
                                            Pattern:byte;
                                            Transposition:shortint;
                                            end);
9: (PT1_Delay:byte;
    PT1_NumberOfPositions:byte;
    PT1_LoopPosition:byte;
    PT1_SamplesPointers:array[0..15]of word;
    PT1_OrnamentsPointers:array[0..15]of word;
    PT1_PatternsPointer:word;
    PT1_MusicName:array[0..29]of char;
    PT1_PositionList:array[0..65535-99]of byte);
10:(FLS_PositionsPointer:word;
    FLS_OrnamentsPointer:word;
    FLS_SamplesPointer:word;
    FLS_PatternsPointers:array[1..(65536-6)div 6] of packed record
     PatternA,PatternB,PatternC:word;
    end);
11:(SQT_Size,SQT_SamplesPointer,SQT_OrnamentsPointer,SQT_PatternsPointer,
    SQT_PositionsPointer,SQT_LoopPointer:word);
12:(GTR_Delay:byte;
    GTR_ID:array[0..3] of char;
    GTR_Address:word;
    GTR_Name:array[0..31] of char;
    GTR_SamplesPointers:array[0..14]of word;
    GTR_OrnamentsPointers:array[0..15]of word;
    GTR_PatternsPointers:array[0..31] of packed record
     PatternA,PatternB,PatternC:word;
    end;
    GTR_NumberOfPositions:byte;
    GTR_LoopPosition:byte;
    GTR_Positions:array[0..65536 - 295 - 1]of byte);
end;

var
 RAM:ModTypes;
 CurFileType:TAvailableTypes;
 FileOpened:boolean = False;
 FileAvailable:boolean = False;
 FileLoaded:boolean = False;
 FileHandle:integer;
 CurItem:record
  PLStr,Title,Author,Programm,Comment,Tracker,FileName:string;
 end;
 CurCDNum,CurCDTrk:integer;
 All_GetRegisters:procedure;
 Global_Tick_Counter,Global_Tick_Max:integer;
 VTX_Offset,Position_In_VTX:integer;
 NumberOfVBLs,LoopVBL:integer;
 YM6TiksOnInt:real;
 YM6SinusTable:array [0..15,0..7] of byte;
 AtariTimerPeriod1,AtariTimerPeriod2:real;
 AtariTimerCounter1,AtariTimerCounter2:real;
 YM6CurTik:real;
 YM6Tiks:int64;
 PVTXYMUnpackedData:PArrayOfByte;
 EPSG_TStateMax:integer;
 PSG_Skip:word;
 MFPTimerFrq:integer;
 Direction:integer;
 PlayingItem:integer = -1;
 PlayListItems:array of PPlayListItem;

 PLDef_Number_Of_Channels:integer;
 PLDef_Channel_Mode:integer;
 PLDef_SoundChip_Frq:integer;
 PLDef_Chip_Type:ChTypes;
 PLDef_Player_Frq:integer;
 PLDef_AL,PLDef_AR,PLDef_BL,PLDef_BR,PLDef_CL,PLDef_CR:byte;
 Time_ms:integer = 0;
 VProgrPos:integer;
 ProgrMax,ProgrPos:longword;
 ProgrX:word = 0;
 ProgrWidth:longword;
 ListLooped:boolean = False;
 PlayingOrderItem:integer = -1;

const
 MinType = Succ(Low(TAvailableTypes));
 MaxType = High(TAvailableTypes);
 AYYMFileMin = OUTFile;
 AYYMFileMax = PSGFile;
 MinVBLType = STCFile;
 MaxVBLType = PSGFile;
 TrkFileMin = STCFile;
 TrkFileMax = FXMFile;
 StreamFileMin = MP3File;
 StreamFileMax = WAVFile;
 MpegFileMin = MP3File;
 MpegFileMax = MP1File;
 MODFilesMin = MO3File;
 MODFilesMax = UMXFile;
 BASSFileMin = MP3File;
 BASSFileMax = UMXFile;
 STypes:array[MinType..MaxType] of string[4] =
 ('OUT','ZXAY','EPSG','AY','AYM','STC','ASC','ASC0','STP','PSC','FLS','FTC',
  'PT1','PT2','PT3','SQT','GTR','FXM','VTX','YM2','YM3','YM3b','YM5','YM6',
  'PSG','MP3','MP2','MP1','OGG','WAV','MO3','IT','XM','S3M','MTM','MOD','UMX',
  'CDA');
 SExts:array[MinType..MaxType] of string[5] =
 ('.OUT','.ZXAY','.PSG','.AY','.AYM','.STC','.ASC','','.STP','.PSC','.FLS',
  '.FTC','.PT1','.PT2','.PT3','.SQT','.GTR','.FXM','.VTX','.YM','.YM','.YM',
  '.YM','.YM','.PSG','.MP3','.MP2','.MP1','.OGG','.WAV','.MO3','.IT','.XM',
  '.S3M','.MTM','.MOD','.UMX','.CDA');

implementation

uses {$IFDEF WIN32GUI} MainWin, PLWin, {$ENDIF WIN32GUI}
     Windows, KOL, UniReader, LH5, CDviaMCI,
     lightBASS, Z80, WaveOUTAPI, Mixer;

type
 EFileStructureError = class(AYEmulError);

  PID3v1 = ^TID3v1;
  TID3v1 = packed record
   Tag:array[0..2] of char;
   Title,Author,Album:array[0..29] of char;
   Year:array[0..3] of char;
   Comment:array[0..29] of char;
   Genre:byte;
  end;
  PID3V2Header = ^TID3V2Header;
  TID3V2Header = packed record
   Tag:array[0..2] of char;
   VerMajor,VerMinor,Flags:byte;
   Size:DWORD;
  end;
  PID3V2ExtHeader = ^TID3V2ExtHeader;
  TID3V2ExtHeader = packed record
   Size:DWORD;
   Flags:word;
   PaddingSize:DWORD;
  end;
  PID3V2Frame = ^TID3V2Frame;
  TID3V2Frame = packed record
   Id,Size:DWORD;
   Flags:word;
  end;

//AY-file header and structures
 TAYFileHeader = packed record
   FileID,TypeID:longword;
   FileVersion,PlayerVersion:byte;
   PSpecialPlayer,PAuthor,PMisc:smallint;
   NumOfSongs,FirstSong:byte;
   PSongsStructure:smallint;
 end;
 TSongStructure = packed record
   PSongName,PSongData:smallint;
 end;
 TSongData = packed record
   ChanA,ChanB,ChanC,Noise:byte;
   SongLength:word;
   FadeLength:word;
   HiReg,LoReg:byte;
   PPoints,PAddresses:smallint;
 end;
 TPoints = packed record
   Stek,Init,Inter:word;
 end;

//AYM-file header
 TAYMFileHeader = packed record
   AYM:array[0..2] of char;
   Rev:char;
   Name:array[0..27] of char;
   Author:array[0..15] of char;
   Init,Play:word;
   MusMin,MusMax,MusPos,RegPos:byte;
   AF,BC,DE,HL,IX,IY:word;
   Blocks:byte;
 end;
 TAYMBlock = packed record
   start,size:word;
 end;

//VTX-file header
 TVTXFileHeader = packed record
  Id:word;
  Mode:byte;
  Loop:word;
  ChipFrq:dword;
  InterFrq:byte;
  Year:word;
  UnpackSize:dword;
 end;

//YM5- and YM6-file header
 PYM5FileHeader = ^TYM5FileHeader;
 TYM5FileHeader = packed record
  Id:dword;
  Leo:array[0..7]of char;
  Num_of_tiks:dword;
  Song_Attr:dword;
  Num_of_Dig:word;
  ChipFrq:dword;
  InterFrq:word;
  Loop:dword;
  Add_Size:word;
 end;

//LZH-file header
 TLZHFileHeader = Packed Record
  HSize      : Byte;
  ChkSum     : Byte;
  Method     : Array[1..5] of Char;
  CompSize   : LongInt;
  UCompSize  : LongInt;
  Dos_DT     : LongInt;
  Attr       : Word;
  FileNameLen: Byte;
 end;

 FXM_Stek = packed array of word;

 PPT3_Channel_Parameters = ^PT3_Channel_Parameters;
 PT3_Channel_Parameters = record
  Address_In_Pattern,
  OrnamentPointer,
  SamplePointer,
  Ton:word;
  Loop_Ornament_Position,
  Ornament_Length,
  Position_In_Ornament,
  Loop_Sample_Position,
  Sample_Length,
  Position_In_Sample,
  Volume,
  Number_Of_Notes_To_Skip,
  Note,
  Slide_To_Note,
  Amplitude:byte;
  Envelope_Enabled,
  Enabled,
  SimpleGliss:boolean;
  Current_Amplitude_Sliding,
  Current_Noise_Sliding,
  Current_Envelope_Sliding,
  Ton_Slide_Count,
  Current_OnOff,
  OnOff_Delay,
  OffOn_Delay,
  Ton_Slide_Delay,
  Current_Ton_Sliding,
  Ton_Accumulator,
  Ton_Slide_Step,
  Ton_Delta:smallint;
  Note_Skip_Counter:shortint
 end;

 PPT3_Parameters = ^PT3_Parameters;
 PT3_Parameters = record
  PT3_Version:integer;
  Env_Base:packed record
  case Boolean of
  True: (wrd:smallint);
  False:(lo:byte;
         hi:byte);
  end;
  Cur_Env_Slide,
  Env_Slide_Add:smallint;
  Cur_Env_Delay,
  Env_Delay:shortint;
  Noise_Base,
  Delay,
  AddToNoise,
  DelayCounter,
  CurrentPosition:byte;
 end;

 PPT2_Channel_Parameters = ^PT2_Channel_Parameters;
 PT2_Channel_Parameters = record
  Address_In_Pattern,
  OrnamentPointer,
  SamplePointer,
  Ton:word;
  Loop_Ornament_Position,
  Ornament_Length,
  Position_In_Ornament,
  Loop_Sample_Position,
  Sample_Length,
  Position_In_Sample,
  Volume,
  Number_Of_Notes_To_Skip,
  Note,
  Slide_To_Note,
  Amplitude:byte;
  Current_Ton_Sliding,
  Ton_Delta:smallint;
  GlissType:integer;
  Envelope_Enabled,
  Enabled:boolean;
  Glissade,
  Addition_To_Noise,
  Note_Skip_Counter:shortint
 end;
 PPT2_Parameters = ^PT2_Parameters;
 PT2_Parameters = record
  DelayCounter,
  Delay,
  CurrentPosition:byte;
 end;

 PSTC_Channel_Parameters = ^STC_Channel_Parameters;
 STC_Channel_Parameters = record
  Address_In_Pattern,
  SamplePointer,
  OrnamentPointer,
  Ton:word;
  Amplitude,
  Note,
  Position_In_Sample,
  Number_Of_Notes_To_Skip:byte;
  Sample_Tik_Counter,
  Note_Skip_Counter:shortint;
  Envelope_Enabled:boolean;
 end;
 PSTC_Parameters = ^STC_Parameters;
 STC_Parameters = record
  DelayCounter,
  Transposition,
  CurrentPosition:byte;
 end;

 PSTP_Channel_Parameters = ^STP_Channel_Parameters;
 STP_Channel_Parameters = record
  OrnamentPointer,
  SamplePointer,
  Address_In_Pattern,
  Ton:word;
  Position_In_Ornament,
  Loop_Ornament_Position,
  Ornament_Length,
  Position_In_Sample,
  Loop_Sample_Position,
  Sample_Length,
  Volume,
  Number_Of_Notes_To_Skip,
  Note,
  Amplitude:byte;
  Current_Ton_Sliding:smallint;
  Envelope_Enabled,
  Enabled:boolean;
  Glissade,
  Note_Skip_Counter:shortint
 end;
 PSTP_Parameters = ^STP_Parameters;
 STP_Parameters = record
  DelayCounter,
  CurrentPosition,
  Transposition:byte;
 end;

 PASC_Channel_Parameters = ^ASC_Channel_Parameters;
 ASC_Channel_Parameters = record
  Initial_Point_In_Sample,
  Point_In_Sample,
  Loop_Point_In_Sample,
  Initial_Point_In_Ornament,
  Point_In_Ornament,
  Loop_Point_In_Ornament,
  Address_In_Pattern,
  Ton,
  Ton_Deviation:word;
  Note,
  Addition_To_Note,
  Number_Of_Notes_To_Skip,
  Initial_Noise,
  Current_Noise,
  Volume,
  Ton_Sliding_Counter,
  Amplitude,
  Amplitude_Delay,
  Amplitude_Delay_Counter:byte;
  Current_Ton_Sliding,
  Substruction_for_Ton_Sliding:smallint;
  Note_Skip_Counter,
  Addition_To_Amplitude:shortint;
  Envelope_Enabled,
  Sound_Enabled,
  Sample_Finished,
  Break_Sample_Loop,
  Break_Ornament_Loop:boolean;
 end;
 PASC_Parameters = ^ASC_Parameters;
 ASC_Parameters = record
  Delay,
  DelayCounter,
  CurrentPosition:byte;
 end;

 PPSC_Channel_Parameters = ^PSC_Channel_Parameters;
 PSC_Channel_Parameters = record
  Address_In_Pattern,
  OrnamentPointer,
  SamplePointer,
  Ton:word;
  Current_Ton_Sliding,
  Ton_Accumulator,
  Addition_To_Ton:smallint;
  Initial_Volume,
  Note_Skip_Counter:shortint;
  Note,
  Volume,
  Amplitude,
  Volume_Counter,
  Volume_Counter1,
  Volume_Counter_Init,
  Noise_Accumulator,
  Position_In_Sample,
  Loop_Sample_Position,
  Position_In_Ornament,
  Loop_Ornament_Position:byte;
  Enabled,
  Ornament_Enabled,
  Envelope_Enabled,
  Gliss,
  Ton_Slide_Enabled,
  Break_Sample_Loop,
  Break_Ornament_Loop,
  Volume_Inc:boolean;
 end;

 PPSC_Parameters = ^PSC_Parameters;
 PSC_Parameters = record
  Delay,
  DelayCounter,
  Lines_Counter,
  Noise_Base:byte;
  Positions_Pointer:word;
 end;

 PSQT_Channel_Parameters = ^SQT_Channel_Parameters;
 SQT_Channel_Parameters = record
  Address_In_Pattern,
  SamplePointer,
  Point_In_Sample,
  OrnamentPointer,
  Point_In_Ornament,
  Ton,
  ix27:word;
  Volume,
  Amplitude,
  Note,
  ix21:byte;
  Ton_Slide_Step,
  Current_Ton_Sliding:smallint;
  Sample_Tik_Counter,
  Ornament_Tik_Counter,
  Transposit:shortint;
  Enabled,
  Envelope_Enabled,
  Ornament_Enabled,
  Gliss,
  MixNoise,
  MixTon,
  b4ix0,b6ix0,b7ix0:boolean;
 end;

 PSQT_Parameters = ^SQT_Parameters;
 SQT_Parameters = record
  Delay,
  DelayCounter,
  Lines_Counter:byte;
  Positions_Pointer:word;
 end;

 PFTC_Channel_Parameters = ^FTC_Channel_Parameters;
 FTC_Channel_Parameters = record
  Address_In_Pattern,
  OrnamentPointer,
  SamplePointer,
  Envelope_Accumulator,
  Envelope,
  Ton:word;
  Ornament_Length,
  Loop_Ornament_Position,
  Position_In_Ornament,
  Sample_Length,
  Loop_Sample_Position,
  Position_In_Sample,
  Sample_Noise_Accumulator,
  Noise_Accumulator,
  Note_Accumulator,
  Ton_Slide_Direction,
  Volume,
  Noise,
  Amplitude,
  Previous_Note,
  Note:byte;
  Note_Skip_Counter,
  Volume_Slide:shortint;
  Addition_To_Ton,
  Ton_Slide_Step,
  Ton_Slide_Step1,
  Current_Ton_Sliding,
  Ton_Accumulator:smallint;
  Envelope_Enabled,
  Sample_Enabled:boolean;
 end;

 PFTC_Parameters = ^FTC_Parameters;
 FTC_Parameters = record
  Delay,
  DelayCounter,
  Transposition,
  CurrentPosition:byte;
 end;

 PPT1_Channel_Parameters = ^PT1_Channel_Parameters;
 PT1_Channel_Parameters = record
  Address_In_Pattern,
  OrnamentPointer,
  SamplePointer,
  Ton:word;
  Number_Of_Notes_To_Skip,
  Volume,
  Loop_Sample_Position,
  Position_In_Sample,
  Sample_Length,
  Amplitude,
  Note:byte;
  Note_Skip_Counter:shortint;
  Envelope_Enabled,
  Enabled:boolean;
 end;

 PPT1_Parameters = ^PT1_Parameters;
 PT1_Parameters = record
  Delay,
  DelayCounter,
  CurrentPosition:byte;
 end;

 PFLS_Channel_Parameters = ^FLS_Channel_Parameters;
 FLS_Channel_Parameters = record
  Address_In_Pattern,
  OrnamentPointer,
  SamplePointer,
  Ton:word;
  Sample_Length,
  Loop_Sample_Position,
  Position_In_Sample,
  Amplitude,
  Number_Of_Notes_To_Skip,
  Note:byte;
  Note_Skip_Counter,
  Sample_Tik_Counter:shortint;
  Envelope_Enabled,
  Ornament_Enabled:boolean;
 end;

 PFLS_Parameters = ^FLS_Parameters;
 FLS_Parameters = record
  Delay,
  DelayCounter,
  CurrentPosition:byte;
 end;

 PGTR_Channel_Parameters = ^GTR_Channel_Parameters;
 GTR_Channel_Parameters = record
  SamplePointer,
  OrnamentPointer,
  Address_In_Pattern,
  Ton:word;
  Position_In_Sample,
  Loop_Sample_Position,
  Sample_Length,
  Position_In_Ornament,
  Loop_Ornament_Position,
  Ornament_Length,
  Volume,
  Note,
  Amplitude:byte;
  Note_Skip_Counter:shortint;
  Envelope_Enabled,
  Enabled:boolean;
 end;

 PGTR_Parameters = ^GTR_Parameters;
 GTR_Parameters = record
  DelayCounter,
  CurrentPosition:byte;
 end;

 PFXM_Channel_Parameters = ^FXM_Channel_Parameters;
 FXM_Channel_Parameters = record
  Address_In_Pattern,
  Point_In_Sample,
  SamplePointer,
  Point_In_Ornament,
  OrnamentPointer,
  Ton:word;
  FXM_Mixer,
  Note,
  Volume,
  Amplitude:byte;
  Transposit,
  Note_Skip_Counter,
  Sample_Tik_Counter:shortint;
  b0e,b1e,b2e,b3e:boolean;
 end;

 PFXM_Parameters = ^FXM_Parameters;
 FXM_Parameters = record
  Address:word;
  Noise_Base,
  amad_andsix:byte;
 end;

 TPlParams = record
  case Integer of
  0: (PT3:PT3_Parameters;PT3_A,PT3_B,PT3_C:PT3_Channel_Parameters);
  1: (PT2:PT2_Parameters;PT2_A,PT2_B,PT2_C:PT2_Channel_Parameters);
  2: (PT1:PT1_Parameters;PT1_A,PT1_B,PT1_C:PT1_Channel_Parameters);
  3: (STC:STC_Parameters;STC_A,STC_B,STC_C:STC_Channel_Parameters);
  4: (STP:STP_Parameters;STP_A,STP_B,STP_C:STP_Channel_Parameters);
  5: (ASC:ASC_Parameters;ASC_A,ASC_B,ASC_C:ASC_Channel_Parameters);
  6: (PSC:PSC_Parameters;PSC_A,PSC_B,PSC_C:PSC_Channel_Parameters);
  7: (SQT:SQT_Parameters;SQT_A,SQT_B,SQT_C:SQT_Channel_Parameters);
  8: (FTC:FTC_Parameters;FTC_A,FTC_B,FTC_C:FTC_Channel_Parameters);
  9: (FLS:FLS_Parameters;FLS_A,FLS_B,FLS_C:FLS_Channel_Parameters);
  10:(GTR:GTR_Parameters;GTR_A,GTR_B,GTR_C:GTR_Channel_Parameters);
  11:(FXM:FXM_Parameters;FXM_A,FXM_B,FXM_C:FXM_Channel_Parameters);
 end;

var
 Trackers_Slider_Points:array of record
  PlPars:TPlParams;
  AYRegs:TRegisterAY;
  FXM_StekA,FXM_StekB,FXM_StekC:FXM_Stek;
  DWParam1,DWParam2,DWParam3:DWORD;
 end;

const
 KsaId = 'KSA SOFTWARE COMPILATION OF ';
 Version_String = 'ZX Spectrum Sound Chip Emulator Play List File v1.';

//Ton tables of different trackers
{ASC Sound Master}
 ASM_Table:array[0..$55]of word=
($edc,$e07,$d3e,$c80,$bcc,$b22,$a82,$9ec,$95c,$8d6,$858,$7e0,$76e,$704,$69f,
 $640,$5e6,$591,$541,$4f6,$4ae,$46b,$42c,$3f0,$3b7,$382,$34f,$320,$2f3,$2c8,
 $2a1,$27b,$257,$236,$216,$1f8,$1dc,$1c1,$1a8,$190,$179,$164,$150,$13d,$12c,
 $11b,$10b,$fc,$ee,$e0,$d4,$c8,$bd,$b2,$a8,$9f,$96,$8d,$85,$7e,$77,$70,$6a,
 $64,$5e,$59,$54,$50,$4b,$47,$43,$3f,$3c,$38,$35,$32,$2f,$2d,$2a,$28,$26,$24,
 $22,$20,$1e,$1c);

{Sound Tracker}
 ST_Table:Array[0..95]of word=
($ef8,$e10,$d60,$c80,$bd8,$b28,$a88,$9f0,$960,$8e0,$858,$7e0,$77c,$708,$6b0,
 $640,$5ec,$594,$544,$4f8,$4b0,$470,$42c,$3f0,$3be,$384,$358,$320,$2f6,$2ca,
 $2a2,$27c,$258,$238,$216,$1f8,$1df,$1c2,$1ac,$190,$17b,$165,$151,$13e,$12c,
 $11c,$10b,$fc,$ef,$e1,$d6,$c8,$bd,$b2,$a8,$9f,$96,$8e,$85,$7e,$77,$70,$6b,
 $64,$5e,$59,$54,$4f,$4b,$47,$42,$3f,$3b,$38,$35,$32,$2f,$2c,$2a,$27,$25,$23,
 $21,$1f,$1d,$1c,$1a,$19,$17,$16,$15,$13,$12,$11,$10,$f);

{Pro Tracker 2.xx (Table #1 of Pro Tracker 3.4r)}
 PT2_Table:Array[0..95]of word=
($ef8,$e10,$d60,$c80,$bd8,$b28,$a88,$9f0,$960,$8e0,$858,$7e0,$77c,$708,$6b0,
 $640,$5ec,$594,$544,$4f8,$4b0,$470,$42c,$3fd,$3be,$384,$358,$320,$2f6,$2ca,
 $2a2,$27c,$258,$238,$216,$1f8,$1df,$1c2,$1ac,$190,$17b,$165,$151,$13e,$12c,
 $11c,$10a,$fc,$ef,$e1,$d6,$c8,$bd,$b2,$a8,$9f,$96,$8e,$85,$7e,$77,$70,$6b,
 $64,$5e,$59,$54,$4f,$4b,$47,$42,$3f,$3b,$38,$35,$32,$2f,$2c,$2a,$27,$25,$23,
 $21,$1f,$1d,$1c,$1a,$19,$17,$16,$15,$13,$12,$11,$10,$f);

{SQ-Tracker}
 SQT_Table:array[0..$5f]of word=
($d5d,$c9c,$be7,$b3c,$a9b,$a02,$973,$8eb,$86b,$7f2,$780,$714,$6ae,$64e,
 $5f4,$59e,$54f,$501,$4b9,$475,$435,$3f9,$3c0,$38a,$357,$327,$2fa,$2cf,$2a7,
 $281,$25d,$23b,$21b,$1fc,$1e0,$1c5,$1ac,$194,$17d,$168,$153,$140,$12e,$11d,
 $10d,$fe,$f0,$e2,$d6,$ca,$be,$b4,$aa,$a0,$97,$8f,$87,$7f,$78,$71,$6b,$65,$5f,
 $5a,$55,$50,$4c,$47,$43,$40,$3c,$39,$35,$32,$30,$2d,$2a,$28,$26,$24,$22,$20,
 $1e,$1c,$1b,$19,$18,$16,$15,$14,$13,$12,$11,$10,$f,$e);

{Fuxoft AY Language}
 FXM_Table:Array[0..$53]of word=
($fbf,$edc,$e07,$d3d,$c7f,$bcc,$b22,$a82,$9eb,$95d,$8d6,$857,$7df,$76e,$703,
 $69f,$640,$5e6,$591,$541,$4f6,$4ae,$46b,$42c,$3f0,$3b7,$382,$34f,$320,$2f3,
 $2c8,$2a1,$27b,$257,$236,$216,$1f8,$1dc,$1c1,$1a8,$190,$179,$164,$150,$13d,
 $12c,$11b,$10b,$fc,$ee,$e0,$d4,$c8,$bd,$b2,$a8,$9f,$96,$8d,$85,$7e,$77,$70,
 $6a,$64,$5e,$59,$54,$4f,$4b,$47,$43,$3f,$3b,$38,$35,$32,$2f,$2d,$2a,$28,$25,
 $23,$21);

type
 PT3ToneTable = array[0..95] of word;
 PT3VolTable = array[0..15,0..15] of byte;

const 
{Table #0 of Pro Tracker 3.3x - 3.4r}
 PT3NoteTable_PT_33_34r:PT3ToneTable = (
  $0C21,$0B73,$0ACE,$0A33,$09A0,$0916,$0893,$0818,$07A4,$0736,$06CE,$066D,
  $0610,$05B9,$0567,$0519,$04D0,$048B,$0449,$040C,$03D2,$039B,$0367,$0336,
  $0308,$02DC,$02B3,$028C,$0268,$0245,$0224,$0206,$01E9,$01CD,$01B3,$019B,
  $0184,$016E,$0159,$0146,$0134,$0122,$0112,$0103,$00F4,$00E6,$00D9,$00CD,
  $00C2,$00B7,$00AC,$00A3,$009A,$0091,$0089,$0081,$007A,$0073,$006C,$0066,
  $0061,$005B,$0056,$0051,$004D,$0048,$0044,$0040,$003D,$0039,$0036,$0033,
  $0030,$002D,$002B,$0028,$0026,$0024,$0022,$0020,$001E,$001C,$001B,$0019,
  $0018,$0016,$0015,$0014,$0013,$0012,$0011,$0010,$000F,$000E,$000D,$000C);

{Table #0 of Pro Tracker 3.4x - 3.5x}
 PT3NoteTable_PT_34_35:PT3ToneTable = (
  $0C22,$0B73,$0ACF,$0A33,$09A1,$0917,$0894,$0819,$07A4,$0737,$06CF,$066D,
  $0611,$05BA,$0567,$051A,$04D0,$048B,$044A,$040C,$03D2,$039B,$0367,$0337,
  $0308,$02DD,$02B4,$028D,$0268,$0246,$0225,$0206,$01E9,$01CE,$01B4,$019B,
  $0184,$016E,$015A,$0146,$0134,$0123,$0112,$0103,$00F5,$00E7,$00DA,$00CE,
  $00C2,$00B7,$00AD,$00A3,$009A,$0091,$0089,$0082,$007A,$0073,$006D,$0067,
  $0061,$005C,$0056,$0052,$004D,$0049,$0045,$0041,$003D,$003A,$0036,$0033,
  $0031,$002E,$002B,$0029,$0027,$0024,$0022,$0020,$001F,$001D,$001B,$001A,
  $0018,$0017,$0016,$0014,$0013,$0012,$0011,$0010,$000F,$000E,$000D,$000C);

{Table #1 of Pro Tracker 3.3x - 3.5x)}
 PT3NoteTable_ST:PT3ToneTable = (
  $0EF8,$0E10,$0D60,$0C80,$0BD8,$0B28,$0A88,$09F0,$0960,$08E0,$0858,$07E0,
  $077C,$0708,$06B0,$0640,$05EC,$0594,$0544,$04F8,$04B0,$0470,$042C,$03FD,
  $03BE,$0384,$0358,$0320,$02F6,$02CA,$02A2,$027C,$0258,$0238,$0216,$01F8,
  $01DF,$01C2,$01AC,$0190,$017B,$0165,$0151,$013E,$012C,$011C,$010A,$00FC,
  $00EF,$00E1,$00D6,$00C8,$00BD,$00B2,$00A8,$009F,$0096,$008E,$0085,$007E,
  $0077,$0070,$006B,$0064,$005E,$0059,$0054,$004F,$004B,$0047,$0042,$003F,
  $003B,$0038,$0035,$0032,$002F,$002C,$002A,$0027,$0025,$0023,$0021,$001F,
  $001D,$001C,$001A,$0019,$0017,$0016,$0015,$0013,$0012,$0011,$0010,$000F);

{Table #2 of Pro Tracker 3.4r}
 PT3NoteTable_ASM_34r:PT3ToneTable = (
  $0D3E,$0C80,$0BCC,$0B22,$0A82,$09EC,$095C,$08D6,$0858,$07E0,$076E,$0704,
  $069F,$0640,$05E6,$0591,$0541,$04F6,$04AE,$046B,$042C,$03F0,$03B7,$0382,
  $034F,$0320,$02F3,$02C8,$02A1,$027B,$0257,$0236,$0216,$01F8,$01DC,$01C1,
  $01A8,$0190,$0179,$0164,$0150,$013D,$012C,$011B,$010B,$00FC,$00EE,$00E0,
  $00D4,$00C8,$00BD,$00B2,$00A8,$009F,$0096,$008D,$0085,$007E,$0077,$0070,
  $006A,$0064,$005E,$0059,$0054,$0050,$004B,$0047,$0043,$003F,$003C,$0038,
  $0035,$0032,$002F,$002D,$002A,$0028,$0026,$0024,$0022,$0020,$001E,$001D,
  $001B,$001A,$0019,$0018,$0015,$0014,$0013,$0012,$0011,$0010,$000F,$000E);

{Table #2 of Pro Tracker 3.4x - 3.5x}
 PT3NoteTable_ASM_34_35:PT3ToneTable = (
  $0D10,$0C55,$0BA4,$0AFC,$0A5F,$09CA,$093D,$08B8,$083B,$07C5,$0755,$06EC,
  $0688,$062A,$05D2,$057E,$052F,$04E5,$049E,$045C,$041D,$03E2,$03AB,$0376,
  $0344,$0315,$02E9,$02BF,$0298,$0272,$024F,$022E,$020F,$01F1,$01D5,$01BB,
  $01A2,$018B,$0174,$0160,$014C,$0139,$0128,$0117,$0107,$00F9,$00EB,$00DD,
  $00D1,$00C5,$00BA,$00B0,$00A6,$009D,$0094,$008C,$0084,$007C,$0075,$006F,
  $0069,$0063,$005D,$0058,$0053,$004E,$004A,$0046,$0042,$003E,$003B,$0037,
  $0034,$0031,$002F,$002C,$0029,$0027,$0025,$0023,$0021,$001F,$001D,$001C,
  $001A,$0019,$0017,$0016,$0015,$0014,$0012,$0011,$0010,$000F,$000E,$000D);

{Table #3 of Pro Tracker 3.4r}
 PT3NoteTable_REAL_34r:PT3ToneTable = (
  $0CDA,$0C22,$0B73,$0ACF,$0A33,$09A1,$0917,$0894,$0819,$07A4,$0737,$06CF,
  $066D,$0611,$05BA,$0567,$051A,$04D0,$048B,$044A,$040C,$03D2,$039B,$0367,
  $0337,$0308,$02DD,$02B4,$028D,$0268,$0246,$0225,$0206,$01E9,$01CE,$01B4,
  $019B,$0184,$016E,$015A,$0146,$0134,$0123,$0113,$0103,$00F5,$00E7,$00DA,
  $00CE,$00C2,$00B7,$00AD,$00A3,$009A,$0091,$0089,$0082,$007A,$0073,$006D,
  $0067,$0061,$005C,$0056,$0052,$004D,$0049,$0045,$0041,$003D,$003A,$0036,
  $0033,$0031,$002E,$002B,$0029,$0027,$0024,$0022,$0020,$001F,$001D,$001B,
  $001A,$0018,$0017,$0016,$0014,$0013,$0012,$0011,$0010,$000F,$000E,$000D);

{Table #3 of Pro Tracker 3.4x - 3.5x}
 PT3NoteTable_REAL_34_35:PT3ToneTable = (
  $0CDA,$0C22,$0B73,$0ACF,$0A33,$09A1,$0917,$0894,$0819,$07A4,$0737,$06CF,
  $066D,$0611,$05BA,$0567,$051A,$04D0,$048B,$044A,$040C,$03D2,$039B,$0367,
  $0337,$0308,$02DD,$02B4,$028D,$0268,$0246,$0225,$0206,$01E9,$01CE,$01B4,
  $019B,$0184,$016E,$015A,$0146,$0134,$0123,$0112,$0103,$00F5,$00E7,$00DA,
  $00CE,$00C2,$00B7,$00AD,$00A3,$009A,$0091,$0089,$0082,$007A,$0073,$006D,
  $0067,$0061,$005C,$0056,$0052,$004D,$0049,$0045,$0041,$003D,$003A,$0036,
  $0033,$0031,$002E,$002B,$0029,$0027,$0024,$0022,$0020,$001F,$001D,$001B,
  $001A,$0018,$0017,$0016,$0014,$0013,$0012,$0011,$0010,$000F,$000E,$000D);

{Volume table of Pro Tracker 3.3x - 3.4x}
 PT3VolumeTable_33_34:PT3VolTable = (
  ($00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00),
  ($00,$00,$00,$00,$00,$00,$00,$00,$01,$01,$01,$01,$01,$01,$01,$01),
  ($00,$00,$00,$00,$00,$00,$01,$01,$01,$01,$01,$02,$02,$02,$02,$02),
  ($00,$00,$00,$00,$01,$01,$01,$01,$02,$02,$02,$02,$03,$03,$03,$03),
  ($00,$00,$00,$00,$01,$01,$01,$02,$02,$02,$03,$03,$03,$04,$04,$04),
  ($00,$00,$00,$01,$01,$01,$02,$02,$03,$03,$03,$04,$04,$04,$05,$05),
  ($00,$00,$00,$01,$01,$02,$02,$03,$03,$03,$04,$04,$05,$05,$06,$06),
  ($00,$00,$01,$01,$02,$02,$03,$03,$04,$04,$05,$05,$06,$06,$07,$07),
  ($00,$00,$01,$01,$02,$02,$03,$03,$04,$05,$05,$06,$06,$07,$07,$08),
  ($00,$00,$01,$01,$02,$03,$03,$04,$05,$05,$06,$06,$07,$08,$08,$09),
  ($00,$00,$01,$02,$02,$03,$04,$04,$05,$06,$06,$07,$08,$08,$09,$0A),
  ($00,$00,$01,$02,$03,$03,$04,$05,$06,$06,$07,$08,$09,$09,$0A,$0B),
  ($00,$00,$01,$02,$03,$04,$04,$05,$06,$07,$08,$08,$09,$0A,$0B,$0C),
  ($00,$00,$01,$02,$03,$04,$05,$06,$07,$07,$08,$09,$0A,$0B,$0C,$0D),
  ($00,$00,$01,$02,$03,$04,$05,$06,$07,$08,$09,$0A,$0B,$0C,$0D,$0E),
  ($00,$01,$02,$03,$04,$05,$06,$07,$08,$09,$0A,$0B,$0C,$0D,$0E,$0F));

{Volume table of Pro Tracker 3.5x}
 PT3VolumeTable_35:PT3VolTable = (
  ($00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00,$00),
  ($00,$00,$00,$00,$00,$00,$00,$00,$01,$01,$01,$01,$01,$01,$01,$01),
  ($00,$00,$00,$00,$01,$01,$01,$01,$01,$01,$01,$01,$02,$02,$02,$02),
  ($00,$00,$00,$01,$01,$01,$01,$01,$02,$02,$02,$02,$02,$03,$03,$03),
  ($00,$00,$01,$01,$01,$01,$02,$02,$02,$02,$03,$03,$03,$03,$04,$04),
  ($00,$00,$01,$01,$01,$02,$02,$02,$03,$03,$03,$04,$04,$04,$05,$05),
  ($00,$00,$01,$01,$02,$02,$02,$03,$03,$04,$04,$04,$05,$05,$06,$06),
  ($00,$00,$01,$01,$02,$02,$03,$03,$04,$04,$05,$05,$06,$06,$07,$07),
  ($00,$01,$01,$02,$02,$03,$03,$04,$04,$05,$05,$06,$06,$07,$07,$08),
  ($00,$01,$01,$02,$02,$03,$04,$04,$05,$05,$06,$07,$07,$08,$08,$09),
  ($00,$01,$01,$02,$03,$03,$04,$05,$05,$06,$07,$07,$08,$09,$09,$0A),
  ($00,$01,$01,$02,$03,$04,$04,$05,$06,$07,$07,$08,$09,$0A,$0A,$0B),
  ($00,$01,$02,$02,$03,$04,$05,$06,$06,$07,$08,$09,$0A,$0A,$0B,$0C),
  ($00,$01,$02,$03,$03,$04,$05,$06,$07,$08,$09,$0A,$0A,$0B,$0C,$0D),
  ($00,$01,$02,$03,$04,$05,$06,$07,$07,$08,$09,$0A,$0B,$0C,$0D,$0E),
  ($00,$01,$02,$03,$04,$05,$06,$07,$08,$09,$0A,$0B,$0C,$0D,$0E,$0F));

var
 F_Frame:PModTypes;
 Readen1,F_Length,F_Address:integer;
// PrgBox:boolean;

 DDrumSamples:array of record
  Length:integer;
  Buf:PArrayOfByte;
 end;
 AtariSE1Type,AtariSE2Type,AtariSE1Channel,AtariSE2Channel:byte;
 AtariV1,AtariV2:byte;
 AtariParam1,AtariParam2:byte;
 AtariSE1Pos,AtariSE2Pos:integer;
 AtariSE1TP,AtariSE2TP:byte;
 YM6SinusPos1,YM6SinusPos2:integer;

 FXM_StekA,FXM_StekB,FXM_StekC:FXM_Stek;
 PlParams:TPlParams;
 AYSongData:TSongData;
 AYPoints:TPoints;
 AYBlocks:integer;
 AYMFileHeader:TAYMFileHeader;
 
 PlayingOrder:array of integer;

{PlayList code begin}

procedure CreatePlayOrder;
var
 i,j,l:integer;
begin
l := Length(PlayListItems);
SetLength(PlayingOrder,l);
if l = 0 then exit;
if Direction = 0 then
 for i := 0 to l - 1 do
  begin
   j := l - i - 1;
   PlayingOrder[i] := j;
   PlayListItems[j].Tag := i
  end
else if Direction <> 2 then
 for i := 0 to l - 1 do
  begin
   PlayingOrder[i] := i;
   PlayListItems[i].Tag := i
  end
else
 begin
  for i := 0 to l - 1 do
   PlayListItems[i].Tag := -1;
  i := 0;
  if PlayingItem >= 0 then
   begin
    PlayListItems[PlayingItem].Tag := 0;
    PlayingOrder[0] := PlayingItem;
    i := 1
   end;
  for i := i to l - 1 do
   begin
    repeat
     j := Random(l)
    until PlayListItems[j].Tag < 0;
    PlayListItems[j].Tag := i;
    PlayingOrder[i] := j
   end
 end;
if PlayingItem = - 1 then
 PlayingOrderItem := -1
else
 PlayingOrderItem := PlayListItems[PlayingItem].Tag
end;

function AddPlayListItem(var PLItem:PPlayListItem):integer;
begin
New(PLItem);
Result := Length(PlayListItems);
SetLength(PlayListItems,Result + 1);
PlayListItems[Result] := PLItem
end;

procedure ClearPlayListItems;
var
 i:integer;
begin
{$IFDEF WIN32GUI}
LastSelected := -1;
{$ENDIF WIN32GUI}
for i := 0 to Length(PlayListItems) - 1 do
 Dispose(PlayListItems[i]);
PlayListItems := nil
end;

procedure SetDirection;
{var
 Bmp:TBitmap;}
begin
if Direction = Dir then exit;
Direction := Dir;

  Case Dir of
  0:PLButDirection.Caption := '/\';
  1:PLButDirection.Caption := '\/';
  2:PLButDirection.Caption := 'Rnd';
  3:PLButDirection.Caption := 'Cur';
  end;

{Bmp := TBitmap.Create;
ImageList1.GetBitmap(Dir,Bmp);
DirectionButton.Glyph := Bmp;
Bmp.Free}
end;

procedure ClearParams;
begin
{$IFDEF WIN32GUI}
LastSelected := -1;
{$ENDIF WIN32GUI}
Item_Displayed := -1;
PlayingOrderItem := -1;
PlayingItem := -1;
Scroll_Distination := -1;
Scroll_Offset := scr_lineheight;
PLDef_Number_Of_Channels := 0;
PLDef_Channel_Mode := -1;
PLDef_SoundChip_Frq := -1;
PLDef_Chip_Type := No_Chip;
PLDef_Player_Frq := -1;
ClearTimeInd := True
end;

procedure ForceScrollForDelete;
begin
Item_Displayed := Scroll_Distination;
Scroll_Offset := scr_lineheight;
ReprepareScroll;
Scroll_Distination := -1;
Item_Displayed := -1;
end;

procedure ClearPlayList;
begin
if Scroll_Distination <> Item_Displayed then
 ForceScrollForDelete;
ClearPlayListItems;
PlayingOrder := nil;
PlayingOrderItem := -1;
PlayingItem := -1;
ClearParams;
{$IFDEF WIN32GUI}
PLLbTime.Caption := '0:00';
RedrawPlaylist(0,0,False);
{$ENDIF WIN32GUI}
end;

{PlayList code end}

function FoundGTR:boolean;
var
 j,j1:integer;
 w,w2,adr:word;
 b:byte;
 wp:WordPtr;
begin
FoundGTR := False;
if Readen1 < 296 then exit;
adr := F_Frame.GTR_Address;
w := F_Frame.GTR_PatternsPointers[0].PatternA - adr;
if w > Readen1 then exit;
b := F_Frame.GTR_NumberOfPositions;
if w <> b + 295 then exit;
if F_Frame.GTR_LoopPosition >= b then exit;
for j := 0 to 13 do
 begin
  j1 := F_Frame.GTR_SamplesPointers[j + 1] -
          F_Frame.GTR_SamplesPointers[j];
  if j1 < 6 then exit;
  if (j1 - 2) mod 4 <> 0 then exit;
 end;

wp := @F_Frame.GTR_OrnamentsPointers[0];
w := wp^;
for j := 0 to 14 do
 begin
  inc(integer(wp),2);
  w2 := wp^;
  if w2 - w < 3 then exit;
  w := w2
 end;

inc(integer(wp),2);
w := wp^;
for j := 0 to 32*3 - 2 do
 begin
  inc(integer(wp),2);
  w2 := wp^;
  if w2 - w < 3 then exit;
  w := w2
 end;

wp := @F_Frame.GTR_SamplesPointers[0];

for j := 0 to 30 do
 begin
  w := wp^ - adr;
  if w >= Readen1 then exit;
  if F_Frame.Index[w] >=
     F_Frame.Index[w + 1] then exit;
  inc(integer(wp),2)
 end;

wp := @F_Frame.GTR_SamplesPointers[0];
for j := 0 to (15 + 16 + 32*3) - 1 do
 begin
  dec(wp^,adr);
  inc(integer(wp),2)
 end;
F_Frame.GTR_Address := 0;
F_Address := adr;
F_Length := F_Frame.GTR_OrnamentsPointers[15] + 3;
FoundGTR := True
end;

function FoundST:boolean;
var
 j,j1,j2:integer;
begin
FoundST := false;
if Readen1 < 6 then exit;
if F_Frame.ST_PositionsPointer > Readen1 then exit;
if Integer(F_Frame.ST_PatternsPointer -
                F_Frame.ST_OrnamentsPointer) <= 0 then exit;
if (F_Frame.ST_PatternsPointer -
         F_Frame.ST_OrnamentsPointer) mod $21 <> 0 then exit;
if Integer(F_Frame.ST_PositionsPointer -
                F_Frame.ST_OrnamentsPointer) >= 0 then exit;
if F_Frame.Index[F_Frame.ST_PositionsPointer] * 2 + 3 +
        F_Frame.ST_PositionsPointer - F_Frame.ST_OrnamentsPointer <> 0 then exit;

j := F_Frame.ST_OrnamentsPointer + $21;
if j > 65535 then exit;
if j > Readen1 then exit;
repeat
 dec(j);
 if F_Frame.Index[j] <> 0 then exit;
until j = F_Frame.ST_OrnamentsPointer;

j:=F_Frame.ST_PatternsPointer;
if j > Readen1 then exit;
j1 := 0; j2 := 0;
while (j + 6 <= Readen1) and (j + 6 < 65536) and (F_Frame.Index[j] <> 255) do
 begin
  inc(j);
  move(F_Frame.Index[j],j2,2);
  if j1 < j2 then j1 := j2;
  inc(j,2);
  move(F_Frame.Index[j],j2,2);
  if j1 < j2 then j1 := j2;
  inc(j,2);
  move(F_Frame.Index[j],j2,2);
  if j1 < j2 then j1 := j2;
  inc(j,2);
 end;
if F_Frame.Index[j] <> 255 then exit;
if j1 > Readen1 then exit;
if F_Frame.Index[j1 - 1] <> 255 then exit;

repeat
 if F_Frame.Index[j1] in [$83..$8e] then inc(j1);
 inc(j1);
until (j1 > 65535) or (j1 > Readen1) or (F_Frame.Index[j1] = 255);
if j1 > 65535 then exit;
if j1 > Readen1 then exit;

F_Length := j1 + 1;
//Frame.ST_Size := F_Length; //Agent-X used it for names
FoundST := True
end;

function FoundASC1:boolean;
var
 j,j1:integer;
 j3:byte;
begin
FoundASC1 := False;
if Readen1 < 9 then exit;
if not ((F_Frame.ASC1_PatternsPointers -
            F_Frame.ASC1_Number_Of_Positions) in [9,72]) then exit;
if F_Frame.ASC1_PatternsPointers > Readen1 then exit;
if F_Frame.ASC1_SamplesPointers > Readen1 then exit;
if F_Frame.ASC1_OrnamentsPointers > Readen1 then exit;

j := 0;
move(F_Frame.Index[F_Frame.ASC1_SamplesPointers],j,2);
if j <> $40 then exit;

move(F_Frame.Index[F_Frame.ASC1_OrnamentsPointers],j,2);
if j <> $40 then exit;

j3 := 0;
for j1 := 0 to Pred(F_Frame.ASC1_Number_Of_Positions) do
 if j3 < F_Frame.ASC1_Positions[j1] then
  j3 := F_Frame.ASC1_Positions[j1];

move(F_Frame.Index[F_Frame.ASC1_PatternsPointers],j,2);
if j <> (j3 + 1) * 6 then exit;

move(F_Frame.Index[F_Frame.ASC1_OrnamentsPointers + $40 - 2],j,2);
inc(j,F_Frame.ASC1_OrnamentsPointers);
while (j < Readen1) and (j < 65535) and (F_Frame.Index[j] and $40 = 0) do
 inc(j,2);
if j > 65534 then exit;
if j >= Readen1 then exit;

F_Length := j + 2;
FoundASC1 := True
end;

function FoundASC0:boolean;
var
 j,j1:integer;
 j3:byte;
begin
FoundASC0 := False;
if Readen1 < 9 then exit;
if F_Frame.ASC0_PatternsPointers - 8 -
       F_Frame.ASC0_Number_Of_Positions <> 0 then exit;
if F_Frame.ASC0_PatternsPointers > Readen1 then exit;
if F_Frame.ASC0_SamplesPointers > Readen1 then exit;
if F_Frame.ASC0_OrnamentsPointers > Readen1 then exit;

j := 0;
move(F_Frame.Index[F_Frame.ASC0_SamplesPointers],j,2);
if j <> $40 then exit;

move(F_Frame.Index[F_Frame.ASC0_OrnamentsPointers],j,2);
if j <> $40 then exit;

j3 := 0;
for j1 := 0 to Pred(F_Frame.ASC0_Number_Of_Positions) do
 if j3 < F_Frame.ASC0_Positions[j1] then j3 := F_Frame.ASC0_Positions[j1];

move(F_Frame.Index[F_Frame.ASC0_PatternsPointers],j,2);
if j <> (j3 + 1) * 6 then exit;

move(F_Frame.Index[F_Frame.ASC0_OrnamentsPointers + $40 - 2],j,2);
inc(j,F_Frame.ASC0_OrnamentsPointers);
while (j < Readen1) and (j < 65535) and (F_Frame.Index[j] and $40 = 0) do
 inc(j,2);
if j > 65534 then exit;
if j >= Readen1 then exit;

F_Length := j + 2;
FoundASC0 := True
end;

function FoundSTP:boolean;
var
 j,j1,j2,j3:integer;
 KsaId2:string;
begin
FoundSTP := False;
if Readen1 < 10 then exit;
if F_Frame.STP_PositionsPointer > Readen1 then exit;
if F_Frame.STP_PatternsPointer > Readen1 then exit;
if F_Frame.STP_OrnamentsPointer > Readen1 then exit;
if F_Frame.STP_SamplesPointer > Readen1 then exit;
if F_Frame.STP_SamplesPointer - F_Frame.STP_OrnamentsPointer <> $20 then exit;
if Integer(F_Frame.STP_OrnamentsPointer -
                F_Frame.STP_PatternsPointer) <= 0 then exit;
if (F_Frame.STP_OrnamentsPointer -
         F_Frame.STP_PatternsPointer) mod 6 <> 0 then exit;
if F_Frame.Index[F_Frame.STP_PositionsPointer] * 2 + 2 +
     F_Frame.STP_PositionsPointer - F_Frame.STP_PatternsPointer <> 0 then exit;
F_Length := F_Frame.STP_SamplesPointer + 30;
if F_Length > 65535 then exit;
if F_Length > Readen1 + 1 then exit;

j2 := 0;
j3 := F_Frame.STP_Init_Id;
if j3 = 0 then
 begin
  move(F_Frame.Index[F_Frame.STP_PatternsPointer],j2,2);
  SetLength(KsaId2,28);
  move(F_Frame.Index[10],KsaId2[1],28);
  if KsaId2 = KsaId then dec(j2,$a + 53) else dec(j2,$a);
  if j2 < 0 then exit;
  F_Address := j2;
  j3 := (F_Length - F_Frame.STP_PatternsPointer) div 2;
  for j1 := 0 to j3-1 do
   begin
    move(F_Frame.Index[F_Frame.STP_PatternsPointer + j1 * 2],j,2);
    dec(j,j2);
    move(j,F_Frame.Index[F_Frame.STP_PatternsPointer + j1 * 2],2);
   end;
 end;

j := 0;
move(F_Frame.Index[F_Frame.STP_OrnamentsPointer],j,2);
dec(j);
if Longword(j) <= Longword(Readen1 - 1) then
 begin
  move(F_Frame.Index[j],j,2);
  if j = 0 then
   begin
    F_Frame.STP_Init_Id := j3;
    FoundSTP := True;
    exit
   end
 end;

for j1 := 0 to j3 - 1 do
 begin
  move(F_Frame.Index[F_Frame.STP_PatternsPointer + j1 * 2],j,2);
  inc(j,j2);
  move(j,F_Frame.Index[F_Frame.STP_PatternsPointer + j1 * 2],2);
 end
end;

function FoundPT2:boolean;
var
 j,j1,j2:integer;
begin
FoundPT2 := False;
if Readen1 < 132 then exit;
if F_Frame.PT2_PatternsPointer > Readen1 then exit;
if F_Frame.Index[F_Frame.PT2_PatternsPointer-1] <> 255 then exit;
if F_Frame.PT2_SamplesPointers[0] <> 0 then exit;

j := 0;
move(F_Frame.Index[F_Frame.PT2_OrnamentsPointers[0]],j,3);
if j <> 1 then exit;

move(F_Frame.Index[F_Frame.PT2_PatternsPointer],j,2);
if j > Readen1 then exit;
if j - Integer(F_Frame.PT2_PatternsPointer) <= 0 then exit;
if (j - Integer(F_Frame.PT2_PatternsPointer)) mod 6 <> 2 then exit;

j1 := 0; j2 := 0;
while (j2 < 256) and (j2 <= Readen1 - 131)
 and (F_Frame.PT2_PositionList[j2] < 128) do
  begin
   if Longword(j1) < F_Frame.PT2_PositionList[j2] then
    j1 := F_Frame.PT2_PositionList[j2];
   inc(j2)
  end;
if (j - Integer(F_Frame.PT2_PatternsPointer)) div 6 <> j1 + 1 then exit;

j := 15;
while (j > 0) and (F_Frame.PT2_OrnamentsPointers[j] = 0) do dec(j);
F_Length := F_Frame.PT2_OrnamentsPointers[j] +
 F_Frame.Index[F_Frame.PT2_OrnamentsPointers[j]] + 2;
if F_Length > Readen1 + 1 then exit;

F_Frame.PT2_NumberOfPositions := j2;
FoundPT2 := True
end;

function FoundPT2F:boolean;
var
 j,j1,j2,j3:integer;
begin
FoundPT2F := False;
if Readen1 < 132 then exit;
if F_Frame.PT2_PatternsPointer > Readen1 then exit;
if F_Frame.Index[F_Frame.PT2_PatternsPointer-1] <> 255 then exit;
if F_Frame.PT2_SamplesPointers[0] = 0 then exit;
j3 := F_Frame.PT2_SamplesPointers[0];
if F_Frame.PT2_OrnamentsPointers[0] - j3 - 2 > Readen1 then exit;
if F_Frame.PT2_OrnamentsPointers[0]- j3 < 0 then exit;

j := 0;
move(F_Frame.Index[F_Frame.PT2_OrnamentsPointers[0]-j3],j,3);
if j <> 1 then exit;

move(F_Frame.Index[F_Frame.PT2_PatternsPointer],j,2);
dec(j,j3);
if j > Readen1 then exit;
if j - Integer(F_Frame.PT2_PatternsPointer) <= 0 then exit;
if (j - Integer(F_Frame.PT2_PatternsPointer)) mod 6 <>2 then exit;

j1 := 0; j2 := 0;
while (j2 < 256) and (j2 <= Readen1 - 131) and
(F_Frame.PT2_PositionList[j2] < 128) do
 begin
  if longword(j1) < F_Frame.PT2_PositionList[j2] then
   j1 := F_Frame.PT2_PositionList[j2];
  inc(j2)
 end;
if (j - Integer(F_Frame.PT2_PatternsPointer)) div 6 <> j1 + 1 then exit;

j := 15;
while (j > 0) and (F_Frame.PT2_OrnamentsPointers[j] = j3) do dec(j);
F_Length := F_Frame.PT2_OrnamentsPointers[j] - j3 +
  F_Frame.Index[F_Frame.PT2_OrnamentsPointers[j] - j3] + 2;
if F_Length > Readen1 + 1 then exit;

F_Frame.PT2_NumberOfPositions := j2;
for j := 0 to 31 do dec(F_Frame.PT2_SamplesPointers[j],j3);
for j := 0 to 15 do dec(F_Frame.PT2_OrnamentsPointers[j],j3);
for j2 := 0 to j1 * 3 + 2 do
 begin
  move(F_Frame.Index[F_Frame.PT2_PatternsPointer+j2*2],j,2);
  dec(j,j3);
  move(j,F_Frame.Index[F_Frame.PT2_PatternsPointer+j2*2],2);
 end;
F_Address := j3;
FoundPT2F := True
end;

function FoundPT3:boolean;
var
 j,j1,j2:integer;
begin
FoundPT3 := False;
if Readen1 < 202 then exit;
if F_Frame.PT3_PatternsPointer > Readen1 then exit;
if F_Frame.Index[F_Frame.PT3_PatternsPointer - 1] <> 255 then exit;
if F_Frame.PT3_OrnamentsPointers[0] + 2 > Readen1 then exit;

j := 0;
move(F_Frame.Index[F_Frame.PT3_OrnamentsPointers[0]],j,3);
if j <> 256 then exit;

move(F_Frame.Index[F_Frame.PT3_PatternsPointer],j,2);
if j > Readen1 then exit;
if j - Integer(F_Frame.PT3_PatternsPointer) <= 0 then exit;
if (j - Integer(F_Frame.PT3_PatternsPointer)) mod 6 <> 0 then exit; {to check this line !!!!}

j1 := 0; j2 := 0;
while (j2 < 256) and (j2 <= Readen1 - 201) and
      (F_Frame.PT3_PositionList[j2] <> 255) do
 begin
  if Longword(j1) < F_Frame.PT3_PositionList[j2] then
   j1 := F_Frame.PT3_PositionList[j2];
  if j1 mod 3 <> 0 then exit;
  inc(j2)
 end;
if (j - Integer(F_Frame.PT3_PatternsPointer)) div 6 <> j1 div 3 + 1 then exit;

j := 15;
while (j > 0) and (F_Frame.PT3_OrnamentsPointers[j] = 0) do dec(j);

F_Length := F_Frame.PT3_OrnamentsPointers[j] +
            F_Frame.Index[F_Frame.PT3_OrnamentsPointers[j] + 1] + 2;
if F_Length > Readen1 + 1 then exit;

F_Frame.PT3_NumberOfPositions := j2;
FoundPT3 := True
end;

function FoundPSC:boolean;
var
 j,j1:integer;
begin
FoundPSC := False;
if Readen1 < $4c + 2 then exit;
if F_Frame.PSC_OrnamentsPointer >= Readen1 then exit;
if F_Frame.PSC_OrnamentsPointer < $4c + 2 then exit;
if F_Frame.PSC_OrnamentsPointer > 64 + $4c then exit;
if F_Frame.PSC_OrnamentsPointer mod 2 <> 0 then exit;
if F_Frame.PSC_SamplesPointers[0] + $4c + 5 > 65534 then exit;
if F_Frame.PSC_SamplesPointers[0] + $4c + 5 > Readen1 then exit;

j := 0;
move(F_Frame.Index[F_Frame.PSC_OrnamentsPointer],j,2);
inc(j,F_Frame.PSC_OrnamentsPointer);
if j > 65535 then exit;
if j >= Readen1 then exit;

j1 := 0;
move(F_Frame.Index[F_Frame.PSC_OrnamentsPointer-2],j1,2);
inc(j1,$4c);
if j1 > 65535 then exit;
if j1 >= Readen1 then exit;
if j-j1 < 8 then exit;
if (j-j1) mod 6 <> 2 then exit;

j1 := F_Frame.PSC_SamplesPointers[0] + $4c + 4;
while (j1 < 65536) and (j1 <= readen1) and (F_Frame.Index[j1] and 32 <> 0) do
 inc(j1,6);
if j1 > 65534 then exit;
if j1 > readen1 then exit;

if F_Frame.PSC_OrnamentsPointer - $4c - 2 > 0 then
 begin
  if j1 + 3 <> F_Frame.PSC_SamplesPointers[1] + $4c then exit;
 end
else if j1 + 4 <> j then exit;

if F_Frame.PSC_PatternsPointer + 11 > 65535 then exit;
if F_Frame.PSC_PatternsPointer + 11 >= Readen1 then exit;

j := F_Frame.PSC_PatternsPointer + 1;
if F_Frame.Index[j] = 255 then exit;

repeat
 inc(j,8);
until (j > 65532) and (j+2 > Readen1) or (F_Frame.Index[j] = 255);
if j > 65532 then exit;
if j+2 > Readen1 then exit;

F_Length := j + 3;
FoundPSC := True
end;

function FoundFTC:boolean;
var
 j,j1,j2,j3,maxpat,address:integer;
 jj:^word;
begin
FoundFTC := false;
if Readen1 < $d4 + 3 then exit;
if F_Frame.FTC_PatternsPointer >= Readen1 then exit;
if F_Frame.FTC_OrnamentsPointers[0] <= F_Frame.FTC_SamplesPointers[0] then exit;

j1 := $d4;
maxpat := 0;
while (j1 <= readen1) and (j1 < $1d4) and (F_Frame.Index[j1] < 128) do
 begin
  if maxpat < F_Frame.Index[j1] then
   maxpat := F_Frame.Index[j1];
  inc(j1,2);
 end;
if j1 >= $1d4 then exit;
if j1 > readen1 then exit;
if F_Frame.FTC_PatternsPointer <= j1 then exit;
if F_Frame.FTC_Loop_Position >= (j1-$d4) div 2 then exit;

address := 0;
move(F_Frame.Index[F_Frame.FTC_PatternsPointer],address,2);
dec(address,(maxpat + 1) * 6 + F_Frame.FTC_PatternsPointer + 2);
if address < 0 then exit;
if F_Frame.FTC_SamplesPointers[0] - address >= Readen1 then exit;
if F_Frame.FTC_PatternsPointer >=
      F_Frame.FTC_SamplesPointers[0] - address then exit;
if F_Frame.FTC_OrnamentsPointers[0] - address >= Readen1 then exit;

j1 := 0;
j := 65535;
for j2 := 0 to 32 do
 begin
  if j > F_Frame.FTC_OrnamentsPointers[j2] then
   j := F_Frame.FTC_OrnamentsPointers[j2];
  if j1 < F_Frame.FTC_OrnamentsPointers[j2] then
   j1 := F_Frame.FTC_OrnamentsPointers[j2]
 end;
if j - address > 65535 then exit;
if j - address >= Readen1 then exit;
if j1 - address > 65533 then exit;
if j1 - address >= Readen1 then exit;

j3 := 0;
for j2 := 0 to 31 do
 begin
  if j3 < F_Frame.FTC_SamplesPointers[j2] then
   j3 := F_Frame.FTC_SamplesPointers[j2]
 end;
if j3 - address <= F_Frame.FTC_PatternsPointer then exit;
if j3 - address > 65533 then exit;
if j3 - address >= Readen1 then exit;
if j3 + 3 + (F_Frame.Index[j3 - address + 2] + 1) * 5 <> j then exit;
F_Length := j1 + 3 + (F_Frame.Index[j1 - address + 2] + 1) * 2 - address;
if F_Length > 65536 then exit;
if F_Length > Readen1 + 1 then exit;
if F_Length < F_Frame.FTC_PatternsPointer then exit;

for j2 := 0 to 32 do dec(F_Frame.FTC_OrnamentsPointers[j2],address);
for j2 := 0 to 31 do dec(F_Frame.FTC_SamplesPointers[j2],address);

jj := @F_Frame.Index[F_Frame.FTC_PatternsPointer];
for j2 := 1 to (maxpat + 1) * 3 do
 begin
  dec(jj^,address);
  inc(integer(jj),2);
 end;

F_Address := address;
FoundFTC := True
end;

function FoundSQT:boolean;
var
 j,j1,j2,j3:integer;
 pwrd:^word;
begin
FoundSQT := False;
if Readen1 < 17 then exit;
if F_Frame.SQT_SamplesPointer < 10 then exit;
if F_Frame.SQT_OrnamentsPointer <= F_Frame.SQT_SamplesPointer then exit;
if F_Frame.SQT_PatternsPointer < F_Frame.SQT_OrnamentsPointer then exit;
if F_Frame.SQT_PositionsPointer <= F_Frame.SQT_PatternsPointer then exit;
if F_Frame.SQT_LoopPointer < F_Frame.SQT_PositionsPointer then exit;

j := F_Frame.SQT_SamplesPointer - 10;
if F_Frame.SQT_LoopPointer - j >= Readen1 then exit;

j1 := F_Frame.SQT_PositionsPointer - j;
if F_Frame.Index[j1] = 0 then exit;
j2 := 0;
while F_Frame.Index[j1] <> 0 do
 begin
  if j1 + 7 >= Readen1 then exit;
  if j2 < F_Frame.Index[j1] and $7f then
   j2 := F_Frame.Index[j1] and $7f;
  inc(j1,2);
  if j2 < F_Frame.Index[j1] and $7f then
   j2 := F_Frame.Index[j1] and $7f;
  inc(j1,2);
  if j2 < F_Frame.Index[j1] and $7f then
   j2 := F_Frame.Index[j1] and $7f;
  inc(j1,3)
 end;

pwrd := @F_Frame.Index[F_Frame.SQT_SamplesPointer - j + 2];
if pwrd^ - F_Frame.SQT_PatternsPointer - 2 <> j2 * 2 then exit;

F_Length := j1 + 7;
pwrd := @F_Frame.Index[12];
j2 := pwrd^;
for j1 := 1 to (F_Frame.SQT_OrnamentsPointer -
                     F_Frame.SQT_SamplesPointer) div 2 do
 begin
  inc(integer(pwrd),2);
  j3 := pwrd^;
  if j3 - j2 <> $62 then exit;
  j2 := j3
 end;

for j1 := 1 to (F_Frame.SQT_PatternsPointer -
                         F_Frame.SQT_OrnamentsPointer) div 2 do
 begin
  inc(integer(pwrd),2);
  j3 := pwrd^;
  if j3 - j2 <> $22 then exit;
  j2 := j3
 end;

F_Frame.SQT_Size := F_Length;
FoundSQT := True
end;

function FoundPT1:boolean;
var
 j,j1,j2:integer;
begin
FoundPT1 := False;
if Readen1 < $66 then exit;
if F_Frame.PT1_PatternsPointer >= Readen1 then exit;

j := 0;
j1 := 65535;
for j2 := 0 to 15 do
 begin
  if j < F_Frame.PT1_SamplesPointers[j2] then
   j := F_Frame.PT1_SamplesPointers[j2];
  if (F_Frame.PT1_OrnamentsPointers[j2] <> 0)and
           (j1 > F_Frame.PT1_OrnamentsPointers[j2]) then
   j1 := F_Frame.PT1_OrnamentsPointers[j2]
 end;
if j1 < $67 then exit;
if j < $67 then exit;
if j > 65534 then exit;
if j > Readen1 then exit;
if j + F_Frame.Index[j] * 3 + 2 <> j1 then exit;

j:=0;
for j2 := 0 to 15 do
 if j < F_Frame.PT1_OrnamentsPointers[j2] then
  j := F_Frame.PT1_OrnamentsPointers[j2];
if j < $67 then exit;
F_Length:=j + 64;
if F_Length > 65536 then exit;
if F_Length > Readen1 + 1 then exit;

j := $63;
while (j <= F_Frame.PT1_PatternsPointer) and (F_Frame.Index[j] <> 255) do
 inc(j);
if j + 1 <> F_Frame.PT1_PatternsPointer then exit;

F_Frame.PT1_NumberOfPositions := j-$63;
FoundPT1 := True
end;

procedure LoadAYL;
const
 NumOfTokens = 21;
 MyTokens:array[0..NumOfTokens - 1] of string =
  ('ChipType','Channels','ChannelsAllocation','ChipFrequency',
   'PlayerFrequency','Offset','Length','Address','Loop','Time','Original',
   'Name','Author','Program','Computer','Date','Comment','Tracker','Type',
   'ams_andsix','FormatSpec');
 MaxTokenLen = 18;
var
 m3uf:TextFile;
 String1,String2:string;
 TokenError:boolean;
 i2,Vers:integer;

 procedure ExtractToken(S1:string;var S2:string;var Ind:integer);
 var
  i:integer;
 begin
  i := 1;
  S2 := '';
  while (i <= MaxTokenLen) and (i <= Length(S1)) and (S1[i] <> '=') do
   begin
    S2 := S2 + S1[i];
    inc(i)
   end;
  if i > Length(S1) then
   begin
    TokenError := True;
    exit
   end;
  Ind := 0;
  while (Ind < NumOfTokens) and (MyTokens[Ind] <> S2) do inc(Ind);
  if Ind = NumOfTokens then
   begin
    TokenError := True;
    exit
   end;
  S2 := '';
  for i := i + 1 to Length(S1) do S2 := S2 + S1[i];
 end;

 procedure ExtractChType(S1:string;var ChT:ChTypes);
 begin
  if S1 = 'AY' then ChT := AY_Chip
  else if S1 = 'YM' then ChT := YM_Chip
  else TokenError := True;
 end;

 procedure ExtractChans(S1:string;var Chs:integer);
 begin
  if S1 = 'Mono' then Chs := 1 else
  if S1 = 'Stereo' then Chs := 2 else TokenError := True;
 end;

 procedure ExtractChanMode(S1:string;var ChM:integer;
                                    var a1,a2,a3,a4,a5,a6:byte);
 var
  i,j,Temp:integer;
  S2:string;
  ai:array[0..5]of byte;
 begin
  if S1='Mono' then ChM:=0 else
  if S1='ABC' then ChM:=1 else
  if S1='ACB' then ChM:=2 else
  if S1='BAC' then ChM:=3 else
  if S1='BCA' then ChM:=4 else
  if S1='CAB' then ChM:=5 else
  if S1='CBA' then ChM:=6 else
   begin
    ChM := -2; i := 1; S1 := S1 + ',';
    for j := 0 to 5 do
     begin
      S2 := '';
      while (i <= length(S1)) and (S1[i] <> ',') do
       begin
        S2 := S2 + S1[i];
        inc(i)
       end;
      if i > length(S1) then
       begin
        TokenError := True;
        exit
       end;
      Val(S2,ai[j],Temp);
      if Temp <> 0 then
       begin
        TokenError := True;
        exit
       end;
      inc(i)
     end;
    a1 := ai[0];
    a2 := ai[1];
    a3 := ai[2];
    a4 := ai[3];
    a5 := ai[4];
    a6 := ai[5]
   end
 end;

 procedure ExtractInteger(S1:string;var Integ:integer);
 var
  Temp:integer;
 begin
  Val(S1,Integ,Temp);
  if Temp <> 0 then TokenError := True
 end;

 procedure ExtractFType(S1:string;var FT:TAvailableTypes);
 begin
  FT := MaxType;
  while (FT > Unknown)and(STypes[FT] <> S1) do dec(FT);
  if FT = Unknown then TokenError := True;
 end;

 function ConvertCR(s:string):string;
 var
  i,i0,j:integer;
 begin
  if Vers < 13 then
   begin
    Result := s;
    exit
   end;
  Result := '';
  i := 1;
  while i <= Length(s) do
   begin
    j := 0;
    i0 := i;
    while (i <= Length(s)) and (s[i] <> '\') do
     begin
      Inc(i);
      Inc(j)
     end;
    if j <> 0 then
     Result := Result + Copy(s,i0,j);
    if i >= Length(s) then break;
    if s[i + 1] = 'n' then
     begin
      s[i] := #13;
      s[i + 1] := #10
     end
    else
     begin
      Inc(i,2);
      Result := Result + s[i - 1]
     end
   end
 end;

var
 i:integer;
 PLItemWork:TPlayListItem;
 PLItem:PPlayListItem;
begin
 AssignFile(m3uf,AYLName);
 Reset(m3uf);
 try
 if not eof(m3uf) then
  begin
   Readln(m3uf,String1);
   if String1 = Version_String + '0' then
    Vers := 10
   else if String1 = Version_String + '1' then
    Vers := 11
   else if String1 = Version_String + '2' then
    Vers := 12
   else if String1 = Version_String + '3' then
    Vers := 13
   else
    Vers := 0;
   if Vers <> 0 then
    begin
     SetCurrentDirectory(PChar(ExtractFilePath(AYLName)));
     TokenError := False;
     if not eof(m3uf) then
      begin
       ReadLn(m3uf,String1);
       if String1 = '<' then
        while not eof(m3uf) do
         begin
          ReadLn(m3uf,String1);
          if String1 = '>' then
           begin
            if not eof(m3uf) then ReadLn(m3uf,String1)
            else TokenError := True;
            break
           end;
          if String1 <> '' then
           begin
            ExtractToken(String1,String2,i2);
            if TokenError then break;
            case i2 of
            0:   ExtractChType(String2,PLDef_Chip_Type);
            1:   ExtractChans(String2,PLDef_Number_Of_Channels);
            2:   ExtractChanMode(String2,PLDef_Channel_Mode,PLDef_AL,PLDef_AR,
                                 PLDef_BL,PLDef_BR,PLDef_CL,PLDef_CR);
            3:   ExtractInteger(String2,PLDef_SoundChip_Frq);
            4:   begin
                  ExtractInteger(String2,PLDef_Player_Frq);
                  if (Vers = 10) and not TokenError then
                   PLDef_Player_Frq := PLDef_Player_Frq * 1000;
                 end
            else
             TokenError := True
            end;
            if TokenError then break;
           end;
         end;

       while not TokenError do
        begin
         if eof(m3uf) then
          begin
           String2 := '';
           TokenError := True
          end
         else
          ReadLn(m3uf,String2);
         if String2 <> '<' then
          begin
           if FileExists(String1) then
            Add_Songs_From_File(ExpandFileName(String1),True);
           String1 := String2
          end
         else if FileExists(String1) then
          begin
           with PLItemWork do
            begin
             FileName := ExpandFileName(String1);
             FileType := Unknown;
             Chip_Type := No_Chip;
             Number_Of_Channels := 0;
             Channel_Mode := -1;
             AY_Freq := -1;
             Int_Freq := -1;
             Offset := 0;
             Length := -1;
             Address := 0;
             Loop := -1;
             Time := 0;
             UnpackedSize := 0;
             Title := '';
             Author := '';
             Programm := '';
             Computer := '';
             Date := '';
             Comment := '';
             Tracker := '';
             Error := FileNoError;
             FormatSpec := -1;
             Selected := False;
             while not eof(m3uf) do
              begin
               ReadLn(m3uf,String1);
               if String1 = '>' then
                begin
                 if FileType = Unknown then
                  begin
                   String1 := AnsiUpperCase(ExtractFileExt(FileName));
                   if System.Length(String1) <> 0 then String1[1] := ' ';
                   String1 := Trim(String1);
                   ExtractFType(String1,FileType);
                  end;
                 break
                end;
               ExtractToken(String1,String2,i2);
               if TokenError then break;
               case i2 of
               0:   ExtractChType(String2,Chip_Type);
               1:   ExtractChans(String2,Number_Of_Channels);
               2:   ExtractChanMode(String2,Channel_Mode,AL,AR,
                                    BL,BR,CL,CR);
               3:   ExtractInteger(String2,Ay_Freq);
               4:   begin
                     ExtractInteger(String2,Int_Freq);
                     if (Vers = 10) and not TokenError then
                      Int_Freq := Int_Freq * 1000;
                    end;
               5:   ExtractInteger(String2,Offset);
               6:   ExtractInteger(String2,Length);
               7:   ExtractInteger(String2,Address);
               8:   ExtractInteger(String2,Loop);
               9:   ExtractInteger(String2,Time);
               10:  ExtractInteger(String2,UnpackedSize);
               11:  Title := String2;
               12:  Author := String2;
               13:  Programm := String2;
               14:  Computer := String2;
               15:  Date := String2;
               16:  Comment := ConvertCR(String2);
               17:  Tracker := String2;
               18:  ExtractFType(String2,FileType);
               19,20:  ExtractInteger(String2,FormatSpec)
               end
              end
            end;
           if not TokenError then
            begin
             if (PLItemWork.FileType in [YM2File..YM6File]) and
                (PLItemWork.UnpackedSize = 0) then
              begin
               i := Length(PlaylistItems);
               Add_Songs_From_File(PLItemWork.FileName,False);
               if i <> Length(PlaylistItems) - 1 then exit;
               with PlaylistItems[i]^ do
                begin
                 PLItemWork.Offset := Offset;
                 PLItemWork.FileType := FileType;
                 PLItemWork.Length := Length;
                 PLItemWork.UnpackedSize := UnpackedSize;
                 PLItemWork.FormatSpec := FormatSpec
                end
              end
             else
              i := AddPlaylistItem(PLItem);
             PlaylistItems[i]^ := PLItemWork;
{$IFDEF WIN32GUI}
             RedrawItem(0,i);
{$ENDIF WIN32GUI}
             if not eof(m3uf) then Readln(m3uf,String1) else TokenError := True
            end
          end
         else
          begin
           while not eof(m3uf) and (String2 <> '>') do Readln(m3uf,String2);
           if not eof(m3uf) then Readln(m3uf,String1) else TokenError := True
          end
        end
      end
    end
  end
 finally
  CloseFile(m3uf);
  ReprepareScroll
 end 
end;

procedure SaveAYL(AYLName:string);
Const
 NChan:array[1..2] of array [0..6] of char=
       ('Mono','Stereo');
 ChanAl:array[0..6] of array [0..4] of char=
       ('Mono','ABC','ACB','BAC','BCA','CAB','CBA');
 ChipT:array[AY_Chip..YM_Chip] of array [0..1] of char=
       ('AY','YM');
var
 m3uf:TextFile;
 flag:boolean;

 procedure AddBr;
 begin
  if not Flag then
   begin
    Writeln(m3uf,'<');
    Flag := True
   end;
 end;

 procedure WriteParam(s:string);
 begin
  AddBr;
  Write(m3uf,s)
 end;

 procedure WritelnParam(s:string);
 begin
  AddBr;
  Writeln(m3uf,s)
 end;

 function ConvCR(s:string):string;
 var
  i,i0,j:integer;
 begin
  Result := '';
  i := 1;
  while i <= Length(s) do
   begin
    j := 0;
    i0 := i;
    while (i <= Length(s)) and not (s[i] in ['\',#13]) do
     begin
      Inc(i);
      Inc(j)
     end;
    if j <> 0 then
     Result := Result + Copy(s,i0,j);
    if i > Length(s) then break;
    if s[i] = '\' then
     begin
      Result := Result + '\\';
      Inc(i)
     end
    else
     begin
      if i = Length(s) then break;
      Result := Result + '\n';
      Inc(i,2)
     end
   end
 end;

var
 i:integer;
 FName:string;
begin
AssignFile(m3uf,AYLName);
Rewrite(m3uf);
try
 Writeln(m3uf,Version_String + '3');
 flag := False;
 if PLDef_Number_Of_Channels > 0 then
  WritelnParam('Channels=' + NChan[PLDef_Number_Of_Channels]);
 if PLDef_Channel_Mode <> -1 then
  begin
   WriteParam('ChannelsAllocation=');
   if PLDef_Channel_Mode >= 0 then
    Writeln(m3uf,ChanAl[PLDef_Channel_Mode])
   else
    Writeln(m3uf,Int2Str(PLDef_AL) + ',' + Int2Str(PLDef_AR) + ','
               + Int2Str(PLDef_BL) + ',' + Int2Str(PLDef_BR) + ','
               + Int2Str(PLDef_CL) + ',' + Int2Str(PLDef_CR))
  end;
 if PLDef_SoundChip_Frq >= 0 then
  WritelnParam('ChipFrequency=' + Int2Str(PLDef_SoundChip_Frq));
 if PLDef_Player_Frq >= 0 then
  WritelnParam('PlayerFrequency=' + Int2Str(PLDef_Player_Frq));
 if PLDef_Chip_Type <> No_Chip then
  WritelnParam('ChipType=' + ChipT[PLDef_Chip_Type]);
 if flag then
  begin
   Writeln(m3uf,'>');
   flag := False
  end;
 for i := 0 to Length(PlaylistItems) - 1 do
  with PlaylistItems[i]^ do
   if FileType <> Unknown then
    begin
     Writeln(m3uf,FileName);
     if (Number_Of_Channels <> PLDef_Number_Of_Channels) and
        (Number_Of_Channels > 0) then
      WritelnParam('Channels=' + NChan[Number_Of_Channels]);
     if (Channel_Mode <> PLDef_Channel_Mode) and
        (Channel_Mode <> -1) then
      begin
       WriteParam('ChannelsAllocation=');
       if Channel_Mode >= 0 then
        Writeln(m3uf,ChanAl[Channel_Mode])
       else
        Writeln(m3uf,Int2Str(AL) + ',' + Int2Str(AR) + ','
                   + Int2Str(BL) + ',' + Int2Str(BR) + ','
                   + Int2Str(CL) + ',' + Int2Str(CR));
      end;
     if ((AY_Freq <> PLDef_SoundChip_Frq) and (AY_Freq >= 0)) then
      WritelnParam('ChipFrequency=' + Int2Str(AY_Freq));
     if ((Int_Freq <> PLDef_Player_Frq) and (Int_Freq >= 0)) then
      WritelnParam('PlayerFrequency=' + Int2Str(Int_Freq));
     if (Chip_Type <> PLDef_Chip_Type) and (Chip_Type <> No_Chip) then
      WritelnParam('ChipType=' + ChipT[Chip_Type]);
     if Author <> '' then
      WritelnParam('Author=' + Author);
     if Title <> '' then
      WritelnParam('Name=' + Title);
     if Programm <> '' then
      WritelnParam('Program=' + Programm);
     if Tracker <> '' then
      WritelnParam('Tracker=' + Tracker);
     if Computer <> '' then
      WritelnParam('Computer=' + Computer);
     if Date <> '' then
      WritelnParam('Date=' + Date);
     if Comment <> '' then
      WritelnParam('Comment=' + ConvCR(Comment));
     FName := UpperCase(ExtractFileExt(FileName));
     if (FName <> SExts[FileType]) or
        (FileType in [EPSGFile,YM2File..YM6File]) then
      WritelnParam('Type=' + STypes[FileType]);
     if (Address <> 0) and (FileType <> FXMFile) then
      WritelnParam('Address=' + Int2Str(Address));
     if (FName <> SExts[FileType]) or (FileType in [VTXFile..YM6File]) then
      WritelnParam('Length=' + Int2Str(Length));
     if FileType in [VTXFile..YM6File] then
      WritelnParam('Original=' + Int2Str(UnpackedSize));
     if Offset <> 0 then
      WritelnParam('Offset=' + Int2Str(Offset));
     if Time <> 0 then
      WritelnParam('Time=' + Int2Str(Time));
     if Loop >= 0 then
      WritelnParam('Loop=' + Int2Str(Loop));
     if ((FileType = FXMFile) and (FormatSpec <> 31)) or
        ((FormatSpec <> -1) and
         (FileType in [YM5File,YM6File,EPSGFile,AYMFile,CDAFile])) then
      WritelnParam('FormatSpec=' + Int2Str(FormatSpec));
     if flag then
      begin
       if FileType = FXMFile then
        Writeln(m3uf,'Address=' + Int2Str(Address));
       Writeln(m3uf,'>');
       flag := False
      end
    end
finally
 CloseFile(m3uf)
end
end;

procedure Add_Files;
var
 Index:integer;
begin
for Index := 0 to Length(SF^) - 1 do
 Add_File(SF^[Index],True);
end;

procedure Add_File;
var
 m3uf:TextFile;
 String1,Ext:string;
begin
if FileExists(FN) then
 begin
  Ext := LowerCase(ExtractFileExt(FN));
  if Ext = '.ayl' then
   LoadAYL(FN)
  else if Ext = '.m3u' then
   begin
    SetCurrentDirectory(PChar(ExtractFilePath(FN)));
    AssignFile(m3uf,FN);
    Reset(m3uf);
    while not eof(m3uf) do
     begin
      ReadLn(m3uf,String1);
      if FileExists(String1) then
       Add_Songs_From_File(ExpandFileName(String1),True)
     end;
     CloseFile(m3uf);
   end
  else
   Add_Songs_From_File(FN,Detect)
 end
end;

procedure Add_Songs_From_File(File_Name:string;Detect:boolean);
var
 Zag:array[0..3]of char;
 LHZag:array[0..4] of char;
 F_Offset:integer;
 FType:TAvailableTypes;
 F_Buffer:array[0..65536*2-1]of byte;
 F_Index,FilSiz{,F_Point}:integer;
// Start_Time:dword;
 SFileExt,SFileName,SFilePath:string;
 PLItem:PPlayListItem;
 Loaded:boolean;
 URHandle:integer;

 procedure Init_Detector;
 begin
  Loaded := True;
  Seek(UniReadersData[URHandle].UniFile,0);
  F_Offset := -1;
  F_Index := 65535;
  FilSiz := UniReadersData[URHandle].UniFileSize - 1;
//  PrgBox := False;
  BlockRead(UniReadersData[URHandle].UniFile,F_Buffer[65536],65536,Readen1);
//  May_Quit := False;
//  F_Point := 1024;
//  Start_Time := GetTickCount
 end;

 function Module_Detector:boolean;
 var
  Readen2:integer;
 begin
  Module_Detector := False;
  repeat
   inc(F_Offset);
   inc(F_Index);
   dec(Readen1);
   if F_Offset >= FilSiz then
    begin
//    if PrgBox then Form4.Free;
    exit
    end;
   if F_Index >= 65536 then
    begin
     move(F_Buffer[65536],F_Buffer,65536);
     dec(F_Index,65536);
     BlockRead(UniReadersData[URHandle].UniFile,F_Buffer[65536],65536,Readen2);
     inc(Readen1,Readen2);
    end;
   Integer(F_Frame) := integer(@F_Buffer) + F_Index;
   if FoundST then
    begin
     Module_Detector := True;
     FType := STCFile;
     exit
    end
   else if FoundASC1 then
    begin
     Module_Detector := True;
     FType := ASCFile;
     exit
    end
   else if FoundASC0 then
    begin
     Module_Detector := True;
     FType := ASC0File;
     exit
    end
   else if FoundSTP then
    begin
     Module_Detector := True;
     FType := STPFile;
     exit
    end
   else if FoundPT2 then
    begin
     Module_Detector := True;
     FType := PT2File;
     exit
    end
   else if FoundPT2F then
    begin
     Module_Detector := True;
     FType := PT2File;
     exit
    end
   else if FoundPT3 then
    begin
     Module_Detector := True;
     FType := PT3File;
     exit
    end
   else if FoundPSC then
    begin
     Module_Detector := True;
     FType := PSCFile;
     exit
    end
   else if FoundFTC then
    begin
     Module_Detector := True;
     FType := FTCFile;
     exit
    end
   else if FoundPT1 then
    begin
     Module_Detector := True;
     FType := PT1File;
     exit
    end
   else if FoundGTR then
    begin
     Module_Detector := True;
     FType := GTRFile;
     exit
    end
   else if FoundSQT then
    begin
     Module_Detector := True;
     FType := SQTFile;
     exit
    end;
{   if F_Offset > F_Point then
    begin
     if not PrgBox then
     if GetTickCount - Start_Time > 2000 then
     begin
     Form4:=TForm4.Create(Form1);
     PrgBox:=true;
     if not Russian_Interface then
     begin
      Form4.Caption:='Searching for tunes';
      Form4.Button1.Caption:='Cancel';
    end;
    Form4.ProgressBar1.Max:=FilSiz+1;
      end;
     if PrgBox then Form4.ProgressBar1.Position:=F_Offset+1;
      NewMessageSkipper;
     F_Point := F_Offset + 1024
    end;}
  until {May_Quit or }(F_Offset >= FilSiz);
//  if PrgBox then Form4.Free;
 end;

procedure OpenAYMFile;
var
 i,j:integer;
 AYMFileHeader:TAYMFileHeader;
begin
UniRead(URHandle,@AYMFileHeader,SizeOf(AYMFileHeader));
if AYMFileHeader.AYM <> 'AYM' then exit;
if AYMFileHeader.Rev <> '0' then exit;
for j := 0 to AYMFileHeader.MusMax - AYMFileHeader.MusMin do
 begin
  i := AddPlayListItem(PLItem);
  with PLItem^ do
   begin
     Author := Trim(AYMFileHeader.Author);
     Title := Trim(AYMFileHeader.Name);
     Programm := '';
     Tracker := '';
     Comment := '';
     Date := '';
     FileName := File_Name;
     FormatSpec := j;
     Address := 0;
     Offset := 0;
     Length := 0;
     FileType := AYMFile;
     UnpackedSize := 0;
     Loop := 0;
     Ay_Freq := -1;
     Int_Freq := -1;
     Channel_Mode := -1;
     Chip_Type := No_Chip;
     Number_Of_Channels := 0;
     Time := 15000;
     Error := FileNoError;
     Selected := False
   end;
{$IFDEF WIN32GUI}
  RedrawItem(0,i);
{$ENDIF WIN32GUI}
 end
end;

procedure OpenAYFile;
var
 i,j,CurPos:integer;
 Ch:char;
 Byt:byte;
 Wrd:word;
 AuthorString,MiscString,SongName:string;
 AYFileHeader:TAYFileHeader;
 SongStructure:TSongStructure;
begin
UniRead(URHandle,@AYFileHeader,SizeOf(AYFileHeader));
if AYFileHeader.FileID <> $5941585A then exit;
if (AYFileHeader.TypeID <> $4C554D45) and
   (AYFileHeader.TypeID <> $44414D41) then exit;

UniFileSeek(URHandle,SmallInt(IntelWord(AYFileHeader.PAuthor)) + 12);
AuthorString := '';
repeat
 UniRead(URHandle,@Ch,1);
 if Ch <> #0 then AuthorString := AuthorString + Ch;
until Ch = #0;
AuthorString := Trim(AuthorString);

UniFileSeek(URHandle,SmallInt(IntelWord(AYFileHeader.PMisc)) + 14);
MiscString := '';
repeat
 UniRead(URHandle,@Ch,1);
 if Ch <> #0 then MiscString := MiscString + Ch;
until Ch = #0;
MiscString := Trim(MiscString);

UniFileSeek(URHandle,SmallInt(IntelWord(AYFileHeader.PSongsStructure)) + 18);
for j := 0 to AYFileHeader.NumOfSongs do
 begin
  UniRead(URHandle,@SongStructure,4);
  CurPos := UniReadersData[URHandle].UniFilePos;

  UniFileSeek(URHandle,SmallInt(IntelWord(SongStructure.PSongName)) + CurPos - 4);
  SongName := '';
  repeat
   UniRead(URHandle,@Ch,1);
   if Ch <> #0 then SongName := SongName + Ch;
  until Ch = #0;
  SongName := Trim(SongName);
  i := AddPlayListItem(PLItem);
  with PLItem^ do
   begin
     Author := AuthorString;
     Title := SongName;
     Programm := '';
     Tracker := '';
     Comment := MiscString;
     Date := '';
     FileName := File_Name;
     if AYFileHeader.TypeID = $4C554D45 then
      begin
       Offset := SmallInt(IntelWord(SongStructure.PSongData)) + CurPos - 2;
       Address := 0;
       FileType := AYFile;
       UniFileSeek(URHandle,SmallInt(IntelWord(SongStructure.PSongData)) + CurPos + 2);
       UniRead(URHandle,@Wrd,2);
       if Wrd <> 0 then
        Time := IntelWord(Wrd)
       else
        Time := 15000
      end
     else
      begin
       Offset := SmallInt(IntelWord(SongStructure.PSongData)) + CurPos - 2;
       UniFileSeek(URHandle,Offset);
       UniRead(URHandle,@Wrd,2);
       Address := IntelWord(Wrd);
       UniRead(URHandle,@Byt,1);
       FormatSpec := Byt;
       UniRead(URHandle,@Byt,1);
       UniRead(URHandle,@Wrd,2);
       Time := Byt * IntelWord(Wrd);
       inc(Offset,14 - 6);
       FileType := FXMFile
      end;
     Length := 0;
     UnpackedSize := 0;
     Loop := 0;
     Ay_Freq := -1;
     Int_Freq := -1;
     Channel_Mode := -1;
     Chip_Type := No_Chip;
     Number_Of_Channels := 0;
     Error := FileNoError;
     Selected := False
   end;
{$IFDEF WIN32GUI}
  RedrawItem(0,i);
{$ENDIF WIN32GUI}
  UniFileSeek(URHandle,CurPos)
 end
end;

 procedure Add(FType:TAvailableTypes);
 var
  i,j,k:integer;
  KsaId2:string;
  Song_Name,Song_Author,PrgName,TrackName,CompName,DateStr,ComStr:string;
  Looping_VBL,TimLen:integer;
  ChipFrq,PlrFrq,ChanMode:integer;
  ChType:ChTypes;
  Ster:integer;
  Ch:char;
  Wrd:word;
  DWrd:dword;
  FormSpec:integer;
  orisize:integer;
  VTXFileHeader:TVTXFileHeader;
  LZHFileHeader:TLZHFileHeader;
  YM5FileHeader:TYM5FileHeader;
 begin
  orisize := 0;
  Song_Name := '';Song_Author := '';
  PrgName := '';TrackName := '';CompName := '';
  DateStr := '';ComStr := '';
  Looping_VBL := -1;
  TimLen := 0;
  ChipFrq := -1;
  PlrFrq := -1;
  ChanMode := -1;
  ChType := No_Chip;
  Ster := 0;
  FormSpec := -1;

  case FType of
  STCFile:  begin
             SetLength(KsaId2,20);
             if not Loaded then
              begin
               UniFileSeek(URHandle,7);
               UniRead(URHandle,@KsaId2[1],20)
              end
             else
              Move(F_Frame.ST_Name,KsaId2[1],20);
             Song_Name := Copy(KsaId2,1,18);
             if (Song_Name='SONG BY ST COMPILE') or
                (Song_Name='SONG BY MB COMPILE') or
                (Song_Name='SONG BY ST-COMPILE') or
                (Song_Name='SOUND TRACKER v1.1') or
                (Song_Name='S.T.FULL EDITION  ') or
                (Song_Name='SOUND TRACKER v1.3') then
              Song_Name := ''
             else
              begin
               Wrd := WordPtr(@KsaId2[19])^;
               if Wrd <> F_Length then
                if KsaId2[19] in [' '..#127] then
                 begin
                  Song_Name := Song_Name + KsaId2[19];
                  if KsaId2[20] in [' '..#127] then
                   Song_Name := Song_Name + KsaId2[20]
                 end
              end
            end;
  GTRFIle:  begin
             SetLength(Song_Name,32);
             if not Loaded then
              begin
               UniFileSeek(URHandle,7);
               UniRead(URHandle,@Song_Name[1],32)
              end
             else
              Move(F_Frame.GTR_Name,Song_Name[1],32)
            end;
  PSCFile:  begin
             SetLength(Song_Name,20);
             SetLength(Song_Author,20);
             if not Loaded then
              begin
               UniFileSeek(URHandle,$19);
               UniRead(URHandle,@Song_Name[1],20);
               UniFileSeek(URHandle,$31);
               UniRead(URHandle,@Song_Author[1],20);
              end
             else
              begin
               Move(F_Frame.PSC_MusicName[$19],Song_Name[1],20);
               Move(F_Frame.PSC_MusicName[$31],Song_Author[1],20);
              end
            end;
  FTCFile:  begin
             SetLength(Song_Name,42);
             if not Loaded then
              begin
               UniFileSeek(URHandle,8);
               UniRead(URHandle,@Song_Name[1],42)
              end
             else
              Move(F_Frame.FTC_MusicName[8],Song_Name[1],42)
            end;
  PT1File:  begin
             SetLength(Song_Name,30);
             if not Loaded then
              begin
               UniFileSeek(URHandle,69);
               UniRead(URHandle,@Song_Name[1],30)
              end
             else
              Move(F_Frame.PT1_MusicName,Song_Name[1],30)
            end;
  PT2File:  begin
             SetLength(Song_Name,30);
             if not Loaded then
              begin
               UniFileSeek(URHandle,101);
               UniRead(URHandle,@Song_Name[1],30)
              end
             else
              Move(F_Frame.PT2_MusicName,Song_Name[1],30)
            end;
  PT3File:  begin
             SetLength(Song_Name,32);
             SetLength(Song_Author,32);
             if not Loaded then
              begin
               UniFileSeek(URHandle,$1E);
               UniRead(URHandle,@Song_Name[1],32);
               UniFileSeek(URHandle,$42);
               UniRead(URHandle,@Song_Author[1],32);
              end
             else
              begin
               Move(F_Frame.PT3_MusicName[$1E],Song_Name[1],32);
               Move(F_Frame.PT3_MusicName[$42],Song_Author[1],32);
              end
            end;
  ASCFile:  begin
             if not Loaded then
              begin
               UniFileSeek(URHandle,2);
               UniRead(URHandle,@F_Frame.ASC1_PatternsPointers,2);
               UniFileSeek(URHandle,8);
               UniRead(URHandle,@F_Frame.ASC1_Number_Of_Positions,1);
              end;
             if F_Frame.ASC1_PatternsPointers -
                          F_Frame.ASC1_Number_Of_Positions = 72 then
              begin
               SetLength(Song_Name,20);
               SetLength(Song_Author,20);
               if not Loaded then
                begin
                 UniFileSeek(URHandle,F_Frame.ASC1_PatternsPointers - 44);
                 UniRead(URHandle,@Song_Name[1],20);
                 UniFileSeek(URHandle,F_Frame.ASC1_PatternsPointers - 20);
                 UniRead(URHandle,@Song_Author[1],20);
                end
               else
                begin
                 Move(F_Frame.Index[F_Frame.ASC1_PatternsPointers - 44],
                        Song_Name[1],20);
                 Move(F_Frame.Index[F_Frame.ASC1_PatternsPointers - 20],
                        Song_Author[1],20);
                end
              end
            end;
  STPFile:  begin
             SetLength(KsaId2,28);
             if not Loaded then
              begin
               UniFileSeek(URHandle,10);
               UniRead(URHandle,@KsaId2[1],28)
              end
             else
              Move(F_Frame.Index[10],KsaId2[1],28);
             if KsaId2 = KsaId then
              begin
               SetLength(Song_Name,25);
               if not Loaded then
                UniRead(URHandle,@Song_Name[1],25)
               else
                Move(F_Frame.Index[38],Song_Name[1],25)
              end
            end;
  VTXFile:  begin
             UniFileSeek(URHandle,0);
             UniRead(URHandle,@VTXFileHeader,2);
             if (VTXFileHeader.Id <> $5941)and
                (VTXFileHeader.Id <> $4d59)and
                (VTXFileHeader.Id <> $7961)and
                (VTXFileHeader.Id <> $6d79) then exit;
             if (VTXFileHeader.Id = $5941) or (VTXFileHeader.Id = $4d59) then
              begin
               UniRead(URHandle,@VTXFileHeader.Mode,8);
               UniRead(URHandle,@VTXFileHeader.UnpackSize,4);
              end
             else
              UniRead(URHandle,@VTXFileHeader.Mode,sizeof(VTXFileHeader) - 2);
             Looping_VBL := VTXFileHeader.Loop;
             PlrFrq := VTXFileHeader.InterFrq * 1000;
             ChipFrq := VTXFileHeader.ChipFrq;
             ChanMode := VTXFileHeader.Mode and 7;
             orisize := VTXFileHeader.UnpackSize;
             TimLen := VTXFileHeader.UnpackSize div 14;
             if VTXFileHeader.Mode = 0 then Ster := 1 else Ster := 2;
             if (VTXFileHeader.Id = $7961) or (VTXFileHeader.Id = $5941) then
              ChType := AY_Chip
             else
              ChType := YM_Chip;
             repeat
              UniRead(URHandle,@Ch,1);
              if Ch <> #0 then Song_Name := Song_Name + Ch
             until Ch = #0;
             repeat
              UniRead(URHandle,@Ch,1);
              if Ch <> #0 then Song_Author := Song_Author + Ch
             until Ch = #0;
             if (VTXFileHeader.Id = $7961) or (VTXFileHeader.Id = $6d79) then
              begin
               if VTXFileHeader.Year <> 0 then
                DateStr := Int2Str(VTXFileHeader.Year);
               repeat
                UniRead(URHandle,@Ch,1);
                if Ch <> #0 then PrgName := PrgName + Ch
               until Ch = #0;
               repeat
                UniRead(URHandle,@Ch,1);
                if Ch <> #0 then TrackName := TrackName + Ch
               until Ch = #0;
               repeat
                UniRead(URHandle,@Ch,1);
                if Ch <> #0 then ComStr := ComStr + Ch
               until Ch = #0
              end;
             F_Offset := UniReadersData[URHandle].UniFilePos;
             F_Length := UniReadersData[URHandle].UniFileSize - F_Offset
            end;
  YM3File:  begin
             UniFileSeek(URHandle,0);
             UniRead(URHandle,@LZHFileHeader,15);
             if LZHFileHeader.Method = '-lh5-' then
              begin
               orisize := LZHFileHeader.UCompSize;
               Original_Size := orisize;
               F_Length := LZHFileHeader.CompSize;
               Compressed_Size := F_Length;
               F_Offset := LZHFileHeader.HSize + 2;
               UniFileSeek(URHandle,F_Offset);
               UniAddDepacker(URHandle,UDLZH)
              end
             else
              begin
               orisize := UniReadersData[URHandle].UniFileSize;
               F_Offset := 0;
               UniFileSeek(URHandle,0)
              end;
             UniRead(URHandle,@YM5FileHeader,4);
             case YM5FileHeader.Id of
             $62334d59:
               begin
                FType := YM3bFile;
                TimLen := (orisize - 8) div 14;
               end;
             $21334d59,
             $21324d59:
               begin
                if YM5FileHeader.Id = $21324d59 then
                 FType := YM2File;
                TimLen := (orisize - 4) div 14;
                Looping_VBL := 0;
               end;
             $21354d59,
             $21364d59:
               begin
                if YM5FileHeader.Id = $21354d59 then
                 FType := YM5File
                else
                 FType := YM6File;
                UniRead(URHandle,@YM5FileHeader.Leo,sizeof(TYM5FileHeader) - 4);
                TimLen := IntelDWord(YM5FileHeader.Num_of_tiks);
                ChipFrq := IntelDWord(YM5FileHeader.ChipFrq);
                PlrFrq := IntelWord(YM5FileHeader.InterFrq) * 1000;
                Looping_VBL := IntelDWord(YM5FileHeader.Loop);
                k := IntelWord(YM5FileHeader.Add_Size);
                for i := 0 to k - 1 do
                 UniRead(URHandle,@DWrd,1);
                for i := 0 to IntelWord(YM5FileHeader.Num_of_Dig) - 1 do
                 begin
                  UniRead(URHandle,@DWrd,4);
                  DWrd := IntelDWord(DWrd);
                  inc(k,4 + DWrd);
                  for j := 0 to DWrd - 1 do
                   UniRead(URHandle,@DWrd,1)
                 end;
                repeat
                 inc(k);
                 UniRead(URHandle,@Ch,1);
                 if Ch <> #0 then Song_Name := Song_Name + Ch
                until Ch = #0;
                repeat
                 inc(k);
                 UniRead(URHandle,@Ch,1);
                 if Ch <> #0 then Song_Author := Song_Author + Ch
                until Ch = #0;
                repeat
                 inc(k);
                 UniRead(URHandle,@Ch,1);
                 if Ch <> #0 then ComStr := ComStr + Ch
                until Ch = #0;
                FormSpec := k + 34
               end
             else exit
             end
            end;
  PSGFile:  begin
             UniFileSeek(URHandle,0);
             UniRead(URHandle,@zag,4);
             if zag = 'PSG'#26 then
              begin
               UniRead(URHandle,@zag,2);
               if byte(zag[0]) > 10 then exit;
               if byte(zag[0]) = 10 then
                PlrFrq := byte(zag[1]) * 1000
              end
             else if zag = 'EPSG' then
              begin
               UniRead(URHandle,@zag,2);
               if (zag[0] <> #26) then exit;
               case zag[1] of
               #0:  FormSpec := 70908;
               #1:  FormSpec := 71680;
               #255:UniRead(URHandle,@FormSpec,4)
               else exit
               end;
               FType := EPSGFile
              end
            end;
  FXMFile:  begin
             UniFileSeek(URHandle,4);
             UniRead(URHandle,@Wrd,2);
             F_Address := Wrd;
             FormSpec := 31
            end
  end;
  i := AddPlayListItem(PLItem);
  Song_Author := Trim(Song_Author);
  Song_Name := Trim(Song_Name);
  PrgName := Trim(PrgName);
  TrackName := Trim(TrackName);
  ComStr := Trim(ComStr);
  with PLItem^ do
   begin
    Author := Song_Author;
    Title := Song_Name;
    Programm := PrgName;
    Tracker := TrackName;
    Comment := ComStr;
    Date := DateStr;
    FileName := File_Name;
    Offset := F_Offset;
    Address := F_Address;
    Length := F_Length;
    FileType := FType;
    UnpackedSize := orisize;
    Loop := Looping_VBL;
    Ay_Freq := ChipFrq;
    Int_Freq := PlrFrq;
    Channel_Mode := ChanMode;
    Chip_Type := ChType;
    Number_Of_Channels := Ster;
    Time := TimLen;
    Error := FileNoError;
    FormatSpec := FormSpec;
    Selected := False
   end;
{$IFDEF WIN32GUI}
  RedrawItem(0,i);
{$ENDIF WIN32GUI}
 end;

 procedure AddBASS(FType:TAvailableTypes);
 var
  i:integer;
 begin
  i := AddPlayListItem(PLItem);
{  Song_Author := Trim(Song_Author);
  Song_Name := Trim(Song_Name);
  PrgName := Trim(PrgName);
  TrackName := Trim(TrackName);
  ComStr := Trim(ComStr);}
  with PLItem^ do
   begin
    Author := '';//Song_Author;
    Title := '';//Song_Name;
    Programm := '';//PrgName;
    Tracker := '';//TrackName;
    Comment := '';//ComStr;
    Date := '';//DateStr;
    FileName := File_Name;
    Offset := 0;//F_Offset;
    Address := 0;//F_Address;
    Length := 0;//F_Length;
    FileType := FType;
    UnpackedSize := 0;//orisize;
    Loop := -1;//Looping_VBL;
    Ay_Freq := -1;//ChipFrq;
    Int_Freq := -1;//PlrFrq;
    Channel_Mode := -1;//ChanMode;
    Chip_Type := No_Chip;
    Number_Of_Channels := 0;//Ster;
    Time := 0;//TimLen;
    Error := FileNoError;
    FormatSpec := -1;//FormSpec;
    Selected := False
   end;
{$IFDEF WIN32GUI}
  RedrawItem(0,i);
{$ENDIF WIN32GUI}
 end;

 procedure AddCD;
 type
  TCDA = packed record
   rID:array[0..3] of char;
   rLen:DWORD;
   CDAID:array[0..3] of char;
   fID:array[0..3] of char;
   fLen:DWORD;
   Version,TrackNum:word;
   SerNum,BegTime,LenTime:integer;
   end;
 var
  i,j,DriveNum,TrackNum:integer;
  D:string;
  f:file of TCDA;
  CDA:TCDA;
  FormSpec,TimLen:integer;
 begin
  if Length(CDDrives) = 0 then exit;
  try
   D := UpperCase(File_Name[1]);
   DriveNum := 0;
   for j := 0 to Length(CDDrives) - 1 do
    if CDDrives[j] = D[1] then
     begin
      DriveNum := j;
      break
     end;
    AssignFile(f,File_Name);
    Reset(f);
    Read(f,CDA);
    CloseFile(f);
    FormSpec := -1;
    TimLen := 0;
    if (CDA.rID = 'RIFF') and
       (CDA.CDAID = 'CDDA') and
       (CDA.fID = 'fmt ') and
       (CDA.Version = 1) then
     begin
      FormSpec := CDA.SerNum;
      TrackNum := CDA.TrackNum;
      TimLen := CDA.LenTime
     end
    else
     begin
      D := UpperCase(File_Name);
      j := Pos('.CDA',D);
      if j >= 3 then
       TrackNum := Str2Int(Copy(D,j - 2,2))
      else
       raise AYEmulError.Create('Open CDA error')
     end
  except
   exit
  end;

  i := AddPlayListItem(PLItem);
{  Song_Author := Trim(Song_Author);
  Song_Name := Trim(Song_Name);
  PrgName := Trim(PrgName);
  TrackName := Trim(TrackName);
  ComStr := Trim(ComStr);}
  with PLItem^ do
   begin
    Author := '';//Song_Author;
    Title := '';//Song_Name;
    Programm := '';//PrgName;
    Tracker := '';//TrackName;
    Comment := '';//ComStr;
    Date := '';//DateStr;
    FileName := File_Name;
    Offset := TrackNum;//F_Offset;
    Address := DriveNum;//F_Address;
    Length := 0;//F_Length;
    FileType := CDAFile;
    UnpackedSize := 0;//orisize;
    Loop := -1;//Looping_VBL;
    Ay_Freq := -1;//ChipFrq;
    Int_Freq := -1;//PlrFrq;
    Channel_Mode := -1;//ChanMode;
    Chip_Type := No_Chip;
    Number_Of_Channels := 0;//Ster;
    Time := TimLen;
    Error := FileNoError;
    FormatSpec := FormSpec;
    Selected := False
   end;
{$IFDEF WIN32GUI}
  RedrawItem(0,i);
{$ENDIF WIN32GUI}
 end;

begin
File_Name := ExpandFileName(File_Name);
UniReadInit(URHandle,URFile,File_Name,nil);
try
SFilePath := ExtractFilePath(File_Name);
SFileName := ExtractFileName(File_Name);
SFileExt := AnsiLowerCase(ExtractFileExt(File_Name));
F_Offset := 0; F_Address := 0;
F_Length := UniReadersData[URHandle].UniFileSize;
if F_Length > 65536 then F_Length := 65536;
F_Frame := @F_Buffer;
Loaded := False;
if SFileExt = '.out' then Add(OUTFile) else
if SFileExt = '.zxay' then Add(ZXAYFile) else
if SFileExt = '.stc' then Add(STCFile) else
if SFileExt = '.asc' then Add(ASCFile) else
if SFileExt = '.stp' then Add(STPFile) else
if SFileExt = '.psc' then Add(PSCFile) else
if SFileExt = '.fls' then Add(FLSFile) else
if SFileExt = '.ftc' then Add(FTCFile) else
if SFileExt = '.pt1' then Add(PT1File) else
if SFileExt = '.pt2' then Add(PT2File) else
if SFileExt = '.pt3' then Add(PT3File) else
if SFileExt = '.sqt' then Add(SQTFile) else
if SFileExt = '.gtr' then Add(GTRFile) else
if SFileExt = '.fxm' then Add(FXMFile) else
if SFileExt = '.vtx' then Add(VTXFile) else
if SFileExt = '.ym' then Add(YM3File) else
if SFileExt = '.psg' then Add(PSGFile) else
if SFileExt = '.mp3' then AddBASS(MP3File) else
if SFileExt = '.mp2' then AddBASS(MP2File) else
if SFileExt = '.mp1' then AddBASS(MP1File) else
if SFileExt = '.ogg' then AddBASS(OGGFile) else
if SFileExt = '.wav' then AddBASS(WAVFile) else
if SFileExt = '.mo3' then AddBASS(MO3File) else
if SFileExt = '.it' then AddBASS(ITFile) else
if SFileExt = '.xm' then AddBASS(XMFile) else
if SFileExt = '.s3m' then AddBASS(S3MFile) else
if SFileExt = '.mtm' then AddBASS(MTMFile) else
if SFileExt = '.mod' then AddBASS(MODFile) else
if SFileExt = '.umx' then AddBASS(UMXFile) else
if SFileExt = '.cda' then AddCD else
if SFileExt = '.ay' then OpenAYFile else
if SFileExt = '.aym' then OpenAYMFile else
if Detect then
 begin
  try
   UniRead(URHandle,@Zag,4);
   if zag = 'ZXAY' then
    begin
     UniRead(URHandle,@Zag,4);
//     UniFileSeek(URHandle,0);
     if (Zag <> 'EMUL') and (Zag <> 'AMAD') then
      Add(ZXAYFile)
     else
      OpenAYFile
    end
   else
    begin
//     UniFileSeek(URHandle,0);
     if (zag = 'PSG'#$1a) or (zag = 'EPSG') then
      Add(PSGFile)
     else if (zag = 'YM2!') or (zag = 'YM3!') or (zag = 'YM3b') or
             (zag = 'YM5!') or (zag = 'YM6!') then
      Add(YM3File)
     else if (((zag[0] = 'a') and (zag[1] = 'y')) or
              ((zag[0] = 'y') and (zag[1] = 'm')) or
              ((zag[0] = 'A') and (zag[1] = 'Y')) or
              ((zag[0] = 'Y') and (zag[1] = 'M'))
             ) and (zag[2] in [#0..#6]) then
      Add(VTXFile)
     else
      begin
       UniFileSeek(URHandle,2);
       UniRead(URHandle,@LHZag,5);
       if LHZag = '-lh5-' then
        Add(YM3File)
       else
        begin
         Init_Detector;
         while Module_Detector do
          begin
           Add(FType);
           inc(F_Offset,F_Length - 1);
           inc(F_Index,F_Length - 1);
           dec(Readen1,F_Length - 1);
           F_Address := 0;
          end
        end
      end
    end
  except
  end;
 end;
finally
 UniReadClose(URHandle)
end
end;

procedure FreePlayingResourses;
var
 i:integer;
begin
if FileOpened then
 begin
  UniReadClose(FileHandle);
  FileOpened := False
 end;
if FileLoaded then
 begin
  FileLoaded := False;
  case CurFileType of
  VTXFile..YM6File:
   begin
    FreeMem(PVTXYMUnpackedData);
    if (CurFileType in [YM5File,YM6File]) and (Length(DDrumSamples) > 0) then
     DDrumSamples := nil
   end;
  FXMFile:
   begin
    FXM_StekC := nil;
    FXM_StekB := nil;
    FXM_StekA := nil;
    for i := 0 to ProgrWidth - 1 do
     begin
      Trackers_Slider_Points[i].FXM_StekA := nil;
      Trackers_Slider_Points[i].FXM_StekB := nil;
      Trackers_Slider_Points[i].FXM_StekC := nil
     end
   end
  end
 end
end;

procedure RaiseBadFileStructure;
begin
raise EFileStructureError.Create(Errors[ErBadFileStructure])
end;

function LoadTrackerModule(var Module:ModTypes; Index:integer):boolean;
var
 f:file;
 i,i1,i2:integer;
 j,j2:longword;
 pwrd:WordPtr;
begin
with PlaylistItems[Index]^ do
 try
  try
   AssignFile(f,FileName);
   Reset(f,1);
   if FileType = FXMFile then
    begin
     Seek(f,Offset + 6);
     Length := System.FileSize(f) - 6 - Offset;
     i := Address
    end
   else
    begin
     Seek(f,Offset);
     if Length = -1 then
      Length := System.FileSize(f);
     i := 0
    end;
   if Length > 65536 - i then
    Length := 65536 - i;
   try
    FillChar(Module,65536,0);
    BlockRead(f,Module.Index[i],Length);
   finally
    CloseFile(f)
   end;
   case FileType of
   PT2File:
    if LowerCase(ExtractFileExt(FileName)) <> '.pt2' then
     begin
      j := Address;
      if j <> 0 then
       begin
        if j >= 65536 then RaiseBadFileStructure;
        i := 0; i1 := 0;
        with Module do
         begin
          while (i < 65535 - 131) and (PT2_PositionList[i] < 128) do
           begin
            if longword(i1) < PT2_PositionList[i] then
             i1 := PT2_PositionList[i];
            Inc(i)
           end;
          if i >= 65535 - 131 then RaiseBadFileStructure;
          if i > 255 then
           PT2_NumberOfPositions := 255
          else
           PT2_NumberOfPositions := i;
          for i := 0 to 31 do
           begin
            if PT2_SamplesPointers[i] < j then RaiseBadFileStructure;
            Dec(PT2_SamplesPointers[i],j)
           end; 
          for i := 0 to 15 do
           begin
            if PT2_OrnamentsPointers[i] < j then RaiseBadFileStructure;
            Dec(PT2_OrnamentsPointers[i],j)
           end;
          j2 := longword(@Index[65535]);
          pwrd := @Index[PT2_PatternsPointer]
         end;
        for i := 0 to i1 * 3 + 2 do
         begin
          if longword(pwrd) >= j2 then RaiseBadFileStructure;
          if pwrd^ < j then RaiseBadFileStructure;
          Dec(pwrd^,j);
          Inc(integer(pwrd),2)
         end
       end
     end;
   STPFile:
    if AnsiLowerCase(ExtractFileExt(FileName)) <> '.stp' then
     with Module do
      if STP_Init_Id = 0 then
       begin
        j := Address;
        if j >= 65536 then RaiseBadFileStructure;
        j2 := longword(@Index[65535]);
        pwrd := @Index[STP_PatternsPointer];
        for i := 1 to (Length - STP_PatternsPointer) div 2 do
         begin
          if longword(pwrd) >= j2 then RaiseBadFileStructure;
          if pwrd^ < j then RaiseBadFileStructure;
          Dec(pwrd^,j);
          Inc(integer(pwrd),2)
         end
       end;
   ASC0File:
    with Module do
     begin
      if Length >= 65535 then RaiseBadFileStructure;
      Move(ASC0_PatternsPointers,ASC1_PatternsPointers,Length - 1);
      ASC1_LoopingPosition := 0;
      Inc(ASC1_PatternsPointers);
      Inc(ASC1_SamplesPointers);
      Inc(ASC1_OrnamentsPointers)
     end;
   SQTFile:
    with Module do
     begin
      i := SQT_SamplesPointer - 10;
      if  i < 0 then RaiseBadFileStructure;
      i1 := 0;
      i2 := SQT_PositionsPointer - i;
      if i2 < 0 then RaiseBadFileStructure;
      while Index[i2] <> 0 do
       begin
        if i2 > 65536 - 8 then RaiseBadFileStructure;
        if i1 < Index[i2] and $7f then
         i1 := Index[i2] and $7f;
        Inc(i2,2);
        if i1 < Index[i2] and $7f then
         i1 := Index[i2] and $7f;
        Inc(i2,2);
        if i1 < Index[i2] and $7f then
         i1 := Index[i2] and $7f;
        Inc(i2,3)
       end;
      j2 := longword(@Index[65535]);
      pwrd := @SQT_SamplesPointer;
      i1 := (SQT_PatternsPointer - i + i1 * 2) div 2;
      if i1 < 1 then RaiseBadFileStructure;
      for i2 := 1 to i1 do
       begin
        if longword(pwrd) >= j2 then RaiseBadFileStructure;
        if pwrd^ < i then RaiseBadFileStructure;
        Dec(pwrd^,i);
        Inc(integer(pwrd),2)
       end
     end;
   FTCFile:
    with Module do
     begin
      j := Address;
      if (AnsiLowerCase(ExtractFileExt(FileName)) <> '.ftc') and (j <> 0) then
       begin
        if j >= 65536 then RaiseBadFileStructure;
        for i := 0 to 32 do
         begin
          if FTC_OrnamentsPointers[i] < j then RaiseBadFileStructure;
          Dec(FTC_OrnamentsPointers[i],j)
         end;
        for i := 0 to 31 do
         begin
          if FTC_SamplesPointers[i] < j then RaiseBadFileStructure;
          Dec(FTC_SamplesPointers[i],j)
         end;
        j2 := longword(@Index[65535]);
        pwrd := @Index[FTC_PatternsPointer];
        i := $d4; i1 := 0;
        while (i < 65536) and (shortint(Index[i]) >= 0) do
         begin
          if i1 < Index[i] then i1 := Index[i];
          Inc(i,2)
         end;
        if i = 65536 then RaiseBadFileStructure;
        i1 := (i1 + 1) * 3;
        if i1 < 1 then RaiseBadFileStructure;
        for i := 1 to i1 do
         begin
          if longword(pwrd) >= j2 then RaiseBadFileStructure;
          if pwrd^ < j then RaiseBadFileStructure;
          Dec(pwrd^,j);
          Inc(integer(pwrd),2)
         end
       end
     end;
   FLSFile:
    begin
     i := Module.FLS_OrnamentsPointer - 16;
     if i >= 0 then
      with Module do
       repeat
        i2 := FLS_SamplesPointer + 2 - i;
        if (i2 >= 8) and (i2 < Length) then
         begin
          pwrd := @Index[i2];
          i1 := pwrd^ - i;
          if (i1 >= 8) and (i1 < Length) then
           begin
            pwrd := @Index[i2 - 4];
            i2 := pwrd^ - i;
            if (i2 >= 6) and (i2 < Length) then
             if i1 - i2 = $20 then
              begin
               i2 := FLS_PatternsPointers[1].PatternB - i;
               if (i2 > 21) and (i2 < Length) then
                begin
                 i1 := FLS_PatternsPointers[1].PatternA - i;
                 if (i1 > 20) and (i1 < Length) then
                  if Index[i1 - 1] = 0 then
                   begin
                    while (i1 < Length) and (Index[i1] <> 255) do
                     begin
                      repeat
                       case Index[i1] of
                       0..$5f,$80,$81:
                        begin
                         Inc(i1);
                         break
                        end;
                       $82..$8e:
                        Inc(i1)
                       end;
                       Inc(i1);
                      until i1 >= Length;
                     end;
                    if i1 + 1 = i2 then break
                   end
                end
              end
           end
         end;
        Dec(i)
       until i < 0;
       if i < 0 then
        Error := ErFLSAddrNotDetected
       else
        with Module do
         begin
          pwrd := @Module;
          i1 := FLS_SamplesPointer - i + integer(pwrd);
          i2 := FLS_PositionsPointer - i + integer(pwrd) + 2;
          repeat
           Dec(pwrd^,i);
           Inc(integer(pwrd),2)
          until i1 = integer(pwrd);
          Inc(integer(pwrd),2);
          repeat
           Dec(pwrd^,i);
           Inc(integer(pwrd),4)
          until i2 = integer(pwrd)
         end
    end;
   GTRFile:
    with Module do
     begin
      pwrd := @GTR_SamplesPointers[0];
      if longword(pwrd) + (15 + 16 + 32 * 3) * 2 > longword(@Index[65536]) then
       RaiseBadFileStructure;
      j := GTR_Address;
      if j >= 65536 then RaiseBadFileStructure;
      for i := 0 to (15 + 16 + 32 * 3) - 1 do
       begin
        if pwrd^ < j then RaiseBadFileStructure;
        Dec(pwrd^,j);
        Inc(integer(pwrd),2)
       end
     end
   end;
  except
   on EFileStructureError do
    Error := ErBadFileStructure
   else
    Error := ErReadingFile
  end
 finally
  Result := Error = FileNoError;
{$IFDEF WIN32GUI}
  RedrawItem(0,Index)
{$ENDIF WIN32GUI}
 end
end;

procedure BASSGetTags(var Author,Title:string;h:integer;FileType:TAvailableTypes);

 procedure GetSongInfo_ID3V1;
 var
  p:PID3v1;
 begin
  p := pointer(BASS_StreamGetTags(h,BASS_TAG_ID3));
  if p = nil then exit;
  Author := p.Author;
  Author := Trim(PChar(Author));
  Title := p.Title;
  Title := Trim(PChar(Title))
 end;

 function GetSongInfo_ID3V2:boolean;

  function GetID3V2DWord(a:dword):dword;
   asm
    shl ah,1
    xchg al,ah
    shr ax,1
    ror eax,16
    shl ah,1
    xchg al,ah
    shl ax,1
    shr eax,2
   end;

  const
   TIT2 = $32544954;
   TPE1 = $31455054;

  var
   p,TagSize,AddByte,StrSize:integer;

  procedure CaseIds(Id:integer);
   begin
    case Id of
    TIT2:
     begin
      SetLength(Title,StrSize);
      Move(pointer(p + 10 + AddByte + 1)^,Title[1],StrSize);
      Title := Trim(PChar(Title))
     end;
    TPE1:
     begin
      SetLength(Author,StrSize);
      Move(pointer(p + 10 + AddByte + 1)^,Author[1],StrSize);
      Author := Trim(PChar(Author))
     end
    end
   end;

  procedure GetFromIDV24x; //not tested
   begin
    TagSize := DWORD(p) + GetID3V2DWord(PID3V2Header(p).Size);
    if PID3V2Header(p).Flags and 32 = 0 then
     Inc(TagSize,10);
    Inc(p,10);
    if PID3V2Header(p - 10).Flags and 64 <> 0 then
     Inc(p,GetID3V2DWord(PID3V2ExtHeader(p).Size));
    while p <= TagSize - SizeOf(TID3V2Frame) do
     with PID3V2Frame(p)^ do
      begin
       AddByte := Ord(Flags and 64 <> 0);
       StrSize := integer(GetID3V2DWord(Size)) - AddByte - 1;
       if (Flags and 15 = 0) and
          (StrSize > 0) and (StrSize <= TagSize - p - 10 - AddByte - 1) and
          (PByte(p + 10 + AddByte)^ = 0) then
        CaseIds(Id);
       Inc(p,GetID3V2DWord(Size) + 10)
      end
   end;

  procedure GetFromIDV23x;
   begin
    if PID3V2Header(p).Flags and 128 <> 0 then exit;
    TagSize := DWORD(p) + GetID3V2DWord(PID3V2Header(p).Size) + 10;
    Inc(p,10);
    if PID3V2Header(p - 10).Flags and 64 <> 0 then
     Inc(p,IntelDWord(PID3V2ExtHeader(p).Size));
    while p <= TagSize - SizeOf(TID3V2Frame) do
     with PID3V2Frame(p)^ do
      begin
       AddByte := Ord(Flags and 32 <> 0);
       StrSize := integer(IntelDWord(Size)) - AddByte - 1;
       if (Flags and (128 + 64) = 0) and (StrSize > 0) and
          (StrSize <= TagSize - p - 10 - AddByte - 1) and
          (PByte(p + 10 + AddByte)^ = 0) then
        CaseIds(Id);
       Inc(p,IntelDWord(Size) + 10)
      end
   end;

 begin
  Result := False;
  p := integer(BASS_StreamGetTags(h,BASS_TAG_ID3V2));
  if p = 0 then exit;
  case PID3V2Header(p).VerMajor of
  4:GetFromIDV24x;
  3:GetFromIDV23x
  else
   exit
  end;
  if (Author <> '') or (Title <> '') then
   Result := True
 end;

 procedure GetSongInfo_OGG;
 var
  p:PChar;
  l,tl,cl:longword;
  Tag:string;
 begin
  p := BASS_StreamGetTags(h,BASS_TAG_OGG);
  if p = nil then exit;
  repeat
   l := StrLen(p);
   tl := 0;
   while (tl < l) and (PByte(DWORD(p) + tl)^ <> Ord('=')) do Inc(tl);
   if (tl = l) or (tl = 0) then break;
   if tl < l - 1 then
    begin
     SetLength(Tag,tl);
     Move(p^,Tag[1],tl);
     cl := l - tl - 1;
     if UpperCase(Tag) = 'ARTIST' then
      begin
       SetLength(Author,cl);
       Move(pointer(DWORD(p) + tl + 1)^,Author[1],cl)
      end
     else if UpperCase(Tag) = 'TITLE' then
      begin
       SetLength(Title,cl);
       Move(pointer(DWORD(p) + tl + 1)^,Title[1],cl)
      end;
     SetLength(Tag,0)
    end;
   Inc(integer(p),l + 1)
  until PByte(p)^ = 0;
  Author := Trim(Author);
  Title := Trim(Title)
 end;

begin
Author := '';
Title := '';
if h = 0 then exit;
case FileType of
MpegFileMin..MpegFileMax:
 begin
  if not GetSongInfo_ID3V2 then
   GetSongInfo_ID3V1
 end;
OGGFile:
 GetSongInfo_OGG;
MODFilesMin..MODFilesMax:
 Title := Trim(BASS_MusicGetName(h));
end
end;

procedure GetTime(FileHandle,Index:integer;
                   AlreadyLoaded:boolean;var Lp:integer);
var
 Module:PModTypes;

 procedure incr(var i:longword);
 begin
 inc(i);
 if i >= 65536 then RaiseBadFileStructure
 end;

 function FXM_Loop_Found(j11,j22,j33:word):boolean;
 var
  j1,j2,j3:longword;
  a1,a2,a3:byte;
  f71,f72,f73:boolean;
  f61,f62,f63:boolean;
  fxms1,fxms2,fxms3:array of word;
  k:integer;
  tr:integer;
 begin
       j1 := WordPtr(@Module.Index[PlayListItems[Index]^.Address])^;
       j2 := WordPtr(@Module.Index[PlayListItems[Index]^.Address + 2])^;
       j3 := WordPtr(@Module.Index[PlayListItems[Index]^.Address + 4])^;
       a1 := 1; a2 := 1; a3:= 1;
       f71 := False; f72 := False; f73 := False;
       f61 := False; f62 := False; f63 := False;
       tr := 0;
       repeat
        if (j1 = j11) and (j2 = j22) and (j3 = j33) then
         begin
          Result := True;
          LoopVBL := tr;
          exit
         end;
        Dec(a1);
        if a1 = 0 then
         begin
          f71 := False;
          f61 := False;
          repeat
           case Module.Index[j1] of
           0..$7F,$8F..$FF:
            begin
             incr(j1);
             a1 := Module.Index[j1];
             incr(j1);
             break
            end;
           $80:
            begin
             if j1 >= 65536 - 2 then RaiseBadFileStructure;
             j1 := WordPtr(@Module.Index[j1 + 1])^;
             f71 := True
            end;
           $81:
            begin
             if j1 >= 65536 - 3 then RaiseBadFileStructure;
             k := Length(fxms1);
             SetLength(fxms1,k + 1);
             fxms1[k] := j1 + 3;
             j1 := WordPtr(@Module.Index[j1 + 1])^
            end;
           $82:
            begin
             if (j1 = j11) and (j2 = j22) and (j3 = j33) then
              begin
               Result := True;
               LoopVBL := tr;
               exit
              end;
             k := Length(fxms1);
             SetLength(fxms1,k + 2);
             incr(j1);
             fxms1[k] := Module.Index[j1];
             incr(j1);
             fxms1[k + 1] := j1
            end;
           $83:
            begin
             k := Length(fxms1);
             if k < 2 then RaiseBadFileStructure;
             dec(fxms1[k - 2]);
             if fxms1[k - 2] and 255 <> 0 then
              begin
               j1 := fxms1[k - 1];
               f61 := True
              end
             else
              begin
               SetLength(fxms1,k - 2);
               inc(j1)
              end
            end;
           $84,$85,$88,$8D,$8E:
            inc(j1,2);
           $86,$87,$8C:
            inc(j1,3);
           $89:
            begin
             k := Length(fxms1);
             if k < 1 then RaiseBadFileStructure;
             j1 := fxms1[k - 1];
             SetLength(fxms1,k - 1)
            end;
           $8A,$8B:
            inc(j1);
           end;
           if j1 >= 65536 then RaiseBadFileStructure
          until False;
         end;
        Dec(a2);
        if a2 = 0 then
         begin
          f72 := False;
          f62 := False;
          repeat
           case Module.Index[j2] of
           0..$7F,$8F..$FF:
            begin
             incr(j2);
             a2 := Module.Index[j2];
             incr(j2);
             break
            end;
           $80:
            begin
             if j2 >= 65536 - 2 then RaiseBadFileStructure;
             j2 := WordPtr(@Module.Index[j2 + 1])^;
             f72 := True
            end;
           $81:
            begin
             if j2 >= 65536 - 3 then RaiseBadFileStructure;
             k := Length(fxms2);
             SetLength(fxms2,k + 1);
             fxms2[k] := j2 + 3;
             j2 := WordPtr(@Module.Index[j2 + 1])^
            end;
           $82:
            begin
             if (j1 = j11) and (j2 = j22) and (j3 = j33) then
              begin
               Result := True;
               LoopVBL := tr;
               exit
              end;
             k := Length(fxms2);
             SetLength(fxms2,k + 2);
             incr(j2);
             fxms2[k] := Module.Index[j2];
             incr(j2);
             fxms2[k + 1] := j2
            end;
           $83:
            begin
             k := Length(fxms2);
             if k < 2 then RaiseBadFileStructure;
             dec(fxms2[k - 2]);
             if fxms2[k - 2] and 255 <> 0 then
              begin
               j2 := fxms2[k - 1];
               f62 := True
              end
             else
              begin
               SetLength(fxms2,k - 2);
               inc(j2)
              end
            end;
           $84,$85,$88,$8D,$8E:
            inc(j2,2);
           $86,$87,$8C:
            inc(j2,3);
           $89:
            begin
             k := Length(fxms2);
             if k < 1 then RaiseBadFileStructure;
             j2 := fxms2[k - 1];
             SetLength(fxms2,k - 1)
            end;
           $8A,$8B:
            inc(j2)
           end;
           if j2 >= 65536 then RaiseBadFileStructure
          until False;
         end;
        Dec(a3);
        if a3 = 0 then
         begin
          f73 := False;
          f63 := False;
          repeat
           case Module.Index[j3] of
           0..$7F,$8F..$FF:
            begin
             incr(j3);
             a3 := Module.Index[j3];
             incr(j3);
             break
            end;
           $80:
            begin
             if j3 >= 65536 - 2 then RaiseBadFileStructure;
             j3 := WordPtr(@Module.Index[j3 + 1])^;
             f73 := True
            end;
           $81:
            begin
             if j3 >= 65536 - 3 then RaiseBadFileStructure;
             k := Length(fxms3);
             SetLength(fxms3,k + 1);
             fxms3[k] := j3 + 3;
             j3 := WordPtr(@Module.Index[j3 + 1])^
            end;
           $82:
            begin
             if (j1 = j11) and (j2 = j22) and (j3 = j33) then
              begin
               Result := True;
               LoopVBL := tr;
               exit
              end;
             k := Length(fxms3);
             SetLength(fxms3,k + 2);
             incr(j3);
             fxms3[k] := Module.Index[j3];
             incr(j3);
             fxms3[k + 1] := j3
            end;
           $83:
            begin
             k := Length(fxms3);
             if k < 2 then RaiseBadFileStructure;
             dec(fxms3[k - 2]);
             if fxms3[k - 2] and 255 <> 0 then
              begin
               j3 := fxms3[k - 1];
               f63 := True
              end
             else
              begin
               SetLength(fxms3,k - 2);
               inc(j3)
              end
            end;
           $84,$85,$88,$8D,$8E:
            inc(j3,2);
           $86,$87,$8C:
            inc(j3,3);
           $89:
            begin
             k := Length(fxms3);
             if k < 1 then RaiseBadFileStructure;
             j3 := fxms3[k - 1];
             SetLength(fxms3,k - 1)
            end;
           $8A,$8B:
            inc(j3);
           end;
           if j3 >= 65536 then RaiseBadFileStructure
          until False;
         end;
        inc(tr);
       until ((f71 and (f72 or f62) and (f73 or f63)) or
             ((f71 or f61) and f72 and (f73 or f63)) or
             ((f71 or f61) and (f72 or f62) and f73));
  Result := False
 end;

var
 t:smallint;
 a,b,b1:byte;
 i,j,tm:integer;
 EPSGRec:packed record
  case Boolean of
  True:(Reg,Data:byte;
        TSt:longword);
  False:(All:int64);
 end;
 a1,a2,a3,a11,a22,a33:shortint;
 j1,j2,j3:longword;
 k,c1,c2,c3,c4,c5,c8:integer;
 pwrd:WordPtr;
 Env1,Env2,Env3:boolean;
 pptr,cptr:longword;
 f71,f72,f73,
 f61,f62,f63,
 f41,f42,f43,flg:boolean;
 j11,j22,j33:word;
 fxms1,fxms2,fxms3:array of word;
 bassh:integer;
 MSF:packed record
  case boolean of
  True: (MSF:DWORD);
  False:(M,S,F:byte);
 end;
 DLCatcher:integer;

begin
Lp := 0;
tm := 0;

with PlayListItems[Index]^ do
begin

try

if FileType in [TrkFileMin..TrkFileMax] then
 if not AlreadyLoaded then
  begin
   New(Module);
   if not LoadTrackerModule(Module^,Index) then
    begin
     Dispose(Module);
     exit
    end
  end
 else
  Module := @RAM;

try

case FileType of
OUTFile:
 with UniReadersData[FileHandle]^ do
  begin
   UniFileSeek(FileHandle,0);
   repeat
    UniRead(FileHandle,@t,2);
    if (t = -1) or (t = 0) then Inc(tm);
    UniFileSeek(FileHandle,UniFilePos + 3);
   until UniFilePos >= UniFileSize;
   tm := round(tm * 1000 / (FrqZ80 / 17472));
   if t > 0 then
    Inc(tm,round((t / 17472) * 1000 / (FrqZ80 / 17472)))
  end;
EPSGFile:
 with UniReadersData[FileHandle]^ do
  begin
   UniFileSeek(FileHandle,5);
   UniRead(FileHandle,@b,1);
   case b of
   0:   i := 70908;
   255: UniRead(FileHandle,@i,4)
   else i := 71680;
   end;
   UniFileSeek(FileHandle,16);
   EPSGRec.All := 0;
   while UniFilePos < UniFileSize do
    begin
     UniRead(FileHandle,@EPSGRec,5);
     if EPSGRec.All = $FFFFFFFFFF then Inc(tm)
    end;
   if EPSGRec.All  = $FFFFFFFFFF then
    j := 0
   else
    j := EPSGRec.TSt;
   tm := round((tm / (FrqZ80 / i) + j / FrqZ80) * 1000)
  end;
PSGFile:
 with UniReadersData[FileHandle]^ do
  begin
   UniFileSeek(FileHandle,16);
   while UniFilePos < UniFileSize do
    begin
     UniRead(FileHandle,@b,1);
     if b = 255 then Inc(tm)
     else if b = 254 then
      begin
       UniRead(FileHandle,@b1,1);
       Inc(tm,b1 * 4)
      end 
     else UniFileSeek(FileHandle,UniFilePos + 1);
    end;
   if not (b in [254,255]) then Inc(tm)
  end;
ZXAYFile:
 with UniReadersData[FileHandle]^ do
  begin
   UniFileSeek(FileHandle,4);
   while UniFilePos < UniFileSize do
    begin
     UniRead(FileHandle,@i,4);
     if i and $FFFFF = 0 then Inc(tm);
    end;
   tm := round(tm * 1000 / (FrqZ80 / $100000) +
                (t and $FFFFF) / FrqZ80 * 1000);
  end;
PT3File:
  begin
   with Module^ do
    begin
     b := PT3_Delay;
     a11 := 1; a22 := 1; a33 := 1;
     DLCatcher := 16384;
     for i := 0 to PT3_NumberOfPositions - 1 do
      begin
       if i = PT3_LoopPosition then Lp := tm;
       j1 := WordPtr(@Index[PT3_PatternsPointer +
                                PT3_PositionList[i] * 2])^;
       j2 := WordPtr(@Index[PT3_PatternsPointer +
                                PT3_PositionList[i] * 2 + 2])^;
       j3 := WordPtr(@Index[PT3_PatternsPointer +
                                PT3_PositionList[i] * 2 + 4])^;
       a1 := 1; a2 := 1; a3 := 1;
       repeat
        dec(a1);
        if a1 = 0 then
         begin
          if Index[j1] = 0 then break;
          j := 0; c1 := 0; c2 := 0; c3 := 0; c4 := 0; c5 := 0; c8 := 0;
          repeat
           case Index[j1] of
           $d0,$c0,$50..$af:
            begin
             a1 := a11;
             incr(j1);
             break
            end;
           $10,$f0..$ff:
            inc(j1);
           $b2..$bf:
            inc(j1,2);
           $b1:
            begin
             incr(j1);
             a11 := Index[j1]
            end;
           $11..$1f:
            inc(j1,3);
           1:
            begin
             inc(j);
             c1 := j
            end;
           2:
            begin
             inc(j);
             c2 := j
            end;
           3:
            begin
             inc(j);
             c3 := j
            end;
           4:
            begin
             inc(j);
             c4 := j
            end;
           5:
            begin
             inc(j);
             c5 := j
            end;
           8:
            begin
             inc(j);
             c8 := j
            end;
           9:
            inc(j)
           end;
           incr(j1)
          until False;
          while j > 0 do
           begin
            if (j = c1) or (j = c8) then
             inc(j1,3)
            else if (j = c2) then
             inc(j1,5)
            else if (j = c3) or (j = c4) then
             inc(j1)
            else if (j = c5) then
             inc(j1,2)
            else
             begin
              b := Index[j1];
              inc(j1)
             end;
            if j1 >= 65536 then RaiseBadFileStructure;
            dec(j)
           end
         end;
        dec(a2);
        if a2 = 0 then
         begin
          j := 0; c1 := 0; c2 := 0; c3 := 0; c4 := 0; c5 := 0; c8 := 0;
          repeat
           case Index[j2] of
           $d0,$c0,$50..$af:
            begin
             a2 := a22;
             incr(j2);
             break
            end;
           $10,$f0..$ff:
            inc(j2);
           $b2..$bf:
            inc(j2,2);
           $b1:
            begin
             incr(j2);
             a22 := Index[j2]
            end;
           $11..$1f:
            inc(j2,3);
           1:
            begin
             inc(j);
             c1 := j
            end;
           2:
            begin
             inc(j);
             c2 := j
            end;
           3:
            begin
             inc(j);
             c3 := j
            end;
           4:
            begin
             inc(j);
             c4 := j
            end;
           5:
            begin
             inc(j);
             c5 := j
            end;
           8:
            begin
             inc(j);
             c8 := j
            end;
           9:
            inc(j)
           end;
           incr(j2)
          until False;
          while j > 0 do
           begin
            if (j = c1) or (j = c8) then
             inc(j2,3)
            else if (j = c2) then
             inc(j2,5)
            else if (j = c3) or (j = c4) then
             inc(j2)
            else if (j = c5) then
             inc(j2,2)
            else
             begin
              b := Index[j2];
              inc(j2)
             end;
            if j2 >= 65536 then RaiseBadFileStructure;
            dec(j)
           end
         end;
        dec(a3);
        if a3 = 0 then
         begin
          j := 0; c1 := 0; c2 := 0; c3 := 0; c4 := 0; c5 := 0; c8 := 0;
          repeat
           case Module.Index[j3] of
           $d0,$c0,$50..$af:
            begin
             a3 := a33;
             incr(j3);
             break
            end;
           $10,$f0..$ff:
            inc(j3);
           $b2..$bf:
            inc(j3,2);
           $b1:
            begin
             incr(j3);
             a33 := Index[j3]
            end;
           $11..$1f:
            inc(j3,3);
           1:
            begin
             inc(j);
             c1 := j
            end;
           2:
            begin
             inc(j);
             c2 := j
            end;
           3:
            begin
             inc(j);
             c3 := j
            end;
           4:
            begin
             inc(j);
             c4 := j
            end;
           5:
            begin
             inc(j);
             c5 := j
            end;
           8:
            begin
             inc(j);
             c8 := j
            end;
           9:
            inc(j)
           end;
           incr(j3)
          until False;
          while j > 0 do
           begin
            if (j = c1) or (j = c8) then
             inc(j3,3)
            else if (j = c2) then
             inc(j3,5)
            else if (j = c3) or (j = c4) then
             inc(j3)
            else if (j = c5) then
             inc(j3,2)
            else
             begin
              b := Index[j3];
              inc(j3)
             end;
            if j3 >= 65536 then RaiseBadFileStructure;
            dec(j)
           end
         end;
        Inc(tm,b);
        Dec(DLCatcher);
        if DLCatcher < 0 then RaiseBadFileStructure
       until False
      end
    end
  end;
PT2File:
  begin
   with Module^ do
    begin
     b := PT2_Delay;
     a1 := 0; a2 := 0; a3 := 0;
     a11 := 0; a22 := 0; a33 := 0;
     DLCatcher := 16384;
     for i := 0 to PT2_NumberOfPositions - 1 do
      begin
       if i = PT2_LoopPosition then Lp := tm;
       j1 := WordPtr(@Index[PT2_PatternsPointer +
                                PT2_PositionList[i] * 6])^;
       j2 := WordPtr(@Index[PT2_PatternsPointer +
                                PT2_PositionList[i] * 6 + 2])^;
       j3 := WordPtr(@Index[PT2_PatternsPointer +
                                PT2_PositionList[i] * 6 + 2])^;
       repeat
        dec(a1);
        if a1 < 0 then
         begin
          if Index[j1] = 0 then break;
          repeat
           case Index[j1] of
           $70,$80..$e0:
            begin
             a1 := a11;
             incr(j1);
             break
            end;
           $71..$7e:
            inc(j1,2);
           $20..$5f:
            a11 := Index[j1] - $20;
           $f:
            begin
             incr(j1);
             b := Index[j1]
            end;
           1..$b,$e:
            inc(j1);
           $d:
            inc(j1,3)
           end;
           incr(j1)
          until False
         end;
        dec(a2);
        if a2 < 0 then
         repeat
          case Index[j2] of
          $70,$80..$e0:
           begin
            a2 := a22;
            incr(j2);
            break
           end;
          $71..$7e:
           inc(j2,2);
          $20..$5f:
           a22 := Index[j2] - $20;
          $f:
           begin
            incr(j2);
            b := Index[j2]
           end;
          1..$b,$e:
           inc(j2);
          $d:
           inc(j2,3)
          end;
          incr(j2)
         until False;
        dec(a3);
        if a3 < 0 then
         repeat
          case Index[j3] of
          $70,$80..$e0:
           begin
            a3 := a33;
            incr(j3);
            break
           end;
          $71..$7e:
           inc(j3,2);
          $20..$5f:
           a33 := Index[j3] - $20;
          $f:
           begin
            incr(j3);
            b := Index[j3]
           end;
          1..$b,$e:
           inc(j3);
          $d:
           inc(j3,3)
          end;
          incr(j3)
         until False;
        Inc(tm,b);
        Dec(DLCatcher);
        if DLCatcher < 0 then RaiseBadFileStructure
       until False
      end
    end
  end;
STCFile:
  begin
   with Module^ do
    begin
     j := -1;
     repeat
      inc(j);
      j2 := ST_PositionsPointer + j * 2;
      incr(j2);
      j2 := Index[j2];
      i := -1;
      repeat
       inc(i);
       j1 := ST_PatternsPointer + 7 * i;
       if j1 >= 65535 then RaiseBadFileStructure
      until Index[j1] = j2;
      j1 := WordPtr(@Index[j1 + 1])^;
      a := 1;
      while Index[j1] <> 255 do
       begin
        case Index[j1] of
        0..$5f,$80,$81:
         Inc(tm,a);
        $a1..$e0:
         a := Index[j1] - $a0;
        $83..$8e:
         inc(j1)
        end;
        incr(j1)
       end
     until j = Index[ST_PositionsPointer];
     tm := tm * ST_Delay
    end
  end;
STPFile:
  begin
   a := 1;
   with Module^ do
    begin
     for i := 0 to Index[STP_PositionsPointer] - 1 do
      begin
       if i = Index[STP_PositionsPointer + 1] then
        LoopVBL := tm * STP_Delay;
       j1 := WordPtr(@Index[STP_PatternsPointer +
                      Index[STP_PositionsPointer + 2 + i * 2]])^;
       while Index[j1] <> 0 do
        begin
         case Index[j1] of
         1..$60,$d0..$ef:
          Inc(tm,a);
         $80..$BF:
          a := Index[j1] - $7f;
         $c0..$cf,$f0:
          inc(j1)
         end;
         incr(j1)
        end
      end;
     tm := tm * STP_Delay
    end
  end;


ASCFile,
ASC0File:
  begin
    a1 := 0; a2 := 0; a3 := 0;
    a11 := 0; a22 := 0; a33 := 0;
    Env1 := False; Env2 := False; Env3 := False;
    with Module^ do
     begin
      b := ASC1_Delay;
      DLCatcher := 16384;
      for i := 0 to ASC1_Number_Of_Positions - 1 do
       begin
        if ASC1_LoopingPosition = i then LoopVBL := tm;
        j1 := WordPtr(@Index[ASC1_PatternsPointers + 6 * Index[i + 9]])^ +
                              ASC1_PatternsPointers;
        j2 := WordPtr(@Index[ASC1_PatternsPointers + 6 * Index[i + 9] + 2])^ +
                              ASC1_PatternsPointers;
        j3 := WordPtr(@Index[ASC1_PatternsPointers + 6 * Index[i + 9] + 4])^ +
                              ASC1_PatternsPointers;
        repeat
         dec(a1);
         if a1 < 0 then
          begin
           if Index[j1] = 255 then break;
           repeat
            case Index[j1] of
            0..$55:
             begin
              a1 := a11;
              incr(j1);
              if Env1 then incr(j1);
              break
             end;
            $56..$5f:
             begin
              a1 := a11;
              incr(j1);
              break
             end;
            $60..$9f:
             a11 := Index[j1] - $60;
            $e0:
             Env1 := True;
            $e1..$ef:
             Env1 := False;
            $f0,$f5..$f7,$f9,$fb:
             inc(j1);
            $f4:
             begin
              incr(j1);
              b := Index[j1]
             end
            end;
            incr(j1)
           until False;
          end;
         dec(a2);
         if a2 < 0 then
          repeat
           case Index[j2] of
           0..$55:
            begin
             a2 := a22;
             incr(j2);
             if Env2 then incr(j2);
             break
            end;
           $56..$5f:
            begin
             a2 := a22;
             incr(j2);
             break
            end;
           $60..$9f:
            a22 := Index[j2] - $60;
           $e0:
            Env2 := True;
           $e1..$ef:
            Env2 := False;
           $f0,$f5..$f7,$f9,$fb:
            inc(j2);
           $f4:
            begin
             incr(j2);
             b := Index[j2]
            end
           end;
           incr(j2)
          until False;
         dec(a3);
         if a3 < 0 then
          repeat
           case Module.Index[j3] of
           0..$55:
            begin
             a3 := a33;
             incr(j3);
             if Env3 then incr(j3);
             break
            end;
           $56..$5f:
            begin
             a3 := a33;
             incr(j3);
             break
            end;
           $60..$9f:
            a33 := Index[j3] - $60;
           $e0:
            env3 := True;
           $e1..$ef:
            env3 := False;
           $f0,$f5..$f7,$f9,$fb:
            inc(j3);
           $f4:
            begin
             incr(j3);
             b := Index[j3]
            end
           end;
           incr(j3)
          until False;
         Inc(tm,b);
         Dec(DLCatcher);
         if DLCatcher < 0 then RaiseBadFileStructure
        until False
       end
     end
  end;
PSCFile:
  begin
   with Module^ do
    begin
     b := PSC_Delay;
     pptr := PSC_PatternsPointer;
     incr(pptr);
     while Index[pptr] <> 255 do
      begin
       inc(pptr,8);
       if pptr >= 65536 then RaiseBadFileStructure
      end;
     if pptr >= 65536 - 2 then RaiseBadFileStructure;
     cptr := WordPtr(@Index[pptr + 1])^;
     incr(cptr);
     pptr := PSC_PatternsPointer;
     incr(pptr);
     while Index[pptr] <> 255 do
      begin
       if pptr = cptr then LoopVBL := tm;
       if pptr >= 65536 - 6 then RaiseBadFileStructure;
       j1 := WordPtr(@Index[pptr + 1])^;
       j2 := WordPtr(@Index[pptr + 3])^;
       j3 := WordPtr(@Index[pptr + 5])^;
       Inc(pptr,8);
       if pptr >= 65536 then RaiseBadFileStructure;
       a1 := 1; a2 := 1; a3 := 1;
       for i := 1 to Index[pptr - 8] do
        begin
         dec(a1);
         if a1 = 0 then
          repeat
           case Index[j1] of
           $c0..$ff:
            begin
             a1 := Index[j1] - $bf;
             inc(j1);
             break
            end;
           $67..$6d,$6f..$7b:
            inc(j1);
           $6e:
            begin
             incr(j1);
             b := Index[j1]
            end
           end;
           incr(j1)
          until False;
         dec(a2);
         if a2 = 0 then
          repeat
           case Index[j2] of
           $c0..$ff:
            begin
             a2 := Index[j2] - $bf;
             inc(j2);
             break
            end;
           $67..$6d,$6f..$79,$7b:
            inc(j2);
           $6e:
            begin
             incr(j2);
             b := Index[j2]
            end;
           $7a:
            inc(j2,3)
           end;
           incr(j2)
          until False;
         dec(a3);
         if a3 = 0 then
          repeat
           case Index[j3] of
           $c0..$ff:
            begin
             a3 := Index[j3] - $bf;
             inc(j3);
             break
            end;
           $67..$6d,$6f..$7b:
            inc(j3);
           $6e:
            begin
             incr(j3);
             b := Index[j3]
            end
           end;
           incr(j3)
          until False;
         Inc(tm,b)
        end
      end
    end
  end;
SQTFile:
  begin
   with Module^ do
    begin
     pptr := SQT_PositionsPointer;
     while Index[pptr] <> 0 do
      begin
       if pptr = SQT_LoopPointer then LoopVBL := tm;
       f41 := Index[pptr] and 128 <> 0;
       j1 := WordPtr(@Index[byte(Index[pptr] * 2) + SQT_PatternsPointer])^;
       Incr(j1);
       Inc(pptr,2);
       if pptr >= 65536 then RaiseBadFileStructure;
       f42 := Index[pptr] and 128 <> 0;
       j2 := WordPtr(@Index[byte(Index[pptr] * 2) + SQT_PatternsPointer])^;
       Incr(j2);
       Inc(pptr,2);
       if pptr >= 65536 then RaiseBadFileStructure;
       f43 := Index[pptr] and 128 <> 0;
       j3 := WordPtr(@Index[byte(Index[pptr] * 2) + SQT_PatternsPointer])^;
       Incr(j3);
       Inc(pptr,2);
       if pptr >= 65536 then RaiseBadFileStructure;
       b := Index[pptr];
       Incr(pptr);
       a1 := 0; a2 := 0; a3 := 0;
       for i := 1 to Index[j1 - 1] do
        begin
         if a1 <> 0 then
          begin
           dec(a1);
           if f71 then
            begin
             cptr := j11;
             f61 := False;
             if Index[cptr] in [0..$7f] then
              begin
               Incr(cptr);
               case Index[cptr] of
               0..$7f:
                begin
                 Incr(cptr);
                 if f61 then j1 := cptr + 1;
                 case Index[cptr - 1] - 1 of
                 4:
                  if f41 then
                   begin
                    b := Index[cptr] and 31;
                    if b = 0 then b := 32
                   end;
                 5:
                  if f41 then
                   begin
                    b := (b + Index[cptr]) and 31;
                    if b = 0 then b := 32
                   end
                 end
                end;
               $80..$ff:
                begin
                 if Index[cptr] and 64 <> 0 then
                  begin
                   Incr(cptr);
                   if Index[cptr] and 15 <> 0 then
                    begin
                     Incr(cptr);
                     if f61 then j1 := cptr + 1;
                     case (Index[cptr - 1]) and 15 - 1 of
                     4:
                      if f41 then
                       begin
                        b := Index[cptr] and 31;
                        if b = 0 then b := 32
                       end;
                     5:
                      if f41 then
                       begin
                        b := (b + Index[cptr]) and 31;
                        if b = 0 then b := 32
                       end
                     end
                    end
                  end
                end
               end
              end
            end
          end
         else
          begin
           if j1 >= 65536 then RaiseBadFileStructure;
           cptr := j1;
           f61 := True;
           f71 := False;
           repeat
            case Index[cptr] of
            0..$5f:
             begin
              j11 := cptr;
              Incr(cptr);
              case Index[cptr] of
              0..$7f:
               begin
                Incr(cptr);
                if f61 then
                 begin
                  j1 := cptr + 1;
                  f61 := False
                 end;
                case Index[cptr - 1] - 1 of
                4:
                 if f41 then
                  begin
                   b := Index[cptr] and 31;
                   if b = 0 then b := 32
                  end;
                5:
                 if f41 then
                  begin
                   b := (b + Index[cptr]) and 31;
                   if b = 0 then b := 32
                  end
                end
               end;
              $80..$ff:
               begin
                if Index[cptr] and 64 <> 0 then
                 begin
                  Incr(cptr);
                  if Index[cptr] and 15 <> 0 then
                   begin
                    Incr(cptr);
                    if f61 then
                     begin
                      j1 := cptr + 1;
                      f61 := False
                     end;
                    case Index[cptr - 1] and 15 - 1 of
                    4:
                     if f41 then
                      begin
                       b := Index[cptr] and 31;
                       if b = 0 then b := 32
                      end;
                    5:
                     if f41 then
                      begin
                       b := (b + Index[cptr]) and 31;
                       if b = 0 then b := 32
                      end
                    end
                   end
                 end
               end
              end;
              Incr(cptr);
              if f61 then j1 := cptr;
              break
             end;
            $60..$6e:
             begin
              Incr(cptr);
              if f61 then j1 := cptr + 1;
              case Index[cptr - 1] - $60 - 1 of
              4:
               if f41 then
                begin
                 b := Index[cptr] and 31;
                 if b = 0 then b := 32
                end;
              5:if f41 then
               begin
                b := (b + Index[cptr]) and 31;
                if b = 0 then b := 32
               end
              end;
              break
             end;
            $6f..$7f:
             begin
              if Index[cptr] <> $6f then
               begin
                Incr(cptr);
                if f61 then j1 := cptr + 1;
                case Index[cptr - 1] - $6f - 1 of
                4:
                 if f41 then
                  begin
                   b := Index[cptr] and 31;
                   if b = 0 then b := 32
                  end;
                5:
                 if f41 then
                  begin
                   b := (b + Index[cptr]) and 31;
                   if b = 0 then b := 32
                  end
                end
               end
              else
               j1 := cptr + 1;
              break
             end;
            $80..$bf:
             begin
              j1 := cptr + 1;
              if Index[cptr] in [$a0..$bf] then
               begin
                a1 := Index[cptr] and 15;
                if Index[cptr] and 16 = 0 then break;
                if a1 <> 0 then f71 := True
               end;
              cptr := j11;
              f61 := False;
              if Index[cptr] in [0..$7f] then
               begin
                Incr(cptr);
                case Index[cptr] of
                0..$7f:
                 begin
                  Incr(cptr);
                  if f61 then j1 := cptr + 1;
                  case Index[cptr - 1] - 1 of
                  4:
                   if f41 then
                    begin
                     b := Index[cptr] and 31;
                     if b = 0 then b := 32
                    end;
                   5:
                    if f41 then
                     begin
                      b := (b + Index[cptr]) and 31;
                      if b = 0 then b := 32
                     end
                   end
                 end;
                $80..$ff:
                 begin
                  if Index[cptr] and 64 <> 0 then
                   begin
                    Incr(cptr);
                    if Index[cptr] and 15 <> 0 then
                     begin
                      Incr(cptr);
                      if f61 then j1 := cptr + 1;
                      case (Index[cptr - 1]) and 15 - 1 of
                      4:
                       if f41 then
                        begin
                         b := Index[cptr] and 31;
                         if b = 0 then b := 32
                        end;
                      5:
                       if f41 then
                        begin
                         b := (b + Index[cptr]) and 31;
                         if b = 0 then b := 32
                        end
                      end
                     end
                   end
                 end
                end
               end;
              break
             end;
            $c0..$ff:
             begin
              j1 := cptr + 1;
              j11 := cptr;
              break
             end
            end
           until False
          end;
         if a2 <> 0 then
          begin
           dec(a2);
           if f72 then
            begin
             cptr := j22;
             f62 := False;
             if Index[cptr] in [0..$7f] then
              begin
               incr(cptr);
               case Index[cptr] of
               0..$7f:
                begin
                 incr(cptr);
                 if f62 then j2 := cptr + 1;
                 case Index[cptr - 1] - 1 of
                 4:
                  if f42 then
                   begin
                    b := Index[cptr] and 31;
                    if b = 0 then b := 32
                   end;
                 5:
                  if f42 then
                   begin
                    b := (b + Index[cptr]) and 31;
                    if b = 0 then b := 32
                   end
                 end
                end;
               $80..$ff:
                begin
                 if Index[cptr] and 64 <> 0 then
                  begin
                   incr(cptr);
                   if Index[cptr] and 15 <> 0 then
                    begin
                     incr(cptr);
                     if f62 then j2 := cptr + 1;
                     case Index[cptr - 1] and 15 - 1 of
                     4:
                      if f42 then
                       begin
                        b := Index[cptr] and 31;
                        if b = 0 then b := 32
                       end;
                     5:
                      if f42 then
                       begin
                        b := (b + Index[cptr]) and 31;
                        if b = 0 then b := 32
                       end
                     end
                    end
                  end
                end
               end
              end
            end
          end
         else
          begin
           if j2 >= 65536 then RaiseBadFileStructure;
           cptr := j2;
           f62 := True;
           f72 := False;
           repeat
            case Index[cptr] of
            0..$5f:
             begin
              j22 := cptr;
              Incr(cptr);
              case Index[cptr] of
              0..$7f:
               begin
                Incr(cptr);
                if f62 then
                 begin
                  j2 := cptr + 1;
                  f62 := False
                 end;
                case Index[cptr - 1] - 1 of
                4:
                 if f42 then
                  begin
                   b := Index[cptr] and 31;
                   if b = 0 then b := 32
                  end;
                5:
                 if f42 then
                  begin
                   b := (b + Index[cptr]) and 31;
                   if b = 0 then b := 32
                  end
                end
               end;
              $80..$ff:
               begin
                if Index[cptr] and 64 <> 0 then
                 begin
                  Incr(cptr);
                  if Index[cptr] and 15 <> 0 then
                   begin
                    Incr(cptr);
                    if f62 then
                     begin
                      j2 := cptr + 1;
                      f62 := False
                     end;
                    case Index[cptr - 1] and 15 - 1 of
                    4:
                     if f42 then
                      begin
                       b := Index[cptr] and 31;
                       if b = 0 then b := 32
                      end;
                    5:
                     if f42 then
                      begin
                       b := (b + Index[cptr]) and 31;
                       if b = 0 then b := 32
                      end
                    end
                   end
                 end
               end
              end;
              incr(cptr);
              if f62 then j2 := cptr;
              break
             end;
            $60..$6e:
             begin
              incr(cptr);
              if f62 then j2 := cptr + 1;
              case Index[cptr - 1] - $60 - 1 of
              4:
               if f42 then
                begin
                 b := Index[cptr] and 31;
                 if b = 0 then b := 32
                end;
              5:
               if f42 then
                begin
                 b := (b + Index[cptr]) and 31;
                 if b = 0 then b := 32
                end
              end;
              break
             end;
            $6f..$7f:
             begin
              if Index[cptr] <> $6f then
               begin
                incr(cptr);
                if f62 then j2 := cptr + 1;
                case Index[cptr - 1] - $6f - 1 of
                4:
                 if f42 then
                  begin
                   b := Index[cptr] and 31;
                   if b = 0 then b := 32
                  end;
                5:
                 if f42 then
                  begin
                   b := (b + Index[cptr]) and 31;
                   if b = 0 then b := 32
                  end
                end
               end
              else
               j2 := cptr + 1;
              break
             end;
            $80..$bf:
             begin
              j2 := cptr + 1;
              if not (Index[cptr] in [$80..$9f]) then
               begin
                a2 := Index[cptr] and 15;
                if Index[cptr] and 16 = 0 then break;
                if a2 <> 0 then f72 := True
               end;
              cptr := j22;
              f62 := False;
              if Index[cptr] in [0..$7f] then
               begin
                incr(cptr);
                case Index[cptr] of
                0..$7f:
                 begin
                  incr(cptr);
                  if f62 then j2 := cptr + 1;
                  case Index[cptr - 1] - 1 of
                  4:
                   if f42 then
                    begin
                     b := Index[cptr] and 31;
                     if b = 0 then b := 32
                    end;
                  5:
                   if f42 then
                    begin
                     b := (b + Index[cptr]) and 31;
                     if b = 0 then b := 32
                    end
                  end
                 end;
                $80..$ff:
                 begin
                  if Index[cptr] and 64 <> 0 then
                   begin
                    incr(cptr);
                    if Index[cptr] and 15 <> 0 then
                     begin
                      incr(cptr);
                      if f62 then j2 := cptr + 1;
                      case Index[cptr - 1] and 15 - 1 of
                      4:
                       if f42 then
                        begin
                         b := Index[cptr] and 31;
                         if b = 0 then b := 32
                        end;
                      5:
                       if f42 then
                        begin
                         b := (b + Index[cptr]) and 31;
                         if b = 0 then b := 32
                        end
                      end
                     end
                   end
                 end
                end
               end;
              break
             end;
            $c0..$ff:
             begin
              j2 := cptr + 1;
              j22 := cptr;
              break
             end
            end
           until False
          end;
         if a3 <> 0 then
          begin
           Dec(a3);
           if f73 then
            begin
             cptr := j33;
             f63 := False;
             if Index[cptr] in [0..$7f] then
              begin
               incr(cptr);
               case Index[cptr] of
               0..$7f:
                begin
                 incr(cptr);
                 if f63 then j3 := cptr + 1;
                 case Index[cptr - 1] - 1 of
                 4:
                  if f43 then
                   begin
                    b := Index[cptr] and 31;
                    if b = 0 then b := 32
                   end;
                 5:
                  if f43 then
                   begin
                    b := (b + Index[cptr]) and 31;
                    if b = 0 then b := 32
                   end
                 end
                end;
               $80..$ff:
                begin
                 if Index[cptr] and 64 <> 0 then
                  begin
                   Incr(cptr);
                   if Index[cptr] and 15 <> 0 then
                    begin
                     Incr(cptr);
                     if f63 then j3 := cptr + 1;
                     case Index[cptr - 1] and 15 - 1 of
                     4:
                      if f43 then
                       begin
                        b := Index[cptr] and 31;
                        if b = 0 then b := 32
                       end;
                     5:
                      if f43 then
                       begin
                        b := (b + Index[cptr]) and 31;
                        if b = 0 then b := 32
                       end
                     end
                    end
                  end
                end
               end
             end
            end
          end
         else
          begin
           if j3 >= 65536 then RaiseBadFileStructure;
           cptr := j3;
           f63 := True;
           f73 := False;
           repeat
            case Index[cptr] of
            0..$5f:
             begin
              j33 := cptr;
              Incr(cptr);
              case Index[cptr] of
              0..$7f:
               begin
                Incr(cptr);
                if f63 then
                 begin
                  j3 := cptr + 1;
                  f63 := False
                 end;
                case Index[cptr - 1] - 1 of
                4:
                 if f43 then
                  begin
                   b := Index[cptr] and 31;
                   if b = 0 then b := 32
                  end;
                5:
                 if f43 then
                  begin
                   b := (b + Index[cptr]) and 31;
                   if b = 0 then b := 32
                  end
                end
               end;
              $80..$ff:
               begin
                if Index[cptr] and 64 <> 0 then
                 begin
                  Incr(cptr);
                  if Index[cptr] and 15 <> 0 then
                   begin
                    Incr(cptr);
                    if f63 then
                     begin
                      j3 := cptr + 1;
                      f63 := False
                     end;
                    case Index[cptr - 1] and 15 - 1 of
                    4:
                     if f43 then
                      begin
                       b := Index[cptr] and 31;
                       if b = 0 then b := 32
                      end;
                    5:
                     if f43 then
                      begin
                       b := (b + Index[cptr]) and 31;
                       if b = 0 then b := 32
                      end
                    end
                   end
                 end
               end
              end;
              incr(cptr);
              if f63 then j3 := cptr;
              break
             end;
            $60..$6e:
             begin
              incr(cptr);
              if f63 then j3 := cptr + 1;
              case Index[cptr - 1] - $60 - 1 of
              4:
               if f43 then
                begin
                 b := Index[cptr] and 31;
                 if b = 0 then b := 32
                end;
              5:
               if f43 then
                begin
                 b := (b + Index[cptr]) and 31;
                 if b = 0 then b := 32
                end
              end;
              break
             end;
            $6f..$7f:
             begin
              if Index[cptr] <> $6f then
               begin
                Incr(cptr);
                if f63 then j3 := cptr + 1;
                case Index[cptr - 1] - $6f - 1 of
                4:
                 if f43 then
                  begin
                   b := Index[cptr] and 31;
                   if b = 0 then b := 32
                  end;
                5:
                 if f43 then
                  begin
                   b := (b + Index[cptr]) and 31;
                   if b = 0 then b := 32
                  end
                end
               end
              else
               j3 := cptr + 1;
              break
             end;
            $80..$bf:
             begin
              j3 := cptr + 1;
              if not (Index[cptr] in [$80..$9f]) then
               begin
                a3 := Index[cptr] and 15;
                if Index[cptr] and 16 = 0 then break;
                if a3 <> 0 then f73 := True
               end;
              cptr := j33;
              f63 := False;
              if Index[cptr] in [0..$7f] then
               begin
                Incr(cptr);
                case Index[cptr] of
                0..$7f:
                 begin
                  Incr(cptr);
                  if f63 then j3 := cptr + 1;
                  case Index[cptr - 1] - 1 of
                   4:
                    if f43 then
                     begin
                      b := Index[cptr] and 31;
                      if b = 0 then b := 32
                     end;
                   5:
                    if f43 then
                     begin
                      b := (b + Index[cptr]) and 31;
                      if b = 0 then b := 32
                     end
                   end
                 end;
                $80..$ff:
                 begin
                  if Index[cptr] and 64 <> 0 then
                   begin
                    Incr(cptr);
                    if Index[cptr] and 15 <> 0 then
                     begin
                      Incr(cptr);
                      if f63 then j3 := cptr + 1;
                      case Index[cptr - 1] and 15 - 1 of
                      4:
                       if f43 then
                        begin
                         b := Index[cptr] and 31;
                         if b = 0 then b := 32
                        end;
                      5:
                       if f43 then
                        begin
                         b := (b + Index[cptr]) and 31;
                         if b = 0 then b := 32
                        end
                      end
                     end
                   end
                 end
                end
               end;
              break
             end;
            $c0..$ff:
             begin
              j3 := cptr + 1;
              j33 := cptr;
              break
             end;
            end
           until False
          end;
         Inc(tm,b)
        end
      end
    end
  end;
FTCFile:
  begin
   with Module^ do
    begin
     b := FTC_Delay;
     i := 0;
     repeat
      if FTC_Positions[i].Pattern = 255 then break;
      if i = FTC_Loop_Position then LoopVBL := tm;
      j1 := WordPtr(@Index[FTC_PatternsPointer +
                           FTC_Positions[i].Pattern * 6])^;
      j2 := WordPtr(@Index[FTC_PatternsPointer +
                           FTC_Positions[i].Pattern * 6 + 2])^;
      j3 := WordPtr(@Index[FTC_PatternsPointer +
                           FTC_Positions[i].Pattern * 6 + 4])^;
      Inc(i);
      if i >= (65536 - $d4) div 2 then RaiseBadFileStructure;
      a1 := 0; a2 := 0; a3 := 0;
      DLCatcher := 256;
      repeat
       Dec(a1);
       if a1 < 0 then
        begin
         if Index[j1] = 255 then break;
         repeat
          case Index[j1] of
          $30,$60..$cb:
           begin
            a1 := 0;
            Incr(j1);
            break
           end;
          $40..$5f:
           begin
            a1 := Index[j1] - $40;
            Incr(j1);
            break
           end;
          $ee,$ef:
           Inc(j1);
          $31..$3e,$ed:
           Inc(j1,2);
          $f0..$ff:
           begin
            Incr(j1);
            b := Index[j1]
           end
          end;
          Incr(j1)
         until False
        end;
        Dec(a2);
        if a2 < 0 then
         repeat
          case Index[j2]of
          $30,$60..$cb:
           begin
            a2 := 0;
            Incr(j2);
            break
           end;
          $40..$5f:
           begin
            a2 := Index[j2] - $40;
            Incr(j2);
            break
           end;
          $ee,$ef:
           inc(j2);
          $31..$3e,$ed:
           inc(j2,2);
          $f0..$ff:
           begin
            incr(j2);
            b := Index[j2]
           end
          end;
          Incr(j2)
         until False;
        Dec(a3);
        if a3 < 0 then
         repeat
          case Index[j3] of
          $30,$60..$cb:
           begin
            a3 := 0;
            Incr(j3);
            break
           end;
          $40..$5f:
           begin
            a3 := Index[j3] - $40;
            Incr(j3);
            break
           end;
          $ee,$ef:
           inc(j3);
          $31..$3e,$ed:
           inc(j3,2);
          $f0..$ff:
           begin
            Incr(j3);
            b := Index[j3]
           end
          end;
          Incr(j3)
         until False;
        Inc(tm,b);
        Dec(DLCatcher);
        if DLCatcher < 0 then RaiseBadFileStructure
      until False
     until False
    end
  end;
PT1File:
  begin
   with Module^ do
    begin
     b := PT1_Delay;
     a1 := 0; a2 := 0; a3 := 0;
     a11 := 0; a22 := 0; a33 := 0;
     DLCatcher := 16384;
     for i := 0 to PT1_NumberOfPositions - 1 do
      begin
       if i = PT1_LoopPosition then LoopVBL := tm;
       j1 := WordPtr(@Index[PT1_PatternsPointer +
                                        PT1_PositionList[i] * 6])^;
       j2 := WordPtr(@Index[PT1_PatternsPointer +
                                        PT1_PositionList[i] * 6 + 2])^;
       j3 := WordPtr(@Index[PT1_PatternsPointer +
                                        PT1_PositionList[i] * 6 + 4])^;
       repeat
        Dec(a1);
        if a1 < 0 then
         begin
          if Index[j1] = 255 then break;
           repeat
            case Index[j1] of
            $80,$90,0..$5f:
             begin
              a1 := a11;
              Incr(j1);
              break
             end;
            $82..$8f:
             Inc(j1,2);
            $b1..$fe:
             a11 := Index[j1] - $b1;
            $91..$a0:
             b := Index[j1] - $91;
            end;
            Incr(j1)
           until False
         end;
        Dec(a2);
        if a2 < 0 then
         repeat
          case Index[j2] of
          $80,$90,0..$5f:
           begin
            a2 := a22;
            Incr(j2);
            break
           end;
          $82..$8f:
           Inc(j2,2);
          $b1..$fe:
           a22 := Index[j2] - $b1;
          $91..$a0:
           b := Index[j2] - $91
          end;
          Incr(j2)
         until False;
        Dec(a3);
        if a3 < 0 then
         repeat
          case Index[j3] of
          $80,$90,0..$5f:
           begin
            a3 := a33;
            Incr(j3);
            break
           end;
          $82..$8f:
           Inc(j3,2);
          $b1..$fe:
           a33 := Index[j3] - $b1;
          $91..$a0:
           b := Index[j3] - $91
          end;
          Incr(j3)
         until False;
        Inc(tm,b);
        Dec(DLCatcher);
        if DLCatcher < 0 then RaiseBadFileStructure
       until False
      end
    end
  end;
FLSFile:
  begin
   with Module^ do
    begin
     b := Index[FLS_PositionsPointer];
     a1 := 0; a11 := 0; i := 0;
     repeat
      pptr := i + FLS_PositionsPointer + 1;
      if pptr >= 65536 then RaiseBadFileStructure;
      if Index[pptr] = 0 then break;
      j1 := FLS_PatternsPointers[Index[pptr]].PatternA;
      repeat
       Dec(a1);
       if a1 < 0 then
        begin
         if Index[j1] = 255 then break;
         repeat
          case Index[j1] of
          0..$5f,$80,$81:
           begin
            Incr(j1);
            a1 := a11;
            break
           end;
          $82..$8e:
           Inc(j1);
          $8f..$ff:
           a11 := Index[j1] - $a1
          end;
          Incr(j1)
         until False
        end;
       Inc(tm,b)
      until False;
      Inc(i)
     until False
    end
  end;
GTRFile:
  begin
   with Module^ do
    begin
     a := 0; a1 := 0; flg := False;
     j1 := GTR_PatternsPointers[GTR_Positions[0] div 6].PatternA;
     repeat
      Dec(a1);
      if a1 < 0 then
       begin
        a1 := 0;
        while Index[j1] = 255 do
         begin
          Inc(a);
          if a = GTR_LoopPosition then LoopVBL := tm;
          flg := a >= GTR_NumberOfPositions;
          if flg then break;
          j1 := GTR_PatternsPointers[Module.GTR_Positions[a] div 6].PatternA
         end;
        if flg then break;
        repeat
         case Index[j1] of
         0..$5f,$D0..$DF:
          begin
           Incr(j1);
           break
          end;
         $80..$BF:
          a1 := Index[j1] - $80;
         $C0..$CF:
          Inc(j1)
         end;
         Incr(j1)
        until False
       end;
      Inc(tm,GTR_Delay)
     until False
    end
  end;
FXMFile:
  begin
   with Module^ do
    begin
     if Address > 65536 - 6 then RaiseBadFileStructure;
     j1 := WordPtr(@Index[Address])^;
     j2 := WordPtr(@Index[Address + 2])^;
     j3 := WordPtr(@Index[Address + 4])^;
     a1 := 1; a2 := 1; a3:= 1;
     f71 := False; f72 := False; f73 := False;
     f61 := False; f62 := False; f63 := False;
     repeat
      Dec(a1);
      if a1 = 0 then
       begin
        f71 := False;
        f61 := False;
        repeat
         case Index[j1] of
         0..$7F,$8F..$FF:
          begin
           Incr(j1);
           a1 := Index[j1];
           Incr(j1);
           break
          end;
         $80:
          begin
           if j1 >= 65536 - 2 then RaiseBadFileStructure;
           j1 := WordPtr(@Index[j1 + 1])^;
           j11 := j1;
           f71 := True
          end;
         $81:
          begin
           if j1 >= 65536 - 3 then RaiseBadFileStructure;
           k := System.Length(fxms1);
           SetLength(fxms1,k + 1);
           fxms1[k] := j1 + 3;
           j1 := WordPtr(@Index[j1 + 1])^
          end;
         $82:
          begin
           k := System.Length(fxms1);
           SetLength(fxms1,k + 2);
           Incr(j1);
           fxms1[k] := Index[j1];
           Incr(j1);
           fxms1[k + 1] := j1
          end;
         $83:
          begin
           k := System.Length(fxms1);
           if k < 2 then RaiseBadFileStructure;
           Dec(fxms1[k - 2]);
           if fxms1[k - 2] and 255 <> 0 then
            begin
             j1 := fxms1[k - 1];
             if j1 < 2 then RaiseBadFileStructure;
             j11 := j1 - 2;
             f61 := True
            end
           else
            begin
             SetLength(fxms1,k - 2);
             Inc(j1)
            end
          end;
         $84,$85,$88,$8D,$8E:
          Inc(j1,2);
         $86,$87,$8C:
          Inc(j1,3);
         $89:
          begin
           k := System.Length(fxms1);
           if k < 1 then RaiseBadFileStructure;
           j1 := fxms1[k - 1];
           SetLength(fxms1,k - 1)
          end;
         $8A,$8B:
          Inc(j1)
         end;
         if j1 >= 65536 then RaiseBadFileStructure
        until False;
       end;
      Dec(a2);
      if a2 = 0 then
       begin
        f72 := False;
        f62 := False;
        repeat
         case Index[j2] of
         0..$7F,$8F..$FF:
          begin
           Incr(j2);
           a2 := Index[j2];
           Incr(j2);
           break
          end;
         $80:
          begin
           if j2 >= 65536 - 2 then RaiseBadFileStructure;
           j2 := WordPtr(@Index[j2 + 1])^;
           j22 := j2;
           f72 := True
          end;
         $81:
          begin
           if j2 >= 65536 - 3 then RaiseBadFileStructure;
           k := System.Length(fxms2);
           SetLength(fxms2,k + 1);
           fxms2[k] := j2 + 3;
           j2 := WordPtr(@Module.Index[j2 + 1])^
          end;
         $82:
          begin
           k := System.Length(fxms2);
           SetLength(fxms2,k + 2);
           Incr(j2);
           fxms2[k] := Index[j2];
           Incr(j2);
           fxms2[k + 1] := j2
          end;
         $83:
          begin
           k := System.Length(fxms2);
           if k < 2 then RaiseBadFileStructure;
           Dec(fxms2[k - 2]);
           if fxms2[k - 2] and 255 <> 0 then
            begin
             j2 := fxms2[k - 1];
             if j2 < 2 then RaiseBadFileStructure;
             j22 := j2 - 2;
             f62 := True
            end
           else
            begin
             SetLength(fxms2,k - 2);
             Inc(j2)
            end
          end;
         $84,$85,$88,$8D,$8E:
          Inc(j2,2);
         $86,$87,$8C:
          Inc(j2,3);
         $89:
          begin
           k := System.Length(fxms2);
           if k < 1 then RaiseBadFileStructure;
           j2 := fxms2[k - 1];
           SetLength(fxms2,k - 1)
          end;
         $8A,$8B:
          Inc(j2)
         end;
         if j2 >= 65536 then RaiseBadFileStructure
        until False;
       end;
      Dec(a3);
      if a3 = 0 then
       begin
        f73 := False;
        f63 := False;
        repeat
         case Index[j3] of
         0..$7F,$8F..$FF:
          begin
           Incr(j3);
           a3 := Index[j3];
           Incr(j3);
           break
          end;
         $80:
          begin
           if j3 >= 65536 - 2 then RaiseBadFileStructure;
           j3 := WordPtr(@Index[j3 + 1])^;
           j33 := j3;
           f73 := True
          end;
         $81:
          begin
           if j3 >= 65536 - 3 then RaiseBadFileStructure;
           k := System.Length(fxms3);
           SetLength(fxms3,k + 1);
           fxms3[k] := j3 + 3;
           j3 := WordPtr(@Index[j3 + 1])^
          end;
         $82:
          begin
           k := System.Length(fxms3);
           SetLength(fxms3,k + 2);
           Incr(j3);
           fxms3[k] := Index[j3];
           Incr(j3);
           fxms3[k + 1] := j3
          end;
         $83:
          begin
           k := System.Length(fxms3);
           if k < 2 then RaiseBadFileStructure;
           Dec(fxms3[k - 2]);
           if fxms3[k - 2] and 255 <> 0 then
            begin
             j3 := fxms3[k - 1];
             if j3 < 2 then RaiseBadFileStructure;
             j33 := j3 - 2;
             f63 := True
            end
           else
            begin
             SetLength(fxms3,k - 2);
             Inc(j3)
            end
          end;
         $84,$85,$88,$8D,$8E:
          Inc(j3,2);
         $86,$87,$8C:
          Inc(j3,3);
         $89:
          begin
           k := System.Length(fxms3);
           if k < 1 then RaiseBadFileStructure;
           j3 := fxms3[k - 1];
           SetLength(fxms3,k - 1)
          end;
         $8A,$8B:
          Inc(j3)
         end;
         if j3 >= 65536 then RaiseBadFileStructure
        until False
       end;
      Inc(tm);
      if tm > 180000 then
       begin
        tm := 15001;
        break
       end
     until ((f71 and (f72 or f62) and (f73 or f63)) or
            ((f71 or f61) and f72 and (f73 or f63)) or
            ((f71 or f61) and (f72 or f62) and f73)
           ) and FXM_Loop_Found(j11,j22,j33);
     Dec(tm)
    end
  end;
BASSFileMin..BASSFileMax:
 begin
  Lp := -1;
  LoadBASS;
  if not BASSInitialized then InitBASS(BASS_NOSOUNDDEVICE,SampleRate,0,0);
  if FileType in [StreamFileMin..StreamFileMax] then
   begin
    bassh := BASS_StreamCreateFile(False,pchar(FileName),0,0,BASS_STREAM_DECODE);
    if bassh = 0 then RaiseLastBASSError;
    Tm := BASS_StreamGetLength(bassh);
    if Tm = -1 then RaiseLastBASSError;
    Tm := round(BASS_ChannelBytes2Seconds(bassh,Tm) * 1000);
    BASSGetTags(Author,Title,bassh,FileType);
    BASS_StreamFree(bassh)
   end
  else
   begin
    bassh := BASS_MusicLoad(False,pchar(FileName),0,0,BASS_MUSIC_STOPBACK or
                                BASS_MUSIC_CALCLEN or BASS_MUSIC_NOSAMPLE,0);
    if bassh = 0 then RaiseLastBASSError;
    Tm := BASS_MusicGetLength(bassh,True);
    if Tm = -1 then RaiseLastBASSError;
    Tm := round(BASS_ChannelBytes2Seconds(bassh,Tm) * 1000);
    BASSGetTags(Author,Title,bassh,FileType);
    BASS_MusicFree(bassh)
   end
 end;
CDAFile:
 begin
  Lp := -1;
  InitCDDevice(Address);
  if not CheckCDNum(Address) then exit;
  MSF.MSF := CDGetTrackLength(Address,Offset);
  Tm := MSF.F + (MSF.S + MSF.M * 60) * 75
 end
end

finally

if (FileType in [TrkFileMin..TrkFileMax]) and not AlreadyLoaded then
 Dispose(Module);
if Tm = 0 then Error := ErBadFileStructure

end;

if Tm <> 0 then
 begin
  Time := Tm;
  if CalculateTotalTime(False) then
   begin
    if BASSInitialized and (BASSDevice = BASS_NOSOUNDDEVICE) then
     begin
      FreeBASS;
      UnloadBASS
     end;
    if not IsPlaying or (CurFileType <> CDAFile) then
     FreeAllCD
   end
 end

except
on EBASSError do Error := ErBASSError;
on EFileStructureError do Error := ErBadFileStructure;
else if Error = FileNoError then Error := ErReadingFile
end

end
end;

procedure PrepareItem(Index:integer);

 function TrModLoaded:boolean;
 begin
  if LoadTrackerModule(RAM,Index) then
   begin
    FileLoaded := True;
    Result := True;
    CurFileType := PlayListItems[Index].FileType
   end
  else
   begin
    Result := False;
    FileAvailable := False
   end
 end;

const
 Dump:packed array[0..11] of byte=
  ($F3,$AF,$CD,0,0,$FB,$76,$CD,0,0,$18,$F9);
var
 i,i1,i2,k,k2:integer;
 sh:shortint;
 b:byte;
 j:longword;
 AYMBlock:TAYMBlock;
 
begin
with PlayListItems[Index]^ do
 begin
  if not FileExists(FileName) then
   begin
    FreePlayingResourses;
    Error := ErFileNotFound;
{$IFDEF WIN32GUI}
    RedrawItem(0,Index);
{$ENDIF WIN32GUI}
    FileAvailable := False
   end
  else
   begin
    if Error <> FileNoError then
     begin
      Error := FileNoError;
{$IFDEF WIN32GUI}
      RedrawItem(0,Index)
{$ENDIF WIN32GUI}
     end;
    case FileType of
    OUTFile:
      begin
       UniReadInit(FileHandle,URFile,FileName,nil);
       FileOpened := True;
       CurFileType := OUTFile;
       MakeBuffer := MakeBufferOUT;
       All_GetRegisters := OUT_Get_Registers;
      end;
    VTXFile:
      begin
       UniReadInit(FileHandle,URFile,FileName,nil);
       UniFileSeek(FileHandle,Offset);
       GetMem(PVTXYMUnpackedData,UnpackedSize);
       Compressed_Size := Length;
       Original_Size := UnpackedSize;
       UniAddDepacker(FileHandle,UDLZH);
       try
        UniRead(FileHandle,PVTXYMUnpackedData,UnpackedSize);
       except
        FreeMem(PVTXYMUnpackedData);
        Error := ErLZHDataIsNotValid;
{$IFDEF WIN32GUI}
        RedrawItem(0,Index);
{$ENDIF WIN32GUI}
        FileAvailable := False
       end;
       UniReadClose(FileHandle);
       if Error = FileNoError then
        begin
         FileLoaded := True;
         CurFileType := VTXFile;
         VTX_Offset := 0;
         NumberOfVBLs := UnpackedSize div 14;
         MakeBuffer := MakeBufferVTX;
         All_GetRegisters := VTX_YM2_YM3_YM3b_Get_Registers
        end
      end;
    YM2File..YM6File:
      begin
       UniReadInit(FileHandle,URFile,FileName,nil);
       GetMem(PVTXYMUnpackedData,UnpackedSize);
       if Offset <> 0 then
        begin
         UniFileSeek(FileHandle,Offset);
         Compressed_Size := Length;
         Original_Size := UnpackedSize;
         UniAddDepacker(FileHandle,UDLZH);
        end;
       try
        UniRead(FileHandle,PVTXYMUnpackedData,UnpackedSize);
       except
        on EInvalidCompressedData do
         Error := ErLZHDataIsNotValid;
        else
         Error := ErReadingFile;
        FreeMem(PVTXYMUnpackedData);
{$IFDEF WIN32GUI}
        RedrawItem(0,Index);
{$ENDIF WIN32GUI}
        FileAvailable := False
       end;
       UniReadClose(FileHandle);
       if Error = FileNoError then
        begin
         CurFileType := FileType;
         FileLoaded := True;
         case FileType of
         YM2File..YM3bFile:
          begin
           if FileType = YM3bFile then
            begin
             NumberOfVBLs := (UnpackedSize - 8) div 14;
             if Loop < 0 then
              Loop := DWordPtr(@PVTXYMUnpackedData^[UnpackedSize - 4])^
            end
           else
            NumberOfVBLs := (UnpackedSize - 4) div 14;
           VTX_Offset := 4;
           MakeBuffer := MakeBufferVTX;
           All_GetRegisters := VTX_YM2_YM3_YM3b_Get_Registers;
          end;
         YM5File,YM6File:
          begin
           VTX_Offset := FormatSpec;
           NumberOfVBLs := IntelDWord(
                         PYM5FileHeader(PVTXYMUnpackedData)^.Num_of_tiks);
           i := IntelWord(PYM5FileHeader(PVTXYMUnpackedData)^.Num_of_Dig);
           if i > 0 then
            begin
             SetLength(DDrumSamples,i);
             i2 := 34 + IntelWord(
                        PYM5FileHeader(PVTXYMUnpackedData)^.Add_Size);
             i1 := 0;
             while i > 0 do
              begin
               j := IntelDWord(DWordPtr(
                        @PVTXYMUnpackedData^[i2])^);
               DDrumSamples[i1].Length := j;
               DDrumSamples[i1].Buf := @PVTXYMUnpackedData^[i2 + 4];
               inc(i2,j + 4);
               inc(i1);
               dec(i)
              end;
             if PYM5FileHeader(PVTXYMUnpackedData)^.
                         Song_Attr and $06000000 = $02000000 then
              for i := 0 to System.Length(DDrumSamples) - 1 do
               for i1 := 0 to DDrumSamples[i].Length - 1 do
                begin
                 sh := shortint(DDrumSamples[i].Buf[i1]);
                 k2 := round((sh + 128)/255*65535);
                 k := 1;
                 while (k < 32) and (Amplitudes_YM[k] < k2) do
                  inc(k,2);
                 if k > 1 then
                  if Amplitudes_YM[k] - k2 >
                                 k2 - Amplitudes_YM[k - 2] then
                   dec(k,2);
                 DDrumSamples[i].Buf[i1] := k div 2
                end
             else if PYM5FileHeader(PVTXYMUnpackedData)^.
                              Song_Attr and $06000000 = 0 then
              for i := 0 to System.Length(DDrumSamples) - 1 do
               for i1 := 0 to DDrumSamples[i].Length - 1 do
                begin
                 b := DDrumSamples[i].Buf[i1];
                 k2 := round(b/255*65535);
                 k := 1;
                 while (k < 32) and (Amplitudes_YM[k] < k2) do
                  inc(k,2);
                 if k > 1 then
                  if Amplitudes_YM[k] - k2 >
                                 k2 - Amplitudes_YM[k - 2] then
                   dec(k,2);
                 DDrumSamples[i].Buf[i1] := k div 2
                end
            end;
           if FileType = YM5File then
            begin
             MakeBuffer := MakeBufferYM5;
             if BytePtr(pointer(integer(
                        PVTXYMUnpackedData) + 19))^ and 1 <> 0 then
              All_GetRegisters := YM5i_Get_Registers
             else
              All_GetRegisters := YM5_Get_Registers
            end
           else
            begin
             MakeBuffer := MakeBufferYM6;
             if BytePtr(pointer(integer(
                        PVTXYMUnpackedData) + 19))^ and 1 <> 0 then
              All_GetRegisters := YM6i_Get_Registers
             else
              All_GetRegisters := YM6_Get_Registers
            end
          end
         end
        end
      end;
    EPSGFile:
      begin
       UniReadInit(FileHandle,URFile,FileName,nil);
       FileOpened := True;
       CurFileType := EPSGFile;
       MakeBuffer := MakeBufferEPSG;
       All_GetRegisters := EPSG_Get_Registers;
       EPSG_TStateMax := FormatSpec
      end;
    PSGFile:
      begin
       UniReadInit(FileHandle,URFile,FileName,nil);
       FileOpened := True;
       CurFileType := PSGFile;
       MakeBuffer := MakeBufferPSG;
       All_GetRegisters := PSG_Get_Registers;
      end;
    ZXAYFile:
      begin
       UniReadInit(FileHandle,URFile,FileName,nil);
       FileOpened := True;
       CurFileType := ZXAYFile;
       MakeBuffer := MakeBufferZXAY;
       All_GetRegisters := ZXAY_Get_Registers
      end;
    PT3File:
      if TrModLoaded then
       begin
        PlParams.PT3.PT3_Version := 6;
        if RAM.PT3_MusicName[13] in ['0'..'9'] then
         PlParams.PT3.PT3_Version := Ord(RAM.PT3_MusicName[13]) - $30;
        MakeBuffer := MakeBufferPT3;
        All_GetRegisters := PT3_Get_Registers
       end;
    PT2File:
      if TrModLoaded then
       begin
        MakeBuffer := MakeBufferPT2;
        All_GetRegisters := PT2_Get_Registers
       end;
    STCFile:
      if TrModLoaded then
       begin
        MakeBuffer := MakeBufferSTC;
        All_GetRegisters := STC_Get_Registers
       end;
    STPFile:
      if TrModLoaded then
       begin
        MakeBuffer := MakeBufferSTP;
        All_GetRegisters := STP_Get_Registers
       end;
    ASCFile,ASC0File:
      if TrModLoaded then
       begin
        MakeBuffer := MakeBufferASC;
        All_GetRegisters := ASC_Get_Registers
       end;
    PSCFile:
      if TrModLoaded then
       begin
        MakeBuffer := MakeBufferPSC;
        All_GetRegisters := PSC_Get_Registers
       end;
    SQTFile:
      if TrModLoaded then
       begin
        MakeBuffer := MakeBufferSQT;
        All_GetRegisters := SQT_Get_Registers
       end;
    FTCFile:
      if TrModLoaded then
       begin
        MakeBuffer := MakeBufferFTC;
        All_GetRegisters := FTC_Get_Registers
       end;
    PT1File:
      if TrModLoaded then
       begin
        MakeBuffer := MakeBufferPT1;
        All_GetRegisters := PT1_Get_Registers
       end;
    FLSFile:
      if TrModLoaded then
       begin
        MakeBuffer := MakeBufferFLS;
        All_GetRegisters := FLS_Get_Registers
       end;
    GTRFile:
      if TrModLoaded then
       begin
        MakeBuffer := MakeBufferGTR;
        All_GetRegisters := GTR_Get_Registers
       end;
    FXMFile:
      if TrModLoaded then
       begin
        PlParams.FXM.Address := Address;
        PlParams.FXM.amad_andsix := FormatSpec;
        MakeBuffer := MakeBufferFXM;
        All_GetRegisters := FXM_Get_Registers
       end;
    AYFile:
     begin
      UniReadInit(FileHandle,URFile,FileName,nil);
      UniFileSeek(FileHandle,Offset);
      UniRead(FileHandle,@AYSongData,SizeOf(TSongData));
      i := UniReadersData[FileHandle].UniFilePos;
      UniFileSeek(FileHandle,smallint(IntelWord(AYSongData.PPoints)) + i - 4);
      UniRead(FileHandle,@AYPoints,SizeOf(TPoints));
      AYPoints.Stek := IntelWord(AYPoints.Stek);
      AYPoints.Init := IntelWord(AYPoints.Init);
      AYPoints.Inter := IntelWord(AYPoints.Inter);
      AYBlocks := smallint(IntelWord(AYSongData.PAddresses)) + i - 2;
      FileOpened := True;
      CurFileType := AYFile;
      MakeBuffer := MakeBufferAY;
      All_GetRegisters := AY_Get_Registers
     end;
    AYMFile:
     begin
      UniReadInit(FileHandle,URFile,FileName,nil);
      UniRead(FileHandle,@AYMFileHeader,SizeOf(TAYMFileHeader));
      FillChar(RAM.Index[12],255 - 12 + 1,201);
      FillChar(RAM.Index[256],16383 - 256 + 1,255);
      FillChar(RAM.Index[16384],65535 - 16384 + 1,0);
      RAM.Index[56] := $FB;
      for i := 0 to AYMFileHeader.Blocks - 1 do
       begin
        UniRead(FileHandle,@AYMBlock,SizeOf(AYMBlock));
        i1 := AYMBlock.size;
        if AYMBlock.start + i1 > 65536 then
         i1 := 65536 - AYMBlock.start;
        if i1 > UniReadersData[FileHandle].UniFileSize -
                                UniReadersData[FileHandle].UniFilePos then
         i1 := UniReadersData[FileHandle].UniFileSize -
                                UniReadersData[FileHandle].UniFilePos;
        UniRead(FileHandle,@RAM.Index[AYMBlock.start],i1)
       end;
      Move(Dump,RAM,12);
      WordPtr(@RAM.Index[3])^ := AYMFileHeader.Init;
      WordPtr(@RAM.Index[8])^ := AYMFileHeader.Play;
      AYBlocks := FormatSpec;
      UniReadClose(FileHandle);
      FileLoaded := True;
      CurFileType := AYMFile;
      MakeBuffer := MakeBufferAY;
      All_GetRegisters := AY_Get_Registers
     end;
    BASSFileMin..BASSFileMax:
     begin
      if Time = 0 then
       try
        GetTime(-1,Index,True,i)
       except
        Error := ErBASSError
       end;
      CurFileType := FileType
     end;
    CDAFile:
     begin
      CurCDTrk := Offset;
      if CurCDNum <> Address then
       if (Address >= 0) and (Address < System.Length(CDDrives)) then
        begin
         FreeAllCD;
         CurCDNum := Address
        end 
       else
        Error := ErFileNotFound;
      if (Error = FileNoError) and (Time = 0) then
       try
        GetTime(-1,Index,True,i)
       except
        Error := ErFileNotFound
       end;
      CurFileType := CDAFile
     end
    end
   end
 end
end;

procedure PlayCurrent;
begin
{case ChType of
AY_Chip:
 begin
  Led_AY.State := False;
  Led_YM.State := True
 end;
YM_Chip:
 begin
  Led_AY.State := True;
  Led_YM.State := False
 end
end;
Led_Stereo.State := NumberOfChannels = 1;
Led_AY.Redraw(False);
Led_YM.Redraw(False);
Led_Stereo.Redraw(False);}

{$IFDEF WIN32GUI}
ButPlay.Switch_On;
//Form1.ShowAllParams;
ButPause.Switch_Off;
ButStop.UnPush;
{$ENDIF WIN32GUI}
{Form2.GroupBox3.Enabled := False;
Form2.GroupBox4.Enabled := False;
Form2.Buff.Enabled := False;
Form2.GroupBox10.Enabled := False;
Form2.RadioButton13.Enabled := False;
Form2.RadioButton14.Enabled := False;
Form1.FIDO_SaveStatus(FIDO_Playing);}

try
 InitForAllTypes(True);
if CurFileType in [BASSFileMin..BASSFileMax] then
 StartBASS
else if CurFileType <> CDAFile then
 StartWaveOut
else
 StartCD(CurCDNum,CurCDTrk)
except
 RestoreControls;
 ShowException(ExceptObject, ExceptAddr)
end
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

function GetPlayListString;
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

procedure UpdateStatus(Index:integer);
var
 i:integer;
begin
CurItem.PLStr := GetPlayListString(PlayListItems[Index]);
with PlayListItems[Index]^ do
 begin
  CurItem.Title := Title;
  CurItem.Author := Author;
  CurItem.Programm := Programm;
  CurItem.Comment := Comment;
  CurItem.Tracker := Tracker;
  CurItem.FileName := FileName
 end;
Applet.Caption := CurItem.PLStr;
{i := Length(CurItem.PLStr);
if i > 63 then i := 60;
move(CurItem.PLStr[1],TrIcon.SzTip[0],i);
TrIcon.SzTip[i] := #0;
if Length(CurItem.PLStr) > 63 then
 DWORDPtr(@TrIcon.SzTip[60])^ := $2E2E2E;
Form1.ChangeTrayIcon}
end;

procedure PlayItem;
var
 i:integer;
begin
if (Index < 0) or (Index >= Length(PlayListItems)) then exit;
StopPlaying;
FreePlayingResourses;
PlayingOrderItem := Index;
Index := PlayingOrder[Index];
i := PlayingItem;
PlayingItem := Index;
{$IFDEF WIN32GUI}
if i >= 0 then RedrawItem(0,i);
RedrawItem(0,Index);
{$ENDIF WIN32GUI}
PrepareItem(Index);
if not (CurFileType in [BASSFileMin..BASSFileMax]) then
 begin
  FreeBASS;
  UnloadBASS
 end;
if CurFileType <> CDAFile then
 FreeAllCD;
if not (CurFileType in [AYYMFileMin..AYYMFileMax]) then
 CloseWaveOut;
with PlayListItems[Index]^ do
 begin
{$IFDEF WIN32GUI}
  MakeVisible(Index,False);
{$ENDIF WIN32GUI}
  Scroll_Distination := Index;
  if Error <> FileNoError then
   begin
    Time_ms := 0;
    ClearTimeInd := True;
    UpdateStatus(Index);
   {$IFDEF WIN32GUI}
    PostMessage(WHandle,WM_PLAYNEXTITEM,0,0);
   {$ENDIF WIN32GUI}
   {$IFDEF WIN32CONSOLE}
    PostThreadMessage(AThreadID,WM_PLAYNEXTITEM,0,0);
   {$ENDIF WIN32CONSOLE}
    exit
   end;

  i := -1;
  if Time = 0 then
   begin
    GetTime(FileHandle,Index,True,i);
{$IFDEF WIN32GUI}
    RedrawItem(0,Index);
{$ENDIF WIN32GUI}
    if Error <> FileNoError then
     begin
      Time_ms := 0;
      ClearTimeInd := True;
      UpdateStatus(Index);
     {$IFDEF WIN32GUI}
      PostMessage(WHandle,WM_PLAYNEXTITEM,0,0);
     {$ENDIF WIN32GUI}
     {$IFDEF WIN32CONSOLE}
      PostThreadMessage(AThreadID,WM_PLAYNEXTITEM,0,0);
     {$ENDIF WIN32CONSOLE}
      exit
     end
   end;

  if Loop < 0 then
   Loop := i;
  LoopVBL := Loop;
  if LoopVBL < 0 then LoopVBL := 0;
  if FileType in [OUTFile,ZXAYFile,EPSGFile,BASSFileMin..BASSFileMax] then
   begin
    ProgrMax := Time;
    Time_ms := Time
   end
  else if (FileType = AYFile) or (FileType = AYMFile) then
   begin
    Time_ms := round(Time / FrqZ80 *  MaxTStates * 1000);
    Global_Tick_Max := Time
   end
  else if FileType = CDAFile then
   begin
    ProgrMax := Time;
    Time_ms := round(Time * 1000 / 75)
   end
  else
   begin
    Time_ms := round(Time / Interrupt_Freq * 1000000);
    Global_Tick_Max := Time
   end;

  FileAvailable := True;

  ChType := Mixer_ChType;
  Index_AL := Mixer_Index_AL; Index_AR := Mixer_Index_AR;
  Index_BL := Mixer_Index_BL; Index_BR := Mixer_Index_BR;
  Index_CL := Mixer_Index_CL; Index_CR := Mixer_Index_CR;
  Set_Chip_Frq(Mixer_AY_Freq);
  Set_Player_Frq(Mixer_Interrupt_Freq);

  if Mixer_Stereo_From_List then
   begin
    if Number_Of_Channels > 0 then
     Set_StereoCheckWO(Number_Of_Channels)
    else if PLDef_Number_Of_Channels > 0 then
     Set_StereoCheckWO(PLDef_Number_Of_Channels)
    else
     Set_StereoCheckWO(Mixer_Stereo)
   end
  else
   Set_StereoCheckWO(Mixer_Stereo);
   
  if Mixer_ChType_From_List then
   if Chip_Type <> No_Chip then
    ChType := Chip_Type
   else if PLDef_Chip_Type <> No_Chip then
    ChType := PLDef_Chip_Type;

  if Mixer_Channel_Mode_From_List then
   case Channel_Mode of
   0..6: Set_Mode(Channel_Mode);
   -2:   Set_Mode_Manual(AL,AR,BL,BR,CL,CR);
   -1:   case PLDef_Channel_Mode of
         0..6: Set_Mode(PLDef_Channel_Mode);
         -2:   Set_Mode_Manual(PLDef_AL,PLDef_AR,PLDef_BL,PLDef_BR,
                                          PLDef_CL,PLDef_CR);
         end;
   end;

  AYFileEnableAutoSwitch := False;

  if Mixer_AY_Freq_From_List then
   if AY_Freq >= 0 then
    Set_Chip_Frq(AY_Freq)
   else if PLDef_SoundChip_Frq >= 0 then
    Set_Chip_Frq(PLDef_SoundChip_Frq)
   else if (CurFileType = AYFile) or (CurFileType = AYMFile) then
    begin
     AYFileEnableAutoSwitch := True;
     Set_Chip_Frq(1773400)
    end;

  if Mixer_Interrupt_Freq_From_List then
   if Int_Freq >= 0 then
    Set_Player_Frq(Int_Freq)
   else if PLDef_Player_Frq >= 0 then
    Set_Player_Frq(PLDef_Player_Frq);

  Calculate_Level_Tables

 end;
UpdateStatus(Index);
case Play of
-1,0:
  begin
   Calculate_Slider_Points;
   if Play = 0 then PlayCurrent
  end;
{1:WAV_Converter;
2:VTX_Converter;
3:YM6_Converter;
4:PSG_Converter;
5:ZXAY_Converter}
end
end;

procedure InitForAllTypes;
const
 DumpIM2:packed array[0..9] of byte =
  ($F3,$CD,0,0,$ED,$5E,$FB,$76,$18,$FA);
 DumpIM1:packed array[0..12] of byte =
  ($F3,$CD,0,0,$ED,$56,$FB,$76,$CD,0,0,$18,$F7);
var
 i,Offs1,Offs2:integer;
 w,w1:word;
 si:smallint;
 b:byte;
begin
Case CurFileType of
OUTFile:
 begin
  UniFileSeek(FileHandle,0);
  Previous_AY_Takt := 0
 end;
AYMFile:
 begin
  InProc := InitialInProc;
  OutProc := InitialOutProc;
  Previous_Tact := 0;
  IntBeeper := False;
  IntAY := False;
  CPCSwitch := 0;
  CPCData := 0;
  CurrentTact := 0;
  Z80_Registers.Common := @CommonMain;
  PCommonAlt := @CommonAlt;
  Z80_Registers.AF := @AFMain;
  PAFAlt := @AFAlt;
  IFF := False;
  EIorDDorFD := False;
  IMode := 0;
  RAM.Index[65536] := RAM.Index[0];
  BytePtr(integer(@AYMFileHeader.AF) + AYMFileHeader.
  RegPos)^ := AYBlocks + AYMFileHeader.MusMin;
  AFMain.AllWord := AYMFileHeader.AF;
  CommonMain.BC.AllWord := AYMFileHeader.BC;
  CommonMain.DE.AllWord := AYMFileHeader.DE;
  CommonMain.HL.AllWord := AYMFileHeader.HL;
  Z80_Registers.IX.AllWord := AYMFileHeader.IX;
  Z80_Registers.IY.AllWord := AYMFileHeader.IY;
  Z80_Registers.SP := $4000;
  Z80_Registers.PC := 2;
  R_Hi_Bit := 0;
  Z80_Registers.IR.AllWord := 0
 end;
AYFile:
 begin
  InProc := InitialInProc;
  OutProc := InitialOutProc;
  Previous_Tact := 0;
  IntBeeper := False;
  IntAY := False;
  CPCSwitch := 0;
  CPCData := 0;
  CurrentTact := 0;
  Z80_Registers.Common := @CommonMain;
  PCommonAlt := @CommonAlt;
  Z80_Registers.AF := @AFMain;
  PAFAlt := @AFAlt;
  IFF := False;
  EIorDDorFD := False;
  IMode := 0;

  UniFileSeek(FileHandle,AYBlocks);
  FillChar(RAM.Index[10],255 - 10 + 1,201);
  FillChar(RAM.Index[256],16383 - 256 + 1,255);
  FillChar(RAM.Index[16384],65535 - 16384 + 1,0);
  RAM.Index[56] := $FB;
  if AYPoints.Inter <> 0 then
   begin
    Move(DumpIM1,RAM,13);
    WordPtr(@RAM.Index[9])^ := AYPoints.Inter
   end
  else
   Move(DumpIM2,RAM,10);
  WordPtr(@RAM.Index[2])^ := AYPoints.Init;
  RAM.Index[65536] := RAM.Index[0];
  Z80_Registers.SP := AYPoints.Stek;
  b := AYSongData.HiReg;
  AFMain.HiByte := b;
  AFAlt.HiByte := b;
  CommonMain.HL.HiByte := b;
  CommonMain.DE.HiByte := b;
  CommonMain.BC.HiByte := b;
  CommonAlt.HL.HiByte := b;
  CommonAlt.DE.HiByte := b;
  CommonAlt.BC.HiByte := b;
  Z80_Registers.IX.HiByte := b;
  Z80_Registers.IY.HiByte := b;
  b := AYSongData.LoReg;
  AFMain.LoByte := b;
  AFAlt.LoByte := b;
  CommonMain.HL.LoByte := b;
  CommonMain.DE.LoByte := b;
  CommonMain.BC.LoByte := b;
  CommonAlt.HL.LoByte := b;
  CommonAlt.DE.LoByte := b;
  CommonAlt.BC.LoByte := b;
  Z80_Registers.IX.LoByte := b;
  Z80_Registers.IY.LoByte := b;
  Z80_Registers.IR.AllWord := $300;
  R_Hi_Bit := 0;
  Z80_Registers.PC := 0;
  UniRead(FileHandle,@w,2);
  while w <> 0 do
   begin
    w := IntelWord(w);
    if AYPoints.Init = 0 then
     begin
      WordPtr(@RAM.Index[2])^ := w;
      AYPoints.Init := w
     end;
    UniRead(FileHandle,@w1,2);
    w1 := IntelWord(w1);
    if w1 + w > 65536 then
     w1 := 65536 - w;
    UniRead(FileHandle,@si,2);
    Offs1 := smallint(IntelWord(si)) +
                        UniReadersData[FileHandle].UniFilePos - 2;
    if Offs1 + w1 > UniReadersData[FileHandle].UniFileSize then
     w1 := UniReadersData[FileHandle].UniFileSize - Offs1;
    Offs2 := UniReadersData[FileHandle].UniFilePos;
    UniFileSeek(FileHandle,Offs1);
    UniRead(FileHandle,@RAM.Index[w],w1);
    UniFileSeek(FileHandle,Offs2);
    UniRead(FileHandle,@w,2)
   end
 end;
YM5File,
YM6File:
 begin
  if CurFileType = YM5File then
   begin
    AtariSE1Type := 0;
    AtariSE2Type := 1
   end;
  Position_In_VTX := 0;
  AtariSE1Channel := 0;
  AtariSE2Channel := 0;
  AtariTimerCounter1 := 0;
  AtariTimerCounter2 := 0;
  YM6CurTik := YM6TiksOnInt;
  AtariV1 := 0;
  AtariV2 := 0;
  YM6SinusPos1 := 0;
  YM6SinusPos2 := 0
 end;
FXMFile:
 begin

  with PlParams.FXM,RAM do
   begin
    Noise_Base := 0;
    PlParams.FXM_A.Address_In_Pattern :=
                                        WordPtr(@Index[Address])^;
    PlParams.FXM_B.Address_In_Pattern :=
                                        WordPtr(@Index[Address + 2])^;
    PlParams.FXM_C.Address_In_Pattern :=
                                        WordPtr(@Index[Address + 4])^;
   end;

  with PlParams.FXM_A do
   begin
    Note_Skip_Counter := 1;
    FXM_Mixer := 8;
    Transposit := 0;
    b0e := False;
    b1e := False;
    b2e := False;
    b3e := False;
   end;

  with PlParams.FXM_B do
   begin
    Note_Skip_Counter := 1;
    FXM_Mixer := 8;
    Transposit := 0;
    b0e := False;
    b1e := False;
    b2e := False;
    b3e := False;
   end;

  with PlParams.FXM_C do
   begin
    Note_Skip_Counter := 1;
    FXM_Mixer := 8;
    Transposit := 0;
    b0e := False;
    b1e := False;
    b2e := False;
    b3e := False;
   end;

  SetLength(FXM_StekA,0);
  SetLength(FXM_StekB,0);
  SetLength(FXM_StekC,0);

 end;
GTRFile:
 begin

  with PlParams.GTR,RAM do
   begin
    CurrentPosition := 0;
    DelayCounter := 1;
    PlParams.GTR_A.Address_In_Pattern := GTR_PatternsPointers[
                GTR_Positions[0] div 6].PatternA;
    PlParams.GTR_B.Address_In_Pattern := GTR_PatternsPointers[
                GTR_Positions[0] div 6].PatternB;
    PlParams.GTR_C.Address_In_Pattern := GTR_PatternsPointers[
                GTR_Positions[0] div 6].PatternC;
   end;

  with PlParams.GTR_A do
   begin
    Envelope_Enabled := False;
    SamplePointer := 65536 - 4;
    Position_In_Sample := 0;
    Loop_Sample_Position := 0;
    Sample_Length := 4;
    OrnamentPointer := 65536 - 4;
    Position_In_Ornament := 0;
    Loop_Ornament_Position := 0;
    Ornament_Length := 1;
    DWordPtr(@RAM.Index[65536-4])^ := 0;
    Note_Skip_Counter := 0;
    Enabled := True;
    Ton := 0;
    Volume := 0
   end;

  with PlParams.GTR_B do
   begin
    Envelope_Enabled := False;
    SamplePointer := 65536 - 4;
    Position_In_Sample := 0;
    Loop_Sample_Position := 0;
    Sample_Length := 4;
    OrnamentPointer := 65536 - 4;
    Position_In_Ornament := 0;
    Loop_Ornament_Position := 0;
    Ornament_Length := 1;
    DWordPtr(@RAM.Index[65536-4])^ := 0;
    Note_Skip_Counter := 0;
    Enabled := True;
    Ton := 0;
    Volume := 0
   end;

  with PlParams.GTR_C do
   begin
    Envelope_Enabled := False;
    SamplePointer := 65536 - 4;
    Position_In_Sample := 0;
    Loop_Sample_Position := 0;
    Sample_Length := 4;
    OrnamentPointer := 65536 - 4;
    Position_In_Ornament := 0;
    Loop_Ornament_Position := 0;
    Ornament_Length := 1;
    DWordPtr(@RAM.Index[65536-4])^ := 0;
    Note_Skip_Counter := 0;
    Enabled := True;
    Ton := 0;
    Volume := 0
   end;

 end;
STCFile:
 begin
  with PlParams.STC,RAM do
   begin
    CurrentPosition := 0;
    Transposition := Index[ST_PositionsPointer + 2];
    DelayCounter := 1;
   end;

  with RAM do
   begin
    i := 0;
    while Index[ST_PatternsPointer + 7*i] <>
                      Index[ST_PositionsPointer + 1] do inc(i);
    PlParams.STC_A.Address_In_Pattern :=
                           WordPtr(@Index[ST_PatternsPointer + 7 * i + 1])^;
    PlParams.STC_B.Address_In_Pattern :=
                           WordPtr(@Index[ST_PatternsPointer + 7 * i + 3])^;
    PlParams.STC_C.Address_In_Pattern :=
                           WordPtr(@Index[ST_PatternsPointer + 7 * i + 5])^;
   end;

  with PlParams.STC_A do
   begin
    Note_Skip_Counter := 0;
    Envelope_Enabled := False;
    Number_Of_Notes_To_Skip := 0;
    Sample_Tik_Counter := -1;
    Position_In_Sample := 0;
    OrnamentPointer := RAM.ST_OrnamentsPointer + 1;
    Ton := 0
   end;

  with PlParams.STC_B do
   begin
    Note_Skip_Counter := 0;
    Envelope_Enabled := False;
    Number_Of_Notes_To_Skip := 0;
    Sample_Tik_Counter := -1;
    Position_In_Sample := 0;
    OrnamentPointer := RAM.ST_OrnamentsPointer + 1;
    Ton := 0
   end;

  with PlParams.STC_C do
   begin
    Note_Skip_Counter := 0;
    Envelope_Enabled := False;
    Number_Of_Notes_To_Skip := 0;
    Sample_Tik_Counter := -1;
    Position_In_Sample := 0;
    OrnamentPointer := RAM.ST_OrnamentsPointer + 1;
    Ton := 0
   end

 end;
FLSFile:
 begin
  with PlParams.FLS,RAM do
   begin
    Delay := Index[FLS_PositionsPointer];
    CurrentPosition := 0;
    DelayCounter := 1;
   end;

  with PlParams.FLS_A,RAM do
   begin
    Note_Skip_Counter := 0;
    Number_Of_Notes_To_Skip := 0;
    Address_In_Pattern :=
        FLS_PatternsPointers[Index[FLS_PositionsPointer + 1]].PatternA;
    Ornament_Enabled := False;
    Envelope_Enabled := False;
    Ton := 0;
    Sample_Tik_Counter := -1;
   end;

  with PlParams.FLS_B,RAM do
   begin
    Note_Skip_Counter := 0;
    Number_Of_Notes_To_Skip := 0;
    Address_In_Pattern :=
        FLS_PatternsPointers[Index[FLS_PositionsPointer + 1]].PatternB;
    Ornament_Enabled := False;
    Envelope_Enabled := False;
    Ton := 0;
    Sample_Tik_Counter := -1;
   end;

  with PlParams.FLS_C,RAM do
   begin
    Note_Skip_Counter := 0;
    Number_Of_Notes_To_Skip := 0;
    Address_In_Pattern :=
        FLS_PatternsPointers[Index[FLS_PositionsPointer + 1]].PatternC;
    Ornament_Enabled := False;
    Envelope_Enabled := False;
    Ton := 0;
    Sample_Tik_Counter := -1;
   end;

  end;
ASCFile,ASC0File:
  begin

   with PlParams.ASC_A do
    begin
     Note := 0;
     Initial_Noise := 0;
     Current_Noise := 0;
     Sample_Finished := False;
     Sound_Enabled := False;
     Break_Sample_Loop := False;
     Envelope_Enabled := False;
     Number_Of_Notes_To_Skip := 0;
     Addition_To_Amplitude := 0;
     Note_Skip_Counter := 0;
     Initial_Point_In_Sample := 0;
     Initial_Point_In_Ornament := 0;
     Point_In_Ornament := 0;
     Loop_Point_In_Ornament := 0;
     Substruction_for_Ton_Sliding := 0;
     Volume := 0;
     Point_In_Sample := 0;
     Ton_Deviation := 0;
     Loop_Point_In_Sample := 0;
     Ton_Sliding_Counter := 0;
     Amplitude_Delay_Counter := 0;
     Amplitude_Delay := 0;
     Addition_To_Note := 0;
     Current_Ton_Sliding := 0;
     Ton:=0
    end;

   with PlParams.ASC_B do
    begin
     Note := 0;
     Initial_Noise := 0;
     Current_Noise := 0;
     Sample_Finished := False;
     Sound_Enabled := False;
     Break_Sample_Loop := False;
     Envelope_Enabled := False;
     Number_Of_Notes_To_Skip := 0;
     Addition_To_Amplitude := 0;
     Note_Skip_Counter := 0;
     Initial_Point_In_Sample := 0;
     Initial_Point_In_Ornament := 0;
     Point_In_Ornament := 0;
     Loop_Point_In_Ornament := 0;
     Substruction_for_Ton_Sliding := 0;
     Volume := 0;
     Point_In_Sample := 0;
     Ton_Deviation := 0;
     Loop_Point_In_Sample := 0;
     Ton_Sliding_Counter := 0;
     Amplitude_Delay_Counter := 0;
     Amplitude_Delay := 0;
     Addition_To_Note := 0;
     Current_Ton_Sliding := 0;
     Ton:=0
    end;

   with PlParams.ASC_C do
    begin
     Note := 0;
     Initial_Noise := 0;
     Current_Noise := 0;
     Sample_Finished := False;
     Sound_Enabled := False;
     Break_Sample_Loop := False;
     Envelope_Enabled := False;
     Number_Of_Notes_To_Skip := 0;
     Addition_To_Amplitude := 0;
     Note_Skip_Counter := 0;
     Initial_Point_In_Sample := 0;
     Initial_Point_In_Ornament := 0;
     Point_In_Ornament := 0;
     Loop_Point_In_Ornament := 0;
     Substruction_for_Ton_Sliding := 0;
     Volume := 0;
     Point_In_Sample := 0;
     Ton_Deviation := 0;
     Loop_Point_In_Sample := 0;
     Ton_Sliding_Counter := 0;
     Amplitude_Delay_Counter := 0;
     Amplitude_Delay := 0;
     Addition_To_Note := 0;
     Current_Ton_Sliding := 0;
     Ton:=0
    end;

  with PlParams.ASC,RAM do
   begin
    CurrentPosition := 0;
    DelayCounter := 1;
    Delay := ASC1_Delay;
    PlParams.ASC_A.Address_In_Pattern :=
     WordPtr(@Index[ASC1_PatternsPointers + 6 * Index[9]])^ +
                                                ASC1_PatternsPointers;
    PlParams.ASC_B.Address_In_Pattern :=
     WordPtr(@Index[ASC1_PatternsPointers + 6 * Index[9] + 2])^ +
                                                ASC1_PatternsPointers;
    PlParams.ASC_C.Address_In_Pattern :=
     WordPtr(@Index[ASC1_PatternsPointers + 6 * Index[9] + 4])^ +
                                                ASC1_PatternsPointers
   end

 end;
FTCFile:
 begin
  with PlParams.FTC,RAM do
   begin
    Delay := FTC_Delay;
    DelayCounter := 1;
    CurrentPosition := 0;
    Transposition := FTC_Positions[0].Transposition;
    PlParams.FTC_A.Address_In_Pattern :=
         WordPtr(@Index[FTC_PatternsPointer + FTC_Positions[0].Pattern*6])^;
    PlParams.FTC_B.Address_In_Pattern :=
         WordPtr(@Index[FTC_PatternsPointer + FTC_Positions[0].Pattern*6 + 2])^;
    PlParams.FTC_C.Address_In_Pattern :=
         WordPtr(@Index[FTC_PatternsPointer + FTC_Positions[0].Pattern*6 + 4])^;
   end;

   with PlParams.FTC_A do
    begin
     OrnamentPointer := RAM.FTC_OrnamentsPointers[0];
     SamplePointer := $52;
     Note_Skip_Counter := 0;
     Loop_Ornament_Position := 0;
     Position_In_Ornament := 0;
     Ornament_Length := 1;
     Noise := 0;
     Noise_Accumulator := 0;
     Note_Accumulator := 0;
     Ton_Slide_Step1 := 0;
     Sample_Enabled := False;
     Envelope_Enabled := False;
     Volume := 15;
     Ton := 0
    end;

   with PlParams.FTC_B do
    begin
     OrnamentPointer := PlParams.FTC_A.OrnamentPointer;
     SamplePointer := $52;
     Note_Skip_Counter := 0;
     Loop_Ornament_Position := 0;
     Position_In_Ornament := 0;
     Ornament_Length := 1;
     Noise := 0;
     Noise_Accumulator := 0;
     Note_Accumulator := 0;
     Ton_Slide_Step1 := 0;
     Sample_Enabled := False;
     Envelope_Enabled := False;
     Volume := 15;
     Ton := 0
    end;

   with PlParams.FTC_C do
    begin
     OrnamentPointer := PlParams.FTC_A.OrnamentPointer;
     SamplePointer := $52;
     Note_Skip_Counter := 0;
     Loop_Ornament_Position := 0;
     Position_In_Ornament := 0;
     Ornament_Length := 1;
     Noise := 0;
     Noise_Accumulator := 0;
     Note_Accumulator := 0;
     Ton_Slide_Step1 := 0;
     Sample_Enabled := False;
     Envelope_Enabled := False;
     Volume := 15;
     Ton := 0
    end

 end;
STPFile:
 begin

  with PlParams.STP,RAM do
   begin
    DelayCounter := 1;
    Transposition := Index[STP_PositionsPointer + 3];
    CurrentPosition := 0;
    PlParams.STP_A.Address_In_Pattern :=
     WordPtr(@Index[STP_PatternsPointer + Index[STP_PositionsPointer + 2]])^;
    PlParams.STP_B.Address_In_Pattern :=
     WordPtr(@Index[STP_PatternsPointer + Index[STP_PositionsPointer + 2] + 2])^;
    PlParams.STP_C.Address_In_Pattern :=
     WordPtr(@Index[STP_PatternsPointer + Index[STP_PositionsPointer + 2] + 4])^;
   end;

  with PlParams.STP_A,RAM do
   begin
    SamplePointer := WordPtr(@Index[STP_SamplesPointer])^;
    Loop_Sample_Position := Index[SamplePointer];
    Inc(SamplePointer);
    Sample_Length := Index[SamplePointer];
    Inc(SamplePointer);
    PlParams.STP_B.SamplePointer := SamplePointer;
    PlParams.STP_B.Loop_Sample_Position := Loop_Sample_Position;
    PlParams.STP_B.Sample_Length := Sample_Length;
    PlParams.STP_C.SamplePointer := SamplePointer;
    PlParams.STP_C.Loop_Sample_Position := Loop_Sample_Position;
    PlParams.STP_C.Sample_Length := Sample_Length;

    OrnamentPointer := WordPtr(@Index[STP_OrnamentsPointer])^;
    Loop_Ornament_Position := Index[OrnamentPointer];
    Inc(OrnamentPointer);
    Ornament_Length := Index[OrnamentPointer];
    Inc(OrnamentPointer);
    PlParams.STP_B.OrnamentPointer := OrnamentPointer;
    PlParams.STP_B.Loop_Ornament_Position := Loop_Ornament_Position;
    PlParams.STP_B.Ornament_Length := Ornament_Length;
    PlParams.STP_C.OrnamentPointer := OrnamentPointer;
    PlParams.STP_C.Loop_Ornament_Position := Loop_Ornament_Position;
    PlParams.STP_C.Ornament_Length := Ornament_Length;

    Envelope_Enabled := False;
    Glissade := 0;
    Current_Ton_Sliding := 0;
    Enabled := False;
    Number_Of_Notes_To_Skip := 0;
    Note_Skip_Counter := 0;
    Volume := 0;
    Ton := 0
   end;

  with PlParams.STP_B do
   begin
    Envelope_Enabled := False;
    Glissade := 0;
    Current_Ton_Sliding := 0;
    Enabled := False;
    Number_Of_Notes_To_Skip := 0;
    Note_Skip_Counter := 0;
    Volume := 0;
    Ton := 0
   end;

  with PlParams.STP_C do
   begin
    Envelope_Enabled := False;
    Glissade := 0;
    Current_Ton_Sliding := 0;
    Enabled := False;
    Number_Of_Notes_To_Skip := 0;
    Note_Skip_Counter := 0;
    Volume := 0;
    Ton := 0
   end
   
 end;
PSCFile:
 begin

  with PlParams.PSC,RAM do
   begin
    DelayCounter := 1;
    Delay := PSC_Delay;
    Positions_Pointer := PSC_PatternsPointer;
    Lines_Counter := 1;
    Noise_Base := 0
   end;

  with PlParams.PSC_A,RAM do
   begin
    SamplePointer := PSC_SamplesPointers[0] + $4c;
    PlParams.PSC_B.SamplePointer := SamplePointer;
    PlParams.PSC_C.SamplePointer := SamplePointer;
    OrnamentPointer := WordPtr(@Index[PSC_OrnamentsPointer])^ +
                                                       PSC_OrnamentsPointer;
    PlParams.PSC_B.OrnamentPointer := OrnamentPointer;
    PlParams.PSC_C.OrnamentPointer := OrnamentPointer;

    Break_Ornament_Loop := False;
    Ornament_Enabled := False;
    Enabled := False;
    Break_Sample_Loop := False;
    Ton_Slide_Enabled := False;
    Note_Skip_Counter := 1;
    Ton := 0
   end;

  with PlParams.PSC_B do
   begin
    Break_Ornament_Loop := False;
    Ornament_Enabled := False;
    Enabled := False;
    Break_Sample_Loop := False;
    Ton_Slide_Enabled := False;
    Note_Skip_Counter := 1;
    Ton := 0
   end;

  with PlParams.PSC_C do
   begin
    Break_Ornament_Loop := False;
    Ornament_Enabled := False;
    Enabled := False;
    Break_Sample_Loop := False;
    Ton_Slide_Enabled := False;
    Note_Skip_Counter := 1;
    Ton := 0
   end

 end;
PT1File:
 begin
  with PlParams.PT1,RAM do
   begin
    DelayCounter := 1;
    Delay := PT1_Delay;
    CurrentPosition := 0;
    Move(Index[PT1_PatternsPointer +
                PT1_PositionList[0] * 6],
               PlParams.PT1_A.Address_In_Pattern,2);
    Move(Index[PT1_PatternsPointer +
                PT1_PositionList[0]*6 + 2],
               PlParams.PT1_B.Address_In_Pattern,2);
    Move(Index[PT1_PatternsPointer +
                PT1_PositionList[0]*6 + 4],
               PlParams.PT1_C.Address_In_Pattern,2)
   end;

   with PlParams.PT1_A do
    begin
     OrnamentPointer := RAM.PT1_OrnamentsPointers[0];
     Envelope_Enabled := False;
     Position_In_Sample := 0;
     Enabled := False;
     Number_Of_Notes_To_Skip := 0;
     Note_Skip_Counter := 0;
     Volume := 15;
     Ton := 0
    end;

   with PlParams.PT1_B do
    begin
     OrnamentPointer := PlParams.PT1_A.OrnamentPointer;
     Envelope_Enabled := False;
     Position_In_Sample := 0;
     Enabled := False;
     Number_Of_Notes_To_Skip := 0;
     Note_Skip_Counter := 0;
     Volume := 15;
     Ton := 0
    end;

   with PlParams.PT1_C do
    begin
     OrnamentPointer := PlParams.PT1_A.OrnamentPointer;
     Envelope_Enabled := False;
     Position_In_Sample := 0;
     Enabled := False;
     Number_Of_Notes_To_Skip := 0;
     Note_Skip_Counter := 0;
     Volume := 15;
     Ton := 0
    end;

 end;
PT2File:
 begin
  with PlParams.PT2,RAM do
   begin
    DelayCounter := 1;
    Delay := PT2_Delay;
    CurrentPosition := 0;
   end;

  with RAM do
   begin
    PlParams.PT2_A.Address_In_Pattern :=
      WordPtr(@Index[PT2_PatternsPointer +
                     PT2_PositionList[0] * 6])^;
    PlParams.PT2_B.Address_In_Pattern :=
      WordPtr(@Index[PT2_PatternsPointer +
                     PT2_PositionList[0] * 6 + 2])^;
    PlParams.PT2_C.Address_In_Pattern :=
      WordPtr(@Index[PT2_PatternsPointer +
                     PT2_PositionList[0] * 6 + 4])^;
   end;

  with PlParams.PT2_A,RAM do
   begin
    OrnamentPointer := PT2_OrnamentsPointers[0];
    Ornament_Length := Index[OrnamentPointer];
    Inc(OrnamentPointer);
    Loop_Ornament_Position := Index[OrnamentPointer];
    Inc(OrnamentPointer);
    Envelope_Enabled := False;
    Position_In_Sample := 0;
    Position_In_Ornament := 0;
    Addition_To_Noise := 0;
    Glissade := 0;
    Current_Ton_Sliding:=0;
    GlissType := 0;
    Enabled := False;
    Number_Of_Notes_To_Skip := 0;
    Note_Skip_Counter := 0;
    Volume := 15;
    Ton := 0
   end;

  with PlParams.PT2_B do
   begin
    OrnamentPointer := PlParams.PT2_A.OrnamentPointer;
    Loop_Ornament_Position := PlParams.PT2_A.Loop_Ornament_Position;
    Ornament_Length := PlParams.PT2_A.Ornament_Length;
    Envelope_Enabled := False;
    Position_In_Sample := 0;
    Position_In_Ornament := 0;
    Addition_To_Noise := 0;
    Glissade := 0;
    Current_Ton_Sliding := 0;
    GlissType := 0;
    Enabled := False;
    Number_Of_Notes_To_Skip := 0;
    Note_Skip_Counter := 0;
    Volume := 15;
    Ton := 0
   end;

  with PlParams.PT2_C do
   begin
    OrnamentPointer := PlParams.PT2_A.OrnamentPointer;
    Loop_Ornament_Position := PlParams.PT2_A.Loop_Ornament_Position;
    Ornament_Length := PlParams.PT2_A.Ornament_Length;
    Envelope_Enabled := False;
    Position_In_Sample := 0;
    Position_In_Ornament := 0;
    Addition_To_Noise := 0;
    Glissade := 0;
    Current_Ton_Sliding := 0;
    GlissType := 0;
    Enabled := False;
    Number_Of_Notes_To_Skip := 0;
    Note_Skip_Counter := 0;
    Volume := 15;
    Ton := 0
   end
 end;
PT3File:
 begin
  with PlParams.PT3,RAM do
   begin
    DelayCounter := 1;
    Delay := PT3_Delay;
    CurrentPosition := 0;
    Noise_Base := 0;
    AddToNoise := 0;
    Env_Base.wrd := 0
   end;

   with RAM do
    begin
     PlParams.PT3_A.Address_In_Pattern :=
        WordPtr(@Index[PT3_PatternsPointer + PT3_PositionList[0] * 2])^;
     PlParams.PT3_B.Address_In_Pattern :=
        WordPtr(@Index[PT3_PatternsPointer + PT3_PositionList[0] * 2 + 2])^;
     PlParams.PT3_C.Address_In_Pattern :=
        WordPtr(@Index[PT3_PatternsPointer + PT3_PositionList[0] * 2 + 4])^
    end;

   with PlParams.PT3_A,RAM do
    begin
     OrnamentPointer := PT3_OrnamentsPointers[0];
     Loop_Ornament_Position := Index[OrnamentPointer];
     inc(OrnamentPointer);
     Ornament_Length := Index[OrnamentPointer];
     inc(OrnamentPointer);
     SamplePointer := PT3_SamplesPointers[1];
     Loop_Sample_Position := Index[SamplePointer];
     inc(SamplePointer);
     Sample_Length := Index[SamplePointer];
     inc(SamplePointer);
     Volume := 15;
     Current_Ton_Sliding := 0;
     Note_Skip_Counter := 1;
     Enabled := False;
     Envelope_Enabled := False;
     Note := 0;
     Ton := 0
    end;

   with PlParams.PT3_B do
    begin
     OrnamentPointer := PlParams.PT3_A.OrnamentPointer;
     Loop_Ornament_Position := PlParams.PT3_A.Loop_Ornament_Position;
     Ornament_Length := PlParams.PT3_A.Ornament_Length;
     SamplePointer := PlParams.PT3_A.SamplePointer;
     Loop_Sample_Position := PlParams.PT3_A.Loop_Sample_Position;
     Sample_Length := PlParams.PT3_A.Sample_Length;
     Volume := 15;
     Current_Ton_Sliding := 0;
     Note_Skip_Counter := 1;
     Enabled := False;
     Envelope_Enabled := False;
     Note := 0;
     Ton := 0
    end;

   with PlParams.PT3_C do
    begin
     OrnamentPointer := PlParams.PT3_A.OrnamentPointer;
     Loop_Ornament_Position := PlParams.PT3_A.Loop_Ornament_Position;
     Ornament_Length := PlParams.PT3_A.Ornament_Length;
     SamplePointer := PlParams.PT3_A.SamplePointer;
     Loop_Sample_Position := PlParams.PT3_A.Loop_Sample_Position;
     Sample_Length := PlParams.PT3_A.Sample_Length;
     Volume := 15;
     Current_Ton_Sliding := 0;
     Note_Skip_Counter := 1;
     Enabled := False;
     Envelope_Enabled := False;
     Note := 0;
     Ton := 0
    end;

 end;
SQTFile:
 begin
  with PlParams.SQT_A do
   begin
    Ton:=0;
    Envelope_Enabled := False;
    Ornament_Enabled := False;
    Gliss := False;
    Enabled := False
   end;
  with PlParams.SQT_B do
   begin
    Ton:=0;
    Envelope_Enabled := False;
    Ornament_Enabled := False;
    Gliss := False;
    Enabled := False
   end;
  with PlParams.SQT_C do
   begin
    Ton:=0;
    Envelope_Enabled := False;
    Ornament_Enabled := False;
    Gliss := False;
    Enabled := False
   end;

  with PlParams.SQT do
   begin
    DelayCounter := 1;
    Delay := 1;
    Lines_Counter := 1;
    Positions_Pointer := RAM.SQT_PositionsPointer
   end

 end;
VTXFile..YM3bFile:
 Position_In_VTX := 0;
EPSGFile:
 begin
  UniFileSeek(FileHandle,16);
  Previous_AY_Takt := 0
 end;
PSGFile:
 begin
  UniFileSeek(FileHandle,16);
  PSG_Skip := 0
 end;
ZXAYFile:
 begin
  UniFileSeek(FileHandle,4);
  Previous_AY_Takt := 0
 end
end;
for i := 0 to 12 do RegisterAY.Index[i] := 0;
SetEnvelopeRegister(0);
SetMixerRegister(0);
SetAmplA(0);
SetAmplB(0);
SetAmplC(0);
First_Period := False;
Ampl := 0;
Current_RegisterAY := 0;
if IsFilt then
 begin
  FillChar(Filt_XL[0],(Filt_M + 1) * 4,0);
  FillChar(Filt_XR[0],(Filt_M + 1) * 4,0);
  Filt_I := 0
 end;
Beeper := 0;
if InitAll then
 begin
  BaseSample := 0;
  MkVisPos := 0;
  VisPoint := 0;
  NOfTicks := 0;
  ResetAYChipEmulation;
  Reseted := 0;
  Global_Tick_Counter := 0;
  if not (CurFileType in [BASSFileMin..BASSFileMax,CDAFile]) then
   ProgrMax := round(Time_ms/1000*SampleRate);
  Real_End := False;
  VProgrPos := 0;
  ShowProgress(VProgrPos)
 end
end;

procedure OUT_Get_Registers;
var
 ZX_Takt2:smallint;
 Number_Of_Takts:smallint;
begin
with UniReadersData[FileHandle]^ do
 if UniFilePos = UniFileSize then
  exit;
repeat
 if not IntFlag then
  begin
   UniRead(FileHandle,@ZX_Takt,2);
   UniRead(FileHandle,@ZX_Port,2);
   UniRead(FileHandle,@ZX_Port_Data,1);
   if ZX_Takt = -1 then
    ZX_Takt2 := 0
   else
    ZX_Takt2 := ZX_Takt;
   Number_Of_Takts := ZX_Takt2 - Previous_AY_Takt;
   Previous_AY_Takt := ZX_Takt2;
   if Number_Of_Takts <= 0 then
    Inc(Number_Of_Takts,17472);
   Inc(OUTZXAYConv_TotalTime,Number_Of_Takts)
  end;

 IntFlag := False;
 if OUTZXAYConv_TotalTime >= MaxTStates then
  begin
   Dec(OUTZXAYConv_TotalTime,MaxTStates);
   IntFlag := True;
   exit
  end;
 if ZX_Takt <> -1 then
  if (ZX_Port and PortMask) = ($FFFD and PortMask) then
   Current_RegisterAY := ZX_Port_Data
  else if (ZX_Port and PortMask) = ($BFFD and PortMask) then
   SetAYRegister(Current_RegisterAY,ZX_Port_Data)
until UniReadersData[FileHandle]^.UniFilePos =
                UniReadersData[FileHandle]^.UniFileSize
end;

procedure VTX_YM2_YM3_YM3b_Get_Registers;
var
 i:word;
 k:integer;
begin
k := VTX_Offset;
for i := 0 to 12 do
 begin
  case i of
  1,3,5:
     RegisterAY.Index[i] := PVTXYMUnpackedData^[Position_In_VTX + k] and 15;
  6: RegisterAY.Noise := PVTXYMUnpackedData^[Position_In_VTX + k] and 31;
  7: SetMixerRegister(PVTXYMUnpackedData^[Position_In_VTX + k] and 63);
  8: SetAmplA(PVTXYMUnpackedData^[Position_In_VTX + k] and 31);
  9: SetAmplB(PVTXYMUnpackedData^[Position_In_VTX + k] and 31);
  10:SetAmplC(PVTXYMUnpackedData^[Position_In_VTX + k] and 31);
  else
     RegisterAY.Index[i] := PVTXYMUnpackedData^[Position_In_VTX + k];
  end;
  inc(k,NumberOfVBLs);
 end;
if PVTXYMUnpackedData^[Position_In_VTX + k] <> 255 then
 SetEnvelopeRegister(PVTXYMUnpackedData^[Position_In_Vtx + k] and 15);
inc(Global_Tick_Counter);
inc(Position_In_VTX)
end;

procedure YM6_Extra_GetRegisters;
var
 t1,t2,t3:real;
begin
t3 := YM6TiksOnInt - YM6CurTik;
t1 := t3;
t2 := t3;
if AtariSE1Channel <> 0 then
 begin
  if AtariTimerCounter1 = 0 then
   Case AtariSE1Type of
   0: begin
       if AtariV1 = 0 then
        AtariV1 := AtariParam1
       else
        AtariV1 := 0;
       RegisterAY.Index[7 + AtariSE1Channel] := AtariV1
      end;
   1: begin
       RegisterAY.Index[7 + AtariSE1Channel] :=
        DDrumSamples[AtariParam1].Buf[AtariSE1Pos];
       inc(AtariSE1Pos);
       if AtariSE1Pos >= DDrumSamples[AtariParam1].Length then
        AtariSE1Channel := 0
      end;
   2: begin
       RegisterAY.Index[7 + AtariSE1Channel] :=
        YM6SinusTable[AtariParam1,YM6SinusPos1];
       YM6SinusPos1 := (YM6SinusPos1 + 1) and 7
      end;
   3: SetEnvelopeRegister(AtariParam1);
   end;
  t1 := AtariTimerPeriod1 - AtariTimerCounter1
 end;
if AtariSE2Channel <> 0 then
 begin
  if AtariTimerCounter2 = 0 then
   Case AtariSE2Type of
   0: begin
       if AtariV2 = 0 then
        AtariV2 := AtariParam2
       else
        AtariV2 := 0;
       RegisterAY.Index[7 + AtariSE2Channel] := AtariV2
      end;
   1: begin
       RegisterAY.Index[7 + AtariSE2Channel] :=
        DDrumSamples[AtariParam2].Buf[AtariSE2Pos] and 15;
       inc(AtariSE2Pos);
       if AtariSE2Pos >= DDrumSamples[AtariParam2].Length then
        AtariSE2Channel := 0
      end;
   2: begin
       RegisterAY.Index[7 + AtariSE2Channel] :=
        YM6SinusTable[AtariParam2,YM6SinusPos2];
       YM6SinusPos2 := (YM6SinusPos2 + 1) and 7
      end;
   3: SetEnvelopeRegister(AtariParam2);
   end;
  t2 := AtariTimerPeriod2 - AtariTimerCounter2
 end;

if t2 < t1 then t1 := t2;
if t3 < t1 then t1 := t3;

YM6Tiks := round(t1*4294967296);

if AtariSE1Channel <> 0 then
 begin
  AtariTimerCounter1 := AtariTimerCounter1 + t1;
  if AtariTimerCounter1 >= AtariTimerPeriod1 then
   AtariTimerCounter1 := 0
 end;
if AtariSE2Channel <> 0 then
 begin
  AtariTimerCounter2 := AtariTimerCounter2 + t1;
  if AtariTimerCounter2 >= AtariTimerPeriod2 then
   AtariTimerCounter2 := 0
 end;
YM6CurTik := YM6CurTik + t1
end;

procedure YM5_Get_Registers;
var
 k:integer;
 b,la,lb,lc,mx:byte;
 DD,SE1TC,SE2TC:byte;
 frq:real;
begin

k := Position_In_Vtx + VTX_Offset;
RegisterAY.Index[0] := PVTXYMUnpackedData^[k];

Inc(k);
b := PVTXYMUnpackedData^[k];
RegisterAY.Index[1] := b and 15;
AtariSE1Channel := b and $30 shr 4;
if b and $40 <> 0 then
 AtariTimerCounter1 := 0;

Inc(k);
RegisterAY.Index[2] := PVTXYMUnpackedData^[k];

Inc(k);
DD := PVTXYMUnpackedData^[k];
RegisterAY.Index[3] := DD and 15;
DD := DD and $30 shr 4;

Inc(k);
RegisterAY.Index[4] := PVTXYMUnpackedData^[k];

Inc(k);
RegisterAY.Index[5] := PVTXYMUnpackedData^[k] and 15;

Inc(k);
b := PVTXYMUnpackedData^[k];
RegisterAY.Noise := b and 31;
AtariSE1TP := b shr 5;

Inc(k);
mx := PVTXYMUnpackedData^[k] and 63;

Inc(k);
la := PVTXYMUnpackedData^[k];
AtariSE2TP := la shr 5;

Inc(k);
lb := PVTXYMUnpackedData^[k];

Inc(k);
lc := PVTXYMUnpackedData^[k];

Inc(k);
RegisterAY.Index[11] := PVTXYMUnpackedData^[k];

Inc(k);
RegisterAY.Index[12] := PVTXYMUnpackedData^[k];

Inc(k);
b := PVTXYMUnpackedData^[k];
if b <> 255 then
 SetEnvelopeRegister(b and 15);

Inc(k);
SE1TC := PVTXYMUnpackedData^[k];

Inc(k);
SE2TC := PVTXYMUnpackedData^[k];

if (SE1TC <> 0) and (AtariSE1TP <> 0) and (AtariSE1Channel <> 0) then
 begin
  case AtariSE1Channel of
  1: begin
      AtariParam1 := la and 15;
      Envelope_EnA := True
     end;
  2: begin
      AtariParam1 := lb and 15;
      Envelope_EnB := True
     end;
  3: begin
      AtariParam1 := lc and 15;
      Envelope_EnC := True
     end
  end;
  frq := 1/(MFPTimerFrq/SE1TC/(AY_Freq/8));
  case AtariSE1TP of
  1: AtariTimerPeriod1 := frq*4;
  2: AtariTimerPeriod1 := frq*10;
  3: AtariTimerPeriod1 := frq*16;
  4: AtariTimerPeriod1 := frq*50;
  5: AtariTimerPeriod1 := frq*64;
  6: AtariTimerPeriod1 := frq*100;
  7: AtariTimerPeriod1 := frq*200
  end;
  if AtariTimerCounter1 >= AtariTimerPeriod1 then
   AtariTimerCounter1 := 0
 end
else
 begin
  AtariSE1Channel := 0;
  AtariTimerCounter1 := 0;
  AtariV1 := 0
 end;

if (SE2TC <> 0) and (AtariSE2TP <> 0) and (DD <> 0) then
 begin
  case DD of
  1: begin
      AtariParam2 := la and 15;
      Envelope_EnA := True
     end;
  2: begin
      AtariParam2 := lb and 15;
      Envelope_EnB := True
     end;
  3: begin
      AtariParam2 := lc and 15;
      Envelope_EnC := True
     end
  end;
  AtariSE2Channel := DD;
  AtariSE2Pos := 0;
  frq := 1/(MFPTimerFrq/SE2TC/(AY_Freq/8));
  case AtariSE2TP of
  1: AtariTimerPeriod2 := frq*4;
  2: AtariTimerPeriod2 := frq*10;
  3: AtariTimerPeriod2 := frq*16;
  4: AtariTimerPeriod2 := frq*50;
  5: AtariTimerPeriod2 := frq*64;
  6: AtariTimerPeriod2 := frq*100;
  7: AtariTimerPeriod2 := frq*200
  end;
  if AtariTimerCounter2 >= AtariTimerPeriod2 then
   AtariTimerCounter2 := 0
 end
else
 begin
  case AtariSE2Channel of
  0:AtariTimerCounter2 := 0;
  1:if mx and 9 <> 9 then AtariSE2Channel := 0;
  2:if mx and 18 <> 18 then AtariSE2Channel := 0;
  3:if mx and 36 <> 36 then AtariSE2Channel := 0
  end
 end;

case AtariSE2Channel of
1: mx := mx or 9;
2: mx := mx or 18;
3: mx := mx or 36;
end;

SetMixerRegister(mx);

if (AtariSE1Channel <> 1) and (AtariSE2Channel <> 1) then
 SetAmplA(la and 31);

if (AtariSE1Channel <> 2) and (AtariSE2Channel <> 2) then
 SetAmplB(lb and 31);

if (AtariSE1Channel <> 3) and (AtariSE2Channel <> 3) then
 SetAmplC(lc and 31);

Inc(Global_Tick_Counter);
Inc(Position_In_VTX,16);
if (Position_In_VTX div 16 = NumberOfVBLs) then
 Position_In_VTX := LoopVBL * 16

end;

procedure YM5i_Get_Registers;
var
 k:integer;
 b,la,lb,lc,mx:byte;
 DD,SE1TC,SE2TC:byte;
 frq:real;
begin

k := Position_In_Vtx + VTX_Offset;
RegisterAY.Index[0] := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
b := PVTXYMUnpackedData^[k];
RegisterAY.Index[1] := b and 15;
AtariSE1Channel := b and $30 shr 4;
if b and $40 <> 0 then
 AtariTimerCounter1 := 0;

Inc(k,NumberOfVBLs);
RegisterAY.Index[2] := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
DD := PVTXYMUnpackedData^[k];
RegisterAY.Index[3] := DD and 15;
DD := DD and $30 shr 4;

Inc(k,NumberOfVBLs);
RegisterAY.Index[4] := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
RegisterAY.Index[5] := PVTXYMUnpackedData^[k] and 15;

Inc(k,NumberOfVBLs);
b := PVTXYMUnpackedData^[k];
RegisterAY.Noise := b and 31;
AtariSE1TP := b shr 5;

Inc(k,NumberOfVBLs);
mx := PVTXYMUnpackedData^[k] and 63;

Inc(k,NumberOfVBLs);
la := PVTXYMUnpackedData^[k];
AtariSE2TP := la shr 5;

Inc(k,NumberOfVBLs);
lb := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
lc := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
RegisterAY.Index[11] := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
RegisterAY.Index[12] := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
b := PVTXYMUnpackedData^[k];
if b <> 255 then
 SetEnvelopeRegister(b and 15);

Inc(k,NumberOfVBLs);
SE1TC := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
SE2TC := PVTXYMUnpackedData^[k];

if (SE1TC <> 0) and (AtariSE1TP <> 0) and (AtariSE1Channel <> 0) then
 begin
  case AtariSE1Channel of
  1: begin
      AtariParam1 := la and 15;
      Envelope_EnA := True
     end;
  2: begin
      AtariParam1 := lb and 15;
      Envelope_EnB := True
     end;
  3: begin
      AtariParam1 := lc and 15;
      Envelope_EnC := True
     end
  end;
  frq := 1/(MFPTimerFrq/SE1TC/(AY_Freq/8));
  case AtariSE1TP of
  1: AtariTimerPeriod1 := frq*4;
  2: AtariTimerPeriod1 := frq*10;
  3: AtariTimerPeriod1 := frq*16;
  4: AtariTimerPeriod1 := frq*50;
  5: AtariTimerPeriod1 := frq*64;
  6: AtariTimerPeriod1 := frq*100;
  7: AtariTimerPeriod1 := frq*200
  end;
  if AtariTimerCounter1 >= AtariTimerPeriod1 then
   AtariTimerCounter1 := 0
 end
else
 begin
  AtariSE1Channel := 0;
  AtariTimerCounter1 := 0;
  AtariV1 := 0
 end;

if (SE2TC <> 0) and (AtariSE2TP <> 0) and (DD <> 0) then
 begin
  case DD of
  1: begin
      AtariParam2 := la and 15;
      Envelope_EnA := True
     end;
  2: begin
      AtariParam2 := lb and 15;
      Envelope_EnB := True
     end;
  3: begin
      AtariParam2 := lc and 15;
      Envelope_EnC := True
     end
  end;
  AtariSE2Channel := DD;
  AtariSE2Pos := 0;
  frq := 1/(MFPTimerFrq/SE2TC/(AY_Freq/8));
  case AtariSE2TP of
  1: AtariTimerPeriod2 := frq*4;
  2: AtariTimerPeriod2 := frq*10;
  3: AtariTimerPeriod2 := frq*16;
  4: AtariTimerPeriod2 := frq*50;
  5: AtariTimerPeriod2 := frq*64;
  6: AtariTimerPeriod2 := frq*100;
  7: AtariTimerPeriod2 := frq*200
  end;
  if AtariTimerCounter2 >= AtariTimerPeriod2 then
   AtariTimerCounter2 := 0
 end
else
 begin
  case AtariSE2Channel of
  0:AtariTimerCounter2 := 0;
  1:if mx and 9 <> 9 then AtariSE2Channel := 0;
  2:if mx and 18 <> 18 then AtariSE2Channel := 0;
  3:if mx and 36 <> 36 then AtariSE2Channel := 0
  end
 end;

case AtariSE2Channel of
1: mx := mx or 9;
2: mx := mx or 18;
3: mx := mx or 36;
end;

SetMixerRegister(mx);

if (AtariSE1Channel <> 1) and (AtariSE2Channel <> 1) then
 SetAmplA(la and 31);

if (AtariSE1Channel <> 2) and (AtariSE2Channel <> 2) then
 SetAmplB(lb and 31);

if (AtariSE1Channel <> 3) and (AtariSE2Channel <> 3) then
 SetAmplC(lc and 31);

Inc(Global_Tick_Counter);
Inc(Position_In_VTX);
if Position_In_VTX = NumberOfVBLs then
 Position_In_VTX := LoopVBL

end;

procedure YM6_Get_Registers;
var
 k:integer;
 b,mx,la,lb,lc:byte;
 SE1Ch,SE2Ch,SE1Typ,SE2Typ,SE1TC,SE2TC:byte;
 frq:real;
begin

k := Position_In_Vtx + VTX_Offset;
RegisterAY.Index[0] := PVTXYMUnpackedData^[k];

Inc(k);
b := PVTXYMUnpackedData^[k];
RegisterAY.Index[1] := b and 15;
SE1Ch := b and $30 shr 4;
SE1Typ := b shr 6;

Inc(k);
RegisterAY.Index[2] := PVTXYMUnpackedData^[k];

Inc(k);
b := PVTXYMUnpackedData^[k];
RegisterAY.Index[3] := b and 15;
SE2Ch := b and $30 shr 4;
SE2Typ := b shr 6;

Inc(k);
RegisterAY.Index[4] := PVTXYMUnpackedData^[k];

Inc(k);
RegisterAY.Index[5] := PVTXYMUnpackedData^[k] and 15;

Inc(k);
b := PVTXYMUnpackedData^[k];
RegisterAY.Noise := b and 31;
AtariSE1TP := b shr 5;

Inc(k);
mx := PVTXYMUnpackedData^[k] and 63;

Inc(k);
la := PVTXYMUnpackedData^[k];
AtariSE2TP := la shr 5;

Inc(k);
lb := PVTXYMUnpackedData^[k];

Inc(k);
lc := PVTXYMUnpackedData^[k];

Inc(k);
RegisterAY.Index[11] := PVTXYMUnpackedData^[k];

Inc(k);
RegisterAY.Index[12] := PVTXYMUnpackedData^[k];

Inc(k);
b := PVTXYMUnpackedData^[k];
if b <> 255 then
 SetEnvelopeRegister(b and 15);

Inc(k);
SE1TC := PVTXYMUnpackedData^[k];

Inc(k);
SE2TC := PVTXYMUnpackedData^[k];

if (SE1TC <> 0) and (AtariSE1TP <> 0) and (SE1Ch <> 0) then
 begin
  case SE1Ch of
  1:  case SE1Typ of
      0,2: begin
            AtariParam1 := la and 15;
            Envelope_EnA := True
           end;
      3:   begin
            AtariParam1 := la and 15;
            SetAmplA(la and 16)
           end
      else begin
            AtariParam1 := la and 31;
            Envelope_EnA := True
           end
      end;
  2:  case SE1Typ of
      0,2: begin
            AtariParam1 := lb and 15;
            Envelope_EnB := True
           end;
      3:   begin
            AtariParam1 := lb and 15;
            SetAmplB(lb and 16)
           end
      else begin
            AtariParam1 := lb and 31;
            Envelope_EnB := True
           end
      end;
  3:  case SE1Typ of
      0,2: begin
            AtariParam1 := lc and 15;
            Envelope_EnC := True
           end;
      3:   begin
            AtariParam1 := lc and 15;
            SetAmplC(lc and 16)
           end
      else begin
            AtariParam1 := lc and 31;
            Envelope_EnC := True
           end
      end;
  end;
  AtariSE1Type := SE1Typ;
  AtariSE1Channel := SE1Ch;
  AtariSE1Pos := 0;
  frq := 1/(MFPTimerFrq/SE1TC/(AY_Freq/8));
  case AtariSE1TP of
  1: AtariTimerPeriod1 := frq*4;
  2: AtariTimerPeriod1 := frq*10;
  3: AtariTimerPeriod1 := frq*16;
  4: AtariTimerPeriod1 := frq*50;
  5: AtariTimerPeriod1 := frq*64;
  6: AtariTimerPeriod1 := frq*100;
  7: AtariTimerPeriod1 := frq*200
  end;
  if AtariTimerCounter1 >= AtariTimerPeriod1 then
   AtariTimerCounter1 := 0
 end
else
 begin
  if (AtariSE1Channel <> 0) and (AtariSE1Type = 1) then
   begin
    case AtariSE1Channel of
    1:if mx and 9 <> 9 then AtariSE1Channel := 0;
    2:if mx and 18 <> 18 then AtariSE1Channel := 0;
    3:if mx and 36 <> 36 then AtariSE1Channel := 0
    end
   end
  else
   begin
    AtariSE1Channel := 0;
    AtariTimerCounter1 := 0;
    AtariV1 := 0
   end
 end;

if (SE2TC <> 0) and (AtariSE2TP <> 0) and (SE2Ch <> 0) then
 begin
  case SE2Ch of
  1:  case SE2Typ of
      0,2: begin
            AtariParam2 := la and 15;
            Envelope_EnA := True
           end;
      3:   begin
            AtariParam2 := la and 15;
            SetAmplA(la and 16)
           end
      else begin
            AtariParam2 := la and 31;
            Envelope_EnA := True
           end
      end;
  2:  case SE2Typ of
      0,2: begin
            AtariParam2 := lb and 15;
            Envelope_EnB := True
           end;
      3:   begin
            AtariParam2 := lb and 15;
            SetAmplB(lb and 16)
           end
      else begin
            AtariParam2 := lb and 31;
            Envelope_EnB := True
           end
      end;
  3:  case SE2Typ of
      0,2: begin
            AtariParam2 := lc and 15;
            Envelope_EnC := True
           end;
      3:   begin
            AtariParam2 := lc and 15;
            SetAmplC(lc and 16)
           end
      else begin
            AtariParam2 := lc and 31;
            Envelope_EnC := True
           end
      end;
  end;
  AtariSE2Type := SE2Typ;
  AtariSE2Channel := SE2Ch;
  AtariSE2Pos := 0;
  frq := 1/(MFPTimerFrq/SE2TC/(AY_Freq/8));
  case AtariSE2TP of
  1: AtariTimerPeriod2 := frq*4;
  2: AtariTimerPeriod2 := frq*10;
  3: AtariTimerPeriod2 := frq*16;
  4: AtariTimerPeriod2 := frq*50;
  5: AtariTimerPeriod2 := frq*64;
  6: AtariTimerPeriod2 := frq*100;
  7: AtariTimerPeriod2 := frq*200
  end;
  if AtariTimerCounter2 >= AtariTimerPeriod2 then
   AtariTimerCounter2 := 0
 end
else
 begin
  if (AtariSE2Channel <> 0) and (AtariSE2Type = 1) then
   begin
    case AtariSE2Channel of
    1:if mx and 9 <> 9 then AtariSE2Channel := 0;
    2:if mx and 18 <> 18 then AtariSE2Channel := 0;
    3:if mx and 36 <> 36 then AtariSE2Channel := 0
    end
   end
  else
   begin
    AtariSE2Channel := 0;
    AtariTimerCounter2 := 0;
    AtariV2 := 0
   end
 end;

if AtariSE1Type = 1 then
 case AtariSE1Channel of
 1: mx := mx or 9;
 2: mx := mx or 18;
 3: mx := mx or 36;
 end;

if AtariSE2Type = 1 then
 case AtariSE2Channel of
 1: mx := mx or 9;
 2: mx := mx or 18;
 3: mx := mx or 36;
 end;

SetMixerRegister(mx);

if (AtariSE1Channel <> 1) and (AtariSE2Channel <> 1) then
 SetAmplA(la and 31);

if (AtariSE1Channel <> 2) and (AtariSE2Channel <> 2) then
 SetAmplB(lb and 31);

if (AtariSE1Channel <> 3) and (AtariSE2Channel <> 3) then
 SetAmplC(lc and 31);

Inc(Global_Tick_Counter);
Inc(Position_In_VTX,16);
if Position_In_VTX div 16 = NumberOfVBLs then
 Position_In_VTX := LoopVBL * 16

end;

procedure YM6i_Get_Registers;
var
 k:integer;
 b,mx,la,lb,lc:byte;
 SE1Ch,SE2Ch,SE1Typ,SE2Typ,SE1TC,SE2TC:byte;
 frq:real;
begin

k := Position_In_Vtx + VTX_Offset;
RegisterAY.Index[0] := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
b := PVTXYMUnpackedData^[k];
RegisterAY.Index[1] := b and 15;
SE1Ch := b and $30 shr 4;
SE1Typ := b shr 6;

Inc(k,NumberOfVBLs);
RegisterAY.Index[2] := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
b := PVTXYMUnpackedData^[k];
RegisterAY.Index[3] := b and 15;
SE2Ch := b and $30 shr 4;
SE2Typ := b shr 6;

Inc(k,NumberOfVBLs);
RegisterAY.Index[4] := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
RegisterAY.Index[5] := PVTXYMUnpackedData^[k] and 15;

Inc(k,NumberOfVBLs);
b := PVTXYMUnpackedData^[k];
RegisterAY.Noise := b and 31;
AtariSE1TP := b shr 5;

Inc(k,NumberOfVBLs);
mx := PVTXYMUnpackedData^[k] and 63;

Inc(k,NumberOfVBLs);
la := PVTXYMUnpackedData^[k];
AtariSE2TP := la shr 5;

Inc(k,NumberOfVBLs);
lb := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
lc := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
RegisterAY.Index[11] := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
RegisterAY.Index[12] := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
b := PVTXYMUnpackedData^[k];
if b <> 255 then
 SetEnvelopeRegister(b and 15);

Inc(k,NumberOfVBLs);
SE1TC := PVTXYMUnpackedData^[k];

Inc(k,NumberOfVBLs);
SE2TC := PVTXYMUnpackedData^[k];

if (SE1TC <> 0) and (AtariSE1TP <> 0) and (SE1Ch <> 0) then
 begin
  case SE1Ch of
  1:  case SE1Typ of
      0,2: begin
            AtariParam1 := la and 15;
            Envelope_EnA := True
           end;
      3:   begin
            AtariParam1 := la and 15;
            SetAmplA(la and 16)
           end
      else begin
            AtariParam1 := la and 31;
            Envelope_EnA := True
           end
      end;
  2:  case SE1Typ of
      0,2: begin
            AtariParam1 := lb and 15;
            Envelope_EnB := True
           end;
      3:   begin
            AtariParam1 := lb and 15;
            SetAmplB(lb and 16)
           end
      else begin
            AtariParam1 := lb and 31;
            Envelope_EnB := True
           end
      end;
  3:  case SE1Typ of
      0,2: begin
            AtariParam1 := lc and 15;
            Envelope_EnC := True
           end;
      3:   begin
            AtariParam1 := lc and 15;
            SetAmplC(lc and 16)
           end
      else begin
            AtariParam1 := lc and 31;
            Envelope_EnC := True
           end
      end;
  end;
  AtariSE1Type := SE1Typ;
  AtariSE1Channel := SE1Ch;
  AtariSE1Pos := 0;
  frq := 1/(MFPTimerFrq/SE1TC/(AY_Freq/8));
  case AtariSE1TP of
  1: AtariTimerPeriod1 := frq*4;
  2: AtariTimerPeriod1 := frq*10;
  3: AtariTimerPeriod1 := frq*16;
  4: AtariTimerPeriod1 := frq*50;
  5: AtariTimerPeriod1 := frq*64;
  6: AtariTimerPeriod1 := frq*100;
  7: AtariTimerPeriod1 := frq*200
  end;
  if AtariTimerCounter1 >= AtariTimerPeriod1 then
   AtariTimerCounter1 := 0
 end
else
 begin
  if (AtariSE1Channel <> 0) and (AtariSE1Type = 1) then
   begin
    case AtariSE1Channel of
    1:if mx and 9 <> 9 then AtariSE1Channel := 0;
    2:if mx and 18 <> 18 then AtariSE1Channel := 0;
    3:if mx and 36 <> 36 then AtariSE1Channel := 0
    end
   end
  else
   begin
    AtariSE1Channel := 0;
    AtariTimerCounter1 := 0;
    AtariV1 := 0
   end
 end;

if (SE2TC <> 0) and (AtariSE2TP <> 0) and (SE2Ch <> 0) then
 begin
  case SE2Ch of
  1:  case SE2Typ of
      0,2: begin
            AtariParam2 := la and 15;
            Envelope_EnA := True
           end;
      3:   begin
            AtariParam2 := la and 15;
            SetAmplA(la and 16)
           end
      else begin
            AtariParam2 := la and 31;
            Envelope_EnA := True
           end
      end;
  2:  case SE2Typ of
      0,2: begin
            AtariParam2 := lb and 15;
            Envelope_EnB := True
           end;
      3:   begin
            AtariParam2 := lb and 15;
            SetAmplB(lb and 16)
           end
      else begin
            AtariParam2 := lb and 31;
            Envelope_EnB := True
           end
      end;
  3:  case SE2Typ of
      0,2: begin
            AtariParam2 := lc and 15;
            Envelope_EnC := True
           end;
      3:   begin
            AtariParam2 := lc and 15;
            SetAmplC(lc and 16)
           end
      else begin
            AtariParam2 := lc and 31;
            Envelope_EnC := True
           end
      end;
  end;
  AtariSE2Type := SE2Typ;
  AtariSE2Channel := SE2Ch;
  AtariSE2Pos := 0;
  frq := 1/(MFPTimerFrq/SE2TC/(AY_Freq/8));
  case AtariSE2TP of
  1: AtariTimerPeriod2 := frq*4;
  2: AtariTimerPeriod2 := frq*10;
  3: AtariTimerPeriod2 := frq*16;
  4: AtariTimerPeriod2 := frq*50;
  5: AtariTimerPeriod2 := frq*64;
  6: AtariTimerPeriod2 := frq*100;
  7: AtariTimerPeriod2 := frq*200
  end;
  if AtariTimerCounter2 >= AtariTimerPeriod2 then
   AtariTimerCounter2 := 0
 end
else
 begin
  if (AtariSE2Channel <> 0) and (AtariSE2Type = 1) then
   begin
    case AtariSE2Channel of
    1:if mx and 9 <> 9 then AtariSE2Channel := 0;
    2:if mx and 18 <> 18 then AtariSE2Channel := 0;
    3:if mx and 36 <> 36 then AtariSE2Channel := 0
    end
   end
  else
   begin
    AtariSE2Channel := 0;
    AtariTimerCounter2 := 0;
    AtariV2 := 0
   end
 end;

if AtariSE1Type = 1 then
 case AtariSE1Channel of
 1: mx := mx or 9;
 2: mx := mx or 18;
 3: mx := mx or 36;
 end;

if AtariSE2Type = 1 then
 case AtariSE2Channel of
 1: mx := mx or 9;
 2: mx := mx or 18;
 3: mx := mx or 36;
 end;

SetMixerRegister(mx);

if (AtariSE1Channel <> 1) and (AtariSE2Channel <> 1) then
 SetAmplA(la and 31);

if (AtariSE1Channel <> 2) and (AtariSE2Channel <> 2) then
 SetAmplB(lb and 31);

if (AtariSE1Channel <> 3) and (AtariSE2Channel <> 3) then
 SetAmplC(lc and 31);

Inc(Global_Tick_Counter);
Inc(Position_In_VTX);
if Position_In_VTX = NumberOfVBLs then
 Position_In_VTX := LoopVBL

end;

procedure EPSG_Get_Registers;
var
 EPSGRec:packed record
  case Boolean of
  True:(Reg,Data:byte;
        TSt:longword);
  False:(All:int64);
 end;
begin
if (UniReadersData[FileHandle].UniFilePos =
     UniReadersData[FileHandle].UniFileSize) then
 exit;
EPSGRec.All := 0;
repeat
UniRead(FileHandle,@EPSGRec,5);
if EPSGRec.All <> $FFFFFFFFFF then
 with EPSGRec do
  SetAYRegister(Reg,Data)
until (UniReadersData[FileHandle].UniFilePos =
     UniReadersData[FileHandle].UniFileSize) or
      (EPSGRec.All = $FFFFFFFFFF)
end;

procedure PSG_Get_Registers;
var
 b,b2:byte;
begin
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit;
  end;
inc(Global_Tick_Counter);
if PSG_Skip > 0 then
 begin
  dec(PSG_Skip);
  exit;
 end;
if UniReadersData[FileHandle].UniFileSize <= 16 then exit;
if UniReadersData[FileHandle].UniFilePos >=
     UniReadersData[FileHandle].UniFileSize then
 InitForAllTypes(False);
repeat
 UniRead(FileHandle,@b,1);
 if b = 255 then exit;
 if b = 254 then
  begin
   UniRead(FileHandle,@b,1);
   PSG_Skip := b * 4 - 1;
   exit
  end;
 if UniReadersData[FileHandle].UniFilePos <
       UniReadersData[FileHandle].UniFileSize then
  begin
   UniRead(FileHandle,@b2,1);
   if b < 14 then
    begin
     case b of
     13:SetEnvelopeRegister(b2 and 15);
     1,3,5:
        RegisterAY.Index[b] := b2 and 15;
     6: RegisterAY.Noise := b2 and 31;
     7: SetMixerRegister(b2 and 63);
     8: SetAmplA(b2 and 31);
     9: SetAmplB(b2 and 31);
     10:SetAmplC(b2 and 31);
     else
        RegisterAY.Index[b] := b2;
     end;
    end;
  end;
until UniReadersData[FileHandle].UniFilePos >=
       UniReadersData[FileHandle].UniFileSize
end;

procedure ZXAY_Get_Registers;
var
 AY_Takt:longint;
 Number_Of_Takts,tmp:longint;
begin
with UniReadersData[FileHandle]^ do
 if UniFilePos = UniFileSize then
  exit;
repeat
if not IntFlag then
 begin
  UniRead(FileHandle,@tmp,4);
  AY_Takt := tmp and $FFFFF;
  AY_Reg := (tmp shr 20) and 15;
  AY_Data := tmp shr 24;
  Number_Of_Takts := AY_Takt - Previous_AY_Takt;
  Previous_AY_Takt := AY_Takt;
  if (Number_Of_Takts <= 0) then Inc(Number_Of_Takts,$100000);
  Inc(OUTZXAYConv_TotalTime,Number_Of_Takts);
 end;
IntFlag := False;
if OUTZXAYConv_TotalTime >= MaxTStates then
 begin
  Dec(OUTZXAYConv_TotalTime,MaxTStates);
  IntFlag := True;
  exit
 end;
SetAYRegisterFast(AY_Reg,AY_Data)
until UniReadersData[FileHandle]^.UniFilePos =
                UniReadersData[FileHandle]^.UniFileSize
end;

procedure PT3_Get_Registers;

 function GetNoteFreq(j:integer):integer;
 begin
  case RAM.PT3_TonTableId of
  0:if PlParams.PT3.PT3_Version <= 3 then
     Result := PT3NoteTable_PT_33_34r[j]
    else
     Result := PT3NoteTable_PT_34_35[j];
  1:Result := PT3NoteTable_ST[j];
  2:if PlParams.PT3.PT3_Version <= 3 then
     Result := PT3NoteTable_ASM_34r[j]
    else
     Result := PT3NoteTable_ASM_34_35[j];
  else if PlParams.PT3.PT3_Version <= 3 then
        Result := PT3NoteTable_REAL_34r[j]
       else
        Result := PT3NoteTable_REAL_34_35[j]
  end
 end;

 procedure PatternInterpreter(var Chan:PT3_Channel_Parameters);
 var
  quit:boolean;
  Flag9,Flag8,Flag5,Flag4,
  Flag3,Flag2,Flag1:byte;
  counter:byte;
  PrNote,PrSliding:integer;
 begin
  PrNote := Chan.Note;
  PrSliding := Chan.Current_Ton_Sliding;
  quit := False;
  counter := 0;
  Flag9 := 0; Flag8 := 0; Flag5 := 0; Flag4 := 0;
  Flag3 := 0; Flag2 := 0; Flag1 := 0;
  with Chan,RAM do
   begin
    repeat
     case Index[Address_In_Pattern] of
     $f0..$ff:
       begin
        OrnamentPointer :=
          PT3_OrnamentsPointers[Index[Address_In_Pattern] - $f0];
        Loop_Ornament_Position := Index[OrnamentPointer];
        Inc(OrnamentPointer);
        Ornament_Length := Index[OrnamentPointer];
        Inc(OrnamentPointer);
        Inc(Address_In_Pattern);
        SamplePointer := PT3_SamplesPointers[Index[Address_In_Pattern] div 2];
        Loop_Sample_Position := Index[SamplePointer];
        Inc(SamplePointer);
        Sample_Length := Index[SamplePointer];
        Inc(SamplePointer);
        Envelope_Enabled := False;
        Position_In_Ornament := 0
       end;
     $d1..$ef:
       begin
        SamplePointer := PT3_SamplesPointers[Index[Address_In_Pattern] - $d0];
        Loop_Sample_Position := Index[SamplePointer];
        Inc(SamplePointer);
        Sample_Length := Index[SamplePointer];
        Inc(SamplePointer)
       end;
     $d0:
       quit := true;
     $c1..$cf:
       Volume := Index[Address_In_Pattern] - $c0;
     $c0:
       begin
        Position_In_Sample := 0;
        Current_Amplitude_Sliding := 0;
        Current_Noise_Sliding := 0;
        Current_Envelope_Sliding := 0;
        Position_In_Ornament := 0;
        Ton_Slide_Count := 0;
        Current_Ton_Sliding := 0;
        Ton_Accumulator := 0;
        Current_OnOff := 0;
        Enabled := False;
        quit := True;
       end;
     $b2..$bf:
       begin
        Envelope_Enabled := True;
        SetEnvelopeRegister(Index[Address_In_Pattern] - $b1);
        Inc(Address_In_Pattern);
        with PlParams.PT3 do
         begin
          Env_Base.hi := Index[Address_In_Pattern];
          Inc(Address_In_Pattern);
          Env_Base.lo := Index[Address_In_Pattern];
          Position_In_Ornament := 0;
          Cur_Env_Slide := 0;
          Cur_Env_Delay := 0
         end
       end;
     $b1:
       begin
        inc(Address_In_Pattern);
        Number_Of_Notes_To_Skip := Index[Address_In_Pattern]
       end;
     $b0:
       begin
        Envelope_Enabled := False;
        Position_In_Ornament := 0
       end;
     $50..$af:
       begin
        Note := Index[Address_In_Pattern] - $50;
        Position_In_Sample := 0;
        Current_Amplitude_Sliding := 0;
        Current_Noise_Sliding := 0;
        Current_Envelope_Sliding := 0;
        Position_In_Ornament := 0;
        Ton_Slide_Count := 0;
        Current_Ton_Sliding := 0;
        Ton_Accumulator := 0;
        Current_OnOff := 0;
        Enabled := True;
        quit := True
       end;
     $40..$4f:
       begin
        OrnamentPointer :=
          PT3_OrnamentsPointers[Index[Address_In_Pattern] - $40];
        Loop_Ornament_Position := Index[Chan.OrnamentPointer];
        Inc(OrnamentPointer);
        Ornament_Length := Index[OrnamentPointer];
        Inc(OrnamentPointer);
        Position_In_Ornament := 0
       end;
     $20..$3f:
       PlParams.PT3.Noise_Base := Index[Address_In_Pattern] - $20;
     $10..$1f:
       begin
        if Index[Address_In_Pattern] = $10 then
         Envelope_Enabled := False
        else
         begin
          SetEnvelopeRegister(Index[Address_In_Pattern] - $10);
          Inc(Address_In_Pattern);
          with PlParams.PT3 do
           begin
            Env_Base.hi := Index[Address_In_Pattern];
            Inc(Address_In_Pattern);
            Env_Base.lo := Index[Address_In_Pattern];
            Envelope_Enabled := True;
            Cur_Env_Slide := 0;
            Cur_Env_Delay := 0
           end
         end;
        Inc(Address_In_Pattern);
        SamplePointer := PT3_SamplesPointers[Index[Address_In_Pattern] div 2];
        Loop_Sample_Position := Index[SamplePointer];
        Inc(SamplePointer);
        Sample_Length := Index[SamplePointer];
        Inc(SamplePointer);
        Position_In_Ornament := 0
       end;
     $9:
       begin
        Inc(counter);
        Flag9 := counter
       end;
     $8:
       begin
        Inc(counter);
        Flag8 := counter
       end;
     $5:
       begin
        Inc(counter);
        Flag5 := counter
       end;
     $4:
       begin
        Inc(counter);
        Flag4 := counter
       end;
     $3:
       begin
        Inc(counter);
        Flag3 := counter
       end;
     $2:
       begin
        Inc(counter);
        Flag2 := counter
       end;
     $1:
       begin
        Inc(counter);
        Flag1 := counter
       end
     end;
     inc(Address_In_Pattern)
    until quit;
    while counter > 0 do
     begin
      if (counter = Flag1) then
       begin
        Ton_Slide_Delay := Index[Address_In_Pattern];
        Ton_Slide_Count := Ton_Slide_Delay;
        Inc(Address_In_Pattern);
        Ton_Slide_Step := WordPtr(@Index[Address_In_Pattern])^;
        Inc(Address_In_Pattern,2);
        SimpleGliss := True;
        Current_OnOff := 0
       end
      else if (counter = Flag2) then
       begin
        SimpleGliss := False;
        Current_OnOff := 0;
        Ton_Slide_Delay := Index[Address_In_Pattern];
        Ton_Slide_Count := Ton_Slide_Delay;
        Inc(Address_In_Pattern,3);
        Ton_Slide_Step := Abs(SmallInt(WordPtr(@Index[Address_In_Pattern])^));
        Inc(Address_In_Pattern,2);
        Ton_Delta := GetNoteFreq(Note) - GetNoteFreq(PrNote);
        Slide_To_Note := Note;
        Note := PrNote;
        if PlParams.PT3.PT3_Version >= 6 then
         Current_Ton_Sliding := PrSliding;
        if Ton_Delta - Current_Ton_Sliding < 0 then
         Ton_Slide_Step := -Ton_Slide_Step
       end
      else if counter = Flag3 then
       begin
        Position_in_Sample := Index[Address_In_Pattern];
        Inc(Address_In_Pattern)
       end
      else if counter = Flag4 then
       begin
        Position_in_Ornament := Index[Address_In_Pattern];
        inc(Address_In_Pattern)
       end
      else if counter = Flag5 then
       begin
        OnOff_Delay := Index[Address_In_Pattern];
        Inc(Address_In_Pattern);
        OffOn_Delay := Index[Address_In_Pattern];
        Current_OnOff := OnOff_Delay;
        Inc(Address_In_Pattern);
        Ton_Slide_Count := 0;
        Current_Ton_Sliding := 0
       end
      else if counter = Flag8 then
       begin
        with PlParams.PT3 do
         begin
          Env_Delay := Index[Address_In_Pattern];
          Cur_Env_Delay := Env_Delay;
          Inc(Address_In_Pattern);
          Env_Slide_Add := WordPtr(@Index[Address_In_Pattern])^;
         end;
        Inc(Address_In_Pattern,2)
       end
      else if counter = Flag9 then
       begin
        PlParams.PT3.Delay := Index[Address_In_Pattern];
        Inc(Address_In_Pattern)
       end;
      Dec(counter)
     end;
    Note_Skip_Counter := Number_Of_Notes_To_Skip
   end
 end;

var
 TempMixer:byte;
 AddToEnv:shortint;

 procedure ChangeRegisters(var Chan:PT3_Channel_Parameters);
 var
  j,b1,b0:byte;
  w:word;
 begin
  with Chan,RAM do
   begin
    if Enabled then
     begin
      Ton := WordPtr(@Index[SamplePointer + Position_In_Sample * 4 + 2])^;
      Inc(Ton,Ton_Accumulator);
      b0 := Index[SamplePointer + Position_In_Sample * 4];
      b1 := Index[SamplePointer + Position_In_Sample * 4 + 1];
      if b1 and $40 <> 0 then
       Ton_Accumulator := Ton;
      j := Note + Index[OrnamentPointer + Position_In_Ornament];
      if shortint(j) < 0 then j := 0
      else if j > 95 then j := 95;
      w := GetNoteFreq(j);
      Ton := (Ton + Current_Ton_Sliding + w) and $fff;
      if Ton_Slide_Count > 0 then
       begin
        Dec(Ton_Slide_Count);
        if Ton_Slide_Count = 0 then
         begin
          Inc(Current_Ton_Sliding,Ton_Slide_Step);
          Ton_Slide_Count := Ton_Slide_Delay;
          if not SimpleGliss then
           if ((Ton_Slide_Step < 0) and (Current_Ton_Sliding <= Ton_Delta)) or
              ((Ton_Slide_Step >= 0) and (Current_Ton_Sliding >= Ton_Delta)) then
            begin
             Note := Slide_To_Note;
             Ton_Slide_Count := 0;
             Current_Ton_Sliding := 0
            end
         end
       end;
      Amplitude := b1 and $f;
      if b0 and $80 <> 0 then
      if b0 and $40 <> 0 then
       begin
        if Current_Amplitude_Sliding < 15 then
         inc(Current_Amplitude_Sliding)
       end
      else if Current_Amplitude_Sliding > -15 then
       dec(Current_Amplitude_Sliding);
      inc(Amplitude,Current_Amplitude_Sliding);
      if shortint(Amplitude) < 0 then Amplitude := 0
      else if Amplitude > 15 then Amplitude := 15;
      if PlParams.PT3.PT3_Version <= 4 then
       Amplitude := PT3VolumeTable_33_34[Volume,Amplitude]
      else
       Amplitude := PT3VolumeTable_35[Volume,Amplitude];
      if (b0 and 1 = 0) and Envelope_Enabled then
       Amplitude := Amplitude or 16;
      if b1 and $80 <> 0 then
       begin
        if b0 and $20 <> 0 then
         j := (b0 shr 1) or $F0 + Current_Envelope_Sliding
        else
         j := (b0 shr 1) and $F + Current_Envelope_Sliding;
        if b1 and $20 <> 0 then Current_Envelope_Sliding := j;
        Inc(AddToEnv,j)
       end
      else
       begin
        PlParams.PT3.AddToNoise := b0 shr 1 + Current_Noise_Sliding;
        if b1 and $20 <> 0 then
         Current_Noise_Sliding := PlParams.PT3.AddToNoise
       end;
      TempMixer := b1 shr 1 and $48 or TempMixer;
      Inc(Position_In_Sample);
      if Position_In_Sample >= Sample_Length then
       Position_In_Sample := Loop_Sample_Position;
      Inc(Position_In_Ornament);
      if Position_In_Ornament >= Ornament_Length then
       Position_In_Ornament := Loop_Ornament_Position
     end
    else
     Amplitude := 0;
    TempMixer := TempMixer shr 1;
    if Current_OnOff > 0 then
     begin
      dec(Current_OnOff);
      if Current_OnOff = 0 then
       begin
        Enabled := not Enabled;
        if Enabled then Current_OnOff := OnOff_Delay
        else Current_OnOff := OffOn_Delay
       end;
     end
   end
 end;

begin
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := true;
   exit
  end;
with PlParams.PT3 do
 begin
  Dec(DelayCounter);
  if DelayCounter = 0 then
   begin
    with PlParams.PT3_A do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter = 0 then
       with RAM do
        begin
         if (Index[Address_In_Pattern] = 0) then
          begin
           inc(CurrentPosition);
           if CurrentPosition = PT3_NumberOfPositions then
            CurrentPosition := PT3_LoopPosition;
           Address_In_Pattern :=
             WordPtr(@Index[PT3_PatternsPointer +
                         PT3_PositionList[CurrentPosition] * 2])^;
           PlParams.PT3_B.Address_In_Pattern :=
             WordPtr(@Index[PT3_PatternsPointer +
                         PT3_PositionList[CurrentPosition] * 2 + 2])^;
           PlParams.PT3_C.Address_In_Pattern :=
             WordPtr(@Index[PT3_PatternsPointer +
                         PT3_PositionList[CurrentPosition] * 2 + 4])^;
           Noise_Base := 0
          end;
         PatternInterpreter(PlParams.PT3_A);
        end;
     end;
    with PlParams.PT3_B do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter = 0 then
       PatternInterpreter(PlParams.PT3_B);
     end;
    with PlParams.PT3_C do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter = 0 then
       PatternInterpreter(PlParams.PT3_C);
     end;
    DelayCounter := Delay
   end;

  AddToEnv := 0;
  TempMixer := 0;
  ChangeRegisters(PlParams.PT3_A);
  ChangeRegisters(PlParams.PT3_B);
  ChangeRegisters(PlParams.PT3_C);

  SetMixerRegister(TempMixer);

  RegisterAY.TonA := PlParams.PT3_A.Ton;
  RegisterAY.TonB := PlParams.PT3_B.Ton;
  RegisterAY.TonC := PlParams.PT3_C.Ton;

  SetAmplA(PlParams.PT3_A.Amplitude);
  SetAmplB(PlParams.PT3_B.Amplitude);
  SetAmplC(PlParams.PT3_C.Amplitude);

  RegisterAY.Noise := (Noise_Base + AddToNoise) and 31;

  RegisterAY.Envelope := Env_Base.wrd + AddToEnv + Cur_Env_Slide;

  if Cur_Env_Delay > 0 then
   begin
    Dec(Cur_Env_Delay);
    if Cur_Env_Delay = 0 then
     begin
      Cur_Env_Delay := Env_Delay;
      Inc(Cur_Env_Slide,Env_Slide_Add)
     end
   end
end;

Inc(Global_Tick_Counter)

end;

procedure PT2_Get_Registers;
var
 TempMixer:byte;
 
 procedure PatternInterpreter(var Chan:PT2_Channel_Parameters);
 var
  quit,gliss:boolean;
 begin
 quit := False;
 gliss := False;
 with Chan,RAM do
  begin
   repeat
    case Index[Chan.Address_In_Pattern] of
    $e1..$ff:
     begin
      SamplePointer := PT2_SamplesPointers[Index[Address_In_Pattern] - $e0];
      Sample_Length := Index[SamplePointer];
      Inc(SamplePointer);
      Loop_Sample_Position := Index[SamplePointer];
      Inc(SamplePointer)
     end;
    $e0:
     begin
      Position_In_Sample := 0;
      Position_In_Ornament := 0;
      Current_Ton_Sliding := 0;
      GlissType := 0;
      Enabled := False;
      quit := True
     end;
    $80..$df:
     begin
      Position_In_Sample := 0;
      Position_In_Ornament := 0;
      Current_Ton_Sliding := 0;
      if gliss then
       begin
        Slide_To_Note := Index[Address_In_Pattern] - $80;
        if GlissType = 1 then Note := Slide_To_Note
       end
      else
       begin
        Note := Index[Address_In_Pattern] - $80;
        GlissType := 0
       end;
      Enabled := True;
      quit := True
     end;
    $7f:
     Envelope_Enabled := False;
    $71..$7e:
     begin
      Envelope_Enabled := True;
      SetEnvelopeRegister(Index[Address_In_Pattern] - $70);
      Inc(Address_In_Pattern);
      RegisterAY.Index[11] := Index[Address_In_Pattern];
      Inc(Address_In_Pattern);
      RegisterAY.Index[12] := Index[Address_In_Pattern]
     end;
    $70:
      quit := True;
    $60..$6f:
     begin
      OrnamentPointer := PT2_OrnamentsPointers[Index[Address_In_Pattern] - $60];
      Ornament_Length := Index[OrnamentPointer];
      Inc(OrnamentPointer);
      Loop_Ornament_Position := Index[OrnamentPointer];
      Inc(OrnamentPointer);
      Position_In_Ornament := 0
     end;
    $20..$5f:
     Number_Of_Notes_To_Skip := Index[Address_In_Pattern] - $20;
    $10..$1f:
     Volume := Index[Address_In_Pattern] - $10;
    $f:
     begin
      Inc(Address_In_Pattern);
      PlParams.PT2.Delay := Index[Address_In_Pattern]
     end;
    $e:
     begin
      Inc(Address_In_Pattern);
      Glissade := Index[Address_In_Pattern];
      GlissType := 1;
      gliss := True
     end;
    $d:
     begin
      Inc(Address_In_Pattern);
      Glissade := Abs(shortint(Index[Address_In_Pattern]));
{      Inc(Address_In_Pattern);
      Ton_Delta := Index[Address_In_Pattern];
      Inc(Address_In_Pattern);
      Inc(Ton_Delta,word(Index[Address_In_Pattern])shl 8);}
      Inc(Address_In_Pattern,2); //Not use precalculated Ton_Delta
                                //to avoide error with first note of pattern
      GlissType := 2;
      gliss := True;
     end;
    $c:
     GlissType := 0
    else
     begin
      Inc(Address_In_Pattern);
      Addition_To_Noise := Index[Address_In_Pattern]
     end
    end;
    inc(Address_In_Pattern)
   until quit;
   {Alternative Ton_Delta calc begin}
   if gliss and (GlissType = 2) then
    begin
     Ton_Delta := Abs(PT2_Table[Slide_To_Note] - PT2_Table[Note]);
     if Slide_To_Note > Note then Glissade := -Glissade
    end;
   {Alternative Ton_Delta calc end}
   Note_Skip_Counter := Number_Of_Notes_To_Skip
  end
 end;

 procedure GetRegisters(var Chan:PT2_Channel_Parameters);
 var
  j,b0,b1:byte;
 begin
  with Chan,RAM do
   begin
    if Enabled then
     begin
      b0 := Index[SamplePointer + Position_In_Sample * 3];
      b1 := Index[SamplePointer + Position_In_Sample * 3 + 1];
      Ton := Index[SamplePointer + Position_In_Sample * 3 + 2] +
        word(b1 and 15) shl 8;
      if b0 and 4 = 0 then Ton := -Ton;
      j := Note + Index[OrnamentPointer + Position_In_Ornament];
      if j > 95 then j := 95;
      Ton := (Ton + Current_Ton_Sliding + PT2_Table[j]) and $fff;
      if GlissType = 2 then
       begin
        Ton_Delta := Ton_Delta - Abs(Glissade);
        if Ton_Delta < 0 then
         begin
          Note := Slide_To_Note;
          GlissType := 0;
          Current_Ton_Sliding := 0
         end
       end;
      if GlissType <> 0 then inc(Current_Ton_Sliding,Glissade);
      Amplitude := round((Volume * 17 + byte(Volume > 7)) * (b1 shr 4) / 256);
      if Envelope_Enabled then Amplitude := Amplitude or 16;
      if Index[SamplePointer + Position_In_Sample * 3] and 1 <> 0 then
       TempMixer := TempMixer or 64
      else
       RegisterAY.Noise := (b0 shr 3 + Addition_To_Noise) and 31;
      if b0 and 2 <> 0 then
       TempMixer := TempMixer or 8;
      inc(Position_In_Sample);
      if Position_In_Sample = Sample_Length then
       Position_In_Sample := Loop_Sample_Position;
      inc(Position_In_Ornament);
      if Position_In_Ornament = Ornament_Length then
       Position_In_Ornament := Loop_Ornament_Position
     end
    else
     Amplitude := 0
   end;
  TempMixer := TempMixer shr 1
 end;

begin
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit
  end;
with PlParams.PT2 do
 begin
  Dec(DelayCounter);
  if DelayCounter = 0 then
   begin
    with PlParams.PT2_A,RAM do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       begin
        if (Index[Address_In_Pattern] = 0)then
         begin
          Inc(CurrentPosition);
          if CurrentPosition = PT2_NumberOfPositions then
           CurrentPosition := PT2_LoopPosition;
          Address_In_Pattern := WordPtr(@Index[PT2_PatternsPointer +
                                   PT2_PositionList[CurrentPosition] * 6])^;
          PlParams.PT2_B.Address_In_Pattern :=
           WordPtr(@Index[PT2_PatternsPointer +
                                   PT2_PositionList[CurrentPosition] * 6 + 2])^;
          PlParams.PT2_C.Address_In_Pattern :=
           WordPtr(@Index[PT2_PatternsPointer +
                                   PT2_PositionList[CurrentPosition] * 6 + 4])^;
         end;
        PatternInterpreter(PlParams.PT2_A);
       end
     end;
    with PlParams.PT2_B do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.PT2_B)
     end;
    with PlParams.PT2_C do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.PT2_C)
     end;
    DelayCounter := Delay
   end;
  TempMixer := 0;
  GetRegisters(PlParams.PT2_A);
  GetRegisters(PlParams.PT2_B);
  GetRegisters(PlParams.PT2_C);

  SetMixerRegister(TempMixer);

  RegisterAY.TonA := PlParams.PT2_A.Ton;
  RegisterAY.TonB := PlParams.PT2_B.Ton;
  RegisterAY.TonC := PlParams.PT2_C.Ton;

  SetAmplA(PlParams.PT2_A.Amplitude);
  SetAmplB(PlParams.PT2_B.Amplitude);
  SetAmplC(PlParams.PT2_C.Amplitude);

  inc(Global_Tick_Counter)
 end
end;

procedure PT1_Get_Registers;
var
 TempMixer:integer;

 procedure PatternInterpreter(var Chan:PT1_Channel_Parameters);
 var
  quit:boolean;
 begin
  quit := False;
  with Chan do
   begin
    repeat
     with RAM do
      case Index[Address_In_Pattern] of
      0..$5f:
       begin
        Note := Index[Address_In_Pattern];
        Enabled := True;
        Position_In_Sample := 0;
        quit := True
       end;
      $60..$6f:
       begin
        SamplePointer := PT1_SamplesPointers[Index[Address_In_Pattern] - $60];
        Sample_Length := Index[SamplePointer];
        Inc(SamplePointer);
        Loop_Sample_Position := Index[SamplePointer];
        Inc(SamplePointer)
       end;
      $70..$7f:
       OrnamentPointer := PT1_OrnamentsPointers[
                                Index[Address_In_Pattern] - $70];
      $80:
       begin
        Enabled := False;
        quit := True
       end;
      $81:
       Envelope_Enabled := False;
      $82..$8f:
       begin
        Envelope_Enabled := True;
        SetEnvelopeRegister(Index[Address_In_Pattern] - $81);
        Inc(Address_In_Pattern);
        RegisterAY.Envelope := WordPtr(@Index[Address_In_Pattern])^;
        Inc(Address_In_Pattern)
       end;
      $90:
       quit := True;
      $91..$a0:
       PlParams.PT1.Delay := Index[Address_In_Pattern] - $91;
      $a1..$b0:
       Volume := Index[Address_In_Pattern] - $a1;
      else
       Number_Of_Notes_To_Skip := Index[Address_In_Pattern] - $b1;
      end;
      Inc(Address_In_Pattern)
    until quit;
    Note_Skip_Counter := Number_Of_Notes_To_Skip
   end
 end;

 procedure GetRegisters(var Chan:PT1_Channel_Parameters);
 var
  j,b:byte;
 begin
  with Chan do
   if Enabled then
    with RAM do
     begin
      j := Note + Index[OrnamentPointer + Position_In_Sample];
      if j > 95 then j := 95;
      b := Index[SamplePointer + Position_In_Sample * 3];
      Ton := word(b) shl 4 and $f00 +
                        Index[SamplePointer + Position_In_Sample * 3 + 2];
      Amplitude := round((Volume * 17 + byte(Volume > 7)) * (b and 15) / 256);
      b := Index[SamplePointer + Position_In_Sample * 3 + 1];
      if b and 32 = 0 then Ton := -Ton;
      Ton := (Ton + PT2_Table[j] + word(j = 46)) and $fff;
      if Envelope_Enabled then Amplitude := Amplitude or 16;
      if shortint(b) < 0 then
       TempMixer := TempMixer or 64
      else
       RegisterAY.Noise := b and 31;
      if b and 64 <> 0 then
       TempMixer := TempMixer or 8;
      Inc(Position_In_Sample);
      if Position_In_Sample = Sample_Length then
       Position_In_Sample := Loop_Sample_Position
     end
    else
     Amplitude := 0;
   TempMixer := TempMixer shr 1;
 end;

begin
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit
  end;
with PlParams.PT1 do
 begin
  Dec(DelayCounter);
  if DelayCounter = 0 then
   begin
    with PlParams.PT1_A do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       begin
        with RAM do
         if (Index[Address_In_Pattern] = 255) then
          begin
           Inc(CurrentPosition);
           if CurrentPosition = PT1_NumberOfPositions then
            CurrentPosition := PT1_LoopPosition;
           Address_In_Pattern :=
            WordPtr(@Index[PT1_PatternsPointer +
                                PT1_PositionList[CurrentPosition] * 6])^;
           PlParams.PT1_B.Address_In_Pattern :=
            WordPtr(@Index[PT1_PatternsPointer +
                                PT1_PositionList[CurrentPosition] * 6 + 2])^;
           PlParams.PT1_C.Address_In_Pattern :=
            WordPtr(@Index[PT1_PatternsPointer +
                                PT1_PositionList[CurrentPosition] * 6 + 4])^
          end;
        PatternInterpreter(PlParams.PT1_A)
       end
     end;
    with PlParams.PT1_B do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.PT1_B)
     end;
    with PlParams.PT1_C do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.PT1_C)
     end;
    DelayCounter := Delay
   end
 end;

TempMixer := 0;
GetRegisters(PlParams.PT1_A);
GetRegisters(PlParams.PT1_B);
GetRegisters(PlParams.PT1_C);

SetMixerRegister(TempMixer);

RegisterAY.TonA := PlParams.PT1_A.Ton;
RegisterAY.TonB := PlParams.PT1_B.Ton;
RegisterAY.TonC := PlParams.PT1_C.Ton;

SetAmplA(PlParams.PT1_A.Amplitude);
SetAmplB(PlParams.PT1_B.Amplitude);
SetAmplC(PlParams.PT1_C.Amplitude);

inc(Global_Tick_Counter)

end;

procedure STC_Get_Registers;
var
 TempMixer:byte;
 
 procedure PatternInterpreter(var Chan:STC_Channel_Parameters);
 var
  k:word;
 begin
  with Chan,RAM do
   begin
    repeat
     case Index[Address_In_Pattern] of
     0..$5f:
      begin
       Note := Index[Address_In_Pattern];
       Sample_Tik_Counter := 32;
       Position_In_Sample := 0;
       Inc(Address_In_Pattern);
       break
      end;
     $60..$6f:
      begin
       k := 0;
       while Index[$1b + $63 * k] <> (Index[Address_In_Pattern] - $60) do
        inc(k);
       SamplePointer := $1c + $63 * k;
      end;
     $70..$7f:
      begin
       k := 0;
       while Index[ST_OrnamentsPointer + $21 * k] <>
                              (Index[Address_In_Pattern] - $70) do
        inc(k);
       OrnamentPointer := ST_OrnamentsPointer + $21 * k + 1;
       Envelope_Enabled := False
      end;
     $80:
      begin
       Sample_Tik_Counter := -1;
       Inc(Address_In_Pattern);
       break
      end;
     $81:
      begin
       Inc(Address_In_Pattern);
       break
      end;
     $82:
      begin
       k := 0;
       while Index[ST_OrnamentsPointer + $21 * k] <> 0 do inc(k);
       OrnamentPointer := ST_OrnamentsPointer + $21 * k + 1;
       Envelope_Enabled := False
      end;
     $83..$8e:
      begin
       SetEnvelopeRegister(Index[Address_In_Pattern] - $80);
       Inc(Address_In_Pattern);
       RegisterAY.Index[11] := Index[Address_In_Pattern];
       Envelope_Enabled := True;
       k := 0;
       while Index[ST_OrnamentsPointer + $21 * k] <> 0 do inc(k);
       OrnamentPointer := ST_OrnamentsPointer + $21 * k + 1;
      end
     else
      Number_Of_Notes_To_Skip := Index[Address_In_Pattern] - $a1;
     end;
     inc(Address_In_Pattern)
    until False;
    Note_Skip_Counter := Number_Of_Notes_To_Skip
   end
 end;

 procedure GetRegisters(var Chan:STC_Channel_Parameters);
 var
  i:word;
  j:byte;
 begin
  with Chan,RAM do
   begin
    if Sample_Tik_Counter >= 0 then
     begin
      Dec(Sample_Tik_Counter);
      Position_In_Sample := (Position_In_Sample + 1) and $1f;
      if Sample_Tik_Counter = 0 then
       if Index[SamplePointer + $60] <> 0 then
        begin
         Position_In_Sample := Index[SamplePointer + $60] and $1f;
         Sample_Tik_Counter := Index[SamplePointer + $61] + 1
        end
       else
        Sample_Tik_Counter := -1
     end;
    if Sample_Tik_Counter >= 0 then
     begin
      i := ((Position_In_Sample - 1) and $1f) * 3 + SamplePointer;
      if Index[i + 1] and $80 <> 0 then
       TempMixer := TempMixer or 64
      else
       RegisterAY.Noise := Index[i + 1] and $1f;
      if Index[i + 1] and $40 <> 0 then
       TempMixer := TempMixer or 8;
      Amplitude := Index[i] and 15;
      j := Note + Index[OrnamentPointer + (Position_In_Sample - 1) and $1f] +
                                   PlParams.STC.Transposition;
      if j > 95 then j := 95;
      if Index[i + 1] and $20 <> 0 then
       Ton := (ST_Table[j] + Index[i + 2] + word(Index[i] and $f0) shl 4)
                                                                      and $FFF
      else
       Ton := (ST_Table[j] - Index[i + 2] - word(Index[i] and $f0) shl 4)
                                                                      and $FFF;
      if Envelope_Enabled then Amplitude := Amplitude or 16
     end
    else
     Amplitude := 0
   end;
  TempMixer := TempMixer shr 1
 end;

var
 i:word;
begin
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit
  end;

with PlParams.STC do
 begin
  Dec(DelayCounter);
  if DelayCounter = 0 then
   with RAM do
    begin
     DelayCounter := ST_delay;
     with PlParams.STC_A do
      begin
       Dec(Note_Skip_Counter);
       if Note_Skip_Counter < 0 then
        begin
         if Index[Address_In_Pattern] = 255 then
          begin
           if CurrentPosition = Index[ST_PositionsPointer] then
            CurrentPosition := 0
           else
            Inc(CurrentPosition);
           Transposition := Index[ST_PositionsPointer + 2 +
                                                 CurrentPosition * 2];
           i := 0;
           while Index[ST_PatternsPointer + 7 * i] <>
                            Index[ST_PositionsPointer + 1 +
                                                 CurrentPosition * 2] do
            inc(i);
           Address_In_Pattern :=
             WordPtr(@Index[ST_PatternsPointer + 7 * i + 1])^;
           PlParams.STC_B.Address_In_Pattern :=
             WordPtr(@Index[ST_PatternsPointer + 7 * i + 3])^;
           PlParams.STC_C.Address_In_Pattern :=
             WordPtr(@Index[ST_PatternsPointer + 7 * i + 5])^
          end;
         PatternInterpreter(PlParams.STC_A)
        end
      end;
     with PlParams.STC_B do
      begin
       dec(Note_Skip_Counter);
       if Note_Skip_Counter<0 then
        PatternInterpreter(PlParams.STC_B)
      end;
     with PlParams.STC_C do
      begin
       dec(Note_Skip_Counter);
       if Note_Skip_Counter<0 then
        PatternInterpreter(PlParams.STC_C)
      end;
    end
 end;



TempMixer := 0;
GetRegisters(PlParams.STC_A);
GetRegisters(PlParams.STC_B);
GetRegisters(PlParams.STC_C);

SetMixerRegister(TempMixer);

RegisterAY.TonA := PlParams.STC_A.Ton;
RegisterAY.TonB := PlParams.STC_B.Ton;
RegisterAY.TonC := PlParams.STC_C.Ton;

SetAmplA(PlParams.STC_A.Amplitude);
SetAmplB(PlParams.STC_B.Amplitude);
SetAmplC(PlParams.STC_C.Amplitude);

Inc(Global_Tick_Counter)
end;

procedure STP_Get_Registers;
var
 TempMixer:byte;

 procedure PatternInterpreter(var Chan:STP_Channel_Parameters);
 var
  quit:boolean;
 begin
  quit := False;
  with Chan,RAM do
   begin
    repeat
     case Index[Address_In_Pattern] of
     1..$60:
      begin
       Note := Index[Address_In_Pattern] - 1;
       Position_In_Sample := 0;
       Position_In_Ornament := 0;
       Current_Ton_Sliding := 0;
       Enabled := True;
       quit := True
      end;
     $61..$6f:
      begin
       SamplePointer := WordPtr(@Index[STP_SamplesPointer+
                                   (Index[Address_In_Pattern] - $61) * 2])^;
       Loop_Sample_Position := Index[SamplePointer];
       Inc(SamplePointer);
       Sample_Length := Index[SamplePointer];
       Inc(SamplePointer)
      end;
     $70..$7f:
      begin
       OrnamentPointer := WordPtr(@Index[STP_OrnamentsPointer +
                                   (Index[Address_In_Pattern] - $70) * 2])^;
       Loop_Ornament_Position := Index[OrnamentPointer];
       Inc(OrnamentPointer);
       Ornament_Length := Index[OrnamentPointer];
       Inc(OrnamentPointer);
       Envelope_Enabled := False;
       Glissade := 0;
      end;
     $80..$bf:
      Number_Of_Notes_To_Skip := Index[Address_In_Pattern]- $80;
     $c0..$cf:
      begin
       if Index[Address_In_Pattern] <> $c0 then
        begin
         SetEnvelopeRegister(Index[Address_In_Pattern] - $c0);
         Inc(Address_In_Pattern);
         RegisterAY.Index[11] := Index[Address_In_Pattern]
        end;
        Envelope_Enabled := True;
        Loop_Ornament_Position := 0;
        Glissade := 0;
        Ornament_Length := 1;
      end;
     $D0..$DF:
      begin
       Enabled := False;
       quit := True;
      end;
     $e0..$ef:
      quit := True;
     $f0:
      begin
       Inc(Address_In_Pattern);
       Glissade := Index[Address_In_Pattern]
      end;
     $f1..$ff:
      Volume := Index[Address_In_Pattern] - $f1;
     end;
     Inc(Address_In_Pattern)
    until quit;
    Note_Skip_Counter := Number_Of_Notes_To_Skip
   end
 end;

 procedure GetRegisters(var Chan:STP_Channel_Parameters);
 var
  j,b0,b1:byte;
 begin
  with Chan,RAM do
   begin
    if Enabled then
     begin
      Inc(Current_Ton_Sliding,Glissade);
      if Envelope_Enabled then
       j := Note + PlParams.STP.Transposition
      else
       j := Note + PlParams.STP.Transposition +
              Index[OrnamentPointer + Position_In_Ornament];
      if j > 95 then j := 95;
      b0 := Index[SamplePointer + Position_In_Sample * 4];
      b1 := Index[SamplePointer + Position_In_Sample * 4 + 1];
      Ton := (ST_Table[j] + Current_Ton_Sliding +
        WordPtr(@Index[SamplePointer + Position_In_Sample * 4 + 2])^) and $fff;
      Amplitude := (b0 and 15) - Volume;
      if shortint(Amplitude) < 0 then Amplitude := 0;
      if ((b1 and 1) <> 0) and Envelope_Enabled then
       Amplitude := Amplitude or 16;
      TempMixer := b0 shr 1 and $48 or TempMixer;
      if shortint(b0) >= 0 then
       RegisterAY.Noise := (b1 shr 1) and 31;
      Inc(Position_In_Ornament);
      if Position_In_Ornament >= Ornament_Length then
       Position_In_Ornament := Loop_Ornament_Position;
      Inc(Position_In_Sample);
      if Position_In_Sample >= Sample_Length then
       begin
        Position_In_Sample := Loop_Sample_Position;
        if shortint(Loop_Sample_Position) < 0 then Enabled := False
       end
     end
    else
     begin
      TempMixer := TempMixer or $48;
      Amplitude := 0
     end
   end;
  TempMixer := TempMixer shr 1
 end;

begin
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit
  end;
with PlParams.STP do
 begin
  Dec(DelayCounter);
  if DelayCounter = 0 then
   with RAM do
    begin
     DelayCounter := STP_Delay;
     with PlParams.STP_A do
      begin
       Dec(Note_Skip_Counter);
       if Note_Skip_Counter < 0 then
        begin
         if (Index[Address_In_Pattern] = 0)then
          begin
           inc(CurrentPosition);
           if CurrentPosition = Index[STP_PositionsPointer] then
            CurrentPosition := Index[STP_PositionsPointer + 1];
           Address_In_Pattern :=
              WordPtr(@Index[STP_PatternsPointer +
                   Index[STP_PositionsPointer + 2 + CurrentPosition * 2]])^;
           PlParams.STP_B.Address_In_Pattern :=
              WordPtr(@Index[STP_PatternsPointer +
                   Index[STP_PositionsPointer + 2 + CurrentPosition * 2] + 2])^;
           PlParams.STP_C.Address_In_Pattern :=
              WordPtr(@Index[STP_PatternsPointer +
                   Index[STP_PositionsPointer + 2 + CurrentPosition * 2] + 4])^;
           Transposition := Index[STP_PositionsPointer + 3 +
                                                    CurrentPosition * 2];
          end;
         PatternInterpreter(PlParams.STP_A)
        end
      end;
     with PlParams.STP_B do
      begin
       Dec(Note_Skip_Counter);
       if Note_Skip_Counter < 0 then
        PatternInterpreter(PlParams.STP_B)
      end;
     with PlParams.STP_C do
      begin
       Dec(Note_Skip_Counter);
       if Note_Skip_Counter < 0 then
        PatternInterpreter(PlParams.STP_C)
      end
    end
 end;

TempMixer := 0;
GetRegisters(PlParams.STP_A);
GetRegisters(PlParams.STP_B);
GetRegisters(PlParams.STP_C);

SetMixerRegister(TempMixer);

RegisterAY.TonA := PlParams.STP_A.Ton;
RegisterAY.TonB := PlParams.STP_B.Ton;
RegisterAY.TonC := PlParams.STP_C.Ton;

SetAmplA(PlParams.STP_A.Amplitude);
SetAmplB(PlParams.STP_B.Amplitude);
SetAmplC(PlParams.STP_C.Amplitude);

inc(Global_Tick_Counter)

end;

procedure ASC_Get_Registers;
var
 TempMixer:byte;

 procedure PatternInterpreter(var Chan:ASC_Channel_Parameters);
 var
  delta_ton:smallint;
  Initialization_Of_Ornament_Disabled,
  Initialization_Of_Sample_Disabled:boolean;
 begin
  Initialization_Of_Sample_Disabled:=false;
  Initialization_Of_Ornament_Disabled:=false;
  with Chan do
   begin
    Ton_Sliding_Counter := 0;
    Amplitude_Delay_Counter := 0;
    repeat
     with RAM do
      case Index[Address_In_Pattern] of
      0..$55:
       begin
        Note := Index[Address_In_Pattern];
        Inc(Address_In_Pattern);
        Current_Noise := Initial_Noise;
        if shortint(Ton_Sliding_Counter) <= 0 then
         Current_Ton_Sliding := 0;
        if not Initialization_Of_Sample_Disabled then
         begin
          Addition_To_Amplitude := 0;
          Ton_Deviation := 0;
          Point_In_Sample := Initial_Point_In_Sample;
          Sound_Enabled := True;
          Sample_Finished := False;
          Break_Sample_Loop := False
         end;
        if not Initialization_Of_Ornament_Disabled then
         begin
          Point_In_Ornament := Initial_Point_In_Ornament;
          Addition_To_Note := 0
         end;
        if Envelope_Enabled then
         begin
          RegisterAY.Index[11] := Index[Chan.Address_In_Pattern];
          Inc(Address_In_Pattern)
         end;
        break
       end;
      $56..$5d:
       begin
        Inc(Address_In_Pattern);
        break
       end;
      $5e:
       begin
        Break_Sample_Loop := True;
        Inc(Address_In_Pattern);
        break
       end;
      $5f:
       begin
        Sound_Enabled := False;
        Inc(Address_In_Pattern);
        break
       end;
      $60..$9f:
       Number_Of_Notes_To_Skip := Index[Address_In_Pattern] - $60;
      $a0..$bf:
       Initial_Point_In_Sample :=
        WordPtr(@Index[(Index[Address_In_Pattern] - $a0) * 2 +
                       ASC1_SamplesPointers])^ + ASC1_SamplesPointers;
      $c0..$df:
       Initial_Point_In_Ornament :=
        WordPtr(@Index[(Index[Address_In_Pattern] - $c0) * 2 +
                       ASC1_OrnamentsPointers])^ + ASC1_OrnamentsPointers;
      $e0:
       begin
        Volume := 15;
        Envelope_Enabled := True
       end;
      $e1..$ef:
       begin
        Volume := Index[Address_In_Pattern] - $e0;
        Envelope_Enabled := False
       end;
      $f0:
       begin
        Inc(Address_In_Pattern);
        Initial_Noise := Index[Address_In_Pattern]
       end;
      $f1:
       Initialization_Of_Sample_Disabled := True;
      $f2:
       Initialization_Of_Ornament_Disabled := True;
      $f3:
       begin
        Initialization_Of_Sample_Disabled := True;
        Initialization_Of_Ornament_Disabled := True
       end;
      $f4:
       begin
        Inc(Address_In_Pattern);
        PlParams.ASC.Delay := Index[Address_In_Pattern]
       end;
      $f5:
       begin
        Inc(Address_In_Pattern);
        Substruction_for_Ton_Sliding :=
                - shortint(Index[Address_In_Pattern]) * 16;
        Ton_Sliding_Counter := 255
       end;
      $f6:
       begin
        Inc(Address_In_Pattern);
        Substruction_for_Ton_Sliding :=
                 shortint(Index[Chan.Address_In_Pattern]) * 16;
        Chan.Ton_Sliding_Counter := 255;
       end;
      $f7:
       begin
        Inc(Address_In_Pattern);
        Initialization_Of_Sample_Disabled := True;
        if Index[Address_In_Pattern + 1] < $56 then
         delta_ton := ASM_Table[Note] + Current_Ton_Sliding div 16 -
           ASM_Table[Index[Address_In_Pattern + 1]]
        else
         delta_ton := Current_Ton_Sliding div 16;
        delta_ton := delta_ton shl 4;
        Substruction_for_Ton_Sliding := -delta_ton div
                shortint(Index[Address_In_Pattern]);
        Current_Ton_Sliding := delta_ton - delta_ton mod
                shortint(Index[Address_In_Pattern]);
        Ton_Sliding_Counter :=
                shortint(Index[Address_In_Pattern])
       end;
      $f8:
       SetEnvelopeRegister(8);
      $f9:
       begin
        Inc(Address_In_Pattern);
        if Index[Address_In_Pattern+1] < $56 then
         delta_ton := ASM_Table[Note] -
             ASM_Table[Index[Address_In_Pattern + 1]]
        else
         delta_ton := Current_Ton_Sliding div 16;
        delta_ton := delta_ton shl 4;
        Substruction_for_Ton_Sliding := -delta_ton div
                  shortint(Index[Address_In_Pattern]);
        Current_Ton_Sliding := delta_ton - delta_ton mod
                  shortint(Index[Address_In_Pattern]);
        Ton_Sliding_Counter :=
                  shortint(Index[Address_In_Pattern]);
       end;
      $fa:
       SetEnvelopeRegister(10);
      $fb:
       begin
        inc(Chan.Address_In_Pattern);
        if Index[Chan.Address_In_Pattern] and 32 = 0 then
         begin
          Amplitude_Delay := Index[Address_In_Pattern] shl 3;
          Amplitude_Delay_Counter := Amplitude_Delay
         end
        else
         begin
          Amplitude_Delay := ((Index[Address_In_Pattern] shl 3)
              xor $f8) + 9;{bit 0 - знаковый, а биты 7-3 - модуль}
          Amplitude_Delay_Counter := Chan.Amplitude_Delay
         end;
       end;
      $fc:
       SetEnvelopeRegister(12);
      $fe:
       SetEnvelopeRegister(14);
      end;
     inc(Address_In_Pattern)
    until False;
    Note_Skip_Counter := Number_Of_Notes_To_Skip
   end
 end;

 procedure GetRegisters(var Chan:ASC_Channel_Parameters);
 var
  j:shortint;
  Sample_Says_OK_for_Envelope:boolean;
 begin
  with Chan,RAM do
   begin
    if Sample_Finished or not Sound_Enabled then
     Amplitude := 0
    else
     begin
      if Amplitude_Delay_Counter <> 0 then
       if Amplitude_Delay_Counter >= 16 then
        begin
         Dec(Amplitude_Delay_Counter,8);
         if Addition_To_Amplitude < -15 then
          Inc(Addition_To_Amplitude)
         else if Addition_To_Amplitude > 15 then
          Dec(Addition_To_Amplitude)
        end
       else
        begin
         if (Amplitude_Delay_Counter and 1 <> 0) then
          begin
           if Addition_To_Amplitude > -15 then
            Dec(Addition_To_Amplitude)
          end
         else if Addition_To_Amplitude < 15 then
          Inc(Addition_To_Amplitude);
         Amplitude_Delay_Counter := Amplitude_Delay
        end;
      if Index[Point_In_Sample] and 128 <> 0 then
       Loop_Point_In_Sample := Point_In_Sample;
      if Index[Point_In_Sample] and 96 = 32 then
       Sample_Finished := True;
      Inc(Ton_Deviation,shortint(Index[Point_In_Sample + 1]));
      TempMixer := Index[Point_In_Sample + 2] and 9 shl 3 or TempMixer;
      if Index[Point_In_Sample + 2] and 6 = 2 then
       Sample_Says_OK_for_Envelope := True
      else
       Sample_Says_OK_for_Envelope := False;
      if Index[Point_In_Sample + 2] and 6 = 4 then
       if Addition_To_Amplitude >- 15 then
        Dec(Addition_To_Amplitude);
      if Index[Point_In_Sample + 2] and 6 = 6 then
       if Addition_To_Amplitude < 15 then
        Inc(Addition_To_Amplitude);
      Amplitude := Addition_To_Amplitude + Index[Point_In_Sample + 2] shr 4;
      if shortint(Amplitude) < 0 then
       Amplitude := 0
      else if Amplitude > 15 then
       Amplitude := 15;
      Amplitude := (Amplitude * (Volume + 1)) shr 4;
      if Sample_Says_OK_for_Envelope and (TempMixer and 64 <> 0) then
       Inc(RegisterAY.Index[11],shortint(Index[Point_In_Sample] shl 3) div 8)
      else
       Inc(Current_Noise,shortint(Index[Point_In_Sample] shl 3) div 8);
      Inc (Point_In_Sample,3);
      if Index[Point_In_Sample - 3] and 64 <> 0 then
       if not Break_Sample_Loop then
        Point_In_Sample := Loop_Point_In_Sample
       else if Index[Point_In_Sample - 3] and 32 <> 0 then
        Sample_Finished := True;
       if Index[Point_In_Ornament] and 128 <> 0 then
        Loop_Point_In_Ornament := Point_In_Ornament;
       inc(Addition_To_Note,Index[1 + Point_In_Ornament]);
       inc(Current_Noise,
         (-shortint(Index[Point_In_Ornament] and $10)) or
                                 Index[Point_In_Ornament]);
       inc(Point_In_Ornament,2);
       if Index[Point_In_Ornament - 2] and 64 <> 0 then
        Point_In_Ornament := Loop_Point_In_Ornament;
       if TempMixer and 64 = 0 then
        RegisterAY.Noise := (byte(Current_Ton_Sliding shr 8) +
                                                   Current_Noise) and $1f;
       j := Note + Addition_To_Note;
       if j < 0 then
        j := 0
       else if j > $55 then
        j := $55;
       Ton := (ASM_Table[j] + Ton_Deviation +
                                  Current_Ton_Sliding div 16) and $fff;
       if Ton_Sliding_Counter <> 0 then
        begin
         if shortint(Ton_Sliding_Counter) > 0 then dec(Ton_Sliding_Counter);
         inc(Current_Ton_Sliding,Substruction_for_Ton_Sliding);
        end;
       if Envelope_Enabled and Sample_Says_OK_for_Envelope then
        Amplitude := Amplitude or $10
      end
   end;
  TempMixer := TempMixer shr 1
 end;

begin

if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
   begin
    Real_End := True;
    exit
   end;

with PlParams.ASC do
 begin
  Dec(DelayCounter);
  if DelayCounter = 0 then
   begin
    with PlParams.ASC_A do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       with RAM do
        begin
         if Index[Address_In_Pattern] = 255 then
          begin
           Inc(CurrentPosition);
           if CurrentPosition >= ASC1_Number_Of_Positions then
            CurrentPosition := ASC1_LoopingPosition;
           Address_In_Pattern :=
            WordPtr(@Index[ASC1_PatternsPointers +
                  6 * Index[CurrentPosition + 9]])^ + ASC1_PatternsPointers;
           PlParams.ASC_B.Address_In_Pattern :=
            WordPtr(@Index[ASC1_PatternsPointers +
                  6 * Index[CurrentPosition + 9] + 2])^ + ASC1_PatternsPointers;
           PlParams.ASC_C.Address_In_Pattern :=
            WordPtr(@Index[ASC1_PatternsPointers +
                  6 * Index[CurrentPosition + 9] + 4])^ + ASC1_PatternsPointers;
           Initial_Noise := 0;
           PlParams.ASC_B.Initial_Noise := 0;
           PlParams.ASC_C.Initial_Noise := 0
          end;
         PatternInterpreter(PlParams.ASC_A);
        end
     end;
    with PlParams.ASC_B do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.ASC_B)
     end;
    with PlParams.ASC_C do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.ASC_C)
     end;
    DelayCounter := Delay
   end
 end;

TempMixer := 0;
GetRegisters(PlParams.ASC_A);
GetRegisters(PlParams.ASC_B);
GetRegisters(PlParams.ASC_C);

SetMixerRegister(TempMixer);

RegisterAY.TonA := PlParams.ASC_A.Ton;
RegisterAY.TonB := PlParams.ASC_B.Ton;
RegisterAY.TonC := PlParams.ASC_C.Ton;

SetAmplA(PlParams.ASC_A.Amplitude);
SetAmplB(PlParams.ASC_B.Amplitude);
SetAmplC(PlParams.ASC_C.Amplitude);

inc(Global_Tick_Counter)

end;

procedure PSC_Get_Registers;
var
 TempMixer:byte;

 procedure PatternInterpreter(var Chan:PSC_Channel_Parameters);
 var
  quit:boolean;
  b1b,b2b,b3b,b4b,b5b,b6b,b7b:boolean;

  begin
   quit := False;
   b1b := False;
   b2b := False;
   b3b := False;
   b4b := False;
   b5b := False;
   b6b := False;
   b7b := False;
   with RAM,Chan do
    begin
     repeat
      case Index[Address_In_Pattern] of
      $c0..$ff:
       begin
        Note_Skip_Counter := Index[Address_In_Pattern] - $bf;
        quit := True
       end;
      $a0..$bf:
       OrnamentPointer := WordPtr(@Index[PSC_OrnamentsPointer +
              (Index[Address_In_Pattern] - $a0) * 2])^ + PSC_OrnamentsPointer;
      $7e..$9f:
        if Index[Address_In_Pattern] >= $80 then
         SamplePointer :=
                PSC_SamplesPointers[Index[Address_In_Pattern] - $80] + $4c;
      $6b:
       begin
        Inc(Address_In_Pattern);
        Addition_To_Ton := Index[Address_In_Pattern];
        b5b := True
       end;
      $6c:
       begin
        Inc(Address_In_Pattern);
        Addition_To_Ton := -shortint(Index[Address_In_Pattern]);
        b5b := True
       end;
      $6d:
       begin
        b4b := True;
        Inc(Address_In_Pattern);
        Addition_To_Ton := Index[Address_In_Pattern]
       end;
      $6e:
       begin
        inc(Address_In_Pattern);
        PlParams.PSC.Delay := Index[Address_In_Pattern]
       end;
      $6f:
       begin
        b1b := True;
        Inc(Address_In_Pattern)
       end;
      $70:
       begin
        b3b := True;
        Inc(Address_In_Pattern);
        Volume_Counter1 := Index[Address_In_Pattern]
       end;
      $71:
       begin
        Break_Ornament_Loop := True;
        Inc(Address_In_Pattern)
       end;
      $7a:
       begin
        Inc(Address_In_Pattern);
        if @Chan = @PlParams.PSC_B then
         begin
          SetEnvelopeRegister(Index[Address_In_Pattern] and 15);
          RegisterAY.Envelope := WordPtr(@Index[Address_In_Pattern + 1])^;
          Inc(Address_In_Pattern,2)
         end
       end;
      $7b:
       begin
        Inc(Address_In_Pattern);
        if @Chan = @PlParams.PSC_B then
         PlParams.PSC.Noise_Base := Index[Address_In_Pattern];
       end;
      $7c:
       begin
        b1b := False;
        b2b := True;
        b3b := False;
        b4b := False;
        b5b := False;
        b6b := False;
        b7b := False
       end;
      $7d:
       Break_Sample_Loop := True;
      $58..$66:
       begin
        Initial_Volume := Index[Address_In_Pattern] - $57;
        Envelope_Enabled := False;
        b6b := True
       end;
      $57:
       begin
        Initial_Volume := $f;
        Envelope_Enabled := True;
        b6b := True
       end;
      0..$56:
       begin
        Note := Index[Address_In_Pattern];
        b6b := True;
        b7b := True
       end
      else
       inc(Address_In_Pattern);
      end;
      inc(Address_In_Pattern);
     until quit;
     if b7b then
      begin
       Break_Ornament_Loop := False;
       Ornament_Enabled := True;
       Enabled := True;
       Break_Sample_Loop := False;
       Ton_Slide_Enabled := False;
       Ton_Accumulator := 0;
       Current_Ton_Sliding := 0;
       Noise_Accumulator := 0;
       Volume_Counter := 0;
       Position_In_Sample := 0;
       Position_In_Ornament := 0
      end;
     if b6b then
      Volume := Initial_Volume;
     if b5b then
      begin
       Gliss := False;
       Ton_Slide_Enabled := True
      end;
     if b4b then
      begin
       Current_Ton_Sliding := Ton - ASM_Table[Note];
       Gliss := True;
       if Chan.Current_Ton_Sliding >= 0 then
        Addition_To_Ton := - Addition_To_Ton;
       Ton_Slide_Enabled := True
      end;
     if b3b then
      begin
       Volume_Counter := Volume_Counter1;
       Volume_Inc := True;
       if Volume_Counter and $40 <> 0 then
        begin
         Volume_Counter := -shortint(Volume_Counter or 128);
         Volume_Inc := False
        end;
       Volume_Counter_Init := Volume_Counter
      end;
     if b2b then
      begin
       Break_Ornament_Loop := False;
       Ornament_Enabled := False;
       Enabled := False;
       Break_Sample_Loop := False;
       Ton_Slide_Enabled := False;
      end;
     if b1b then
      Ornament_Enabled := False
    end
 end;

 procedure GetRegisters(var Chan:PSC_Channel_Parameters);
 var
  j,b:byte;
 begin
  with Chan,RAM do
   begin
    if Enabled then
     begin
      j := Note;
      if Ornament_Enabled then
       begin
        b := Index[OrnamentPointer + Position_In_Ornament * 2];
        Inc(Noise_Accumulator,b);
        Inc(j,Index[OrnamentPointer + Position_In_Ornament * 2 + 1]);
        if shortint(j) < 0 then
         inc(j,$56);
        if j > $55 then
         dec(j,$56);
        if j > $55 then
         j := $55;
        if b and 128 = 0 then
         Loop_Ornament_Position := Position_In_Ornament;
        if b and 64 = 0 then
         begin
          if not Break_Ornament_Loop then
           Position_In_Ornament := Loop_Ornament_Position
          else
           begin
            Break_Ornament_Loop := False;
            if b and 32 = 0 then
             Ornament_Enabled := False;
            Inc(Position_In_Ornament)
           end
         end
        else
         begin
          if b and 32 = 0 then
           Ornament_Enabled := False;
           inc(Position_In_Ornament)
         end
       end;
      Note := j;
      Ton := WordPtr(@Index[SamplePointer+Position_In_Sample*6])^;
      Inc(Ton_Accumulator,Ton);
      Ton := ASM_Table[j] + Ton_Accumulator;
      if Ton_Slide_Enabled then
       begin
        Inc(Current_Ton_Sliding,Addition_To_Ton);
        if Gliss and (
          ((Current_Ton_Sliding < 0) and (Addition_To_Ton <= 0)) or
          ((Current_Ton_Sliding >= 0) and (Addition_To_Ton >= 0))) then
         Ton_Slide_Enabled := False;
        Inc(Ton,Current_Ton_Sliding)
       end;
      Ton := Ton and $fff;
      b := Index[SamplePointer + Position_In_Sample * 6 + 4];
      TempMixer := TempMixer or ((b and 9) shl 3);
      j := 0;
      if b and 2 <> 0 then
       inc(j);
      if b and 4 <> 0 then
       dec(j);
      if Volume_Counter > 0 then
       begin
        Dec(Volume_Counter);
        if Volume_Counter = 0 then
         begin
          if Volume_Inc then inc(j) else dec(j);
          Volume_Counter := Volume_Counter_Init
         end
       end;
      Inc(Volume,j);
      if shortint(Volume) < 0 then
       Volume := 0
      else if Volume > 15 then
       Volume := 15;
      Amplitude := ((Volume + 1)*(Index[SamplePointer
                         + Position_In_Sample * 6 + 3] and 15)) shr 4;
      if Envelope_Enabled and (b and 16 = 0) then
       Amplitude := Amplitude or 16;
      if (Amplitude and 16 <> 0) and (b and 8 <> 0) then
       RegisterAY.Envelope := RegisterAY.Envelope + shortint
                   (Index[SamplePointer + Position_In_Sample * 6 + 2])
      else
       begin
        inc(Noise_Accumulator,
          Index[SamplePointer + Position_In_Sample * 6 + 2]);
        if b and 8 = 0 then
         RegisterAY.Noise := Noise_Accumulator and 31
       end;
      if b and 128 = 0 then
       Loop_Sample_Position := Position_In_Sample;
      if b and 64 = 0 then
       begin
        if not Break_Sample_Loop then
         Position_In_Sample := Loop_Sample_Position
        else
         begin
          Break_Sample_Loop := False;
          if b and 32 = 0 then
           Enabled := False;
          inc(Position_In_Sample)
         end
       end
      else
       begin
        if b and 32 = 0 then
         Enabled := False;
        inc(Position_In_Sample)
       end
     end
    else
     Amplitude := 0
   end;
  TempMixer := TempMixer shr 1
 end;

begin
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit
  end;
with PlParams.PSC do
 begin
  Dec(DelayCounter);
  if DelayCounter = 0 then
   begin
    Dec(Lines_Counter);
    if Lines_Counter = 0 then
     with RAM do
      begin
       if Index[Positions_Pointer + 1] = 255 then
        Positions_Pointer := WordPtr(@Index[Positions_Pointer + 2])^;
       Lines_Counter := Index[Positions_Pointer + 1];
       PlParams.PSC_A.Address_In_Pattern :=
         WordPtr(@Index[Positions_Pointer + 2])^;
       PlParams.PSC_B.Address_In_Pattern :=
         WordPtr(@Index[Positions_Pointer + 4])^;
       PlParams.PSC_C.Address_In_Pattern :=
         WordPtr(@Index[Positions_Pointer + 6])^;
       inc(Positions_Pointer,8);
       PlParams.PSC_A.Note_Skip_Counter := 1;
       PlParams.PSC_B.Note_Skip_Counter := 1;
       PlParams.PSC_C.Note_Skip_Counter := 1
      end;
    with PlParams.PSC_A do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter = 0 then
       PatternInterpreter(PlParams.PSC_A);
     end;
    with PlParams.PSC_B do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter = 0 then
       PatternInterpreter(PlParams.PSC_B);
     end;
    with PlParams.PSC_C do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter = 0 then
       PatternInterpreter(PlParams.PSC_C);
     end;
    Inc(PlParams.PSC_A.Noise_Accumulator,Noise_Base);
    Inc(PlParams.PSC_B.Noise_Accumulator,Noise_Base);
    Inc(PlParams.PSC_C.Noise_Accumulator,Noise_Base);
    DelayCounter := Delay
   end
 end;

TempMixer := 0;
GetRegisters(PlParams.PSC_A);
GetRegisters(PlParams.PSC_B);
GetRegisters(PlParams.PSC_C);

SetMixerRegister(TempMixer);

RegisterAY.TonA := PlParams.PSC_A.Ton;
RegisterAY.TonB := PlParams.PSC_B.Ton;
RegisterAY.TonC := PlParams.PSC_C.Ton;

SetAmplA(PlParams.PSC_A.Amplitude);
SetAmplB(PlParams.PSC_B.Amplitude);
SetAmplC(PlParams.PSC_C.Amplitude);

inc(Global_Tick_Counter)

end;

procedure SQT_Get_Registers;
var
 TempMixer:byte;

 procedure PatternInterpreter(var Chan:SQT_Channel_Parameters);
 var
  Ptr:word;
  Temp:integer;

  procedure Call_LC1D1(a:byte);
  begin
   inc(Ptr);
   with Chan do
    begin
     if b6ix0 then
      begin
       Address_In_Pattern := Ptr + 1;
       b6ix0 := False
      end;
     with RAM do
      case a - 1 of
      0: if b4ix0 then Volume := RAM.Index[Ptr] and 15;
      1: if b4ix0 then Volume := (Volume + Index[Ptr]) and 15;
      2: if b4ix0 then
          begin
           PlParams.SQT_A.Volume := Index[Ptr];
           PlParams.SQT_B.Volume := Index[Ptr];
           PlParams.SQT_C.Volume := Index[Ptr]
          end;
      3: if b4ix0 then
          begin
           with PlParams.SQT_A do
            Volume := (Volume + Index[Ptr]) and 15;
           with PlParams.SQT_B do
            Volume := (Volume + Index[Ptr]) and 15;
           with PlParams.SQT_C do
            Volume := (Volume + Index[Ptr]) and 15
          end;
      4: if b4ix0 then
          with PlParams.SQT do
           begin
            DelayCounter := Index[Ptr] and 31;
            if DelayCounter = 0 then DelayCounter := 32;
            Delay := DelayCounter
           end;
      5: if b4ix0 then
          with PlParams.SQT do
           begin
            DelayCounter := (DelayCounter + Index[Ptr]) and 31;
            if DelayCounter = 0 then DelayCounter := 32;
            Delay := DelayCounter
           end;
      6: begin
          Current_Ton_Sliding := 0;
          Gliss := True;
          Ton_Slide_Step := -Index[Ptr];
         end;
      7: begin
          Current_Ton_Sliding := 0;
          Gliss := True;
          Ton_Slide_Step := Index[Ptr]
         end
      else
         begin
          Envelope_Enabled := True;
          SetEnvelopeRegister((a - 1) and 15);
          RegisterAY.Index[11] := Index[Ptr]
         end
      end
    end
  end;

  procedure Call_LC2A8(a:byte);
  begin
   with Chan do
    begin
     Envelope_Enabled := False;
     Ornament_Enabled := False;
     Gliss := False;
     Enabled := True;
     with RAM do
      SamplePointer := WordPtr(@Index[a * 2 + SQT_SamplesPointer])^;
     Point_In_Sample := SamplePointer + 2;
     Sample_Tik_Counter := 32;
     MixNoise := True;
     MixTon := True
    end
  end;

  procedure Call_LC2D9(a:byte);
  begin
   with Chan do
    begin
     with RAM do
      OrnamentPointer := WordPtr(@Index[a * 2 + SQT_OrnamentsPointer])^;
     Point_In_Ornament := OrnamentPointer + 2;
     Ornament_Tik_Counter := 32;
     Ornament_Enabled := True
    end
  end;

  procedure Call_LC283;
  begin
   with RAM do
    case Index[Ptr] of
    0..$7f:
     Call_LC1D1(Index[Ptr]);
    $80..$ff:
     begin
      if Index[Ptr] shr 1 and 31 <> 0 then
       Call_LC2A8(Index[Ptr] shr 1 and 31);
      if Index[Ptr] and 64 <> 0 then
       begin
        Temp := Index[Ptr+1] shr 4;
        if Index[Ptr] and 1 <> 0 then Temp := Temp or 16;
        if Temp <> 0 then Call_LC2D9(Temp);
        inc(Ptr);
        if Index[Ptr] and 15 <> 0 then
         Call_LC1D1(Index[Ptr] and 15)
       end
     end
    end;
    inc(Ptr)
  end;

  procedure Call_LC191;
  begin
   with Chan do
    begin
     Ptr := ix27;
     b6ix0 := False;
    end;
   with RAM do
    case Index[Ptr] of
    0..$7f:
     begin
      Inc(Ptr);
      Call_LC283
     end;
    $80..$ff:
     Call_LC2A8(Index[Ptr] and 31);
    end
  end;

 begin
  with Chan do
   begin
    if ix21 <> 0 then
     begin
      Dec(ix21);
      if b7ix0 then Call_LC191;
      exit
     end;
    Ptr := Address_In_Pattern;
    b6ix0 := True;
    b7ix0 := False;
    repeat
     with RAM do
      case Index[Ptr] of
      0..$5f:
       begin
        Note := Index[Ptr];
        ix27 := Ptr;
        Inc(Ptr);
        Call_LC283;
        if b6ix0 then Address_In_Pattern := Ptr;
        break
       end;
      $60..$6e:
       begin
        Call_LC1D1(Index[Ptr] - $60);
        break
       end;
      $6f..$7f:
       begin
        MixNoise := False;
        MixTon := False;
        Enabled := False;
        if Index[Ptr] <> $6f then
         Call_LC1D1(RAM.Index[Ptr] - $6f)
        else
         Address_In_Pattern := Ptr + 1;
        break
       end;
      $80..$bf:
       begin
        Address_In_Pattern := Ptr + 1;
        if Index[Ptr] in [$80..$9f] then
         begin
          if Index[Ptr] and 16 = 0 then
           Inc(Note,Index[Ptr] and 15)
          else
           Dec(Note,Index[Ptr] and 15)
         end
        else
         begin
          ix21 := Index[Ptr] and 15;
          if Index[Ptr] and 16 = 0 then break;
          if ix21 <> 0 then b7ix0 := True
         end;
        Call_LC191;
        break
       end;
      $c0..$ff:
       begin
        Address_In_Pattern := Ptr + 1;
        ix27 := Ptr;
        Call_LC2A8(Index[Ptr] and 31);
        break
       end
      end
    until False
   end
 end;

 procedure GetRegisters(var Chan:SQT_Channel_Parameters);
 var
  j,b0,b1:byte;
 begin
  TempMixer := TempMixer shl 1;
  with Chan do
   begin
    if Enabled then
     with RAM do
      begin
       b0 := Index[Point_In_Sample];
       Amplitude := b0 and 15;
       if Amplitude <> 0 then
        begin
         Dec(Amplitude,Volume);
         if shortint(Amplitude) < 0 then Amplitude := 0
        end
       else if Envelope_Enabled then
        Amplitude := 16;
       b1 := Index[Point_In_Sample + 1];
       if b1 and 32 <> 0 then
        begin
         TempMixer := TempMixer or 8;
         RegisterAY.Noise := b0 and $f0 shr 3;
         if shortint(b1) < 0 then
          Inc(RegisterAY.Noise)
        end;
       if b1 and 64 <> 0 then
        TempMixer := TempMixer or 1;
       j := Note;
       if Ornament_Enabled then
        begin
         inc(j,Index[Point_In_Ornament]);
         Dec(Ornament_Tik_Counter);
         if Ornament_Tik_Counter = 0 then
          begin
           if Index[OrnamentPointer] <> 32 then
            begin
             Ornament_Tik_Counter := Index[OrnamentPointer + 1];
             Point_In_Ornament := OrnamentPointer + 2 + Index[OrnamentPointer];
            end
           else
            begin
             Ornament_Tik_Counter := Index[SamplePointer + 1];
             Point_In_Ornament := OrnamentPointer + 2 + Index[SamplePointer];
            end
          end
         else
          inc(Point_In_Ornament)
        end;
       Inc(j,Transposit);
       if j > $5F then j := $5f;
       if b1 and 16 = 0 then
        Ton := SQT_Table[j] - (word(b1 and 15) shl 8 +
                                             Index[Point_In_Sample + 2])
       else
        Ton := SQT_Table[j] + (word(b1 and 15) shl 8 +
                                             Index[Point_In_Sample + 2]);
       Dec(Sample_Tik_Counter);
       if Sample_Tik_Counter = 0 then
        begin
         Sample_Tik_Counter := Index[SamplePointer + 1];
         if Index[SamplePointer] = 32 then
          begin
           Enabled := False;
           Ornament_Enabled := False
          end;
         Point_In_Sample := SamplePointer + 2 + Index[SamplePointer] * 3
        end
       else
        inc(Point_In_Sample,3);
       if Gliss then
        begin
         Inc(Ton,Current_Ton_Sliding);
         Inc(Current_Ton_Sliding,Ton_Slide_Step)
        end;
       Ton := Ton and $fff
      end
    else
     Amplitude := 0
   end
 end;

begin
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit
  end;
with PlParams.SQT do
 begin
  Dec(DelayCounter);
  if DelayCounter = 0 then
   begin
    DelayCounter := Delay;
    Dec(Lines_Counter);
    if Lines_Counter = 0 then
     with RAM do
      begin
       if Index[Positions_Pointer] = 0 then
        Positions_Pointer := SQT_LoopPointer;
       with PlParams.SQT_C do
        begin
         if shortint(Index[Positions_Pointer]) < 0 then
          b4ix0 := True
         else
          b4ix0 := False;
         Address_In_Pattern := WordPtr(@Index[
                  byte(Index[Positions_Pointer] * 2) + SQT_PatternsPointer])^;
         Lines_Counter := Index[Address_In_Pattern];
         Inc(Address_In_Pattern);
         Inc(Positions_Pointer);
         Volume := Index[Positions_Pointer] and 15;
         if Index[Positions_Pointer] shr 4 < 9 then
          Transposit := Index[Positions_Pointer] shr 4
         else
          Transposit := -(Index[Positions_Pointer] shr 4 - 9) - 1;
         Inc(Positions_Pointer);
         ix21:=0
        end;

       if Index[Positions_Pointer] = 0 then
        Positions_Pointer := SQT_LoopPointer;
       with PlParams.SQT_B do
        begin
         if shortint(Index[Positions_Pointer]) < 0 then
          b4ix0 := True
         else
          b4ix0 := False;
         Address_In_Pattern := WordPtr(@Index[
               byte(Index[Positions_Pointer] * 2) + SQT_PatternsPointer])^ + 1;
         Inc(Positions_Pointer);
         Volume := Index[Positions_Pointer] and 15;
         if Index[Positions_Pointer] shr 4 < 9 then
          Transposit := Index[Positions_Pointer] shr 4
         else
          Transposit := -(Index[Positions_Pointer] shr 4 - 9) - 1;
         Inc(Positions_Pointer);
         ix21:=0
        end;

       if Index[Positions_Pointer] = 0 then
        Positions_Pointer := SQT_LoopPointer;
       with PlParams.SQT_A do
        begin
         if shortint(Index[Positions_Pointer]) < 0 then
          b4ix0 := True
         else
          b4ix0 := False;
         Address_In_Pattern := WordPtr(@Index[
               byte(Index[Positions_Pointer] * 2) + SQT_PatternsPointer])^ + 1;
         Inc(Positions_Pointer);
         Volume := Index[Positions_Pointer] and 15;
         if Index[Positions_Pointer] shr 4 < 9 then
          Transposit := Index[Positions_Pointer] shr 4
         else
          Transposit := -(Index[Positions_Pointer] shr 4 - 9) - 1;
         Inc(Positions_Pointer);
         ix21:=0
        end;

      Delay := Index[Positions_Pointer];
      DelayCounter := Delay;
      Inc(Positions_Pointer);

     end;
    PatternInterpreter(PlParams.SQT_C);
    PatternInterpreter(PlParams.SQT_B);
    PatternInterpreter(PlParams.SQT_A)
   end
 end;
TempMixer := 0;
GetRegisters(PlParams.SQT_C);
GetRegisters(PlParams.SQT_B);
GetRegisters(PlParams.SQT_A);
TempMixer := (-(TempMixer + 1)) and $3f;

with PlParams.SQT_A do
 begin
  if not MixNoise then TempMixer := TempMixer or 8;
  if not MixTon then TempMixer := TempMixer or 1
 end;
with PlParams.SQT_B do
 begin
  if not MixNoise then TempMixer := TempMixer or 16;
  if not MixTon then TempMixer := TempMixer or 2
 end;
with PlParams.SQT_C do
 begin
  if not MixNoise then TempMixer := TempMixer or 32;
  if not MixTon then TempMixer := TempMixer or 4
 end;
SetMixerRegister(TempMixer);

RegisterAY.TonA := PlParams.SQT_A.Ton;
RegisterAY.TonB := PlParams.SQT_B.Ton;
RegisterAY.TonC := PlParams.SQT_C.Ton;

SetAmplA(PlParams.SQT_A.Amplitude);
SetAmplB(PlParams.SQT_B.Amplitude);
SetAmplC(PlParams.SQT_C.Amplitude);

Inc(Global_Tick_Counter)

end;

procedure FTC_Get_Registers;
var
 TempMixer:byte;

 procedure PatternInterpreter(var Chan:FTC_Channel_Parameters);
 var
  quit:boolean;
  ExxAF:shortint;
 begin
  quit := False;
  EXXAF := 2;
  with Chan do
   begin
    repeat
     with RAM do
      case Index[Address_In_Pattern] of
      0..$1f:
       begin
        SamplePointer := FTC_SamplesPointers[Index[Address_In_Pattern]];
        Inc(SamplePointer);
        Loop_Sample_Position := Index[SamplePointer];
        Inc(SamplePointer);
        Sample_Length := Index[SamplePointer] + 1;
        Inc(SamplePointer)
       end;
      $20..$2f:
       Volume := Index[Address_In_Pattern] - $20;
      $30:
       begin
        Sample_Enabled := False;
        Position_In_Sample := 0;
        Sample_Noise_Accumulator:=0;
        Volume_Slide := 0;
        Noise_Accumulator := 0;
        Note_Accumulator := 0;
        Position_In_Ornament := 0;
        Ton_Accumulator := 0;
        Envelope_Accumulator := 0;
        if EXXAF > 0 then
         begin
          Current_Ton_Sliding := 0;
          Ton_Slide_Direction := 0
         end;
        if EXXAF > 1 then Ton_Slide_Step := 0;
        Note_Skip_Counter := 0;
        quit := True
       end;
      $31..$3e:
       begin
        SetEnvelopeRegister(Index[Address_In_Pattern] - $30);
        Envelope_Enabled := True;
        Inc(Address_In_Pattern);
        Envelope := WordPtr(@Index[Chan.Address_In_Pattern])^;
        Inc(Chan.Address_In_Pattern);
       end;
      $3f:
       Envelope_Enabled := False;
      $40..$5f:
       begin
        Note_Skip_Counter := Index[Address_In_Pattern] - $40;
        EXXAF := 1;
        quit := True
       end;
      $60..$cb:
       begin
        Previous_Note := Note;
        Note := PlParams.FTC.Transposition +
                                  Index[Chan.Address_In_Pattern] - $60;
        Sample_Enabled := True;
        Position_In_Sample := 0;
        Sample_Noise_Accumulator := 0;
        Volume_Slide := 0;
        Noise_Accumulator := 0;
        Note_Accumulator := 0;
        Position_In_Ornament := 0;
        Ton_Accumulator := 0;
        Envelope_Accumulator := 0;
        if EXXAF > 0 then
         begin
          Current_Ton_Sliding := 0;
          Ton_Slide_Direction := 0
         end;
        if EXXAF > 1 then Ton_Slide_Step := 0;
        Note_Skip_Counter := 0;
        quit := True
       end;
      $cc..$ec:
       begin
        OrnamentPointer := FTC_OrnamentsPointers[
                                        Index[Address_In_Pattern] - $cc];
        Inc(OrnamentPointer);
        Loop_Ornament_Position := Index[OrnamentPointer];
        Inc(OrnamentPointer);
        Ornament_Length := Index[OrnamentPointer] + 1;
        Inc(OrnamentPointer);
        Position_In_Ornament := 0;
        Noise_Accumulator := 0;
        Note_Accumulator := 0
       end;
      $ed:
       begin
        EXXAF := 1;
        Inc(Address_In_Pattern);
        Ton_Slide_Step := WordPtr(@Index[Chan.Address_In_Pattern])^;
        Inc(Address_In_Pattern);
       end;
      $ee:
       begin
        EXXAF := 0;
        Inc(Address_In_Pattern);
        Ton_Slide_Step1 := Index[Address_In_Pattern]
       end;
      $ef:
       begin
        Inc(Address_In_Pattern);
        Noise := Index[Address_In_Pattern]
       end
      else
       begin
        Inc(Address_In_Pattern);
        PlParams.FTC.Delay := Index[Address_In_Pattern]
       end
      end;
     Inc(Address_In_Pattern)
    until quit;
    if exxaf = 0 then
     begin
      Current_Ton_Sliding := PT2_Table[Previous_Note] - PT2_Table[Note];
      if Current_Ton_Sliding < 0 then
       begin
        Ton_Slide_Step := Ton_Slide_Step1;
        Ton_Slide_Direction := 1
       end
      else
       begin
        Ton_Slide_Step := -Ton_Slide_Step1;
        Ton_Slide_Direction := 2
       end
     end
   end
 end;

 procedure GetRegisters(var Chan:FTC_Channel_Parameters);
 var
  j,b:byte;
  k:word;
  Add_To_Note,Add_To_Noise:byte;
 begin
  with Chan,RAM do
   begin
    Add_To_Note := Note_Accumulator +
                Index[OrnamentPointer + Position_In_Ornament * 2 + 1];
    b := Index[OrnamentPointer + Position_In_Ornament * 2];
    if b and 64 <> 0 then
     Note_Accumulator := Add_To_Note;
    Add_To_Noise := Noise_Accumulator + b;
    if shortint(b) < 0 then
     Noise_Accumulator := Add_To_Noise;
    Inc(Position_In_Ornament);
    if Position_In_Ornament = Ornament_Length then
     Position_In_Ornament := Loop_Ornament_Position;
    if Sample_Enabled then
     begin
      b := Index[SamplePointer + Position_In_Sample * 5];
      j := Sample_Noise_Accumulator + b;
      if shortint(b) < 0 then
       Sample_Noise_Accumulator := j;
      if b and 64 = 0 then
       RegisterAY.Noise := (j + Noise + Add_To_Noise) and 31
      else
       TempMixer := TempMixer or 64;
      k := Ton_Accumulator +
                        WordPtr(@Index[SamplePointer+Position_In_Sample*5+1])^;
      b := Index[SamplePointer + Position_In_Sample * 5 + 2];
      if shortint(b) < 0 then
       Ton_Accumulator := k;
      Addition_To_Ton := k;
      if b and 64 <> 0 then
       TempMixer := TempMixer or 8;
      b := Index[SamplePointer + Position_In_Sample * 5 + 3];
      if b and 32 <> 0 then
       if b and 16 <> 0 then
        begin
         Dec(Volume_Slide);
         if Volume_Slide < -15 then Volume_Slide := -15
        end
       else
        begin
         Inc(Volume_Slide);
         if Volume_Slide > 15 then Volume_Slide := 15
        end;
      j := Volume_Slide + b and 15;
      if shortint(j) < 0 then j := 0 else if j > 15 then j := 15;
      Amplitude := round((Volume * 17 + byte(Volume > 7)) * j / 256);
      k := Envelope_Accumulator +
               shortint(Index[SamplePointer + Position_In_Sample * 5 + 4]);
      if shortint(b) < 0 then
       Envelope_Accumulator := k;
      if (b and 64 <> 0)and Envelope_Enabled then
       begin
        RegisterAY.Envelope := Envelope - k;
        Amplitude := Amplitude or 16;
       end;
      Inc(Position_In_Sample);
      if Position_In_Sample = Sample_Length then
       Position_In_Sample := Loop_Sample_Position
     end
    else
     begin
      Amplitude := 0;
      TempMixer:= TempMixer or 72
     end;
    j := Note + Add_To_Note;
    if j > $55 then j := $55;
    Ton := PT2_Table[j] + Addition_To_Ton;
    Inc(Current_Ton_Sliding,Ton_Slide_Step);
    if ((Ton_Slide_Direction = 1) and (Current_Ton_Sliding >= 0)) or
       ((Ton_Slide_Direction = 2) and (Current_Ton_Sliding < 0)) then
     begin
      Current_Ton_Sliding := 0;
      Ton_Slide_Step := 0
     end
    else
     Inc(Ton,Current_Ton_Sliding);
    Ton := Ton and $fff
   end;
  TempMixer := TempMixer shr 1
 end;

begin
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit
  end;
with PlParams.FTC do
 begin
  Dec(DelayCounter);
  if DelayCounter = 0 then
   begin
    with PlParams.FTC_A do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       begin
        with RAM do
         if Index[Address_In_Pattern] = 255 then
          begin
           Inc(CurrentPosition);
           if FTC_Positions[CurrentPosition].Pattern = 255 then
            CurrentPosition := FTC_Loop_Position;
           Transposition := FTC_Positions[CurrentPosition].Transposition;
           Address_In_Pattern :=
            WordPtr(@Index[FTC_PatternsPointer +
                           FTC_Positions[CurrentPosition].Pattern * 6])^;
           PlParams.FTC_B.Address_In_Pattern :=
            WordPtr(@Index[FTC_PatternsPointer +
                           FTC_Positions[CurrentPosition].Pattern * 6 + 2])^;
           PlParams.FTC_C.Address_In_Pattern :=
            WordPtr(@Index[FTC_PatternsPointer +
                           FTC_Positions[CurrentPosition].Pattern * 6 + 4])^;
          end;
        PatternInterpreter(PlParams.FTC_A)
       end
     end;
    with PlParams.FTC_B do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.FTC_B)
     end;
    with PlParams.FTC_C do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.FTC_C)
     end;
    DelayCounter := Delay
   end
 end;

TempMixer := 0;
GetRegisters(PlParams.FTC_A);
GetRegisters(PlParams.FTC_B);
GetRegisters(PlParams.FTC_C);

SetMixerRegister(TempMixer);

RegisterAY.TonA := PlParams.FTC_A.Ton;
RegisterAY.TonB := PlParams.FTC_B.Ton;
RegisterAY.TonC := PlParams.FTC_C.Ton;

SetAmplA(PlParams.FTC_A.Amplitude);
SetAmplB(PlParams.FTC_B.Amplitude);
SetAmplC(PlParams.FTC_C.Amplitude);

Inc(Global_Tick_Counter)

end;

procedure FLS_Get_Registers;
var
 TempMixer:byte;

 procedure PatternInterpreter(var Chan:FLS_Channel_Parameters);
 var
  quit:boolean;
 begin
  quit := False;
  with Chan do
   begin
    repeat
     with RAM do
      case Index[Address_In_Pattern] of
      0..$5f:
       begin
        Note := Index[Address_In_Pattern];
        Position_In_Sample := 0;
        Sample_Tik_Counter := $20;
        quit := True
       end;
      $60..$6f:
       begin
        Loop_Sample_Position := Index[FLS_SamplesPointer +
                                  (Index[Address_In_Pattern] - $60) * 4];
        Sample_Length := Index[FLS_SamplesPointer +
                                  (Index[Address_In_Pattern] - $60) * 4 + 1];
        SamplePointer := WordPtr(@Index[FLS_SamplesPointer +
                                  (Index[Address_In_Pattern] - $60) * 4 + 2])^
       end;
      $70:
       begin
        Ornament_Enabled := False;
        Envelope_Enabled := False
       end;
      $71..$7f:
       begin
        OrnamentPointer := WordPtr(@Index[FLS_OrnamentsPointer+
                                  (Index[Address_In_Pattern] - $71) * 2])^;
        Ornament_Enabled := True;
        Envelope_Enabled := False
       end;
      $80:
       begin
        Sample_Tik_Counter := -1;
        quit := True
       end;
      $81:
       quit := True;
      $82..$8e:
       begin
        SetEnvelopeRegister(Index[Address_In_Pattern] - $80);
        Envelope_Enabled := True;
        Inc(Address_In_Pattern);
        RegisterAY.Index[11] := Index[Address_In_Pattern]
       end
      else
       Number_Of_Notes_To_Skip := Index[Address_In_Pattern] - $a1
      end;
     Inc(Address_In_Pattern)
    until quit;
    Note_Skip_Counter := Number_Of_Notes_To_Skip
   end
 end;

 procedure GetRegisters(var Chan:FLS_Channel_Parameters);
 var
  j,b0,b1:byte;
 begin
  with Chan,RAM do
   begin
    if Sample_Tik_Counter >= 0 then
     begin
      Dec(Sample_Tik_Counter);
      if Sample_Tik_Counter = 0 then
       if Loop_Sample_Position = 0 then
        begin
         Dec(Sample_Tik_Counter);
         Amplitude := 0;
         TempMixer := TempMixer shr 1;
         exit
        end
       else
        begin
         Sample_Tik_Counter := Sample_Length;
         Position_In_Sample := Loop_Sample_Position - 1;
        end;
      b0 := Index[SamplePointer + Position_In_Sample * 3];
      b1 := Index[SamplePointer + Position_In_Sample * 3 + 1];
      Amplitude := b0 and 15;
      if Envelope_Enabled then Amplitude := Amplitude or 16;
      if shortint(b1) < 0 then
       TempMixer := TempMixer or 64
      else
       RegisterAY.Noise := b1 and 31;
      if b1 and 64 <> 0 then
       TempMixer := TempMixer or 8;
      if Ornament_Enabled then
       j := Index[OrnamentPointer + Position_In_Sample]
      else
       j := 0;
      Inc(j,Note);
      if j > $55 then j := $55;
      Ton := word(b0) shl 4 and $f00 +
                  Index[SamplePointer + Position_In_Sample * 3 + 2];
      if b1 and 32 = 0 then
       Ton := -Ton;
      Ton := (Ton + ST_Table[j]) and $fff;
      Position_In_Sample := (Position_In_Sample + 1) and 31
     end
    else
     Amplitude := 0;
    TempMixer := TempMixer shr 1
   end
 end;

begin
if Global_Tick_Counter>=Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter:=Global_Tick_Max
 else
  begin
  Real_End:=true;
  exit;
  end;
with PlParams.FLS do
 begin
  Dec(DelayCounter);
  if DelayCounter = 0 then
   begin
    with PlParams.FLS_A do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       with RAM do
        begin
         if Index[Address_In_Pattern] = 255 then
          begin
           Inc(CurrentPosition);
           if Index[CurrentPosition + FLS_PositionsPointer + 1] = 0 then
            CurrentPosition := 0;
           Address_In_Pattern :=
            FLS_PatternsPointers[
                 Index[CurrentPosition + FLS_PositionsPointer + 1]].PatternA;
           PlParams.FLS_B.Address_In_Pattern :=
            FLS_PatternsPointers[
                 Index[CurrentPosition + FLS_PositionsPointer + 1]].PatternB;
           PlParams.FLS_C.Address_In_Pattern :=
            FLS_PatternsPointers[
                 Index[CurrentPosition + FLS_PositionsPointer + 1]].PatternC;
          end;
         PatternInterpreter(PlParams.FLS_A)
        end;
     end;
    with PlParams.FLS_B do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.FLS_B)
     end;
    with PlParams.FLS_C do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.FLS_C)
     end;
    DelayCounter := Delay
   end
 end;
  
TempMixer := 0;
GetRegisters(PlParams.FLS_A);
GetRegisters(PlParams.FLS_B);
GetRegisters(PlParams.FLS_C);

SetMixerRegister(TempMixer);

RegisterAY.TonA := PlParams.FLS_A.Ton;
RegisterAY.TonB := PlParams.FLS_B.Ton;
RegisterAY.TonC := PlParams.FLS_C.Ton;

SetAmplA(PlParams.FLS_A.Amplitude);
SetAmplB(PlParams.FLS_B.Amplitude);
SetAmplC(PlParams.FLS_C.Amplitude);

inc(Global_Tick_Counter)

end;

procedure GTR_Get_Registers;
var
 TempMixer:byte;

 procedure PatternInterpreter(var Chan:GTR_Channel_Parameters);
 begin
  with Chan do
   begin
    Note_Skip_Counter := 0;
    repeat
     with RAM do
      case Index[Address_In_Pattern] of
      0..$5f:
       begin
        Note := Index[Address_In_Pattern];
        Position_In_Sample := 0;
        Position_In_Ornament := 0;
        Enabled := True;
        Inc(Address_In_Pattern);
        exit
       end;
      $60..$6f:
       begin
        SamplePointer := GTR_SamplesPointers[Index[Address_In_Pattern] - $60];
        Loop_Sample_Position := Index[Chan.SamplePointer];
        Inc(SamplePointer);
        Sample_Length := Index[SamplePointer];
        Inc(SamplePointer)
       end;
      $70..$7F:
       begin
        OrnamentPointer :=
                GTR_OrnamentsPointers[Index[Address_In_Pattern] - $70];
        Loop_Ornament_Position := Index[Chan.OrnamentPointer];
        Inc(Chan.OrnamentPointer);
        Ornament_Length := Index[Chan.OrnamentPointer];
        Inc(OrnamentPointer);
        Position_In_Ornament := 0;
        if GTR_ID[3] <> #$10 then
         Envelope_Enabled := False
       end;
      $80..$BF:
       Note_Skip_Counter := Index[Address_In_Pattern] - $80;
      $C0..$CF:
       begin
        SetEnvelopeRegister(Index[Address_In_Pattern] - $C0);
        Inc(Address_In_Pattern);
        RegisterAY.Index[11] := Index[Address_In_Pattern];
        Envelope_Enabled := True
       end;
      $D0..$DF:
       begin
        Inc(Address_In_Pattern);
        exit
       end;
      $E0:
       begin
        Enabled := False;
        if GTR_ID[3] <> #$10 then
         begin
          Inc(Address_In_Pattern);
          exit
         end
       end;
      $E1..$EF:
       Volume := 15 - (Index[Address_In_Pattern] - $E0)
      end;
     Inc(Address_In_Pattern)
    until False
   end 
 end;

 procedure GetRegisters(var Chan:GTR_Channel_Parameters);
 var
  j,b:byte;
 begin
  with Chan do
   begin
    if Enabled then
     with RAM do
      begin
       j := Note + Index[OrnamentPointer + Position_In_Ornament];
       if j > $5f then j := $5f;
       Inc(Position_In_Ornament);
       if Position_In_Ornament = Ornament_Length then
        Position_In_Ornament := Loop_Ornament_Position;
       Ton := (PT2_Table[j] +
        WordPtr(@Index[SamplePointer + Position_In_Sample + 2])^) and $FFF;
       b := Index[SamplePointer + Position_In_Sample + 1];
       RegisterAY.Noise := (RegisterAY.Noise or b) and $1F;
       Amplitude := Index[SamplePointer + Position_In_Sample] - Volume;
       if ShortInt(Amplitude) < 0 then Amplitude := 0;
       Amplitude := Amplitude and $F;
       if shortint(b) < 0 then
        if Envelope_Enabled then Amplitude := Amplitude or 16;
       if b and 64 <> 0 then
        TempMixer := TempMixer or 64;
       if b and 32 <> 0 then
        TempMixer := TempMixer or 8;
       Inc(Position_In_Sample,4);
       if Position_In_Sample = Sample_Length then
        Position_In_Sample := Loop_Sample_Position
      end
    else
     begin
      Amplitude := 0;
      TempMixer := TempMixer or 8 or 64
     end
   end;
  TempMixer := TempMixer shr 1
 end;

begin
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
  begin
   Real_End := True;
   exit
  end;
with PlParams.GTR do
 begin
  Dec(DelayCounter);
  if DelayCounter = 0 then
   begin
    DelayCounter := RAM.GTR_Delay;
    with PlParams.GTR_A do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       begin
        with RAM do
         while Index[Address_In_Pattern] = 255 do
          begin
           Inc(CurrentPosition);
           if CurrentPosition = GTR_NumberOfPositions then
            CurrentPosition := GTR_LoopPosition;
           Address_In_Pattern := GTR_PatternsPointers[
                GTR_Positions[CurrentPosition] div 6].PatternA;
           PlParams.GTR_B.Address_In_Pattern :=
            GTR_PatternsPointers[GTR_Positions[CurrentPosition] div 6].PatternB;
           PlParams.GTR_C.Address_In_Pattern :=
            GTR_PatternsPointers[GTR_Positions[CurrentPosition] div 6].PatternC
          end;
        PatternInterpreter(PlParams.GTR_A)
       end
     end;
    with PlParams.GTR_B do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.GTR_B)
     end;
    with PlParams.GTR_C do
     begin
      Dec(Note_Skip_Counter);
      if Note_Skip_Counter < 0 then
       PatternInterpreter(PlParams.GTR_C)
     end
   end
 end;

TempMixer := 0;
RegisterAY.Noise := 0;
GetRegisters(PlParams.GTR_A);
GetRegisters(PlParams.GTR_B);
GetRegisters(PlParams.GTR_C);

SetMixerRegister(TempMixer);

RegisterAY.TonA := PlParams.GTR_A.Ton;
RegisterAY.TonB := PlParams.GTR_B.Ton;
RegisterAY.TonC := PlParams.GTR_C.Ton;

SetAmplA(PlParams.GTR_A.Amplitude);
SetAmplB(PlParams.GTR_B.Amplitude);
SetAmplC(PlParams.GTR_C.Amplitude);

Inc(Global_Tick_Counter)

end;

procedure FXM_Get_Registers;

 procedure RealGetRegisters(var Chan:FXM_Channel_Parameters);
 begin
  RegisterAY.Noise := PlParams.FXM.Noise_Base and 31;
  with Chan do
   begin
    b2e := False;
    if Ton <> 0 then
     Amplitude := Volume and 15
    else
     Amplitude := 0
   end
 end;

 procedure GetRegisters(var Chan:FXM_Channel_Parameters);
 var
  b:byte;
 begin
  with Chan do
   begin
    Dec(Sample_Tik_Counter);
    if Sample_Tik_Counter = 0 then
     begin
      repeat
       with RAM do
        case Index[Chan.Point_In_Sample] of
        0..$1D:
         begin
          Volume := Index[Point_In_Sample];
          Inc(Point_In_Sample);
          Sample_Tik_Counter := Index[Point_In_Sample];
          Inc(Point_In_Sample);
          break
         end;
        $80:
         Point_In_Sample := WordPtr(@Index[Point_In_Sample + 1])^
        else
         begin
          Volume := Index[Point_In_Sample] - $32;
          Inc(Point_In_Sample);
          Sample_Tik_Counter := 1;
          break
         end;
        end
      until False;
     end;
    if (Ton <> 0) and not b2e then
     begin
      repeat
       with RAM do
        case Index[Point_In_Ornament] of
        $80:
         Point_In_Ornament := WordPtr(@Index[Point_In_Ornament + 1])^;
        $82:
         begin
          Inc(Point_In_Ornament);
          b3e := True
         end;
        $83:
         begin
          Inc(Chan.Point_In_Ornament);
          b3e := False
         end;
        $84:
         begin
          Inc(Point_In_Ornament);
          FXM_Mixer := FXM_Mixer xor 9;
         end
        else
         begin
          if b3e then
           begin
            Inc(Note,Index[Point_In_Ornament]);
            if Note > $53 then b := $53 else b := Note;
            Ton := FXM_Table[b]
           end
          else
           Inc(Ton,shortint(Index[Point_In_Ornament]));
          Inc(Point_In_Ornament);
          break
         end
        end;
      until False
     end
   end;
  RealGetRegisters(Chan)
 end;

 procedure PatternInterpreter(var Chan:FXM_Channel_Parameters; var Stek:FXM_Stek);
 var
  b:byte;
  i:integer;
 begin
  with Chan do
   begin
    Dec(Note_Skip_Counter);
    if Note_Skip_Counter <> 0 then
     GetRegisters(Chan)
    else
     repeat
      with RAM do
       case Index[Address_In_Pattern] of
       0..$7F:
        begin
         if Index[Address_In_Pattern] <> 0 then
          begin
           Note := Index[Address_In_Pattern] - 1 + Transposit;
           if Note > $53 then b := $53 else b := Note;
           Ton := FXM_Table[b];
           b3e := False
          end
         else
          Ton := 0;
         Inc(Address_In_Pattern);
         Note_Skip_Counter := Index[Address_In_Pattern];
         Inc(Address_In_Pattern);
         Point_In_Ornament := OrnamentPointer;
         if not b1e then
          begin
           b1e := b0e;
           Point_In_Sample := SamplePointer;
           Volume := Index[Point_In_Sample];
           Inc(Point_In_Sample);
           Sample_Tik_Counter := Index[Point_In_Sample];
           Inc(Point_In_Sample);
           RealGetRegisters(Chan)
          end
         else
          GetRegisters(Chan);
         exit
        end;
       $80:
        Address_In_Pattern := WordPtr(@Index[Address_In_Pattern + 1])^;
       $81:
        begin
         i := Length(Stek);
         SetLength(Stek,i + 1);
         Stek[i] := Address_In_Pattern + 3;
         Address_In_Pattern := WordPtr(@Index[Address_In_Pattern + 1])^
        end;
       $82:
        begin
         i := Length(Stek);
         SetLength(Stek,i + 2);
         Inc(Address_In_Pattern);
         Stek[i] := Index[Address_In_Pattern];
         Inc(Address_In_Pattern);
         Stek[i + 1] := Address_In_Pattern
        end;
       $83:
        begin
         i := Length(Stek);
         Dec(Stek[i - 2]);
         if Stek[i - 2] and 255 <> 0 then
          Address_In_Pattern := Stek[i - 1]
         else
          begin
           SetLength(Stek,i - 2);
           Inc(Address_In_Pattern)
          end
        end;
       $84:
        begin
         Inc(Address_In_Pattern);
         PlParams.FXM.Noise_Base := Index[Address_In_Pattern];
         Inc(Address_In_Pattern)
        end;
       $85:
        begin
         Inc(Address_In_Pattern);
         FXM_Mixer := Index[Address_In_Pattern];
         Inc(Address_In_Pattern)
        end;
       $86:
        begin
         Inc(Address_In_Pattern);
         OrnamentPointer := WordPtr(@Index[Address_In_Pattern])^;
         Inc(Address_In_Pattern,2)
        end;
       $87:
        begin
         Inc(Address_In_Pattern);
         SamplePointer := WordPtr(@Index[Address_In_Pattern])^;
         Inc(Address_In_Pattern,2)
        end;
       $88:
        begin
         Inc(Address_In_Pattern);
         Transposit := Index[Address_In_Pattern];
         Inc(Address_In_Pattern)
        end;
       $89:
        begin
         i := Length(Stek);
         Address_In_Pattern := Stek[i - 1];
         SetLength(Stek,i - 1)
        end;
       $8A:
        begin
         Inc(Address_In_Pattern);
         b0e := True;
         b1e := False
        end;
       $8B:
        begin
         Inc(Address_In_Pattern);
         b0e := False;
         b1e := False
        end;
       $8C:
        Inc(Chan.Address_In_Pattern,3);
       $8D:
        begin
         Inc(Address_In_Pattern);
         PlParams.FXM.Noise_Base :=
         (PlParams.FXM.Noise_Base + Index[Address_In_Pattern])
                                  and PlParams.FXM.amad_andsix;
         Inc(Address_In_Pattern)
        end;
       $8E:
        begin
         Inc(Address_In_Pattern);
         Transposit := Transposit + Index[Address_In_Pattern];
         Inc(Address_In_Pattern)
        end;
       $8F:
        begin
         i := Length(Stek);
         SetLength(Stek,i + 1);
         Stek[i] := Transposit;
         Inc(Address_In_Pattern)
        end;
       $90:
        begin
         i := Length(Stek);
         Transposit := Stek[i - 1];
         SetLength(Stek,i - 1);
         Inc(Address_In_Pattern)
        end
       else
        Inc(Address_In_Pattern)
       end
     until False
   end
 end;

begin
if Global_Tick_Counter >= Global_Tick_Max then
 if Do_Loop then
  Global_Tick_Counter := Global_Tick_Max
 else
   begin
    Real_End := True;
    exit
   end;

PatternInterpreter(PlParams.FXM_A,FXM_StekA);
PatternInterpreter(PlParams.FXM_B,FXM_StekB);
PatternInterpreter(PlParams.FXM_C,FXM_StekC);

RegisterAY.TonA := PlParams.FXM_A.Ton and $fff;
RegisterAY.TonB := PlParams.FXM_B.Ton and $fff;
RegisterAY.TonC := PlParams.FXM_C.Ton and $fff;

SetAmplA(PlParams.FXM_A.Amplitude);
SetAmplB(PlParams.FXM_B.Amplitude);
SetAmplC(PlParams.FXM_C.Amplitude);

SetMixerRegister((PlParams.FXM_A.FXM_Mixer or
                  PlParams.FXM_B.FXM_Mixer shl 1 or
                  PlParams.FXM_C.FXM_Mixer shl 2) and $3F);

Inc(Global_Tick_Counter)

end;

procedure AY_Get_Registers;
begin
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
   dec(Z80_Registers.SP,2);
   WordPointer(@RAM.Index[Z80_Registers.SP])^ := Z80_Registers.PC;
   case IMode of
   2:
    begin
     Z80_Registers.PC := WordPointer(
        @RAM.Index[Z80_Registers.IR.HiByte * 256 + 255])^;
     inc(CurrentTact,18);
    end;
   else
    begin
     Z80_Registers.PC := $38;
     inc(CurrentTact,12);
    end;
   end
  end
 else
  begin
   EIorDDorFD := False;
   inc(CurrentTact,Z80_ExecuteCommand);
  end;
if CurrentTact >= MaxTStates then
 begin
  dec(CurrentTact,MaxTStates);
  inc(Global_Tick_Counter);
  if Global_Tick_Counter >= Global_Tick_Max then
   if Do_Loop then
    Global_Tick_Counter := Global_Tick_Max
   else
    Real_End := True;
  exit
 end
until False
end;

function AllErrored:boolean;
var
 i:integer;
begin
Result := False;
for i := 0 to Length(PlaylistItems) - 1 do
 if PlayListItems[i].Error = FileNoError then exit;
Result := True
end;

procedure PlayNextItem;
var
 Tmp:integer;
begin
Tmp := PlayingOrderItem + 1;
if Tmp >= Length(PlayListItems) then
 if ListLooped and not AllErrored then
  Tmp := 0;
PlayItem(Tmp,0)
end;

procedure PlayPreviousItem;
var
 Tmp:integer;
begin
Tmp := PlayingOrderItem - 1;
if Tmp < 0 then
 if ListLooped and not AllErrored then
  Tmp := Length(PlayListItems) - 1;
PlayItem(Tmp,0)
end;

function GetPlayListTime(PLItem:PPLayListItem):integer;
var
 i:integer;
begin
with PLItem^ do
 begin
  if FileType in [OUTFile,ZXAYFile,EPSGFile,BASSFileMin..BASSFileMax] then
   Result := round(Time / 1000)
  else if FileType in [AYFile,AYMFile] then
   Result := round(Time / FrqZ80 * MaxTStates)
  else if FileType = CDAFile then
   Result := round(Time / 75)
  else
   begin
    if (not Mixer_Interrupt_Freq_From_List) or
       ((Int_Freq < 0) and (PLDef_Player_Frq < 0)) then
     i := Interrupt_Freq
    else if Int_Freq >= 0 then
     i := Int_Freq
    else
     i := PLDef_Player_Frq;
    Result := round(Time / i * 1000)
   end
 end  
end;

procedure TryGetTime(n:integer);
var
 FileHandleTime:integer;
begin
with PlayListItems[n]^ do
 if (Time = 0) and (Error = FileNoError) then
  begin
   if not (FileType in [BASSFileMin..BASSFileMax,CDAFile]) then
    UniReadInit(FileHandleTime,URFile,FileName,nil);
   try
    GetTime(FileHandleTime,n,False,Loop)
   except
    on EBASSError do Error := ErBASSError;
    on EFileStructureError do Error := ErBadFileStructure
    else Error := ErReadingFile
   end;
   if not (FileType in [BASSFileMin..BASSFileMax,CDAFile]) then
    UniReadClose(FileHandleTime);
   if (Error <> FileNoError) or (Time <> 0) then
    begin
     RedrawItem(0,n);
     if (n - Item_Displayed + 1) in [0..2] then ReprepareScroll
    end
  end
end;

function CalculateTotalTime;
var
 i,t,l:integer;
 s:string;
begin
{$IFDEF WIN32GUI}
Result := False;
if not PLLbTime.Enabled then exit;
if Force then PLLbTime.Enabled := False;
{$ENDIF WIN32GUI}
t := 0;
Result := True;
try
l := Length(PlaylistItems);
for i := 0 to l - 1 do
 with PlayListItems[i]^ do
  begin
   if Force then TryGetTime(i);
   if Time > 0 then
    Inc(t,GetPlayListTime(PlaylistItems[i]))
   else if Error = FileNoError then
    Result := False;
   if Force then
    begin
     Applet.ProcessMessages;
     if AppletTerminated then exit;
     if l <> System.Length(PlaylistItems) then
      begin
       Result := False;
       break
      end
    end
  end;
{$IFDEF WIN32GUI}
s := TimeSToStr(t);
if not Result then s := s + '+';
PLLbTime.Caption := s;
{$ENDIF WIN32GUI}
finally
{$IFDEF WIN32GUI}
if Force then PLLbTime.Enabled := True;
{$ENDIF WIN32GUI}
end
end;

procedure Calculate_Slider_Points;
var
 i,CPI,prev:integer;
 p:longword;
 Step,CurPoint:real;
 temp1:integer;
 EPSGRec:packed record
  case Boolean of
  True:(Reg,Data:byte;
        TSt:longint);
  False:(All:int64);
 end;
begin
case CurFileType of
STCFile..FXMFile:
 begin
  InitForAllTypes(True);
  Step := Global_Tick_Max / ProgrWidth;
  CurPoint := Step;
  CPI := round(CurPoint);
  p := 0;
  i := 0;
  while p < ProgrWidth do
   begin
    while i < CPI do
     begin
      All_GetRegisters;
      Inc(i)
     end;
    Trackers_Slider_Points[p].PlPars := PlParams;
    Trackers_Slider_Points[p].AYRegs := RegisterAY;
    if CurFileType = FXMFile then
     begin
      temp1 := Length(FXM_StekA);
      SetLength(Trackers_Slider_Points[p].FXM_StekA,temp1);
      if temp1 <> 0 then
       Move(FXM_StekA[0],Trackers_Slider_Points[p].FXM_StekA[0],temp1 * 2);
      temp1 := Length(FXM_StekB);
      SetLength(Trackers_Slider_Points[p].FXM_StekB,temp1);
      if temp1 <> 0 then
       Move(FXM_StekB[0],Trackers_Slider_Points[p].FXM_StekB[0],temp1 * 2);
      temp1 := Length(FXM_StekC);
      SetLength(Trackers_Slider_Points[p].FXM_StekC,temp1);
      if temp1 <> 0 then
       Move(FXM_StekC[0],Trackers_Slider_Points[p].FXM_StekC[0],temp1 * 2)
     end;
    CurPoint := CurPoint + Step;
    CPI := round(CurPoint);
    Inc(p)
   end
 end;
PSGFile:
 begin
  InitForAllTypes(True);
  Step := Global_Tick_Max / ProgrWidth;
  CurPoint := Step;
  CPI := round(CurPoint);
  p := 0;
  i := 0;
  while p < ProgrWidth do
   begin
    while i < CPI do
     begin
      PSG_Get_Registers;
      inc(i)
     end;
    Trackers_Slider_Points[p].AYRegs := RegisterAY;
    Trackers_Slider_Points[p].DWParam1 := UniReadersData[FileHandle].UniFilePos;
    Trackers_Slider_Points[p].DWParam2 := PSG_Skip;
    CurPoint := CurPoint + Step;
    CPI := round(CurPoint);
    inc(p)
   end
 end;
EPSGFile:
 begin
  InitForAllTypes(True);
  Step := Time_ms / ProgrWidth / 1000 * FrqZ80;
  CurPoint := Step;
  CPI := round(Step);
  prev := 0;
  p := 0;
  i := 0;
  EPSGRec.All := 0;
  repeat
   UniRead(FileHandle,@EPSGRec,5);
   if EPSGRec.All = $FFFFFFFFFF then
    begin
     Inc(i,EPSG_TStateMax - prev);
     prev := 0
    end
   else
    begin
     Inc(i,EPSGRec.TSt - prev);
     prev := EPSGRec.TSt;
     with EPSGRec do
      if Reg < 14 then
       begin
        case Reg of
        1,3,5,13:
         Data := Data and 15;
        6,8..10:
         Data := Data and 31;
        7:
         Data := Data and 63
        end;
        RegisterAY.Index[Reg] := Data
       end
    end;
   if i >= CPI then
    begin
     if p = ProgrWidth then break;
     Trackers_Slider_Points[p].AYRegs := RegisterAY;
     Trackers_Slider_Points[p].DWParam1 := UniReadersData[FileHandle].UniFilePos;
     Trackers_Slider_Points[p].DWParam2 := prev;
     Dec(i,CPI);
     CurPoint := CurPoint + Step - CPI;
     CPI := round(CurPoint);
     Inc(p)
    end
  until UniReadersData[FileHandle].UniFilePos =
            UniReadersData[FileHandle].UniFileSize;
  if p > 0 then
   while p < ProgrWidth do
    begin
     Trackers_Slider_Points[p] := Trackers_Slider_Points[p - 1];
     Inc(p)
    end
 end;
OUTFile:
 begin
  InitForAllTypes(True);
  Step := Time_ms / ProgrWidth / 1000 * FrqZ80;
  CurPoint := Step;
  CPI := round(Step);
  prev := 0;
  p := 0;
  i := 0;
  repeat
   UniRead(FileHandle,@ZX_Takt,2);
   UniRead(FileHandle,@ZX_Port,2);
   UniRead(FileHandle,@ZX_Port_Data,1);
   case ZX_Takt of
   -1,0:
    begin
     Inc(i,17472 - prev);
     prev := 0
    end
   else
    begin
     Inc(i,ZX_Takt - prev);
     prev := ZX_Takt
    end
   end;
   if ZX_Takt > 0 then
    if (ZX_Port and PortMask) = ($FFFD and PortMask) then
     Current_RegisterAY := ZX_Port_Data
    else if (ZX_Port and PortMask) = ($BFFD and PortMask) then
     if Current_RegisterAY < 14 then
      begin
       case Current_RegisterAY of
       1,3,5,13:
        ZX_Port_Data := ZX_Port_Data and 15;
       6,8..10:
        ZX_Port_Data := ZX_Port_Data and 31;
       7:
        ZX_Port_Data := ZX_Port_Data and 63
       end;
       RegisterAY.Index[Current_RegisterAY] := ZX_Port_Data
      end;
   if i >= CPI then
    begin
     if p = ProgrWidth then break;
     Trackers_Slider_Points[p].AYRegs := RegisterAY;
     Trackers_Slider_Points[p].DWParam1 := UniReadersData[FileHandle].UniFilePos;
     Trackers_Slider_Points[p].DWParam2 := prev;
     Trackers_Slider_Points[p].DWParam3 := Current_RegisterAY;
     Dec(i,CPI);
     CurPoint := CurPoint + Step - CPI;
     CPI := round(CurPoint);
     Inc(p)
    end
  until UniReadersData[FileHandle].UniFilePos =
            UniReadersData[FileHandle].UniFileSize;
  if p > 0 then
   while p < ProgrWidth do
    begin
     Trackers_Slider_Points[p] := Trackers_Slider_Points[p - 1];
     Inc(p)
    end
 end;
ZXAYFile:
 begin
  InitForAllTypes(True);
  if UniReadersData[FileHandle].UniFileSize < 5 then exit;
  Step := Time_ms / ProgrWidth / 1000 * FrqZ80;
  CurPoint := Step;
  CPI := round(Step);
  prev := 0;
  p := 0;
  i := 0;
  repeat
   UniRead(FileHandle,@temp1,4);
   AY_Takt := temp1 and $FFFFF;
   AY_Reg := (temp1 shr 20) and 15;
   AY_Data := temp1 shr 24;
   if AY_Takt = 0 then
    Inc(i,$100000 - prev)
   else
    Inc(i,AY_Takt - prev);
   prev := AY_Takt;
   if AY_Reg < 14 then
    RegisterAY.Index[AY_Reg] := AY_Data;
   if i >= CPI then
    begin
     if p = ProgrWidth then break;
     Trackers_Slider_Points[p].AYRegs := RegisterAY;
     Trackers_Slider_Points[p].DWParam1 := UniReadersData[FileHandle].UniFilePos;
     Trackers_Slider_Points[p].DWParam2 := prev;
     Dec(i,CPI);
     CurPoint := CurPoint + Step - CPI;
     CPI := round(CurPoint);
     Inc(p)
    end;
  until UniReadersData[FileHandle].UniFilePos >=
     UniReadersData[FileHandle].UniFileSize;
  if p > 0 then
   while p < ProgrWidth do
    begin
     Trackers_Slider_Points[p] := Trackers_Slider_Points[p - 1];
     Inc(p)
    end
 end
end
end;

procedure SetProgrWidth;
begin
SuspendIfWO;
try
ProgrWidth := pw;
SetLength(Trackers_Slider_Points,pw);
if FileOpened or FileLoaded then
 begin
  if IsPlaying then
   begin

   end;
  Calculate_Slider_Points;
  if IsPlaying then
   begin

   end
 end
finally
ResumeIfWO
end
end;

procedure RerollMusic(newpos,maxpos,p:integer;f:double);
var
 pos,stp,bas:integer;
 l:integer;
 op:pointer;
begin
case CurFileType of
VTXFile..YM6File:
 begin
  SetEnvelopeRegister(0);
  First_Period := False;
  Ampl := 0;
  ResetAYChipEmulation;
  Global_Tick_Counter := round(newpos/maxpos*Global_Tick_Max);
  BaseSample := round(Global_Tick_Counter * 1000/Interrupt_Freq * SampleRate);
  Position_In_VTX := Global_Tick_Counter mod NumberOfVBLs;
  if CurFileType in [YM5File..YM6File] then
   begin
    if BytePtr(pointer(integer(PVTXYMUnpackedData) + 19))^ and 1 <> 0 then
     begin
      pos := Position_In_VTX;
      bas := VTX_Offset + NumberOfVBLs * 13;
      stp := 1
     end
    else
     begin
      Position_In_VTX := Position_In_VTX * 16;
      pos := Position_In_VTX;
      bas := VTX_Offset + 13;
      stp := 16
     end
   end
  else
   begin
    pos := Position_In_VTX;
    bas := VTX_Offset + NumberOfVBLs * 13;
    stp := 1
   end;
  if PVTXYMUnpackedData^[pos + bas] = 255 then
   begin
    repeat
     Dec(pos,stp)
    until (pos < 0) or (PVTXYMUnpackedData^[pos + bas] <> 255);
    if pos >= 0 then
     SetEnvelopeRegister(PVTXYMUnpackedData^[pos + bas] and 15)
   end;
  ProgrPos := round(newpos/maxpos*ProgrMax);
  VProgrPos := ProgrPos
 end;
STCFile..FXMFile:
 begin
  if p = 0 then
   begin
    InitForAllTypes(False);
    ResetAYChipEmulation
   end
  else
   begin
    Dec(p);
    ResetAYChipEmulation;
    PlParams := Trackers_Slider_Points[p].PlPars;
    RegisterAY := Trackers_Slider_Points[p].AYRegs;
    SetMixerRegister(Trackers_Slider_Points[p].AYRegs.Mixer);
    SetAmplA(Trackers_Slider_Points[p].AYRegs.AmplitudeA);
    SetAmplB(Trackers_Slider_Points[p].AYRegs.AmplitudeB);
    SetAmplC(Trackers_Slider_Points[p].AYRegs.AmplitudeC);
    SetEnvelopeRegister(Trackers_Slider_Points[p].AYRegs.EnvType);
    if CurFileType = FXMFile then
     begin
      l := Length(Trackers_Slider_Points[p].FXM_StekA);
      SetLength(FXM_StekA,l);
      if l <> 0 then
       Move(Trackers_Slider_Points[p].FXM_StekA[0],FXM_StekA[0],l * 2);
      l := Length(Trackers_Slider_Points[p].FXM_StekB);
      SetLength(FXM_StekB,l);
      if l <> 0 then
       Move(Trackers_Slider_Points[p].FXM_StekB[0],FXM_StekB[0],l * 2);
      l := Length(Trackers_Slider_Points[p].FXM_StekC);
      SetLength(FXM_StekC,l);
      if l <> 0 then
       Move(Trackers_Slider_Points[p].FXM_StekC[0],FXM_StekC[0],l * 2)
     end
   end;
  p := round(f * Global_Tick_Max / ProgrWidth);
  Global_Tick_Counter := round(newpos / maxpos * Global_Tick_Max) - p;
  while p > 0 do
   begin
    All_GetRegisters;
    Dec(p)
   end;
  BaseSample := round(Global_Tick_Counter*1000/Interrupt_Freq * SampleRate);
  ProgrPos := round(newpos / maxpos * ProgrMax);
  VProgrPos := ProgrPos
 end;
PSGFile:
 begin
  if p = 0 then
   begin
    InitForAllTypes(False);
    ResetAYChipEmulation
   end
  else
   begin
    dec(p);
    ResetAYChipEmulation;
    RegisterAY := Trackers_Slider_Points[p].AYRegs;
    SetMixerRegister(Trackers_Slider_Points[p].AYRegs.Mixer);
    SetAmplA(Trackers_Slider_Points[p].AYRegs.AmplitudeA);
    SetAmplB(Trackers_Slider_Points[p].AYRegs.AmplitudeB);
    SetAmplC(Trackers_Slider_Points[p].AYRegs.AmplitudeC);
    SetEnvelopeRegister(Trackers_Slider_Points[p].AYRegs.EnvType);
    UniFileSeek(FileHandle,Trackers_Slider_Points[p].DWParam1);
    PSG_Skip := Trackers_Slider_Points[p].DWParam2
   end;
  p := round(f * Global_Tick_Max / ProgrWidth);
  Global_Tick_Counter := round(newpos / maxpos * Global_Tick_Max) - p;
  while p > 0 do
   begin
    PSG_Get_Registers;
    Dec(p)
   end;
  BaseSample := round(Global_Tick_Counter*1000/Interrupt_Freq * SampleRate);
  ProgrPos := round(newpos / maxpos * ProgrMax);
  VProgrPos := ProgrPos
 end;
EPSGFIle:
 begin
  if p = 0 then
   begin
    InitForAllTypes(False);
    ResetAYChipEmulation
   end
  else
   begin
    Dec(p);
    ResetAYChipEmulation;
    RegisterAY := Trackers_Slider_Points[p].AYRegs;
    SetMixerRegister(Trackers_Slider_Points[p].AYRegs.Mixer);
    SetAmplA(Trackers_Slider_Points[p].AYRegs.AmplitudeA);
    SetAmplB(Trackers_Slider_Points[p].AYRegs.AmplitudeB);
    SetAmplC(Trackers_Slider_Points[p].AYRegs.AmplitudeC);
    SetEnvelopeRegister(Trackers_Slider_Points[p].AYRegs.EnvType);
    UniFileSeek(FileHandle,Trackers_Slider_Points[p].DWParam1);
    Previous_AY_Takt := Trackers_Slider_Points[p].DWParam2
   end;
  p := round(f * Time_ms / 1000 * FrqZ80 / EPSG_TStateMax / ProgrWidth);
  if p > 0 then
   begin
    Previous_AY_Takt := 0;
    while p > 0 do
     begin
      EPSG_Get_Registers;
      Dec(p)
     end;
    IntFlag := False;
   end;
  BaseSample := round(newpos / maxpos * Time_ms / 1000 * SampleRate);
  ProgrPos := round(newpos / maxpos * ProgrMax);
  VProgrPos := ProgrPos
 end;
OUTFile,ZXAYFile:
 begin
  if p = 0 then
   begin
    InitForAllTypes(False);
    ResetAYChipEmulation
   end
  else
   begin
    Dec(p);
    ResetAYChipEmulation;
    RegisterAY := Trackers_Slider_Points[p].AYRegs;
    SetMixerRegister(Trackers_Slider_Points[p].AYRegs.Mixer);
    SetAmplA(Trackers_Slider_Points[p].AYRegs.AmplitudeA);
    SetAmplB(Trackers_Slider_Points[p].AYRegs.AmplitudeB);
    SetAmplC(Trackers_Slider_Points[p].AYRegs.AmplitudeC);
    SetEnvelopeRegister(Trackers_Slider_Points[p].AYRegs.EnvType);
    UniFileSeek(FileHandle,Trackers_Slider_Points[p].DWParam1);
    Previous_AY_Takt := Trackers_Slider_Points[p].DWParam2;
    Current_RegisterAY := Trackers_Slider_Points[p].DWParam3;
    Inc(p)
   end;
  OUTZXAYConv_TotalTime :=
    round(p / ProgrWidth * Time_ms / 1000 * FrqZ80) mod MaxTStates;
  p := round(f * Time_ms / 1000 * FrqZ80 / MaxTStates / ProgrWidth);
  while p > 0 do
   begin
    All_GetRegisters;
    Dec(p)
   end;
  IntFlag := False;
  BaseSample := round(newpos / maxpos * Time_ms / 1000 * SampleRate);
  ProgrPos := round(newpos / maxpos * ProgrMax);
  VProgrPos := ProgrPos
 end;
AYFile..AYMFile:
 begin
  l := round(newpos / maxpos * Global_Tick_Max);
  if l > Global_Tick_Counter then
   begin
    TOutProc(op) := OutProc;
    if op = @ZXOutProc then
     OutProc := OutZXConverter
    else if op = @CPCOutProc then
     OutProc := OutCPCConverter
    else
     OutProc := OutInitialConverter;
    repeat
     AY_Get_Registers
    until Global_Tick_Counter >= l;
    OutProc := op;
    Previous_Tact := CurrentTact;
    IntBeeper := False;
    IntAY := False;
    ResetAYChipEmulation;
    SetEnvelopeRegister(RegisterAY.EnvType);
    First_Period := False;
    Ampl := 0;
    SetMixerRegister(RegisterAY.Mixer);
    SetAmplA(RegisterAY.AmplitudeA);
    SetAmplB(RegisterAY.AmplitudeB);
    SetAmplC(RegisterAY.AmplitudeC)
   end
  else if l < Global_Tick_Counter then
   begin
    TOutProc(op) := OutProc;
    InitForAllTypes(False);
    ResetAYChipEmulation;
    if op = @ZXOutProc then
     OutProc := OutZXConverter
    else if op = @CPCOutProc then
     OutProc := OutCPCConverter
    else
     OutProc := OutInitialConverter;
    Global_Tick_Counter := 0;
    if p > 0 then
     repeat
      AY_Get_Registers
     until Global_Tick_Counter >= l;
    OutProc := op;
    SetEnvelopeRegister(RegisterAY.EnvType);
    First_Period := False;
    Ampl := 0;
    SetMixerRegister(RegisterAY.Mixer);
    SetAmplA(RegisterAY.AmplitudeA);
    SetAmplB(RegisterAY.AmplitudeB);
    SetAmplC(RegisterAY.AmplitudeC)
   end
  else
   ResetAYChipEmulation;
  BaseSample := round(l/FrqZ80 * MaxTStates * SampleRate);
  ProgrPos := round(newpos / maxpos * ProgrMax);
  VProgrPos := ProgrPos
 end
end;
CurrTime_Rasch := round(VProgrPos / SampleRate * 1000)
end;

procedure Rewind;
var
 p:integer;
 f:double;
 i:DWORD;
 MSF:packed record
  case boolean of
  True: (MSF:DWORD);
  False:(M,S,F:byte);
 end;
begin
if not IsPlaying then exit;
if Paused then exit;
if MoveProgr.Clicked then exit;
if not (CurFileType in [BASSFileMin..BASSFileMax,CDAFile]) then
 WOResetPlaying(True);
if newpos < 0 then
 newpos := 0
else if longword(newpos) > maxpos then
 newpos := maxpos;
if maxpos = ProgrWidth then
 begin
  p := newpos;
  f := 0
 end
else
 begin
  f := newpos/maxpos * ProgrWidth;
  p := Trunc(f);
  f := Frac(f)
 end;

if MoveProgr.PosX <> p then
 begin
  MoveProgr.HideBmp;
  OffsetRgn(MoveProgr.RgnHandle,p - MoveProgr.PosX,0);
  MoveProgr.PosX := p;
  MoveProgr.Redraw(False)
 end;
if not (CurFileType in [BASSFileMin..BASSFileMax,CDAFile]) then
 begin
  try
   RerollMusic(NewPos,MaxPos,p,f);
  finally
   WOUnresetPlaying
  end 
 end
else if CurFileType in [StreamFileMin..StreamFileMax] then
 begin
  if not BASS_ChannelSetPosition(MusicHandle,BASS_ChannelSeconds2Bytes(MusicHandle,newpos/maxpos * ProgrMax / 1000)) then
   PostMessage(WHandle,WM_PLAYNEXTITEM,0,0)
 end
else if CurFileType <> CDAFile then
 begin
  Paused := True;
  p := round(newpos/maxpos * ProgrMax / 1000);
  if not BASS_ChannelSetPosition(MusicHandle,DWORD(p) or $FFFF0000) then
   PostMessage(WHandle,WM_PLAYNEXTITEM,0,0)
  else
   TimePlayStart := GetTickCount - DWORD(p) * 1000;
  Paused := False
 end
else
 begin
  i := round(newpos/maxpos * ProgrMax);
  MSF.F := i mod 75;
  i := i div 75;
  MSF.S := i mod 60;
  MSF.M := i div 60;
  CDSetPosition(CurCDNum,CurCDTrk,MSF.MSF,WHandle)
 end
end;

end.