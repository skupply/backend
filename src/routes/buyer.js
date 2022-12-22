const express = require('express');
const router = express.Router();
const buyerController = require('../controllers/buyer');
const { verifyAuthentication } = require('../utils/auth');

// C - create
router.post('/', buyerController.create);

// R - read
router.get('/', verifyAuthentication, buyerController.getInfo);

// U - update
router.put('/', verifyAuthentication, buyerController.edit);

// D - delete
router.delete('/', verifyAuthentication, buyerController.remove);

// F - find
router.get('/find', buyerController.find);

module.exports = router;