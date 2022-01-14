import express from "express";
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { Identity, Wallet, Wallets, Gateway } from "fabric-network";
import fabricCAClient from "fabric-ca-client";
import { IdentityContext } from "fabric-common";
import config from "../config/config.json";
import channelConnection from "../../vars/profiles/mainchannel_connection_for_nodesdk.json";
import { randomUUID } from "crypto";
import cors from "cors";
import bodyParser from "body-parser";

const walletPath = path.join(__dirname, "..", "wallet");

let app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
const router = express.Router();
app.use("/", router);

router.post(
    "/register",
    async (
        req: Request<
            unknown,
            unknown,
            {
                Nome: string;
                CPF: string;
                Matrícula: string;
                "E-mail": string;
                Senha: string;
                Telefone: string;
            }
        >,
        res: Response
    ) => {
        console.log(req.body);

        await registerNewUser(req, res);
    }
);

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

async function registerNewUser(
    req: Request<
        unknown,
        unknown,
        {
            Nome: string;
            CPF: string;
            Matrícula: string;
            "E-mail": string;
            Senha: string;
            Telefone: string;
        }
    >,
    res: Response
) {
    const userName = req.body.Matrícula;
    const userSecret = req.body.Senha;
    const userMSPID = "student-example-com";
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
        res.status(400).json({ result: "user exists" });
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

        let hasAffiliationService = false;
        try {
            (
                await fabricCaClient
                    .newAffiliationService()
                    .getOne("department1", adminUserContext)
            ).success;
        } catch (e) {
            // console.log(e)
            hasAffiliationService = true;
        }
        if (hasAffiliationService) {
            console.log("Creating affiliation");
            await fabricCaClient
                .newAffiliationService()
                .create({ name: "department1" }, adminUserContext);
        }

        try {
            await fabricCaClient.register(
                {
                    enrollmentID: userName,
                    affiliation: config.defaultAffiliation,
                    enrollmentSecret: userSecret,
                    role: "client",
                    attrs: [
                        { name: "nome", value: req.body.Nome },
                        { name: "cpf", value: req.body.CPF },
                        { name: "phone", value: req.body.Telefone },
                        { name: "email", value: req.body["E-mail"] },
                    ],
                },
                adminUserContext
            );
        } catch {
            console.error("Error while registering user");
            res.status(400).json({result: "Error while registering user"});
        }
        try {
            const enrollmentResponse = await fabricCaClient.enroll({
                enrollmentID: userName,
                enrollmentSecret: userSecret,
                // attr_reqs: [{name: "cpf", optional: true}]
            });
            const userIdentity = {
                credentials: {
                    certificate: enrollmentResponse.certificate,
                    privateKey: enrollmentResponse.key.toBytes(),
                },
                mspId: userMSPID,
                type: "X.509",
                nome: req.body.Nome,
                cpf: req.body.CPF,
                phone: req.body.Telefone,
                email: req.body["E-mail"],
            };

            await walletsDir.put(userName, userIdentity);
        } catch {
            console.error("Error while enrolling user");
            res.status(400).json({result: "Error while enrolling user"});
        }
    }
    console.log("user " + userName + " created!");
    // console.log(await walletsDir.get("55405"));
    res.status(200).json({result: "success"});
}

app.get("/getBalance/:walletId", async (req: Request, res: Response) => {
    const walletsDir = await Wallets.newFileSystemWallet(walletPath);
    const user = await walletsDir.get(req.params.walletId);
    console.log(user);

    if (user) {
        console.log("found user");
        const gateway = new Gateway();
        await gateway.connect(channelConnection, {
            wallet: walletsDir,
            identity: user,
            discovery: config.gatewayDiscovery,
        });
        // console.log("found user1");

        const network = await gateway.getNetwork("mainchannel");
        const contract = network.getContract("mycc");
        const getBalanceTransaction = contract.createTransaction("getBalance");
        // console.log("found user2");

        const balance = await getBalanceTransaction.submit("mec-example-com");
        res.json(balance.toString());
    } else {
        res.sendStatus(403);
    }
    // res.json({ result: "success" });
});

app.listen(2222, function () {
    console.warn(
        "Setup and create new identity at http://localhost:2222/ \n" +
            "Send tokens with bob at http://localhost:2222/getBalance/1d183e29-ccf2-4f27-b0b0-4cac6b9cd225"
    );
});
