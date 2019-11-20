const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var FilmSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    release_year: {
        type: Number,
        required: true
    },
    language_id: {
        type: Number,
        required: true,
    },
    rental_duration: {
        type: Number,
        required: true,
    },
    rental_rate: {
        type: Number,
        required: true
    },
    length: {
        type: Number,
        required: true
    },
    replacement_cost: {
        type: Number,
        required: true
    },
    rating: {
        type: String,
        required: true
    },
    actors: [{ type: Schema.Types.ObjectId, ref: 'Actor' }],
    categories: [{ type: Schema.Types.ObjectId, ref: 'Film' }]
});

var Film = mongoose.model('Film', FilmSchema)
module.exports = Film;