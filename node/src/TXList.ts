import { Token } from "./Token";

export interface ITXList {
    txList: Token[];
}

export class TXList implements ITXList {
    constructor(txList: Token[]) {
        this.txList = txList;
    }
    // list of tokens
    txList!: Token[];

    /**
     * Convert this object to buffer containing JSON data serialization
     * Typically used before putState()ledger API
     * @return {Buffer} Buffer with the data to store
     */
    serialize(): Uint8Array {
        return Buffer.from(JSON.stringify(this));
    }
    /**
     * Creates a TXList object from a raw JSON object
     * @param {ITXList} txList The object to rehydrate (typically the return of JSON.parse())
     * @return {TXList} The hydrated list
     */
    static hydrateFromJSON(txList: ITXList): TXList {
        return new TXList(
            txList.txList.map((token) => Token.hydrateFromJSON(token))
        );
    }
}
