// ------------------------------------------------------------------------------
// SND Parser to PSG dump by KUVO, Lostee, Ze-fir
// JavaScript class v1.2.2026
//
// Make PSG dump from RockMonitor SND module by Caroline software inc.
// RockMonitor is a music tracker for the BK0011M computer with an AY-3-8910
// or YM2149F chip connected.
//
//  Example call:
//
//	Inside the <head> tag of your page, enter the file snd2psg.js like this:
//
//		<script type="text/javascript" src="snd2psg.js?2"></script>
//
//	In the main script, add a function to call the parser like this:
//
//	function getPSGfromSND() {
//
//	  var file = document.getElementById('sndfile').files[0];
//	  var fr = new FileReader();
//
//	  fr.readAsArrayBuffer(file);
//	  fr.onload = function(e) {
//
//		var fileBytes = new Int8Array(e.target.result);
//
//		var sndParser = new SndToPsg(fileBytes);

//		var PSGdump = sndParser.exec; //the result will be a simple array of bytes
//
		// Below should be written the code to work with the received data.
		//...
//	  }
//  }
//--------------------------------------------------------------------------------

class SndToPsg {

	regs = new Int16Array(new ArrayBuffer(14)); // r0,r1,r2,r3,r4,r5,sp;
	regsAY = new Int8Array(new ArrayBuffer(14)); //regs 0...13 (14 and 15 not used)
	endSong;
	envType;

	constructor (fileBytes) {
		this.fileBytes = fileBytes;
	}

	get exec() {
		return this.readAndParseSND();
	}

	readAndParseSND() {

			var regs = this.regs;
			var regsAY = this.regsAY;
			var fileBytes = this.fileBytes;

			var resultPSG = [80, 83, 71, 26, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //psg header

			this.prepSnd();

			this.endSong = false;
			this.envType = 0;

			while(this.endSong == false) {

				this.parseSnd();
		
				resultPSG.push(0o377);

				for(var i=0; i<13; i++) {
					if(regsAY[i] !== fileBytes[regs[3]+i]) {
						resultPSG.push(i);
						resultPSG.push((fileBytes[regs[3]+i]&255));
						regsAY[i] = fileBytes[regs[3]+i];
					}
				}
				if((regsAY[i]&255) !== this.envType) {
					resultPSG.push(i);
					resultPSG.push(this.envType);
					regsAY[i] = this.envType;
				}

			}

			resultPSG.push(0o375);
			return resultPSG;
	}

	prepSnd() {

			var regs = this.regs;
			var fileBytes = this.fileBytes;

			fileBytes[0o2777] = 0o377;

			regs[5] = 0o3006;
			regs[4] = regs[5];

			fileBytes[0o174] = fileBytes[regs[5]];
			fileBytes[0o175] = fileBytes[regs[5]+1];
			regs[5] += 2;

			regs[0] = (fileBytes[regs[5]]&255) + (fileBytes[regs[5]+1]&255)*256;
			regs[5] += 2;

			regs[0] += regs[4];

			fileBytes[0o244] = regs[0]&255;
			fileBytes[0o245] = (regs[0]&0o177400) >> 8;

			fileBytes[0o234] = regs[0]&255;
			fileBytes[0o235] = (regs[0]&0o177400) >> 8;

			regs[0] = (fileBytes[regs[5]]&255) + (fileBytes[regs[5]+1]&255)*256;
			regs[5] += 2;

			regs[0] += regs[4];

			fileBytes[0o300] = regs[0]&255;
			fileBytes[0o301] = (regs[0]&0o177400) >> 8;

			fileBytes[0o2174] = regs[5]&255;
			fileBytes[0o2175] = (regs[5]&0o177400) >> 8;

			regs[5] = 0o2520;
			regs[4] = 0o226;

			fileBytes[regs[5]+0o52] = regs[4]&255;
			fileBytes[regs[5]+0o53] = (regs[4]&0o177400) >> 8;

			for(var i=0; i<3; i++) {

				fileBytes[regs[5]] = 0;
				fileBytes[regs[5]+1] = 0;

				fileBytes[regs[5]+4] = fileBytes[0o2174];
				fileBytes[regs[5]+5] = fileBytes[0o2175];

				fileBytes[regs[5]+0o54] = 0;
				fileBytes[regs[5]+0o55] = 0;

				fileBytes[regs[5]+0o56] = 0o20;
				fileBytes[regs[5]+0o57] = 0;

				regs[5] += 0o70;
			}
	}

	parseSnd() {

			var sel;
			var regs = this.regs;
			var fileBytes = this.fileBytes;

			regs[5] = 0o2520;
			fileBytes[0o3005] = 0;

			for(var i=0; i<3; i++) {

				fileBytes[regs[5]]--;
				if(fileBytes[regs[5]] <= 0) this.p172();

				fileBytes[regs[5]+0o14]--;
				if(fileBytes[regs[5]+0o14] < 0) {
					
					regs[4] = regs[5];
					
					fileBytes[regs[5]+0o16] = 0;
					fileBytes[regs[5]+0o17] = 0;

					if(this.p1042() == false) {
						fileBytes[regs[5]+0o20] = 0;
						fileBytes[regs[5]+0o21] = 0;
					}
					else {

						this.p700();

						regs[3] = (fileBytes[regs[3]+4]&255) + (fileBytes[regs[3]+5]&255)*256;

						regs[1] = fileBytes[regs[0]+0o46];
						regs[2] = regs[1];
						regs[1] &= 0o17;
						regs[2] &= ~regs[1];

						regs[0] = fileBytes[regs[5]+0o63];

						this.p744();

						fileBytes[regs[5]+0o14] = regs[2]&255;
					}
				}
					
				fileBytes[regs[5]+0o15]--;
				if(fileBytes[regs[5]+0o15] < 0) {
				
					regs[4] = regs[5];
					regs[4]++;
					
					fileBytes[regs[5]+0o24] = 0;
					fileBytes[regs[5]+0o25] = 0;

					if(this.p1042()) {

						this.p700();

						regs[1] = fileBytes[regs[0]+0o63];
						regs[2] = regs[1];

						regs[1] &= 0o37;
						regs[2] &= ~regs[1];

						var val = (fileBytes[regs[3]+0o12]&255) + (fileBytes[regs[3]+0o13]&255)*256;
						if((val & regs[4]) !== 0) regs[2] += 0o20;

						regs[3] = (fileBytes[regs[3]+6]&255) + (fileBytes[regs[3]+7]&255)*256;

						regs[0] = fileBytes[regs[5]+0o64];

						regs[6] = regs[5];
						regs[5] +=6;

						this.p744();

						regs[5] = regs[6];
						fileBytes[regs[5]+0o15] = regs[2]&255;
					}
				}

				fileBytes[regs[5]+0o44]--;
				if(fileBytes[regs[5]+0o44] < 0) {

					regs[4] = regs[5];
					regs[4] += 2;

					fileBytes[regs[5]+0o32] = 0;
					fileBytes[regs[5]+0o33] = 0;
					fileBytes[regs[5]+0o34] = 0;
					fileBytes[regs[5]+0o35] = 0;

					if (this.p1042()) {

						regs[0] = regs[0] << 1;
						regs[3] = (fileBytes[regs[5]+4]&255) + (fileBytes[regs[5]+5]&255)*256;
						regs[0] += regs[3];
						regs[2] = (fileBytes[regs[0]+0o14]&255) + (fileBytes[regs[0]+0o15]&255)*256;
						regs[1] = regs[2];

						regs[0] = 0o2000;
						regs[1] &= 0o1777; //bic #176000

						if((regs[2] & regs[0]) !== 0) regs[1] |=0o176000;

						regs[4] = fileBytes[regs[5]+0o43];
						regs[0] = regs[0] << 1;

						if((regs[2] & regs[0]) !== 0) {
							regs[4] += regs[1];
							if(regs[4] < 0) regs[4] = 0;
							else if(regs[4] >= 0o140) regs[4] = 0o137;
						}

						regs[4] = regs[4] << 1;
						regs[4] += 0o2220;
						regs[4] = (fileBytes[regs[4]]&255) + (fileBytes[regs[4]+1]&255)*256;

						if((regs[2] & regs[0]) == 0) {
							regs[4] -= regs[1];
							if(regs[4] < 0) regs[4] = 0;
						}

						regs[1] = regs[4];
						regs[2] = ((regs[2]&255) << 8) + ((regs[2]&0o177400) >> 8); //swab
						regs[2] &= ~0o177417;

						this.p724();

						fileBytes[regs[5]+0o44] = regs[2]&255;

						fileBytes[regs[5]+0o50] = regs[1]&255;
						fileBytes[regs[5]+0o51] = (regs[1]&0o177400) >> 8;

						if(fileBytes[regs[3]+3] >= 0) {
							fileBytes[regs[5]+0o40] = regs[1]&255;
							fileBytes[regs[5]+0o41] = (regs[1]&0o177400) >> 8;
						}
						else {
							regs[4] = 0;
							regs[1] -= (fileBytes[regs[5]+0o40]&255) + (fileBytes[regs[5]+0o41]&255)*256;
							if(regs[1] < 0) {
								regs[1] = -regs[1];
								regs[4]++;
							}

							this.p140();

							if(regs[4] != 0) {
								regs[1] = -regs[1];
								regs[1]--;
							}
							fileBytes[regs[5]+0o34] = regs[1]&255;
							fileBytes[regs[5]+0o35] = (regs[1]&0o177400) >> 8;

							regs[1] = 0;
							for(regs[0] = 0o10; regs[0] > 0; regs[0]--) {
								regs[1] = regs[1] << 1;
								regs[3] = regs[3] << 1;
								if((regs[3]&177777) >= (regs[2]&177777)) {
									regs[3] -= regs[2];
									regs[1]++;
								}
							}
							if(regs[4] !== 0) {
								regs[1] = -regs[1];
							}
							fileBytes[regs[5]+0o33] = regs[1]&255;
						}
					}
				}

				regs[3] = 0o2770;
				regs[0] = regs[5];
				regs[0] += 0o16;

				regs[6] = (fileBytes[regs[0]]&255) + (fileBytes[regs[0]+1]&255)*256;
				regs[0] += 2;
				regs[6] += (fileBytes[regs[0]]&255) + (fileBytes[regs[0]+1]&255)*256;

				fileBytes[regs[0]] = regs[6]&255;
				fileBytes[regs[0]+1] = (regs[6]&0o177400) >> 8;

				if(fileBytes[regs[5]+0o14] == 0) {
					fileBytes[regs[0]] = fileBytes[regs[0]+2];
					fileBytes[regs[0]+1] = fileBytes[regs[0]+3];
				}

				regs[4] = fileBytes[regs[5]+0o65];
				regs[4] += regs[3];

				sel = 0;
				if(fileBytes[regs[5]+0o62] < 0) {
					if(fileBytes[regs[0]+1] !== 0) {
						this.p114();
						fileBytes[0o3003] = fileBytes[regs[5]+0o56];
						sel = 2;
					}
				}
				else {
					regs[1] = fileBytes[regs[5]+0o21];
					regs[2] = fileBytes[regs[5]+0o57];

					regs[1] -= regs[2];
					if(regs[1] >= 0) sel = 1;
				}
				if(sel == 0) regs[1] = 0;
				if(sel < 2) fileBytes[regs[4]] = regs[1]&255;

				regs[4] = fileBytes[regs[5]+0o63];

				regs[4] += regs[3];
				regs[2] = regs[0];
				regs[2] += 0o16;
				regs[0] += 4;

				regs[6] = (fileBytes[regs[0]]&255) + (fileBytes[regs[0]+1]&255)*256;
				regs[0] +=2;
				regs[6] += (fileBytes[regs[0]]&255) + (fileBytes[regs[0]+1]&255)*256;

				fileBytes[regs[0]] = regs[6]&255;
				fileBytes[regs[0]+1] = (regs[6]&0o177400) >> 8;
				regs[0] += 2;

				if(fileBytes[regs[5]+0o15] == 0) {
					regs[0] -= 2;
					fileBytes[regs[0]] = fileBytes[regs[0]+2];
					fileBytes[regs[0]+1] = fileBytes[regs[0]+3];
				}

				if((fileBytes[0o2777] & fileBytes[regs[5]+0o64]) == 0) fileBytes[0o2776] = fileBytes[regs[5]+0o27];
				
				var val1 = (fileBytes[regs[5]+0o32]&255) + (fileBytes[regs[5]+0o33]&255)*256;
				var val2 = (fileBytes[regs[2]]&255) + (fileBytes[regs[2]+1]&255)*256;
				val2 += val1;
				var c = val2 > 0o177777 ? 1 : 0;
				val2 &= 0o177777;
				fileBytes[regs[2]] = val2&255;
				fileBytes[regs[2]+1] = (val2&0o177400) >> 8;
				regs[2] +=2;

				val1 = (fileBytes[regs[5]+0o34]&255) + (fileBytes[regs[5]+0o35]&255)*256;
				val2 = (fileBytes[regs[2]]&255) + (fileBytes[regs[2]+1]&255)*256;
				val2 += val1;
				val2 += c;
				val2 &= 0o177777;

				fileBytes[regs[2]] = val2&255;
				fileBytes[regs[2]+1] = (val2&0o177400) >> 8;

				if(fileBytes[regs[5]+0o44] == 0) {
					fileBytes[regs[2]] = fileBytes[regs[5]+0o50];
					fileBytes[regs[2]+1] = fileBytes[regs[5]+0o51];
				}

				var offset = (regs[4] & 1) == 0 ? 0 : -1;
				fileBytes[regs[4]+offset] = fileBytes[regs[2]];
				fileBytes[regs[4]+offset+1] = fileBytes[regs[2]+1];

				fileBytes[regs[5]+0o60] = 0;
				fileBytes[regs[5]+0o61] = 0;

				regs[5] += 0o70;
			}
	}

	p114() {
			var regs = this.regs;
			var fileBytes = this.fileBytes;

			fileBytes[regs[4]] = fileBytes[0o116]; //20
			fileBytes[0o2777] |= fileBytes[regs[5]+0o64];
	}

	p724() {
			var regs = this.regs;
			var fileBytes = this.fileBytes;
			
			regs[2] = regs[2] >>> 2;
			if (regs[2] > 0) regs[2] -= 3;
			regs[2] += (fileBytes[regs[5]+0o60]&255) + (fileBytes[regs[5]+0o61]&255)*256;
	}


	p744() {
			var regs = this.regs;
			var fileBytes = this.fileBytes;

			fileBytes[0o2777] &= ((~regs[0])&255);

			if((regs[3] & regs[4]) == 0) fileBytes[0o2777] |= regs[0]&255;

			this.p724();

			fileBytes[regs[5]+0o23] = regs[1]&255;

			if(regs[3] >= 0) {
				fileBytes[regs[5]+0o21] = regs[1]&255;
				return;
			}

			regs[0] = fileBytes[regs[5]+0o21];

			regs[4] = 0;
			regs[1] -= regs[0];
			if(regs[1] < 0) {
				regs[1] = -regs[1];
				regs[4]++;
			}

			regs[1] = ((regs[1]&255) << 8) + ((regs[1]&0o177400) >> 8); //swab

			this.p140(); 

			if(regs[4] !== 0) regs[1] = -regs[1];

			fileBytes[regs[5]+0o16] = regs[1]&255;
			fileBytes[regs[5]+0o17] = (regs[1]&0o177400) >> 8;
	}

	p140() {
			var regs = this.regs;
			var fileBytes = this.fileBytes;

			regs[3] = 0;

			for(regs[0] = 0o20; regs[0] > 0; regs[0]--) {
				var c = (regs[1] & 0o100000) !== 0 ? 1 : 0;
				regs[1] = regs[1] << 1;
				regs[3] = regs[3] << 1;
				regs[3] += c;
				if(regs[3] >= regs[2]) {
					regs[3] -= regs[2];
					regs[1]++;
				}
			}
			regs[1] &= 0o37777;
	}

	p700() {
			var regs = this.regs;
			var fileBytes = this.fileBytes;

			regs[4] = 1;
			regs[3] = regs[0];
			for(; regs[3] > 0; regs[3]--) {
				regs[4] = regs[4] << 1;
			}
			regs[3] = (fileBytes[regs[5]+4]&255) + (fileBytes[regs[5]+5]&255)*256;
			regs[0] += regs[3];
	}


	p1042() {
			var regs = this.regs;
			var fileBytes = this.fileBytes;

			regs[4]++;
			fileBytes[regs[4]]++;

			regs[0] = fileBytes[regs[4]];

			if(fileBytes[regs[5]+0o42] == 0) {
				if((regs[0]&255) > (fileBytes[regs[4]+0o10]&255)) {
					regs[0] = fileBytes[regs[4]+5];
					fileBytes[regs[4]] = regs[0];
				}
			}

			var c = true;
			if((regs[0]&255) >= 0o15) {
				fileBytes[regs[4]]--;
				c = false;
			}
			return c;
	}

	p172() {
			var regs = this.regs;
			var fileBytes = this.fileBytes;

			fileBytes[regs[5]] = fileBytes[0o174];

			fileBytes[regs[5]+0o54]--;
			if(fileBytes[regs[5]+0o54] >= 0) return;

			while(1==1) {

				regs[4] = (fileBytes[regs[5]+0o52]&255) + (fileBytes[regs[5]+0o53]&255)*256;

				fileBytes[regs[5]+0o62] = 0;

				fileBytes[regs[5]+0o60] = fileBytes[regs[5]+0o66];

				var en = false;

				while(1==1) {

					regs[1] = fileBytes[regs[4]];
					regs[4]++;

					if((regs[1]&255) == 0o377) {

						regs[0] = (fileBytes[0o234]&255) + (fileBytes[0o235]&255)*256;

						if(fileBytes[regs[0]] < 0) {
							fileBytes[0o234] = fileBytes[0o244];
							fileBytes[0o235] = fileBytes[0o245];
							regs[0] = (fileBytes[0o234]&255) + (fileBytes[0o235]&255)*256;
							this.endSong = true;
						}

						regs[1] = fileBytes[regs[0]];
						regs[0]++;

						fileBytes[0o332] = fileBytes[regs[0]];
						regs[0]++;

						fileBytes[0o234] = regs[0]&255;
						fileBytes[0o235] = (regs[0]&0o177400) >> 8;

						regs[1] = regs[1] << 1;
						regs[0] = regs[1];
						regs[1] = regs[1] << 1;
						regs[0] += regs[1];

						regs[1] = (fileBytes[0o300]&255) + (fileBytes[0o301]&255)*256;
						regs[0] += regs[1];

						regs[1] += (fileBytes[regs[0]]&255) + (fileBytes[regs[0]+1]&255)*256;
						regs[0] +=2;

						fileBytes[regs[5]+0o52] = regs[1]&255;
						fileBytes[regs[5]+0o53] = (regs[1]&0o177400) >> 8;

						regs[1] += (fileBytes[regs[0]]&255) + (fileBytes[regs[0]+1]&255)*256;
						regs[0] +=2;

						fileBytes[regs[5]+0o142] = regs[1]&255;
						fileBytes[regs[5]+0o143] = (regs[1]&0o177400) >> 8;

						regs[1] += (fileBytes[regs[0]]&255) + (fileBytes[regs[0]+1]&255)*256;

						fileBytes[regs[5]+0o232] = regs[1]&255;
						fileBytes[regs[5]+0o233] = (regs[1]&0o177400) >> 8;

						en = true;
						break;
					}

					regs[2] = fileBytes[0o332];

					if((regs[1]&255) !== 0) {

						if((regs[1]&255) == 0o376) {
							fileBytes[regs[5]+0o60] = 0;
							fileBytes[regs[5]+0o61] = 0;
							fileBytes[regs[5]+0o52] = regs[4]&255;
							fileBytes[regs[5]+0o53] = (regs[4]&0o177400) >> 8;
							fileBytes[regs[5]+0o54] = fileBytes[regs[5]+0o46];
							return;
						}
						
						regs[1]--;
						if((regs[1]&255) < 0o140) {
							regs[1] += regs[2];
							fileBytes[regs[5]+0o43] = regs[1]&255;
							fileBytes[regs[5]+1] = 0o377;
							fileBytes[regs[5]+2] = 0o377;
							fileBytes[regs[5]+3] = 0o377;
							fileBytes[regs[5]+0o42] = 0;
							fileBytes[regs[5]+0o14] = 0;
							fileBytes[regs[5]+0o15] = 0;
							fileBytes[regs[5]+0o44] = 0;
							fileBytes[regs[5]+0o52] = regs[4]&255;
							fileBytes[regs[5]+0o53] = (regs[4]&0o177400) >> 8;
							fileBytes[regs[5]+0o54] = fileBytes[regs[5]+0o46];
							return;
						}
						else {
							regs[0] = regs[1];
							regs[1] &= 0o17;
							if((regs[0]&255) < 0o160) {

								regs[1] = ((regs[1]&255) << 8) + ((regs[1]&0o177400) >> 8); //swab
								regs[1] = regs[1] >>> 2; //asr asr
								regs[1] += (fileBytes[0o2174]&255) + (fileBytes[0o2175]&255)*256;

								regs[3] = regs[5];
								
								regs[3] += 4;

								fileBytes[regs[3]] = regs[1]&255;
								fileBytes[regs[3]+1] = (regs[1]&0o177400) >> 8;
								regs[3] += 2;

								fileBytes[regs[3]] = fileBytes[regs[1]];
								regs[3]++;
								regs[1]++;

								fileBytes[regs[3]] = fileBytes[regs[1]+7];
								regs[3]++;

								fileBytes[regs[3]] = fileBytes[regs[1]+1];
								regs[3]++;

								fileBytes[regs[3]] = fileBytes[regs[1]];
								regs[3]++;
								regs[1]++;

								fileBytes[regs[3]] = fileBytes[regs[1]+7];
								regs[3]++;

								fileBytes[regs[3]] = fileBytes[regs[1]+1];

								fileBytes[regs[5]+0o13] &= 0o177;
								continue;
							}

							if((regs[0]&255) < 0o200) {
								regs[2] = 0o17;
								regs[2] -= regs[1];
								fileBytes[regs[5]+0o57] = regs[2]&255;
								continue;
							}

							if((regs[0]&255) < 0o220) {
								regs[1] = regs[1] << 1;
								fileBytes[regs[5]+0o66] = regs[1]&255;
								fileBytes[regs[5]+0o60] = regs[1]&255;
								continue;
							}

							if((regs[0]&255) < 0o240) {

								this.envType = regs[1]&255;

								fileBytes[regs[5]+0o56] = fileBytes[regs[4]];
								regs[4]++;
								regs[2] = 0o362;
								fileBytes[regs[5]+0o62] = regs[2]&255;
								continue;
							}

							regs[0] -= 0o240;
							fileBytes[regs[5]+0o46] = regs[0]&255;
							continue;
						}
						
					}
					else break;
				}
				if(en && this.endSong==false) continue; break;
			}

			fileBytes[regs[5]+0o60] = 0;
			fileBytes[regs[5]+0o61] = 0;

			if(fileBytes[regs[5]+0o42] == 0) {

				fileBytes[regs[5]+0o42]--;

				regs[3] = regs[5];
				regs[3]++;

				fileBytes[regs[3]] = fileBytes[regs[5]+0o11];
				regs[3]++;

				fileBytes[regs[3]] = fileBytes[regs[5]+0o12];
				regs[3]++;

				fileBytes[regs[3]] = fileBytes[regs[5]+0o13];

				fileBytes[regs[5]+0o14] = 0;
				fileBytes[regs[5]+0o15] = 0;

				fileBytes[regs[5]+0o44] = 0;
			}

			fileBytes[regs[5]+0o52] = regs[4]&255;
			fileBytes[regs[5]+0o53] = (regs[4]&0o177400) >> 8;

			fileBytes[regs[5]+0o54] = fileBytes[regs[5]+0o46];

	}

}