'use strict';

// Set up server
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

require('dotenv').config();

const PORT = process.env.PORT;

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('err', err => console.log(err));

const app = express();

app.use(cors());

app.listen(PORT, () => console.log(`App is up on ${PORT}`));

// Define objects
function Location(query, data) {
  this.search_query = query;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

Location.prototype.save = function() {
  let SQL = `
    INSERT INTO locations
    (search_query,formatted_query,latitude,longitude)
    VALUES($1,$2,$3,$4)`;
  let values = Object.values(this);
  client.query(SQL,values);
}

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
}

Weather.prototype.save = function(id) {
  const SQL = `INSERT INTO weathers (forecast, time, location_id) VALUES ($1, $2, $3);`;
  const values = Object.values(this);
  values.push(id);
  client.query(SQL, values);
};

Weather.lookup = function(handler) {
  const SQL = `SELECT * FROM weathers WHERE location_id=$1;`;
  client.query(SQL, [handler.location.id])
    .then(result => {
      if (result.rowCount > 0) {
        console.log('Got weather data from SQL');
        handler.cacheHit(result);
      }
      else {
        console.log('Got weather data from API');
        handler.cacheMiss();
      }
    })
    .catch(error => handleError(error));
};

Weather.fetch = function(location) {
  const _URL = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${location.latitude},${location.longitude}`;

  return superagent.get(_URL)
    .then(result => {
      const weatherSummaries = result.body.daily.data.map(day => {
        const summary = new Weather(day);
        summary.save(location.id);
        return summary;
      });
      return weatherSummaries;
    });
};

function getWeather(request, response) {
  const handler = {
    location: request.query.data,
    cacheHit: function(result) {
      response.send(result.rows);
    },
    cacheMiss: function() {
      Weather.fetch(request.query.data)
        .then(results => response.send(results))
        .catch(console.error);
    }
  };
  Weather.lookup(handler);
};

function Yelp(business) {
  this.name = business.name;
  this.image_url = business.image_url;
  this.price = business.price;
  this.rating = business.rating;
  this.url = business.url;
}

Yelp.prototype.save = function(id) {
  const SQL = `INSERT INTO yelps (name, image_url, price, rating, url) VALUES ($1, $2, $3, $4, $5);`;
  const values = Object.values(this);
  values.push(id);
  client.query(SQL, values);
};

Yelp.lookup = function(handler) {
  const SQL = `SELECT * FROM yelps WHERE location_id=$1;`;
  client.query(SQL, [handler.location.id])
    .then(result => {
      if (result.rowCount > 0) {
        console.log('Got yelp data from SQL');
        handler.cacheHit(result);
      }
      else {
        console.log('Got yelp data from API');
        handler.cacheMiss();
      }
    })
    .catch(error => handleError(error));
};

Yelp.fetch = function(query) {
  console.log('query=', query);
  const _URL = `https://api.yelp.com/v3/businesses/search?latitude=${query.latitude}&longitude=${query.longitude}`;

  return superagent.get(_URL)
  .set({'Authorization': `Bearer ${process.env.YELP_API_KEY}`})
    .then(result => {
      const businesses = [];
      result.body.businesses.forEach(biz => {
        let business = new Yelp(biz);
        businesses.push(business);
        business.save(query.id);

      })
      // response.send(businesses);
      return businesses;
    })
    .catch(error => handleError(error ,response));
};

function getYelp(request, response) {
  const handler = {
    location: request.query.data,
    cacheHit: function(result) {
      console.log('Got Yelp data from SQL');
      response.send(result.rows);
    },
    cacheMiss: function() {
      console.log('Got Yelp data from API');
      Yelp.fetch(request.query.data)
        .then(results => response.send(results))
        .catch(console.error);
    }
  };
  Yelp.lookup(handler);
};



function Movie(movie) {
  this.title = movie.title;
  this.overview = movie.overview;
  this.average_votes = movie.vote_average;
  this.total_votes = movie.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w200_and_h300_bestv2${movie.poster_path}`;
  this.popularity = movie.popularity;
  this.released_on = movie.release_date;
}

// Call event listeners
Location.fetchLocation = (query) => {
  const _URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;
  return superagent.get(_URL)
  .then( data => {
    if ( ! data.body.results.length ) { throw 'No Data'; }
    else {
      let location = new Location(query, data.body.results[0]);
      location.save();
      return location;
    }
  });
};

app.get('/location', getLocation);


function getLocation(request, response) {
  console.log('doing getLocation');
  const locationHandler = {
    query: request.query.data,

    cacheHit: (results) => {
      console.log('Got location data from SQL');
      response.send(results.rows[0]);
    },
    cacheMiss: () => {
      console.log('GOt location data from API');
      Location.fetchLocation(request.query.data)
      .then(data => response.send(data));
    }
  };
    Location.lookupLocation(locationHandler);
}

Location.lookupLocation = (handler) => {

  const SQL = `SELECT * FROM locations WHERE search_query=$1`;
  const values = [handler.query];

  return client.query( SQL, values )
  .then( results => {
    if( results.rowCount > 0 ) {
      handler.cacheHit(results);
    }
    else {
      handler.cacheMiss();
    }
  })
  .catch( console.error );
};

app.get('/weather', getWeather);

app.get('/yelp', getYelp);

app.get('/movies', getMovies);

// Define event handlers

function handleError(err, res) {
  console.error('ERR', err);
  if (res) res.status(500).send('Sorry, something went wrong.');
}

// function getYelp(request, response) {
//   const _URL = `https://api.yelp.com/v3/businesses/search?latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`;
//   return superagent.get(_URL)
//     .set({'Authorization': `Bearer ${process.env.YELP_API_KEY}`})
//     .then(result => {
//       const businesses = [];
//       result.body.businesses.forEach(biz => {
//         businesses.push(new Yelp(biz));
//       })
//       response.send(businesses);
//     })
//     .catch(error => handleError(error ,response));
// }

function getMovies(request, response) {
  const city = request.query.data.formatted_query.split(',')[0];
  const _URL = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIEDB_API_KEY}&query=${city}`;
  return superagent.get(_URL)
    .then(result => {
      const movies = [];
      result.body.results.forEach(movie => {
        movies.push(new Movie(movie));
      });
      response.send(movies);
    })
    .catch(error => handleError(error ,response));
}