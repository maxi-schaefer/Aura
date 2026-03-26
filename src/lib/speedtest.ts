export const startFullTest = async (onUpdate: (data: any) => void) => {
  const testNode = "https://speed.cloudflare.com/__down?bytes=";
  
  // 1. PING TEST
  onUpdate({ stage: 'ping', value: 0 });
  let pings = [];
  for(let i=0; i<5; i++) {
    const start = performance.now();
    await fetch("https://1.1.1.1", { mode: 'no-cors', cache: 'no-cache' });
    pings.push(performance.now() - start);
    onUpdate({ ping: Math.min(...pings) });
  }

  // 2. DOWNLOAD TEST (Burst approach)
  onUpdate({ stage: 'download', value: 0 });
  const dlSizes = [100000, 1000000, 10000000]; // 100kb, 1mb, 10mb
  let totalDlSpeed = 0;

  for (const size of dlSizes) {
    const start = performance.now();
    const res = await fetch(`${testNode}${size}`, { cache: 'no-cache' });
    await res.arrayBuffer();
    const duration = (performance.now() - start) / 1000;
    const mbps = (size * 8) / (duration * 1024 * 1024);
    totalDlSpeed = mbps; 
    onUpdate({ download: totalDlSpeed });
  }

  // 3. UPLOAD TEST (POST small blobs)
  onUpdate({ stage: 'upload', value: 0 });
  const uploadData = new Uint8Array(1000000); // 1MB blob
  const startUl = performance.now();
  await fetch("https://speed.cloudflare.com/__up", {
    method: 'POST',
    body: uploadData,
    cache: 'no-cache'
  });
  const ulDuration = (performance.now() - startUl) / 1000;
  const ulMbps = (uploadData.length * 8) / (ulDuration * 1024 * 1024);
  onUpdate({ upload: ulMbps, stage: 'complete' });
};