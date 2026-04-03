const authReq = (req, res, next) => {
    if(req.session && req.session.user) {
        req.user = req.session.user;
        next();
    }
    else {
        return res.status(401).send({message: 'Otentikasi diperlukan'});
    }
};

const adminReq = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Otentikasi diperlukan' });
    }
    if (req.user.role !== 'admin') {
        return res.status(401).json({ message: 'Akses ditolak, fiture ini hanya bisa digunakan oleh admin' });
    }
    next();
};


module.exports = { authReq, adminReq };