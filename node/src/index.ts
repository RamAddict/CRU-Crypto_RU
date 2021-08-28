import { ChaincodeResponse, ChaincodeStub, Shim } from "fabric-shim";
import { Token, ETState, IToken } from "./Token";
import { ITXList, TXList } from "./UTXO";
const MEC = "mec-example-com";

function parseStringArray(arr: Array<string>): (string | number | Boolean | Date)[] {
    return arr.map(el => {
        if (!Number.isNaN(Number(el))) {
            // Try Number
            return Number(el);
        } else if (!Number.isNaN((new Date(el)).getDate())) {
            // Try Date
            return new Date(el)
        } else if (el.toLowerCase() === "true" || el.toLowerCase() === "false") {
            // Try Boolean
            return new Boolean(el);
        } else {
            // Return as String
            return el
        }
    })
}

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
        const ret = stub.getFunctionAndParameters();
        console.info(ret);
        
        try {
            // Create UTXOLIST
            let initialIssue = new Token(
                await Chaincode.produceNextId(stub), 
                MEC, 
                new Date("2021-01-01"), 
                new Date("2022-01-01"), 
                1e6);
            initialIssue.currentState = ETState.ISSUED;
            await stub.putState("UTXOLIST", 
                          new TXList([initialIssue]).serialize());
            // create very first emission
            return Shim.success(initialIssue.serialize());
            // return Shim.success(Buffer.from("initializedMen"));
        } catch (err) {
            return Shim.error(err);
        }
    }

    async Invoke(stub: ChaincodeStub): Promise<ChaincodeResponse> {
        const ret = stub.getFunctionAndParameters();
        console.info(ret);
        const self = this
        type AllowedMethod = "getBalance" | "issue" | "query" | "Init" | "sendTokens" | "getHist";
        const method = self[ret.fcn as AllowedMethod];
        if (!method) {
            console.log("no method of name:" + ret.fcn + " found");
            return Shim.error(Buffer.from("no method of name:" + ret.fcn + " found"));
        }
        try {
            const params = [stub, ...parseStringArray(ret.params)] as Parameters<typeof method>;
            // @ts-ignore
            const payload = await method(...params);
            switch (getType(payload)) {
                case "Number":
                    return Shim.success(Buffer.from(payload.toString()));
                case "Token":
                    return Shim.success((payload as Token).serialize());
                default:
                    return (payload as ChaincodeResponse);
            }
        } catch (err) {
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
            if (new TextDecoder().decode(await stub.getState("tokenIDCounter")) === null)
            {
                // init token id counter if not created
                stub.putState("tokenIDCounter", Buffer.from("-1"));
            }
            id = 1 + Number((new TextDecoder().decode(await stub.getState("tokenIDCounter"))));
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
     * @Return the updated counter
    */
    async sendTokens(stub: ChaincodeStub, from: string, to: string, quantity: number): Promise<ChaincodeResponse> {
        // check whoever is sending can send tokens
        // TODO
        if (!from || !to || !quantity)
            return Shim.error(Buffer.from("Incorrent number of parameters"));
        if (from === to)
            return Shim.error(Buffer.from("Not allowed to send tokens to same place"));
        if (quantity < 0.1)
            return Shim.error(Buffer.from("Not allowed to send less than 0.1 tokens"));
        // check balance
        let [tks, change] = await Chaincode.selectTksToSend(stub, from, quantity);
        Chaincode.logger.debug(JSON.stringify(tks));
        Chaincode.logger.debug(change);
        // if no tokens found, return error
        if (tks.length === 0)
            return Shim.error(Buffer.from(from + " lacks funds"));
        
        let tokenList = (await Chaincode.getUTXOList(stub));

        let expirationDate = new Date(tks[0].maturityDate);
        let issueDate = new Date(tks[0].issueDate);
        let tokenState = tks[0].currentState;
        for (const token of tks) {
            if (token.maturityDate < expirationDate)
            {
                expirationDate = token.maturityDate;
                issueDate = token.issueDate;
                tokenState = token.currentState;
            }
        }
        if (change !== 0) {
            // create change
            let newToken = new Token(tks[0].tokenId, from, issueDate, expirationDate, change);
            newToken.currentState = tokenState;
            tokenList.txList.push(newToken);
        }
        // create the token with the amount sent in the name of the recipient
        let newToken = new Token(tks[0].tokenId, to, issueDate, expirationDate, quantity);
        newToken.currentState = tokenState;
        tokenList.txList.push(newToken);
        Chaincode.logger.warn(JSON.stringify(tokenList));

        // delete these tokens
        for (const tk of tks) {
            tokenList.txList.splice(tokenList.txList.findIndex((token) => token.isEqual(tk)), 1);
        }
        // write this back on chaincode
        await stub.putState("UTXOLIST", tokenList.serialize());

        return Shim.success(Buffer.from("Transferred " + quantity + " from " + from + " to " + to + " tokenId: " + tks[0].tokenId));
    }

    static async selectTksToSend(stub: ChaincodeStub, owner: string, quantity: number): Promise<[Token[], number]> {
        // get only the tokens that belong to the owner
        let tokensOfOwner = (await Chaincode.getUTXOList(stub)).txList.filter((token) => 
            token.owner === owner
        );
        // seprate the ones bigger and smaller from the list
        const greaters = (tokensOfOwner).filter((token) => token.faceValue >= quantity);
        let change = 0;
        if (typeof greaters !== 'undefined' && greaters.length > 0)
        {
            // get min value
            let min = greaters[0];
            for (const e of greaters) {
                if (min.faceValue < e.faceValue)
                min = e;
            }
            change = min.faceValue - quantity;
            return [[min], change]
        }
        // no values above the required, look for the sum in the lessers
        let lessers = (tokensOfOwner).filter((token) => token.faceValue < quantity);
        // sort values
        lessers.sort((left, right) => left.faceValue - right.faceValue);
        let output = [];
        let sum = 0;
        for (const token of lessers) {
            output.push(token);
            sum += token.faceValue;
            if (sum >= quantity) {
                change = sum - quantity;
                return [output, change]
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
        return TXList.hydrateFromJSON(JSON.parse(new TextDecoder().decode(await stub.getState("UTXOLIST"))) as ITXList);
    }

    /**
     *  Gets the number of tokens of a certain identity.
     *
     * @param {ChaincodeStub} stub the transaction context
     * @param {string} owner the identity
     * @Return the current c
    */
    async getBalance(stub: ChaincodeStub, owner: string): Promise<number> {
        // query the elements in the UTXOLIST
        let accum = 0;
        (await Chaincode.getUTXOList(stub)).txList.forEach((token) => {
            if (token.owner === owner)
                accum += token.faceValue;
        });

        return accum;
    }

    /**
     * Issue token, Mec is the only valid issuer
     *
     * @param {ChaincodeStub} stub the transaction context
     * @param {number} tokenID token number for this issuer
     * @param {string} issueDate token issue date
     * @param {string} maturityDate token maturity date
     * @param {number} faceValue face value of token
    */
         async issue(
            stub: ChaincodeStub,
            tokenID: number,
            // owner: string,
            issueDate: Date,
            maturityDate: Date,
            faceValue: number
        ): Promise<Token> {
            // incorrect params
            if (!tokenID || !issueDate || !maturityDate || !faceValue)
                throw new Error("Incorrent number of parameters");
            // stop from transacting if identity not Mec
            if (stub.getCreator().mspid !== MEC)
                throw new Error("Command issuer not Mec, and therefore not allowed to issue tokens");
            // create token
            const token = new Token(
                tokenID,
                MEC, // owner is hard-coded
                issueDate,
                maturityDate,
                faceValue
            );
            // set Issued
            token.currentState = ETState.ISSUED;
            // add to world state
            await stub.putState(token.produceKey(), token.serialize());
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

    async getHist(stub: ChaincodeStub, key: string): Promise<ChaincodeResponse> {
        if (!key)
            throw new Error("Incorrent number of parameters");
        const list = [];
        const historyQueryIterator = await stub.getHistoryForKey(key);
        while (true) {
            let jsonResp : {txId?: string, timestamp?: Date, isDelete?: boolean, value?: TXList} = {};
            const res = await historyQueryIterator.next();
            if (res.done)
            {
                await historyQueryIterator.close();
                return Shim.success(Buffer.from(JSON.stringify(list)));
            }
            jsonResp.txId = res.value.txId
            jsonResp.timestamp = new Date(res.value.timestamp.nanos*1e9);
            if (res.value.isDelete) {
                jsonResp.isDelete = res.value.isDelete
            } else {
                jsonResp.value = TXList.hydrateFromJSON(JSON.parse(new TextDecoder().decode(res.value.value)))
            }
            list.push(jsonResp);
        }
    }
    // query callback representing the query of a chaincode
    async query(stub: ChaincodeStub, ...args: string[]): Promise<ChaincodeResponse> {
        console.log(args)
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
        if (jsonResp.amount === '')
            return Shim.success(Buffer.from("no data here, amount empty"));
        return Shim.success(Avalbytes);
    }
}

Shim.start(new Chaincode());
