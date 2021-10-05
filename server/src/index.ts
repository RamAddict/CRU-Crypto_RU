import express from "express";
import type {Request, Response} from "express";
import path from "path";
import fs from "fs";
import {Wallet, Wallets} from "fabric-network";
import fabricCAClient from "fabric-ca-client";
import {} from "fabric-common";
import config from "../config/config.json";
import channelConnection from "../../vars/profiles/mainchannel_connection_for_nodesdk.json";

const walletPath = path.join(__dirname, "..", "wallet");

let app = express();

async function createAdminWallet(fabricCaClient: any, walletsDir: any) {
    console.log("creating admin Identity")
    // enroll the username and password
    let adminEnrollment = await fabricCaClient.enroll({
        enrollmentID: config.adminUsername,
        enrollmentSecret: config.adminSecret,
    });
    
    // create admin identity
    let identity = {
        credentials: {
            certificate: adminEnrollment.certificate,
            privateKey: adminEnrollment.key.toBytes(),
        },
        mspId: config.orgMSPID,
        type: "X.509",
    };
    await walletsDir.put(config.adminUsername, identity);
}

app.get('/', async (req: Request, res: Response) => {
    const userName = "bob";
    // const userName = req.body.username;
    const userSecret = "bobpw";
    // const userSecret = req.body.password;
    const userMSPID = "mec-example-com";
    // const userMSPID = req.body.mspid;
    const caURL = channelConnection.certificateAuthorities["ca1.mec.example.com"].url;
    console.log(caURL);
    
    const fabricCaClient = new fabricCAClient(caURL);
    const walletsDir = await Wallets.newFileSystemWallet(walletPath);

    if (await walletsDir.get(config.adminUsername))
    {
        console.log("Admin wallet already present");
    } else {
        createAdminWallet(fabricCaClient, walletsDir);
    }

    if (await walletsDir.get(userName)) {
        console.log("User exists. Aborting");
        res.json({ "result": "user exists" });
        return;
    } else {
        console.log("User does not exist. Creating");


    }

    res.send(walletsDir);
});

app.listen(2222, function () {
    console.log('Example app listening on port 2222! Go to http://localhost:2222/')
})


