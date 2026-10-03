const blockchainService = require('../services/blockchain.service');
const Credential = require('../models/Credential');
const VerificationRequest = require('../models/VerificationRequest');

// POST /api/verification/verify
const verifyCredential = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Credential PDF file is required for verification.' });
    }

    // Step 1: Compute SHA-256 hash of the submitted document
    const submittedHash = blockchainService.generateSHA256Hash(req.file.buffer);

    // Step 2: Find a matching record in our database by hash
    const credential = await Credential.findOne({ sha256Hash: submittedHash });

    if (!credential) {
      return res.json({
        result: 'TAMPERED',
        message: 'This document does not match any credential on record. It may have been altered or was never issued.',
        submittedHash,
      });
    }

    // Step 3: Confirm the credential's current status directly on the blockchain
    const onChainResult = await blockchainService.verifyCredentialOnChain(credential.credentialId);

    if (!onChainResult.exists) {
      return res.json({
        result: 'TAMPERED',
        message: 'This credential could not be found on the blockchain.',
        submittedHash,
      });
    }

    if (!onChainResult.valid) {
      return res.json({
        result: 'REVOKED',
        message: 'This credential exists on the blockchain but has been revoked by the issuing institution.',
        submittedHash,
        credentialId: credential.credentialId,
      });
    }

    res.json({
      result: 'AUTHENTIC',
      message: 'This credential is authentic. It matches the record stored on the Ethereum blockchain.',
      submittedHash,
      onChainData: {
        credentialId: credential.credentialId,
        student: onChainResult.student,
        institution: onChainResult.institution,
        issuedAt: new Date(Number(onChainResult.issuedAt) * 1000).toISOString(),
      },
      metadata: {
        degreeTitle: credential.degreeTitle,
        institutionName: credential.institutionName,
        classification: credential.classification,
        issueDate: credential.issueDate,
        ipfsCID: credential.ipfsCID,
        ipfsUrl: credential.ipfsUrl,
        txHash: credential.txHash,
        sepoliaExplorerUrl: `https://sepolia.etherscan.io/tx/${credential.txHash}`,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { verifyCredential };