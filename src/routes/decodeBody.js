const {jwtVerify} = require('jose');
const {httpJwtSecret} = require("../config");

const decodeBody = async (req, res, next) => {
    if (req.body) {
        const reqBody = req.body;
        try {
            const key = new TextEncoder().encode(httpJwtSecret);
            const {payload} = await jwtVerify(reqBody.signature, key);
            const {iat, exp, ...decodedBody} = payload;

            if (JSON.stringify(decodedBody) !== JSON.stringify(reqBody.body)) {
                return res.status(418).send({message: "lmao"});
            }

            req.body = reqBody.body;
        } catch {
            return res.status(418).send({message: "lmao"});
        }
    }
    next();
};

module.exports = {decodeBody};