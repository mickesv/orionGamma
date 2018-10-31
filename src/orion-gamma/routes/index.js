var express = require('express');
var router = express.Router();

var componentController = require('../controllers/componentController');
var statsController = require('../controllers/statsController');


router.get('/issues', componentController.getIssueActivity);
router.get('/search/:source', componentController.partialSearch);
router.get('/component/:source', componentController.displayComponent);
router.get('/', componentController.searchPage);
router.get('/stats/:name', statsController.displayProject);
router.get('/backdoor/allstats', statsController.main);
router.get('/backdoor/quicktrawl', statsController.quickTrawl);
router.get('/backdoor/', statsController.quickTrawlSearch);

module.exports = router;
