import express from "express";
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { Wallet, Wallets, Gateway, X509Identity } from "fabric-network";
import fabricCAClient from "fabric-ca-client";
import { IdentityContext, User } from "fabric-common";
import config from "../config/config.json";
import channelConnection from "../../vars/profiles/mainchannel_connection_for_nodesdk.json";
import { randomUUID } from "crypto";
import cors from "cors";
import bodyParser from "body-parser";
import jwt, { Jwt } from "jsonwebtoken";
import crypto from "crypto";
import { openDb, UserRow } from "./db";
import bcrypt from "bcrypt";

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
        // generates token and sends it back
        await registerNewUser(req, res);
    }
);

router.post(
    "/login",
    async (
        req: Request<
            unknown,
            unknown,
            {
                Matrícula: string;
                Senha: string;
            }
        >,
        res: Response
    ) => {
        console.log("log in attempt" + req.body);
        const authenticated = await authenticate(req, res);
        if (authenticated) {
            const token = await generateToken(req.body.Matrícula);
            res.status(200).json({ result: "success", token: token });
        }
        // if not authenticated, authenticate will send the error
    }
);

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

router.get(
    "/me",
    async (req: Request, res: Response) => {
        const tokenData = verifyToken(req.headers.authorization as string);
        if (tokenData) {
            console.log(tokenData)
            const walletId = tokenData.user.user;
            res.status(200).json({beneficiary: "dude", balance: 200});
        } else {
            res.status(403).json();
        }
    }
)

async function generateToken(userName: string) {
    const walletsDir = await Wallets.newFileSystemWallet(walletPath);

    const newWallet = await walletsDir.get(userName);

    const walletHasher = crypto.createHash("sha1");
    const walletHash = walletHasher
        .update(Buffer.from(JSON.stringify(newWallet)))
        .digest();
    const body = { _id: walletHash, user: userName };
    return jwt.sign({ user: body }, "SECRET_JWT_SIGN_TOKEN", {
        expiresIn: "10h",
    });
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
    await openDb().then((db) =>
    db.run(
        "INSERT INTO users VALUES(?,?,?,?,?,?)",
        config.adminUsername,
        "",
        "",
        "",
        bcrypt.hashSync(config.adminSecret, bcrypt.genSaltSync()),
        ""
    )
);
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
    await openDb().then((db) =>
        db.run(
            "INSERT INTO users VALUES(?,?,?,?,?,?)",
            req.body.Matrícula,
            req.body.Nome,
            req.body.CPF,
            req.body["E-mail"],
            bcrypt.hashSync(req.body.Senha, bcrypt.genSaltSync()),
            req.body.Telefone
        )
    );

    const userName = req.body.Matrícula;
    let userSecret = req.body.Senha;
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
            userSecret = await fabricCaClient.register(
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
                        { name: "pw", value: req.body.Senha },
                    ],
                },
                adminUserContext
            );
        } catch {
            console.error("Error while registering user");
            res.status(400).json({ result: "Error while registering user" });
        }
        try {
            const enrollmentResponse = await fabricCaClient.enroll({
                enrollmentID: userName,
                enrollmentSecret: userSecret,
                // attr_reqs: [{name: "cpf", optional: true}]
            });
            const userIdentity: X509Identity = {
                credentials: {
                    certificate: enrollmentResponse.certificate,
                    privateKey: enrollmentResponse.key.toBytes(),
                },
                mspId: userMSPID,
                type: "X.509",
                // nome: req.body.Nome,
                // cpf: req.body.CPF,
                // phone: req.body.Telefone,
                // email: req.body["E-mail"],
            };

            await walletsDir.put(userName, userIdentity);
        } catch {
            console.error("Error while enrolling user");
            res.status(400).json({ result: "Error while enrolling user" });
        }
    }
    console.log("user " + userName + " created!");

    const token = generateToken(userName);
    // is now logged in
    res.status(200).json({ result: "success", token: token });
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

function verifyToken(
    accessTokenHeader: string
) {
    if (typeof accessTokenHeader !== "undefined") {
        console.log(accessTokenHeader.split(" "));
        const token = accessTokenHeader.split(" ")[1];
        const jwtData = jwt.verify(token, "SECRET_JWT_SIGN_TOKEN", {complete: true});

        return jwtData.payload as jwt.JwtPayload;
    } else {
        return null;
    }
}

async function authenticate(
    req: Request<
        unknown,
        unknown,
        {
            Matrícula: string;
            Senha: string;
        }
    >,
    res: Response
    // , next: () => void
) {
    const userRow = await openDb().then((db) =>
        db.get<UserRow>(
            `SELECT * FROM users WHERE walletId = ?`,
            req.body.Matrícula
        )
    );
    if (userRow && bcrypt.compareSync(req.body.Senha, userRow.pw)) {
        return true;
    } else {
        res.status(403).json({ result: "Username / password invalid" });
        return false;
    }
}

app.listen(2222, function () {
    console.warn(
        "Setup and create new identity at http://localhost:2222/ \n" +
            "Send tokens with bob at http://localhost:2222/getBalance/1d183e29-ccf2-4f27-b0b0-4cac6b9cd225"
    );
});
