import { Router } from 'express';

const router = Router();


export function isLoggedIn(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.status(401).send({ data: { errorMessage: "Not logged in" } });
}

router.get('/api/session', isLoggedIn, (req, res) => {
    res.send({ data: req.session.user });
});



export default router


