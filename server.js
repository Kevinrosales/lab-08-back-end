'use strict';

// Set up server
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');

require('dotenv').config();

const PORT = process.env.PORT;

const app = express();

app.use(cors());

app.listen(PORT, () => console.log(`App is up on ${PORT}`));

// Define objects
function Location(data) {
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
}

function Yelp(business) {
  this.name = business.name;
  this.image_url = business.image_url;
  this.price = business.price;
  this.rating = business.rating;
  this.url = business.url;
}

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

app.get('/location', (request, response, next) => {
  getLocation(request.query.data)
    .then(locationData => response.send(locationData))
    .catch(error => handleError(error, response));

});

app.get('/weather', getWeather);

app.get('/yelp', getYelp);

app.get('/movies', getMovies);

// Define event handlers

function getLocation(query) {
  const _URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;
  return superagent.get(_URL)
    .then(data => {
      if (! data.body.results.length) {throw 'No data'}
      else {
        let location = new Location(data.body.results[0]);
        location.search_query = query;
        console.log(location);
        return location;
      }
    });
}

function handleError(err, res) {
  console.error('ERR', err);
  if (res) res.status(500).send('Sorry, something went wrong.');
}

function getYelp(request, response) {
  const _URL = `https://api.yelp.com/v3/businesses/search?latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`;
  return superagent.get(_URL)
    .set({'Authorization': `Bearer ${process.env.YELP_API_KEY}`})
    .then(result => {
      const businesses = [];
      result.body.businesses.forEach(biz => {
        businesses.push(new Yelp(biz));
      })
      response.send(businesses);
    })
    .catch(error => handleError(error ,response));
}

function getWeather(request, response) {
  const _URL = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
  return superagent.get(_URL)
    .then(result => {
      const weatherSummaries = [];
      result.body.daily.data.forEach(day => {
        const summary = new Weather(day);
        weatherSummaries.push(summary);
      });
      response.send(weatherSummaries);
    })
    .catch(error => handleError(error ,response));
}

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