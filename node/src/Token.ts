export enum ETState {
    ISSUED = 1,
    DEPOSITED,
    SPENT,
    FINALIZED,
}

export interface IToken {
    // Token current state
    currentState: ETState;
    // Token issue namehydrateFromJSON
    tokenId: number;
    // Token owner
    owner: string;
    // Token issue date xx-xx-xxxx
    issueDate: Date;
    // Maturity date
    maturityDate: Date;
    // Face value
    faceValue: number;
}
export class Token implements IToken {
    constructor(
        tokenID: number,
        owner: string,
        issueDate: Date,
        maturityDate: Date,
        faceValue: number
    ) {
        this.tokenId = tokenID;
        this.owner = owner;
        this.issueDate = issueDate;
        this.maturityDate = maturityDate;
        this.faceValue = faceValue;
    }
    // Token current state
    currentState!: ETState;
    // Token issue namehydrateFromJSON
    tokenId!: number;
    // Token owner
    owner!: string;
    // Token issue date xx-xx-xxxx
    issueDate!: Date;
    // Maturity date
    maturityDate!: Date;
    // Face value
    faceValue!: number;

    /**
     * Convert this object to buffer containing JSON data serialization
     * Typically used before putState()ledger API
     * @return {Buffer} buffer with the data to store
     */
    serialize(): Uint8Array {
        return Buffer.from(JSON.stringify(this));
    }

    produceKey(): string {
        return "MEC_" + this.tokenId.toString();
    }

    isEqual(other: Token): boolean {
        return this.currentState === other.currentState && 
        this.tokenId === other.tokenId && 
        this.owner === other.owner && 
        this.issueDate === other.issueDate &&
        this.maturityDate === other.maturityDate &&
        this.faceValue === other.faceValue;
    }

    static hydrateFromJSON({
        currentState,
        issueDate,
        faceValue,
        maturityDate,
        owner,
        tokenId,
    }: IToken): Token {
        const token = new Token(tokenId, owner, issueDate, maturityDate, faceValue);
        token.currentState = currentState;
        return token;
    }
}
