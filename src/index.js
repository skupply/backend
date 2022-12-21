const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger/swagger.json');

app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const cors = require("cors");
const corsOptions = { origin: '*', credentials: true, optionSuccessStatus: 200 };
app.use(cors(corsOptions));

const email = require('./routes/email');
const login = require('./routes/login');
const search = require('./routes/search');
const cart = require('./routes/cart');
const chat = require('./routes/chat');
const wishlist = require('./routes/wishlist');
const proposal = require('./routes/proposal');
const review = require('./routes/review');
const buyer = require('./routes/buyer');
const seller = require('./routes/seller');
const item = require('./routes/item');
app.use('/email', email);
app.use('/login', login);
app.use('/search', search);
app.use('/cart', cart);
app.use('/chat', chat);
app.use('/wishlist', wishlist);
app.use('/proposal', proposal);
app.use('/review', review);
app.use('/buyer', buyer);
app.use('/seller', seller);
app.use('/item', item);

// Media endpoint
app.use(express.static('media'));

const PORT = process.env.PORT || 3000;

const main = async() => {
    await mongoose.connect(`mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@skupply.sytwitn.mongodb.net/Skupply?retryWrites=true&w=majority`);
    app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
}

main().catch(err => console.log(err));