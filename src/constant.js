const cookieOptions = {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    sameSite: "none",
    httpOnly: true,
    secure: true,
};

module.exports = {
    DB_NAME: "Laundry-app",
    BASE_URL: "/api/v1",
    hashCount: 14,
    cookieOptions,
};
