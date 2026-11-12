// Fetch the background clips into public/video if they are not already there.
//
// The clips are Mixkit stock footage (free licence: fine to use in a site, not to redistribute as standalone files), so they are
// not committed to git. `npm run build` runs this first. It never fails the build: if a clip cannot be fetched the site still
// builds and shows the dark gradient where that clip would be.
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'video');
// file name -> Mixkit clip id (360p versions: 0.3-4 MB, plenty under the dark fade). See the README for titles.
const CLIPS = { 'hotel-lit.mp4': 27291, 'hotel-corridor.mp4': 34613, 'hotel-neon.mp4': 41154, 'hotel-resort-aerial.mp4': 9902 };
const url = (id) => `https://assets.mixkit.co/videos/${id}/${id}-360.mp4`;
const isMp4 = (buf) => buf.length > 10000 && buf.subarray(4, 8).toString('latin1') === 'ftyp';

async function viaFetch(u) {
  const res = await fetch(u, { headers: { 'user-agent': 'site-build/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const want = Number(res.headers.get('content-length') || 0);
  if (want && buf.length !== want) throw new Error(`truncated (${buf.length} of ${want} bytes)`);
  return buf;
}
const viaCurl = (u) =>
  execFileSync('curl', ['-sS', '-L', '--fail', '--retry', '3', '--max-time', '300', '-A', 'site-build/1.0', u], { maxBuffer: 64 * 1024 * 1024 });

mkdirSync(dest, { recursive: true });
for (const [name, id] of Object.entries(CLIPS)) {
  const path = join(dest, name);
  if (existsSync(path) && statSync(path).size > 10000) {
    console.log('have   ', name);
    continue;
  }
  let buf = null;
  let err = null;
  for (const get of [() => viaFetch(url(id)), () => viaCurl(url(id))]) {
    try {
      const b = await get();
      if (isMp4(b)) { buf = b; break; }
      err = new Error('response is not an MP4');
    } catch (e) {
      err = e;
    }
  }
  if (buf) {
    writeFileSync(path, buf);
    console.log('fetched', name, `${(buf.length / 1048576).toFixed(1)} MB`);
  } else {
    console.warn(`WARNING: could not fetch ${name} (${err?.message}). The site will build without it.`);
  }
}
