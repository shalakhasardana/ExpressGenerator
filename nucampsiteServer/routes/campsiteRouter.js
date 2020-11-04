const express = require('express');
const bodyParser = require('body-parser');
// here we import the Campsite model from models
const Campsite = require('../models/campsite');
// We'll import the authenticate module. We exported a verify user function from 
// here, which we'll be using to verify user authentication for every endpoint in 
// this router except for the "GET" endpoints. This is because a get request is a
// simple read-only operation that doesn't change anything on the server side.
// Basically, we're using authenticate.verifyUser to verify user authentication 
// before the client can access any http endpoint except GET.
const authenticate = require('../authenticate');

// We set up a router using express.Router() function which comes from express which we 
// imported.
const campsiteRouter = express.Router();

// The router is basically a mini express application that has access to the use method 
// which we can use to attach the body-parser middleware for handling request bodies 
// formatted in json
campsiteRouter.use(bodyParser.json());

// the route method takes a single string argument of '/'.
// We wil chain our methods like this.
campsiteRouter.route('/')
.get((req, res, next) => {
    // We use the Campsite.find() method which is a static method available via the 
    // Campsite model, that will query the database for all of the documents that were 
    // instantiated using the Campsite model. We will then chain a then/catch statement.
    Campsite.find()
    // Before the then method, we'll use the populate method and give it a string argument
    // of 'comments.author'. This will tell our application, that when the campsite's 
    // documents are retrieved, to populate the author field of the comments sub-document
    // by finding the user document that matches the object id that's stored there.
    .populate('comments.author')
    .then(campsites => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        // this method will send json data to the client in the response stream and it 
        // will automatically close the response stream afterwards. Therefore, we do not
        // need the res.end() method.
        res.json(campsites);
    })
    // We will then use the next() function to pass of the error to the overall error
    // handler for the overall express application. Express will handle it.
    .catch(err => next(err));
})
// We'll the authenticate.verifyUser middleware function right here.
.post(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    // We will call the Campsite.create() method to create a new campsite document 
    // and save it to the mongoDB server. We will create this document from the request
    // body which should contain the information about the campsite to post from the client.
    // The body.parser() middleware will already have parsed it into a format that we 
    // can use. Mongoose will also make sure the data matches the schema
    Campsite.create(req.body)
    .then(campsite => {
        console.log('Campsite Created ', campsite);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
// We'll the authenticate.verifyUser middleware function right here.
.put(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /campsites');
})
// We'll the authenticate.verifyUser middleware function right here.
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    // We will use the Campsite.deleteMany() static method with an empty argument. 
    // This will result in every document in the campsites collection being deleted.
    Campsite.deleteMany()
    .then(response => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    })
    .catch(err => next(err));
});

campsiteRouter.route('/:campsiteId')
.get((req, res, next) => {
    // We will the findById() static method and pass in the id stored in the route
    // parameter using req.params.campsiteId. This id is getting parsed from the http 
    // request from whatever the user from the client side typed in as the id they want 
    // to access.
    Campsite.findById(req.params.campsiteId)
    .populate('comments.author')
    .then(campsite => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
// We'll the authenticate.verifyUser middleware function right here.
.post(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`POST operation not supported on /campsites/${req.params.campsiteId}`);
})
// We'll the authenticate.verifyUser middleware function right here.
.put(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    // for Campsite.findByIdAndUpdate() method, we'll pass in the first argument of the 
    // campsite ID. The second argument, we'll pass in the $set update operator along with
    // the data in the request body. For the third argument, we'll pass an object with 
    // the property set to true, so that we get back information about the updated document
    // as a result from this method.
    Campsite.findByIdAndUpdate(req.params.campsiteId, {
        $set: req.body
    }, { new: true })
    .then(campsite => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
// We'll the authenticate.verifyUser middleware function right here.
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    // We use Campsite.findByIdAndDelete() method for deleting a single campsite by its id.
    // We pass in the id for its argument. 
    Campsite.findByIdAndDelete(req.params.campsiteId)
    .then(response => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    })
    .catch(err => next(err));
});

// add API rest points for a specific campsite's comments path
campsiteRouter.route('/:campsiteId/comments')
.get((req, res, next) => {
    // The client is looking for a single campsite's comments. findById() is therefore
    // the appropriate method with a single argument of the campsite's id.
    Campsite.findById(req.params.campsiteId)
    .populate('comments.author')
    .then(campsite => {
        // we use an if statement to see if a campsite was returned. It is possible 
        // for a null value to be returned here, for which we can use an else block.
        if (campsite) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(campsite.comments);
        } else {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
// We'll the authenticate.verifyUser middleware function right here.
.post(authenticate.verifyUser, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        if (campsite) {
            // we want to add the id of the current user to the request body as the
            // author before it gets pushed into the campsite.comments array. We 
            // can do that here.
            req.body.author = req.user._id;
            // We push the new comment inside the comments array. We will assume that 
            // the req.body has a comment in it, and the body-parser middleware should 
            // have already formatted it so that we can use it like this. 
            campsite.comments.push(req.body);
            // The line above has only changed the comments array that's in the application's
            // memory, and not the comment's sub-document that's in the mongoDB database.
            // To save this change, we need to use the save() method.
            campsite.save()
            .then(campsite => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(campsite);
            })
            .catch(err => next(err));
        } else {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
// We'll the authenticate.verifyUser middleware function right here.
.put(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`PUT operation not supported on /campsites/${req.params.campsiteId}/comments`);
})
// We'll the authenticate.verifyUser middleware function right here.
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        if (campsite) {
            // Here we will delete every comment in this campsite's comment's array.
            // We will use a for loop to achieve this. 
            for (let i = (campsite.comments.length-1); i >= 0; i--) {
                // We can access each comment in the comments subdocument array one at
                // a time using the id() method. We can chain the remove() method to 
                // remove that comment.
                campsite.comments.id(campsite.comments[i]._id).remove();
            }
            campsite.save()
            .then(campsite => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(campsite);
            })
            .catch(err => next(err));
        } else {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
});

campsiteRouter.route('/:campsiteId/comments/:commentId')
.get((req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .populate('comments.author')
    .then(campsite => {
        if (campsite && campsite.comments.id(req.params.commentId)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(campsite.comments.id(req.params.commentId));
        } else if (!campsite) {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        } else {
            err = new Error(`Comment ${req.params.commentId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
// We'll the authenticate.verifyUser middleware function right here.
.post(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`POST operation not supported on /campsites/${req.params.campsiteId}/comments/${req.params.commentId}`);
})
// We'll the authenticate.verifyUser middleware function right here.
.put(authenticate.verifyUser, (req, res, next) => {
        Campsite.findById(req.params.campsiteId)
        .then(campsite => {
            if (campsite && campsite.comments.id(req.params.commentId)) {
                const author_id_from_request = req.user._id;
                const comment_id_from_request = req.params.commentId;
                const comment_from_database = campsite.comments.id(comment_id_from_request);
                const author_id_from_comment_from_database = comment_from_database.author._id;
                if (author_id_from_request.equals(author_id_from_comment_from_database)) {
                    if (req.body.rating) {
                        campsite.comments.id(req.params.commentId).rating = req.body.rating;
                    }
                    if (req.body.text) {
                        campsite.comments.id(req.params.commentId).text = req.body.text;
                    }
                    campsite.save()
                    .then(campsite => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(campsite);
                    })
                    .catch(err => next(err));
                } else {
                    err = new Error('You are not authorized to delete this comment!');
                    err.status = 403;
                    return next(err);
                }
            } else if (!campsite) {
                err = new Error(`Campsite ${req.params.campsiteId} not found`);
                err.status = 404;
                return next(err);
            } else {
                err = new Error(`Comment ${req.params.commentId} not found`);
                err.status = 404;
                return next(err);
            }
        })
        .catch(err => next(err));
})
// We'll the authenticate.verifyUser middleware function right here.
.delete(authenticate.verifyUser, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        const author_id_from_request = req.user._id;
        const comment_id_from_request = req.params.commentId;
        const comment_from_database = campsite.comments.id(comment_id_from_request);
        const author_id_from_comment_from_database = comment_from_database.author._id;
        if (author_id_from_request.equals(author_id_from_comment_from_database) || req.user.admin) {
            if (campsite && campsite.comments.id(req.params.commentId)) {
                campsite.comments.id(req.params.commentId).remove();
                campsite.save()
                .then(campsite => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(campsite);
                })
                .catch(err => next(err));
            } else {
                err = new Error('You are not authorized to delete this comment!');
                err.status = 403;
                return next(err);
            }
        } else if (!campsite) {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        } else {
            err = new Error(`Comment ${req.params.commentId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
});

module.exports = campsiteRouter;