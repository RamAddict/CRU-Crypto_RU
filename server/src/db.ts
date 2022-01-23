import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

export interface UserRow {
    walletId: "",
    name: "",
    ssn: "",
    email: "",
    pw: "",
    phone: "",
}

openDb().then(db => {
    db.exec(`CREATE TABLE IF NOT EXISTS users(
        walletId TEXT PRIMARY KEY,
        name TEXT,
        ssn TEXT,
        email TEXT,
        pw TEXT,
        phone TEXT
        )`);
});

export async function openDb () {
    sqlite3.verbose();
    return open({
        filename: 'database/database.db',
        driver: sqlite3.cached.Database
    })
}

export async function getUserFromId(walletId: string): Promise<UserRow | undefined>
{
    return await openDb().then((db) =>
    db.get<UserRow>(
        `SELECT * FROM users WHERE walletId = ?`,
        walletId
    ));
}

