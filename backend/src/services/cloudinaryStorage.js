const cloudinary = require('cloudinary').v2;

function setting(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function cloudinarySettings() {
  const cloudName = setting('CLOUDINARY_CLOUD_NAME');
  const apiKey = setting('CLOUDINARY_API_KEY');
  const apiSecret = setting('CLOUDINARY_API_SECRET');
  const missing = [];

  if (!cloudName) {
    missing.push('CLOUDINARY_CLOUD_NAME');
  }

  if (!apiKey) {
    missing.push('CLOUDINARY_API_KEY');
  }

  if (!apiSecret) {
    missing.push('CLOUDINARY_API_SECRET');
  }

  if (missing.length > 0) {
    const error = new Error(
      `Cloudinary settings are missing. Add ${missing.join(', ')} to backend/.env.`
    );
    error.code = 'CLOUDINARY_CONFIG';
    throw error;
  }

  return {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  };
}

function uploadDocumentFile({ buffer, brokerageId, leadId, publicId }) {
  cloudinary.config(cloudinarySettings());

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `leadflow/${brokerageId}/${leadId}`,
        public_id: publicId,
        resource_type: 'raw',
        overwrite: false,
        unique_filename: false,
        use_filename: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result || !result.secure_url) {
          reject(new Error('Cloudinary did not return a file URL'));
          return;
        }

        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}

module.exports = {
  uploadDocumentFile,
};
