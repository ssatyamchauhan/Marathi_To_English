const db = require("./mongodb");

const Find = async (tableName, condition = {}, skip = 0, limit = 10, sort = null) => {
    try {
        sort = !sort ? {} : sort;
        return await (await db()).collection(tableName).find(condition).sort(sort).skip(skip).limit(limit).toArray();
    } catch (error) {
        console.error("Error fetching data")
    }
}

const Insert = async (tableName, data) => {
    try {
        return await (await db()).collection(tableName).insertMany(data);
    } catch (error) {
        console.error("Error inserting data", error)
    }
}

const UpdateOne = async (tableName, conditon, data) => {
    try {
        return await (await db()).collection(tableName).updateOne(conditon, { $set: data });
    } catch (error) {
        console.error("Error fetching data")
    }
}

const Delete = async (tableName, condition) => {
    try {
        return await (await db()).collection(tableName).updateOne(condition, { $set: { status: 0, deletedAt: new Date().getTime() } });
    } catch (error) {
        console.error("Error fetching data")
    }
}

const FindOne = async (tableName, condition = {}) => {
    try {
        return await (await db()).collection(tableName).findOne(condition);
    } catch (error) {
        console.error("Error fetching data")
    }
}

const TotalCount = async (tableName, condition = {}) => {
    try {
        return await (await db()).collection(tableName).countDocuments(condition);
    } catch (error) {
        console.error("Mai ban rha hu hero Error fetching data")
    }
}

const Aggregation = async (tableName, condition = [{}]) => {
    try {
        return await (await db()).collection(tableName).aggregate(condition).toArray(); 
    } catch (error) {
        console.error("Error fetching data", error);
    }
}

const PermanentDelete = async (tableName, condition) => {
    try {
        return await (await db()).collection(tableName).deleteOne(condition);
    } catch (error) {
        console.error("Error fetching data")
    }
}

module.exports = {
    Find,
    Insert,
    UpdateOne,
    Delete,
    FindOne,
    TotalCount,
    Aggregation,
    PermanentDelete
}
