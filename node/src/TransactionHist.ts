
export interface ITransaction {
    from: string;
    to: string;
    amount: Number;
    date: Date;
}

export class Transaction implements ITransaction {
    from!: string;
    to!: string;
    amount!: Number;
    date!: Date;

    constructor(from: string, to: string, amount: Number, date: Date) {
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.date = date;
    }

    static hydrateFromJSON({ from, to, amount, date }: ITransaction): Transaction {
        return new Transaction(from, to, amount, date);
    }
    /**
     * Convert this object to buffer containing JSON data serialization
     * Typically used before putState() ledger API
     * @return {Buffer} buffer with the data to store
     */
     serialize(): Uint8Array {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Convert this object to string representation
     * @return {string}
     */
     toString(): string {
        return JSON.stringify(this);
    }
}

export interface ITransactionHist {
    history: Transaction[];
}

export class TransactionHist implements ITransactionHist {
    history: Transaction[];
    constructor(history: Transaction[]) {
        this.history = history;
    }

    /**
     * Convert this object to buffer containing JSON data serialization
     * Typically used before putState()ledger API
     * @return {Buffer} Buffer with the data to store
     */
    serialize(): Uint8Array {
        return Buffer.from(JSON.stringify(this));
    }
    /**
     * Creates a TransactionHist object from a raw JSON object
     * @param {ITransactionHist} history The object to rehydrate (typically the return of JSON.parse())
     * @return {TransactionHist} The hydrated list
     */
    static hydrateFromJSON(history: ITransactionHist): TransactionHist {
        return new TransactionHist(
            history.history.map((tx) => Transaction.hydrateFromJSON(tx))
        );
    }
    /**
     * Convert this object to string representation
     * @return {string}
     */
    toString(): string {
        return JSON.stringify(this);
    }
}
