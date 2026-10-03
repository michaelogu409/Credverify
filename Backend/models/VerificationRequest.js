const mongoose = require('mongoose');

const VerificationRequestSchema = new mongoose.Schema(
  {
    credentialId: {
      type: String,
      required: true,
    },
    degreeTitle: String,
    institutionName: String,
    studentWallet: String,
    verifierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verifierName: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'denied'],
      default: 'pending',
    },
    institutionReply: String,
    respondedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('VerificationRequest', VerificationRequestSchema);