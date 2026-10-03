function clientOrigin() {
  if (process.env.CLIENT_ORIGIN) {
    return process.env.CLIENT_ORIGIN;
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://leadflow-frontend-steel.vercel.app';
  }

  return 'http://localhost:5173';
}

module.exports = clientOrigin;
