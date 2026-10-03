const LABELS = {
  uploaded: 'Uploaded',
  checking: 'Checking',
  verified: 'Verified',
  failed: 'Failed',
};

export function documentStatusLabel(status) {
  return LABELS[status] || status;
}
