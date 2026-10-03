const { ethers } = require('ethers');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');

// ── Provider and Signer Setup ───────────────────────────────
const getProvider = () => {
  return new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
};

const getSigner = () => {
  const provider = getProvider();
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
};

// ── ABI Definitions (matches the deployed contracts) ─────────
const CREDENTIAL_REGISTRY_ABI = [
  'function issueCredential(address student, string credentialType, string programme, string documentHash, string ipfsCID) external returns (bytes32)',
  'function verifyCredential(bytes32 credentialId) external view returns (bool exists, bool valid, address student, address institution, string credentialType, string programme, string documentHash, uint256 issuedAt)',
  'function revokeCredential(bytes32 credentialId) external',
  'function getCredentialsOf(address student) external view returns (bytes32[])',
  'event CredentialIssued(bytes32 indexed credentialId, address indexed student, address indexed institution, string credentialType)',
];

const PROGRESS_TRACKER_ABI = [
  'function recordProgress(address student, string courseName, string semester, string grade, uint256 creditUnits) external',
  'function getProgress(address student) external view returns (tuple(string courseName, string semester, string grade, uint256 creditUnits, address institution, uint256 recordedAt)[])',
  'function getTotalCredits(address student) external view returns (uint256)',
];

// ── Contract Instances ───────────────────────────────────────
const getCredentialRegistry = () => {
  const signer = getSigner();
  return new ethers.Contract(
    process.env.CREDENTIAL_REGISTRY_ADDRESS,
    CREDENTIAL_REGISTRY_ABI,
    signer
  );
};

const getProgressTracker = () => {
  const signer = getSigner();
  return new ethers.Contract(
    process.env.PROGRESS_TRACKER_ADDRESS,
    PROGRESS_TRACKER_ABI,
    signer
  );
};

// ── SHA-256 Hash Generation ──────────────────────────────────
const generateSHA256Hash = (fileBuffer) => {
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// ── IPFS Upload via Pinata ───────────────────────────────────
const uploadToIPFS = async (fileBuffer, fileName) => {
  const formData = new FormData();
  formData.append('file', fileBuffer, { filename: fileName });

  const metadata = JSON.stringify({ name: fileName });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({ cidVersion: 0 });
  formData.append('pinataOptions', options);

  const response = await axios.post(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    formData,
    {
      maxBodyLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
      },
    }
  );

  const cid = response.data.IpfsHash;
  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
  return { cid, ipfsUrl };
};

// ── Issue Credential on Blockchain ───────────────────────────
const issueCredentialOnChain = async (student, credentialType, programme, documentHash, ipfsCID) => {
  const contract = getCredentialRegistry();
  const tx = await contract.issueCredential(student, credentialType, programme, documentHash, ipfsCID);
  const receipt = await tx.wait();

  // Pull the credentialId out of the CredentialIssued event
  const event = receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === 'CredentialIssued');

  return {
    credentialId: event.args.credentialId,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
};

// ── Verify Credential on Blockchain (by credentialId) ────────
const verifyCredentialOnChain = async (credentialId) => {
  const provider = getProvider();
  const contract = new ethers.Contract(
    process.env.CREDENTIAL_REGISTRY_ADDRESS,
    CREDENTIAL_REGISTRY_ABI,
    provider // read-only, no signer needed
  );
  const result = await contract.verifyCredential(credentialId);
  return {
    exists: result.exists,
    valid: result.valid,
    student: result.student,
    institution: result.institution,
    credentialType: result.credentialType,
    programme: result.programme,
    documentHash: result.documentHash,
    issuedAt: result.issuedAt.toString(),
  };
};

// ── Record Progress on Blockchain ───────────────────────────
const recordProgressOnChain = async (student, courseName, semester, grade, creditUnits) => {
  const contract = getProgressTracker();
  const tx = await contract.recordProgress(student, courseName, semester, grade, creditUnits);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
};

module.exports = {
  generateSHA256Hash,
  uploadToIPFS,
  issueCredentialOnChain,
  verifyCredentialOnChain,
  recordProgressOnChain,
};