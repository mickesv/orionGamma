var npmUtil = require('../utils/npmUtil');
var githubUtil = require('../utils/githubUtil');

module.exports.searchHandler = {
    npm: npmUtil.search,
    github: githubUtil.search
};


module.exports.detailsHandler = {
    npm: npmUtil.getDetails
};

