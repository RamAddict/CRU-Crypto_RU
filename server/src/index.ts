import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { Wallet, Wallets, Gateway, X509Identity } from "fabric-network";
import fabricCAClient from "fabric-ca-client";
import { IdentityContext, User } from "fabric-common";
import config from "../config/config.json";
// @ts-ignore
import channelConnection from "../../vars/profiles/mainchannel_connection_for_nodesdk.json";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getUserFromId, openDb, UserRow } from "./db";
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
        console.log("log in attempt" + req.body.Matrícula + req.body.Senha);
        const authenticated = await authenticate(req, res);
        if (authenticated) {
            const token = await generateToken(
                req.body.Matrícula === "admin"
                    ? req.body.Matrícula
                    : req.body.Matrícula + "_"
            );
            res.status(200).json({ result: "success", token: token });
        }
        // if not authenticated, authenticate will send the error
    }
);

router.get("/transfer", async (req: Request, res: Response) => {
    const tokenData = verifyToken(req.headers.authorization as string);
    if (!tokenData) return res.status(403).json();
    if (req.query.search === "true") {
        const walletId =
            req.query.query === "admin"
                ? req.query.query
                : req.query.query + "_";
        console.log(walletId);
        const userRow = await openDb().then((db) =>
            db.get<UserRow>(`SELECT * FROM users WHERE walletId = ?`, walletId)
        );
        console.log(userRow);
        if (userRow) return res.status(200).json({ result: "success" });
        else return res.status(400).json();
    }
});

router.post("/transfer", async (req: Request, res: Response) => {
    const tokenData = verifyToken(req.headers.authorization as string);
    if (!tokenData) return res.status(403).json();
    const walletId = tokenData.user.user;
    const to = req.body.to === "admin" ? req.body.to : req.body.to + "_";
    const quantity = req.body.amount;
    const walletsDir = await Wallets.newFileSystemWallet(walletPath);
    const user = await walletsDir.get(walletId);
    if (!user) return res.status(403).json();
    const gateway = new Gateway();
    await gateway.connect(channelConnection, {
        wallet: walletsDir,
        identity: user,
        discovery: config.gatewayDiscovery,
    });
    const network = await gateway.getNetwork("mainchannel");
    const contract = network.getContract("mycc");
    const sendTokensTransaction = contract.createTransaction("sendTokens");
    let resp;
    const now = new Date().toString();
    try {
        resp = await sendTokensTransaction.submit(walletId, to, quantity, now);
        console.log("response: " + resp);
    } catch (e: any) {
        if ((e.responses[0].response.message as string).includes("funds"))
            return res
                .status(500)
                .json({ result: "Você não possui fundos suficientes" });
        else if ((e.responses[0].response.message as string).includes("0.1"))
            return res
                .status(500)
                .json({ result: "Não permitido enviar menos que 0.1" });
        else if ((e.responses[0].response.message as string).includes("same"))
            return res
                .status(500)
                .json({ result: "Não permitido enviar para si mesmo" });
        else if (
            (e.responses[0].response.message as string).includes("parameters")
        )
            return res.status(500).json({ result: "params" });
    }
    return res.status(200).json({ result: "success" });
});

router.get("/me", async (req: Request, res: Response) => {
    const tokenData = verifyToken(req.headers.authorization as string);
    if (!tokenData) return res.status(403).json({ result: "expired" });
    if (req.query.includeProfile === "true") {
        console.log("update");
        const userRow = await openDb().then((db) =>
            db.get<UserRow>(
                `SELECT * FROM users WHERE walletId = ?`,
                tokenData.user.user
            )
        );
        return res.status(200).json({
            profile: {
                Nome: userRow?.name,
                CPF: userRow?.ssn,
                "E-mail": userRow?.email,
                Senha: "",
                Telefone: userRow?.phone,
            },
        });
    }
    let balance = "";
    console.log(tokenData);
    const walletId = tokenData.user.user;
    const walletsDir = await Wallets.newFileSystemWallet(walletPath);
    const user = await walletsDir.get(walletId);
    // console.log("found user" + user?.mspId);
    if (user) {
        const gateway = new Gateway();
        await gateway.connect(channelConnection, {
            wallet: walletsDir,
            identity: user,
            discovery: config.gatewayDiscovery,
        });
        const network = await gateway.getNetwork("mainchannel");
        const contract = network.getContract("mycc");
        const getBalanceTransaction = contract.createTransaction("getBalance");
        balance = (await getBalanceTransaction.submit(walletId)).toString();
    } else {
        console.error("oh no");
        return res.status(403).json("couldn't find wallet");
    }
    const usr = await getUserFromId(walletId);

    return res.status(200).json({
        beneficiary: usr?.name,
        balance: Number.parseFloat(balance),
        walletId: walletId,
    });
});

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
            "Admin",
            "",
            "",
            bcrypt.hashSync(config.adminSecret, bcrypt.genSaltSync()),
            ""
        )
    );
    console.log("creating admin Identity");
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
    const userName = req.body.Matrícula + "_";
    await openDb()
        .then((db) =>
            db.run(
                "INSERT INTO users VALUES(?,?,?,?,?,?)",
                userName,
                req.body.Nome,
                req.body.CPF,
                req.body["E-mail"],
                bcrypt.hashSync(req.body.Senha, bcrypt.genSaltSync()),
                req.body.Telefone
            )
        )
        .catch((e) => {
            console.log(e);
            res.status(400).json({ result: "Error user exists" });
        });

    let userSecret = req.body.Senha;
    const userMSPID = "mec-example-com";
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
                    // attrs: [
                    // { name: "nome", value: req.body.Nome },
                    // { name: "cpf", value: req.body.CPF },
                    // { name: "phone", value: req.body.Telefone },
                    // { name: "email", value: req.body["E-mail"] },
                    // { name: "pw", value: req.body.Senha },
                    // ],
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

    const token = await generateToken(userName);
    console.log("token generated: " + token);
    // is now logged in
    res.status(200).json({ result: "success", token: token });
}

app.get("/history", async (req: Request, res: Response) => {
    const tokenData = verifyToken(req.headers.authorization as string);
    if (!tokenData) return res.status(403).json();
    console.log("history");
    const walletId = tokenData.user.user;

    const walletsDir = await Wallets.newFileSystemWallet(walletPath);
    const user = await walletsDir.get(walletId);
    if (!user) return res.status(403).json();
    const gateway = new Gateway();
    await gateway.connect(channelConnection, {
        wallet: walletsDir,
        identity: user,
        discovery: config.gatewayDiscovery,
    });
    const network = await gateway.getNetwork("mainchannel");
    const contract = network.getContract("mycc");
    const getUserHistTransaction = contract.createTransaction("getUserHist");
    const userHist = JSON.parse(
        (await getUserHistTransaction.submit(walletId)).toString()
    );
    return res.status(200).json({ result: "success", ...userHist });
});

app.post("/update", async (req: Request, res: Response) => {
    const tokenData = verifyToken(req.headers.authorization as string);
    if (tokenData) {
        if (!req.body.Senha) return res.status(403).json();
        console.log("update");
        await openDb().then((db) => {
            db.run(
                `UPDATE users 
            SET name = ?,
                ssn = ?, 
                email = ?, 
                pw = ?, 
                phone = ? 
            WHERE 
                walletId = ?`,
                req.body.Nome,
                req.body.CPF,
                req.body["E-mail"],
                bcrypt.hashSync(req.body.Senha, bcrypt.genSaltSync()),
                req.body.Telefone,
                tokenData.user.user
            );
        });
        res.status(200).json({ result: "success" });
    } else {
        res.status(403).json();
    }
});

app.get("/getBalance/:walletId", async (req: Request, res: Response) => {
    const walletsDir = await Wallets.newFileSystemWallet(walletPath);
    const user = await walletsDir.get(req.params.walletId);
    console.log(user?.mspId);

    if (user) {
        console.log("found user");
        const gateway = new Gateway();
        await gateway.connect(channelConnection, {
            wallet: walletsDir,
            identity: user,
            discovery: config.gatewayDiscovery,
        });
        // console.log("found user1");
        console.log("before blowing up");

        const network = await gateway.getNetwork("mainchannel");
        console.log("after not blowing up");
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

app.post("/issue", async (req: Request, res: Response) => {
    const tokenData = verifyToken(req.headers.authorization as string);
    if (!tokenData) return res.status(403).json();
    console.log("issue");
    const walletId = tokenData.user.user;
    if (walletId != "admin") {
        return res.status(405).json();
    }
    const walletsDir = await Wallets.newFileSystemWallet(walletPath);
    const user = await walletsDir.get(walletId);
    if (!user) return res.status(403).json();
    const gateway = new Gateway();
    await gateway.connect(channelConnection, {
        wallet: walletsDir,
        identity: user,
        discovery: config.gatewayDiscovery,
    });
    const network = await gateway.getNetwork("mainchannel");
    const contract = network.getContract("mycc");
    const issueTransaction = contract.createTransaction("issue");
    const issueDate = new Date();
    const expireDate = new Date();
    expireDate.setFullYear(issueDate.getFullYear() + 1);
    const faceValue = req.body.amount;
    const issueing = JSON.parse(
        (
            await issueTransaction.submit(
                issueDate.toISOString(),
                expireDate.toISOString(),
                faceValue
            )
        ).toString()
    );

    return res.status(200).json({ result: "success", ...issueing });
});

function verifyToken(accessTokenHeader: string) {
    if (typeof accessTokenHeader !== "undefined") {
        const token = accessTokenHeader.split(" ")[1];
        let jwtData;
        try {
            jwtData = jwt.verify(token, "SECRET_JWT_SIGN_TOKEN", {
                complete: true,
            });
        } catch (e) {
            console.log("expired or otherwise invalid token");
            return false;
        }
        // (jwtData.payload as jwt.JwtPayload).user.user += "_";
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
            req.body.Matrícula === "admin"
                ? req.body.Matrícula
                : req.body.Matrícula + "_"
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
            " run client now"
    );
});
