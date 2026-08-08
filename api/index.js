// Vercel entrypoint: imports the Express app without triggering app.listen()
// (guarded in server/server.js by `require.main === module`), then Vercel's
// Node runtime invokes the exported app directly as the request handler.
module.exports = require('../server/server');
