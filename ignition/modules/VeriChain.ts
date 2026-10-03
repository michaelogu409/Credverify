import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VeriChainModule", (m) => {
  const credentialRegistry = m.contract("CredentialRegistry");
  const accessControl = m.contract("AccessControl");
  const progressTracker = m.contract("ProgressTracker");

  return { credentialRegistry, accessControl, progressTracker };
});
