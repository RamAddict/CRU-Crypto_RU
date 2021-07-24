import { ChaincodeResponse, ChaincodeStub, Shim } from "fabric-shim";
import { Token, ETState } from "./Token";



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
class Chaincode {
    // doesn't require any parameters, for now
    async Init(stub: ChaincodeStub): Promise<ChaincodeResponse> {
        console.info("========= example02 Init =========");
        const ret = stub.getFunctionAndParameters();
        console.info(ret);
        
        try {
            // create very first emission
            // const token = await this.issue(stub, 1, new Date("2021-01-01"), new Date("2022-01-01"), 1e6);
            
            // return Shim.success(token.serialize());
            return Shim.success(Buffer.from("initializedMen"));
        } catch (err) {
            return Shim.error(err);
        }
    }

    async Invoke(stub: ChaincodeStub): Promise<ChaincodeResponse> {
        const ret = stub.getFunctionAndParameters();
        console.info(ret);
        const self = this
        type AllowedMethod = "sendToBeneficiary" | "issue" | "query" | "Init";
        const method = self[ret.fcn as AllowedMethod];
        if (!method) {
            console.log("no method of name:" + ret.fcn + " found");
            return Shim.success();
        }
        try {
            const params = [stub, ...parseStringArray(ret.params)] as Parameters<typeof method>;
            // @ts-ignore
            const payload = await method(...params);
            return Shim.success((payload as ChaincodeResponse).payload);
        } catch (err) {
            console.log(err);
            return Shim.error(err);
        }
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
            // stop from transacting if identity not Mec
            if (stub.getMspID() !== "mec-example-com")
                throw new Error("Identity not Mec, and therefore not allowed to issue tokens");
            // create token
            const token = new Token(
                tokenID,
                stub.getMspID(), // owner is hard-coded
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
    
        /**
         * Send a token to a beneficiary (student), assumes Mec is the only valid issuer
         *
         * @param {ChaincodeStub} stub the transaction context
         * @param {number} tokenID token number for this issuer
         * @param {string} issueDate token issue date
         * @param {string} maturityDate token maturity date
         * @param {number} faceValue face value of token
        */
        async sendToBeneficiary(stub: ChaincodeStub, tokenID: number, ) {
    
        }

    // Transaction makes payment of X units from A to B
    async invoke(stub: ChaincodeStub, args: string[]) {
        if (args.length != 3) {
            throw new Error("Incorrect number of arguments. Expecting 3");
        }

        const A = args[0];
        const B = args[1];
        if (!A || !B) {
            throw new Error("asset holding must not be empty");
        }

        // Get the state from the ledger
        const Avalbytes = await stub.getState(A);
        if (!Avalbytes) {
            throw new Error("Failed to get state of asset holder A");
        }
        let Aval = parseInt(Avalbytes.toString());

        const Bvalbytes = await stub.getState(B);
        if (!Bvalbytes) {
            throw new Error("Failed to get state of asset holder B");
        }

        let Bval = parseInt(Bvalbytes.toString());
        // Perform the execution
        const amount = parseInt(args[2]);
        if (typeof amount !== "number") {
            throw new Error(
                "Expecting integer value for amount to be transaferred"
            );
        }

        Aval = Aval - amount;
        Bval = Bval + amount;
        console.log("Aval = %d, Bval = %d\n", Aval, Bval);

        // Write the states back to the ledger
        await stub.putState(A, Buffer.from(Aval.toString()));
        await stub.putState(B, Buffer.from(Bval.toString()));
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
        return Shim.success(Avalbytes);
    }
}

Shim.start(new Chaincode());
