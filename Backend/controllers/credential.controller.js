const blockchainService = require('../services/blockchain.service');
const Credential = require('../models/Credential');
const User = require('../models/User');

// POST /api/credentials/issue
const issueCredential = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Credential PDF file is required.' });
    }

    const { studentWallet, degreeTitle, classification, issueDate, credentialType } = req.body;

    if (!studentWallet || !degreeTitle || !issueDate) {
      return res.status(400).json({ error: 'studentWallet, degreeTitle, and issueDate are required.' });
    }

    // Step 1: Generate SHA-256 hash of the document
    const sha256Hash = blockchainService.generateSHA256Hash(req.file.buffer);

    // Step 2: Check if this exact document was already issued
    const existing = await Credential.findOne({ sha256Hash });
    if (existing) {
      return res.status(409).json({ error: 'This credential has already been issued.' });
    }

    // Step 3: Upload to IPFS
    const { cid, ipfsUrl } = await blockchainService.uploadToIPFS(
      req.file.buffer,
      req.file.originalname
    );

    // Step 4: Issue on the blockchain
    const institutionUser = await User.findOne({ walletAddress: req.user.walletAddress });

    const { credentialId, txHash, blockNumber } = await blockchainService.issueCredentialOnChain(
      studentWallet,
      credentialType || 'Degree',
      degreeTitle,
      sha256Hash,
      cid
    );

    // Step 5: Save to MongoDB
    const credential = await Credential.create({
      credentialId,
      studentWallet: studentWallet.toLowerCase(),
      institutionWallet: req.user.walletAddress,
      institutionName: institutionUser?.institutionName || 'Unknown Institution',
      degreeTitle,
      classification,
      issueDate: new Date(issueDate),
      sha256Hash,
      ipfsCID: cid,
      ipfsUrl,
      txHash,
      blockNumber,
      status: 'issued',
    });

    res.status(201).json({
      message: 'Credential issued successfully on the blockchain.',
      credential: {
        credentialId: credential.credentialId,
        sha256Hash: credential.sha256Hash,
        ipfsCID: credential.ipfsCID,
        ipfsUrl: credential.ipfsUrl,
        txHash: credential.txHash,
        blockNumber: credential.blockNumber,
        sepoliaExplorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
      },
    });
  } catch (error) {
    console.error('Issue credential error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/credentials/my-credentials
const getMyCredentials = async (req, res) => {
  try {
    const credentials = await Credential.find({
      studentWallet: req.user.walletAddress,
    }).sort({ createdAt: -1 });

    res.json({ credentials });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/credentials/issued
const getIssuedCredentials = async (req, res) => {
  try {
    const credentials = await Credential.find({
      institutionWallet: req.user.walletAddress,
    }).sort({ createdAt: -1 });

    res.json({ credentials });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/credentials/record-progress
const recordProgress = async (req, res) => {
  try {
    const { studentWallet, courseName, semester, grade, creditUnits } = req.body;

    if (!studentWallet || !courseName || !semester || !grade || creditUnits === undefined) {
      return res.status(400).json({
        error: 'studentWallet, courseName, semester, grade, and creditUnits are required.',
      });
    }

    const { txHash } = await blockchainService.recordProgressOnChain(
      studentWallet,
      courseName,
      semester,
      grade,
      creditUnits
    );

    res.json({
      message: 'Academic progress recorded on the blockchain.',
      txHash,
      sepoliaExplorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getMyProgress = async (req, res) => {
  try {
    if (!req.user.walletAddress) {
      return res.status(400).json({ error: 'Connect your wallet first.' });
    }
    const progress = await blockchainService.getProgressHistoryOnChain(req.user.walletAddress);
    res.json({ progress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
module.exports = {
  issueCredential,
  getMyCredentials,
  getIssuedCredentials,
  recordProgress,
  getMyProgress, 
};