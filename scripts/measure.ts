import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const CREDENTIAL_REGISTRY_ADDRESS = "0x90ad752125762b2C452F5D4d5f59b9d65D519c52";
  const registry = await ethers.getContractAt("CredentialRegistry", CREDENTIAL_REGISTRY_ADDRESS);

  const [signer] = await ethers.getSigners();

  // ── 1. Measure gas cost + transaction time for issuing a credential ──
  console.log("Issuing a test credential to measure gas cost and transaction time...");

  const testStudent = ethers.Wallet.createRandom().address;
  const documentHash = ethers.keccak256(ethers.toUtf8Bytes(`gas-test-${Date.now()}`));

  const issueStart = Date.now();
  const tx = await registry.issueCredential(
    testStudent,
    "Degree",
    "Gas Measurement Test",
    documentHash,
    ""
  );
  const receipt = await tx.wait();
  const issueEnd = Date.now();

  console.log("\n--- Credential Issuance ---");
  console.log("Gas used:", receipt?.gasUsed.toString());
  console.log("Transaction confirmation time (ms):", issueEnd - issueStart);
  console.log("Transaction hash:", receipt?.hash);

  // Pull the credentialId from the event
  const event = receipt?.logs
    .map((log) => {
      try {
        return registry.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "CredentialIssued");
  const credentialId = event?.args.credentialId;

  // ── 2. Measure read latency for verifyCredential (what a verifier does) ──
  console.log("\n--- Verification Latency (10 runs) ---");
  const latencies: number[] = [];

  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await registry.verifyCredential(credentialId);
    const end = Date.now();
    latencies.push(end - start);
    console.log(`Run ${i + 1}: ${end - start} ms`);
  }

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  console.log(`\nAverage verification latency: ${avgLatency.toFixed(1)} ms`);
  console.log(`Min: ${Math.min(...latencies)} ms, Max: ${Math.max(...latencies)} ms`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});