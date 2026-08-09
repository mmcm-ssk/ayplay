{
This is part of AY Emulator project
AY-3-8910/12 Emulator
Version 3.0 for Windows 95
Author Sergey Vladimirovich Bulba
(c)1999-2004 S.V.Bulba
}

unit Mixer;

interface

uses MMSystem, AY;

type
  TSysMixers = array of record
   ID:integer;
   Caps:TMIXERCAPS;
   Dests:array of record
    Line:TMIXERLINE;
    LCtrls:TMIXERLINECONTROLS;
    Ctrls:array of TMIXERCONTROL;
   end;
  end;

procedure GetSysVolume;
procedure SetSysVolume;
procedure SetMixer;
procedure GetSystemMixers(var Mixers:TSysMixers);
function SelectMixerControl(var Mixers:TSysMixers;i,j,k:integer):boolean;
function DetectVolumeCtrl2(var Mixers:TSysMixers):boolean;
function DetectVolumeCtrl:boolean;

var
 Mixer_ChType:ChTypes;
 Mixer_Index_AL,Mixer_Index_AR,
 Mixer_Index_BL,Mixer_Index_BR,
 Mixer_Index_CL,Mixer_Index_CR:integer;
 Mixer_AY_Freq,Mixer_Interrupt_Freq,Mixer_Stereo:integer;
 Mixer_ChType_From_List:boolean = True;
 Mixer_Channel_Mode_From_List:boolean = True;
 Mixer_AY_Freq_From_List:boolean = True;
 Mixer_Interrupt_Freq_From_List:boolean = True;
 Mixer_Stereo_From_List:boolean = True;
 VolumeCtrl,VolumeCtrlMax:integer;
 VolLinear:boolean = False;
 SysVolumeParams:record
  Title:string;
  MixerNumber,DestNumber,CtrlNumber,MixerID,Max,Min,Pos,ControlID:integer;
  MixerHandle:HMIXER;
  Opened:boolean;
 end;

implementation

uses Windows,Common, MainWin;

procedure GetSystemMixers;
var
 n,i,j:integer;
begin
n := mixerGetNumDevs;
SetLength(Mixers,n);
for i := 0 to n - 1 do
 begin
 if mixerGetID(i,DWORD(Mixers[i].ID),MIXER_OBJECTF_MIXER) <> MMSYSERR_NOERROR then
  Mixers[i].ID := - 1
 else if mixerGetDevCaps(Mixers[i].ID,@Mixers[i].Caps,sizeof(TMIXERCAPS)) = MMSYSERR_NOERROR then
  begin
   SetLength(Mixers[i].Dests,Mixers[i].Caps.cDestinations);
   for j := 0 to Mixers[i].Caps.cDestinations - 1 do
    begin
     FillChar(Mixers[i].Dests[j],sizeof(TMIXERLINE),0);
     Mixers[i].Dests[j].Line.cbStruct := sizeof(TMIXERLINE);
     Mixers[i].Dests[j].Line.dwDestination := j;
     if mixerGetLineInfo(Mixers[i].ID,@Mixers[i].Dests[j].Line,MIXER_GETLINEINFOF_DESTINATION or
                                     MIXER_OBJECTF_MIXER) <> MMSYSERR_NOERROR then
      Mixers[i].Dests[j].Line.cChannels := 0
     else if Mixers[i].Dests[j].Line.cControls > 0 then
      begin
       SetLength(Mixers[i].Dests[j].Ctrls,Mixers[i].Dests[j].Line.cControls);
       FillChar(Mixers[i].Dests[j].LCtrls,sizeof(TMIXERLINECONTROLS),0);
       Mixers[i].Dests[j].LCtrls.cbStruct := sizeof(TMIXERLINECONTROLS);
       Mixers[i].Dests[j].LCtrls.dwLineID := Mixers[i].Dests[j].Line.dwLineID;
       Mixers[i].Dests[j].LCtrls.cControls := Mixers[i].Dests[j].Line.cControls;
       Mixers[i].Dests[j].LCtrls.cbmxctrl := sizeof(TMIXERCONTROL);
       Mixers[i].Dests[j].LCtrls.pamxctrl := @Mixers[i].Dests[j].Ctrls[0];
       if mixerGetLineControls(Mixers[i].ID,@Mixers[i].Dests[j].LCtrls,
                        MIXER_GETLINECONTROLSF_ALL or
                        MIXER_OBJECTF_MIXER) <> MMSYSERR_NOERROR then
        Mixers[i].Dests[j].Line.cControls := 0
      end
    end
  end
 else
  Mixers[i].ID := - 1
 end
end;

procedure ReopenMixer;
begin
if SysVolumeParams.Opened then
 mixerClose(SysVolumeParams.MixerHandle);
if SysVolumeParams.MixerID <> -1 then
 SysVolumeParams.Opened := mixerOpen(@SysVolumeParams.MixerHandle,
        SysVolumeParams.MixerID,WHandle,0,CALLBACK_WINDOW) = MMSYSERR_NOERROR
end;

procedure GetSysVolume;
var
 MCD:TMIXERCONTROLDETAILS;
 MCDU:TMIXERCONTROLDETAILS_UNSIGNED;
begin
if SysVolumeParams.MixerID = -1 then exit;
FillChar(MCD,sizeof(TMIXERCONTROLDETAILS),0);
MCD.cbStruct := sizeof(TMIXERCONTROLDETAILS);
MCD.dwControlID := SysVolumeParams.ControlID;
MCD.cChannels := 1;
MCD.cbDetails := sizeof(TMIXERCONTROLDETAILS_UNSIGNED);
MCD.paDetails := @MCDU;
if mixerGetControlDetails(SysVolumeParams.MixerID,@MCD,
                               MIXER_GETCONTROLDETAILSF_VALUE or
                               MIXER_OBJECTF_MIXER) = MMSYSERR_NOERROR then
 SysVolumeParams.Pos := MCDU.dwValue
else
 SysVolumeParams.Pos := SysVolumeParams.Max;
if VolLinear then
 VolumeCtrl := round((SysVolumeParams.Pos - SysVolumeParams.Min) /
                    (SysVolumeParams.Max - SysVolumeParams.Min) * VolumeCtrlMax)
else
 VolumeCtrl := round(ln((SysVolumeParams.Pos - SysVolumeParams.Min) /
                        (SysVolumeParams.Max - SysVolumeParams.Min) + 1) /
                     ln(2) * VolumeCtrlMax);
RedrawVolume
end;

procedure SetSysVolume;
var
 MCD:TMIXERCONTROLDETAILS;
 MCDU:TMIXERCONTROLDETAILS_UNSIGNED;
begin
if SysVolumeParams.MixerID = -1 then exit;
if VolLinear then
 SysVolumeParams.Pos := SysVolumeParams.Min +
                       round(VolumeCtrl / VolumeCtrlMax *
                             (SysVolumeParams.Max - SysVolumeParams.Min))
else
 SysVolumeParams.Pos := SysVolumeParams.Min +
                        round((exp(VolumeCtrl / VolumeCtrlMax * ln(2)) - 1) *
                              (SysVolumeParams.Max - SysVolumeParams.Min));
MCDU.dwValue := SysVolumeParams.Pos;
FillChar(MCD,sizeof(TMIXERCONTROLDETAILS),0);
MCD.cbStruct := sizeof(TMIXERCONTROLDETAILS);
MCD.dwControlID := SysVolumeParams.ControlID;
MCD.cChannels := 1;
MCD.cbDetails := sizeof(TMIXERCONTROLDETAILS_UNSIGNED);
MCD.paDetails := @MCDU;
mixerSetControlDetails(SysVolumeParams.MixerID,@MCD,
                                        MIXER_SETCONTROLDETAILSF_VALUE or
                                        MIXER_OBJECTF_MIXER);
RedrawVolume
end;

function SelectMixerControl;
begin
Result := False;
if (DWORD(i) < DWORD(Length(Mixers))) and
   (DWORD(j) < DWORD(Length(Mixers[i].Dests))) and
   (DWORD(k) < DWORD(Length(Mixers[i].Dests[j].Ctrls))) then
 begin
  Result := True;
  SysVolumeParams.MixerNumber := i;
  SysVolumeParams.DestNumber := j;
  SysVolumeParams.CtrlNumber := k;
  SysVolumeParams.Title := Mixers[i].Caps.szPname + '->' +
                            Mixers[i].Dests[j].Line.szName + '->' +
                             Mixers[i].Dests[j].Ctrls[k].szName;
  SysVolumeParams.MixerID := Mixers[i].ID;
  SysVolumeParams.ControlID := Mixers[i].Dests[j].Ctrls[k].dwControlID;
  SysVolumeParams.Max := Mixers[i].Dests[j].Ctrls[k].Bounds.dwMaximum;
  SysVolumeParams.Min := Mixers[i].Dests[j].Ctrls[k].Bounds.dwMinimum;
  ReopenMixer;
  GetSysVolume;
//  Form2.Edit33.Text := SysVolumeParams.Title
 end
end;

function DetectVolumeCtrl2;

 function VSearch(CompType:DWORD):boolean;
 var
  i,j,k:integer;
 begin
 Result := False;
 for i := 0 to Length(Mixers) - 1 do
 if Mixers[i].ID <> -1 then
  for j := 0 to Mixers[i].Caps.cDestinations - 1 do
   if (Mixers[i].Dests[j].Line.cChannels > 0) and
      (Mixers[i].Dests[j].Line.dwComponentType = CompType) then
    for k := 0 to Mixers[i].Dests[j].Line.cControls - 1 do
     if Mixers[i].Dests[j].Ctrls[k].dwControlType =
                            MIXERCONTROL_CONTROLTYPE_VOLUME then
      begin
       Result := True;
       SelectMixerControl(Mixers,i,j,k);
       exit
      end
 end;

begin
Result := VSearch(MIXERLINE_COMPONENTTYPE_DST_SPEAKERS);
if Result then exit;
Result := VSearch(MIXERLINE_COMPONENTTYPE_DST_HEADPHONES);
if Result then exit;
Result := VSearch(MIXERLINE_COMPONENTTYPE_DST_LINE);
if Result then exit;
Result := VSearch(MIXERLINE_COMPONENTTYPE_DST_DIGITAL);
if Result then exit;
Result := VSearch(MIXERLINE_COMPONENTTYPE_DST_MONITOR);
if Result then exit;
Result := VSearch(MIXERLINE_COMPONENTTYPE_DST_TELEPHONE)
end;

function DetectVolumeCtrl;
var
 Mixers:TSysMixers;
begin
GetSystemMixers(Mixers);
Result := DetectVolumeCtrl2(Mixers)
end;

procedure SetMixer;
begin
Mixer_ChType := ChType;
Mixer_Index_AL := Index_AL; Mixer_Index_AR := Index_AR;
Mixer_Index_BL := Index_BL; Mixer_Index_BR := Index_BR;
Mixer_Index_CL := Index_CL; Mixer_Index_CR := Index_CR;
Mixer_AY_Freq := AY_Freq; Mixer_Interrupt_Freq := Interrupt_Freq;
Mixer_Stereo := NumberOfChannels;
SysVolumeParams.Title := 'Not selected';
SysVolumeParams.MixerNumber := -1;
SysVolumeParams.DestNumber := -1;
SysVolumeParams.CtrlNumber := -1;
SysVolumeParams.MixerID := -1;
SysVolumeParams.Opened := False;

//temporary (must get from settings)
DetectVolumeCtrl;

end;

end.
