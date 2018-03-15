var Factory = require('./factory');


// Add new handlers below
// --------------------
var NPMHandler = require('./npmHandler');
Factory.register('npm', NPMHandler);

var GithubHandler = require('./githubHandler');
Factory.register('github', GithubHandler);
// --------------------




module.exports.getHandler = function(source) {
    return Factory.create(source);
};

module.exports.existsHandler = function(source) {
    return Factory.exists(source);
};

module.exports.getHandlerList = function() {
    return Factory.getList();
};
