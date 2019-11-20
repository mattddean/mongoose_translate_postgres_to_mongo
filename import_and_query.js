const mongoose = require('mongoose');
const fs = require('fs');
const { Client } = require('pg');

// postgres database access info
const CLIENT_INFO = {
  user: '',
  host: '',
  database: '',
  password: ''
}

const Actor = require('./actor.js');
const Film = require('./film.js');
const Category = require('./category.js');

// mongodb database access info
let user = '';
let password = '';
const hostname = ''; // Host name for your cluster
const dbname = '';
// ***
// ***

// Construct the URI to connect to MongoDB.
const mongoUri = `mongodb+srv://${user}:${password}@${hostname}/${dbname}`;

async function getTableRows(tableName) {

  const client = new Client(CLIENT_INFO);
  await client.connect();
  const res = await client.query(`SELECT row_to_json(f) FROM ${tableName} AS f`)
  await client.end();

  let rows = [];
  for (row of res.rows) {
    rows.push(row.row_to_json);
  }

  return rows;
}

async function getRelated(currentModelName, otherModelName, relationalRowId, otherRelationalRows, interRelTable) {
  const client = new Client(CLIENT_INFO);
  await client.connect();
  const other_model_ids = await client.query(`SELECT ${otherModelName}.${otherModelName}_id FROM ${currentModelName} INNER JOIN ${interRelTable} ON ${currentModelName}.${currentModelName}_id=${interRelTable}.${currentModelName}_id INNER JOIN ${otherModelName} on ${interRelTable}.${otherModelName}_id=${otherModelName}.${otherModelName}_id WHERE ${currentModelName}.${currentModelName}_id=${relationalRowId}`);
  await client.end();
  localRefArray = [];
  for (other_model_id_obj of other_model_ids.rows) {
    let matchingRow = otherRelationalRows.find(x => {
      return x[`${otherModelName}_id`] == other_model_id_obj[`${otherModelName}_id`]
    });
    localRefArray.push(matchingRow.document_id)
  }

  return localRefArray;
}

async function addRelationships(currentModelArray, refArrayName, currentModelName, otherModelName, currentRelationalRows, otherRelationalRows, interRelTable) {
  let newModelArray = [];
  for (relationalRow of currentRelationalRows) {
    let currentModel = currentModelArray.find(x => x._id == relationalRow.document_id);
    currentModel[refArrayName] = await getRelated(currentModelName, otherModelName, relationalRow[`${currentModelName}_id`], otherRelationalRows, interRelTable).catch((err) => { console.log(`Exception in getRelated: ${err}`) });
    newModelArray.push(currentModel);
  }
  return newModelArray;
}

async function getModelTuples() {

  var filmRows = await getTableRows('film');
  var categoryRows = await getTableRows('category');
  var actorRows = await getTableRows('actor');

  let actors = [];
  for (actorRow of actorRows) {
    actor = new Actor(actorRow);
    actorRow.document_id = actor._id;
    actors.push(actor);
  }

  let categories = [];
  for (categoryRow of categoryRows) {
    category = new Category(categoryRow);
    categoryRow.document_id = category._id;
    categories.push(category);
  }

  let films = [];
  for (filmRow of filmRows) {
    film = new Film(filmRow);
    filmRow.document_id = film._id;
    films.push(film);
  }

  films = await addRelationships(films, 'actors', 'film', 'actor', filmRows, actorRows, 'film_actor').catch((err) => { console.log(`Exception in addRelationships for films: ${err}`) });
  films = await addRelationships(films, 'categories', 'film', 'category', filmRows, categoryRows, 'film_category').catch((err) => { console.log(`Exception in addRelationships for films: ${err}`) });
  categories = await addRelationships(categories, 'films', 'category', 'film', categoryRows, filmRows, 'film_category').catch((err) => { console.log(`Exception in addRelationships for categories: ${err}`) });
  actors = await addRelationships(actors, 'films', 'actor', 'film', actorRows, filmRows, 'film_actor').catch((err) => { console.log(`Exception in addRelationships for actors: ${err}`) });

  let models = {
    'films': films,
    'categories': categories,
    'actors': actors
  };

  return models;
}

function seedDatabase(model, modelArray) {
  return model
    .deleteMany({}) // Toss away any existing documents.
    .then(_ => model.countDocuments())
    .then(count => console.log(`Have ${count} users`))
    .then(_ => model.insertMany(modelArray))
    .catch(err => console.error(err)); // Handle any errors that may arise
}

// Simple helper to print out JSON data in a readable way.
function prettyPrint(obj) {
  return JSON.stringify(obj, null, 2);
}

// Follow the spouse "foreign key"
function pseudoForeignKey(model, searchObj, relation) {
  model.findOne(searchObj).populate(relation)
    .then(u => console.log('Populated', prettyPrint(u)))
    .catch(err => console.log(err));
}

async function main() {
  let models = await getModelTuples();

  await seedDatabase(Film, models.films)
    .catch(err => console.error(`Something went haywire: ${err}`));

  await seedDatabase(Actor, models.actors)
    .catch(err => console.error(`Something went haywire: ${err}`));

  await seedDatabase(Category, models.categories)
    .catch(err => console.error(`Something went haywire: ${err}`));

  pseudoForeignKey(Actor, { first_name: 'Bette' }, 'films');
  pseudoForeignKey(Category, { name: 'Children' }, 'films');
  pseudoForeignKey(Film, { title: 'Bowfinger Gables' }, 'actors');
  pseudoForeignKey(Film, { title: 'Bowfinger Gables' }, 'categories');
}

async function query() {

  let queries = [];

  const letterTQuery = await Film.find({ title: /^T/ }, 'title release_year', { limit: 10 });
  queries.push(letterTQuery);

  const actorsMostMoviesQuery = await Actor.aggregate() // https://stackoverflow.com/a/34401139
    .project({
      _id: 0,
      first_name: 1,
      last_name: 1,
      films: {
        $size: "$films"
      }
    }).exec(function (err, result) {
      result.sort((a, b) => (a.films < b.films) ? 1 : -1);
      result = result.slice(0, 25)
      queries.push(result)
      const fs = require('fs');
      fs.writeFile('sample-output.json', prettyPrint(queries), (err) => {
        if (err) throw err;
        console.log("wrote to sample-output.json");
        process.exit(0);
      });
    });
}

// Connect to MongoDB Atlas using the connection information specified above.
console.log(`Connecting to '${mongoUri}'`);
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// main();

query().catch(error => console.log(error.stack));
