import { Token, ETState, IToken } from "./Token";

export interface ITXList {
    txList: Token[];
}

export class TXList implements ITXList {
    
    constructor(
        txList: Token[]
    ) {
        this.txList = txList;
    }
    // list of tokens
    txList!: Token[];

    /**
     * Convert this object to buffer containing JSON data serialization
     * Typically used before putState()ledger API
     * @return {Buffer} buffer with the data to store
     */
    serialize(): Uint8Array {
        return Buffer.from(JSON.stringify(this));
    }
    static hydrateFromJSON(txList: ITXList): TXList {
        return new TXList(txList.txList.map((token) => Token.hydrateFromJSON(token)));
    }
}
