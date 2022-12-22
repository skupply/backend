const Buyer = require("../models/Buyer")
const Item = require("../models/Item");

/**
 * la funzione ritorna la lista degli articoli presenti nel carrello
 * dell'utente specificato nella richiesta
 */
const getItems = async(req, res) => {
    //get all items inserted in the cart
    const email = req.body.email;

    if (email == null)
        return res.status(400).json({ code: "402", message: "missing arguments" });

    const result = await Buyer.findOne({ email: email });
    if (!result) return res.status(404).json({ code: "403", message: "user not found" });

    //una volta trovati gli id, devo trovare i prodotti all'interno della collection articoli
    let cart = result.cart;
    let articoli = [];

    for (let i = 0; i < cart.length; i++) {
        const result = await Item.findOne({ _id: cart[i].id });
        if (result) articoli.push(result);
    }

    //inserire nella risposta gli articoli
    return res.status(200).json({ code: "400", message: "success", cart: articoli, cart_ids: cart });
}

/**
 * la funzione inserisce all'interno del carrello un nuovo articolo
 * e nel caso questo sia presente, ne modifica la quantità aumentandola
 * di una unità.
 * Inoltre, imposta l'articolo corrispondente della wishlist come inserito nel carrello
 */
const insertItem = async(req, res) => {
    const data = req.body;
    let email = data.email;
    let id_item = data.id;

    if (!email || !id_item)
        return res.status(400).json({ code: "402", message: "missing arguments" });
    //campi non presenti, sessione probabilmente non valida

    //se l'elemento è un duplicato, questo non viene inserito e non va a modificare la 
    //quantità di quello già presente
    const result = await Buyer.find({ "$and": [{ email: email }, { cart: { "$elemMatch": { id: id_item } } }] });
    if (!result) return res.status(404).json({ code: "401", message: "user or item not found" });
    else {
        if (Object.keys(result).length === 0) {
            //item non già presente nel carrello, inserimento id
            const result = await Buyer.updateOne({ email: email }, { $push: { cart: { id: id_item } } });
            return res.status(200).json({ code: "400", message: "product added in cart" });
        } else
            return res.status(200).json({ code: "400", message: "product not added in cart" });
    }

}

/**
 * la funzione modifica la quantità dell'articolo indicato
 * con un valore passato da input
 */
const updateQuantity = async(req, res) => {
    let email = req.body.email;
    let id = req.body.id; //id item
    let quantity = req.body.quantity;

    if (!email || !id || quantity < 0) {
        return res.status(400).json({ code: "402", message: "missing arguments" });
        //campi non presenti o non validi, sessione probabilmente non valida
    }

    let result = await Buyer.findOne({ email: email });
    if (!result) return res.status(404).json({ code: "403", message: "user not found" });

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

    if (notFound) return res.status(404).json({ code: "404", message: "product not found" });

    result = await Buyer.updateOne({ "$and": [{ "email": email }, { 'cart._id': id_item }] }, {
        $set: { 'cart.$.quantity': quantity }
    });

    if (!result) return res.status(500).json({ code: "401", message: "database error" });
    return res.status(200).json({ code: "400", message: "product's quantity updated" });

}

/**
 * la funzione rimuove dalla lista del carrello l'articolo
 * identificato dal proprio id il quale viene passato tramite
 * la richiesta
 */
const deleteOneItem = async(req, res) => {
    //remove an item with a defined id
    let email = req.body.email; //email ricavata dal corpo della richiesta come in post
    let id = req.body.id;

    if (!email || !id)
        return res.status(400).json({ code: "402", message: "missing arguments" });
    //campi non presenti, sessione probabilmente non valida

    let result = await Buyer.findOne({ email: email });
    if (!result) return res.status(404).json({ code: "403", message: "user not found" });

    //modifica carrello del risultato ottenuto
    const items = result.cart;
    let id_item;
    let notFound = true;

    for (i = 0; i < items.length && notFound; i++) {
        if (items[i].id == id) {
            //item trovato
            notFound = false;
            id_item = items[i]._id;
        }
    }

    if (notFound) return res.status(404).json({ code: "404", message: "product not found" });

    result = await Buyer.updateOne({ "email": email }, {
        $pull: {
            cart: {
                _id: { $in: id_item }
            }
        }
    });

    if (!result) return res.status(404).json({ code: "401", message: "database error" });
    return res.status(200).json({ code: "400", message: "product removed" });
};

/**
 * la funzione rimuove dalla lista del carrello tutti gli 
 * articoli presenti.
 * questa funzione verrà usata nel momento del checkout dal carrello
 */
const deleteAll = async(req, res) => {
    const email = req.body.email;

    if (!email) {
        return res.status(400).json({ code: "402", message: "missing arguments" });
        //campi non presenti, sessione probabilmente non valida
    }

    //ricerca utente
    let result = await Buyer.findOne({ email: email });
    if (!result) return res.status(404).json({ code: "403", message: "user not found" });
    
    const cart = result.cart;
    let ids = [];

    //lettura id articoli
    for(let i=0; i<cart.length; i++){
        ids.push(cart[i]._id);
        console.log(ids);
    }

    //pull valori array per rimozione articoli dal carrello
    result = await Buyer.updateOne({ "email": email },  { $pull: {
        cart: {
            _id: { $in: ids }
        }
    }});

    if (!result) return res.status(404).json({ code: "401", message: "database error" });
    return res.status(200).json({ code: "400", message: "cart cleared" });

}

/**
 * la funzione si occupa di eseguire il checkout
 * e dello svuotamento del carrello
 */
const checkout = async(req, res) => {
    //NB facendo il checkout è da verificare prima 
    //se la quantità è disponibile e, in caso positivo, modificarla sottraendo
    //la quantità definita nel carrello
    res.status(200).json({message: "checkout"})
    return res;
};

module.exports = {
    getItems,
    insertItem,
    updateQuantity,
    deleteOneItem,
    deleteAll,
    checkout,
}