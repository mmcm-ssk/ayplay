PT3Reader = function(buffer, fileName, noTS) {
    var data = new Uint8Array(buffer);

    function u16(off) { return data[off] | (data[off + 1] << 8); }
    function i16(off) { var v = u16(off); return v >= 0x8000 ? v - 0x10000 : v; }
    function i8(off)  { var v = data[off]; return v >= 0x80 ? v - 0x100 : v; }

    var version = 6;
    var vc = data[13];
    if (vc >= 0x30 && vc <= 0x39) version = vc - 0x30;

    var tonTableId = data[99];
    var delay      = data[100];
    var loopPos    = data[102];
    var patternsPtr = u16(103);

    var samPtrs = new Uint16Array(32);
    for (var i = 0; i < 32; i++) samPtrs[i] = u16(105 + i * 2);

    var ornPtrs = new Uint16Array(16);
    for (var i = 0; i < 16; i++) ornPtrs[i] = u16(169 + i * 2);

    var numPositions = 0;
    while (numPositions < data.length && data[201 + numPositions] !== 255) {
        numPositions++;
        if (numPositions > 255) { numPositions = 255; break; }
    }
    if (numPositions < 1) numPositions = 1;

    var CLOCK = 1750000;
    var FRAME_RATE = 50;

    var trackName = '', authorName = '';
    for (var i = 30; i < 62 && data[i]; i++) trackName += String.fromCharCode(data[i]);
    for (var i = 66; i < 98 && data[i]; i++) authorName += String.fromCharCode(data[i]);
    trackName = trackName.trim();
    authorName = authorName.trim();

    var PERIODS;
    switch (tonTableId) {
        case 0: PERIODS = version <= 3 ?
            [0xC21,0xB73,0xACE,0xA33,0x9A0,0x916,0x893,0x818,0x7A4,0x736,0x6CE,0x66D,0x610,0x5B9,0x567,0x519,0x4D0,0x48B,0x449,0x40C,0x3D2,0x39B,0x367,0x336,0x308,0x2DC,0x2B3,0x28C,0x268,0x245,0x224,0x206,0x1E9,0x1CD,0x1B3,0x19B,0x184,0x16E,0x159,0x146,0x134,0x122,0x112,0x103,0x0F4,0x0E6,0x0D9,0x0CD,0x0C2,0x0B7,0x0AC,0x0A3,0x09A,0x091,0x089,0x081,0x07A,0x073,0x06C,0x066,0x061,0x05B,0x056,0x051,0x04D,0x048,0x044,0x040,0x03D,0x039,0x036,0x033,0x030,0x02D,0x02B,0x028,0x026,0x024,0x022,0x020,0x01E,0x01C,0x01B,0x019,0x018,0x016,0x015,0x014,0x013,0x012,0x011,0x010,0x00F,0x00E,0x00D,0x00C] :
            [0xC22,0xB73,0xACF,0xA33,0x9A1,0x917,0x894,0x819,0x7A4,0x737,0x6CF,0x66D,0x611,0x5BA,0x567,0x51A,0x4D0,0x48B,0x44A,0x40C,0x3D2,0x39B,0x367,0x337,0x308,0x2DD,0x2B4,0x28D,0x268,0x246,0x225,0x206,0x1E9,0x1CE,0x1B4,0x19B,0x184,0x16E,0x15A,0x146,0x134,0x123,0x112,0x103,0x0F5,0x0E7,0x0DA,0x0CE,0x0C2,0x0B7,0x0AD,0x0A3,0x09A,0x091,0x089,0x082,0x07A,0x073,0x06D,0x067,0x061,0x05C,0x056,0x052,0x04D,0x049,0x045,0x041,0x03D,0x03A,0x036,0x033,0x031,0x02E,0x02B,0x029,0x027,0x024,0x022,0x020,0x01F,0x01D,0x01B,0x01A,0x018,0x017,0x016,0x014,0x013,0x012,0x011,0x010,0x00F,0x00E,0x00D,0x00C];
            break;
        case 1: PERIODS = [0xEF8,0xE10,0xD60,0xC80,0xBD8,0xB28,0xA88,0x9F0,0x960,0x8E0,0x858,0x7E0,0x77C,0x708,0x6B0,0x640,0x5EC,0x594,0x544,0x4F8,0x4B0,0x470,0x42C,0x3FD,0x3BE,0x384,0x358,0x320,0x2F6,0x2CA,0x2A2,0x27C,0x258,0x238,0x216,0x1F8,0x1DF,0x1C2,0x1AC,0x190,0x17B,0x165,0x151,0x13E,0x12C,0x11C,0x10A,0x0FC,0x0EF,0x0E1,0x0D6,0x0C8,0x0BD,0x0B2,0x0A8,0x09F,0x096,0x08E,0x085,0x07E,0x077,0x070,0x06B,0x064,0x05E,0x059,0x054,0x04F,0x04B,0x047,0x042,0x03F,0x03B,0x038,0x035,0x032,0x02F,0x02C,0x02A,0x027,0x025,0x023,0x021,0x01F,0x01D,0x01C,0x01A,0x019,0x017,0x016,0x015,0x013,0x012,0x011,0x010,0x00F];
            break;
        case 2: PERIODS = version <= 3 ?
            [0xD3E,0xC80,0xBCC,0xB22,0xA82,0x9EC,0x95C,0x8D6,0x858,0x7E0,0x76E,0x704,0x69F,0x640,0x5E6,0x591,0x541,0x4F6,0x4AE,0x46B,0x42C,0x3F0,0x3B7,0x382,0x34F,0x320,0x2F3,0x2C8,0x2A1,0x27B,0x257,0x236,0x216,0x1F8,0x1DC,0x1C1,0x1A8,0x190,0x179,0x164,0x150,0x13D,0x12C,0x11B,0x10B,0x0FC,0x0EE,0x0E0,0x0D4,0x0C8,0x0BD,0x0B2,0x0A8,0x09F,0x096,0x08D,0x085,0x07E,0x077,0x070,0x06A,0x064,0x05E,0x059,0x054,0x050,0x04B,0x047,0x043,0x03F,0x03C,0x038,0x035,0x032,0x02F,0x02D,0x02A,0x028,0x026,0x024,0x022,0x020,0x01E,0x01D,0x01B,0x01A,0x019,0x018,0x015,0x014,0x013,0x012,0x011,0x010,0x00F,0x00E] :
            [0xD10,0xC55,0xBA4,0xAFC,0xA5F,0x9CA,0x93D,0x8B8,0x83B,0x7C5,0x755,0x6EC,0x688,0x62A,0x5D2,0x57E,0x52F,0x4E5,0x49E,0x45C,0x41D,0x3E2,0x3AB,0x376,0x344,0x315,0x2E9,0x2BF,0x298,0x272,0x24F,0x22E,0x20F,0x1F1,0x1D5,0x1BB,0x1A2,0x18B,0x174,0x160,0x14C,0x139,0x128,0x117,0x107,0x0F9,0x0EB,0x0DD,0x0D1,0x0C5,0x0BA,0x0B0,0x0A6,0x09D,0x094,0x08C,0x084,0x07C,0x075,0x06F,0x069,0x063,0x05D,0x058,0x053,0x04E,0x04A,0x046,0x042,0x03E,0x03B,0x037,0x034,0x031,0x02F,0x02C,0x029,0x027,0x025,0x023,0x021,0x01F,0x01D,0x01C,0x01A,0x019,0x017,0x016,0x015,0x014,0x012,0x011,0x010,0x00F,0x00D];
            break;
        default: PERIODS = version <= 3 ?
            [0xCDA,0xC22,0xB73,0xACF,0xA33,0x9A1,0x917,0x894,0x819,0x7A4,0x737,0x6CF,0x66D,0x611,0x5BA,0x567,0x51A,0x4D0,0x48B,0x44A,0x40C,0x3D2,0x39B,0x367,0x337,0x308,0x2DD,0x2B4,0x28D,0x268,0x246,0x225,0x206,0x1E9,0x1CE,0x1B4,0x19B,0x184,0x16E,0x15A,0x146,0x134,0x123,0x113,0x103,0x0F5,0x0E7,0x0DA,0x0CE,0x0C2,0x0B7,0x0AD,0x0A3,0x09A,0x091,0x089,0x082,0x07A,0x073,0x06D,0x067,0x061,0x05C,0x056,0x052,0x04D,0x049,0x045,0x041,0x03D,0x03A,0x036,0x033,0x031,0x02E,0x02B,0x029,0x027,0x024,0x022,0x020,0x01F,0x01D,0x01B,0x01A,0x018,0x017,0x016,0x014,0x013,0x012,0x011,0x010,0x00F,0x00E,0x00D] :
            [0xCDA,0xC22,0xB73,0xACF,0xA33,0x9A1,0x917,0x894,0x819,0x7A4,0x737,0x6CF,0x66D,0x611,0x5BA,0x567,0x51A,0x4D0,0x48B,0x44A,0x40C,0x3D2,0x39B,0x367,0x337,0x308,0x2DD,0x2B4,0x28D,0x268,0x246,0x225,0x206,0x1E9,0x1CE,0x1B4,0x19B,0x184,0x16E,0x15A,0x146,0x134,0x123,0x112,0x103,0x0F5,0x0E7,0x0DA,0x0CE,0x0C2,0x0B7,0x0AD,0x0A3,0x09A,0x091,0x089,0x082,0x07A,0x073,0x06D,0x067,0x061,0x05C,0x056,0x052,0x04D,0x049,0x045,0x041,0x03D,0x03A,0x036,0x033,0x031,0x02E,0x02B,0x029,0x027,0x024,0x022,0x020,0x01F,0x01D,0x01B,0x01A,0x018,0x017,0x016,0x014,0x013,0x012,0x011,0x010,0x00F,0x00E,0x00D];
    }

    var VOLTBL = version <= 4 ?
        [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,1,1,1,1,1,2,2,2,2,2],[0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3],[0,0,0,0,1,1,1,2,2,2,3,3,3,4,4,4],[0,0,0,1,1,1,2,2,3,3,3,4,4,4,5,5],[0,0,0,1,1,2,2,3,3,3,4,4,5,5,6,6],[0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7],[0,0,1,1,2,2,3,3,4,5,5,6,6,7,7,8],[0,0,1,1,2,3,3,4,5,5,6,6,7,8,8,9],[0,0,1,2,2,3,4,4,5,6,6,7,8,8,9,10],[0,0,1,2,3,3,4,5,6,6,7,8,9,9,10,11],[0,0,1,2,3,4,4,5,6,7,8,8,9,11,11,12],[0,0,1,2,3,4,5,6,7,7,8,9,10,11,12,13],[0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]] :
        [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],[0,0,0,0,1,1,1,1,1,1,1,1,2,2,2,2],[0,0,0,1,1,1,1,1,2,2,2,2,2,3,3,3],[0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4],[0,0,1,1,1,2,2,2,3,3,3,4,4,4,5,5],[0,0,1,1,2,2,2,3,3,4,4,4,5,5,6,6],[0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7],[0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8],[0,1,1,2,2,3,4,4,5,5,6,7,7,8,8,9],[0,1,1,2,3,3,4,5,5,6,7,7,8,9,9,10],[0,1,1,2,3,4,4,5,6,7,7,8,9,10,10,11],[0,1,2,2,3,4,5,6,6,7,8,9,10,10,11,12],[0,1,2,3,3,4,5,6,7,8,9,10,10,11,12,13],[0,1,2,3,4,5,6,7,7,8,9,10,11,12,13,14],[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]];

    var loopFrameAt = 0;
    var hasLooped = false;
    var loopStartFrameAt = 0;
    var loopStartFound = false;

    var inst = {
        data: data, version: version, tonTableId: tonTableId,
        numPositions: numPositions, loopPosition: loopPos,
        patternsPointer: patternsPtr, delay: delay,
        samplePointers: samPtrs, ornamentPointers: ornPtrs,
        globalTickCounter: 0, looped: false,
        pt3: {
            Env_Base: 0, Cur_Env_Slide: 0, Env_Slide_Add: 0,
            Cur_Env_Delay: 0, Env_Delay: 0,
            Noise_Base: 0, Delay: delay, AddToNoise: 0,
            DelayCounter: 1, CurrentPosition: 0
        },
        channels: [
            { Address_In_Pattern: 0, OrnamentPointer: 0, SamplePointer: 0, Ton: 0,
              Loop_Ornament_Position: 0, Ornament_Length: 0, Position_In_Ornament: 0,
              Loop_Sample_Position: 0, Sample_Length: 0, Position_In_Sample: 0,
              Volume: 15, Number_Of_Notes_To_Skip: 0, Note: 0, Slide_To_Note: 0, Amplitude: 0,
              Envelope_Enabled: false, Enabled: false, SimpleGliss: false,
              Current_Amplitude_Sliding: 0, Current_Noise_Sliding: 0, Current_Envelope_Sliding: 0,
              Ton_Slide_Count: 0, Current_OnOff: 0, OnOff_Delay: 0, OffOn_Delay: 0,
              Ton_Slide_Delay: 0, Current_Ton_Sliding: 0, Ton_Accumulator: 0,
              Ton_Slide_Step: 0, Ton_Delta: 0, Note_Skip_Counter: 1 },
            { Address_In_Pattern: 0, OrnamentPointer: 0, SamplePointer: 0, Ton: 0,
              Loop_Ornament_Position: 0, Ornament_Length: 0, Position_In_Ornament: 0,
              Loop_Sample_Position: 0, Sample_Length: 0, Position_In_Sample: 0,
              Volume: 15, Number_Of_Notes_To_Skip: 0, Note: 0, Slide_To_Note: 0, Amplitude: 0,
              Envelope_Enabled: false, Enabled: false, SimpleGliss: false,
              Current_Amplitude_Sliding: 0, Current_Noise_Sliding: 0, Current_Envelope_Sliding: 0,
              Ton_Slide_Count: 0, Current_OnOff: 0, OnOff_Delay: 0, OffOn_Delay: 0,
              Ton_Slide_Delay: 0, Current_Ton_Sliding: 0, Ton_Accumulator: 0,
              Ton_Slide_Step: 0, Ton_Delta: 0, Note_Skip_Counter: 1 },
            { Address_In_Pattern: 0, OrnamentPointer: 0, SamplePointer: 0, Ton: 0,
              Loop_Ornament_Position: 0, Ornament_Length: 0, Position_In_Ornament: 0,
              Loop_Sample_Position: 0, Sample_Length: 0, Position_In_Sample: 0,
              Volume: 15, Number_Of_Notes_To_Skip: 0, Note: 0, Slide_To_Note: 0, Amplitude: 0,
              Envelope_Enabled: false, Enabled: false, SimpleGliss: false,
              Current_Amplitude_Sliding: 0, Current_Noise_Sliding: 0, Current_Envelope_Sliding: 0,
              Ton_Slide_Count: 0, Current_OnOff: 0, OnOff_Delay: 0, OffOn_Delay: 0,
              Ton_Slide_Delay: 0, Current_Ton_Sliding: 0, Ton_Accumulator: 0,
              Ton_Slide_Step: 0, Ton_Delta: 0, Note_Skip_Counter: 1 }
        ],
        ay: [0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    };

    var posIdx = data[201];
    for (var abc = 0; abc < 3; abc++) {
        var ch = inst.channels[abc];
        ch.Address_In_Pattern = u16(patternsPtr + (posIdx + abc) * 2);
        ch.OrnamentPointer = ornPtrs[0];
        ch.Loop_Ornament_Position = data[ch.OrnamentPointer++];
        ch.Ornament_Length = data[ch.OrnamentPointer++];
        ch.SamplePointer = samPtrs[1];
        ch.Loop_Sample_Position = data[ch.SamplePointer++];
        ch.Sample_Length = data[ch.SamplePointer++];
        ch.Volume = 15;
        ch.Note_Skip_Counter = 1;
        ch.Enabled = false;
        ch.Envelope_Enabled = false;
        ch.Note = 0;
        ch.Ton = 0;
    }

    var MAX_FRAMES = 360000;
    var estimatedFrames = numPositions > 0 ? numPositions * 64 * delay : 50;
    if (estimatedFrames < 50) estimatedFrames = 50;
    if (estimatedFrames > MAX_FRAMES) estimatedFrames = MAX_FRAMES;

    function getNoteFreq(j) {
        if (j < 0) j = 0;
        if (j > 95) j = 95;
        return PERIODS[j];
    }

    var TempMixer = 0, AddToEnv = 0;

    function patternInterpreter(chan) {
        var Flag1 = 0, Flag2 = 0, Flag3 = 0, Flag4 = 0, Flag5 = 0, Flag8 = 0, Flag9 = 0;
        var counter = 0, PrNote = chan.Note, PrSliding = chan.Current_Ton_Sliding;
        var quit = false;

        while (!quit) {
            var op = data[chan.Address_In_Pattern];

            if (op >= 0xF0) {
                chan.OrnamentPointer = ornPtrs[op - 0xF0];
                chan.Loop_Ornament_Position = data[chan.OrnamentPointer++];
                chan.Ornament_Length = data[chan.OrnamentPointer++];
                chan.Position_In_Ornament = 0;
                chan.Address_In_Pattern++;
                chan.SamplePointer = samPtrs[data[chan.Address_In_Pattern] >> 1];
                chan.Loop_Sample_Position = data[chan.SamplePointer++];
                chan.Sample_Length = data[chan.SamplePointer++];
                chan.Envelope_Enabled = false;
            } else if (op >= 0xD1) {
                chan.SamplePointer = samPtrs[op - 0xD0];
                chan.Loop_Sample_Position = data[chan.SamplePointer++];
                chan.Sample_Length = data[chan.SamplePointer++];
            } else if (op === 0xD0) {
                quit = true;
            } else if (op >= 0xC1) {
                chan.Volume = op - 0xC0;
            } else if (op === 0xC0) {
                chan.Position_In_Sample = 0;
                chan.Current_Amplitude_Sliding = 0;
                chan.Current_Noise_Sliding = 0;
                chan.Current_Envelope_Sliding = 0;
                chan.Position_In_Ornament = 0;
                chan.Ton_Slide_Count = 0;
                chan.Current_Ton_Sliding = 0;
                chan.Ton_Accumulator = 0;
                chan.Current_OnOff = 0;
                chan.Enabled = false;
                quit = true;
            } else if (op >= 0xB2) {
                chan.Envelope_Enabled = true;
                inst.ay[13] = op - 0xB1;
                chan.Address_In_Pattern++;
                var hi = data[chan.Address_In_Pattern];
                chan.Address_In_Pattern++;
                var lo = data[chan.Address_In_Pattern];
                inst.pt3.Env_Base = (hi << 8) | lo;
                chan.Position_In_Ornament = 0;
                inst.pt3.Cur_Env_Slide = 0;
                inst.pt3.Cur_Env_Delay = 0;
            } else if (op === 0xB1) {
                chan.Address_In_Pattern++;
                chan.Number_Of_Notes_To_Skip = data[chan.Address_In_Pattern];
            } else if (op === 0xB0) {
                chan.Envelope_Enabled = false;
                chan.Position_In_Ornament = 0;
            } else if (op >= 0x50) {
                chan.Note = op - 0x50;
                chan.Position_In_Sample = 0;
                chan.Current_Amplitude_Sliding = 0;
                chan.Current_Noise_Sliding = 0;
                chan.Current_Envelope_Sliding = 0;
                chan.Position_In_Ornament = 0;
                chan.Ton_Slide_Count = 0;
                chan.Current_Ton_Sliding = 0;
                chan.Ton_Accumulator = 0;
                chan.Current_OnOff = 0;
                chan.Enabled = true;
                quit = true;
            } else if (op >= 0x40) {
                chan.OrnamentPointer = ornPtrs[op - 0x40];
                chan.Loop_Ornament_Position = data[chan.OrnamentPointer++];
                chan.Ornament_Length = data[chan.OrnamentPointer++];
                chan.Position_In_Ornament = 0;
            } else if (op >= 0x20) {
                inst.pt3.Noise_Base = op - 0x20;
            } else if (op >= 0x11) {
                inst.ay[13] = op - 0x10;
                chan.Address_In_Pattern++;
                var hi = data[chan.Address_In_Pattern];
                chan.Address_In_Pattern++;
                var lo = data[chan.Address_In_Pattern];
                inst.pt3.Env_Base = (hi << 8) | lo;
                inst.pt3.Cur_Env_Slide = 0;
                inst.pt3.Cur_Env_Delay = 0;
                chan.Envelope_Enabled = true;
                chan.Address_In_Pattern++;
                chan.SamplePointer = samPtrs[data[chan.Address_In_Pattern] >> 1];
                chan.Loop_Sample_Position = data[chan.SamplePointer++];
                chan.Sample_Length = data[chan.SamplePointer++];
                chan.Position_In_Ornament = 0;
            } else if (op === 0x10) {
                chan.Envelope_Enabled = false;
                chan.Address_In_Pattern++;
                chan.SamplePointer = samPtrs[data[chan.Address_In_Pattern] >> 1];
                chan.Loop_Sample_Position = data[chan.SamplePointer++];
                chan.Sample_Length = data[chan.SamplePointer++];
                chan.Position_In_Ornament = 0;
            } else if (op === 9) { Flag9 = ++counter; }
            else if (op === 8) { Flag8 = ++counter; }
            else if (op === 5) { Flag5 = ++counter; }
            else if (op === 4) { Flag4 = ++counter; }
            else if (op === 3) { Flag3 = ++counter; }
            else if (op === 2) { Flag2 = ++counter; }
            else if (op === 1) { Flag1 = ++counter; }

            chan.Address_In_Pattern++;
        }

        while (counter > 0) {
            if (counter === Flag1) {
                chan.Ton_Slide_Delay = data[chan.Address_In_Pattern++];
                chan.Ton_Slide_Count = chan.Ton_Slide_Delay;
                chan.Ton_Slide_Step = i16(chan.Address_In_Pattern);
                chan.SimpleGliss = true;
                chan.Current_OnOff = 0;
                if (chan.Ton_Slide_Count === 0 && inst.version >= 7) chan.Ton_Slide_Count++;
                chan.Address_In_Pattern += 2;
            } else if (counter === Flag2) {
                chan.SimpleGliss = false;
                chan.Current_OnOff = 0;
                chan.Ton_Slide_Delay = data[chan.Address_In_Pattern++];
                chan.Ton_Slide_Count = chan.Ton_Slide_Delay;
                chan.Ton_Slide_Step = Math.abs(i16(chan.Address_In_Pattern + 2));
                chan.Ton_Delta = getNoteFreq(chan.Note) - getNoteFreq(PrNote);
                chan.Slide_To_Note = chan.Note;
                chan.Note = PrNote;
                if (inst.version >= 6) chan.Current_Ton_Sliding = PrSliding;
                if (chan.Ton_Delta - chan.Current_Ton_Sliding < 0) chan.Ton_Slide_Step = -chan.Ton_Slide_Step;
                chan.Address_In_Pattern += 4;
            } else if (counter === Flag3) {
                chan.Position_In_Sample = data[chan.Address_In_Pattern++];
            } else if (counter === Flag4) {
                chan.Position_In_Ornament = data[chan.Address_In_Pattern++];
            } else if (counter === Flag5) {
                chan.OnOff_Delay = data[chan.Address_In_Pattern++];
                chan.OffOn_Delay = data[chan.Address_In_Pattern++];
                chan.Current_OnOff = chan.OnOff_Delay;
                chan.Ton_Slide_Count = 0;
                chan.Current_Ton_Sliding = 0;
            } else if (counter === Flag8) {
                inst.pt3.Env_Delay = data[chan.Address_In_Pattern++];
                inst.pt3.Cur_Env_Delay = inst.pt3.Env_Delay;
                inst.pt3.Env_Slide_Add = i16(chan.Address_In_Pattern);
                chan.Address_In_Pattern += 2;
            } else if (counter === Flag9) {
                inst.pt3.Delay = data[chan.Address_In_Pattern++];
            }
            counter--;
        }
        chan.Note_Skip_Counter = chan.Number_Of_Notes_To_Skip;
    }

    function changeRegisters(chan) {
        if (chan.Enabled) {
            chan.Ton = u16(chan.SamplePointer + chan.Position_In_Sample * 4 + 2);
            chan.Ton += chan.Ton_Accumulator;
            var b0 = data[chan.SamplePointer + chan.Position_In_Sample * 4];
            var b1 = data[chan.SamplePointer + chan.Position_In_Sample * 4 + 1];
            if (b1 & 0x40) chan.Ton_Accumulator = chan.Ton;

            var j = chan.Note + i8(chan.OrnamentPointer + chan.Position_In_Ornament);
            if (j >= 128) j = 0;
            else if (j > 95) j = 95;
            if (j < 0) j = 0;
            var w = getNoteFreq(j);
            chan.Ton = (chan.Ton + chan.Current_Ton_Sliding + w) & 0xFFF;

            if (chan.Ton_Slide_Count > 0) {
                chan.Ton_Slide_Count--;
                if (chan.Ton_Slide_Count === 0) {
                    chan.Current_Ton_Sliding += chan.Ton_Slide_Step;
                    chan.Ton_Slide_Count = chan.Ton_Slide_Delay;
                    if (!chan.SimpleGliss) {
                        if ((chan.Ton_Slide_Step < 0 && chan.Current_Ton_Sliding <= chan.Ton_Delta) ||
                            (chan.Ton_Slide_Step >= 0 && chan.Current_Ton_Sliding >= chan.Ton_Delta)) {
                            chan.Note = chan.Slide_To_Note;
                            chan.Ton_Slide_Count = 0;
                            chan.Current_Ton_Sliding = 0;
                        }
                    }
                }
            }

            chan.Amplitude = b1 & 15;
            if (b0 & 0x80) {
                if (b0 & 0x40) {
                    if (chan.Current_Amplitude_Sliding < 15) chan.Current_Amplitude_Sliding++;
                } else {
                    if (chan.Current_Amplitude_Sliding > -15) chan.Current_Amplitude_Sliding--;
                }
            }
            chan.Amplitude += chan.Current_Amplitude_Sliding;
            if (chan.Amplitude >= 128) chan.Amplitude = 0;
            else if (chan.Amplitude > 15) chan.Amplitude = 15;
            if (chan.Amplitude < 0) chan.Amplitude = 0;
            chan.Amplitude = VOLTBL[chan.Volume][chan.Amplitude];

            if (!(b0 & 1) && chan.Envelope_Enabled) chan.Amplitude |= 0x10;

            if (b1 & 0x80) {
                var envAdd;
                if (b0 & 0x20) envAdd = ((b0 >> 1) | 0xF0) + chan.Current_Envelope_Sliding;
                else envAdd = ((b0 >> 1) & 0x0F) + chan.Current_Envelope_Sliding;
                if (b1 & 0x20) chan.Current_Envelope_Sliding = envAdd;
                AddToEnv += envAdd;
            } else {
                inst.pt3.AddToNoise = (b0 >> 1) + chan.Current_Noise_Sliding;
                if (b1 & 0x20) chan.Current_Noise_Sliding = inst.pt3.AddToNoise;
            }

            TempMixer = ((b1 >> 1) & 0x48) | TempMixer;
            chan.Position_In_Sample++;
            if (chan.Position_In_Sample >= chan.Sample_Length) chan.Position_In_Sample = chan.Loop_Sample_Position;
            chan.Position_In_Ornament++;
            if (chan.Position_In_Ornament >= chan.Ornament_Length) chan.Position_In_Ornament = chan.Loop_Ornament_Position;
        } else {
            chan.Amplitude = 0;
        }
        TempMixer >>= 1;

        if (chan.Current_OnOff > 0) {
            chan.Current_OnOff--;
            if (chan.Current_OnOff === 0) {
                chan.Enabled = !chan.Enabled;
                if (chan.Enabled) chan.Current_OnOff = chan.OnOff_Delay;
                else chan.Current_OnOff = chan.OffOn_Delay;
            }
        }
    }

    function playTick() {
        inst.ay[13] = 0xFF;
        inst.pt3.DelayCounter--;

        if (inst.pt3.DelayCounter === 0) {
            inst.channels[0].Note_Skip_Counter--;
            if (inst.channels[0].Note_Skip_Counter === 0) {
                if (data[inst.channels[0].Address_In_Pattern] === 0) {
                    inst.pt3.CurrentPosition++;
                    if (inst.pt3.CurrentPosition >= inst.numPositions) {
                        inst.pt3.CurrentPosition = inst.loopPosition < inst.numPositions ? inst.loopPosition : 0;
                        inst.looped = true;
                        if (!hasLooped) {
                            hasLooped = true;
                            loopFrameAt = inst.globalTickCounter;
                        }
                    }
                    var pi = data[201 + inst.pt3.CurrentPosition];
                    for (var abc = 0; abc < 3; abc++) {
                        inst.channels[abc].Address_In_Pattern = u16(inst.patternsPointer + (pi + abc) * 2);
                    }
                    inst.pt3.Noise_Base = 0;
                }
                if (!loopStartFound && inst.pt3.CurrentPosition === inst.loopPosition) {
                    loopStartFound = true;
                    loopStartFrameAt = inst.globalTickCounter;
                }
                patternInterpreter(inst.channels[0]);
            }
            for (var abc = 1; abc < 3; abc++) {
                inst.channels[abc].Note_Skip_Counter--;
                if (inst.channels[abc].Note_Skip_Counter === 0) {
                    patternInterpreter(inst.channels[abc]);
                }
            }
            inst.pt3.DelayCounter = inst.pt3.Delay;
        }

        AddToEnv = 0;
        TempMixer = 0;
        changeRegisters(inst.channels[0]);
        changeRegisters(inst.channels[1]);
        changeRegisters(inst.channels[2]);

        inst.ay[0] = inst.channels[0].Ton & 0xFF;
        inst.ay[1] = (inst.channels[0].Ton >> 8) & 0xFF;
        inst.ay[2] = inst.channels[1].Ton & 0xFF;
        inst.ay[3] = (inst.channels[1].Ton >> 8) & 0xFF;
        inst.ay[4] = inst.channels[2].Ton & 0xFF;
        inst.ay[5] = (inst.channels[2].Ton >> 8) & 0xFF;
        inst.ay[6] = (inst.pt3.Noise_Base + inst.pt3.AddToNoise) & 0x1F;
        inst.ay[7] = TempMixer;
        inst.ay[8] = inst.channels[0].Amplitude;
        inst.ay[9] = inst.channels[1].Amplitude;
        inst.ay[10] = inst.channels[2].Amplitude;
        var env = (inst.pt3.Env_Base + AddToEnv + inst.pt3.Cur_Env_Slide) & 0xFFFF;
        inst.ay[11] = env & 0xFF;
        inst.ay[12] = (env >> 8) & 0xFF;

        if (inst.pt3.Cur_Env_Delay > 0) {
            inst.pt3.Cur_Env_Delay--;
            if (inst.pt3.Cur_Env_Delay === 0) {
                inst.pt3.Cur_Env_Delay = inst.pt3.Env_Delay;
                inst.pt3.Cur_Env_Slide += inst.pt3.Env_Slide_Add;
            }
        }
        inst.globalTickCounter++;
    }

    function findTSTail() {
        if (data.length < 22) return null;
        var tagOffset = data.length - 22;
        function tagStr(off, len) {
            var s = '';
            for (var i = 0; i < len; i++) s += String.fromCharCode(data[tagOffset + off + i]);
            return s;
        }
        var tsid = tagStr(18, 4);
        if (tsid === '02TS') {
            var size1 = u16(tagOffset + 10);
            var size2 = u16(tagOffset + 16);
            if (size1 + size2 + 16 === data.length && size1 > 100 && size2 > 6) {
                return { offset: size1, chipBOffset: size1, chipBSize: size2 };
            }
        } else if (tsid === '03TS') {
            var size0 = u16(tagOffset + 4);
            var size1 = u16(tagOffset + 10);
            var size2 = u16(tagOffset + 16);
            if (size0 + size1 + size2 + 22 === data.length && size0 > 0 && size1 > 0) {
                return { offset: size0, chipBOffset: size0, chipBSize: size1, chipCOffset: size0 + size1, chipCSize: size2 };
            }
        }
        return null;
    }

    if (!noTS) {
        var tail = findTSTail();
        // Fallback: search for PT3! and 02TS/03TS markers in last 200 bytes
        if (!tail) {
            for (var si = 1; si < 200 && si + 16 < data.length; si++) {
                var off = data.length - si - 16;
                if (off < 0) break;
                if (data[off + 16] === 0x30 && data[off + 17] === 0x32 && data[off + 18] === 0x54 && data[off + 19] === 0x53) {
                    var tsCap = tagStr(16, 4);
                    if (tsCap === '02TS') {
                        var s1 = u16(off + 10);
                        var s2 = u16(off + 16);
                        if (s1 + s2 + 16 === data.length && s1 > 100 && s2 > 6) {
                            tail = { offset: s1, chipBOffset: s1, chipBSize: s2 };
                            break;
                        }
                    }
                } else if (data[off + 16] === 0x30 && data[off + 17] === 0x33 && data[off + 18] === 0x54 && data[off + 19] === 0x53) {
                    var tsCap = tagStr(16, 4);
                    if (tsCap === '03TS') {
                        var sz0 = u16(off + 4);
                        var sz1 = u16(off + 10);
                        var sz2 = u16(off + 16);
                        if (sz0 + sz1 + sz2 + 22 === data.length && sz0 > 0 && sz1 > 0) {
                            tail = { offset: sz0, chipBOffset: sz0, chipBSize: sz1, chipCOffset: sz0 + sz1, chipCSize: sz2 };
                            break;
                        }
                    }
                }
            }
        }
        if (tail) {
            var chipA = new PT3Reader(buffer.slice(0, tail.offset), (fileName || '') + ':A', true);
            var chipB = new PT3Reader(buffer.slice(tail.chipBOffset, tail.chipBOffset + tail.chipBSize), (fileName || '') + ':B', true);
            if (tail.chipCSize) {
                var chipC = new PT3Reader(buffer.slice(tail.chipCOffset, tail.chipCOffset + tail.chipCSize), (fileName || '') + ':C', true);
                this.getNextFrame = function() {
                    var rA = chipA.getNextFrame();
                    var rB = chipB.getNextFrame();
                    var rC = chipC.getNextFrame();
                    return [rA[0], rB[0], rC[0], rA[3] || rB[3] || rC[3]];
                };
                this.getNumChips = function() { return 3; };
                this.setProgress = function(k) { chipA.setProgress(k); chipB.setProgress(k); chipC.setProgress(k); };
            } else {
                this.getNextFrame = function() {
                    var rA = chipA.getNextFrame();
                    var rB = chipB.getNextFrame();
                    return [rA[0], rB[0], [], rA[3] || rB[3]];
                };
                this.getNumChips = function() { return 2; };
                this.setProgress = function(k) { chipA.setProgress(k); chipB.setProgress(k); };
            }
            this.getFrameCount = function() { return chipA.getFrameCount(); };
            this.getLoopFrame  = function() { return chipA.getLoopFrame(); };
            this.getLoopStartFrame = function() { return chipA.getLoopStartFrame(); };
            this.computeLoopFrame = function() { return chipA.computeLoopFrame(); };
            this.reset = function() { chipA.reset(); chipB.reset(); if (chipC) chipC.reset(); };
            this.getNumPositions = function() { return chipA.getNumPositions(); };
            this.getLoopPos = function() { return chipA.getLoopPos(); };
            this.getDelay = function() { return chipA.getDelay(); };
            this.getClockRate  = function() { return chipA.getClockRate(); };
            this.getFrameRate  = function() { return chipA.getFrameRate(); };
            this.getTrackFileName = function() { return chipA.getTrackFileName(); };
            this.getTrackName  = function() { return chipA.getTrackName(); };
            this.getAuthorName = function() { return chipA.getAuthorName(); };
            this.getTurbo      = function() { return true; };
            this.getProgress   = function() { return chipA.getProgress(); };
            this.loopsContinuously = true;
            return;
        }
    }

    this.getFrameCount = function() { return estimatedFrames; };
    this.getLoopFrame  = function() {
        return loopFrameAt;
    };
    this.getLoopStartFrame = function() { return loopStartFound ? loopStartFrameAt : -1; };
    this.reset = function() { initState(); };
    this.computeLoopFrame = function() {
        initState();
        for (var i = 0; i < estimatedFrames; i++) {
            var r = this.getNextFrame();
            if (r[r.length - 1]) {
                var lf = i;
                initState();
                return lf;
            }
        }
        initState();
        return 0;
    };
    this.getNumPositions = function() { return numPositions; };
    this.getLoopPos = function() { return loopPos; };
    this.getDelay = function() { return delay; };
    this.getClockRate  = function() { return CLOCK; };
    this.getFrameRate  = function() { return FRAME_RATE; };
    this.getTrackFileName = function() { return fileName || ''; };
    this.getTrackName  = function() { return trackName; };
    this.getAuthorName = function() { return authorName; };
    this.getTurbo      = function() { return false; };

    function initState() {
        inst.pt3.DelayCounter = 1;
        inst.pt3.Delay = delay;
        inst.pt3.Noise_Base = 0;
        inst.pt3.AddToNoise = 0;
        inst.pt3.Cur_Env_Slide = 0;
        inst.pt3.Cur_Env_Delay = 0;
        inst.pt3.Env_Base = 0;
        inst.pt3.CurrentPosition = 0;
        inst.globalTickCounter = 0;
        inst.looped = false;
        hasLooped = false;
        loopFrameAt = 0;
        loopStartFrameAt = 0;
        loopStartFound = inst.loopPosition === 0;

        var pi = data[201];
        for (var abc = 0; abc < 3; abc++) {
            var ch = inst.channels[abc];
            ch.Address_In_Pattern = u16(inst.patternsPointer + (pi + abc) * 2);
            ch.OrnamentPointer = ornPtrs[0];
            ch.Loop_Ornament_Position = data[ch.OrnamentPointer];
            ch.OrnamentPointer++;
            ch.Ornament_Length = data[ch.OrnamentPointer];
            ch.OrnamentPointer++;
            ch.SamplePointer = samPtrs[1];
            ch.Loop_Sample_Position = data[ch.SamplePointer];
            ch.SamplePointer++;
            ch.Sample_Length = data[ch.SamplePointer];
            ch.SamplePointer++;
            ch.Volume = 15;
            ch.Note_Skip_Counter = 1;
            ch.Enabled = false;
            ch.Envelope_Enabled = false;
            ch.Note = 0;
            ch.Ton = 0;
            ch.Current_Amplitude_Sliding = 0;
            ch.Current_Noise_Sliding = 0;
            ch.Current_Envelope_Sliding = 0;
            ch.Ton_Slide_Count = 0;
            ch.Current_Ton_Sliding = 0;
            ch.Ton_Accumulator = 0;
            ch.Current_OnOff = 0;
            ch.Position_In_Sample = 0;
            ch.Position_In_Ornament = 0;
        }
    }

    this.setProgress = function(k) {
        if (k < 0) k = 0; if (k > 1) k = 1;
        var saved = Math.floor(k * estimatedFrames);
        if (Math.abs(inst.globalTickCounter - saved) <= 1) return;
        initState();
        hasLooped = false;
        for (var i = 0; i < saved; i++) {
            this.getNextFrame();
            if (inst.looped) {
                inst.looped = false;
                inst.pt3.CurrentPosition = inst.loopPosition < inst.numPositions ? inst.loopPosition : 0;
            }
        }
    };

    this.getNextFrame = function() {
        playTick();
        var done = inst.looped;
        if (done) inst.looped = false;
        var regs = inst.ay.slice();
        return [regs, [], [], done];
    };
    this.loopsContinuously = true;
};
if (typeof module !== 'undefined' && module.exports) { module.exports = {PT3: PT3Reader}; }
