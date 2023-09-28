function is_authenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        const accept_header = req.headers['accept'];
        if (accept_header && accept_header.includes('text/html')) {
            res.redirect('/');
        } else {
            res.status(401).json({ status: 401, message: 'Unauthorized' });
        }
    }
}

module.exports = is_authenticated;