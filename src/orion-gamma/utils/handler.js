module.exports = class Handler {
    search(packageName, callback) {
        callback({message:'base class, ought not to be instantiated'}, []);
    };

    getDetails(packageName, callback) {
        callback({message:'base class, ought not to be instantiated'}, []);
    };
};
