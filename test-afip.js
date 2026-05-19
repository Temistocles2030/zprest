const forge = require("node-forge");
const https = require("https");
const fs = require("fs");

const envContent = fs.readFileSync(".env.local", "utf-8");
const certB64 = envContent.match(/AFIP_CERT_BASE64=([^\r\n]+)/)[1].trim();
const keyB64 = envContent.match(/AFIP_KEY_BASE64=([^\r\n]+)/)[1].trim();

const certPem = Buffer.from(certB64, "base64").toString("utf-8");
const keyPem = Buffer.from(keyB64, "base64").toString("utf-8");

const cert = forge.pki.certificateFromPem(certPem);
const privateKey = forge.pki.privateKeyFromPem(keyPem);

console.log("Cert subject:", cert.subject.getField("CN")?.value);
console.log("Cert valid until:", cert.validity.notAfter);
console.log("Cert expired:", new Date() > cert.validity.notAfter);

const now = new Date();
const gen = new Date(now.getTime() - 10 * 60 * 1000);
const exp = new Date(now.getTime() + 10 * 60 * 1000);
const fmt = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
const uid = Math.floor(Date.now() / 1000);

const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uid}</uniqueId>
    <generationTime>${fmt(gen)}</generationTime>
    <expirationTime>${fmt(exp)}</expirationTime>
  </header>
  <service>ws_sr_padron_a13</service>
</loginTicketRequest>`;

const p7 = forge.pkcs7.createSignedData();
p7.content = forge.util.createBuffer(tra, "utf8");
p7.addCertificate(cert);
p7.addSigner({
  key: privateKey,
  certificate: cert,
  digestAlgorithm: forge.pki.oids.sha1,
  authenticatedAttributes: [],
});
p7.sign();
const cms = forge.util.encode64(
  forge.asn1.toDer(p7.toAsn1()).getBytes()
);

console.log("CMS length:", cms.length);

const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

const req = https.request(
  {
    hostname: "wsaa.afip.gov.ar",
    path: "/ws/services/LoginCms",
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "",
    },
  },
  (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      if (data.includes("faultstring")) {
        const m = data.match(/<faultstring>(.*?)<\/faultstring>/);
        console.log("AFIP ERROR:", m ? m[1] : data.slice(0, 300));
      } else if (data.includes("token")) {
        console.log("SUCCESS — AFIP login OK");
      } else {
        console.log("RESPUESTA:", data.slice(0, 300));
      }
    });
  }
);
req.on("error", (e) => console.log("HTTP ERROR:", e.message));
req.write(soap);
req.end();
