const {jwtVerify} = require('jose');
const {httpJwtSecret} = require("../config");

const decodeBody = async (req, res, next) => {
    if (req.body) {
        const reqBody = req.body;
        try {
            const key = new TextEncoder().encode(httpJwtSecret);
            const {payload} = await jwtVerify(reqBody.signature, key);
            console.log(reqBody);
            const {iat, exp, ...decodedBody} = payload;
            console.log(decodedBody);

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