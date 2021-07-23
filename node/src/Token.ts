
import {} from 'fabric-shim-api';

export enum ETState {
    ISSUED = 1,
    PENDING,
    TRADING,
    REDEEMED,
};

export class Token {

    constructor(currentState: ETState,
                tokenID: number,
                owner: string,
                issueDate: string,
                maturityDate: string,
                faceValue: number
        ) {
        this.currentState = currentState;
        this.tokenId = tokenID;
        this.owner = owner;
        this.issueDate = issueDate;
        this.maturityDate = maturityDate;
        this.faceValue = faceValue
    }
    // Token current state
    currentState!: ETState;
    // Token issue name
    tokenId!: number;
    // Token owner
    owner!: string;
    // Token issue date xx-xx-xxxx
    issueDate!: string;
    // Maturity date
    maturityDate!: string;
    // Face value
    faceValue!: number;

     /**
     * Convert object to buffer containing JSON data serialization
     * Typically used before putState()ledger API
     * @param {Object} JSON object to serialize
     * @return {buffer} buffer with the data to store
     */
    serialize(): Uint8Array {
        return Buffer.from(JSON.stringify(this));
    }
    produceKey(): string {
        return "MEC_" + this.tokenId.toString();
    }
    
}