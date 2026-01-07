"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const keycloak_1 = require("../keycloak");
const router = (0, express_1.Router)();
// GET /me - returns the userinfo for the bearer token
router.get('/me', async (req, res) => {
    try {
        const auth = req.header('authorization') || req.header('Authorization');
        if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
            return res.status(401).json({ error: 'Missing bearer token' });
        }
        const token = auth.split(' ')[1];
        const user = await (0, keycloak_1.getKeycloakUserInfo)(token);
        return res.json({ user });
    }
    catch (err) {
        const status = err?.status || 500;
        return res.status(status).json({ error: err.message || 'failed' });
    }
});
exports.default = router;
