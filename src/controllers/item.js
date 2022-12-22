const { getAuthenticatedBuyer } = require('../utils/auth');
const Buyer = require('../models/Buyer');
const Seller = require('../models/Seller');
const Item = require('../models/Item');
const Category = require('../models/Category');
const mongoose = require('mongoose');

const create = async(req, res) => {
    let seller = await Seller.findById((await getAuthenticatedBuyer).sellerId);

    let item = new Item({
        title: req.body.title,
        description: req.body.description,
        ownerId: req.body.ownerId,
        quantity: req.body.quantity,
        categories: req.body.categories,
        photos: req.body.photos,
        conditions: req.body.conditions,
        price: req.body.price,
        city: req.body.city,
        state: 'DRAFT',
        pickUpAvail: req.body.pickUpAvail,
        shipmentAvail: req.body.shipmentAvail,
        shipmentCost: req.body.shipmentCost,
    });

    item.save(err => {
        if (err)
            return res.status(500).json({ code: "", message: "unable to create" });
    })

    seller.items.push(item.id);
    seller.save(err => {
        if (err)
            return res.status(500).json({ code: "", message: "unable to save changes" });
    });

    return res.status(200).json({ code: "", message: "success" });
}

const getInfo = async(req, res) => {
    //required params
    if (!req.params.id)
        return res.status(400).json({ code: "", message: "missing arguments" });

    // invalid params
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !(await Item.exists({ id: req.body.id })))
        return res.status(400).json({ code: "", message: "invalid arguments" });

    const item = await Item.findById(req.params.id);
    return res.status(200).json({ item: item, code: "", message: "success" });
}

const getByUser = async(req, res) => {
    //required params
    if (!req.params.username)
        return res.status(400).json({ code: "", message: "missing arguments" });

    // invalid params
    if (!(await Buyer.exists({ username: req.params.username })))
        return res.status(400).json({ code: "", message: "invalid arguments" });

    let buyer = await Buyer.findOne({ username: req.params.username });
    if (!buyer.isSeller)
        return res.status(400).json({ code: "", message: "invalid user type" });

    const items = await Item.find({ ownerId: params.sellerId })
    return res.status(200).json({ items: items, code: "", message: "success" });
}

//FIXME: upgrade to new Item
const search = async(req, res) => {
    const keyWord = req.query.key;
    const category = req.query.category;
    const location = req.query.location;
    let category_id;
    let result;

    if (keyWord) {
        //ricerca con almeno parametro keyWord

        if (!category && !location) {
            //ricerca solo per parola chiave
            result = await Item.find({ title: { '$regex': keyWord, '$options': 'i' } });
        } else if (category && !location) {
            //ricerca per keyWord e category

            //ricerca id della categoria indicata
            result = await Category.findOne({ title: { '$regex': category, '$options': 'i' } });
            category_id = result;
            if (!category_id) return res.status(404).json({ code: "704", message: "category not found" });

            result = await Item.find({
                $and: [{ title: { '$regex': keyWord, '$options': 'i' } },
                    { "categories.id": { '$in': [category_id] } }
                ]
            });
        } else if (location && !category) {
            //ricerca per keyWord e location
            result = await Item.find({
                $and: [{ title: { '$regex': keyWord, '$options': 'i' } },
                    { location: { '$regex': location, '$options': 'i' } }
                ]
            });
        } else {
            //ricerca completa 
            result = await Category.findOne({ title: { '$regex': category, '$options': 'i' } });
            category_id = result;
            if (!category_id) return res.status(404).json({ code: "704", message: "category not found" });

            result = await Item.find({
                $and: [{ title: { '$regex': keyWord, '$options': 'i' } }, { location: { '$regex': location, '$options': 'i' } },
                    { "categories.id": { '$in': [category_id] } }
                ]
            });
        }
    } else if (category) {
        //ricerca con almeno parametro category
        result = await Category.findOne({ title: { '$regex': category, '$options': 'i' } });
        category_id = result;
        if (!category_id) return res.status(404).json({ code: "704", message: "category not found" });

        if (!keyWord && !location) {
            //ricerca solo per categoria
            //ricerca id della categoria indicata
            result = (await Item.find());
            if (!result)
                res.status(500).json({ code: "", message: "unable to find" });
            result = result.filter(i => { return i.categories.includes(category_id) });

        } else if (keyWord && !location) {
            //ricerca per keyWord e category
            result = await Item.find({
                $and: [{ title: { '$regex': keyWord, '$options': 'i' } },
                    { "categories.id": { '$in': [category_id] } }
                ]
            });
        } else if (location && !keyWord) {
            //ricerca per category e location
            result = await Item.find({ $and: [{ location: { '$regex': location, '$options': 'i' } }, { "categories.id": { '$in': [category_id] } }] });
        } else {
            //ricerca completa 
            result = await Item.find({
                $and: [{ title: { '$regex': keyWord, '$options': 'i' } }, { location: { '$regex': location, '$options': 'i' } },
                    { "categories.id": { '$in': [category_id] } }
                ]
            });
        }
    } else {
        //mancanza parametri base per la ricerca
        return res.status(400).json({ code: "702", message: "missing arguments" });
    }

    if (!result)
        return res.status(404).json({ code: "701", message: "database error" });

    /**
     * la funzione restituisce tutti i prodotti che rispettano i criteri di ricerca
     * (prezzo min-max, spedizione disponibile, valutazione , order by)
     */
    //db.collection.find("condizioni varie").sort( { age: -1 } )
    //questo ordine per age in ordine decrescente

    return res.status(200).json({ articles: result, code: "700", message: "success" });
}

const getInfoSeller = async(req, res) => {
    // required params
    if(!req.params.id)
        return res.status(400).json({ code: "", message: "missing arguments" });

    // invalid params
    if (!(await Seller.exists({ userId: req.params.id })))
        return res.status(400).json({ code: "", message: "invalid arguments" });

    let buyer = await Buyer.findOne({ _id: req.params.id });

    return res.status(200).json({ user: buyer, code: "", message: "success" });    
}

const edit = async(req, res) => {

    // required params
    if (!req.body.itemId)
        return res.status(400).json({ code: "", message: "missing arguments" });

    if (!mongoose.Types.ObjectId.isValid(req.body.itemId) || !(await Item.exists({ id: req.body.itemId })))
        return res.status(400).json({ code: "", message: "invalid arguments" });

    let buyer = await getAuthenticatedBuyer;
    if (!buyer.isSeller)
        return res.status(400).json({ code: "", message: "invalid user type" });

    let seller = await Seller.findById(buyer.sellerId);
    if (!seller.items.includes(req.body.itemId))
        return res.status(400).json({ code: "", message: "operation not permitted" });

    let item = await Item.findById(req.body.itemId);

    item.title = req.body.title ? req.body.title : item.title;
    item.description = req.body.description ? req.body.description : item.description;
    item.quantity = req.body.quantity ? req.body.quantity : item.quantity;
    item.categories = req.body.categories ? req.body.categories : item.categories;
    item.photos = req.body.photos ? req.body.photos : item.photos;
    item.conditions = req.body.conditions ? req.body.conditions : item.conditions;
    item.price = req.body.price ? req.body.price : item.price;
    item.city = req.body.city ? req.body.city : item.city;
    item.pickUpAvail = req.body.pickUpAvail ? req.body.pickUpAvail : item.pickUpAvail;
    item.shipmentAvail = req.body.shipmentAvail ? req.body.shipmentAvail : item.shipmentAvail;
    item.shipmentCost = req.body.shipmentCost ? req.body.shipmentCost : item.shipmentCost;

    item.save(err => {
        if (err)
            return res.status(500).json({ code: "", message: "unable to save changes" });
    });

    return res.status(200).json({ code: "", message: "success" });
}

const publish = async(req, res) => {
    // required params
    if (!req.body.itemId)
        return res.status(400).json({ code: "", message: "missing arguments" });

    if (!mongoose.Types.ObjectId.isValid(req.body.itemId) || !(await Item.exists({ id: req.body.itemId })))
        return res.status(400).json({ code: "", message: "invalid arguments" });

    let buyer = await getAuthenticatedBuyer;
    if (!buyer.isSeller)
        return res.status(400).json({ code: "", message: "invalid user type" });

    let seller = await Seller.findById(buyer.sellerId);
    if (!seller.items.includes(req.body.itemId))
        return res.status(400).json({ code: "", message: "operation not permitted" });

    let item = await Item.findById(req.body.itemId);

    if (item.state != 'DRAFT')
        return res.status(400).json({ code: "", message: "invalid item state" });

    item.state = 'PUBLISHED';
    item.save(err => {
        if (err)
            return res.status(500).json({ code: "", message: "unable to save changes" });
    });

    return res.status(200).json({ code: "", message: "success" });
}

const retire = async(req, res) => {
    // required params
    if (!req.body.itemId)
        return res.status(400).json({ code: "", message: "missing arguments" });

    if (!mongoose.Types.ObjectId.isValid(req.body.itemId) || !(await Item.exists({ id: req.body.itemId })))
        return res.status(400).json({ code: "", message: "invalid arguments" });

    let buyer = await getAuthenticatedBuyer;
    if (!buyer.isSeller)
        return res.status(400).json({ code: "", message: "invalid user type" });

    let seller = await Seller.findById(buyer.sellerId);
    if (!seller.items.includes(req.body.itemId))
        return res.status(400).json({ code: "", message: "operation not permitted" });

    let item = await Item.findById(req.body.itemId);

    if (item.state != 'PUBLISHED')
        return res.status(400).json({ code: "", message: "invalid item state" });

    item.state = 'DRAFT';
    item.save(err => {
        if (err)
            return res.status(500).json({ code: "", message: "unable to save changes" });
    });

    return res.status(200).json({ code: "", message: "success" });
}

const buy = async(req, res) => {
    // required params
    if (!req.body.itemId || !req.body.quantity)
        return res.status(400).json({ code: "", message: "missing arguments" });

    if (!mongoose.Types.ObjectId.isValid(req.body.itemId) || !(await Item.exists({ id: req.body.itemId })))
        return res.status(400).json({ code: "", message: "invalid arguments" });

    if (!Number.isInteger(req.body.quantity) || !req.body.quantity > 0)
        return res.status(400).json({ code: "", message: "invalid arguments" });

    let item = await Item.findById(req.body.itemId);

    if (item.state != 'PUBLISHED')
        return res.status(400).json({ code: "", message: "invalid item state" });

    if (item.quantity < req.body.quantity)
        return res.status().json({ code: "", message: "max quantity exceeded" })
            //FIXME: return HTTP status

    item.quantity -= req.body.quantity;
    if (item.quantity == 0)
        item.state = 'SOLD';

    item.save(err => {
        if (err)
            return res.status(500).json({ code: "", message: "unable to save changes" });
    });

    return res.status(200).json({ code: "", message: "success" });
}

const remove = async(req, res) => {
    // required params
    if (!req.body.itemId)
        return res.status(400).json({ code: "", message: "missing arguments" });

    if (!mongoose.Types.ObjectId.isValid(req.body.itemId) || !(await Item.exists({ id: req.body.itemId })))
        return res.status(400).json({ code: "", message: "invalid arguments" });

    let buyer = await getAuthenticatedBuyer;
    if (!buyer.isSeller)
        return res.status(400).json({ code: "", message: "invalid user type" });

    let seller = await Seller.findById(buyer.sellerId);
    if (!seller.items.includes(req.body.itemId))
        return res.status(400).json({ code: "", message: "operation not permitted" });

    let item = await Item.findById(req.body.itemId);

    item.state = 'DELETED';
    item.save(err => {
        if (err)
            return res.status(500).json({ code: "", message: "unable to save changes" });
    });

    return res.status(200).json({ code: "", message: "success" });
}

module.exports = {
    create,
    getInfo,
    getByUser,
    search,
    getInfoSeller,
    edit,
    publish,
    retire,
    buy,
    remove
};