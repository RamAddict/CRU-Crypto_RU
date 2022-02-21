import { ChaincodeResponse, ChaincodeStub, Shim } from "fabric-shim";
import { Token, ETState } from "./Token";
import { ITXList, TXList } from "./TXList";
import {
    TransactionHist,
    Transaction,
    ITransactionHist,
} from "./TransactionHist";
const MEC = "mec-example-com";

/**
 * Business unrelated function that takes a vector.
 * and returns the appropriate type of each element of the array
 * @param {Array} arr the parameter array
 * @return {(string | number | Boolean | Date)[]} an array containing the elements with the appropriate type
 */
function parseStringArray(
    arr: Array<string>
): (string | number | Boolean | Date)[] {
    return arr.map((el) => {
        if (!Number.isNaN(Number(el))) {
            // Try Number
            return Number(el);
        } else if (!Number.isNaN(new Date(el).getDate())) {
            // Try Date
            return new Date(el);
        } else if (
            el.toLowerCase() === "true" ||
            el.toLowerCase() === "false"
        ) {
            // Try Boolean
            return new Boolean(el);
        } else {
            // Return as String
            return el;
        }
    });
}

/**
 * Business unrelated function that takes an object
 * and returns the appropriate type in string form
 * @param {number | Token | ChaincodeResponse} obj The object to get the string type of
 * @return {string} the string type
 */
function getType(obj: number | Token | ChaincodeResponse): string {
    if (!Number.isNaN(Number(obj))) {
        return "Number";
    } else if (Object.keys(obj).includes("faceValue")) {
        return "Token";
    } else {
        return "ChaincodeResponse";
    }
}

class Chaincode {
    static logger = Shim.newLogger("LOGGING_OUT");

    // doesn't require any parameters, for now
    async Init(stub: ChaincodeStub): Promise<ChaincodeResponse> {
        console.info("========= example02 Init =========");
        Chaincode.logger.level = "debug";

        try {
            // Create UTXOLIST
            let initialIssue = new Token(
                await Chaincode.produceNextId(stub),
                "admin",
                new Date("2022-01-01"),
                new Date("2023-01-01"),
                1e6
            );
            initialIssue.currentState = ETState.ISSUED;
            await stub.putState(
                "UTXOLIST",
                new TXList([initialIssue]).serialize()
            );
            // create very first emission
            return Shim.success(initialIssue.serialize());
            // return Shim.success(Buffer.from("initializedMen"));
        } catch (err: any) {
            return Shim.error(err);
        }
    }

    async Invoke(stub: ChaincodeStub): Promise<ChaincodeResponse> {
        const ret = stub.getFunctionAndParameters();
        console.info(ret);
        const self = this;
        type AllowedMethod =
            | "getBalance"
            | "issue"
            | "query"
            | "Init"
            | "sendTokens"
            | "getHist"
            | "getUserHist";
        const method = self[ret.fcn as AllowedMethod];
        if (!method) {
            console.log("no method of name:" + ret.fcn + " found");
            return Shim.error(
                Buffer.from("no method of name:" + ret.fcn + " found")
            );
        }
        try {
            const params = [
                stub,
                ...parseStringArray(ret.params),
            ] as Parameters<typeof method>;
            // @ts-ignore
            const payload = await method(...params);
            switch (getType(payload)) {
                case "Number":
                    return Shim.success(Buffer.from(payload.toString()));
                case "Token":
                    return Shim.success((payload as Token).serialize());
                default:
                    return payload as ChaincodeResponse;
            }
        } catch (err: any) {
            console.log(err);
            return Shim.error(err);
        }
    }

    /**
     * Increments current tokenIDCounter and returns it. Creates if not exists.
     *
     * @param {ChaincodeStub} stub the transaction context
     * @Return the updated counter
     */
    static async produceNextId(stub: ChaincodeStub): Promise<number> {
        let id = 0;
        try {
            if (
                new TextDecoder().decode(
                    await stub.getState("tokenIDCounter")
                ) !== null
            ) {
                id =
                    1 +
                    Number(
                        new TextDecoder().decode(
                            await stub.getState("tokenIDCounter")
                        )
                    );
            }
            stub.putState("tokenIDCounter", Buffer.from(id.toString()));
        } catch (err) {
            console.log(err);
        }
        return id;
    }

    /**
     * Checks if the owner has the tokens required and sends the tokens to the target
     *
     * @param {ChaincodeStub} stub the transaction context
     * @param {string} from
     * @param {string} to
     */
    async sendTokens(
        stub: ChaincodeStub,
        from: string,
        to: string,
        quantity: number,
        date: string
    ): Promise<ChaincodeResponse> {
        // from = from.toString()
        // to = to.toString()
        // check whoever is sending can send tokens
        if (!from || !to || !quantity) {
            let error = Shim.error(
                Buffer.from("Incorrect number of parameters")
            );
            error.payload = Buffer.from(JSON.stringify({ code: "params" }));
            return error;
        }
        if (from === to) {
            let error = Shim.error(
                Buffer.from("Not allowed to send tokens to same place")
            );
            error.payload = Buffer.from(JSON.stringify({ code: "same" }));
            return error;
        }
        if (quantity < 0.1) {
            let error = Shim.error(
                Buffer.from("Not allowed to send less than 0.1 tokens")
            );
            error.payload = Buffer.from(JSON.stringify({ code: "min" }));
            return error;
        }
        quantity = Number.parseFloat(quantity.toFixed(1));
        const now = new Date(date);
        // check balance
        let [tks, change] = await Chaincode.selectTksToSend(
            stub,
            from,
            quantity,
            now
        );
        Chaincode.logger.debug(JSON.stringify(tks));
        Chaincode.logger.debug(change);
        // if no tokens found, return error
        if (tks.length === 0) {
            let error = Shim.error(Buffer.from(from + " lacks funds"));
            error.payload = Buffer.from(JSON.stringify({ code: "funds" }));
            return error;
        }

        let tokenList = await Chaincode.getUTXOList(stub);

        let expirationDate = new Date(tks[0].maturityDate);
        let issueDate = new Date(tks[0].issueDate);
        let tokenState = tks[0].currentState;
        
        if (change !== 0) {
            // create change
            let newToken = new Token(
                await Chaincode.produceNextId(stub), // produceNextId(stub)
                from,
                issueDate,
                expirationDate,
                change
            );
            newToken.currentState = tokenState;
            tokenList.txList.push(newToken);
        }
        // create the token with the amount sent in the name of the recipient
        let newToken = new Token(
            await Chaincode.produceNextId(stub),
            to,
            issueDate,
            expirationDate,
            quantity
        );
        newToken.currentState = tokenState;
        tokenList.txList.push(newToken);
        Chaincode.logger.warn(JSON.stringify(tokenList));

        // delete these tokens
        for (const tk of tks) {
            const deleted = tokenList.txList.splice(
                tokenList.txList.findIndex((token) => token.isEqual(tk)),
                1
            );
            Chaincode.logger.debug("Deleted: " + deleted);
        }
        // write this back on chaincode
        await stub.putState("UTXOLIST", tokenList.serialize());
        // save on the to and froms user history
        let fromHist = await Chaincode.getHistoryList(stub, from);
        let toHist = await Chaincode.getHistoryList(stub, to);
        const newTransaction = new Transaction(from, to, quantity, now);
        fromHist.history.push(newTransaction);
        toHist.history.push(newTransaction);

        await stub.putState(from, fromHist.serialize());
        await stub.putState(to, toHist.serialize());

        let ccresponse = Shim.success(
            Buffer.from(
                "Transferred " +
                    quantity +
                    " from " +
                    from +
                    " to " +
                    to +
                    " tokenId: " +
                    tks[0].tokenId
            )
        );
        ccresponse.payload = Buffer.from(JSON.stringify({ code: "success" }));
        return ccresponse;
    }

    /**
     * Choses the tokens required to create a transaction from the owner with the quanity required
     *
     * @param {ChaincodeStub} stub the transaction context
     * @param {string} owner the identity which will give the tokens
     * @param {string} quanity the total tokens to send
     * @param {string} now the current time - to maintain consistency between peers when checking expiry
     */
    static async selectTksToSend(
        stub: ChaincodeStub,
        owner: string,
        quantity: number,
        now: Date
    ): Promise<[Token[], number]> {
        // get only the tokens that belong to the owner and are still valid
        let tokensOfOwner = (await Chaincode.getUTXOList(stub)).txList.filter(
            (token) => ((token.owner === owner) && (now <= token.maturityDate))
        );
        // seprate the ones bigger and smaller from the list
        const greaters = tokensOfOwner.filter(
            (token) => token.faceValue >= quantity
        );
        let change = 0;
        if (typeof greaters !== "undefined" && greaters.length > 0) {
            // get min value
            let min = greaters[0];
            for (const e of greaters) {
                if (e.faceValue < min.faceValue) min = e;
            }
            change = min.faceValue - quantity;
            return [[min], change];
        }
        // no values above the required, look for the sum in the lessers
        let lessers = tokensOfOwner.filter(
            (token) => token.faceValue < quantity
        );
        // sort values
        lessers.sort((left, right) => left.faceValue - right.faceValue);
        let output = [];
        let sum = 0;
        for (const token of lessers) {
            output.push(token);
            sum += token.faceValue;
            if (sum >= quantity) {
                change = sum - quantity;
                return [output, change];
            }
        }
        // not enough funds
        return [[], -1];
    }

    /**
     * Get the list of unspent transactions
     *
     * @param {ChaincodeStub} stub the transaction context
     * @Return the transaction list
     */
    static async getUTXOList(stub: ChaincodeStub): Promise<TXList> {
        return TXList.hydrateFromJSON(
            JSON.parse(
                new TextDecoder().decode(await stub.getState("UTXOLIST"))
            ) as ITXList
        );
    }

    /**
     * Returns a fresh History list in the name of the user, or the list if it exists
     *
     * @param {ChaincodeStub} stub the transaction context
     * @param {string} user the user to get the hist from 
     * @Return the transaction list
     */
    static async getHistoryList(
        stub: ChaincodeStub,
        user: string
    ): Promise<TransactionHist> {
        if ((await stub.getState(user)).length === 0) {
            this.logger.debug("creating fresh hist");
            return new TransactionHist([]);
        }
        return TransactionHist.hydrateFromJSON(
            JSON.parse(
                new TextDecoder().decode(await stub.getState(user))
            ) as ITransactionHist
        );
    }

    /**
     *  Gets the number of tokens of a certain identity.
     *
     * @param {ChaincodeStub} stub the transaction context
     * @param {string} owner the identity
     * @Return the current balance
     */
    async getBalance(
        stub: ChaincodeStub,
        owner: string | Number,
        date: string
    ): Promise<number> {
        // query the elements in the UTXOLIST
        if (typeof owner === "number") owner = owner.toString();
        let accum = 0;
        const now = new Date(date);
        (await Chaincode.getUTXOList(stub)).txList.forEach((token) => {
            if ((token.owner === owner) && (now <= token.maturityDate))
                accum += token.faceValue;
        });

        return accum;
    }

    /**
     * Issue token, Mec is the only valid issuer
     *
     * @param {ChaincodeStub} stub the transaction context
     * @param {string} issueDate token issue date
     * @param {string} maturityDate token maturity date
     * @param {number} faceValue face value of token
     */
    async issue(
        stub: ChaincodeStub,
        issueDate: Date,
        maturityDate: Date,
        faceValue: number
    ): Promise<Token> {
        // incorrect params
        if (!issueDate || !maturityDate || !faceValue) {
            console.log(issueDate);
            console.log(maturityDate);
            console.log(faceValue);
            throw new Error("Incorrent number of parameters");
        }
        // stop from transacting if identity not Mec
        if (stub.getCreator().mspid !== MEC)
            throw new Error(
                "Command issuer not Mec, and therefore not allowed to issue tokens"
            );
        const adminId = "admin";
        // create token
        const token = new Token(
            await Chaincode.produceNextId(stub),
            adminId, // owner is hard-coded
            issueDate,
            maturityDate,
            faceValue
        );
        // set Issued
        token.currentState = ETState.ISSUED;
        // add to world state
        let UTXOLIST = await Chaincode.getUTXOList(stub);
        UTXOLIST.txList.push(token);
        await stub.putState("UTXOLIST", UTXOLIST.serialize());

        // save on the to and froms user history
        let adminHist = await Chaincode.getHistoryList(stub, adminId);
        const now = issueDate;
        const newTransaction = new Transaction(
            "Nova Emissão",
            adminId,
            faceValue,
            now
        );
        adminHist.history.push(newTransaction);

        await stub.putState(adminId, adminHist.serialize());
        // return it
        return token;
    }

    // Deletes an entity from state
    async delete(stub: ChaincodeStub, args: string[]) {
        if (args.length != 1) {
            throw new Error("Incorrect number of arguments. Expecting 1");
        }

        const A = args[0];

        // Delete the key from the state in ledger
        await stub.deleteState(A);
    }

    /**
     * Returns the history of the UTXO, i.e. every possible way it has look like since creation, including
     *
     * @param {ChaincodeStub} stub the transaction context
     * @param {string} key UTXO
     */
    async getHist(
        stub: ChaincodeStub,
        key: string
    ): Promise<ChaincodeResponse> {
        if (!key) throw new Error("Incorrent number of parameters");
        const list = [];
        const historyQueryIterator = await stub.getHistoryForKey(key);
        while (true) {
            let jsonResp: {
                txId?: string;
                timestamp?: Date;
                isDelete?: boolean;
                value?: TXList;
            } = {};
            const res = await historyQueryIterator.next();
            if (res.done) {
                await historyQueryIterator.close();
                return Shim.success(Buffer.from(JSON.stringify(list)));
            }
            jsonResp.txId = res.value.txId;
            jsonResp.timestamp = new Date(res.value.timestamp.nanos * 1e9);
            if (res.value.isDelete) {
                jsonResp.isDelete = res.value.isDelete;
            } else {
                jsonResp.value = TXList.hydrateFromJSON(
                    JSON.parse(new TextDecoder().decode(res.value.value))
                );
            }
            list.push(jsonResp);
        }
    }
    // query callback representing the query of a chaincode
    async query(
        stub: ChaincodeStub,
        ...args: string[]
    ): Promise<ChaincodeResponse> {
        console.log(args);
        if (args.length != 1) {
            throw new Error(
                "Incorrect number of arguments. Expecting name of the person to query"
            );
        }

        const jsonResp = { name: "", amount: "" };
        const A = args[0];

        // Get the state from the ledger
        const Avalbytes = await stub.getState(A);
        if (!Avalbytes) {
            throw new Error("Failed to get state for " + A);
        }

        jsonResp.name = A;
        jsonResp.amount = Avalbytes.toString();
        console.info("Query Response:");
        console.info(jsonResp);
        if (jsonResp.amount === "")
            return Shim.success(Buffer.from("no data here, amount empty"));
        return Shim.success(Avalbytes);
    }

    /**
     * Returns the users history
     *
     * @param {ChaincodeStub} stub the transaction context
     * @param {Number} user the user whose hist is required
    */
    async getUserHist(
        stub: ChaincodeStub,
        user: Number
    ): Promise<ChaincodeResponse> {
        return Shim.success(
            (await Chaincode.getHistoryList(stub, user.toString())).serialize()
        );
    }
}

Shim.start(new Chaincode());
