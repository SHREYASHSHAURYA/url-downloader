const dns = require("dns").promises;
const net = require("net");

function isPrivateIP(ip) {
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") || // covers 172.20-172.29
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.") ||
    ip === "127.0.0.1" ||
    ip === "::1"
  );
}

async function isSafeHost(url) {
  try {
    const hostname = new URL(url).hostname;

    // Block direct localhost
    if (hostname === "localhost") return false;

    const addresses = await dns.lookup(hostname, { all: true });

    for (const addr of addresses) {
      if (isPrivateIP(addr.address)) {
        return false;
      }
    }

    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { isSafeHost };
