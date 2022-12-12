const { getAuthenticatedBuyer } = require('../utils/auth');
const Buyer = require('../models/Buyer');
const Seller = require('../models/Seller');
const Item = require('../models/Item');
const Mail = require('../utils/email');

const getInfo = async(req, res) => {
    const buyer = await getAuthenticatedBuyer;
    return res.status(200).json({ buyer: buyer, code: "", message: "success" });
}

const create = async(req, res) => {
    const url = require('../utils/address');
    const data = req.body;
    const hash = crypto.createHash('sha256');
    const password = hash.update(data.password, 'utf-8').digest('hex');

    let code, result;
    do {
        code = crypto.randomBytes(32).toString('hex');
        result = await User.exists({ verificationCode: code });
    } while (result);

    //FIXME: optional params
    const buyer = new Buyer({
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        passwordHash: password,
        addresses: { address: data.address, isDefault: true },
        phone: { prefix: data.prefix, number: data.number },
        isTerms: true,

        isVerified: false,
        verificationCode: code,

        isSeller: data.seller,
    });

    buyer.save(error => {
        if (error)
            return res.status(500).json({ code: "", message: "unable to create" });

        Mail.send(data.email, 'Creazione Account Skupply', `Grazie per aver scelto skupply.\nPer verificare l'account apra la seguente pagina:\n${url}/verify/?email=${data.email}&code=${code}`);
    });

    return res.status(200).json({ code: "", message: "success" });
}

const edit = async(req, res) => {
    const url = require('../utils/address');
    let buyer = await getAuthenticatedBuyer;

    if (req.body.email) {
        await Mail.send(
            req.body.email,
            'Aggiornamento credenziali Skupply',
            `Per confermare il nuovo indirizzo email clicca sul seguente link:\n
            ${url}/users/email/?old=${buyer.email}&new=${req.body.email}`
        );
    }

    if (req.body.firstname)
        buyer.firstname = req.body.firstname;

    if (req.body.lastname)
        buyer.lastname = req.body.lastname;

    await buyer.save(err => {
        if (err)
            return res.status(500).json({ code: "", message: "unable to save changes" });
    });

    return res.status(200).json({ code: "", message: "success" });
}

const remove = async(req, res) => {
    let buyer = await getAuthenticatedBuyer;

    //TODO: remove chats

    //remove seller
    if (buyer.isSeller) {
        let seller = await Seller.find({ _id: buyer.sellerId });

        seller.items.forEach(async itemId => {
            let item = await Item.find({ _id: itemId });
            item.state = 'DELETED';
            await item.save(err => {
                if (err)
                    return res.status(500).json({ code: "", message: "unable to save changes" });
            });
        });

        await Seller.deleteOne({ id: seller.id }, err => {
            if (err)
                return res.status(500).json({ code: "", message: "unable to remove" });
        })

        return res.status(200).json({ code: "", message: "success" });
    }

    await Buyer.deleteOne({ id: buyer.id }, err => {
        if (err)
            return res.status(500).json({ code: "", message: "unable to remove" });
    });

    return res.status(200).json({ code: "", message: "success" });
}


module.exports = {
    getInfo,
    create,
    edit,
    remove
};