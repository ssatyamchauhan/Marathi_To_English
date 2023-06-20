'use strict'
const { MongoClient } = require('mongodb');
let db = null;

const connect = async () => {
    console.log(process.env.MONGO_IGR_URI)
    const client = new MongoClient(`${process.env.MONGO_IGR_URI}`, { useUnifiedTopology: true });

    try {
        const clientConnection = await client.connect();
        const collections = clientConnection.db();
        db = collections;
        // console.log('collection', collections)
        return collections;

    } catch (error) {
        console.log('Mongodb Connection Error', error);
    }
}

const get = async () => {
    if (!db) {
        db = await connect();
        return db;
    } else {
        return db;
    }
}

module.exports = get;
