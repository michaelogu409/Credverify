// Benchmark for the credential verification system.
// Place in backend/ and run:  node benchmark.js
// Needs Node 18+ and the backend running on port 5000.
//
// Add these 3 lines to backend/.env first:
//   ADMIN_TOKEN=<JWT of a logged-in institution/administrator>
//   STUDENT_WALLET=<any student wallet address>
//   PDF_PATH=<path to any sample PDF, e.g. ./sample.pdf>
// Optional: RUNS=10 (number of test credentials to issue)

require('dotenv').config();
const fs = require('fs');
const { ethers } = require('ethers');

const API = 'http://localhost:5000/api';
const { ADMIN_TOKEN, STUDENT_WALLET, PDF_PATH } = process.env;
const RUNS = Number(process.env.RUNS || 10);

const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

const makeForm = (buf, extra = {}) => {
  const fd = new FormData();
  fd.append('credentialFile', new Blob([buf], { type: 'application/pdf' }), 'test.pdf');
  Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
  return fd;
};

async function verify(buf) {
  const t = performance.now();
  const res = await fetch(`${API}/verification/verify`, { method: 'POST', body: makeForm(buf) });
  const data = await res.json();
  return { result: data.result, time: performance.now() - t };
}

(async () => {
  if (!ADMIN_TOKEN || !STUDENT_WALLET || !PDF_PATH) {
    console.log('Missing ADMIN_TOKEN, STUDENT_WALLET or PDF_PATH in .env');
    return;
  }

  const original = fs.readFileSync(PDF_PATH);
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const issueTimes = [], gasUsed = [], verifyTimes = [];
  let authentic = 0, tamperDetected = 0;

  for (let i = 0; i < RUNS; i++) {
    // unique file each run so the hash is new
    const buf = Buffer.concat([original, Buffer.from(`\n%test-${Date.now()}-${i}`)]);

    const t = performance.now();
    const res = await fetch(`${API}/credentials/issue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: makeForm(buf, { studentWallet: STUDENT_WALLET, degreeTitle: `Test ${i + 1}`, issueDate: '2026-01-01' }),
    });
    const data = await res.json();
    if (!res.ok) { console.log(`Run ${i + 1} failed:`, data.error); continue; }

    issueTimes.push(performance.now() - t);
    const receipt = await provider.getTransactionReceipt(data.credential.txHash);
    gasUsed.push(Number(receipt.gasUsed));

    // genuine document should be AUTHENTIC
    const ok = await verify(buf);
    verifyTimes.push(ok.time);
    if (ok.result === 'AUTHENTIC') authentic++;

    // flip a single bit: should be TAMPERED
    const bad = Buffer.from(buf);
    bad[10] ^= 1;
    const tampered = await verify(bad);
    if (tampered.result === 'TAMPERED') tamperDetected++;

    console.log(`Run ${i + 1}/${RUNS} done`);
  }

  const n = issueTimes.length;
  if (!n) { console.log('No successful runs.'); return; }

  console.log('\n===== RESULTS =====');
  console.log(`Credentials tested:            ${n}`);
  console.log(`Avg issuance time:             ${(avg(issueTimes) / 1000).toFixed(1)} s`);
  console.log(`Avg gas used per issuance:     ${Math.round(avg(gasUsed)).toLocaleString()} gas`);
  console.log(`Avg verification time:         ${Math.round(avg(verifyTimes))} ms`);
  console.log(`Genuine docs marked AUTHENTIC: ${authentic}/${n} (${((authentic / n) * 100).toFixed(0)}%)`);
  console.log(`Altered docs flagged TAMPERED: ${tamperDetected}/${n} (${((tamperDetected / n) * 100).toFixed(0)}%)`);
})();