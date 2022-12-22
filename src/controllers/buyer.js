const { getAuthenticatedBuyer } = require('../utils/auth');
const crypto = require('crypto');
const Buyer = require('../models/Buyer');
const Seller = require('../models/Seller');
const Item = require('../models/Item');
const Mail = require('../utils/email');

const getInfo = async(req, res) => {
    const buyer = await getAuthenticatedBuyer(req, res);
    const ret = {
        id: buyer.id,
        firstname: buyer.firstname,
        lastname: buyer.lastname,
        username: buyer.username,
        email: buyer.email,
        addresses: buyer.addresses,
        phone: buyer.phone,
        cart: buyer.cart,
        wishlist: buyer.wishlist,
        proposals: buyer.proposals,
        isVerified: buyer.isVerified,
        isSeller: buyer.isSeller,
        sellerId: buyer.sellerId
    }
    return res.status(200).json({ buyer: ret, code: "", message: "success" });
}


const create = async(req, res) => {
    const url = require('../utils/address');
    const data = req.body;
    const hash = crypto.createHash('sha256');
    const password = hash.update(data.password, 'utf-8').digest('hex');

    let code, result;
    do {
        code = crypto.randomBytes(32).toString('hex');
        result = await Buyer.exists({ verificationCode: code });
    } while (result);

    if (await Buyer.exists({ username: data.username }))
        return res.status(422).json({ code: "", message: "unable to create, username not available" });


    const buyer = new Buyer({
        firstname: data.firstname,
        lastname: data.lastname,
        username: data.username,
        email: data.email,
        passwordHash: password,
        addresses: { address: data.address, isDefault: true },
        phone: { prefix: data.prefix, number: data.number },
        isTerms: true,

        isVerified: false,
        verificationCode: code,
    });

    let seller;
    if (data.address && data.prefix && data.number) {
        buyer.isSeller = true;
        seller = new Seller({
            userId: buyer
        });
        buyer.sellerId = seller.id;
    }

    try {
        await buyer.save();
        if (seller)
            await seller.save();

        await Mail.send(data.email, 'Creazione Account Skupply', `Grazie per aver scelto skupply.\nPer verificare l'account apra la seguente pagina:\n${url}/verify/?email=${data.email}&code=${code}`);
        return res.status(201).json({ code: "", message: "success" });
    } catch (error) {
        return res.status(500).json({ code: "", message: "unable to create" });
    }
}

const edit = async(req, res) => {
    let buyer = await getAuthenticatedBuyer(req, res);

    if (req.body.firstname)
        buyer.firstname = req.body.firstname;

    if (req.body.lastname)
        buyer.lastname = req.body.lastname;

    if (req.body.password) {
        const hash = crypto.createHash('sha256');
        const password = hash.update(req.body.password, 'utf-8').digest('hex');
        buyer.passwordHash = password;
    }

    if (req.body.prefix)
        buyer.prefix = req.body.prefix;

    if (req.body.number)
        buyer.number = req.body.number;

    buyer.save()
        .then(ok => {
            return res.status(200).json({ code: "", message: "success" })
        })
        .catch(err => {
            return res.status(500).json({ code: "", message: "unable to save changes" });
        });
}

const remove = async(req, res) => {
    let buyer = await getAuthenticatedBuyer(req, res);

    //TODO: remove chats

    //remove seller
    if (buyer.isSeller) {
        let seller = await Seller.find({ _id: buyer.sellerId });

        if (seller.items)
            seller.items.forEach(async itemId => {
                let item = await Item.find({ _id: itemId });
                item.state = 'DELETED';
                item.save().then(ok => {}).catch(err => {
                    return res.status(500).json({ code: "", message: "unable to save changes" });
                });
            });

        Seller.deleteOne({ id: seller.id }, err => {
            if (err)
                return res.status(500).json({ code: "", message: "unable to remove" });
        })
    }

    Buyer.deleteOne({ id: buyer.id }, err => {
        if (err)
            return res.status(500).json({ code: "", message: "unable to remove" });
    });

    return res.status(200).json({ code: "", message: "success" });
}

const find = async (req, res) => {
  const username = req.query.username
  if (!username) { res.status(400).json({ code: 102, message: 'Username argument is missing' }); return }

  const check = await Buyer.findOne({ username: username })
  if (check) res.status(200).json({ code: 107, message: 'Username found'})
  else res.status(404).json({ code: 104, message: 'Username available'})
};

module.exports = {
    getInfo,
    create,
    find,
    edit,
    remove
};