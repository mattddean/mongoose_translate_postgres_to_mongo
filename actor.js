const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var ActorSchema = new Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    films: [{ type: Schema.Types.ObjectId, ref: 'Film' }]
});

var Actor = mongoose.model('Actor', ActorSchema)
module.exports = Actor;