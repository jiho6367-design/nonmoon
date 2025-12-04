const session = require("express-session");
const FileStore = require("session-file-store")(session);

// Copy this file to sessionOption.js and adjust the secret/path
// before starting the server. SESSION_SECRET should be long and random.
const sessionOption = {
  secret: process.env.SESSION_SECRET || "replace-this-session-secret",
  resave: false,
  saveUninitialized: false,
  store: new FileStore({
    path: process.env.SESSION_DIR || "./sessions", // make sure the folder exists
  }),
  cookie: {
    httpOnly: true,
    secure: false, // set to true if you serve over HTTPS
    maxAge: 1000 * 60 * 60, // 1 hour
  },
};

module.exports = sessionOption;
