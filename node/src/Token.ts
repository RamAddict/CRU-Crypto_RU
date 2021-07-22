
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
        ) {
        this.currentState = currentState;
        this.tokenId = tokenID;
        this.owner = owner;
        this.issueDate = issueDate;
        this.maturityDate = maturityDate;
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
    current!: string;
}