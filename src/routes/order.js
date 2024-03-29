const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order');
const { verifyAuthentication } = require('../utils/auth');

router.post('/', verifyAuthentication, orderController.create);
router.get('/getAll', verifyAuthentication, orderController.getAll);
router.get('/seller', verifyAuthentication, orderController.getBySeller)
router.put('/', verifyAuthentication, orderController.edit);

module.exports = router;