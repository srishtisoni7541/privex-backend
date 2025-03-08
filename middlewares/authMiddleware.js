// const jwt = require("jsonwebtoken");
// const User = require("../models/user.model");

// const isLoggedIn = async (req, res, next) => {
//     try {
//         const accessToken = req.headers["authorization"]?.split(" ")[1];
//         const refreshToken = req.cookies.refreshToken;

//         // Check if access token is present
//         if (!accessToken) {
//             return res.status(401).json({ message: "Unauthorized: No access token provided" });
//         }

//         // Verify access token
//         jwt.verify(accessToken, process.env.JWT_SECRET, async (err, decoded) => {
//             if (err) {
//                 if (err.name === "TokenExpiredError") {
//                     // Access token expired - use refresh token
//                     if (!refreshToken) {
//                         return res.status(401).json({ message: "Unauthorized: No refresh token provided" });
//                     }

//                     // Verify refresh token
//                     jwt.verify(refreshToken, process.env.JWT_SECRET, async (refreshErr, refreshDecoded) => {
//                         if (refreshErr) {
//                             return res.status(403).json({ message: "Unauthorized: Invalid refresh token" });
//                         }

//                         // Find user with refresh token
//                         const user = await User.findOne({ _id: refreshDecoded.userId, refreshToken });
//                         if (!user) {
//                             return res.status(403).json({ message: "Unauthorized: User not found" });
//                         }

//                         // Generate new access token
//                         const newAccessToken = jwt.sign(
//                             { userId: user._id, role: user.role },
//                             process.env.JWT_SECRET,
//                             { expiresIn: "1h" }
//                         );

//                         req.user = user;

//                         // Send new access token in response header
//                         res.setHeader("Authorization", `Bearer ${newAccessToken}`);
//                         next();
//                     });
//                 } else {
//                     return res.status(401).json({ message: "Unauthorized: Invalid access token" });
//                 }
//             } else {
//                 // Access token is valid
//                 req.user = decoded;
//                 next();
//             }
//         });
//     } catch (error) {
//         console.error("Middleware Error:", error);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// module.exports = isLoggedIn;

const jwt = require('jsonwebtoken');


const isLoggedIn = async (req, res, next) => {
    try {
        const accessToken = req.headers["authorization"]?.split(" ")[1];
        const refreshToken = req.cookies?.refreshToken;

        if (!accessToken) {
            return res.status(401).json({ message: "Unauthorized: No access token provided" });
        }

        // Verify access token
        jwt.verify(accessToken, process.env.JWT_SECRET, async (err, decoded) => {
            if (!err) {
                console.log("Decoded Token:", decoded); // ✅ Debugging line
                req.user = decoded;
                return next();
            }

            if (err.name === "TokenExpiredError") {
                if (!refreshToken) {
                    return res.status(401).json({ message: "Unauthorized: No refresh token provided" });
                }

                try {
                    const refreshDecoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
                    const user = await User.findOne({ _id: refreshDecoded.userId, refreshToken });

                    if (!user) {
                        return res.status(403).json({ message: "Unauthorized: User not found" });
                    }

                    const newAccessToken = jwt.sign(
                        { userId: user._id, role: user.role },
                        process.env.JWT_SECRET,
                        { expiresIn: "1h" }
                    );

                    res.setHeader("Authorization", `Bearer ${newAccessToken}`);
                    req.user = { userId: user._id, role: user.role };

                    console.log("User after refresh token:", req.user); // ✅ Debugging line
                    return next();
                } catch (refreshErr) {
                    return res.status(403).json({ message: "Unauthorized: Invalid refresh token" });
                }
            }

            return res.status(401).json({ message: "Unauthorized: Invalid access token" });
        });
    } catch (error) {
        console.error("Middleware Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = isLoggedIn;
