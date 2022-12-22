const express = require('express');
const router = express.Router();
const itemController = require('../controllers/item');
const { verifyAuthentication } = require('../utils/auth');

// C - create
router.post('/', verifyAuthentication, itemController.create);

// R - read
router.get('/id=:id', itemController.getInfo);
router.get('/username=:username', itemController.getByUser);
router.get('/', itemController.search);
router.get('/seller/id=:id', itemController.getInfoSeller);

// U - update
router.put('/', verifyAuthentication, itemController.edit);
router.put('/publish', verifyAuthentication, itemController.publish);
router.put('/retire', verifyAuthentication, itemController.retire);
router.put('/buy', verifyAuthentication, itemController.buy);

// D - delete
router.delete('/', verifyAuthentication, itemController.remove);

module.exports = router;