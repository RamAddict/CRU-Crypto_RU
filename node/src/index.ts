import { ChaincodeResponse, ChaincodeStub, Shim } from "fabric-shim";
import { Token, ETState } from "./Token";
class Chaincode {
    // doesn't require any parameters, for now
    async Init(stub: ChaincodeStub): Promise<ChaincodeResponse> {
        console.info('========= example02 Init =========');
        let ret = stub.getFunctionAndParameters();
        console.info(ret);

        const initialToken = new Token(ETState.ISSUED, 1, "mec", "2021-01-01", "2022-01-01", 1e6);

        try {
            console.log(initialToken.serialize())
            console.log(initialToken.produceKey())
            stub.putState(initialToken.produceKey(), initialToken.serialize());
            return Shim.success();
        } catch (err) {
            return Shim.error(err);
        }
    }
    async Invoke(stub: ChaincodeStub): Promise<ChaincodeResponse> {
        let ret = stub.getFunctionAndParameters();
        console.info(ret);
        let method = this[ret.fcn as keyof Chaincode];
        if (!method) {
            console.log('no method of name:' + ret.fcn + ' found');
            return Shim.success();
        }
        try {
            let payload = await method(stub, ret.params);
            return Shim.success((payload as ChaincodeResponse).payload);
        } catch (err) {
            console.log(err);
            return Shim.error(err);
        }
    }
    async test(stub: ChaincodeStub) {
        console.log("would call with: " + stub.getFunctionAndParameters().fcn + " " + stub.getFunctionAndParameters().params);
    }
    // Transaction makes payment of X units from A to B
    async invoke(stub: ChaincodeStub, args: string[]) {
        if (args.length != 3) {
            throw new Error('Incorrect number of arguments. Expecting 3');
        }

        let A = args[0];
        let B = args[1];
        if (!A || !B) {
            throw new Error('asset holding must not be empty');
        }

        // Get the state from the ledger
        let Avalbytes = await stub.getState(A);
        if (!Avalbytes) {
            throw new Error('Failed to get state of asset holder A');
        }
        let Aval = parseInt(Avalbytes.toString());

        let Bvalbytes = await stub.getState(B);
        if (!Bvalbytes) {
            throw new Error('Failed to get state of asset holder B');
        }

        let Bval = parseInt(Bvalbytes.toString());
        // Perform the execution
        let amount = parseInt(args[2]);
        if (typeof amount !== 'number') {
            throw new Error('Expecting integer value for amount to be transaferred');
        }

        Aval = Aval - amount;
        Bval = Bval + amount;
        console.log('Aval = %d, Bval = %d\n', Aval, Bval);

        // Write the states back to the ledger
        await stub.putState(A, Buffer.from(Aval.toString()));
        await stub.putState(B, Buffer.from(Bval.toString()));
    }
    // Deletes an entity from state
    async delete(stub: ChaincodeStub, args: string[]) {
        if (args.length != 1) {
            throw new Error('Incorrect number of arguments. Expecting 1');
        }

        let A = args[0];

        // Delete the key from the state in ledger
        await stub.deleteState(A);
    }
    // query callback representing the query of a chaincode
    async query(stub: ChaincodeStub, args: string[]) {
        if (args.length != 1) {
            throw new Error('Incorrect number of arguments. Expecting name of the person to query')
        }

        let jsonResp = { name: "", amount: "" };
        let A = args[0];

        // Get the state from the ledger
        let Avalbytes = await stub.getState(A);
        if (!Avalbytes) {
            throw new Error(('Failed to get state for ' + A));
        }

        jsonResp.name = A;
        jsonResp.amount = Avalbytes.toString();
        console.info('Query Response:');
        console.info(jsonResp);
        return Avalbytes;
    }

}


Shim.start(new Chaincode());