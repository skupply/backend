const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposal');
const { verifyAuthentication } = require('../utils/auth');

// C - create
router.post('/', verifyAuthentication, proposalController.create);

// R - read
router.get('/in', verifyAuthentication, proposalController.getAllIn);
router.get('/out', verifyAuthentication, proposalController.getAllOut);
router.get('/', verifyAuthentication, proposalController.getInfo)

// U - update
router.put('/accept/:id', verifyAuthentication, proposalController.accept);
router.put('/reject/:id', verifyAuthentication, proposalController.reject);

// D - delete
router.delete('/', verifyAuthentication, proposalController.remove);

module.exports = router;


//ce4fdc30f9d08049b2e615ba10a99fa05ef8cce4a2010b1a3cfe5a406e4a43c4