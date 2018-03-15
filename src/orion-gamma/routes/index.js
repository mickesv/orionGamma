var express = require('express');
var router = express.Router();

var componentController = require('../controllers/componentController');

router.get('/issues', componentController.getIssueActivity);
router.get('/search/:source', componentController.partialSearch);
router.get('/component/:source', componentController.displayComponent);
router.get('/', componentController.searchPage);

module.exports = router;
