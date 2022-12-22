const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Buyer = require('../models/Buyer');

const loginUser = async(req, res) => {
    const data = req.body;
    const hash = crypto.createHash('sha256');
    const password = hash.update(data.password, 'utf-8').digest('hex');

    const result = await Buyer.findOne({ email: data.email });
    const token = jwt.sign(data.email, process.env.ACCESS_TOKEN);

    if (result && result.passwordHash == password)
        res.status(200).json({
            code: "300",
            message: "loged in",
            ok: true,
            user: {
                firstname: result.firstname,
                lastname: result.lastname,
                username: result.username,
                email: result.email,
                token: token
            }
        });
    else
        res.status(401).json({ code: "303", message: "wrong credentials", ok: false });
}

module.exports = { loginUser };