WFS.js
======
A simple implementation of a RESTFul JSON-oriented Web Feature Service (WFS) using Node.js.

Data is stored in a MongoDB. Config.json is used to configure the application.

## Sample Data

The folder [data](/data) contain sample data for each of the configure resources in the WFS. They can be inserted in the database by using a POST operation in the resource, with [Postman](https://www.getpostman.com/), for example.

```
POST http://localhost:3001/wfs/rivers
Headers: Accept: application/ext.geo+json
Body: <data/rivers.json>
```

## Dependencies
* [Node.js](https://nodejs.org/en/)
* [Express.js](http://expressjs.com/)
* [Body-parser](https://github.com/expressjs/body-parser) - MIT License
* [Serve-favicon](https://github.com/expressjs/serve-favicon) - MIT License (not necessary for the application)
* [Morgan](https://github.com/expressjs/morgan) - MIT License (not necessary for the application)
* [CORS](https://github.com/expressjs/cors) - MIT License
* [TV4](https://github.com/geraintluff/tv4) - Public domain / MIT License
* [Mongoose](https://github.com/Automattic/mongoose) - MIT License
* [Valid-url](https://github.com/ogt/valid-url) - MIT License
* [Jade](http://jade-lang.com/) - MIT License
* [Leaflet](http://leafletjs.com/) - [License](https://github.com/Leaflet/Leaflet/blob/master/LICENSE)
