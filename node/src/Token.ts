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

    /**
     * Compare utility
     * @return {boolean} true if 2 tokens are the equal in value
     */
    isEqual(other: Token): boolean {
        return this.currentState === other.currentState && 
        this.tokenId === other.tokenId && 
        this.owner === other.owner && 
        this.issueDate.getTime() === other.issueDate.getTime() &&
        this.maturityDate.getTime() === other.maturityDate.getTime() &&
        this.faceValue === other.faceValue;
    }
    
    /**
     * Creates a Token object from a raw JSON object
     * @param {IToken} token The object to rehydrate (typically the return of JSON.parse()) 
     * @return {Token} The hydrated Token 
     */
    static hydrateFromJSON({
        currentState,
        issueDate,
        faceValue,
        maturityDate,
        owner,
        tokenId,
    }: IToken): Token {
        const token = new Token(tokenId, owner, new Date(issueDate), new Date(maturityDate), faceValue);
        token.currentState = currentState;
        return token;
    }

    /**
     * Convert this object to string representation
     * @return {string}
     */
    toString(): string {
        return JSON.stringify(this);
    }
}
