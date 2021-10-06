import express from "express";
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { Identity, Wallet, Wallets } from "fabric-network";
import fabricCAClient from "fabric-ca-client";
import { IdentityContext } from "fabric-common";
import config from "../config/config.json";
import channelConnection from "../../vars/profiles/mainchannel_connection_for_nodesdk.json";
import { randomUUID } from "crypto";

const walletPath = path.join(__dirname, "..", "wallet");

let app = express();

async function createDefaultAffiliation() {

}

async function createAdminWallet(
    fabricCaClient: fabricCAClient,
    walletsDir: Wallet
) {
    console.log("creating admin Identity");
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

app.get("/", async (req: Request, res: Response) => {
    const userName = randomUUID();
    // const userName = req.body.username;
    const userSecret = "bobpw";
    // const userSecret = req.body.password;
    const userMSPID = "mec-example-com";
    // const userMSPID = req.body.mspid;
    const caURL =
        channelConnection.certificateAuthorities["ca1.mec.example.com"].url;

    let fabricCaClient = new fabricCAClient(caURL);
    const walletsDir = await Wallets.newFileSystemWallet(walletPath);

    if (await walletsDir.get(config.adminUsername)) {
        console.log("Admin wallet already present");
    } else {
        await createAdminWallet(fabricCaClient, walletsDir);
    }

    if (await walletsDir.get(userName)) {
        console.log("User exists. Aborting");
        res.json({ result: "user exists" });
        return;
    } else {
        console.log("User does not exist, creating");
        const adminId = await walletsDir.get(config.adminUsername);
        if (!adminId) throw Error("no admin ID (somehow)");
        const provider = walletsDir
            .getProviderRegistry()
            .getProvider(adminId.type);
        const adminUserContext = await provider.getUserContext(
            adminId,
            config.adminUsername
        );

        try {
            await fabricCaClient.register(
                {
                    enrollmentID: userName,
                    affiliation: config.defaultAffiliation,
                    enrollmentSecret: userSecret,
                    role: "client",
                },
                adminUserContext
            );
        } catch {
            console.error("Error while registering user");
        }
        try {
            const enrollmentResponse = await fabricCaClient.enroll({
                enrollmentID: userName,
                enrollmentSecret: userSecret,
            });
            const userIdentity = {
                credentials: {
                    certificate: enrollmentResponse.certificate,
                    privateKey: enrollmentResponse.key.toBytes(),
                },
                mspId: userMSPID,
                type: "X.509",
            };

            await walletsDir.put(userName, userIdentity);
        } catch {
            console.error("Error while enrolling user");
        }
    }
    console.log("user " + userName + " created!");
    res.json({result: "success"});
});

app.listen(2222, function () {
    console.warn(
        "Example app listening on port 2222! Dude go to http://localhost:2222/"
    );
});
