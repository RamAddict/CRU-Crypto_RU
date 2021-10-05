"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fabric_network_1 = require("fabric-network");
const fabric_ca_client_1 = __importDefault(require("fabric-ca-client"));
const config_json_1 = __importDefault(require("../config/config.json"));
// const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "config", "config.json"), "utf-8"));
const channelConnection = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, "..", "..", "vars", "profiles", "mainchannel_connection_for_nodesdk.json"), "utf-8"));
const walletPath = path_1.default.join(__dirname, "..", "wallet");
let app = (0, express_1.default)();
async function createAdminWallet(fabricCaClient, walletsDir) {
    console.log("creating admin Identity");
    // create admin identity
    let adminEnrollment = await fabricCaClient.enroll({
        enrollmentID: config_json_1.default.adminUsername,
        enrollmentSecret: config_json_1.default.adminSecret,
    });
    let identity = {
        credentials: {
            certificate: adminEnrollment.certificate,
            privateKey: adminEnrollment.key.toBytes(),
        },
        mspId: config_json_1.default.orgMSPID,
        type: "X.509",
    };
    await walletsDir.put(config_json_1.default.adminUsername, identity);
}
app.get('/', async (req, res) => {
    const userName = "bob";
    // const userName = req.body.username;
    const userSecret = "bobpw";
    // const userSecret = req.body.password;
    const userMSPID = "mec-example-com";
    // const userMSPID = req.body.mspid;
    const caURL = channelConnection.certificateAuthorities["ca1.mec.example.com"].url;
    console.log(caURL);
    const fabricCaClient = new fabric_ca_client_1.default(caURL);
    const walletsDir = await fabric_network_1.Wallets.newFileSystemWallet(walletPath);
    if (await walletsDir.get(config_json_1.default.adminUsername)) {
        console.log("Admin wallet already present");
    }
    else {
        createAdminWallet(fabricCaClient, walletsDir);
    }
    if (await walletsDir.get(userName)) {
        console.log("User exists. Aborting");
        res.json({ "result": "user exists" });
        return;
    }
    else {
        console.log("User does not exist. Creating");
    }
    res.send(walletsDir);
});
app.listen(2222, function () {
    console.log('Example app listening on port 2222! Go to http://localhost:2222/');
});
