var debug = require('debug')('orion-gamma:Factory');

module.exports = {
    registeredTypes: new Map(),
    register(clazzname, clazz) {
        this.registeredTypes.set(clazzname, clazz);
    },
    create(clazzname, ...options) {
        if (!this.registeredTypes.get(clazzname)) {
            debug('Trying to create an instance of a class that is not yet registered');
            return null;
        }
        let clazz = this.registeredTypes.get(clazzname);
        let instance = new clazz(...options);
        return instance;
    },
    exists(clazzname) {
        return this.registeredTypes.get(clazzname);
    },
    getList() {
        return Array.from(this.registeredTypes.keys());
    }
};

// module.exports.instance = Factory;
