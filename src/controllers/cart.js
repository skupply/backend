const Buyer = require("../models/Buyer")
const Item = require("../models/Item");
const Proposal = require('../models/Proposal')
const mongoose = require('mongoose');
const { getAuthenticatedUser } = require('../utils/auth');

/**
 * la funzione ritorna la lista degli articoli presenti nel carrello
 * dell'utente specificato nella richiesta
 */
const getItems = async(req, res) => {
    //get all items inserted in the cart
    let user = await getAuthenticatedUser(req, res);

    const result = await Buyer.findById(user._id);
    if (!result) return res.status(404).json({ code: '0403', message: 'User Not Found' });

    //una volta trovati gli id, devo trovare i prodotti all'interno della collection articoli
    let cart = result.cart;
    let articoli = [];

    for (let i = 0; i < cart.length; i++) {
        const result = await Item.findOne({ _id: cart[i].id });
        if (result) articoli.push(result);
    }

    //inserire nella risposta gli articoli
    return res.status(200).json({ code: '0400', message: 'Success', cart: articoli, cart_ids: cart });
}

/**
 * la funzione inserisce all'interno del carrello un nuovo articolo
 * e nel caso questo sia presente, ne modifica la quantità aumentandola
 * di una unità.
 * Inoltre, imposta l'articolo corrispondente della wishlist come inserito nel carrello
 */
const insertItem = async(req, res) => {
    const data = req.body;
    let id_item = data.id;
    let user = await getAuthenticatedUser(req, res);

    if (!id_item)
        return res.status(400).json({ code: '0402', message: 'Missing Arguments' });

    if (!(mongoose.Types.ObjectId.isValid(id_item)) || !(await Item.findById(id_item)))
        return res.status(404).json({ code: '0403', message: 'Invalid Arguments' });

    //se l'elemento è un duplicato, questo non viene inserito e non va a modificare la 
    //quantità di quello già presente
    const result = await Buyer.find({ "$and": [{ _id: user._id }, { cart: { "$elemMatch": { id: id_item } } }] });
    if (!result) return res.status(404).json({ code: "0403", message: 'Invalid Arguments' });
    else {
        if (Object.keys(result).length === 0) {
            //item non già presente nel carrello, inserimento id
            const result = await Buyer.updateOne({ _id: user._id }, { $push: { cart: { id: id_item } } });
            return res.status(200).json({ code: '0400', message: 'Success' });
        } else
            return res.status(200).json({ code: '0407', message: 'Item Already Present' });
    }

}

/**
 * la funzione modifica la quantità dell'articolo indicato
 * con un valore passato da input
 */
const updateQuantity = async(req, res) => {
    let id = req.body.id; //id item
    let quantity = req.body.quantity;
    let user = await getAuthenticatedUser(req, res);

    if (!id || quantity < 0) {
        return res.status(400).json({ code: '0402', message: 'Missing Arguments' });
        //campi non presenti o non validi, sessione probabilmente non valida
    }

    if (!(mongoose.Types.ObjectId.isValid(id)) || !(await Item.findById(id)))
        return res.status(404).json({ code: '0403', message: 'Invalid Arguments' });

    let result = await Buyer.findById(user._id);
    if (!result) return res.status(404).json({ code: '0403', message: 'Invalid Arguments' });

    //modifica quantità articolo carrello
    const items = result.cart;
    let id_item; //questo è l'objectid dell'item
    let notFound = true;

    for (i = 0; i < items.length && notFound; i++) {
        if (items[i].id == id) {
            //item trovato
            notFound = false;
            id_item = items[i]._id;
        }
    }

    if (notFound) return res.status(404).json({ code: '0404', message: 'Product Not Found' });

    result = await Buyer.updateOne({ "$and": [{ id: user._id }, { 'cart._id': id_item }] }, {
        $set: { 'cart.$.quantity': quantity }
    });

    if (!result) return res.status(500).json({ code: '0401', message: 'Database Error' });
    return res.status(200).json({ code: '0400', message: 'Success' });

}

/**
 * la funzione rimuove dalla lista del carrello l'articolo
 * identificato dal proprio id il quale viene passato tramite
 * la richiesta
 */
const deleteOneItem = async(req, res) => {
    //remove an item with a defined id
    let id = req.body.id;
    let user = await getAuthenticatedUser(req, res);

    if (!id)
        return res.status(400).json({ code: '0402', message: 'Missing Arguments' });
    //campi non presenti, sessione probabilmente non valida

    //modifica carrello del risultato ottenuto
    const items = user.cart;
    let id_item;
    let notFound = true;

    for (i = 0; i < items.length && notFound; i++) {
        if (items[i].id == id) {
            //item trovato
            notFound = false;
            id_item = items[i]._id;
        }
    }

    if (notFound) return res.status(404).json({ code: '0404', message: 'Product Not Found' });

    result = await Buyer.updateOne({ _id: user._id }, {
        $pull: {
            cart: {
                _id: { $in: id_item }
            }
        }
    });

    if (!result) return res.status(404).json({ code: '0401', message: 'Database Error' });
    return res.status(200).json({ code: '0400', message: 'Success' });
};

/**
 * la funzione rimuove dalla lista del carrello tutti gli 
 * articoli presenti.
 * questa funzione verrà usata nel momento del checkout dal carrello
 */
const deleteAll = async(req, res) => {
    let user = await getAuthenticatedUser(req, res);

    //ricerca utente
    let result = await Buyer.findById(user._id);
    if (!result) return res.status(404).json({ code: '0403', message: 'Invalid Arguments' });

    const cart = result.cart;
    let ids = [];

    //lettura id articoli
    for (let i = 0; i < cart.length; i++) {
        ids.push(cart[i]._id);
    }

    //pull valori array per rimozione articoli dal carrello
    result = await Buyer.updateOne({ _id: user._id }, {
        $pull: {
            cart: {
                _id: { $in: ids }
            }
        }
    });

    if (!result) return res.status(404).json({ code: '0401', message: 'Database Error' });
    return res.status(200).json({ code: '0400', message: 'Success' });
}

/**
 * la funzione si occupa di eseguire il checkout
 * e dello svuotamento del carrello
 */
const checkout = async(req, res) => {
    //se la quantità è disponibile e, in caso positivo, modificarla sottraendo
    //la quantità definita nel carrello
    let result = await checkQuantity(req.body.items, req.body.modify);
    if (result) {
        return res.status(200).json({ code: '0400', message: 'Success' });
    } else
        return res.status(400).json({ code: '0406', message: 'Checkout Failed' });
};

/**
 * la funzione verifica la quantità dei singoli prodotti
 * ovvero, se sono disponibili.
 * se indicato diversamente, la funzione aggiorna nel db la quantità dei prodotti acquistati
 */
const checkQuantity = async(items, modify) => {
    let success = true;
    let newItems = [];
    for (let i = 0; i < items.length && success; i++) {
        //viene preso in considerazione l'articolo se ha una quantità maggiore di 0
        if (items[i].quantity > 0) {

            if (!(mongoose.Types.ObjectId.isValid(items[i].id)) || !(await Item.exists({ _id: items[i].id }))) {
                success = false;
            }

            let item;
            //se l'item è stato trovato
            if (success) {
                item = await Item.findById(items[i].id);

                if (item.state != 'PUBLISHED') {
                    success = false;
                }

                if (item.quantity < items[i].quantity) {
                    success = false;
                }

                //se il flag è true, vengono modificate le quantità
                if (modify) {
                    item.quantity -= items[i].quantity;
                    if (item.quantity <= 0) {
                        item.state = 'SOLD';
                        item.quantity = 0;

                        // delete all proposals
                        var proposals = await Proposal.find({ $and: [{ itemId: item._id }, { state: "PENDING" }] });
                        proposals.forEach(async proposal => {
                            proposal.state = "DELETED"
                            await proposal.save().catch(err => res.status(500).json({ code: '0401', message: 'Database Error' }))
                        })

                        // remove from carts and wishlists
                        var buyers = await Buyer.find()
                        buyers.forEach(async buyer => {
                            if (buyer.wishlist.find(x => x.id.equals(items[i]._id))) {
                                buyer.wishlist = buyer.wishlist.filter(x => !x.id.equals(items[i]._id))
                            }
                            if (buyer.cart.find(x => x.id.equals(items[i]._id))) {
                                buyer.cart = buyer.cart.filter(x => !x.id.equals(items[i]._id))
                            }

                            await buyer.save().catch(err => res.status(500).json({ code: '0401', message: 'Database Error' }))
                        })
                    }

                    //salvataggio del "nuovo" articolo in array
                    newItems.push(item);
                }
            }
        }
    }

    //se il checkout è possibile, vado a salvare gli articoli 
    //modificati così da aggiornare le loro quantità
    if (success && modify) {
        for (let i = 0; i < newItems.length; i++) {
            await newItems[i].save().catch(err => console.log(err))
        }
    }

    return success;
}

module.exports = {
    getItems,
    insertItem,
    updateQuantity,
    deleteOneItem,
    deleteAll,
    checkout,
}