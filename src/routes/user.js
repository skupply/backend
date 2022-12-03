const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');

router.get('/', userController.getUser);
router.get('/find', userController.findUser);
router.post('/', userController.newUser);

module.exports = router;