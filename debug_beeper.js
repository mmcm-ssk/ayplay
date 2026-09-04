const fs = require('fs');
const base = 'D:/ayplay';
delete require.cache[require.resolve(base + '/player/z80core.js')];
delete require.cache[require.resolve(base + '/player/ay.js')];
globalThis.Z80 = require(base + '/player/z80core.js');
globalThis.document = {hidden: true};
if (!globalThis.performance) globalThis.performance = {now: Date.now};
const {AYReader} = require(base + '/player/ay.js');

const ayPath = 'D:/ayplay/chiptunes/_Beeper/Tim Follin - AgentX (1986).ay';
const data = fs.readFileSync(ayPath);
const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
const reader = new AYReader(ab);

reader.run(function(){}, null, function(){return false;}, function(buf){});

setTimeout(() => {
  const frames = reader._beeperFrames;
  
  // Check for repeating patterns in frame sequences
  // Compare consecutive edge count patterns
  let edgeCounts = [];
  for (let f = 0; f < frames.length; f++) {
    edgeCounts.push(Math.floor(frames[f].length / 2));
  }

  console.log('Edge counts sample (first 60):', edgeCounts.slice(0, 60).join(','));

  // Check if there's a repeating pattern by looking at frame differences
  let diffs = [];
  for (let f = 1; f < frames.length; f++) {
    let prevLen = frames[f-1].length;
    let currLen = frames[f].length;
    diffs.push(currLen - prevLen);
  }

  // Find autocorrelation-like pattern in diffs
  console.log('\nDiff counts sample (first 60):', diffs.slice(0, 60).join(','));

  // Check for repeating edge count sequences of various periods
  for (let p = 2; p < 50; p++) {
    let matches = 0;
    let checks = 0;
    for (let f = p; f < Math.min(120, frames.length); f++) {
      if (edgeCounts[f] === edgeCounts[f-p]) {
        matches++;
      }
      checks++;
    }
    if (matches > checks * 0.7) {
      console.log('Period ' + p + ': ' + matches + '/' + checks + ' matches');
    }
  }

  // Look at the actual beeper data more carefully - find high-period edges (high-pitch glitches)
  let highPeriods = [];
  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    for (let i = 1; i < frame.length; i += 2) {
      if (frame[i] > 200 && frame[i] < 350) { // suspicious period range for buzzing
        highPeriods.push({frame: f, offset: i, period: frame[i]});
      }
    }
  }

  console.log('\nSuspicious periods (200-349):', highPeriods.slice(0, 50).map(x => 'f'+x.frame+' p='+x.period).join(', '));
  console.log('Total suspicious:', highPeriods.length);

  // Look at period distribution in a middle section  
  let midStart = Math.floor(frames.length / 3);
  let midEnd = Math.min(midStart + 200, frames.length);
  let periodsInRange = [];
  for (let f = midStart; f < midEnd; f++) {
    const frame = frames[f];
    for (let i = 1; i < frame.length; i += 2) {
      periodsInRange.push(frame[i]);
    }
  }
  
  // Histogram of period values - buckets of 20
  let pHist = {};
  for (let p of periodsInRange) {
    let bucket = Math.floor(p / 20);
    if (!pHist[bucket]) pHist[bucket] = 0;
    pHist[bucket]++;
  }
  
  // Find the top 5 most frequent period buckets
  let sorted = Object.keys(pHist).sort((a,b) => pHist[b] - pHist[a]);
  console.log('\nTop period buckets (frames ' + midStart + '-' + midEnd + '):');
  for (let k of sorted.slice(0,5)) {
    console.log('  bucket ' + (parseInt(k)*20) + '-'+(parseInt(k)*20+19) + ': count=' + pHist[k]);
  }

}, 15000);
