const Document = require('../models/Document');

function publicDocument(document) {
  return {
    id: String(document._id),
    leadId: String(document.leadId),
    fileName: document.fileName,
    status: document.status,
  };
}

function watchDocumentStatus(io) {
  const stream = Document.watch(
    [
      {
        $match: {
          operationType: 'update',
          'updateDescription.updatedFields.status': { $exists: true },
        },
      },
    ],
    { fullDocument: 'updateLookup' }
  );

  stream.on('change', (change) => {
    const document = change.fullDocument;

    if (!document || !document.brokerageId) {
      return;
    }

    io.to(`brokerage:${document.brokerageId}`).emit('document:status', {
      document: publicDocument(document),
    });
  });

  stream.on('error', (error) => {
    console.error('Document status watch failed:', error.message);
  });

  console.log('Watching document status changes');
}

module.exports = watchDocumentStatus;
