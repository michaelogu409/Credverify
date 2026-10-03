import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const CREDENTIAL_REGISTRY_ADDRESS = "0x90ad752125762b2C452F5D4d5f59b9d65D519c52";

  // The wallet you want to authorize as an institution.
  // By default this uses your own deployer wallet, so your institution
  // page can issue credentials with the same account you deployed with.
  const [deployer] = await ethers.getSigners();
  const institutionWallet = deployer.address;

  const registry = await ethers.getContractAt("CredentialRegistry", CREDENTIAL_REGISTRY_ADDRESS);

  console.log(`Authorizing ${institutionWallet} as an institution...`);
  const tx = await registry.authorizeInstitution(institutionWallet);
  await tx.wait();
  console.log("Done! Transaction hash:", tx.hash);

  const isAuthorized = await registry.authorizedInstitutions(institutionWallet);
  console.log("Is authorized:", isAuthorized);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});