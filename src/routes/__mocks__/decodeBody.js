module.exports = {
    decodeBody: jest.fn().mockImplementation((req, res, next) => {
        req.body = req.body.body ?? req.body;
        next();
    })
};