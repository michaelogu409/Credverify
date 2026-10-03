const mongoose = require('mongoose');

const CredentialSchema = new mongoose.Schema(
  {
    credentialId: {
      type: String,
      required: true,
      unique: true,
    },
    studentWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    institutionWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    institutionName: {
      type: String,
      required: true,
    },
    degreeTitle: {
      type: String,
      required: true,
    },
    classification: {
      type: String,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    sha256Hash: {
      type: String,
      required: true,
      unique: true,
    },
    ipfsCID: {
      type: String,
      required: true,
    },
    ipfsUrl: {
      type: String,
    },
    txHash: {
      type: String,
    },
    blockNumber: {
      type: Number,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'issued', 'revoked'],
      default: 'pending',
    },
    sharingTokens: [
      {
        verifierWallet: { type: String, lowercase: true },
        fieldsAllowed: [String],
        expiryDate: Date,
        revoked: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Credential', CredentialSchema);