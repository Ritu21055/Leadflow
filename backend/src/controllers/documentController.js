const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const Document = require('../models/Document');
const Job = require('../models/Job');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { uploadDocumentFile } = require('../services/cloudinaryStorage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function originalFileName(file) {
  const base = path.basename(file.originalname || 'document');
  return base.replace(/[\u0000-\u001f]/g, '').trim() || 'document';
}

function toPublicDocument(document) {
  return {
    id: String(document._id),
    leadId: String(document.leadId),
    fileName: document.fileName,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function caseForUser(req, leadId) {
  if (!mongoose.isValidObjectId(leadId)) {
    return null;
  }

  const lead = await Lead.findOne({
    _id: leadId,
    brokerageId: req.brokerageId,
    duplicateOf: null,
  });

  if (!lead) {
    return null;
  }

  if (req.user.role !== 'client') {
    return lead;
  }

  const user = await User.findById(req.user.userId).select('leadId brokerageId');

  if (!user || !user.leadId || String(user.leadId) !== String(lead._id)) {
    return null;
  }

  if (String(user.brokerageId) !== String(req.brokerageId)) {
    return null;
  }

  return lead;
}

function readUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'File must be 10 MB or smaller' });
      return;
    }

    res.status(400).json({ message: 'Could not read the uploaded file' });
  });
}

async function uploadDocument(req, res) {
  if (!req.file) {
    res.status(400).json({ message: 'Choose a file to upload' });
    return;
  }

  const user = await User.findById(req.user.userId).select('leadId brokerageId role');

  if (
    !user ||
    user.role !== 'client' ||
    !user.leadId ||
    String(user.brokerageId) !== String(req.brokerageId)
  ) {
    res.status(404).json({ message: 'No case is linked to this account' });
    return;
  }

  if (req.body.leadId && String(req.body.leadId) !== String(user.leadId)) {
    res.status(404).json({ message: 'Case not found' });
    return;
  }

  const lead = await caseForUser(req, user.leadId);

  if (!lead) {
    res.status(404).json({ message: 'Case not found' });
    return;
  }

  const extension = path.extname(originalFileName(req.file)).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
  const publicId = `${crypto.randomBytes(12).toString('hex')}${extension}`;
  let fileUrl;

  try {
    fileUrl = await uploadDocumentFile({
      buffer: req.file.buffer,
      brokerageId: String(req.brokerageId),
      leadId: String(lead._id),
      publicId,
    });
  } catch (error) {
    if (error.code === 'CLOUDINARY_CONFIG') {
      res.status(500).json({ message: error.message });
      return;
    }

    console.error('Cloudinary upload failed:', error.message);
    res.status(502).json({ message: 'Could not store the document' });
    return;
  }

  const document = await Document.create({
    leadId: lead._id,
    brokerageId: req.brokerageId,
    uploadedBy: req.user.userId,
    fileName: originalFileName(req.file),
    fileUrl,
    status: 'uploaded',
  });

  await Job.create({
    type: 'check-document',
    brokerageId: document.brokerageId,
    documentId: document._id,
    leadId: document.leadId,
    payload: {
      name: document.fileName,
      source: 'document-check',
    },
  });

  res.status(201).json({ document: toPublicDocument(document) });
}

async function listDocuments(req, res) {
  const lead = await caseForUser(req, req.params.leadId);

  if (!lead) {
    res.status(404).json({ message: 'Case not found' });
    return;
  }

  const documents = await Document.find({
    leadId: lead._id,
    brokerageId: req.brokerageId,
  }).sort({ createdAt: -1 });

  res.json({ documents: documents.map(toPublicDocument) });
}

module.exports = {
  readUpload,
  uploadDocument,
  listDocuments,
};
