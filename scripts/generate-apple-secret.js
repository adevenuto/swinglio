const jwt = require("jsonwebtoken");
const fs = require("fs");

const privateKey = fs.readFileSync("/path/to/AuthKey_XXXXXX.p8");

const token = jwt.sign({}, privateKey, {
  algorithm: "ES256",
  expiresIn: "180d",
  audience: "https://appleid.apple.com",
  issuer: "YOUR_TEAM_ID",
  subject: "com.swinglio.app.auth",
  keyid: "YOUR_KEY_ID",
});

console.log(token);
