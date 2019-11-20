const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var CategorySchema = new Schema({
    name: {
        type: String
    },
    films: [{ type: Schema.Types.ObjectId, ref: 'Film' }]
});

var Category = mongoose.model('Category', CategorySchema)
module.exports = Category;