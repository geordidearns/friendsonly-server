const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated())
    return res.status(401).json({ authorized: false, error: "Not authorized" });
  else next();
};

module.exports = isAuthenticated;
