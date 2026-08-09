/*
  YM2203 (OPN) emulation core.

  Faithful JavaScript port of ZXTune src/devices/fm/Ym2203_Emu.cpp
  (originally extracted/adapted from MAME by Shiru;
   MAME fmopn (C) 2001-2003 Jarek Burczynski, 1998 Tatsuyuki Satoh).

  API (mirrors the C core):
    new OPN(clock, rate)          -- create a chip, clock in Hz, rate in Hz
    opn.writeReg(reg, val)        -- write one register
    opn.updateOne(buffer, length) -- render `length` samples, ADD into buffer[i]
    opn.reset()                   -- full chip reset
    opn.getState()                -- [{attenuation, period}, ...] per channel (0..2)

  Register stream notes (from ZXTune TFM player):
    - writeReg uses chip-local register numbering; channels 0..2 map to regs
      0x28/0xA0..0xB6 exactly as a single YM2203.
    - FM clock used by ZXTune for TFC: 3500000 Hz, default prescaler 72.
*/
(function() {
  'use strict';

  const FREQ_SH = 16;
  const EG_SH = 16;
  const TIMER_SH = 16;

  const FREQ_MASK = (1 << FREQ_SH) - 1;

  const ENV_BITS = 10;
  const ENV_LEN = 1 << ENV_BITS;
  const ENV_STEP = 128.0 / ENV_LEN;

  const MAX_ATT_INDEX = ENV_LEN - 1; /* 1023 */
  const MIN_ATT_INDEX = 0;

  const EG_ATT = 4;
  const EG_DEC = 3;
  const EG_SUS = 2;
  const EG_REL = 1;
  const EG_OFF = 0;

  const SIN_BITS = 10;
  const SIN_LEN = 1 << SIN_BITS;
  const SIN_MASK = SIN_LEN - 1;

  const TL_RES_LEN = 256;
  const TL_TAB_LEN = 13 * 2 * TL_RES_LEN;
  const ENV_QUIET = TL_TAB_LEN >> 3;

  const RATE_STEPS = 8;

  const SSGEG_SCALE = 4;

  /* sustain level table (3dB per step), db*32 */
  const sl_table = [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 992];

  /* eg_inc: 19 rates * 8 steps */
  const eg_inc = [
    0, 1, 0, 1, 0, 1, 0, 1,
    0, 1, 0, 1, 1, 1, 0, 1,
    0, 1, 1, 1, 0, 1, 1, 1,
    0, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 2, 1, 1, 1, 2,
    1, 2, 1, 2, 1, 2, 1, 2,
    1, 2, 2, 2, 1, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 4, 2, 2, 2, 4,
    2, 4, 2, 4, 2, 4, 2, 4,
    2, 4, 4, 4, 2, 4, 4, 4,
    4, 4, 4, 4, 4, 4, 4, 4,
    4, 4, 4, 8, 4, 4, 4, 8,
    4, 8, 4, 8, 4, 8, 4, 8,
    4, 8, 8, 8, 4, 8, 8, 8,
    8, 8, 8, 8, 8, 8, 8, 8,
    16, 16, 16, 16, 16, 16, 16, 16,
    0, 0, 0, 0, 0, 0, 0, 0
  ];

  /* eg_rate_select[128] and eg_rate_shift[128] */
  const eg_rate_select = new Uint8Array(128);
  const eg_rate_shift = new Uint8Array(128);
  (function buildRateTables() {
    for (let i = 0; i < 32; i++) eg_rate_select[i] = 18 * RATE_STEPS;
    const pat = [0, 1, 2, 3];
    for (let r = 0; r < 12; r++) {
      for (let j = 0; j < 4; j++) eg_rate_select[32 + r * 4 + j] = pat[j] * RATE_STEPS;
    }
    const rateRows = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    for (let k = 0; k < 12; k++) eg_rate_select[80 + k] = rateRows[k] * RATE_STEPS;
    for (let i = 92; i < 128; i++) eg_rate_select[i] = 16 * RATE_STEPS;

    for (let i = 0; i < 32; i++) eg_rate_shift[i] = 0;
    const sh = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    for (let r = 0; r < 12; r++) {
      for (let j = 0; j < 4; j++) eg_rate_shift[32 + r * 4 + j] = sh[r];
    }
    for (let i = 80; i < 128; i++) eg_rate_shift[i] = 0;
  })();

  /* detune tables, 10.10 fixed point (4 * 32) */
  const DT_BASE = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 8, 8, 8, 8],
    [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 8, 8, 9, 10, 11, 12, 13, 14, 16, 16, 16, 16],
    [2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 8, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 20, 22, 22, 22, 22]
  ];

  /* fnum higher 4bit -> keycode lower 2bit */
  const opn_fktable = [0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3];

  /* shared tables (contextless), initialized once */
  let tl_tab = null;
  let sin_tab = null;
  let tablesReady = false;

  function initTables() {
    if (tablesReady) return;
    tablesReady = true;
    tl_tab = new Int32Array(TL_TAB_LEN);
    sin_tab = new Uint32Array(SIN_LEN);

    for (let x = 0; x < TL_RES_LEN; x++) {
      let m = (1 << 16) / Math.pow(2.0, (x + 1) * (ENV_STEP / 4.0) / 8.0);
      m = Math.floor(m);
      let n = m;               /* 16 bits here */
      n = n >> 4;              /* 12 bits here */
      if (n & 1) n = (n >> 1) + 1; else n = n >> 1;   /* round to nearest */
      n = n << 2;              /* 13 bits here (as in real chip) */
      tl_tab[x * 2 + 0] = n;
      tl_tab[x * 2 + 1] = -n;
      for (let i = 1; i < 13; i++) {
        tl_tab[x * 2 + i * 2 * TL_RES_LEN] = tl_tab[x * 2] >> i;
        tl_tab[x * 2 + 1 + i * 2 * TL_RES_LEN] = -tl_tab[x * 2 + i * 2 * TL_RES_LEN];
      }
    }

    for (let i = 0; i < SIN_LEN; i++) {
      const m = Math.sin(((i * 2) + 1) * Math.PI / SIN_LEN);
      let o = (m > 0.0) ? 8 * Math.log(1.0 / m) / Math.log(2.0) : 8 * Math.log(-1.0 / m) / Math.log(2.0);
      o = o / (ENV_STEP / 4);
      let n = Math.trunc(2.0 * o);
      if (n & 1) n = (n >> 1) + 1; else n = n >> 1;
      sin_tab[i] = n * 2 + (m >= 0.0 ? 0 : 1);
    }
  }

  /* --- operator math --- */

  function opCalc(phase, env, pm) {
    const hi = phase & 0xFFFF0000;
    const p = (env << 3) + sin_tab[((hi + (pm << 15)) | 0) >> 16 & SIN_MASK];
    return p >= TL_TAB_LEN ? 0 : tl_tab[p];
  }

  function opCalc1(phase, env, pm) {
    const hi = phase & 0xFFFF0000;
    const p = (env << 3) + sin_tab[((hi + pm) | 0) >> 16 & SIN_MASK];
    return p >= TL_TAB_LEN ? 0 : tl_tab[p];
  }

  /* --- helpers to set register values --- */

  function setDetMul(ST, CH, SLOT, v) {
    SLOT.mul = (v & 0x0f) ? (v & 0x0f) * 2 : 1;
    SLOT.DT = ST.dt_tab[(v >> 4) & 7];
    CH.SLOT[0].Incr = -1;
  }

  function setTl(SLOT, v) {
    SLOT.tl = (v & 0x7f) << (ENV_BITS - 7);
  }

  function setArKsr(CH, SLOT, v) {
    const oldKSR = SLOT.KSR;
    SLOT.ar = (v & 0x1f) ? 32 + ((v & 0x1f) << 1) : 0;
    SLOT.KSR = 3 - (v >> 6);
    if (SLOT.KSR !== oldKSR) {
      CH.SLOT[0].Incr = -1;
    } else {
      if ((SLOT.ar + SLOT.ksr) < 32 + 62) {
        SLOT.eg_sh_ar = eg_rate_shift[SLOT.ar + SLOT.ksr];
        SLOT.eg_sel_ar = eg_rate_select[SLOT.ar + SLOT.ksr];
      } else {
        SLOT.eg_sh_ar = 0;
        SLOT.eg_sel_ar = 17 * RATE_STEPS;
      }
    }
  }

  function setDr(SLOT, v) {
    SLOT.d1r = (v & 0x1f) ? 32 + ((v & 0x1f) << 1) : 0;
    SLOT.eg_sh_d1r = eg_rate_shift[SLOT.d1r + SLOT.ksr];
    SLOT.eg_sel_d1r = eg_rate_select[SLOT.d1r + SLOT.ksr];
  }

  function setSr(SLOT, v) {
    SLOT.d2r = (v & 0x1f) ? 32 + ((v & 0x1f) << 1) : 0;
    SLOT.eg_sh_d2r = eg_rate_shift[SLOT.d2r + SLOT.ksr];
    SLOT.eg_sel_d2r = eg_rate_select[SLOT.d2r + SLOT.ksr];
  }

  function setSlRr(SLOT, v) {
    SLOT.sl = sl_table[v >> 4];
    SLOT.rr = 34 + ((v & 0x0f) << 2);
    SLOT.eg_sh_rr = eg_rate_shift[SLOT.rr + SLOT.ksr];
    SLOT.eg_sel_rr = eg_rate_select[SLOT.rr + SLOT.ksr];
  }

  /* --- envelope generator --- */

  function advanceEGChannel(OPN, slots) {
    const eg_cnt = OPN.eg_cnt;
    let swap_flag = 0;
    for (let i = 0; i < 4; i++) {
      const SLOT = slots[i];
      switch (SLOT.state) {
        case EG_ATT:
          if (!(eg_cnt & ((1 << SLOT.eg_sh_ar) - 1))) {
            SLOT.volume += ((~SLOT.volume * eg_inc[SLOT.eg_sel_ar + ((eg_cnt >> SLOT.eg_sh_ar) & 7)]) >> 4);
            if (SLOT.volume <= MIN_ATT_INDEX) {
              SLOT.volume = MIN_ATT_INDEX;
              SLOT.state = EG_DEC;
            }
          }
          break;
        case EG_DEC:
          if (!(eg_cnt & ((1 << SLOT.eg_sh_d1r) - 1))) {
            if (SLOT.ssg & 0x08) {
              SLOT.volume += SSGEG_SCALE * eg_inc[SLOT.eg_sel_d1r + ((eg_cnt >> SLOT.eg_sh_d1r) & 7)];
              if (SLOT.volume >= SLOT.sl) SLOT.state = EG_SUS;
            } else {
              SLOT.volume += eg_inc[SLOT.eg_sel_d1r + ((eg_cnt >> SLOT.eg_sh_d1r) & 7)];
              if (SLOT.volume >= SLOT.sl) SLOT.state = EG_SUS;
            }
          }
          break;
        case EG_SUS:
          if (!(eg_cnt & ((1 << SLOT.eg_sh_d2r) - 1))) {
            if (SLOT.ssg & 0x08) {
              SLOT.volume += SSGEG_SCALE * eg_inc[SLOT.eg_sel_d2r + ((eg_cnt >> SLOT.eg_sh_d2r) & 7)];
              if (SLOT.volume >= 512) {
                SLOT.volume = MAX_ATT_INDEX;
                if (SLOT.ssg & 0x01) {
                  if (!(SLOT.ssgn & 1)) swap_flag = (SLOT.ssg & 0x02) | 1;
                } else {
                  SLOT.phase = 0;
                  SLOT.volume = 511;
                  SLOT.state = EG_ATT;
                  swap_flag = (SLOT.ssg & 0x02);
                }
              }
            } else {
              SLOT.volume += eg_inc[SLOT.eg_sel_d2r + ((eg_cnt >> SLOT.eg_sh_d2r) & 7)];
              if (SLOT.volume >= MAX_ATT_INDEX) {
                SLOT.volume = MAX_ATT_INDEX;
              }
            }
          }
          break;
        case EG_REL:
          if (!(eg_cnt & ((1 << SLOT.eg_sh_rr) - 1))) {
            SLOT.volume += eg_inc[SLOT.eg_sel_rr + ((eg_cnt >> SLOT.eg_sh_rr) & 7)];
            if (SLOT.volume >= MAX_ATT_INDEX) {
              SLOT.volume = MAX_ATT_INDEX;
              SLOT.state = EG_OFF;
            }
          }
          break;
      }

      let out = SLOT.tl + SLOT.volume;
      if ((SLOT.ssg & 0x08) && (SLOT.ssgn & 2) && (SLOT.state !== EG_OFF)) out ^= 511;
      SLOT.vol_out = out;
      SLOT.ssgn ^= swap_flag;
    }
  }

  /* --- channel calculation --- */

  const ALGO_CON = [
    { con1: 0, con2: 1, con3: 3, memCon: 2 },  /* algo 0: M1-C1-MEM-M2-C2-OUT */
    { con1: 1, con2: 1, con3: 3, memCon: 2 },  /* algo 1 */
    { con1: 3, con2: 1, con3: 3, memCon: 2 },  /* algo 2 */
    { con1: 2, con2: 3, con3: 2, memCon: 3 },  /* algo 3 */
    { con1: 0, con2: 4, con3: 3, memCon: 1 },  /* algo 4 */
    { con1: -1, con2: 4, con3: 4, memCon: 2 }, /* algo 5 (connect1 = NULL mark) */
    { con1: 0, con2: 4, con3: 4, memCon: 1 },  /* algo 6 */
    { con1: 4, con2: 4, con3: 4, memCon: 1 }   /* algo 7 */
  ];

  /* connection target codes: 0=c1, 1=mem, 2=m2, 3=c2, 4=out_fm[ch] */
  function addTo(state, code, outIdx, v) {
    switch (code) {
      case 0: state.c1 += v; break;
      case 1: state.mem += v; break;
      case 2: state.m2 += v; break;
      case 3: state.c2 += v; break;
      default: state.out_fm[outIdx] += v; break;
    }
  }

  function chanCalc(state, CH) {
    state.m2 = 0;
    state.c1 = 0;
    state.c2 = 0;
    state.mem = 0;

    const memCon = CH.memCon;
    if (memCon === 0) state.c1 = CH.mem_value;
    else if (memCon === 1) state.mem = CH.mem_value;
    else if (memCon === 2) state.m2 = CH.mem_value;
    else state.c2 = CH.mem_value;

    let eg_out = CH.SLOT[0].vol_out;
    {
      let out = CH.op1_out[0] + CH.op1_out[1];
      CH.op1_out[0] = CH.op1_out[1];
      if (CH.con1 < 0) {
        state.mem = CH.op1_out[0];
        state.c1 = CH.op1_out[0];
        state.c2 = CH.op1_out[0];
      } else {
        addTo(state, CH.con1, CH.outIdx, CH.op1_out[0]);
      }
      CH.op1_out[1] = 0;
      if (eg_out < ENV_QUIET) {
        if (!CH.FB) out = 0;
        CH.op1_out[1] = opCalc1(CH.SLOT[0].phase, eg_out, out << CH.FB);
      }
    }

    eg_out = CH.SLOT[1].vol_out;
    if (eg_out < ENV_QUIET) addTo(state, CH.con3, CH.outIdx, opCalc(CH.SLOT[1].phase, eg_out, state.m2));

    eg_out = CH.SLOT[2].vol_out;
    if (eg_out < ENV_QUIET) addTo(state, CH.con2, CH.outIdx, opCalc(CH.SLOT[2].phase, eg_out, state.c1));

    eg_out = CH.SLOT[3].vol_out;
    if (eg_out < ENV_QUIET) addTo(state, CH.con4, CH.outIdx, opCalc(CH.SLOT[3].phase, eg_out, state.c2));

    CH.mem_value = state.mem;

    CH.SLOT[0].phase = (CH.SLOT[0].phase + CH.SLOT[0].Incr) >>> 0;
    CH.SLOT[1].phase = (CH.SLOT[1].phase + CH.SLOT[1].Incr) >>> 0;
    CH.SLOT[2].phase = (CH.SLOT[2].phase + CH.SLOT[2].Incr) >>> 0;
    CH.SLOT[3].phase = (CH.SLOT[3].phase + CH.SLOT[3].Incr) >>> 0;
  }

  /* --- phase / envelope rate refresh --- */

  function refreshFcEgSlot(SLOT, fc, kc) {
    SLOT.Incr = (((fc + SLOT.DT[kc]) * SLOT.mul) >>> 1) >>> 0;
    const ksr = kc >> SLOT.KSR;
    if (SLOT.ksr !== ksr) {
      SLOT.ksr = ksr;
      if ((SLOT.ar + SLOT.ksr) < 32 + 62) {
        SLOT.eg_sh_ar = eg_rate_shift[SLOT.ar + SLOT.ksr];
        SLOT.eg_sel_ar = eg_rate_select[SLOT.ar + SLOT.ksr];
      } else {
        SLOT.eg_sh_ar = 0;
        SLOT.eg_sel_ar = 17 * RATE_STEPS;
      }
      SLOT.eg_sh_d1r = eg_rate_shift[SLOT.d1r + SLOT.ksr];
      SLOT.eg_sel_d1r = eg_rate_select[SLOT.d1r + SLOT.ksr];
      SLOT.eg_sh_d2r = eg_rate_shift[SLOT.d2r + SLOT.ksr];
      SLOT.eg_sel_d2r = eg_rate_select[SLOT.d2r + SLOT.ksr];
      SLOT.eg_sh_rr = eg_rate_shift[SLOT.rr + SLOT.ksr];
      SLOT.eg_sel_rr = eg_rate_select[SLOT.rr + SLOT.ksr];
    }
  }

  function refreshFcEgChan(CH) {
    if (CH.SLOT[0].Incr === -1) {
      const fc = CH.fc;
      const kc = CH.kcode;
      refreshFcEgSlot(CH.SLOT[0], fc, kc);
      refreshFcEgSlot(CH.SLOT[1], fc, kc);
      refreshFcEgSlot(CH.SLOT[2], fc, kc);
      refreshFcEgSlot(CH.SLOT[3], fc, kc);
    }
  }

  /* --- timetables --- */

  function initTimetables(ST) {
    for (let d = 0; d <= 3; d++) {
      for (let i = 0; i <= 31; i++) {
        const rate = DT_BASE[d * 32 + i] * SIN_LEN * ST.freqbase * (1 << FREQ_SH) / (1 << 20);
        ST.dt_tab[d][i] = Math.trunc(rate);
        ST.dt_tab[d + 4][i] = -ST.dt_tab[d][i];
      }
    }
  }

  function opnSetPres(OPN, pres) {
    OPN.ST.freqbase = OPN.ST.rate ? (OPN.ST.clock / OPN.ST.rate) / pres : 0;
    OPN.eg_timer_add = Math.trunc((1 << EG_SH) * OPN.ST.freqbase);
    OPN.eg_timer_overflow = 3 * (1 << EG_SH);
    initTimetables(OPN.ST);
    for (let i = 0; i < 4096; i++) {
      OPN.fn_table[i] = Math.trunc(i * 32 * OPN.ST.freqbase * (1 << (FREQ_SH - 10)));
    }
  }

  /* --- register writes --- */

  function setTimers(ST, v) {
    ST.mode = v;
  }

  function fmKeyOn(CH, s) {
    const SLOT = CH.SLOT[s];
    if (!SLOT.key) {
      SLOT.key = 1;
      SLOT.phase = 0;
      SLOT.state = EG_ATT;
      if (SLOT.volume >= MAX_ATT_INDEX) SLOT.volume = 511;
    }
  }

  function fmKeyOff(CH, s) {
    const SLOT = CH.SLOT[s];
    if (SLOT.key) {
      SLOT.key = 0;
      if (SLOT.state > EG_REL) SLOT.state = EG_REL;
    }
  }

  function opnWriteMode(OPN, r, v) {
    switch (r) {
      case 0x21: /* Test */
        break;
      case 0x27: /* mode, timer control */
        setTimers(OPN.ST, v);
        break;
      case 0x28: /* key on/off */
        {
          const c = v & 0x03;
          if (c === 3) break;
          const CH = OPN.P_CH[c];
          if (v & 0x10) fmKeyOn(CH, 0); else fmKeyOff(CH, 0);
          if (v & 0x20) fmKeyOn(CH, 2); else fmKeyOff(CH, 2);
          if (v & 0x40) fmKeyOn(CH, 1); else fmKeyOff(CH, 1);
          if (v & 0x80) fmKeyOn(CH, 3); else fmKeyOff(CH, 3);
        }
        break;
    }
  }

  function opnWriteReg(state, OPN, r, v) {
    const c = r & 3;
    if (c === 3) return; /* 0xX3,0xX7,0xXB,0xXF */

    const CH = OPN.P_CH[c];
    const SLOT = CH.SLOT[(r >> 2) & 3];

    switch (r & 0xf0) {
      case 0x30: /* DET, MUL */
        setDetMul(OPN.ST, CH, SLOT, v);
        break;
      case 0x40: /* TL */
        setTl(SLOT, v);
        break;
      case 0x50: /* KS, AR */
        setArKsr(CH, SLOT, v);
        break;
      case 0x60: /* bit7 = AM ENABLE, DR */
        setDr(SLOT, v);
        break;
      case 0x70: /* SR */
        setSr(SLOT, v);
        break;
      case 0x80: /* SL, RR */
        setSlRr(SLOT, v);
        break;
      case 0x90: /* SSG-EG */
        SLOT.ssg = v & 0x0f;
        SLOT.ssgn = (v & 0x04) >> 1;
        break;
      case 0xa0:
        switch ((r >> 2) & 3) {
          case 0: /* 0xa0-0xa2: FNUM1 */
            {
              const fn = (((OPN.ST.fn_h) & 7) << 8) + v;
              const blk = OPN.ST.fn_h >> 3;
              CH.kcode = (blk << 2) | opn_fktable[fn >> 7];
              CH.fc = OPN.fn_table[fn * 2] >> (7 - blk);
              CH.SLOT[0].Incr = -1;
            }
            break;
          case 1: /* 0xa4-0xa6: FNUM2, BLK */
            OPN.ST.fn_h = v & 0x3f;
            break;
          case 2: /* 0xa8-0xaa: 3CH FNUM1 */
            if (r < 0x100) {
              const fn = (((OPN.SL3.fn_h) & 7) << 8) + v;
              const blk = OPN.SL3.fn_h >> 3;
              OPN.SL3.kcode[c] = (blk << 2) | opn_fktable[fn >> 7];
              OPN.SL3.fc[c] = OPN.fn_table[fn * 2] >> (7 - blk);
              OPN.P_CH[2].SLOT[0].Incr = -1;
            }
            break;
          case 3: /* 0xac-0xae: 3CH FNUM2, BLK */
            if (r < 0x100) OPN.SL3.fn_h = v & 0x3f;
            break;
        }
        break;
      case 0xb0:
        if (((r >> 2) & 3) === 0) { /* 0xb0-0xb2: FB, ALGO */
          const feedback = (v >> 3) & 7;
          CH.ALGO = v & 7;
          CH.FB = feedback ? feedback + 6 : 0;
          const cc = ALGO_CON[CH.ALGO];
          CH.con1 = cc.con1;
          CH.con2 = cc.con2;
          CH.con3 = cc.con3;
          CH.memCon = cc.memCon;
          CH.con4 = 4;
        }
        break;
    }
  }

  /* --- prescaler --- */

  function opnPrescalerW(OPN, addr, preDivider) {
    const opn_pres = [2 * 12, 2 * 12, 6 * 12, 3 * 12];
    switch (addr) {
      case 0: /* when reset */
        OPN.ST.prescaler_sel = 2;
        break;
      case 1: /* when postload */
        break;
      case 0x2d:
        OPN.ST.prescaler_sel |= 0x02;
        break;
      case 0x2e:
        OPN.ST.prescaler_sel |= 0x01;
        break;
      case 0x2f:
        OPN.ST.prescaler_sel = 0;
        break;
    }
    const sel = OPN.ST.prescaler_sel & 3;
    opnSetPres(OPN, opn_pres[sel] * preDivider);
  }

  /* --- reset --- */

  function resetChannels(ST, CH, num) {
    ST.mode = 0;
    for (let c = 0; c < num; c++) {
      CH[c].fc = 0;
      for (let s = 0; s < 4; s++) {
        const SLOT = CH[c].SLOT[s];
        SLOT.ssg = 0;
        SLOT.ssgn = 0;
        SLOT.state = EG_OFF;
        SLOT.volume = MAX_ATT_INDEX;
        SLOT.vol_out = MAX_ATT_INDEX;
      }
    }
  }

  /* --- chip object --- */

  function newSlot() {
    return {
      DT: null, KSR: 0, ar: 0, d1r: 0, d2r: 0, rr: 0, ksr: 0, mul: 0,
      phase: 0, Incr: 0, state: EG_OFF, tl: 0, volume: MAX_ATT_INDEX,
      sl: 0, vol_out: MAX_ATT_INDEX,
      eg_sh_ar: 0, eg_sel_ar: 0, eg_sh_d1r: 0, eg_sel_d1r: 0,
      eg_sh_d2r: 0, eg_sel_d2r: 0, eg_sh_rr: 0, eg_sel_rr: 0,
      ssg: 0, ssgn: 0, key: 0
    };
  }

  function newChannel(outIdx) {
    return {
      SLOT: [newSlot(), newSlot(), newSlot(), newSlot()],
      ALGO: 0, FB: 0, op1_out: [0, 0],
      con1: 0, con2: 0, con3: 0, con4: 4, memCon: 2, outIdx: outIdx,
      mem_value: 0, fc: 0, kcode: 0
    };
  }

  class OPN {
    constructor(clock, rate) {
      initTables();
      this.ST = {
        clock: clock, rate: rate, freqbase: 0, mode: 0,
        prescaler_sel: 0, fn_h: 0,
        dt_tab: [new Int32Array(32), new Int32Array(32), new Int32Array(32), new Int32Array(32),
                 new Int32Array(32), new Int32Array(32), new Int32Array(32), new Int32Array(32)]
      };
      this.SL3 = { fc: [0, 0, 0], fn_h: 0, kcode: [0, 0, 0] };
      this.CH = [newChannel(0), newChannel(1), newChannel(2)];
      this.P_CH = this.CH;
      this.State = { m2: 0, c1: 0, c2: 0, mem: 0, out_fm: [0, 0, 0] };
      this.eg_cnt = 0;
      this.eg_timer = 0;
      this.eg_timer_add = 0;
      this.eg_timer_overflow = 0;
      this.fn_table = new Float64Array(4096);
      this.REGS = new Uint8Array(256);
      this.reset();
    }

    reset() {
      opnPrescalerW(this, 0, 1);
      opnWriteMode(this, 0x27, 0x30);
      this.eg_timer = 0;
      this.eg_cnt = 0;
      resetChannels(this.ST, this.CH, 3);
      for (let i = 0xb2; i >= 0x30; i--) opnWriteReg(this.State, this, i, 0);
      for (let i = 0x26; i >= 0x20; i--) opnWriteReg(this.State, this, i, 0);
    }

    writeReg(reg, val) {
      if (reg >= 0x2d && reg <= 0x2f) opnPrescalerW(this, reg, 1);
      this.REGS[reg] = val;
      if (0x20 === (reg & 0xf0)) {
        opnWriteMode(this, reg, val);
      } else {
        opnWriteReg(this.State, this, reg, val);
      }
    }

    _refreshAll() {
      const cch = this.CH;
      refreshFcEgChan(cch[0]);
      refreshFcEgChan(cch[1]);
      if (this.ST.mode & 0xc0) {
        /* 3SLOT MODE */
        if (cch[2].SLOT[0].Incr === -1) {
          refreshFcEgSlot(cch[2].SLOT[0], this.SL3.fc[1], this.SL3.kcode[1]);
          refreshFcEgSlot(cch[2].SLOT[2], this.SL3.fc[2], this.SL3.kcode[2]);
          refreshFcEgSlot(cch[2].SLOT[1], this.SL3.fc[0], this.SL3.kcode[0]);
          refreshFcEgSlot(cch[2].SLOT[3], cch[2].fc, cch[2].kcode);
        }
      } else {
        refreshFcEgChan(cch[2]);
      }
    }

    /* render one sample; writes per-channel outputs into out3[0..2] */
    _renderSample(out3) {
      const state = this.State;
      const cch = this.CH;

      state.out_fm[0] = 0;
      state.out_fm[1] = 0;
      state.out_fm[2] = 0;

      this.eg_timer += this.eg_timer_add;
      while (this.eg_timer >= this.eg_timer_overflow) {
        this.eg_timer -= this.eg_timer_overflow;
        this.eg_cnt++;
        advanceEGChannel(this, cch[0].SLOT);
        advanceEGChannel(this, cch[1].SLOT);
        advanceEGChannel(this, cch[2].SLOT);
      }

      chanCalc(state, cch[0]);
      chanCalc(state, cch[1]);
      chanCalc(state, cch[2]);

      out3[0] = state.out_fm[0];
      out3[1] = state.out_fm[1];
      out3[2] = state.out_fm[2];
    }

    /* refresh FC/EG state then render one sample into out3[0..2] */
    renderSample(out3) {
      this._refreshAll();
      this._renderSample(out3);
      return out3;
    }

    updateOne(buffer, length) {
      this._refreshAll();
      const tmp = [0, 0, 0];
      for (let i = 0; i < length; i++) {
        this._renderSample(tmp);
        buffer[i] += tmp[0] + tmp[1] + tmp[2];
      }
    }

    getState() {
      const slotMap = [0x08, 0x08, 0x08, 0x08, 0x0c, 0x0e, 0x0e, 0x0f];
      const opn_pres = [2 * 12, 2 * 12, 6 * 12, 3 * 12];
      const scale = opn_pres[this.ST.prescaler_sel & 3];
      const res = [];
      for (let c = 0; c < 3; c++) {
        const algo = slotMap[this.CH[c].ALGO & 7];
        let att = 0;
        let div = 0;
        if (algo & 1) { att += this.CH[c].SLOT[0].vol_out; div++; }
        if (algo & 2) { att += this.CH[c].SLOT[2].vol_out; div++; }
        if (algo & 4) { att += this.CH[c].SLOT[1].vol_out; div++; }
        if (algo & 8) { att += this.CH[c].SLOT[3].vol_out; div++; }
        att = div ? att / div : 0;
        let period = 0;
        if (att < 1024) {
          const regHi = this.REGS[0xa4 + c];
          const regLo = this.REGS[0xa0 + c];
          const counter = ((regHi & 7) << 8) | regLo;
          if (counter) {
            const octave = (regHi & 0x38) >> 3;
            period = Math.floor((scale << 21) / (counter << octave));
          } else {
            period = scale << 21;
          }
        }
        res.push({ attenuation: att, period: period });
      }
      return res;
    }
  }

  /* Two-chip adapter matching ZXTune's TFM ChipAdapter:
     renders both chips, averages, clamps to 16-bit, returns float in [-1, 1]. */
  class OPNAdapter {
    constructor(clock, rate) {
      this.clock = clock;
      this.rate = rate;
      this.chip0 = new OPN(clock, rate);
      this.chip1 = new OPN(clock, rate);
      this._tmp = new Float64Array(1);
    }

    reset() {
      this.chip0.reset();
      this.chip1.reset();
    }

    writeRegs(chip, reg, val) {
      (chip ? this.chip1 : this.chip0).writeReg(reg, val);
    }

    /* render `samples` consecutive samples starting at `out` offset */
    render(out, offset, samples) {
      const tmp = this._tmp;
      for (let i = 0; i < samples; i++) {
        tmp[0] = 0;
        this.chip0.updateOne(tmp, 1);
        let v = tmp[0];
        tmp[0] = 0;
        this.chip1.updateOne(tmp, 1);
        v += tmp[0];
        v /= 2;
        if (v > 32767) v = 32767;
        else if (v < -32768) v = -32768;
        out[offset + i] = v / 32768;
      }
    }
  }

  globalThis.OPN = OPN;
  globalThis.OPNAdapter = OPNAdapter;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OPN: OPN, OPNAdapter: OPNAdapter };
  }
})();
