import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const connection = await open({
    filename: 'database.db',
    driver: sqlite3.Database
});

await connection.exec('PRAGMA foreign_keys = ON'); // will make delete on cascade work

export default connection;